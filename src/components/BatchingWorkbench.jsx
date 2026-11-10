import React, { useState, useEffect, useMemo } from 'react';
import {
  Scale, Plus, CheckCircle2, Clock, Truck, Printer,
  AlertCircle, ShieldCheck, Layers, CheckCheck,
  Sparkles, Lock, Unlock, Send, Check, XCircle, AlertTriangle, Package
} from 'lucide-react';
import { calculateRecipeIngredients } from '../utils/wmsLogic';
import {
  evaluateBatchCutoffPht,
  computeRecipeBatchBreakdown,
  formatDualUnitQuantity
} from '../data/SharedTaxonomy';
import {
  loadStoredSpecialtyProposals,
  persistSpecialtyProposals
} from '../utils/specialtyRecipeLogic';

export default function BatchingWorkbench({
  batchOrders,
  onSaveBatchOrder,
  onUpdateOrderStatus,
  onBulkReleaseOrders,
  onRequestBulkMaterials,
  onCancelOrder,
  onApproveSpecialtyRecipe,
  recipes,
  outlets,
  inventory = [],
  currentRole,
  isMobileMode
}) {
  const [activeSubTab, setActiveSubTab] = useState('workbench');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [selectedTagOrder, setSelectedTagOrder] = useState(null);
  const [scalingModalOrder, setScalingModalOrder] = useState(null);
  const [specialtyProposals, setSpecialtyProposals] = useState(() => loadStoredSpecialtyProposals());

  useEffect(() => {
    setSpecialtyProposals(loadStoredSpecialtyProposals());
  }, [activeSubTab]);

  const cutoffInfo = useMemo(() => evaluateBatchCutoffPht(new Date()), []);

  // Form for New Order (with Multi-Recipe Staging support)
  const [outletId, setOutletId] = useState(outlets[0]?.id || 'pan-de-verde');
  const [recipeSku, setRecipeSku] = useState(recipes[0]?.sku || 'BRD-PAN-001');
  const [batchMultiplier, setBatchMultiplier] = useState(1.0);
  const [targetDate, setTargetDate] = useState(cutoffInfo.scheduledDeliveryDate);
  const [orderNotes, setOrderNotes] = useState('');
  const [stagedIntakeList, setStagedIntakeList] = useState([]);

  const currentRecipe = recipes.find((r) => r.sku === recipeSku) || recipes[0];
  const selectedOutlet = outlets.find((o) => o.id === outletId) || outlets[0];

  const liveBreakdown = useMemo(
    () => computeRecipeBatchBreakdown(currentRecipe, batchMultiplier, inventory),
    [currentRecipe, batchMultiplier, inventory]
  );

  const handleStageIntakeRecipe = () => {
    if (!currentRecipe) return;
    const mult = parseFloat(batchMultiplier) || 1.0;
    const breakdown = computeRecipeBatchBreakdown(currentRecipe, mult, inventory);
    setStagedIntakeList((prev) => [
      ...prev,
      {
        id: `STAGE-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        recipeSku: currentRecipe.sku,
        recipeName: currentRecipe.name,
        batchMultiplier: mult,
        requestedQtyPcs: breakdown.estimatedYieldPcs,
        estimatedCost: breakdown.totalEstimatedCost,
        scaledIngredients: breakdown.scaledIngredients,
        notes: orderNotes.trim()
      }
    ]);
    setOrderNotes('');
  };

  const handleCreateOrder = (e) => {
    e.preventDefault();
    const freshCutoff = evaluateBatchCutoffPht(new Date());
    const itemsToCreate =
      stagedIntakeList.length > 0
        ? stagedIntakeList
        : [
            {
              recipeSku: currentRecipe.sku,
              recipeName: currentRecipe.name,
              batchMultiplier: parseFloat(batchMultiplier) || 1.0,
              requestedQtyPcs: liveBreakdown.estimatedYieldPcs,
              estimatedCost: liveBreakdown.totalEstimatedCost,
              scaledIngredients: liveBreakdown.scaledIngredients,
              notes: orderNotes.trim()
            }
          ];

    itemsToCreate.forEach((it, idx) => {
      const suffix = itemsToCreate.length > 1 ? `-${idx + 1}` : '';
      const newOrder = {
        orderId: `BORD-${freshCutoff.orderDate.replace(/-/g, '')}-${Date.now().toString().slice(-3)}${suffix}`,
        requestDate: freshCutoff.orderDate,
        scheduledScalingDate: freshCutoff.scheduledScalingDate,
        targetDate: targetDate || freshCutoff.scheduledDeliveryDate,
        isAfter3PmCutoff: freshCutoff.isAfterCutoff,
        cutoffStatusLabel: freshCutoff.cutoffStatusLabel,
        outletId: selectedOutlet.id,
        outletName: selectedOutlet.name,
        recipeSku: it.recipeSku,
        recipeName: it.recipeName,
        batchMultiplier: it.batchMultiplier,
        requestedQtyPcs: it.requestedQtyPcs,
        estimatedCost: it.estimatedCost,
        scaledIngredients: it.scaledIngredients,
        requestedBy: currentRole,
        enteredBy: currentRole,
        status: 'PENDING_BATCHING',
        bulkRequestStatus: 'NOT_REQUESTED',
        notes:
          [it.notes, `[${freshCutoff.cutoffStatusLabel}]`].filter(Boolean).join(' | ') ||
          `Standard outlet batch for ${selectedOutlet.name}.`
      };
      onSaveBatchOrder(newOrder);
    });

    setStagedIntakeList([]);
    setOrderNotes('');
    setActiveSubTab('workbench');
  };

  const handleCancelClick = (order) => {
    if (!onCancelOrder) return;
    const reason = window.prompt(
      `Cancel batch order ${order.orderId}?\n\nReason (logged to immutable audit trail):`,
      'Cancelled by ' + currentRole
    );
    if (reason !== null) {
      onCancelOrder(order.orderId, reason || 'No reason given');
    }
  };

  // =========================================================================
  // Consolidated Raw Material Roll-Up across all PENDING_BATCHING orders
  // Shows Romeo & Jade the exact total unit quantities & overall weight (kg/L/pcs)
  // =========================================================================
  const pendingOrdersForRollup = useMemo(
    () => batchOrders.filter((o) => o.status === 'PENDING_BATCHING'),
    [batchOrders]
  );

  const consolidatedBulkMaterials = useMemo(() => {
    const map = new Map();
    let grandTotalKg = 0;
    let grandTotalCost = 0;

    pendingOrdersForRollup.forEach((ord) => {
      const recipeObj = recipes.find((r) => r.sku === ord.recipeSku) || recipes[0];
      const breakdown = computeRecipeBatchBreakdown(recipeObj, ord.batchMultiplier || 1, inventory);

      breakdown.scaledIngredients.forEach((ing) => {
        if (ing.isWater) return;
        const mat = inventory.find((m) => m.code === ing.code) || {};
        const existing = map.get(ing.code) || {
          code: ing.code,
          name: mat.name || ing.name,
          secondaryUom: ing.secondaryUom || mat.secondaryUom || 'kg',
          primaryUom: mat.primaryUom || 'Unit',
          conversionFactor: Number(mat.conversionFactor || 1),
          totalSecQty: 0,
          totalGrams: 0,
          totalCost: 0,
          orderCount: 0
        };
        existing.totalSecQty = +(existing.totalSecQty + Number(ing.requiredSec || 0)).toFixed(3);
        existing.totalGrams += Number(ing.requiredGrams || 0);
        existing.totalCost = +(existing.totalCost + Number(ing.lineCost || 0)).toFixed(2);
        existing.orderCount += 1;
        map.set(ing.code, existing);

        if (existing.secondaryUom === 'kg' || existing.secondaryUom === 'L') {
          grandTotalKg = +(grandTotalKg + Number(ing.requiredSec || 0)).toFixed(3);
        }
        grandTotalCost = +(grandTotalCost + Number(ing.lineCost || 0)).toFixed(2);
      });
    });

    return {
      items: Array.from(map.values()),
      grandTotalKg,
      grandTotalCost
    };
  }, [pendingOrdersForRollup, recipes, inventory]);

  const filteredOrders = batchOrders.filter((order) => {
    if (filterStatus === 'ALL') return true;
    return order.status === filterStatus;
  });

  const readyToReleaseCount = batchOrders.filter((o) => o.status === 'BATCHED_KITTED').length;
  const pendingSpecialtyCount = specialtyProposals.filter((p) => p.status === 'PENDING_APPROVAL').length;

  const handleRequestAllPendingBulk = () => {
    const unrequested = pendingOrdersForRollup.filter(
      (o) => !o.bulkRequestStatus || o.bulkRequestStatus === 'NOT_REQUESTED'
    );
    unrequested.forEach((o) => {
      if (onRequestBulkMaterials) onRequestBulkMaterials(o.orderId);
    });
  };

  return (
    <div className="space-y-6">
      {/* Title & Overview Banner */}
      <div className="flex justify-between items-start flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold bg-[#C8963E] text-[#240e32] px-2 py-0.5 rounded">
              Form-PRO-001 / Form-ING-001
            </span>
            <h2 className="font-serif text-2xl font-bold text-[#3D1C52]">
              Outlet Ingredient Batching, Precision Scaling & Release Engine
            </h2>
          </div>
          <p className="text-xs text-gray-600 mt-0.5">
            3:00 PM PHT Daily Batching Cut-Off Active · Romeo-Jade Two-Step Bulk Handshake · Pre-Shift Scale Metrology (Seals #798073 & #798074)
          </p>
        </div>

        <div className="flex bg-white p-1 rounded-lg border border-[#E2D1B8] shadow-sm flex-wrap gap-1">
          <button
            onClick={() => setActiveSubTab('workbench')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
              activeSubTab === 'workbench'
                ? 'bg-[#3D1C52] text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Scale size={14} /> Romeo's Batching Workbench ({batchOrders.length})
          </button>
          <button
            onClick={() => setActiveSubTab('new_order')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
              activeSubTab === 'new_order'
                ? 'bg-[#C8963E] text-[#240e32] shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Plus size={14} /> Intake Multi-Recipe Order
          </button>
          <button
            onClick={() => setActiveSubTab('specialty_intake')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
              activeSubTab === 'specialty_intake'
                ? 'bg-[#B87333] text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Sparkles size={14} />
            <span>Specialty Recipe Intake ({pendingSpecialtyCount})</span>
          </button>
        </div>
      </div>

      {/* 3:00 PM PHT Cut-Off Status Strip */}
      <div
        className={`p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-xs ${
          cutoffInfo.isAfterCutoff
            ? 'bg-amber-50 border-amber-400 text-amber-950'
            : 'bg-emerald-50 border-emerald-300 text-emerald-950'
        }`}
      >
        <div className="flex items-center gap-2">
          <Clock size={16} className={cutoffInfo.isAfterCutoff ? 'text-amber-700' : 'text-emerald-700'} />
          <span>
            <strong>3:00 PM PHT Daily Cut-Off Gate:</strong> {cutoffInfo.cutoffStatusLabel}
          </span>
        </div>
        <span className="font-mono font-bold">
          Pre-Scale: {cutoffInfo.scheduledScalingDate} → Delivery: {cutoffInfo.scheduledDeliveryDate}
        </span>
      </div>

      {activeSubTab === 'workbench' && (
        <div className="space-y-5">
          {/* CONSOLIDATED BULK RAW MATERIAL SUMMARY FOR JADE'S ISSUANCE */}
          {consolidatedBulkMaterials.items.length > 0 && (
            <div className="bg-white p-5 rounded-2xl border-2 border-[#5B2E7A] shadow-md space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                <div>
                  <h3 className="font-serif font-bold text-base text-[#3D1C52] flex items-center gap-2">
                    <Package size={18} className="text-[#C8963E]" />
                    Consolidated Bulk Raw Materials Required from Jade ({pendingOrdersForRollup.length} Pending Batch Orders)
                  </h3>
                  <p className="text-xs text-gray-500">
                    Aggregated Recipe Ingredient List with Total Primary Units & Overall Weight to be drawn from Bodega
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right text-xs">
                    <span className="text-gray-500 block">Overall Solid/Liquid Weight:</span>
                    <strong className="text-sm font-mono font-extrabold text-[#1E7A3E]">
                      {consolidatedBulkMaterials.grandTotalKg.toLocaleString()} kg / L · ₱{consolidatedBulkMaterials.grandTotalCost.toLocaleString()}
                    </strong>
                  </div>
                  <button
                    type="button"
                    onClick={handleRequestAllPendingBulk}
                    className="bg-[#5B2E7A] hover:bg-[#3D1C52] text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow flex items-center gap-1.5"
                  >
                    <Send size={13} /> Request All Bulk Mats from Jade
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border rounded-lg overflow-hidden">
                  <thead className="bg-[#240e32] text-[#E5C585]">
                    <tr>
                      <th className="py-2 px-3">Material Code</th>
                      <th className="py-2 px-3">Raw Material Description</th>
                      <th className="py-2 px-3 text-right">Total Unit / Pack Quantity</th>
                      <th className="py-2 px-3 text-right">Overall Weight / Secondary Qty</th>
                      <th className="py-2 px-3 text-right">Est. Material Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {consolidatedBulkMaterials.items.map((m) => (
                      <tr key={m.code} className="hover:bg-purple-50/40">
                        <td className="py-1.5 px-3 font-mono font-bold text-[#5B2E7A]">{m.code}</td>
                        <td className="py-1.5 px-3 font-semibold">{m.name}</td>
                        <td className="py-1.5 px-3 text-right font-mono font-bold text-[#240e32]">
                          {formatDualUnitQuantity(m.totalSecQty, m)}
                        </td>
                        <td className="py-1.5 px-3 text-right font-mono font-extrabold text-[#1E7A3E]">
                          {m.totalSecQty.toLocaleString()} {m.secondaryUom}
                        </td>
                        <td className="py-1.5 px-3 text-right font-mono text-gray-700">
                          ₱{m.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Filter & Collective Release Toolbar */}
          <div className="bg-white p-3 rounded-xl border border-[#E2D1B8] shadow-sm flex flex-wrap justify-between items-center gap-3">
            <div className="flex gap-1.5 flex-wrap">
              {['ALL', 'PENDING_BATCHING', 'BATCHED_KITTED', 'RELEASED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    filterStatus === st
                      ? 'bg-[#3D1C52] text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {st.replace('_', ' ')} (
                  {st === 'ALL'
                    ? batchOrders.length
                    : batchOrders.filter((o) => o.status === st).length}
                  )
                </button>
              ))}
            </div>

            <button
              onClick={onBulkReleaseOrders}
              disabled={readyToReleaseCount === 0}
              className={`px-4 py-2 rounded-lg text-xs font-bold shadow-md flex items-center gap-1.5 transition ${
                readyToReleaseCount > 0
                  ? 'bg-[#1E7A3E] text-white cursor-pointer'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <CheckCheck size={16} />
              <span>Batch Release All Completed ({readyToReleaseCount})</span>
            </button>
          </div>

          {/* Orders Cards Grid — Now displays full Recipe Ingredient List & Total Weight per Order */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredOrders.map((order) => {
              const isPending = order.status === 'PENDING_BATCHING';
              const isBatched = order.status === 'BATCHED_KITTED';
              const isReleased = order.status === 'RELEASED';
              const isBulkApproved = order.bulkRequestStatus === 'BULK_ISSUED_BY_JADE';
              const isBulkPending = order.bulkRequestStatus === 'PENDING_JADE_APPROVAL';
              const isBulkNotRequested = !order.bulkRequestStatus || order.bulkRequestStatus === 'NOT_REQUESTED';

              const recipeObj = recipes.find((r) => r.sku === order.recipeSku) || recipes[0];
              const breakdown = computeRecipeBatchBreakdown(recipeObj, order.batchMultiplier || 1, inventory);
              const totalOrderWeightKg = +breakdown.scaledIngredients
                .filter((i) => !i.isWater && (i.secondaryUom === 'kg' || i.secondaryUom === 'L'))
                .reduce((s, i) => s + Number(i.requiredSec || 0), 0)
                .toFixed(2);

              return (
                <div
                  key={order.orderId}
                  className={`bg-white rounded-xl border shadow-sm p-4 flex flex-col justify-between space-y-3 transition ${
                    isPending ? 'border-amber-300 bg-amber-50/10' : isBatched ? 'border-blue-300' : 'border-green-200'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[11px] font-bold text-[#5B2E7A]">{order.orderId}</span>
                        {order.scheduledScalingDate && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                            Scale: {order.scheduledScalingDate} · Deliver: {order.targetDate || order.scheduledScalingDate}
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-base text-gray-900 mt-0.5">{order.recipeName}</h4>
                      <p className="text-xs font-semibold text-[#C8963E]">{order.outletName}</p>
                    </div>

                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                      {order.status}
                    </span>
                  </div>

                  {/* Two-Step Handshake Status Strip */}
                  {isPending && (
                    <div
                      className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-2 ${
                        isBulkApproved
                          ? 'bg-green-50 border-green-300 text-green-900'
                          : isBulkPending
                          ? 'bg-amber-50 border-amber-300 text-amber-900'
                          : 'bg-purple-50 border-purple-200 text-[#5B2E7A]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        {isBulkApproved ? <Unlock size={14} /> : <Lock size={14} />}
                        <span className="font-semibold text-[11px]">
                          {isBulkApproved && `✓ Bodega Release Authorized by ${order.bulkApprovedBy || 'Jade'}`}
                          {isBulkPending && '⏳ Bulk Requisition Sent to Jade — Scale & Kit Locked'}
                          {isBulkNotRequested && `Draw ${totalOrderWeightKg} kg Bulk Materials from Jade`}
                        </span>
                      </div>

                      {isBulkNotRequested && (
                        <button
                          onClick={() => onRequestBulkMaterials && onRequestBulkMaterials(order.orderId)}
                          className="bg-[#5B2E7A] hover:bg-[#3D1C52] text-white text-[10px] font-bold px-2.5 py-1 rounded shadow flex items-center gap-1 shrink-0"
                        >
                          <Send size={11} /> Request Bulk Mats
                        </button>
                      )}
                    </div>
                  )}

                  {/* Recipe Ingredient List & Total Weight Breakdown for Jade/Romeo */}
                  <div className="bg-[#FAF6EE] p-3 rounded-lg border border-[#E2D1B8] text-xs space-y-2">
                    <div className="flex flex-wrap justify-between items-center text-gray-800 border-b border-[#E2D1B8] pb-1.5">
                      <span>Multiplier: <strong>{order.batchMultiplier}x</strong> ({order.requestedQtyPcs} pcs)</span>
                      <span>Dry/Wet Weight: <strong className="text-[#1E7A3E]">{totalOrderWeightKg} kg</strong></span>
                      <span>Est. Cost: <strong className="text-purple-900">₱{breakdown.totalEstimatedCost.toLocaleString()}</strong></span>
                    </div>

                    <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                      {breakdown.scaledIngredients.map((ing, i) => (
                        <div key={i} className="flex justify-between text-[11px]">
                          <span className="truncate">
                            <code className="font-bold text-[#5B2E7A]">{ing.code}</code> · {ing.name}
                          </span>
                          <span className="font-mono font-bold text-gray-900 shrink-0 ml-2">
                            {ing.dualUnitDisplay}
                          </span>
                        </div>
                      ))}
                    </div>

                    {order.notes && (
                      <p className="text-[11px] text-gray-600 italic border-t border-gray-200 pt-1.5 whitespace-pre-line">
                        <strong>Remarks / Handling:</strong> {order.notes}
                      </p>
                    )}
                  </div>

                  {/* Action Bar */}
                  <div className="pt-2 border-t border-gray-100 flex flex-wrap justify-between items-center gap-2">
                    <span className="text-[11px] text-gray-500">By: {order.enteredBy || order.requisitionedBy}</span>
                    <div className="flex items-center gap-1.5">
                      {isPending && (
                        <button
                          onClick={() => setScalingModalOrder(order)}
                          disabled={!isBulkApproved}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold shadow flex items-center gap-1 ${
                            isBulkApproved
                              ? 'bg-[#C8963E] text-[#240e32]'
                              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          {isBulkApproved ? <Unlock size={13} /> : <Lock size={13} />}
                          <span>Scale & Kit Batch</span>
                        </button>
                      )}
                      {isBatched && (
                        <button
                          onClick={() => onUpdateOrderStatus(order.orderId, 'RELEASED')}
                          className="bg-[#1E7A3E] text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow flex items-center gap-1"
                        >
                          <Truck size={13} /> Release to Outlet
                        </button>
                      )}
                      {isPending && onCancelOrder && (
                        <button
                          onClick={() => handleCancelClick(order)}
                          className="bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1"
                        >
                          <XCircle size={13} /> Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: INTAKE MULTI-RECIPE OUTLET ORDER */}
      {activeSubTab === 'new_order' && (
        <form onSubmit={handleCreateOrder} className="bg-white p-5 rounded-xl border border-[#E2D1B8] shadow-sm space-y-5">
          <div className="border-b border-gray-200 pb-3 flex justify-between items-center flex-wrap gap-2">
            <div>
              <h3 className="font-serif font-bold text-base text-[#5B2E7A] flex items-center gap-2">
                <Plus size={18} /> Intake Multi-Recipe Outlet Ingredient Batch Order (`Form-PRO-001`)
              </h3>
              <p className="text-xs text-gray-500">
                Stage multiple recipes with full BOM, yield, cost, and multi-line handling remarks
              </p>
            </div>
            <button
              type="button"
              onClick={handleStageIntakeRecipe}
              className="bg-[#C8963E] text-[#240e32] font-extrabold text-xs px-3.5 py-2 rounded-lg shadow flex items-center gap-1"
            >
              <Plus size={14} /> Add Recipe to Order List
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Target Outlet / Facility</label>
              <select
                value={outletId}
                onChange={(e) => setOutletId(e.target.value)}
                className="w-full p-2 border rounded bg-white font-medium"
              >
                {outlets.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Target Product Recipe</label>
              <select
                value={recipeSku}
                onChange={(e) => setRecipeSku(e.target.value)}
                className="w-full p-2 border rounded bg-white font-medium"
              >
                {recipes.map((r) => (
                  <option key={r.sku} value={r.sku}>{r.sku} - {r.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Batch Multiplier</label>
              <input
                type="number"
                min="0.25"
                step="0.25"
                value={batchMultiplier}
                onChange={(e) => setBatchMultiplier(parseFloat(e.target.value) || 1.0)}
                className="w-full p-2 border rounded font-mono font-bold text-[#3D1C52]"
              />
              <span className="text-[10px] text-gray-500 mt-0.5 block">
                Yield: <strong>{liveBreakdown.estimatedYieldPcs} pcs</strong> · Cost: <strong>₱{liveBreakdown.totalEstimatedCost.toLocaleString()}</strong>
              </span>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Scheduled Delivery Date</label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full p-2 border rounded text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1 text-xs">
              Multi-Line Handling Instructions / Remarks
            </label>
            <textarea
              rows={3}
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              placeholder="Enter multi-line handling instructions, ice substitution notes, or delivery staging remarks..."
              className="w-full p-2.5 border rounded-lg text-xs"
            />
          </div>

          {stagedIntakeList.length > 0 && (
            <div className="space-y-2 bg-[#FAF6EE] p-3.5 rounded-xl border border-[#C8963E]">
              <div className="font-bold text-xs text-[#240e32]">
                Staged Recipes Ready for Submission ({stagedIntakeList.length}):
              </div>
              {stagedIntakeList.map((st) => (
                <div key={st.id} className="bg-white p-2.5 rounded-lg border flex justify-between items-center text-xs">
                  <span>
                    <strong>{st.recipeSku}</strong> · {st.recipeName} ({st.batchMultiplier}x · {st.requestedQtyPcs} pcs · ₱{st.estimatedCost.toLocaleString()})
                  </span>
                  <button
                    type="button"
                    onClick={() => setStagedIntakeList((prev) => prev.filter((x) => x.id !== st.id))}
                    className="text-red-600 font-bold"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-[#240e32] text-[#E5C585] font-bold text-xs px-6 py-2.5 rounded-lg shadow-md"
            >
              Submit {stagedIntakeList.length > 0 ? `${stagedIntakeList.length} Batch Order(s)` : 'Batch Order'} to Romeo's Queue
            </button>
          </div>
        </form>
      )}
    </div>
  );
}