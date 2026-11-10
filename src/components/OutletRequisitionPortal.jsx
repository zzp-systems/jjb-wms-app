import React, { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import {
  UNIFIED_PRODUCTION_LINES,
  UNIFIED_CONSUMPTION_PURPOSES,
  getMaterialUnitPresets,
  formatMaterialAvailability
} from '../data/SharedTaxonomy';

// Helper — "1 × BULK TRAY + 17 × SINGLE"
function composeSummary(composition) {
  if (!composition || composition.length === 0) return '';
  return composition.map((c) => `${c.count} × ${c.badge || 'UNIT'}`).join(' + ');
}

export default function OutletRequisitionPortal({
  inventory = [],
  recipes = [],
  onSubmitBatchOrder,
  onSubmitMaterialRequest,
  currentRole
}) {
  const [portalMode, setPortalMode] = useState('batch');

  const [selectedLineId, setSelectedLineId] = useState(UNIFIED_PRODUCTION_LINES[0].id);
  const [customLineName, setCustomLineName] = useState('');
  const [requisitionedBy, setRequisitionedBy] = useState(currentRole || 'Duty Baker');

  const [selectedRecipeSku, setSelectedRecipeSku] = useState(recipes[0]?.sku || 'BRD-PAN-001');
  const [batchMultiplier, setBatchMultiplier] = useState(1);
  const [targetDelivery, setTargetDelivery] = useState('04:30 AM Dawn Dispatch');

  const [consumptionPurpose, setConsumptionPurpose] = useState(UNIFIED_CONSUMPTION_PURPOSES[0]);
  const [notes, setNotes] = useState('');
  const [selectedMatCode, setSelectedMatCode] = useState(inventory[0]?.code || 'RM-FLR-001');
  const [selectedPresetIdx, setSelectedPresetIdx] = useState(0);
  const [packCount, setPackCount] = useState(1);
  const [cartItems, setCartItems] = useState([]);

  const selectedLineMeta =
    UNIFIED_PRODUCTION_LINES.find((l) => l.id === selectedLineId) || UNIFIED_PRODUCTION_LINES[0];
  const resolvedLocationName =
    selectedLineId === 'CUSTOM'
      ? customLineName.trim() || 'Custom Department'
      : selectedLineMeta.label.replace(/^\d+\.\s*/, '');

  const selectedRecipeObj =
    recipes.find((r) => r.sku === selectedRecipeSku) || recipes[0] || { name: 'Commercial Batch', baseYieldPcs: 100 };

  const selectedMatObj = inventory.find((m) => m.code === selectedMatCode) || inventory[0] || {};
  const unitPresets = getMaterialUnitPresets(selectedMatObj);
  const activePreset = unitPresets[selectedPresetIdx] || unitPresets[0] || { label: 'Base UoM', multiplierInSec: 1, badge: 'UNIT' };
  const computedSecQty = +(Number(packCount || 0) * Number(activePreset.multiplierInSec || 1)).toFixed(3);

  const selectedMatAvailability = formatMaterialAvailability(selectedMatObj);

  const handleLineChange = (lineId) => {
    setSelectedLineId(lineId);
    const meta = UNIFIED_PRODUCTION_LINES.find((l) => l.id === lineId);
    if (meta?.defaultPurpose) {
      setConsumptionPurpose(meta.defaultPurpose);
    }
  };

  // -------------------------------------------------------------------------
  // Composition builder — same material can be added multiple times with
  // different unit presets on one line item.
  // -------------------------------------------------------------------------
  const handleAddMaterialCartItem = () => {
    if (!selectedMatObj || computedSecQty <= 0) return;
    const unitCostPerSec =
      selectedMatObj.unitCost != null && selectedMatObj.conversionFactor
        ? Number(selectedMatObj.unitCost) / Number(selectedMatObj.conversionFactor)
        : Number(selectedMatObj.unitCost || 0);
    const estCost = +(computedSecQty * unitCostPerSec).toFixed(2);

    const compositionEntry = {
      badge: activePreset.badge || 'UNIT',
      label: activePreset.label,
      count: Number(packCount) || 1,
      qtyInSec: computedSecQty,
      estCost
    };

    setCartItems((prev) => {
      const idx = prev.findIndex((x) => x.materialCode === selectedMatObj.code);
      if (idx >= 0) {
        const updated = [...prev];
        const item = { ...updated[idx] };
        const newComp = [...(item.composition || []), compositionEntry];
        item.composition = newComp;
        item.qtyRequestedSec = +newComp.reduce((s, c) => s + c.qtyInSec, 0).toFixed(3);
        item.requestedQtySec = item.qtyRequestedSec;
        item.qtyIssuedSec = item.qtyRequestedSec;
        item.estimatedCost = +newComp.reduce((s, c) => s + c.estCost, 0).toFixed(2);
        item.remarks = composeSummary(newComp);
        updated[idx] = item;
        return updated;
      }
      return [
        ...prev,
        {
          itemCode: selectedMatObj.code,
          materialCode: selectedMatObj.code,
          name: selectedMatObj.name,
          description: selectedMatObj.name,
          lotNumber: 'FEFO-AUTO',
          requestedQtySec: computedSecQty,
          qtyRequestedSec: computedSecQty,
          qtyIssuedSec: computedSecQty,
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
    setCartItems((prev) =>
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
            requestedQtySec: +newComp.reduce((s, c) => s + c.qtyInSec, 0).toFixed(3),
            qtyIssuedSec: +newComp.reduce((s, c) => s + c.qtyInSec, 0).toFixed(3),
            estimatedCost: +newComp.reduce((s, c) => s + c.estCost, 0).toFixed(2),
            remarks: composeSummary(newComp)
          };
        })
        .filter(Boolean)
    );
  };

  const handleRemoveCartItem = (idx) => {
    setCartItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleBatchSubmit = (e) => {
    e.preventDefault();
    const orderId = `ORD-${Date.now().toString().slice(-6)}`;
    const baseYield = Number(selectedRecipeObj.baseYieldPcs || selectedRecipeObj.yieldPcs || 100);
    onSubmitBatchOrder({
      orderId,
      outletName: resolvedLocationName,
      recipeSku: selectedRecipeObj.sku,
      recipeName: selectedRecipeObj.name,
      requestedQtyPcs: Math.round(baseYield * Number(batchMultiplier || 1)),
      batchMultiplier: Number(batchMultiplier || 1),
      targetDelivery,
      requisitionedBy,
      status: 'PENDING_BATCHING'
    });
  };

  const handleMaterialSubmit = (e) => {
    e.preventDefault();
    if (cartItems.length === 0) {
      alert('Please add at least one raw material to your requisition slip.');
      return;
    }
    const requestId = `REQ-${Date.now().toString().slice(-6)}`;
    const totalCost = +cartItems.reduce((s, i) => s + (i.estimatedCost || 0), 0).toFixed(2);

    onSubmitMaterialRequest({
      requestId,
      withdrawalNo: requestId,
      withdrawalDate: new Date().toISOString().slice(0, 10),
      requestingLine: resolvedLocationName,
      department: selectedLineMeta.department,
      purpose: consumptionPurpose,
      requisitionedBy,
      notes,
      totalCost,
      items: cartItems
    });
    setCartItems([]);
    setNotes('');
  };

  return (
    <div className="space-y-5">
      {/* Mode switcher */}
      <div className="grid grid-cols-2 gap-2 bg-white p-1.5 rounded-2xl border border-gray-200 shadow-sm">
        <button
          type="button"
          onClick={() => setPortalMode('batch')}
          className={`py-2.5 px-4 rounded-xl text-xs md:text-sm font-extrabold transition ${
            portalMode === 'batch'
              ? 'bg-[#240e32] text-[#E5C585] shadow'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          1. Order Pre-Scaled Recipe Batches (`Form-ORD-001`)
        </button>
        <button
          type="button"
          onClick={() => setPortalMode('material')}
          className={`py-2.5 px-4 rounded-xl text-xs md:text-sm font-extrabold transition ${
            portalMode === 'material'
              ? 'bg-[#240e32] text-[#E5C585] shadow'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          2. Request Raw Materials (`Form-WAR-001`)
        </button>
      </div>

      {/* Shared identity card */}
      <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            Requesting Production Line / Outlet / Department *
          </label>
          <select
            value={selectedLineId}
            onChange={(e) => handleLineChange(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs font-semibold"
          >
            {UNIFIED_PRODUCTION_LINES.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
          {selectedLineId === 'CUSTOM' && (
            <input
              type="text"
              value={customLineName}
              onChange={(e) => setCustomLineName(e.target.value)}
              placeholder="Enter custom department or branch..."
              className="mt-2 w-full border border-gray-300 rounded-xl px-3 py-2 text-xs"
            />
          )}
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            Requisitioned By (Staff / Baker Full Name) *
          </label>
          <input
            type="text"
            value={requisitionedBy}
            onChange={(e) => setRequisitionedBy(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs font-semibold"
          />
        </div>
      </div>

      {portalMode === 'batch' ? (
        <form onSubmit={handleBatchSubmit} className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-4">
          <h3 className="text-sm font-extrabold text-[#240e32] border-b pb-2">
            Form-ORD-001 — Pre-Scaled Recipe Batch Order (Queues to Romeo Malusay)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1">Master Formulation *</label>
              <select
                value={selectedRecipeSku}
                onChange={(e) => setSelectedRecipeSku(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs font-semibold"
              >
                {recipes.map((r) => (
                  <option key={r.sku} value={r.sku}>
                    {r.sku} · {r.name} ({r.baseYieldPcs || r.yieldPcs || 100} pcs)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Batch Multiplier *</label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                value={batchMultiplier}
                onChange={(e) => setBatchMultiplier(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-[#240e32] hover:bg-black text-[#E5C585] font-extrabold text-xs uppercase tracking-wider shadow-lg"
          >
            Submit Batch Order to Dry Room 2 Workbench
          </button>
        </form>
      ) : (
        <form onSubmit={handleMaterialSubmit} className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-4">
          <h3 className="text-sm font-extrabold text-[#240e32] border-b pb-2">
            Form-WAR-001 — Raw Material & Mess Hall Requisition (Queues to Jade Dela Cruz)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Consumption Purpose *</label>
              <select
                value={consumptionPurpose}
                onChange={(e) => setConsumptionPurpose(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs font-semibold"
              >
                {UNIFIED_CONSUMPTION_PURPOSES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Notes / Justification</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. For morning prep shift"
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs"
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
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Material</label>
                <select
                  value={selectedMatCode}
                  onChange={(e) => {
                    setSelectedMatCode(e.target.value);
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
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Unit / Pack</label>
                <select
                  value={selectedPresetIdx}
                  onChange={(e) => setSelectedPresetIdx(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-2.5 py-2 text-xs font-bold bg-white"
                >
                  {unitPresets.map((preset, idx) => (
                    <option key={idx} value={idx}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Qty ({activePreset.badge || 'Units'})
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
                  onClick={handleAddMaterialCartItem}
                  className="w-full py-2 px-3 rounded-lg bg-[#C8963E] hover:bg-[#b58432] text-[#240e32] font-extrabold text-xs flex items-center justify-center gap-1 shadow"
                >
                  <Plus size={14} /> Add ({computedSecQty} {selectedMatObj.secondaryUom})
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

            {cartItems.length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-500">
                  Composition — one line per material, multiple unit entries allowed
                </p>
                {cartItems.map((it, idx) => (
                  <div
                    key={it.materialCode}
                    className="bg-white px-3 py-2.5 rounded-lg border border-gray-200 space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs">
                          <span className="font-mono font-bold text-[#240e32]">{it.materialCode}</span>
                          <span className="text-gray-400 mx-1">·</span>
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
                                title="Remove this entry"
                              >
                                <X size={11} />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right shrink-0 space-y-0.5">
                        <div className="text-xs font-extrabold text-[#1E7A3E]">
                          {it.qtyRequestedSec} {it.secondaryUom}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          ₱{Number(it.estimatedCost || 0).toLocaleString()}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveCartItem(idx)}
                          className="text-red-600 hover:text-red-800 text-[11px] font-bold flex items-center gap-1 ml-auto"
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

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-[#240e32] hover:bg-black text-[#E5C585] font-extrabold text-xs uppercase tracking-wider shadow-lg"
          >
            Submit Request to Jade Dela Cruz's Pending Issuance Queue
          </button>
        </form>
      )}
    </div>
  );
}