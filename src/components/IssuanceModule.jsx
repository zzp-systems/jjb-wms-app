import React, { useState } from 'react';
import { 
  FileText, Plus, Trash2, CheckCircle2, AlertCircle, 
  Printer, ArrowUpRight, Clock, ShieldCheck, Scale, AlertTriangle,
  Inbox, XCircle, Package, Utensils
} from 'lucide-react';
import { MASTER_RECIPES } from '../data/recipesData';
import { calculateRecipeIngredients } from '../utils/wmsLogic';

export default function IssuanceModule({ 
  inventory, 
  onSaveWithdrawal, 
  withdrawals, 
  batchOrders = [],
  onApprovePendingWithdrawal,
  pendingRequests = [],
  onIssuePendingRequest,
  onCancelPendingRequest,
  currentRole,
  isMobileMode,
  prefilledItem 
}) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [slipNo, setSlipNo] = useState(`WS-${todayStr.replace(/-/g, '')}-${String(withdrawals.length + 1).padStart(3, '0')}`);
  const [requestingEntity, setRequestingEntity] = useState('');
  const [department, setDepartment] = useState('');
  const [purpose, setPurpose] = useState('');
  const [requestedBy, setRequestedBy] = useState('');
  const [receivedBy, setReceivedBy] = useState('');
  const [selectedSlipView, setSelectedSlipView] = useState(null);
  const [validationError, setValidationError] = useState(null);

  // Default item from inventory
  const defaultMat = inventory[0] || {
    code: 'RM-FLR-001',
    name: 'All Purpose Flour',
    secondaryUom: 'kg',
    room: 'Dry Room 1'
  };

  // Line items (Clean Initial State)
  const [items, setItems] = useState([
    prefilledItem ? {
      materialCode: prefilledItem.code,
      name: prefilledItem.name,
      qtyRequestedSec: 0,
      qtyIssuedSec: 0,
      secondaryUom: prefilledItem.secondaryUom,
      lotNumber: prefilledItem.lots?.[0]?.lotNumber || 'FEFO-QUEUED',
      storageRoom: prefilledItem.room || 'Dry Room 1',
      remarks: ''
    } : {
      materialCode: defaultMat.code,
      name: defaultMat.name,
      qtyRequestedSec: 0,
      qtyIssuedSec: 0,
      secondaryUom: defaultMat.secondaryUom,
      lotNumber: defaultMat.lots?.[0]?.lotNumber || 'FEFO-QUEUED',
      storageRoom: defaultMat.room || 'Dry Room 1',
      remarks: ''
    }
  ]);

  // ----------------------------------------------------------------------
  // QUEUE 1: Pending bulk requisitions from Romeo (batching workbench)
  // ----------------------------------------------------------------------
  const pendingBulkRequests = batchOrders.filter(
    b => b.bulkRequestStatus === 'PENDING_JADE_APPROVAL'
  );

  // ----------------------------------------------------------------------
  // QUEUE 2: Pending material requests from Portal / in-app staff entry
  // These are queued by the Outlet Portal (standalone or in-app). They DO
  // NOT deduct stock. Jade must click "Issue & Deduct Stock" to convert
  // a request into a withdrawal + trigger inventory decrement + POST
  // WITHDRAWAL_SAVED to /api/sync.
  // ----------------------------------------------------------------------
  const pendingMaterialRequests = (pendingRequests || []).filter(
    r => r.status === 'PENDING_ISSUANCE'
  );

  const handleMaterialChange = (index, code) => {
    const mat = inventory.find(m => m.code === code);
    if (!mat) return;
    const oldestLot = mat.lots && mat.lots.length > 0 ? mat.lots[0].lotNumber : 'DEFAULT-LOT';
    setItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      return {
        ...item,
        materialCode: mat.code,
        name: mat.name,
        secondaryUom: mat.secondaryUom,
        storageRoom: mat.room,
        lotNumber: oldestLot
      };
    }));
  };

  const handleQtyChange = (index, qty) => {
    const val = parseFloat(qty) || 0;
    setItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      return {
        ...item,
        qtyRequestedSec: val,
        qtyIssuedSec: val
      };
    }));
  };

  const handleAddRow = () => {
    const defaultMat = inventory[0];
    const oldestLot = defaultMat.lots && defaultMat.lots.length > 0 ? defaultMat.lots[0].lotNumber : 'DEFAULT-LOT';
    setItems(prev => [
      ...prev,
      {
        materialCode: defaultMat.code,
        name: defaultMat.name,
        qtyRequestedSec: 10.0,
        qtyIssuedSec: 10.0,
        secondaryUom: defaultMat.secondaryUom,
        lotNumber: oldestLot,
        storageRoom: defaultMat.room,
        remarks: 'FEFO Verified'
      }
    ]);
  };

  const handleRemoveRow = (index) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError(null);

    for (const item of items) {
      if (!item.qtyIssuedSec || item.qtyIssuedSec <= 0) {
        setValidationError(`Please specify a valid quantity for ${item.name}.`);
        return;
      }
    }

    const newWithdrawal = {
      slipNo,
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      requestingEntity,
      department,
      purpose,
      requestedBy,
      issuedBy: `${currentRole} (Warehouse Custodian)`,
      receivedBy,
      items,
      status: "ISSUED & RECONCILED",
      sourceChannel: 'MANUAL'
    };

    onSaveWithdrawal(newWithdrawal);
    setSlipNo(`WS-${todayStr.replace(/-/g, '')}-${String(withdrawals.length + 2).padStart(3, '0')}`);
  };

  // Split withdrawals by channel for a small traceability chip
  const channelChip = (w) => {
    const ch = w.sourceChannel || 'MANUAL';
    const colors = {
      PORTAL: 'bg-blue-100 text-blue-800 border-blue-200',
      IN_APP_STAFF_ENTRY: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      BULK_BATCHING: 'bg-purple-100 text-purple-800 border-purple-200',
      MANUAL: 'bg-gray-100 text-gray-700 border-gray-200'
    };
    const labels = {
      PORTAL: 'Portal',
      IN_APP_STAFF_ENTRY: 'Staff Entry',
      BULK_BATCHING: 'Bulk',
      MANUAL: 'Manual'
    };
    return (
      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${colors[ch] || colors.MANUAL}`}>
        {labels[ch] || ch}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold bg-[#5B2E7A] text-white px-2 py-0.5 rounded">
              Form-WAR-001
            </span>
            <h2 className="font-serif text-2xl font-bold text-[#3D1C52]">
              Material Release &amp; Stock Withdrawal Slip
            </h2>
          </div>
          <p className="text-xs text-gray-600 mt-0.5">
            Strict First-Expired, First-Out (FEFO) Rotation · Real-Time Balance Deduction · Dual Custodial Sign-Off
          </p>
        </div>
        <div className="bg-[#FAF6EE] border border-[#C8963E]/40 px-3 py-1.5 rounded-lg text-right text-xs">
          <p className="font-bold text-[#5B2E7A]">Warehouse Issuance Lead: Jade Q. Dela Cruz</p>
          <p className="text-gray-500 text-[11px]">Unlogged floor releases = Immediate Production Stoppage</p>
        </div>
      </div>

      {/* ================================================================ */}
      {/* QUEUE 1: PENDING BULK MATERIAL PULL REQUESTS FROM ROMEO MALUSAY */}
      {/* ================================================================ */}
      {pendingBulkRequests.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-4 shadow-md space-y-3">
          <div className="flex justify-between items-center flex-wrap gap-2 border-b border-amber-200 pb-2">
            <div className="flex items-center gap-2">
              <Scale size={20} className="text-amber-700" />
              <div>
                <h3 className="font-serif font-bold text-base text-amber-900">
                  Pending Bulk Material Requisitions from Romeo Malusay ({pendingBulkRequests.length} Orders)
                </h3>
                <p className="text-xs text-amber-700">
                  Dry Room 2 Batching Workbench is waiting for Bodega Release. Romeo cannot scale &amp; kit until Jade authorizes stock deduction.
                </p>
              </div>
            </div>
            <span className="text-xs font-bold bg-amber-200 text-amber-900 px-2.5 py-1 rounded-full animate-pulse">
              Action Required by Jade
            </span>
          </div>

          <div className="space-y-3">
            {pendingBulkRequests.map(order => {
              const recipe = MASTER_RECIPES.find(r => r.sku === order.recipeSku);
              const ingredients = recipe ? calculateRecipeIngredients(recipe, order.batchMultiplier) : [];

              return (
                <div key={order.orderId} className="bg-white p-3.5 rounded-lg border border-amber-200 shadow-xs space-y-2.5">
                  <div className="flex justify-between items-start gap-2 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#5B2E7A]">{order.orderId}</span>
                        <span className="text-[11px] font-semibold text-gray-500">Requisitioned at {order.bulkRequestedAt || 'Today'}</span>
                      </div>
                      <h4 className="font-bold text-sm text-gray-900 mt-0.5">{order.recipeName}</h4>
                      <p className="text-xs text-[#C8963E] font-semibold">
                        Destination: {order.outletName} ({order.requestedQtyPcs} pcs · {order.batchMultiplier}x multiplier)
                      </p>
                    </div>

                    <button
                      onClick={() => onApprovePendingWithdrawal && onApprovePendingWithdrawal(order.orderId)}
                      className="bg-[#1E7A3E] hover:bg-[#165c2f] text-white text-xs font-bold px-4 py-2 rounded-lg shadow flex items-center gap-1.5 transition"
                    >
                      <CheckCircle2 size={15} /> Authorize &amp; Issue Bulk Mats (`Form-WAR-001`)
                    </button>
                  </div>

                  <div className="bg-[#FAF6EE] p-2.5 rounded border border-[#E2D1B8] text-xs">
                    <p className="font-bold text-[#3D1C52] mb-1">Required Raw Materials to Deduct from Bodega:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {ingredients.map((ing, idx) => {
                        const mat = inventory.find(m => m.code === ing.code);
                        const isAvailable = mat && mat.currentBalance >= ing.requiredKg;
                        return (
                          <div key={idx} className="bg-white p-2 rounded border text-[11px]">
                            <p className="font-bold text-gray-800">{ing.name}</p>
                            <div className="flex justify-between mt-0.5">
                              <span className="font-mono font-bold text-[#5B2E7A]">{ing.requiredKg} kg ({ing.requiredGrams}g)</span>
                              <span className={`font-semibold ${isAvailable ? 'text-green-700' : 'text-red-600'}`}>
                                {isAvailable ? '✓ In Stock' : '⚠️ Low Stock'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* QUEUE 2: PENDING MATERIAL REQUESTS FROM PORTAL / STAFF ENTRY    */}
      {/* ================================================================ */}
      {pendingMaterialRequests.length > 0 && (
        <div className="bg-blue-50 border-2 border-blue-400 rounded-xl p-4 shadow-md space-y-3">
          <div className="flex justify-between items-center flex-wrap gap-2 border-b border-blue-200 pb-2">
            <div className="flex items-center gap-2">
              <Inbox size={20} className="text-blue-700" />
              <div>
                <h3 className="font-serif font-bold text-base text-blue-900">
                  Pending Material Requests Awaiting Your Issuance ({pendingMaterialRequests.length})
                </h3>
                <p className="text-xs text-blue-700">
                  Submitted from the Outlet Portal kiosk or in-app staff entry on behalf of a phone-in request.
                  <strong> Materials are NOT deducted until you click "Issue &amp; Deduct Stock"</strong> — this is the physical handoff confirmation.
                </p>
              </div>
            </div>
            <span className="text-xs font-bold bg-blue-200 text-blue-900 px-2.5 py-1 rounded-full animate-pulse">
              Action Required by Jade
            </span>
          </div>

          <div className="space-y-3">
            {pendingMaterialRequests.map(req => {
              const sourceLabel =
                req.sourceChannel === 'PORTAL' ? 'Outlet Portal' :
                req.sourceChannel === 'IN_APP_STAFF_ENTRY' ? 'In-App Staff Entry' :
                req.sourceChannel || 'Manual';

              return (
                <div key={req.requestId} className="bg-white p-3.5 rounded-lg border border-blue-200 shadow-xs space-y-2.5">
                  <div className="flex justify-between items-start gap-2 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-blue-700">{req.requestId}</span>
                        <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded uppercase">
                          {sourceLabel}
                        </span>
                        <span className="text-[11px] text-gray-500">
                          {req.dateRequested} {req.timeRequested}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-gray-900 mt-1 flex items-center gap-1.5">
                        {(req.requestingEntity || '').toLowerCase().includes('mess') && (
                          <Utensils size={13} className="text-amber-600" />
                        )}
                        <span>{req.requestingEntity}</span>
                      </h4>
                      <p className="text-xs text-gray-700 mt-0.5">
                        Requested by: <span className="font-semibold">{req.requestedBy}</span>
                        {req.enteredBy && req.enteredBy !== req.requestedBy && (
                          <> · Entered by: <span className="font-semibold">{req.enteredBy}</span></>
                        )}
                      </p>
                      <p className="text-xs text-gray-600">
                        Purpose: <span className="font-medium">{req.purpose}</span> ·
                        Needed by: <span className="font-mono font-semibold">{req.neededByDate}</span>
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-gray-500 uppercase font-bold">Est. Value</div>
                      <div className="font-bold text-emerald-700 text-sm">
                        ₱{Number(req.totalEstimatedCost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[11px] text-gray-500">{req.items.length} item{req.items.length !== 1 ? 's' : ''}</div>
                    </div>
                  </div>

                  {/* Items list with stock availability indicators */}
                  <div className="bg-[#FAF6EE] p-2.5 rounded border border-blue-100 text-xs space-y-1">
                    {req.items.map((it, idx) => {
                      const mat = inventory.find(m => m.code === it.materialCode);
                      const available = mat?.currentBalance || 0;
                      const sufficient = available >= (it.qtyRequestedSec || 0);
                      return (
                        <div key={idx} className="flex justify-between items-center gap-2">
                          <div className="flex-1 min-w-0 truncate">
                            <span className="font-mono text-[11px] text-blue-700">{it.materialCode}</span>
                            <span className="text-gray-400 mx-1">·</span>
                            <span className="text-gray-800">{it.name}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="font-mono font-bold text-blue-800">
                              {it.qtyRequestedSec} {it.secondaryUom}
                            </span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                              sufficient 
                                ? 'bg-green-100 text-green-800 border-green-200' 
                                : 'bg-red-100 text-red-800 border-red-200'
                            }`}>
                              {sufficient ? `✓ ${available} avail` : `⚠ Only ${available}`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {req.notes && (
                    <p className="text-[11px] text-gray-500 italic">Note: {req.notes}</p>
                  )}

                  <div className="flex gap-2 pt-1 justify-end">
                    <button
                      onClick={() => {
                        const reason = window.prompt('Reason for cancelling this request?', 'Cancelled by Jade');
                        if (reason !== null) {
                          onCancelPendingRequest && onCancelPendingRequest(req.requestId, reason);
                        }
                      }}
                      className="bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition"
                    >
                      <XCircle size={14} /> Cancel Request
                    </button>
                    <button
                      onClick={() => onIssuePendingRequest && onIssuePendingRequest(req.requestId)}
                      className="bg-[#1E7A3E] hover:bg-[#165c2f] text-white text-xs font-bold px-4 py-2 rounded-lg shadow flex items-center gap-1.5 transition"
                    >
                      <CheckCircle2 size={15} /> Issue &amp; Deduct Stock
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* MANUAL ISSUANCE FORM (existing)                                  */}
      {/* ================================================================ */}
      <form onSubmit={handleSubmit} className="bg-white p-5 rounded-xl border border-[#E2D1B8] shadow-sm space-y-5">
        <div className="border-b border-gray-200 pb-3 flex justify-between items-center flex-wrap gap-2">
          <h3 className="font-serif font-bold text-[#5B2E7A] flex items-center gap-2 text-base">
            <ArrowUpRight size={18} /> New Raw Material Requisition Slip
          </h3>
          <span className="text-xs bg-purple-50 text-[#5B2E7A] font-bold px-2.5 py-1 rounded border border-purple-200">
            Real-Time Release (Pre-Bake Door Handoff)
          </span>
        </div>

        {validationError && (
          <div className="p-3 bg-red-50 border border-red-300 text-red-800 text-xs rounded-lg flex items-center gap-2">
            <AlertTriangle size={15} />
            <span>{validationError}</span>
          </div>
        )}

        {/* Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block font-bold text-gray-700 mb-1">Withdrawal Slip #</label>
            <input 
              type="text" 
              value={slipNo} 
              readOnly 
              className="w-full p-2 border rounded bg-gray-50 font-mono font-bold text-[#5B2E7A]" 
            />
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Requesting Production Line / Outlet</label>
            <select
              value={requestingEntity}
              onChange={(e) => {
                const val = e.target.value;
                setRequestingEntity(val);
                if (val.includes('Biscocho')) setDepartment('Production - Biscocho Hall');
                else if (val.includes('Otap')) setDepartment('Production - Otap Hall');
                else if (val.includes('Pan de Verde')) setDepartment('Retail Outlets Dispatch (Communal)');
                else if (val.includes('Laurice')) setDepartment('Retail Outlets Dispatch (Bankerohan)');
                else setDepartment('Central Production Support');
              }}
              className="w-full p-2 border rounded bg-white font-medium"
            >
              <option>Indangan - Biscocho Commercial Line</option>
              <option>Indangan - Otap Laminated Line</option>
              <option>Pan de Verde Outlet (Communal)</option>
              <option>Laurice Delicacies Outlet (Bankerohan)</option>
              <option>Biscocho Buttermilk Sweet Glaze (Banya Sub-Line)</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Target Department / Cost Center</label>
            <input 
              type="text" 
              value={department} 
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full p-2 border rounded text-xs bg-gray-50" 
            />
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Requisition Purpose / Reason</label>
            <input 
              type="text" 
              value={purpose} 
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full p-2 border rounded text-xs" 
              placeholder="e.g. Commercial Morning Run"
            />
          </div>
        </div>

        {/* Authorized Signoff Personnel */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-[#FAF6EE] p-3 rounded-lg border border-[#E2D1B8]">
          <div>
            <label className="block font-bold text-gray-700 mb-1">Requisitioned By (Baker / Outlet)</label>
            <select
              value={requestedBy}
              onChange={(e) => setRequestedBy(e.target.value)}
              className="w-full p-2 border rounded bg-white"
            >
              <option>Alwen Hermogeno (Master Head Baker - Biscocho)</option>
              <option>Reymark V. Albia (Head Baker - Otap)</option>
              <option>Feliciano T. Gomera (Head Baker - Pan de Verde)</option>
              <option>Raffy Boy P. Cortes (Head Baker - Laurice Delicacies)</option>
              <option>Romeo B. Malusay (Ingredient Batching Preparer)</option>
              <option>Irene C. Capada (Biscocho Production Manager)</option>
              <option>Zillah F. Tilan (Otap Production Manager)</option>
            </select>
          </div>
          <div>
            <label className="block font-bold text-gray-700 mb-1">Warehouse Custodian / Issuer</label>
            <input 
              type="text" 
              value={`${currentRole} (Warehouse Custodian)`} 
              disabled 
              className="w-full p-2 border rounded bg-gray-100 font-bold text-[#5B2E7A]" 
            />
          </div>
          <div>
            <label className="block font-bold text-gray-700 mb-1">Physically Received By (Floor Handoff)</label>
            <input 
              type="text" 
              value={receivedBy} 
              onChange={(e) => setReceivedBy(e.target.value)}
              className="w-full p-2 border rounded" 
              placeholder="e.g. Vicky Albino / Othniel Tilan"
            />
          </div>
        </div>

        {/* Requisition Line Items */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="font-serif font-bold text-[#3D1C52] text-sm">
              Materials to be Withdrawn &amp; FEFO Lot Selection
            </h4>
            <button
              type="button"
              onClick={handleAddRow}
              className="text-xs bg-[#5B2E7A] text-white px-3 py-1.5 rounded font-bold hover:bg-[#3D1C52] flex items-center gap-1"
            >
              <Plus size={13} /> Add Requisition Item
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, idx) => {
              const mat = inventory.find(m => m.code === item.materialCode);
              const available = mat ? mat.currentBalance : 0;
              const isInsufficient = available < item.qtyIssuedSec;

              return (
                <div key={idx} className="p-3.5 rounded-xl border border-[#E2D1B8] bg-white shadow-sm space-y-2">
                  <div className="flex justify-between items-start gap-2 flex-wrap">
                    <div className="flex-1 min-w-[280px]">
                      <label className="block text-[11px] font-bold text-gray-600 mb-1">
                        Material #{idx + 1}
                      </label>
                      <select
                        value={item.materialCode}
                        onChange={(e) => handleMaterialChange(idx, e.target.value)}
                        className="w-full p-2 text-xs border rounded bg-white font-medium"
                      >
                        {inventory.map(m => (
                          <option key={m.code} value={m.code}>
                            {m.code} — {m.name} (Available: {m.currentBalance.toLocaleString()} {m.secondaryUom})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono px-2 py-1 bg-gray-100 rounded">
                        Available: <strong className={available <= 0 ? 'text-red-600' : 'text-green-700'}>{available.toLocaleString()} {item.secondaryUom}</strong>
                      </span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(idx)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-gray-600 font-semibold mb-1">
                        Quantity to Withdraw ({item.secondaryUom})
                      </label>
                      <input
                        type="number"
                        min="0.01"
                        step="any"
                        value={item.qtyIssuedSec}
                        onChange={(e) => handleQtyChange(idx, e.target.value)}
                        className={`w-full p-2 border rounded font-mono font-bold ${
                          isInsufficient ? 'bg-red-50 border-red-300 text-red-600' : 'text-[#3D1C52]'
                        }`}
                      />
                      {isInsufficient && (
                        <span className="text-[10px] text-red-600 font-bold block mt-0.5">
                          ⚠️ Exceeds current stock balance ({available} {item.secondaryUom})
                        </span>
                      )}
                    </div>

                    <div>
                      <label className="block text-gray-600 font-semibold mb-1">
                        Target Lot # (Strict FEFO Oldest)
                      </label>
                      <select
                        value={item.lotNumber}
                        onChange={(e) => {
                          const val = e.target.value;
                          setItems(prev => prev.map((it, i) => i === idx ? { ...it, lotNumber: val } : it));
                        }}
                        className="w-full p-2 border rounded bg-white font-mono text-xs"
                      >
                        {mat && mat.lots && mat.lots.length > 0 ? (
                          mat.lots.map((l, li) => (
                            <option key={li} value={l.lotNumber}>
                              {l.lotNumber} (Exp: {l.expiryDate} · {l.qtySec} {mat.secondaryUom} on {l.location})
                            </option>
                          ))
                        ) : (
                          <option value="DEFAULT-LOT">Standard Active Batch Lot</option>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-gray-600 font-semibold mb-1">Verification Remarks</label>
                      <input
                        type="text"
                        value={item.remarks}
                        onChange={(e) => {
                          const val = e.target.value;
                          setItems(prev => prev.map((it, i) => i === idx ? { ...it, remarks: val } : it));
                        }}
                        className="w-full p-2 border rounded text-xs"
                        placeholder="e.g. Sifted, tempered to 18°C"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="pt-4 border-t flex justify-end">
          <button
            type="submit"
            className="bg-[#5B2E7A] hover:bg-[#3D1C52] text-white font-bold text-xs px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 transition"
          >
            <CheckCircle2 size={16} /> Authorize &amp; Deduct Stock Withdrawal (`Form-WAR-001`)
          </button>
        </div>
      </form>

      {/* HISTORICAL WITHDRAWALS LOGBOOK */}
      <div className="bg-white rounded-xl border border-[#E2D1B8] shadow-sm overflow-hidden">
        <div className="px-6 py-3.5 bg-[#FAF6EE] border-b border-[#E2D1B8] flex justify-between items-center">
          <h3 className="font-serif font-bold text-[#5B2E7A]">
            Materials Issuance &amp; Floor Withdrawal Ledger (`Form-WAR-001` Archive)
          </h3>
          <span className="text-xs text-gray-500 font-medium">{withdrawals.length} logged slips</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#5B2E7A] text-white">
              <tr>
                <th className="p-3">Slip #</th>
                <th className="p-3">Date &amp; Time</th>
                <th className="p-3">Requesting Production Line / Outlet</th>
                <th className="p-3">Purpose</th>
                <th className="p-3">Withdrawn Items</th>
                <th className="p-3">Requested By</th>
                <th className="p-3">Received By</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Slip</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2D1B8]">
              {withdrawals.map((w, i) => (
                <tr key={i} className="hover:bg-[#FAF6EE]/50">
                  <td className="p-3 font-mono font-bold text-[#5B2E7A]">
                    <div className="flex flex-col gap-1">
                      <span>{w.slipNo}</span>
                      {channelChip(w)}
                    </div>
                  </td>
                  <td className="p-3 text-gray-600">{w.date} {w.time}</td>
                  <td className="p-3 font-medium text-gray-900">{w.requestingEntity}</td>
                  <td className="p-3 text-gray-600">{w.purpose}</td>
                  <td className="p-3">
                    {w.items?.map((it, idx) => (
                      <span key={idx} className="block text-[11px] text-gray-700">
                        • {it.qtyIssuedSec} {it.secondaryUom} {it.name} <span className="font-mono text-gray-400">({it.lotNumber})</span>
                      </span>
                    ))}
                  </td>
                  <td className="p-3 text-gray-700">{w.requestedBy}</td>
                  <td className="p-3 text-gray-700 font-semibold">{w.receivedBy}</td>
                  <td className="p-3 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-[#1E7A3E]">
                      {w.status}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => setSelectedSlipView(w)}
                      className="text-xs text-[#5B2E7A] hover:underline font-bold"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FORM-WAR-001 PRINTABLE MODAL */}
      {selectedSlipView && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border-2 border-[#5B2E7A] space-y-4">
            <div className="flex justify-between items-start border-b-2 border-[#5B2E7A] pb-3">
              <div>
                <p className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">JANG-JANG BAKESHOP · INDANGAN BODEGA</p>
                <h3 className="font-serif font-bold text-xl text-[#3D1C52]">
                  Withdrawal &amp; Material Issuance Slip (`Form-WAR-001`)
                </h3>
                <p className="text-xs text-[#C8963E] font-mono font-bold">Slip No: {selectedSlipView.slipNo}</p>
              </div>
              <button 
                onClick={() => setSelectedSlipView(null)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs bg-[#FAF6EE] p-3 rounded border border-[#E2D1B8]">
              <div><strong>Line / Outlet:</strong> {selectedSlipView.requestingEntity}</div>
              <div><strong>Date &amp; Time:</strong> {selectedSlipView.date} {selectedSlipView.time}</div>
              <div><strong>Purpose:</strong> {selectedSlipView.purpose}</div>
              <div><strong>Department:</strong> {selectedSlipView.department}</div>
            </div>

            <table className="w-full text-left text-xs border">
              <thead className="bg-[#5B2E7A] text-white">
                <tr>
                  <th className="p-2">Material Code &amp; Name</th>
                  <th className="p-2 text-right">Net Qty Issued</th>
                  <th className="p-2">FEFO Lot #</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {selectedSlipView.items?.map((it, idx) => (
                  <tr key={idx}>
                    <td className="p-2 font-medium">{it.materialCode} - {it.name}</td>
                    <td className="p-2 text-right font-mono font-bold text-[#5B2E7A]">{it.qtyIssuedSec} {it.secondaryUom}</td>
                    <td className="p-2 font-mono text-[11px]">{it.lotNumber}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="grid grid-cols-3 gap-2 pt-3 border-t text-[11px]">
              <div>
                <p className="text-gray-500">Requested By:</p>
                <p className="font-semibold">{selectedSlipView.requestedBy}</p>
              </div>
              <div>
                <p className="text-gray-500">Issued By:</p>
                <p className="font-semibold">{selectedSlipView.issuedBy}</p>
              </div>
              <div>
                <p className="text-gray-500">Received By:</p>
                <p className="font-semibold">{selectedSlipView.receivedBy}</p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => window.print()}
                className="bg-[#3D1C52] text-white text-xs font-bold px-4 py-2 rounded flex items-center gap-1.5"
              >
                <Printer size={13} /> Print Hard-Copy Requisition Slip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}