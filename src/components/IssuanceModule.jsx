import React, { useState } from 'react';
import {
  PackageMinus, Plus, Trash2, CheckCircle2, XCircle, Clock,
  Layers, X, FileText
} from 'lucide-react';
import {
  UNIFIED_PRODUCTION_LINES,
  UNIFIED_CONSUMPTION_PURPOSES,
  getMaterialUnitPresets,
  formatMaterialAvailability
} from '../data/SharedTaxonomy';

function composeSummary(composition) {
  if (!composition || composition.length === 0) return '';
  return composition.map((c) => `${c.count} × ${c.badge || 'UNIT'}`).join(' + ');
}

export default function IssuanceModule({
  inventory = [],
  onSaveWithdrawal,
  withdrawals = [],
  pendingRequests = [],
  onIssuePendingRequest,
  onCancelPendingRequest,
  batchOrders = [],
  onApprovePendingWithdrawal,
  onDeclineBulkWithdrawal,
  currentRole,
  prefilledItem
}) {
  const [exitingIds, setExitingIds] = useState({});

  const [selectedLineId, setSelectedLineId] = useState(UNIFIED_PRODUCTION_LINES[4].id);
  const [customLineName, setCustomLineName] = useState('');
  const [consumptionPurpose, setConsumptionPurpose] = useState(UNIFIED_CONSUMPTION_PURPOSES[1]);
  const [requestedBy, setRequestedBy] = useState('Romeo B. Malusay');
  const [receivedBy, setReceivedBy] = useState('Romeo B. Malusay');
  const [notes, setNotes] = useState('');

  const [selectedMaterialCode, setSelectedMaterialCode] = useState(
    prefilledItem?.code || inventory[0]?.code || 'RM-FLR-001'
  );
  const [selectedPresetIdx, setSelectedPresetIdx] = useState(0);
  const [packCount, setPackCount] = useState(1);
  const [lineItems, setLineItems] = useState([]);

  const selectedMatObj = inventory.find((m) => m.code === selectedMaterialCode) || inventory[0] || {};
  const unitPresets = getMaterialUnitPresets(selectedMatObj);
  const activePreset = unitPresets[selectedPresetIdx] || unitPresets[0] || { label: 'Base UoM', multiplierInSec: 1, badge: 'UNIT' };
  const computedSecondaryQty = +(Number(packCount || 0) * Number(activePreset.multiplierInSec || 1)).toFixed(3);
  const selectedMatAvailability = formatMaterialAvailability(selectedMatObj);

  const handleLineSelectChange = (newLineId) => {
    setSelectedLineId(newLineId);
    const found = UNIFIED_PRODUCTION_LINES.find((l) => l.id === newLineId);
    if (found?.defaultPurpose) setConsumptionPurpose(found.defaultPurpose);
  };

  const handleAddLineItem = () => {
    if (!selectedMatObj || computedSecondaryQty <= 0) return;

    const unitCostPerSec =
      selectedMatObj.unitCost != null && selectedMatObj.conversionFactor
        ? Number(selectedMatObj.unitCost) / Number(selectedMatObj.conversionFactor)
        : Number(selectedMatObj.unitCost || 0);
    const estCost = +(computedSecondaryQty * unitCostPerSec).toFixed(2);

    const activeLots = Array.isArray(selectedMatObj.lots)
      ? [...selectedMatObj.lots]
          .filter((l) => Number(l.qtySec) > 0)
          .sort((a, b) => String(a.expiryDate || '9999').localeCompare(String(b.expiryDate || '9999')))
      : [];
    const fefoLot = activeLots[0]?.lotNumber || `OPEN-20261108-${selectedMatObj.code}`;

    const compositionEntry = {
      badge: activePreset.badge || 'UNIT',
      label: activePreset.label,
      count: Number(packCount) || 1,
      qtyInSec: computedSecondaryQty,
      estCost
    };

    setLineItems((prev) => {
      const idx = prev.findIndex((x) => x.materialCode === selectedMatObj.code);
      if (idx >= 0) {
        const updated = [...prev];
        const existing = updated[idx];
        const newComposition = [...(existing.composition || []), compositionEntry];
        const newQty = +newComposition.reduce((s, c) => s + c.qtyInSec, 0).toFixed(3);
        const newCost = +newComposition.reduce((s, c) => s + c.estCost, 0).toFixed(2);
        updated[idx] = {
          ...existing,
          qtyRequestedSec: newQty,
          qtyIssuedSec: newQty,
          estimatedCost: newCost,
          composition: newComposition,
          remarks: composeSummary(newComposition)
        };
        return updated;
      }
      return [
        ...prev,
        {
          materialCode: selectedMatObj.code,
          name: selectedMatObj.name,
          lotNumber: fefoLot,
          qtyRequestedSec: computedSecondaryQty,
          qtyIssuedSec: computedSecondaryQty,
          secondaryUom: selectedMatObj.secondaryUom || 'kg',
          storageRoom: selectedMatObj.room || 'Dry Room 1',
          estimatedCost: estCost,
          composition: [compositionEntry],
          remarks: composeSummary([compositionEntry])
        }
      ];
    });
  };

  const handleRemoveCompositionEntry = (materialCode, entryIdx) => {
    setLineItems((prev) =>
      prev
        .map((item) => {
          if (item.materialCode !== materialCode) return item;
          const newComp = [...(item.composition || [])];
          newComp.splice(entryIdx, 1);
          if (newComp.length === 0) return null;
          return {
            ...item,
            composition: newComp,
            qtyRequestedSec: +newComp.reduce((s, c) => s + c.qtyInSec, 0).toFixed(3),
            qtyIssuedSec: +newComp.reduce((s, c) => s + c.qtyInSec, 0).toFixed(3),
            estimatedCost: +newComp.reduce((s, c) => s + c.estCost, 0).toFixed(2),
            remarks: composeSummary(newComp)
          };
        })
        .filter(Boolean)
    );
  };

  const handleRemoveLineItem = (code) => {
    setLineItems((prev) => prev.filter((i) => i.materialCode !== code));
  };

  const handleSubmitDirectSlip = (e) => {
    e.preventDefault();
    if (lineItems.length === 0) {
      alert('Please add at least one raw material line item to issue.');
      return;
    }

    const lineMeta = UNIFIED_PRODUCTION_LINES.find((l) => l.id === selectedLineId) || UNIFIED_PRODUCTION_LINES[0];
    const resolvedEntity =
      selectedLineId === 'CUSTOM'
        ? customLineName.trim() || 'Custom Production Line'
        : lineMeta.label.replace(/^\d+\.\s*/, '');

    const totalCost = +lineItems.reduce((sum, it) => sum + (Number(it.estimatedCost) || 0), 0).toFixed(2);
    const slipNo = `WS-${Date.now().toString().slice(-6)}`;

    onSaveWithdrawal({
      slipNo,
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      requestingEntity: resolvedEntity,
      department: lineMeta.department,
      purpose: consumptionPurpose,
      requestedBy,
      issuedBy: `${currentRole} (Warehouse Custodian)`,
      receivedBy: receivedBy || requestedBy,
      items: lineItems,
      totalCost,
      status: 'ISSUED & RECONCILED',
      notes
    });

    setLineItems([]);
    setNotes('');
  };

  const triggerAnimatedAction = (id, callback) => {
    setExitingIds((prev) => ({ ...prev, [id]: true }));
    setTimeout(() => {
      callback();
      setExitingIds((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }, 320);
  };

  const pendingPortalList = pendingRequests.filter((r) => r.status === 'PENDING_ISSUANCE');
  const pendingBulkOrders = batchOrders.filter((b) => b.bulkRequestStatus === 'PENDING_JADE_APPROVAL');

  return (
    <div className="space-y-6">
      {pendingPortalList.length > 0 && (
        <section className="bg-white rounded-2xl p-5 border-2 border-[#C8963E] shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-[#C8963E]" />
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#240e32]">
                Queued Portal Material Requisitions ({pendingPortalList.length}) — Deduction Gate Active
              </h2>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900">
              Cards auto-clear upon Issue or Cancel
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingPortalList.map((req) => {
              const reqKey = req.requestId || req.withdrawalNo;
              const isExiting = exitingIds[reqKey];
              return (
                <div
                  key={reqKey}
                  className={`rounded-xl border border-amber-300 bg-amber-50/60 p-4 flex flex-col justify-between gap-3 transition-all duration-300 ${
                    isExiting ? 'opacity-0 scale-95 -translate-y-2 pointer-events-none' : 'opacity-100 scale-100'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-mono font-extrabold text-xs px-2 py-0.5 rounded bg-[#240e32] text-[#E5C585]">
                        {reqKey}
                      </span>
                      <span className="text-[11px] text-gray-500 font-mono">{req.withdrawalDate}</span>
                    </div>
                    <h3 className="font-bold text-sm text-[#240e32]">{req.requestingLine}</h3>
                    <p className="text-xs text-gray-600">
                      <strong>Purpose:</strong> {req.purpose} · <strong>By:</strong> {req.requisitionedBy}
                    </p>
                    <ul className="mt-2 space-y-1 bg-white p-2.5 rounded-lg border border-amber-200 text-xs">
                      {(req.items || []).map((it, i) => (
                        <li key={i} className="flex justify-between font-medium">
                          <span>
                            <code className="font-bold text-[#240e32]">{it.materialCode || it.itemCode}</code> · {it.name || it.description}
                            {it.composition && it.composition.length > 0 && (
                              <span className="ml-1 text-emerald-700 text-[11px]">
                                ({it.composition.map((c) => `${c.count} × ${c.badge}`).join(' + ')})
                              </span>
                            )}
                          </span>
                          <span className="font-bold text-emerald-800">
                            {it.qtyRequestedSec ?? it.requestedQtySec} {it.secondaryUom || 'kg'}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {req.notes && (
                      <p className="mt-2 text-[11px] text-gray-600 italic bg-white px-2 py-1 rounded border border-amber-200 whitespace-pre-line">
                        <strong>Remarks:</strong> {req.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-200">
                    {onCancelPendingRequest && (
                      <button
                        type="button"
                        onClick={() => {
                          const reason = window.prompt(
                            `Decline & cancel requisition ${reqKey}? Enter audit reason:`,
                            'Declined / Cancelled at Warehouse Gate'
                          );
                          if (reason !== null) {
                            triggerAnimatedAction(reqKey, () => onCancelPendingRequest(reqKey, reason));
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-100 hover:bg-red-600 text-red-700 hover:text-white flex items-center gap-1 transition"
                      >
                        <XCircle size={14} /> Decline & Cancel
                      </button>
                    )}
                    {onIssuePendingRequest && (
                      <button
                        type="button"
                        onClick={() => triggerAnimatedAction(reqKey, () => onIssuePendingRequest(reqKey))}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-extrabold bg-[#1E7A3E] hover:bg-emerald-800 text-white flex items-center gap-1.5 shadow transition"
                      >
                        <CheckCircle2 size={14} /> Issue & Deduct Stock
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {pendingBulkOrders.length > 0 && (
        <section className="bg-white rounded-2xl p-5 border-2 border-purple-500 shadow-lg space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-purple-950 flex items-center gap-2">
              <Layers size={17} className="text-purple-700" />
              Romeo's Bulk Batching Requisitions ({pendingBulkOrders.length})
            </h2>
            <span className="text-[11px] font-semibold text-purple-700">
              Unlocks Dry Room 2 Scale & Kit upon approval
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingBulkOrders.map((ord) => {
              const isExiting = exitingIds[ord.orderId];
              return (
                <div
                  key={ord.orderId}
                  className={`p-4 rounded-xl border border-purple-200 bg-purple-50/60 flex flex-col justify-between gap-3 transition-all duration-300 ${
                    isExiting ? 'opacity-0 scale-95 -translate-y-2 pointer-events-none' : 'opacity-100 scale-100'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="font-mono font-bold bg-purple-900 text-white px-2 py-0.5 rounded">
                        {ord.bulkRequisitionSlipNo || ord.orderId}
                      </span>
                      <span className="text-gray-500 font-mono">{ord.bulkRequestedAt}</span>
                    </div>
                    <h3 className="font-bold text-sm text-[#240e32]">
                      {ord.recipeName} ({ord.requestedQtyPcs} pcs · {ord.batchMultiplier}x Batch)
                    </h3>
                    <p className="text-xs text-gray-600">Destination: {ord.outletName}</p>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-purple-200">
                    {onDeclineBulkWithdrawal && (
                      <button
                        type="button"
                        onClick={() => {
                          const reason = window.prompt(
                            `Decline bulk requisition for ${ord.orderId}? Enter audit reason:`,
                            'Insufficient lot stock / rescheduled batch'
                          );
                          if (reason !== null) {
                            triggerAnimatedAction(ord.orderId, () => onDeclineBulkWithdrawal(ord.orderId, reason));
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-100 hover:bg-red-600 text-red-700 hover:text-white flex items-center gap-1 transition"
                      >
                        <XCircle size={14} /> Decline Request
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => triggerAnimatedAction(ord.orderId, () => onApprovePendingWithdrawal(ord.orderId))}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-extrabold bg-purple-800 hover:bg-purple-950 text-white flex items-center gap-1.5 shadow transition"
                    >
                      <CheckCircle2 size={14} /> Authorize Bulk Release
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <form
        onSubmit={handleSubmitDirectSlip}
        className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
          <div>
            <h2 className="text-base font-extrabold text-[#240e32] flex items-center gap-2">
              <PackageMinus size={18} className="text-[#C8963E]" />
              New Raw Material Requisition Slip — Real-Time Release (Pre-Bake Door Handoff)
            </h2>
            <p className="text-xs text-gray-500">
              Compose bulk + small quantities on a single line (e.g. 1 Tray + 17 pcs Eggs · 1 Box + 2 Cans Creamer)
            </p>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900">
            FEFO Auto-Deduction Active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Requesting Production Line / Outlet / Department *
            </label>
            <select
              value={selectedLineId}
              onChange={(e) => handleLineSelectChange(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#C8963E]"
            >
              {UNIFIED_PRODUCTION_LINES.map((line) => (
                <option key={line.id} value={line.id}>{line.label}</option>
              ))}
            </select>
            {selectedLineId === 'CUSTOM' && (
              <input
                type="text"
                value={customLineName}
                onChange={(e) => setCustomLineName(e.target.value)}
                placeholder="Enter custom production line or kiosk name..."
                required
                className="mt-2 w-full border border-gray-300 rounded-xl px-3 py-2 text-xs"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Consumption Purpose *</label>
            <select
              value={consumptionPurpose}
              onChange={(e) => setConsumptionPurpose(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#C8963E]"
            >
              {UNIFIED_CONSUMPTION_PURPOSES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Requested By (Production / Outlet Staff) *</label>
            <input
              type="text"
              value={requestedBy}
              onChange={(e) => setRequestedBy(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Received At Door Handoff By *</label>
            <input
              type="text"
              value={receivedBy}
              onChange={(e) => setReceivedBy(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs font-semibold"
            />
          </div>
        </div>

        <div className="bg-[#FAF6EE] p-4 rounded-xl border border-[#C8963E]/40 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#240e32]">
              Add Material — Mix Bulk + Small Units on One Line
            </span>
            <span className="text-[11px] font-mono text-gray-700">
              Available: <strong className="text-[#1E7A3E]">{selectedMatAvailability}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end">
            <div className="md:col-span-5">
              <label className="block text-[11px] font-bold text-gray-700 mb-1">Raw Material / Packaging Item</label>
              <select
                value={selectedMaterialCode}
                onChange={(e) => {
                  setSelectedMaterialCode(e.target.value);
                  setSelectedPresetIdx(0);
                }}
                className="w-full border border-gray-300 rounded-lg px-2.5 py-2 text-xs font-semibold bg-white"
              >
                {inventory.map((m) => (
                  <option key={m.code} value={m.code}>
                    {m.code} · {m.name} — {formatMaterialAvailability(m)}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="block text-[11px] font-bold text-gray-700 mb-1">Unit / Pack Size</label>
              <select
                value={selectedPresetIdx}
                onChange={(e) => setSelectedPresetIdx(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-2.5 py-2 text-xs font-bold bg-white text-[#240e32]"
              >
                {unitPresets.map((preset, idx) => (
                  <option key={idx} value={idx}>{preset.label}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-gray-700 mb-1">
                Qty of {activePreset.badge || 'Units'}
              </label>
              <input
                type="number"
                step="0.25"
                min="0.25"
                value={packCount}
                onChange={(e) => setPackCount(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-2.5 py-2 text-xs font-bold bg-white"
              />
            </div>

            <div className="md:col-span-2">
              <button
                type="button"
                onClick={handleAddLineItem}
                className="w-full py-2 px-3 rounded-lg bg-[#C8963E] hover:bg-[#b58432] text-[#240e32] font-extrabold text-xs flex items-center justify-center gap-1 shadow"
              >
                <Plus size={14} /> Add ({computedSecondaryQty} {selectedMatObj.secondaryUom})
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] font-bold uppercase text-gray-500 mr-1">Quick Presets:</span>
            {unitPresets.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setSelectedPresetIdx(idx);
                  setPackCount(1);
                }}
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold border transition ${
                  selectedPresetIdx === idx
                    ? 'bg-[#240e32] text-[#E5C585] border-[#240e32]'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {lineItems.length > 0 && (
            <div className="pt-3 space-y-2">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-500">
                Composition — Same material = one line, multiple unit entries
              </p>
              {lineItems.map((it) => (
                <div
                  key={it.materialCode}
                  className="bg-white px-3 py-2.5 rounded-lg border border-gray-200 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs">
                        <span className="font-mono font-bold text-[#240e32]">{it.materialCode}</span>
                        <span className="mx-1 text-gray-400">·</span>
                        <span className="font-bold">{it.name}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        {(it.composition || []).map((c, ci) => (
                          <span
                            key={ci}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#FAF6EE] border border-[#E2D1B8] text-[11px] font-bold text-[#240e32]"
                            title={c.label}
                          >
                            {c.count} × {c.badge}
                            <button
                              type="button"
                              onClick={() => handleRemoveCompositionEntry(it.materialCode, ci)}
                              className="text-red-600 hover:text-red-800"
                              title="Remove this pack entry"
                            >
                              <X size={11} />
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="mt-1 text-[11px] text-gray-500">
                        Lot: <code className="font-mono">{it.lotNumber}</code>
                      </div>
                    </div>

                    <div className="text-right shrink-0 space-y-1">
                      <div className="text-xs font-extrabold text-[#1E7A3E]">
                        {it.qtyRequestedSec} {it.secondaryUom}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        ₱{Number(it.estimatedCost || 0).toLocaleString()}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveLineItem(it.materialCode)}
                        className="text-red-600 hover:text-red-800 text-[11px] font-bold flex items-center gap-1 ml-auto"
                        title="Remove entire line item"
                      >
                        <Trash2 size={12} /> Remove line
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ═══════════ NEW: MULTI-LINE REMARKS / HANDLING NOTES ═══════════ */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
            <FileText size={13} /> Multi-Line Remarks / Handling Notes
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={`Enter multi-line delivery instructions, receiving notes, or special handling remarks...

Examples:
• Deliver to Dry Room 2 north gate before 05:00 AM
• Separate yeast packet from flour sack
• Rinse eggs before Wet Room entry
• Split boxed items across Pallet A1 and A2`}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#C8963E] whitespace-pre-line"
          />
          <p className="text-[10px] text-gray-500 mt-1">
            ℹ️ Notes are stored on the slip and appear on the printed Form-WAR-001.
          </p>
        </div>

        <button
          type="submit"
          className="w-full py-3 rounded-xl bg-[#240e32] hover:bg-black text-[#E5C585] font-extrabold text-xs uppercase tracking-wider shadow-lg transition"
        >
          Authorize Immediate Stock Issuance & Deduct FEFO Lots
        </button>
      </form>
    </div>
  );
}