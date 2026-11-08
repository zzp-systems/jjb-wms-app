import React, { useState } from 'react';
import { 
  Store, ShoppingCart, Send, CheckCircle2, Clock, 
  Utensils, Coffee, Truck, Layers, Plus, Trash2, 
  AlertTriangle, Package, Calendar, User, FileText, Check
} from 'lucide-react';
import { MASTER_RECIPES } from '../data/recipesData';

export const REQUISITION_LOCATIONS = [
  { id: "pan-de-verde", name: "Pan de Verde Outlet (Communal, Davao City)", type: "OUTLET" },
  { id: "laurice-delicacies", name: "Laurice Delicacies Outlet (Bankerohan, Davao City)", type: "OUTLET" },
  { id: "indangan-biscocho", name: "Indangan - Biscocho Commercial Hall", type: "PRODUCTION_LINE" },
  { id: "indangan-otap", name: "Indangan - Otap Laminated Hall", type: "PRODUCTION_LINE" },
  { id: "indangan-hearth", name: "Indangan - Hearth Bread Production Line", type: "PRODUCTION_LINE" },
  { id: "indangan-pastry", name: "Indangan - Pastry, Cake & Sweets Line", type: "PRODUCTION_LINE" },
  { id: "indangan-messhall", name: "Indangan Facility Mess Hall (Staff Meals & Snacks)", type: "MESS_HALL" },
  { id: "qa-rnd", name: "QA Laboratory & R&D Kitchen", type: "RND" },
  { id: "maintenance-sanitation", name: "Facility Maintenance & Plant Sanitation", type: "MAINTENANCE" },
  { id: "custom-other", name: "Other Production Line / Branch / Department (Write-in)", type: "CUSTOM" }
];

export const CONSUMPTION_PURPOSES = [
  "Commercial Production Run / Daily Baking",
  "Facility Mess Hall - Staff Meals & Snacks Consumption",
  "Branch / Outlet Retail Replenishment",
  "Emergency Production Line Shortage",
  "R&D Recipe Formulation & Sampling",
  "Packaging & Dispatch Bay Floor Supply",
  "Plant Sanitation & Facility Maintenance",
  "Miscellaneous Approved Internal Release"
];

export default function OutletRequisitionPortal({
  inventory = [],
  recipes = MASTER_RECIPES,
  onSubmitBatchOrder,
  onSubmitMaterialRequest,
  currentRole
}) {
  const [activePortalTab, setActivePortalTab] = useState('recipe_batch'); // 'recipe_batch' | 'raw_material'

  // Form State: Recipe Batched Ingredients
  const [targetLocation, setTargetLocation] = useState(REQUISITION_LOCATIONS[0].id);
  const [customLocationName, setCustomLocationName] = useState('');
  const [requisitionerName, setRequisitionerName] = useState('');
  const [selectedRecipeSku, setSelectedRecipeSku] = useState(recipes[0]?.sku || 'BRD-PAN-3KG');
  const [batchMultiplier, setBatchMultiplier] = useState(1.0);
  const [targetDate, setTargetDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [targetTime, setTargetTime] = useState('06:00');
  const [recipePurpose, setRecipePurpose] = useState(CONSUMPTION_PURPOSES[0]);
  const [recipeNotes, setRecipeNotes] = useState('');
  const [batchSubmittedOrder, setBatchSubmittedOrder] = useState(null);

  // Form State: Raw Material Requisition
  const [matLocation, setMatLocation] = useState('indangan-messhall');
  const [customMatLocation, setCustomMatLocation] = useState('');
  const [matRequisitioner, setMatRequisitioner] = useState('');
  const [matPurpose, setMatPurpose] = useState(CONSUMPTION_PURPOSES[1]);
  const [matNeededDate, setMatNeededDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [matNotes, setMatNotes] = useState('');
  const [requestedItems, setRequestedItems] = useState([
    { itemCode: 'RM-DRY-001', qty: 30, uom: 'pcs' },
    { itemCode: 'RM-SWT-002', qty: 5, uom: 'kg' }
  ]);
  const [matSubmittedRequest, setMatSubmittedRequest] = useState(null);

  // Selected Recipe Object
  const currentRecipe = recipes.find(r => r.sku === selectedRecipeSku) || recipes[0];
  const calculatedPieces = Math.round((currentRecipe?.unitPieceYield || 100) * batchMultiplier);

  // Resolved Location Name
  const getResolvedLocationName = (locId, customText) => {
    if (locId === 'custom-other') return customText.trim() || 'Unspecified Production Line';
    const loc = REQUISITION_LOCATIONS.find(l => l.id === locId);
    return loc ? loc.name : locId;
  };

  // Submit Recipe Batch Order
  const handleRecipeSubmit = (e) => {
    e.preventDefault();
    const resolvedLocation = getResolvedLocationName(targetLocation, customLocationName);
    const person = requisitionerName.trim() || 'Authorized Production Baker';

    const newOrder = {
      orderId: `BORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
      requestDate: new Date().toISOString().slice(0, 10),
      targetDate: `${targetDate} ${targetTime}`,
      outletId: targetLocation,
      outletName: resolvedLocation,
      recipeSku: currentRecipe.sku,
      recipeName: currentRecipe.name,
      batchMultiplier: parseFloat(batchMultiplier) || 1.0,
      requestedQtyPcs: calculatedPieces,
      requestedBy: person,
      enteredBy: `${person} via Outlet Portal`,
      purpose: recipePurpose,
      status: 'PENDING_BATCHING',
      bulkRequestStatus: 'NOT_REQUESTED',
      notes: recipeNotes.trim() || `Requisition for ${resolvedLocation} (${recipePurpose})`
    };

    onSubmitBatchOrder(newOrder);
    setBatchSubmittedOrder(newOrder);

    // Reset notes
    setRecipeNotes('');
  };

  // Raw Material Item Management
  const handleAddItemRow = () => {
    const firstMat = inventory[0] || { code: 'RM-FLR-001', secondaryUom: 'kg' };
    setRequestedItems(prev => [
      ...prev,
      { itemCode: firstMat.code, qty: 1, uom: firstMat.secondaryUom }
    ]);
  };

  const handleRemoveItemRow = (idx) => {
    setRequestedItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateItemRow = (idx, field, value) => {
    setRequestedItems(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      if (field === 'itemCode') {
        const mat = inventory.find(m => m.code === value);
        if (mat) {
          copy[idx].uom = mat.secondaryUom;
        }
      }
      return copy;
    });
  };

  // Submit Raw Material Requisition
  const handleMaterialSubmit = (e) => {
    e.preventDefault();
    if (requestedItems.length === 0) return;

    const resolvedLocation = getResolvedLocationName(matLocation, customMatLocation);
    const person = matRequisitioner.trim() || 'Indangan Staff Requester';

    // Build withdrawal items
    const lineItems = requestedItems.map(row => {
      const mat = inventory.find(m => m.code === row.itemCode) || { name: row.itemCode, secondaryUom: row.uom, unitCost: 100 };
      const parsedQty = parseFloat(row.qty) || 1;
      return {
        itemCode: row.itemCode,
        description: mat.name,
        requestedQtySec: parsedQty,
        secondaryUom: mat.secondaryUom || row.uom,
        estimatedCost: (mat.unitCost || 100) * (parsedQty / (mat.conversionFactor || 1))
      };
    });

    const newWithdrawal = {
      withdrawalNo: `WTR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
      withdrawalDate: matNeededDate,
      requestingLine: resolvedLocation,
      requisitionedBy: person,
      purpose: matPurpose,
      releasedBy: 'Pending Warehouse Supervisor (Jade)',
      status: 'PENDING_ISSUANCE',
      notes: matNotes.trim() || `Material requisition for ${resolvedLocation} (${matPurpose})`,
      items: lineItems,
      totalCost: lineItems.reduce((acc, it) => acc + (it.estimatedCost || 0), 0)
    };

    onSubmitMaterialRequest(newWithdrawal);
    setMatSubmittedRequest(newWithdrawal);
    setMatNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Top Welcome Card */}
      <div className="bg-gradient-to-r from-[#3D1C52] to-[#240e32] text-white p-6 rounded-2xl shadow-xl border border-[#C8963E]/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#C8963E]/20 border border-[#C8963E] flex items-center justify-center text-[#E5C585] shadow-inner">
            <Store size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-serif font-bold text-xl text-white">Outlet &amp; Production Line Requisition Portal</h2>
              <span className="bg-[#C8963E] text-[#240e32] text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                Self-Service Kiosk
              </span>
            </div>
            <p className="text-xs text-[#E5C585] mt-0.5">
              Direct terminal for Outlets, Plant Lines, and Indangan Facility Mess Hall to request Batched Recipes and Raw Materials.
            </p>
          </div>
        </div>

        <div className="text-right text-xs bg-[#240e32]/60 px-3.5 py-2 rounded-xl border border-[#C8963E]/20 hidden sm:block">
          <p className="text-gray-400 text-[10px] uppercase font-bold">Bodega Fulfillment Queues:</p>
          <p className="text-white font-semibold">Romeo Malusay · Batch Scaling</p>
          <p className="text-emerald-400 font-semibold">Jade Q. Dela Cruz · Material Release</p>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="bg-white p-2 rounded-2xl border border-[#E2D1B8] shadow-sm flex flex-col sm:flex-row gap-2">
        <button
          onClick={() => setActivePortalTab('recipe_batch')}
          className={`flex-1 px-5 py-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
            activePortalTab === 'recipe_batch'
              ? 'bg-[#3D1C52] text-white shadow-md'
              : 'bg-[#FAF6EE] text-gray-700 hover:bg-gray-200 border border-[#E2D1B8]'
          }`}
        >
          <ShoppingCart size={15} className={activePortalTab === 'recipe_batch' ? 'text-[#C8963E]' : 'text-gray-500'} />
          <span>1. Order Recipe Batched Ingredients (`Form-ORD-001`)</span>
        </button>

        <button
          onClick={() => setActivePortalTab('raw_material')}
          className={`flex-1 px-5 py-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
            activePortalTab === 'raw_material'
              ? 'bg-[#1E7A3E] text-white shadow-md'
              : 'bg-[#FAF6EE] text-gray-700 hover:bg-gray-200 border border-[#E2D1B8]'
          }`}
        >
          <Utensils size={15} className={activePortalTab === 'raw_material' ? 'text-white' : 'text-gray-500'} />
          <span>2. Request Raw Materials &amp; Packaging (`Form-WAR-001`)</span>
          <span className="text-[10px] bg-[#C8963E] text-[#240e32] px-2 py-0.5 rounded font-bold ml-1">
            Mess Hall &amp; Floor
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ORDER RECIPE BATCHED INGREDIENTS */}
      {/* ========================================================================= */}
      {activePortalTab === 'recipe_batch' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Formulation Requisition Form */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-[#E2D1B8] shadow-sm space-y-5">
            <div className="border-b border-gray-100 pb-3 flex justify-between items-center flex-wrap gap-2">
              <div>
                <h3 className="font-serif font-bold text-base text-[#3D1C52]">
                  Outlet Dough &amp; Pastry Batched Recipe Order
                </h3>
                <p className="text-xs text-gray-500">
                  Select product formulation, batch multiplier, and target delivery time. Automatically queues into Romeo's workbench.
                </p>
              </div>
              <span className="text-[11px] font-mono font-bold bg-[#5B2E7A] text-white px-2.5 py-1 rounded">
                Form-ORD-001
              </span>
            </div>

            {batchSubmittedOrder && (
              <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-xl text-xs space-y-1 text-emerald-900 animate-in fade-in">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span>Order Dispatched to Bodega Scaling Queue!</span>
                </div>
                <p>
                  Order <strong className="font-mono">{batchSubmittedOrder.orderId}</strong> for <strong>{batchSubmittedOrder.recipeName}</strong> ({batchSubmittedOrder.requestedQtyPcs} pcs) is registered for <strong>{batchSubmittedOrder.outletName}</strong>.
                </p>
                <p className="text-[11px] text-emerald-700">
                  Assigned Preparer: Romeo B. Malusay · Scaler Workbench
                </p>
              </div>
            )}

            <form onSubmit={handleRecipeSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Requesting Unit / Line Dropdown */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Requesting Production Line / Outlet / Department *
                  </label>
                  <select
                    value={targetLocation}
                    onChange={(e) => setTargetLocation(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-xl bg-white font-medium focus:ring-2 focus:ring-[#C8963E]"
                    required
                  >
                    {REQUISITION_LOCATIONS.map(loc => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Custom Line Name if 'custom-other' */}
                {targetLocation === 'custom-other' ? (
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Specify Line / Department Name *
                    </label>
                    <input
                      type="text"
                      value={customLocationName}
                      onChange={(e) => setCustomLocationName(e.target.value)}
                      placeholder="e.g. Communal Night Shift Baking"
                      required
                      className="w-full p-2.5 border border-gray-300 rounded-xl font-medium focus:ring-2 focus:ring-[#C8963E]"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Requisitioned By (Baker / Staff Name) *
                    </label>
                    <input
                      type="text"
                      value={requisitionerName}
                      onChange={(e) => setRequisitionerName(e.target.value)}
                      placeholder="e.g. Feliciano Gomera / Jhoanna Tejano"
                      required
                      className="w-full p-2.5 border border-gray-300 rounded-xl font-medium focus:ring-2 focus:ring-[#C8963E]"
                    />
                  </div>
                )}

                {/* Recipe Formulation Selection */}
                <div className="md:col-span-2">
                  <label className="block font-bold text-gray-700 mb-1">
                    Master Recipe Formulation ({recipes.length} Standardized Formulations) *
                  </label>
                  <select
                    value={selectedRecipeSku}
                    onChange={(e) => setSelectedRecipeSku(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-xl bg-white font-medium focus:ring-2 focus:ring-[#C8963E]"
                    required
                  >
                    {recipes.map(r => (
                      <option key={r.sku} value={r.sku}>
                        {r.sku}: {r.name} ({r.standardBatchFlourKg}kg Flour Basis · ~{r.unitPieceYield} pcs yield)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Batch Multiplier */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Batch Multiplier (Scaling Factor) *
                  </label>
                  <input
                    type="number"
                    min="0.25"
                    max="10"
                    step="0.25"
                    value={batchMultiplier}
                    onChange={(e) => setBatchMultiplier(parseFloat(e.target.value) || 1)}
                    className="w-full p-2.5 border border-gray-300 rounded-xl font-mono font-bold text-[#5B2E7A] focus:ring-2 focus:ring-[#C8963E]"
                    required
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Standard yield: {currentRecipe?.unitPieceYield} pcs $\rightarrow$ Scaled yield: <strong className="text-[#3D1C52]">{calculatedPieces} finished pieces</strong>
                  </p>
                </div>

                {/* Consumption Purpose */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Consumption / Operational Purpose
                  </label>
                  <select
                    value={recipePurpose}
                    onChange={(e) => setRecipePurpose(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-xl bg-white font-medium focus:ring-2 focus:ring-[#C8963E]"
                  >
                    {CONSUMPTION_PURPOSES.map((purp, i) => (
                      <option key={i} value={purp}>{purp}</option>
                    ))}
                  </select>
                </div>

                {/* Needed Date & Time */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Needed Delivery Date *
                  </label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-xl font-medium focus:ring-2 focus:ring-[#C8963E]"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Target Fulfillment Time
                  </label>
                  <input
                    type="time"
                    value={targetTime}
                    onChange={(e) => setTargetTime(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-xl font-medium focus:ring-2 focus:ring-[#C8963E]"
                  />
                </div>
              </div>

              {/* Special Instructions */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Special Preparation / Proofing / Ice Substitution Notes
                </label>
                <textarea
                  rows={2}
                  value={recipeNotes}
                  onChange={(e) => setRecipeNotes(e.target.value)}
                  placeholder="e.g. Priority dispatch for 06:00 AM delivery van. Ensure bread improver and yeast are pre-separated."
                  className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#C8963E]"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="bg-[#3D1C52] hover:bg-[#240e32] text-white font-bold text-xs px-6 py-3 rounded-xl shadow-md transition flex items-center gap-2"
                >
                  <Send size={14} className="text-[#C8963E]" />
                  <span>Submit Recipe Batch Order (`Form-ORD-001`)</span>
                </button>
              </div>
            </form>
          </div>

          {/* Recipe Specifications Card */}
          <div className="bg-[#FAF6EE] p-5 rounded-2xl border border-[#E2D1B8] space-y-4">
            <h4 className="font-bold text-xs text-[#3D1C52] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#E2D1B8] pb-2">
              <Package size={15} className="text-[#C8963E]" /> Formulation Bill of Materials
            </h4>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-gray-500">Selected Product:</span>
                <p className="font-bold text-[#3D1C52] text-sm">{currentRecipe?.name}</p>
                <span className="text-[11px] font-mono text-[#5B2E7A] bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                  SKU: {currentRecipe?.sku}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200">
                <div>
                  <span className="text-gray-500 text-[10px]">Base Flour:</span>
                  <p className="font-bold text-gray-800">{currentRecipe?.standardBatchFlourKg} kg</p>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px]">Scaled Output:</span>
                  <p className="font-bold text-[#1E7A3E]">{calculatedPieces} pcs</p>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px]">Dough Exit Temp:</span>
                  <p className="font-bold text-gray-800">{currentRecipe?.doughExitTempTarget || '26°C – 28°C'}</p>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px]">Thermal Kill-Step:</span>
                  <p className="font-bold text-red-700">{currentRecipe?.ccp1LethalityTarget || '> 95°C'}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-200">
                <span className="text-gray-500 text-[10px] uppercase font-bold block mb-1">
                  Scaled Ingredient Breakdown ({currentRecipe?.ingredients?.length || 0} Components):
                </span>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {currentRecipe?.ingredients?.map((ing, i) => {
                    const scaledGrams = Math.round((ing.gramsPerBatch || 0) * batchMultiplier);
                    return (
                      <div key={i} className="flex justify-between items-center text-[11px] bg-white p-1.5 rounded border border-gray-100">
                        <span className="truncate pr-2 text-gray-700">{ing.name}</span>
                        <span className="font-mono font-bold text-[#3D1C52] whitespace-nowrap">
                          {scaledGrams >= 1000 ? `${(scaledGrams / 1000).toFixed(2)} kg` : `${scaledGrams} g`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: REQUEST RAW MATERIALS & PACKAGING (MESS HALL & FLOOR) */}
      {/* ========================================================================= */}
      {activePortalTab === 'raw_material' && (
        <div className="bg-white p-6 rounded-2xl border border-[#E2D1B8] shadow-sm space-y-5">
          <div className="border-b border-gray-100 pb-3 flex justify-between items-center flex-wrap gap-2">
            <div>
              <h3 className="font-serif font-bold text-base text-[#1E7A3E] flex items-center gap-2">
                <Utensils size={18} /> Raw Material &amp; Packaging Withdrawal Requisition
              </h3>
              <p className="text-xs text-gray-500">
                Submit ingredient or packaging requisitions for Indangan Mess Hall (Meals/Snacks), floor operations, or emergency branch needs.
              </p>
            </div>
            <span className="text-[11px] font-mono font-bold bg-[#1E7A3E] text-white px-2.5 py-1 rounded">
              Form-WAR-001
            </span>
          </div>

          {matSubmittedRequest && (
            <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-xl text-xs space-y-1 text-emerald-900 animate-in fade-in">
              <div className="flex items-center gap-2 font-bold text-sm">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span>Requisition Submitted to Jade's Bodega Issuance Queue!</span>
              </div>
              <p>
                Requisition <strong className="font-mono">{matSubmittedRequest.withdrawalNo}</strong> requested by <strong>{matSubmittedRequest.requisitionedBy}</strong> for <strong>{matSubmittedRequest.requestingLine}</strong> ({matSubmittedRequest.purpose}).
              </p>
              <p className="text-[11px] text-emerald-700">
                Assigned Approver: Jade Q. Dela Cruz · Bodega Supervisor (FEFO Lot Deduction)
              </p>
            </div>
          )}

          <form onSubmit={handleMaterialSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Requesting Line / Department */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Requesting Production Line / Facility Department *
                </label>
                <select
                  value={matLocation}
                  onChange={(e) => setMatLocation(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-xl bg-white font-medium focus:ring-2 focus:ring-[#1E7A3E]"
                  required
                >
                  {REQUISITION_LOCATIONS.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>

              {/* Requisitioned By */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Requisitioned By (Baker / Cook / Staff Name) *
                </label>
                <input
                  type="text"
                  value={matRequisitioner}
                  onChange={(e) => setMatRequisitioner(e.target.value)}
                  placeholder="e.g. Chef Mario (Mess Hall Cook) / Ate Nelia"
                  required
                  className="w-full p-2.5 border border-gray-300 rounded-xl font-medium focus:ring-2 focus:ring-[#1E7A3E]"
                />
              </div>

              {/* Purpose */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Consumption Purpose / Release Category *
                </label>
                <select
                  value={matPurpose}
                  onChange={(e) => setMatPurpose(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-xl bg-white font-medium focus:ring-2 focus:ring-[#1E7A3E]"
                >
                  {CONSUMPTION_PURPOSES.map((purp, i) => (
                    <option key={i} value={purp}>{purp}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Custom Location Input */}
            {matLocation === 'custom-other' && (
              <div>
                <label className="block font-bold text-gray-700 mb-1">Specify Location / Department Name *</label>
                <input
                  type="text"
                  value={customMatLocation}
                  onChange={(e) => setCustomMatLocation(e.target.value)}
                  placeholder="e.g. Indangan Plant Guard House & Visitor Reception"
                  required
                  className="w-full p-2.5 border border-gray-300 rounded-xl font-medium"
                />
              </div>
            )}

            {/* Material Requisition Items Table */}
            <div className="border border-gray-200 rounded-xl p-4 bg-[#FAF6EE] space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-xs text-[#3D1C52] uppercase tracking-wider flex items-center gap-1.5">
                  <Package size={14} className="text-[#1E7A3E]" /> Requested Materials &amp; Packaging List:
                </span>
                <button
                  type="button"
                  onClick={handleAddItemRow}
                  className="bg-[#1E7A3E] hover:bg-[#165c2f] text-white font-bold text-[11px] px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1 transition"
                >
                  <Plus size={13} /> Add Material Line
                </button>
              </div>

              <div className="space-y-2">
                {requestedItems.map((row, idx) => {
                  const currentMat = inventory.find(m => m.code === row.itemCode);
                  return (
                    <div key={idx} className="bg-white p-2.5 rounded-xl border border-gray-200 flex flex-wrap items-center gap-3">
                      <div className="flex-1 min-w-[220px]">
                        <select
                          value={row.itemCode}
                          onChange={(e) => handleUpdateItemRow(idx, 'itemCode', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg text-xs font-medium"
                        >
                          {inventory.map(m => (
                            <option key={m.code} value={m.code}>
                              {m.code}: {m.name} (Bal: {m.currentBalance?.toLocaleString()} {m.secondaryUom})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-28 flex items-center gap-1">
                        <input
                          type="number"
                          min="0.1"
                          step="any"
                          value={row.qty}
                          onChange={(e) => handleUpdateItemRow(idx, 'qty', e.target.value)}
                          placeholder="Qty"
                          className="w-full p-2 border border-gray-300 rounded-lg text-xs font-mono font-bold text-[#1E7A3E]"
                        />
                        <span className="text-[11px] font-bold text-gray-500 whitespace-nowrap">
                          {currentMat?.secondaryUom || row.uom}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItemRow(idx)}
                        disabled={requestedItems.length === 1}
                        className="text-red-500 hover:text-red-700 disabled:opacity-30 p-1.5 rounded hover:bg-red-50"
                        title="Remove Line"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Notes & Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Needed By Date *</label>
                <input
                  type="date"
                  value={matNeededDate}
                  onChange={(e) => setMatNeededDate(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-xl font-medium"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Justification &amp; Notes</label>
                <textarea
                  rows={2}
                  value={matNotes}
                  onChange={(e) => setMatNotes(e.target.value)}
                  placeholder="e.g. For Indangan plant staff lunch and afternoon merienda bread snacks."
                  className="w-full p-2.5 border border-gray-300 rounded-xl"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="bg-[#1E7A3E] hover:bg-[#165c2f] text-white font-bold text-xs px-6 py-3 rounded-xl shadow-md transition flex items-center gap-2"
              >
                <CheckCircle2 size={14} />
                <span>Submit Material Withdrawal (`Form-WAR-001`)</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
