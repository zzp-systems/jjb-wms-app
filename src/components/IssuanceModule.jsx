// ============================================================================
// FILE: src/components/IssuanceModule.jsx
// ============================================================================
import React, { useState } from 'react';
import {
  PackageMinus, Plus, Trash2, CheckCircle2, XCircle, Clock,
  Layers, X, FileText, Edit3, Sliders, AlertTriangle
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
  onUpdatePendingRequest,
  batchOrders = [],
  onApprovePendingWithdrawal,
  onDeclineBulkWithdrawal,
  currentRole,
  prefilledItem
}) {
  const [exitingIds, setExitingIds] = useState({});

  // Form State for manual creation
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

  // Requisition Editing State (Jade adjusting queued withdrawal slip)
  const [editingRequest, setEditingRequest] = useState(null);
  const [editAddMaterialCode, setEditAddMaterialCode] = useState(inventory[0]?.code || 'RM-FLR-001');
  const [editAddQty, setEditAddQty] = useState(1);

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

    setPackCount(1);
  };

  const handleRemoveLineItem = (idx) => {
    setLineItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const grandTotalCost = +lineItems.reduce((sum, it) => sum + (it.estimatedCost || 0), 0).toFixed(2);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (lineItems.length === 0) {
      alert('Add at least one material to issue.');
      return;
    }

    const lineObj = UNIFIED_PRODUCTION_LINES.find((l) => l.id === selectedLineId);
    const resolvedLineName = selectedLineId === 'CUSTOM' ? customLineName : (lineObj?.name || 'Production Floor');

    const slipNo = `WS-${Date.now().toString().slice(-6)}`;
    const newWithdrawal = {
      slipNo,
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      requestingEntity: resolvedLineName,
      department: lineObj?.dept || 'Production Floor',
      purpose: consumptionPurpose,
      requestedBy,
      issuedBy: `${currentRole} (Warehouse Custodian)`,
      receivedBy,
      items: lineItems,
      totalCost: grandTotalCost,
      status: 'ISSUED & RECONCILED',
      notes
    };

    onSaveWithdrawal(newWithdrawal);

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

  // Requisition Editing Handlers
  const openEditModal = (req) => {
    const cloned = JSON.parse(JSON.stringify(req));
    if (Array.isArray(cloned.items)) {
      cloned.items = cloned.items.map((it) => {
        const mat = inventory.find((m) => m.code === (it.materialCode || it.itemCode)) || {};
        const q = Number(it.qtyRequestedSec ?? it.requestedQtySec ?? it.qty ?? 0);
        const unitCostPerSec = mat.unitCost && mat.conversionFactor
          ? Number(mat.unitCost) / Number(mat.conversionFactor)
          : Number(mat.unitCost || 0);
        return {
          ...it,
          materialCode: it.materialCode || it.itemCode || mat.code,
          name: it.name || it.description || mat.name || 'Material Item',
          secondaryUom: it.secondaryUom || mat.secondaryUom || 'kg',
          qtyRequestedSec: q,
          qtyIssuedSec: q,
          estimatedCost: it.estimatedCost != null ? Number(it.estimatedCost) : +(q * unitCostPerSec).toFixed(2)
        };
      });
    } else {
      cloned.items = [];
    }
    const computedCost = +cloned.items.reduce((s, it) => s + (Number(it.estimatedCost) || 0), 0).toFixed(2);
    cloned.totalCost = computedCost;
    setEditingRequest(cloned);
  };

  const handleEditItemQty = (idx, newQty) => {
    if (!editingRequest) return;
    const qty = Math.max(0, parseFloat(newQty) || 0);
    setEditingRequest((prev) => {
      const updatedItems = [...prev.items];
      const cur = updatedItems[idx];
      const mat = inventory.find((m) => m.code === cur.materialCode) || {};
      const unitCostPerSec = mat.unitCost && mat.conversionFactor
        ? Number(mat.unitCost) / Number(mat.conversionFactor)
        : Number(mat.unitCost || 0);
      const estCost = +(qty * unitCostPerSec).toFixed(2);
      updatedItems[idx] = {
        ...cur,
        qtyRequestedSec: qty,
        qtyIssuedSec: qty,
        estimatedCost: estCost
      };
      const totalCost = +updatedItems.reduce((s, it) => s + (Number(it.estimatedCost) || 0), 0).toFixed(2);
      return { ...prev, items: updatedItems, totalCost };
    });
  };

  const handleRemoveEditItem = (idx) => {
    if (!editingRequest) return;
    setEditingRequest((prev) => {
      const updatedItems = prev.items.filter((_, i) => i !== idx);
      const totalCost = +updatedItems.reduce((s, it) => s + (Number(it.estimatedCost) || 0), 0).toFixed(2);
      return { ...prev, items: updatedItems, totalCost };
    });
  };

  const handleAddEditItem = () => {
    if (!editingRequest || !editAddMaterialCode || editAddQty <= 0) return;
    const mat = inventory.find((m) => m.code === editAddMaterialCode);
    if (!mat) return;

    const unitCostPerSec = mat.unitCost && mat.conversionFactor
      ? Number(mat.unitCost) / Number(mat.conversionFactor)
      : Number(mat.unitCost || 0);
    const addedCost = +(Number(editAddQty) * unitCostPerSec).toFixed(2);

    setEditingRequest((prev) => {
      const updatedItems = [...prev.items];
      const existingIdx = updatedItems.findIndex((it) => it.materialCode === mat.code);
      if (existingIdx >= 0) {
        const cur = updatedItems[existingIdx];
        const newQty = +(Number(cur.qtyRequestedSec || 0) + Number(editAddQty)).toFixed(3);
        updatedItems[existingIdx] = {
          ...cur,
          qtyRequestedSec: newQty,
          qtyIssuedSec: newQty,
          estimatedCost: +(newQty * unitCostPerSec).toFixed(2)
        };
      } else {
        updatedItems.push({
          materialCode: mat.code,
          name: mat.name,
          secondaryUom: mat.secondaryUom || 'kg',
          qtyRequestedSec: Number(editAddQty),
          qtyIssuedSec: Number(editAddQty),
          estimatedCost: addedCost,
          remarks: `Added by Jade (${currentRole})`
        });
      }
      const totalCost = +updatedItems.reduce((s, it) => s + (Number(it.estimatedCost) || 0), 0).toFixed(2);
      return { ...prev, items: updatedItems, totalCost };
    });

    setEditAddQty(1);
  };

  const handleSaveEditedRequest = () => {
    if (!editingRequest) return;
    const reqKey = editingRequest.requestId || editingRequest.withdrawalNo;
    if (onUpdatePendingRequest) {
      onUpdatePendingRequest(reqKey, {
        items: editingRequest.items,
        totalCost: editingRequest.totalCost,
        notes: editingRequest.notes,
        receivedBy: editingRequest.receivedBy
      });
    }
    setEditingRequest(null);
  };

  const handleSaveAndIssueEditedRequest = () => {
    if (!editingRequest) return;
    const reqKey = editingRequest.requestId || editingRequest.withdrawalNo;
    const overrides = {
      items: editingRequest.items,
      totalCost: editingRequest.totalCost,
      notes: editingRequest.notes,
      receivedBy: editingRequest.receivedBy
    };
    setEditingRequest(null);
    triggerAnimatedAction(reqKey, () => onIssuePendingRequest(reqKey, overrides));
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
              Review, Edit Quantities, or Add/Remove Items Before Issue
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
                      {(req.items || []).map((it, i) => {
                        const mat = inventory.find((m) => m.code === (it.materialCode || it.itemCode));
                        const currentBal = mat?.currentBalance != null ? mat.currentBalance : null;
                        const reqQty = Number(it.qtyRequestedSec ?? it.requestedQtySec ?? 0);
                        const isShort = currentBal !== null && currentBal < reqQty;
                        return (
                          <li key={i} className="flex justify-between items-center font-medium gap-1">
                            <span>
                              <code className="font-bold text-[#240e32]">{it.materialCode || it.itemCode}</code> · {it.name || it.description}
                              {it.composition && it.composition.length > 0 && (
                                <span className="ml-1 text-emerald-700 text-[11px]">
                                  ({it.composition.map((c) => `${c.count} × ${c.badge}`).join(' + ')})
                                </span>
                              )}
                            </span>
                            <div className="text-right">
                              <span className={`font-bold ${isShort ? 'text-red-700 bg-red-50 px-1 rounded' : 'text-emerald-800'}`}>
                                {reqQty} {it.secondaryUom || 'kg'}
                              </span>
                              {isShort && (
                                <span className="block text-[9px] font-bold text-red-600">
                                  Shortage! (Bal: {currentBal} {it.secondaryUom || 'kg'})
                                </span>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                    {req.notes && (
                      <p className="mt-2 text-[11px] text-gray-600 italic bg-white px-2 py-1 rounded border border-amber-200 whitespace-pre-line">
                        <strong>Remarks:</strong> {req.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-200 flex-wrap">
                    <button
                      type="button"
                      onClick={() => openEditModal(req)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[#C8963E]/20 hover:bg-[#C8963E] text-[#240e32] flex items-center gap-1 transition"
                      title="Adjust quantities, add items, or remove out-of-stock items"
                    >
                      <Edit3 size={13} /> Edit / Adjust Slip
                    </button>
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
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-red-100 hover:bg-red-600 text-red-700 hover:text-white flex items-center gap-1 transition"
                      >
                        <XCircle size={13} /> Decline
                      </button>
                    )}
                    {onIssuePendingRequest && (
                      <button
                        type="button"
                        onClick={() => triggerAnimatedAction(reqKey, () => onIssuePendingRequest(reqKey))}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-extrabold bg-[#1E7A3E] hover:bg-emerald-800 text-white flex items-center gap-1.5 shadow transition"
                      >
                        <CheckCircle2 size={13} /> Issue & Deduct Stock
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* JADE REQUISITION EDITING MODAL */}
      {editingRequest && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border-2 border-[#C8963E] space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#240e32] text-[#E5C585]">
                  {editingRequest.requestId || editingRequest.withdrawalNo}
                </span>
                <h3 className="font-serif font-bold text-lg text-[#240e32] mt-1">
                  Adjust Withdrawal Request — Warehouse Floor Review
                </h3>
                <p className="text-xs text-gray-500">
                  {editingRequest.requestingLine} · Requested By: <strong>{editingRequest.requisitionedBy}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingRequest(null)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {/* Line Items Table with Edit Inputs */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700">Requisitioned Materials (Edit Quantities or Remove Out-of-Stock SKUs):</label>
              {editingRequest.items.length === 0 ? (
                <p className="text-xs text-gray-400 italic p-3 bg-gray-50 rounded border text-center">
                  All items removed from this requisition. Add materials below.
                </p>
              ) : (
                <div className="overflow-x-auto border rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAF6EE] text-[#240e32] border-b font-bold">
                      <tr>
                        <th className="p-2">Material SKU</th>
                        <th className="p-2">Item Name</th>
                        <th className="p-2 text-right">Floor Stock</th>
                        <th className="p-2 text-right">Qty to Issue</th>
                        <th className="p-2 text-right">Est. Cost</th>
                        <th className="p-2 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {editingRequest.items.map((it, idx) => {
                        const mat = inventory.find((m) => m.code === it.materialCode);
                        const curBal = mat?.currentBalance != null ? mat.currentBalance : 0;
                        const isShort = curBal < (it.qtyRequestedSec || 0);
                        return (
                          <tr key={idx} className={isShort ? 'bg-red-50/50' : ''}>
                            <td className="p-2 font-mono font-bold text-[#240e32]">{it.materialCode}</td>
                            <td className="p-2 font-medium">{it.name}</td>
                            <td className={`p-2 text-right font-mono font-bold ${isShort ? 'text-red-600' : 'text-gray-600'}`}>
                              {curBal} {it.secondaryUom}
                            </td>
                            <td className="p-2 text-right">
                              <div className="inline-flex items-center gap-1 justify-end">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={it.qtyRequestedSec}
                                  onChange={(e) => handleEditItemQty(idx, e.target.value)}
                                  className="w-20 p-1 border rounded font-mono font-bold text-right text-xs bg-white focus:ring-1 focus:ring-[#C8963E]"
                                />
                                <span className="font-semibold text-gray-500">{it.secondaryUom}</span>
                              </div>
                            </td>
                            <td className="p-2 text-right font-mono font-bold text-gray-700">
                              ₱{Number(it.estimatedCost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveEditItem(idx)}
                                className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                                title="Remove item"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Add New Material to this Requisition */}
            <div className="bg-[#FAF6EE] p-3 rounded-xl border border-[#C8963E]/40 space-y-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#240e32]">
                + Add Substitute or Additional Material:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                <div className="sm:col-span-7">
                  <select
                    value={editAddMaterialCode}
                    onChange={(e) => setEditAddMaterialCode(e.target.value)}
                    className="w-full p-1.5 border rounded text-xs bg-white font-medium"
                  >
                    {inventory.map((m) => (
                      <option key={m.code} value={m.code}>
                        {m.code} · {m.name} (Bal: {m.currentBalance} {m.secondaryUom})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-3">
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={editAddQty}
                      onChange={(e) => setEditAddQty(parseFloat(e.target.value) || 0)}
                      className="w-full p-1.5 border rounded text-xs font-mono font-bold"
                      placeholder="Qty"
                    />
                    <span className="text-[11px] font-semibold text-gray-500">
                      {inventory.find((m) => m.code === editAddMaterialCode)?.secondaryUom || 'kg'}
                    </span>
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="button"
                    onClick={handleAddEditItem}
                    className="w-full bg-[#240e32] text-[#E5C585] text-xs font-bold py-1.5 px-2 rounded hover:bg-[#3D1C52] transition"
                  >
                    + Add
                  </button>
                </div>
              </div>
            </div>

            {/* Custodian Remarks / Adjustment Reason */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Custodian Adjustment Notes / Remarks:
              </label>
              <textarea
                value={editingRequest.notes || ''}
                onChange={(e) => setEditingRequest((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Specify reason for adjustments (e.g. Flour reduced from 50kg to 25kg due to floor stock shortage)..."
                rows={2}
                className="w-full p-2 border rounded-lg text-xs"
              />
            </div>

            {/* Summary & Actions */}
            <div className="flex justify-between items-center pt-2 border-t text-xs">
              <div>
                <span className="text-gray-500 font-semibold">Total Adjusted Valuation: </span>
                <strong className="text-[#1E7A3E] font-mono text-sm">
                  ₱{editingRequest.totalCost.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </strong>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingRequest(null)}
                  className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 font-semibold"
                >
                  Cancel
                </button>
                {onUpdatePendingRequest && (
                  <button
                    type="button"
                    onClick={handleSaveEditedRequest}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-200 hover:bg-gray-300 text-gray-800 transition"
                  >
                    Save Changes to Queue
                  </button>
                )}
                {onIssuePendingRequest && (
                  <button
                    type="button"
                    onClick={handleSaveAndIssueEditedRequest}
                    disabled={editingRequest.items.length === 0}
                    className="px-4 py-1.5 rounded-lg text-xs font-extrabold bg-[#1E7A3E] hover:bg-emerald-800 text-white shadow transition"
                  >
                    Save &amp; Issue Slip Now
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {pendingBulkOrders.length > 0 && (
        <section className="bg-white rounded-2xl p-5 border-2 border-purple-500 shadow-lg space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-purple-950 flex items-center gap-2">
              <Layers size={17} className="text-purple-700" />
              Romeo's Bulk Batching Requisitions ({pendingBulkOrders.length})
            </h2>
            <span className="text-[11px] font-semibold text-purple-700">
              Unlocks Dry Room 2 Scale &amp; Kit upon approval
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
                      <span className="font-mono font-bold bg-purple-900 text-purple-100 px-2 py-0.5 rounded">
                        {ord.orderId}
                      </span>
                      <span className="text-[11px] text-gray-500 font-mono">{ord.requestDate}</span>
                    </div>
                    <h3 className="font-extrabold text-sm text-purple-950">
                      {ord.recipeName} · <span className="text-purple-800">{ord.plannedBatches} Commercial Batches</span>
                    </h3>
                    <p className="text-xs text-gray-600 mt-1">
                      Requested by <strong>{ord.bakerName || 'Baker'}</strong> ({ord.outletName || 'Production'})
                    </p>
                    <p className="text-[11px] text-purple-900 font-semibold mt-1">
                      Allocates bulk flour &amp; shortening from Dry Room 1.
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-purple-200">
                    {onDeclineBulkWithdrawal && (
                      <button
                        type="button"
                        onClick={() => {
                          const reason = window.prompt(
                            `Decline bulk withdrawal for ${ord.orderId}? Enter audit reason:`,
                            'Insufficient bulk stock at central warehouse'
                          );
                          if (reason !== null) {
                            triggerAnimatedAction(ord.orderId, () => onDeclineBulkWithdrawal(ord.orderId, reason));
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-100 hover:bg-red-600 text-red-700 hover:text-white flex items-center gap-1 transition"
                      >
                        <XCircle size={14} /> Decline
                      </button>
                    )}
                    {onApprovePendingWithdrawal && (
                      <button
                        type="button"
                        onClick={() => triggerAnimatedAction(ord.orderId, () => onApprovePendingWithdrawal(ord.orderId))}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-extrabold bg-purple-800 hover:bg-purple-900 text-white flex items-center gap-1.5 shadow transition"
                      >
                        <CheckCircle2 size={14} /> Approve Bulk Deduction
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* MANUAL ISSUANCE FORM */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 border border-[#E2D1B8] shadow-sm space-y-5">
        <div className="flex justify-between items-start border-b pb-4 flex-wrap gap-2">
          <div>
            <span className="font-mono text-xs font-bold bg-[#240e32] text-[#E5C585] px-2 py-0.5 rounded">
              Form-WAR-002
            </span>
            <h2 className="font-serif text-2xl font-bold text-[#240e32] mt-1">
              Central Warehouse Floor Stock Issuance (Material Requisition Gate)
            </h2>
            <p className="text-xs text-gray-600 mt-0.5">
              Strict First-Expired, First-Out (FEFO) Lot Deduction · Indangan Plant Production Lines
            </p>
          </div>
          <div className="bg-[#FAF6EE] border border-[#C8963E]/40 px-3 py-1.5 rounded-lg text-right text-xs">
            <p className="font-bold text-[#240e32]">Warehouse Custodian: Jade Q. Dela Cruz</p>
            <p className="text-gray-500 text-[11px]">SOP-WAR-002 Compliant</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Target Production Line *</label>
            <select
              value={selectedLineId}
              onChange={(e) => handleLineSelectChange(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#C8963E]"
            >
              {UNIFIED_PRODUCTION_LINES.map((l) => (
                <option key={l.id} value={l.id}>{l.name} ({l.dept})</option>
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
                className="w-full border border-gray-300 rounded-lg px-2.5 py-2 text-xs font-semibold bg-white font-mono"
              >
                {unitPresets.map((u, i) => (
                  <option key={i} value={i}>
                    {u.label} ({u.multiplierInSec} {selectedMatObj.secondaryUom || 'kg'})
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-gray-700 mb-1">Packs / Count</label>
              <input
                type="number"
                min="0.1"
                step="any"
                value={packCount}
                onChange={(e) => setPackCount(parseFloat(e.target.value) || 0)}
                className="w-full border border-gray-300 rounded-lg px-2.5 py-2 text-xs font-mono font-bold"
              />
            </div>

            <div className="md:col-span-2">
              <button
                type="button"
                onClick={handleAddLineItem}
                className="w-full bg-[#240e32] hover:bg-[#3D1C52] text-[#E5C585] text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1 shadow transition"
              >
                <Plus size={14} /> Add Line
              </button>
            </div>
          </div>
        </div>

        {lineItems.length > 0 && (
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#240e32] text-[#E5C585]">
                <tr>
                  <th className="p-3">Material SKU</th>
                  <th className="p-3">Item Description</th>
                  <th className="p-3">Allocated FEFO Lot</th>
                  <th className="p-3 text-right">Deducted Qty</th>
                  <th className="p-3">Storage Room</th>
                  <th className="p-3 text-right">Est. Cost</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {lineItems.map((it, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="p-3 font-mono font-bold text-[#240e32]">{it.materialCode}</td>
                    <td className="p-3">
                      <span className="font-bold text-gray-800">{it.name}</span>
                      {it.remarks && (
                        <span className="block text-[11px] text-emerald-700 font-mono">{it.remarks}</span>
                      )}
                    </td>
                    <td className="p-3 font-mono text-[11px] text-gray-600">{it.lotNumber}</td>
                    <td className="p-3 text-right font-mono font-bold text-[#1E7A3E]">
                      {it.qtyIssuedSec} {it.secondaryUom}
                    </td>
                    <td className="p-3 text-gray-500">{it.storageRoom}</td>
                    <td className="p-3 text-right font-mono font-bold text-gray-800">
                      ₱{it.estimatedCost?.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveLineItem(idx)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-[#FAF6EE] font-bold">
                <tr>
                  <td colSpan={5} className="p-3 text-right text-gray-700">Estimated Requisition Total:</td>
                  <td className="p-3 text-right font-mono text-sm text-[#1E7A3E]">
                    ₱{grandTotalCost.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Requisition Notes &amp; Specific Remarks</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Substituted brown sugar with refined per Master Baker; 2 kg buffer added for spill..."
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs"
          />
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="bg-[#1E7A3E] hover:bg-emerald-800 text-white font-extrabold text-sm px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg transition"
          >
            <PackageMinus size={18} />
            Authorize Issuance &amp; Deduct Warehouse Stock
          </button>
        </div>
      </form>
    </div>
  );
}
