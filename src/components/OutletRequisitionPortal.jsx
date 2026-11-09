import React, { useState, useEffect } from 'react';
import { 
  Store, ShoppingCart, Send, CheckCircle2, Clock, 
  Utensils, Coffee, Truck, Layers, Plus, Trash2, 
  AlertTriangle, Package, Calendar, User, FileText, Check,
  Sparkles, DollarSign, Award, ChevronRight, HelpCircle,
  Inbox
} from 'lucide-react';
import { MASTER_RECIPES } from '../data/recipesData';
import { 
  createSpecialtyProposal, 
  loadStoredSpecialtyProposals, 
  persistSpecialtyProposals 
} from '../utils/specialtyRecipeLogic';

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
  onSpecialtyRecipeSubmitted,
  currentRole
}) {
  const [activePortalTab, setActivePortalTab] = useState('recipe_batch');

  // Recipe Batched Ingredients form state
  const [targetLocation, setTargetLocation] = useState(REQUISITION_LOCATIONS[0].id);
  const [customLocationName, setCustomLocationName] = useState('');
  const [requisitionerName, setRequisitionerName] = useState('');
  const [selectedRecipeSku, setSelectedRecipeSku] = useState(recipes[0]?.sku || 'BRD-PAN-6KG');
  const [batchMultiplier, setBatchMultiplier] = useState(1.0);
  const [targetDate, setTargetDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [targetTime, setTargetTime] = useState('06:00');
  const [recipePurpose, setRecipePurpose] = useState(CONSUMPTION_PURPOSES[0]);
  const [recipeNotes, setRecipeNotes] = useState('');
  const [batchSubmittedOrder, setBatchSubmittedOrder] = useState(null);

  // Raw Material Requisition form state
  const [matLocation, setMatLocation] = useState('indangan-messhall');
  const [customMatLocation, setCustomMatLocation] = useState('');
  const [matRequisitioner, setMatRequisitioner] = useState('');
  const [matPurpose, setMatPurpose] = useState(CONSUMPTION_PURPOSES[1]);
  const [matNeededDate, setMatNeededDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [matNotes, setMatNotes] = useState('');
  const [requestedItems, setRequestedItems] = useState(() => {
    const firstCode = inventory[0]?.code || 'RM-FLR-001';
    const firstUom = inventory[0]?.secondaryUom || 'kg';
    return [{ itemCode: firstCode, qty: 1, uom: firstUom }];
  });
  const [matSubmittedRequest, setMatSubmittedRequest] = useState(null);

  // Specialty Recipe Proposal form state
  const [specTitle, setSpecTitle] = useState('');
  const [specBaker, setSpecBaker] = useState('');
  const [specLocation, setSpecLocation] = useState(REQUISITION_LOCATIONS[0].id);
  const [specCustomLocation, setSpecCustomLocation] = useState('');
  const [specCategory, setSpecCategory] = useState('Signature Pastry / Specialty');
  const [specFlourKg, setSpecFlourKg] = useState(3.0);
  const [specFlourDesc, setSpecFlourDesc] = useState('1st Class Hard Wheat Flour Basis');
  const [specYield, setSpecYield] = useState(100);
  const [specPieceWeight, setSpecPieceWeight] = useState(40);
  const [specSrp, setSpecSrp] = useState(8.0);
  const [specUnitCost, setSpecUnitCost] = useState(3.5);
  const [specMixingNotes, setSpecMixingNotes] = useState('');
  const [specIngredients, setSpecIngredients] = useState([
    { code: 'RM-FLR-003', name: '1st Class Hard Wheat Flour', gramsPerBatch: 3000, isWater: false },
    { code: 'RM-SWT-001', name: 'Crystal Brown Sugar', gramsPerBatch: 600, isWater: false },
    { code: 'RM-FAT-004', name: 'Bakery Margarine', gramsPerBatch: 180, isWater: false },
    { code: 'RM-LEV-001', name: 'Instant Dry Yeast', gramsPerBatch: 60, isWater: false },
    { code: 'RM-OTH-001', name: 'Potable Chilled Water', gramsPerBatch: 1200, isWater: true }
  ]);
  const [submittedProposal, setSubmittedProposal] = useState(null);
  const [storedProposals, setStoredProposals] = useState(() => loadStoredSpecialtyProposals());

  useEffect(() => {
    setStoredProposals(loadStoredSpecialtyProposals());
  }, [submittedProposal]);

  const currentRecipe = recipes.find(r => r.sku === selectedRecipeSku) || recipes[0];
  const calculatedPieces = Math.round((currentRecipe?.unitPieceYield || 100) * batchMultiplier);

  const getResolvedLocationName = (locId, customText) => {
    if (locId === 'custom-other') return customText.trim() || 'Unspecified Production Line';
    const loc = REQUISITION_LOCATIONS.find(l => l.id === locId);
    return loc ? loc.name : locId;
  };

  // ---- Submit recipe batch order (goes to Romeo's queue — unaffected by new flow) ----
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
    setRecipeNotes('');
  };

  // ---- Raw material item management ----
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
        if (mat) copy[idx].uom = mat.secondaryUom;
      }
      return copy;
    });
  };

  // ---- Submit raw material request — goes to Jade's Pending Issuance queue ----
  // IMPORTANT: This does NOT deduct stock. App.jsx routes this to
  // handleSubmitWithdrawalRequest() which only writes to pending_requests
  // and posts an audit-only WITHDRAWAL_REQUEST_SUBMITTED event. Jade must
  // later click "Issue & Deduct Stock" in the Stock Release tab.
  const handleMaterialSubmit = (e) => {
    e.preventDefault();
    if (requestedItems.length === 0) return;

    const resolvedLocation = getResolvedLocationName(matLocation, customMatLocation);
    const person = matRequisitioner.trim() || 'Indangan Staff Requester';

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

    const newRequest = {
      withdrawalNo: `WTR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
      withdrawalDate: matNeededDate,
      requestingLine: resolvedLocation,
      requisitionedBy: person,
      purpose: matPurpose,
      // Kept for legacy consumers, but App.jsx overrides status to PENDING_ISSUANCE
      status: 'PENDING_ISSUANCE',
      notes: matNotes.trim() || `Material requisition for ${resolvedLocation} (${matPurpose})`,
      items: lineItems,
      totalCost: lineItems.reduce((acc, it) => acc + (it.estimatedCost || 0), 0),
      // Marks this as an in-app staff entry so Jade's pending queue shows the
      // correct "Entered By" attribution (currentRole) rather than "Portal".
      sourceChannel: 'IN_APP_STAFF_ENTRY'
    };

    onSubmitMaterialRequest(newRequest);
    setMatSubmittedRequest(newRequest);
    setMatNotes('');
  };

  // ---- Specialty recipe management ----
  const handleAddSpecIngredient = () => {
    const firstMat = inventory[0] || { code: 'RM-FLR-001', name: 'Raw Material' };
    setSpecIngredients(prev => [
      ...prev,
      { code: firstMat.code, name: firstMat.name, gramsPerBatch: 100, isWater: false }
    ]);
  };

  const handleRemoveSpecIngredient = (idx) => {
    setSpecIngredients(prev => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateSpecIngredient = (idx, field, value) => {
    setSpecIngredients(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      if (field === 'code') {
        const mat = inventory.find(m => m.code === value);
        if (mat) copy[idx].name = mat.name;
      }
      return copy;
    });
  };

  const handleSpecialtySubmit = (e) => {
    e.preventDefault();
    try {
      const resolvedLocation = getResolvedLocationName(specLocation, specCustomLocation);
      const proposal = createSpecialtyProposal({
        title: specTitle,
        requestingLocation: specLocation,
        locationName: resolvedLocation,
        bakerName: specBaker,
        category: specCategory,
        flourKg: specFlourKg,
        flourDescription: specFlourDesc,
        unitPieceYield: specYield,
        pieceWeightGrams: specPieceWeight,
        srp: specSrp,
        estimatedCostPerUnit: specUnitCost,
        mixingNotes: specMixingNotes,
        ingredients: specIngredients
      });

      const existing = loadStoredSpecialtyProposals();
      const updated = [proposal, ...existing];
      persistSpecialtyProposals(updated);
      setStoredProposals(updated);
      setSubmittedProposal(proposal);

      if (onSpecialtyRecipeSubmitted) onSpecialtyRecipeSubmitted(proposal);

      // FIXED: eventType must match a sync.js HANDLERS key.
      // SPECIALTY_PROPOSAL_CREATED routes to projectSpecialty.
      // (Was SPECIALTY_RECIPE_SUBMITTED — no handler, silent no-op.)
      fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'SPECIALTY_PROPOSAL_CREATED',
          idempotencyKey: `PROP-${proposal.proposalId}-${Date.now()}`,
          payload: proposal
        })
      }).catch(err => console.warn('Background sync error:', err));

      setSpecTitle('');
      setSpecMixingNotes('');
    } catch (err) {
      alert(err.message || 'Error creating specialty recipe proposal');
    }
  };

  const liveMarginPct = specSrp > 0 ? (((specSrp - specUnitCost) / specSrp) * 100).toFixed(1) : '0.0';
  const liveBatchFlourGrams = (parseFloat(specFlourKg) || 1) * 1000;

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
              Direct terminal for Outlets, Plant Lines, and Indangan Facility Mess Hall to request Batched Recipes, Raw Materials, or propose New Specialty Formulations.
            </p>
            <p className="text-[11px] text-[#E5C585] mt-1 italic">
              ⓘ Raw material submissions are requests only — Jade Q. Dela Cruz confirms physical issuance before any stock is deducted.
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
      <div className="bg-white p-2 rounded-2xl border border-[#E2D1B8] shadow-sm flex flex-col md:flex-row gap-2">
        <button
          onClick={() => setActivePortalTab('recipe_batch')}
          className={`flex-1 px-4 py-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
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
          className={`flex-1 px-4 py-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
            activePortalTab === 'raw_material'
              ? 'bg-[#1E7A3E] text-white shadow-md'
              : 'bg-[#FAF6EE] text-gray-700 hover:bg-gray-200 border border-[#E2D1B8]'
          }`}
        >
          <Utensils size={15} className={activePortalTab === 'raw_material' ? 'text-white' : 'text-gray-500'} />
          <span>2. Request Raw Materials (`Form-WAR-001`)</span>
          <span className="text-[10px] bg-[#C8963E] text-[#240e32] px-2 py-0.5 rounded font-bold ml-1">
            Mess Hall &amp; Floor
          </span>
        </button>

        <button
          onClick={() => setActivePortalTab('specialty_recipe')}
          className={`flex-1 px-4 py-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
            activePortalTab === 'specialty_recipe'
              ? 'bg-[#B87333] text-white shadow-md'
              : 'bg-[#FAF6EE] text-gray-700 hover:bg-gray-200 border border-[#E2D1B8]'
          }`}
        >
          <Sparkles size={15} className={activePortalTab === 'specialty_recipe' ? 'text-amber-200' : 'text-amber-600'} />
          <span>3. Propose Specialty Recipe (`Form-RND-001`)</span>
          {storedProposals.filter(p => p.status === 'PENDING_APPROVAL').length > 0 && (
            <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full font-bold ml-1">
              {storedProposals.filter(p => p.status === 'PENDING_APPROVAL').length} Pending
            </span>
          )}
        </button>
      </div>

      {/* ============ TAB 1: ORDER RECIPE BATCHED INGREDIENTS ============ */}
      {activePortalTab === 'recipe_batch' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-[#E2D1B8] shadow-sm space-y-5">
            <div className="border-b border-gray-100 pb-3 flex justify-between items-center flex-wrap gap-2">
              <div>
                <h3 className="font-serif font-bold text-base text-[#3D1C52]">
                  Outlet Dough &amp; Pastry Batched Recipe Order
                </h3>
                <p className="text-xs text-gray-500">
                  Select product formulation, batch multiplier, and target delivery time. Automatically queues into Romeo Malusay's scaling workbench.
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
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                </div>

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

                <div className="md:col-span-2">
                  <label className="block font-bold text-gray-700 mb-1">
                    Standardized Master Recipe Formulation ({recipes.length} Commercial Formulations Available) *
                  </label>
                  <select
                    value={selectedRecipeSku}
                    onChange={(e) => setSelectedRecipeSku(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-xl bg-white font-medium focus:ring-2 focus:ring-[#C8963E] text-xs"
                    required
                  >
                    {recipes.map(r => (
                      <option key={r.sku} value={r.sku}>{r.sku}: {r.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Batch Scaling Multiplier *
                  </label>
                  <input
                    type="number"
                    min="0.25"
                    max="10.0"
                    step="0.25"
                    value={batchMultiplier}
                    onChange={(e) => setBatchMultiplier(parseFloat(e.target.value) || 1.0)}
                    className="w-full p-2.5 border border-gray-300 rounded-xl font-mono font-bold text-[#3D1C52] focus:ring-2 focus:ring-[#C8963E]"
                    required
                  />
                  <span className="text-[10px] text-gray-500 mt-1 block">
                    1.0 = Standard Batch ({currentRecipe?.standardBatchFlourKg || 0} kg Flour Basis)
                  </span>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Purpose of Requisition *
                  </label>
                  <select
                    value={recipePurpose}
                    onChange={(e) => setRecipePurpose(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-xl bg-white font-medium focus:ring-2 focus:ring-[#C8963E]"
                  >
                    {CONSUMPTION_PURPOSES.map((pur, i) => (
                      <option key={i} value={pur}>{pur}</option>
                    ))}
                  </select>
                </div>

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

          <div className="bg-[#FAF6EE] p-5 rounded-2xl border border-[#E2D1B8] space-y-4">
            <h4 className="font-bold text-xs text-[#3D1C52] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#E2D1B8] pb-2">
              <Package size={15} className="text-[#C8963E]" /> Formulation Bill of Materials &amp; Yield
            </h4>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-gray-500 block text-[10px] uppercase font-bold">Standard Formulation:</span>
                <p className="font-bold text-[#3D1C52] text-sm leading-snug">{currentRecipe?.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] font-mono text-[#5B2E7A] bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                    SKU: {currentRecipe?.sku}
                  </span>
                  {currentRecipe?.isCustomSpecialty && (
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                      ★ Approved Specialty
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-[#E2D1B8] grid grid-cols-2 gap-2">
                <div>
                  <span className="text-gray-500 text-[10px]">SRP / Unit:</span>
                  <p className="font-bold text-[#1E7A3E] text-sm">₱{currentRecipe?.srp ? currentRecipe.srp.toFixed(2) : '3.00'}</p>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px]">Cost / Unit:</span>
                  <p className="font-bold text-gray-700 text-sm">₱{currentRecipe?.unitProductionCost ? currentRecipe.unitProductionCost.toFixed(2) : '1.45'}</p>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px]">Gross Margin:</span>
                  <p className="font-bold text-purple-800">{currentRecipe?.grossMarginPct || '51.7'}%</p>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px]">Est. Batch Value:</span>
                  <p className="font-bold text-[#3D1C52]">₱{((currentRecipe?.srp || 3) * calculatedPieces).toLocaleString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-200">
                <div>
                  <span className="text-gray-500 text-[10px]">Base Flour Weight:</span>
                  <p className="font-bold text-gray-800">{currentRecipe?.standardBatchFlourKg} kg</p>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px]">Scaled Output Yield:</span>
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

      {/* ============ TAB 2: RAW MATERIALS (Form-WAR-001) — QUEUED, NOT ISSUED ============ */}
      {activePortalTab === 'raw_material' && (
        <div className="bg-white p-6 rounded-2xl border border-[#E2D1B8] shadow-sm space-y-5">
          <div className="border-b border-gray-100 pb-3 flex justify-between items-center flex-wrap gap-2">
            <div>
              <h3 className="font-serif font-bold text-base text-[#1E7A3E]">
                Raw Materials, Ingredients &amp; Packaging Requisition
              </h3>
              <p className="text-xs text-gray-500">
                For Indangan Facility Mess Hall meals, snacks, branch floor supplies, or packaging materials.
                <strong className="text-amber-700"> Submissions are queued for Jade Q. Dela Cruz's approval — stock is deducted only after she confirms physical issuance.</strong>
              </p>
            </div>
            <span className="text-[11px] font-mono font-bold bg-[#1E7A3E] text-white px-2.5 py-1 rounded">
              Form-WAR-001
            </span>
          </div>

          {matSubmittedRequest && (
            <div className="bg-blue-50 border border-blue-300 p-4 rounded-xl text-xs space-y-1 text-blue-900 animate-in fade-in">
              <div className="flex items-center gap-2 font-bold text-sm text-blue-800">
                <Inbox size={16} />
                <span>Material Request Queued for Jade's Issuance!</span>
              </div>
              <p>
                Request <strong className="font-mono">{matSubmittedRequest.withdrawalNo}</strong> with {matSubmittedRequest.items.length} items logged for <strong>{matSubmittedRequest.requestingLine}</strong> ({matSubmittedRequest.purpose}).
              </p>
              <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 p-2 rounded font-semibold">
                ⚠ Stock is <span className="underline">NOT</span> deducted yet.
                Jade Q. Dela Cruz must click <em>"Issue &amp; Deduct Stock"</em> in the Stock Release tab to confirm the physical handoff before inventory is decremented.
              </p>
            </div>
          )}

          <form onSubmit={handleMaterialSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Requesting Department / Line *
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

              {matLocation === 'custom-other' ? (
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Specify Location / Line *</label>
                  <input
                    type="text"
                    value={customMatLocation}
                    onChange={(e) => setCustomMatLocation(e.target.value)}
                    placeholder="e.g. Sasa Plant Staff Mess Hall"
                    required
                    className="w-full p-2.5 border border-gray-300 rounded-xl font-medium focus:ring-2 focus:ring-[#1E7A3E]"
                  />
                </div>
              ) : (
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Requisitioned By (Staff / Cook / Baker) *</label>
                  <input
                    type="text"
                    value={matRequisitioner}
                    onChange={(e) => setMatRequisitioner(e.target.value)}
                    placeholder="e.g. Maria Elena / Indangan Cook"
                    required
                    className="w-full p-2.5 border border-gray-300 rounded-xl font-medium focus:ring-2 focus:ring-[#1E7A3E]"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-gray-700 mb-1">Consumption Purpose *</label>
                <select
                  value={matPurpose}
                  onChange={(e) => setMatPurpose(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-xl bg-white font-medium focus:ring-2 focus:ring-[#1E7A3E]"
                >
                  {CONSUMPTION_PURPOSES.map((pur, i) => (
                    <option key={i} value={pur}>{pur}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-[#FAF6EE] p-4 rounded-xl border border-[#E2D1B8] space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Package size={14} className="text-[#1E7A3E]" /> Requested Materials List
                </span>
                <button
                  type="button"
                  onClick={handleAddItemRow}
                  className="bg-[#1E7A3E] hover:bg-[#165c2f] text-white px-3 py-1.5 rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-sm transition"
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
                <Send size={14} />
                <span>Submit Request to Jade's Pending Issuance Queue (`Form-WAR-001`)</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============ TAB 3: SPECIALTY RECIPE PROPOSAL ============ */}
      {activePortalTab === 'specialty_recipe' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-[#E2D1B8] shadow-sm space-y-5">
            <div className="border-b border-gray-100 pb-3 flex justify-between items-center flex-wrap gap-2">
              <div>
                <h3 className="font-serif font-bold text-base text-[#B87333] flex items-center gap-2">
                  <Sparkles size={18} className="text-[#C8963E]" />
                  <span>Baker Specialty &amp; Seasonal Recipe Proposal Submission</span>
                </h3>
                <p className="text-xs text-gray-500">
                  Outlet and plant bakers can submit new candidate formulations. Submissions enter the QA &amp; Batching approval queue to be incorporated into Master Recipes for accurate costing and kitting.
                </p>
              </div>
              <span className="text-[11px] font-mono font-bold bg-[#B87333] text-white px-2.5 py-1 rounded">
                Form-RND-001
              </span>
            </div>

            {submittedProposal && (
              <div className="bg-amber-50 border border-amber-300 p-4 rounded-xl text-xs space-y-1 text-amber-900 animate-in fade-in">
                <div className="flex items-center gap-2 font-bold text-sm text-[#B87333]">
                  <CheckCircle2 size={16} className="text-[#B87333]" />
                  <span>Specialty Recipe Proposal Registered!</span>
                </div>
                <p>
                  Proposal <strong className="font-mono">{submittedProposal.proposalId}</strong> for <strong>{submittedProposal.name}</strong> was submitted by <strong>{submittedProposal.bakerName}</strong>.
                </p>
                <p className="text-[11px] text-amber-800">
                  Status: <span className="font-bold bg-amber-200 px-1.5 py-0.5 rounded">PENDING REVIEW</span> · Queued for Romeo Malusay &amp; Zaphyr Zur Pomicpic for QA and Master Register Incorporation.
                </p>
              </div>
            )}

            <form onSubmit={handleSpecialtySubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block font-bold text-gray-700 mb-1">
                    Recipe Commercial Title / Product Name *
                  </label>
                  <input
                    type="text"
                    value={specTitle}
                    onChange={(e) => setSpecTitle(e.target.value)}
                    placeholder="e.g. Davao Durian Hopia / Cheese Bread Supreme / Spanish Pan de Coco"
                    required
                    className="w-full p-2.5 border border-gray-300 rounded-xl font-medium focus:ring-2 focus:ring-[#B87333] text-sm"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Proposing Baker Name *
                  </label>
                  <input
                    type="text"
                    value={specBaker}
                    onChange={(e) => setSpecBaker(e.target.value)}
                    placeholder="e.g. Feliciano T. Gomera"
                    required
                    className="w-full p-2.5 border border-gray-300 rounded-xl font-medium focus:ring-2 focus:ring-[#B87333]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Branch / Production Facility *
                  </label>
                  <select
                    value={specLocation}
                    onChange={(e) => setSpecLocation(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-xl bg-white font-medium focus:ring-2 focus:ring-[#B87333]"
                    required
                  >
                    {REQUISITION_LOCATIONS.map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Product Category *
                  </label>
                  <select
                    value={specCategory}
                    onChange={(e) => setSpecCategory(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-xl bg-white font-medium focus:ring-2 focus:ring-[#B87333]"
                  >
                    <option value="Signature Pastry / Specialty">Signature Pastry / Specialty</option>
                    <option value="Artisan Breads / Hearth">Artisan Breads / Hearth</option>
                    <option value="Twice-Baked / Dry Delicacies">Twice-Baked / Dry Delicacies</option>
                    <option value="Deep-Fried Yeast / Doughnuts">Deep-Fried Yeast / Doughnuts</option>
                    <option value="Rich Cakes &amp; Dessert Bars">Rich Cakes &amp; Dessert Bars</option>
                    <option value="Seasonal &amp; Holiday Specials">Seasonal &amp; Holiday Specials</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Total Flour Weight in Batch (kg) *
                  </label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={specFlourKg}
                    onChange={(e) => setSpecFlourKg(parseFloat(e.target.value) || 1.0)}
                    className="w-full p-2.5 border border-gray-300 rounded-xl font-mono font-bold text-[#5B2E7A] focus:ring-2 focus:ring-[#B87333]"
                    required
                  />
                  <span className="text-[10px] text-gray-500 mt-0.5 block">
                    All flour types combined (Base for Baker's %)
                  </span>
                </div>

                <div className="md:col-span-2">
                  <label className="block font-bold text-gray-700 mb-1">
                    Flour Blend Breakdown / Description *
                  </label>
                  <input
                    type="text"
                    value={specFlourDesc}
                    onChange={(e) => setSpecFlourDesc(e.target.value)}
                    placeholder="e.g. 6.0 kg Flour Blend (4.2 kg 1st Class + 1.8 kg 3rd Class) or 3.0 kg 3rd Class Flour Basis"
                    required
                    className="w-full p-2.5 border border-gray-300 rounded-xl font-medium focus:ring-2 focus:ring-[#B87333]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Standard Piece Yield per Batch *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={specYield}
                    onChange={(e) => setSpecYield(parseInt(e.target.value, 10) || 1)}
                    className="w-full p-2.5 border border-gray-300 rounded-xl font-mono font-bold text-[#1E7A3E] focus:ring-2 focus:ring-[#B87333]"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Raw Dough Piece Weight (Grams)
                  </label>
                  <input
                    type="number"
                    min="5"
                    value={specPieceWeight}
                    onChange={(e) => setSpecPieceWeight(parseInt(e.target.value, 10) || 40)}
                    placeholder="e.g. 35 g or 80 g"
                    className="w-full p-2.5 border border-gray-300 rounded-xl font-mono font-medium focus:ring-2 focus:ring-[#B87333]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Target Suggested Retail Price (SRP ₱) *
                  </label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={specSrp}
                    onChange={(e) => setSpecSrp(parseFloat(e.target.value) || 5.0)}
                    className="w-full p-2.5 border border-gray-300 rounded-xl font-mono font-bold text-emerald-700 focus:ring-2 focus:ring-[#B87333]"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Estimated Ingredient Cost / Unit (₱)
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={specUnitCost}
                    onChange={(e) => setSpecUnitCost(parseFloat(e.target.value) || 2.0)}
                    className="w-full p-2.5 border border-gray-300 rounded-xl font-mono font-bold text-gray-700 focus:ring-2 focus:ring-[#B87333]"
                  />
                </div>
              </div>

              <div className="bg-[#FAF6EE] p-4 rounded-xl border border-[#E2D1B8] space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-bold text-gray-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <Package size={14} className="text-[#B87333]" /> Formulation Recipe Bill of Materials
                    </span>
                    <span className="text-[10px] text-gray-500">
                      Baker's percentage is automatically calculated from {specFlourKg} kg total flour ({liveBatchFlourGrams} g).
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddSpecIngredient}
                    className="bg-[#B87333] hover:bg-[#8F5522] text-white px-3 py-1.5 rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-sm transition"
                  >
                    <Plus size={13} /> Add Ingredient Row
                  </button>
                </div>

                <div className="space-y-2">
                  {specIngredients.map((row, idx) => {
                    const pct = liveBatchFlourGrams > 0 ? ((row.gramsPerBatch / liveBatchFlourGrams) * 100).toFixed(1) : '0';
                    return (
                      <div key={idx} className="bg-white p-2.5 rounded-xl border border-gray-200 flex flex-wrap items-center gap-3">
                        <div className="flex-1 min-w-[200px]">
                          <select
                            value={row.code}
                            onChange={(e) => handleUpdateSpecIngredient(idx, 'code', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg text-xs font-medium"
                          >
                            {inventory.map(m => (
                              <option key={m.code} value={m.code}>{m.code}: {m.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="w-28 flex items-center gap-1">
                          <input
                            type="number"
                            min="1"
                            step="any"
                            value={row.gramsPerBatch}
                            onChange={(e) => handleUpdateSpecIngredient(idx, 'gramsPerBatch', parseFloat(e.target.value) || 0)}
                            placeholder="Grams"
                            className="w-full p-2 border border-gray-300 rounded-lg text-xs font-mono font-bold text-[#5B2E7A]"
                          />
                          <span className="text-[11px] font-bold text-gray-500">g</span>
                        </div>

                        <div className="w-16 text-right">
                          <span className="text-[11px] font-mono font-bold text-purple-700 bg-purple-50 px-2 py-1 rounded">
                            {pct}%
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveSpecIngredient(idx)}
                          disabled={specIngredients.length <= 1}
                          className="text-red-500 hover:text-red-700 disabled:opacity-30 p-1.5 rounded hover:bg-red-50"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Mixing / Proofing / Baking SOP Notes &amp; CCP Targets
                </label>
                <textarea
                  rows={3}
                  value={specMixingNotes}
                  onChange={(e) => setSpecMixingNotes(e.target.value)}
                  placeholder="e.g. Spiral mix speed 1 for 4 mins, speed 2 for 8 mins. Target dough exit temp: 26°C – 28°C. Proofing at 35°C / 80% RH for 60 mins. Bake at 180°C for 18 mins (Internal core > 95°C)."
                  className="w-full p-2.5 border border-gray-300 rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="bg-[#B87333] hover:bg-[#8F5522] text-white font-bold text-xs px-6 py-3 rounded-xl shadow-md transition flex items-center gap-2"
                >
                  <Send size={14} className="text-amber-200" />
                  <span>Submit Specialty Recipe for QA &amp; Master Register Review (`Form-RND-001`)</span>
                </button>
              </div>
            </form>
          </div>

          <div className="space-y-4">
            <div className="bg-[#FAF6EE] p-5 rounded-2xl border border-[#E2D1B8] space-y-3">
              <h4 className="font-bold text-xs text-[#B87333] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#E2D1B8] pb-2">
                <Sparkles size={15} className="text-[#C8963E]" /> Proposed Formulation Card
              </h4>

              <div>
                <span className="text-gray-500 text-[10px] uppercase font-bold block">Master Title Format:</span>
                <p className="font-bold text-[#3D1C52] text-xs leading-snug mt-0.5">
                  {specTitle.trim() ? specTitle : 'Specialty Pastry'} – {parseFloat(specFlourKg).toFixed(1)} kg {specFlourDesc || 'Flour Basis'} | Yield: ~{specYield} pieces ({specPieceWeight} g each)
                </p>
              </div>

              <div className="bg-white p-3 rounded-xl border border-[#E2D1B8] grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500 text-[10px]">Proposed SRP:</span>
                  <p className="font-bold text-emerald-700 text-sm">₱{parseFloat(specSrp).toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px]">Est. Cost / Unit:</span>
                  <p className="font-bold text-gray-700 text-sm">₱{parseFloat(specUnitCost).toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px]">Projected Margin:</span>
                  <p className="font-bold text-purple-800 text-sm">{liveMarginPct}%</p>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px]">Batch Retail Value:</span>
                  <p className="font-bold text-[#3D1C52]">₱{(specSrp * specYield).toLocaleString()}</p>
                </div>
              </div>

              <div className="text-[11px] text-gray-600 space-y-1 pt-1">
                <p>• Total Components: <strong>{specIngredients.length} ingredients</strong></p>
                <p>• Total Batch Flour: <strong>{specFlourKg} kg ({liveBatchFlourGrams} g)</strong></p>
                <p>• Yield Basis: <strong>~{specYield} raw units @ {specPieceWeight}g</strong></p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-200 space-y-3">
              <h5 className="font-bold text-xs text-gray-800 uppercase tracking-wider flex items-center justify-between">
                <span>Recent Specialty Proposals</span>
                <span className="text-[10px] text-gray-400 font-normal">Stored in OS</span>
              </h5>

              {storedProposals.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No specialty recipes proposed yet.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {storedProposals.map(prop => (
                    <div key={prop.proposalId} className="p-2.5 rounded-xl border border-gray-100 bg-gray-50 text-xs space-y-1">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-gray-900 truncate pr-2">{prop.title}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          prop.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                          prop.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {prop.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500">{prop.name}</p>
                      <div className="flex justify-between text-[10px] text-gray-400 pt-0.5">
                        <span>Baker: {prop.bakerName}</span>
                        <span>SRP ₱{prop.srp?.toFixed(2)} ({prop.grossMarginPct}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}