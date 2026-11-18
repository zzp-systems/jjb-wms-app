// ============================================================================
// FILE: src/components/ReportsModule.jsx
// ============================================================================
import React, { useState, useMemo, useEffect } from 'react';
import { 
  FileSpreadsheet, Download, Upload, Filter, Search, Printer, CheckCircle2, 
  AlertTriangle, Layers, Calendar, ChevronRight, FileText, Plus, Trash2, ShoppingCart, RefreshCw
} from 'lucide-react';
import { calculateReorderSuggestions } from '../utils/wmsLogic';

const DEFAULT_AUTHORIZED_SUPPLIERS = [
  'Lucky Roma Trading / JCT Wheat',
  'Mindanao Packaging & Industrial Box Corp',
  'P.L. Sebastian Corporation',
  'JCT Wheat & Sugar Products',
  'Davao Great Wall Trading, Inc.',
  'Golden Fortune Trading Incorporated',
  'Local Poultry Coop',
  'C-One Packaging Solutions',
  'Mandaue Libertad Flexible Packaging',
  "D'Unibuenas Corporation (Solane LPG)"
];

export default function ReportsModule({
  inventory = [],
  receivingReports = [],
  withdrawals = [],
  batchOrders = [],
  adjustments = [],
  quarantineList = [],
  currentRole,
  onImportInventoryCsv,
  onRecordAudit,
  onOpenImportModal,
  purchaseOrders = [],
  onSavePurchaseOrder
}) {
  const [activeSubTab, setActiveSubTab] = useState('po_generator'); // 'po_generator' | 'ledger' | 'csv_bridge'
  const [timeframe, setTimeframe] = useState('ALL'); // 'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM'
  const [customStartDate, setCustomStartDate] = useState('2026-11-01');
  const [customEndDate, setCustomEndDate] = useState('2026-11-30');
  const [ledgerType, setLedgerType] = useState('RECEIVING'); // 'RECEIVING' | 'WITHDRAWALS' | 'BATCHING' | 'ADJUSTMENTS'
  const [searchTerm, setSearchTerm] = useState('');

  // PO Generator & Purchasing Management State (Mariejohn's Workbench)
  const [selectedSupplier, setSelectedSupplier] = useState('ALL');
  const [isCustomSupplier, setIsCustomSupplier] = useState(false);
  const [customSupplierName, setCustomSupplierName] = useState('');
  const [customSupplierContact, setCustomSupplierContact] = useState('');
  const [customSupplierAddress, setCustomSupplierAddress] = useState('');
  const [poNo, setPoNo] = useState(`PO-2026-${Math.floor(1050 + Math.random() * 50)}`);
  const [poNotes, setPoNotes] = useState('');
  const [poDraftItems, setPoDraftItems] = useState([]);
  const [addMaterialCode, setAddMaterialCode] = useState(inventory[0]?.code || 'RM-FLR-001');
  const [addQty, setAddQty] = useState(10);
  const [selectedPoPreview, setSelectedPoPreview] = useState(null);

  // CSV Import State
  const [csvInputText, setCsvInputText] = useState('');
  const [importStatus, setImportStatus] = useState(null);

  // Low stock suggestions calculation
  const lowStockSuggestions = useMemo(() => {
    return calculateReorderSuggestions(inventory);
  }, [inventory]);

  // Combined Authorized Suppliers list
  const suppliers = useMemo(() => {
    const set = new Set(DEFAULT_AUTHORIZED_SUPPLIERS);
    inventory.forEach((i) => { if (i.supplier) set.add(i.supplier); });
    return Array.from(set);
  }, [inventory]);

  // Initialize or re-sync draft items when low-stock suggestions are computed
  useEffect(() => {
    if (poDraftItems.length === 0 && lowStockSuggestions.length > 0) {
      setPoDraftItems(lowStockSuggestions.map((it) => ({ ...it })));
    }
  }, [lowStockSuggestions]);

  // Handle supplier filter change
  const handleSupplierChange = (val) => {
    if (val === 'NEW_SUPPLIER') {
      setIsCustomSupplier(true);
      setSelectedSupplier('NEW_SUPPLIER');
    } else {
      setIsCustomSupplier(false);
      setSelectedSupplier(val);
      if (val !== 'ALL') {
        const filtered = lowStockSuggestions.filter((s) => s.supplier === val);
        if (filtered.length > 0) {
          setPoDraftItems(filtered.map((it) => ({ ...it })));
        }
      } else {
        setPoDraftItems(lowStockSuggestions.map((it) => ({ ...it })));
      }
    }
  };

  const handleDraftQtyChange = (idx, qtyVal) => {
    const q = Math.max(0, parseFloat(qtyVal) || 0);
    setPoDraftItems((prev) => prev.map((item, i) => {
      if (i !== idx) return item;
      const factor = Number(item.conversionFactor || 1);
      const cost = Number(item.unitCost || 0);
      return {
        ...item,
        suggestedPrimaryQty: q,
        totalSecondaryQty: +(q * factor).toFixed(3),
        estimatedCost: +(q * cost).toFixed(2)
      };
    }));
  };

  const handleDraftUnitCostChange = (idx, costVal) => {
    const c = Math.max(0, parseFloat(costVal) || 0);
    setPoDraftItems((prev) => prev.map((item, i) => {
      if (i !== idx) return item;
      const q = Number(item.suggestedPrimaryQty || 0);
      return {
        ...item,
        unitCost: c,
        estimatedCost: +(q * c).toFixed(2)
      };
    }));
  };

  const handleRemoveDraftItem = (idx) => {
    setPoDraftItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddMaterialToDraft = () => {
    const mat = inventory.find((m) => m.code === addMaterialCode);
    if (!mat || addQty <= 0) return;
    const factor = Number(mat.conversionFactor || 1);
    const cost = Number(mat.unitCost || 1000);
    const lineTotal = +(addQty * cost).toFixed(2);

    setPoDraftItems((prev) => {
      const existingIdx = prev.findIndex((it) => it.code === mat.code);
      if (existingIdx >= 0) {
        return prev.map((it, i) => {
          if (i !== existingIdx) return it;
          const newQ = +(Number(it.suggestedPrimaryQty || 0) + Number(addQty)).toFixed(2);
          return {
            ...it,
            suggestedPrimaryQty: newQ,
            totalSecondaryQty: +(newQ * factor).toFixed(3),
            estimatedCost: +(newQ * cost).toFixed(2)
          };
        });
      }
      return [
        ...prev,
        {
          code: mat.code,
          name: mat.name,
          category: mat.category,
          supplier: mat.supplier || selectedSupplier,
          room: mat.room || 'Dry Room 1',
          primaryUom: mat.primaryUom || 'Unit',
          secondaryUom: mat.secondaryUom || 'kg',
          conversionFactor: factor,
          unitCost: cost,
          currentBalanceSec: mat.currentBalance || 0,
          thresholdSec: mat.threshold || 0,
          suggestedPrimaryQty: Number(addQty),
          totalSecondaryQty: +(addQty * factor).toFixed(3),
          estimatedCost: lineTotal
        }
      ];
    });
  };

  const poTotalEstimatedCost = poDraftItems.reduce((acc, it) => acc + (it.estimatedCost || 0), 0);

  const handleSavePoWithStatus = (targetStatus = 'PENDING_DELIVERY') => {
    if (poDraftItems.length === 0) {
      alert('Please add at least one material to the Purchase Order.');
      return;
    }
    const resolvedSupplier = isCustomSupplier
      ? (customSupplierName.trim() || 'Custom Lowest-Offering Vendor')
      : (selectedSupplier === 'ALL' ? 'Consolidated Vendors' : selectedSupplier);

    const poRecord = {
      poNo,
      supplier: resolvedSupplier,
      supplierContact: isCustomSupplier ? customSupplierContact : '',
      supplierAddress: isCustomSupplier ? customSupplierAddress : '',
      date: new Date().toISOString().slice(0, 10),
      generatedDate: new Date().toISOString().slice(0, 10),
      items: poDraftItems,
      totalCost: poTotalEstimatedCost,
      status: targetStatus,
      preparedBy: `${currentRole} (Purchasing & Inventory Manager)`,
      notes: poNotes
    };

    if (onSavePurchaseOrder) {
      onSavePurchaseOrder(poRecord);
    }

    if (targetStatus === 'PO_DRAFT') {
      alert(`📝 Purchase Order ${poNo} saved as DRAFT in the PO Register. It is still editable and has not been dispatched to Jade's dock yet.`);
    } else {
      alert(`✅ Purchase Order ${poNo} FINALIZED and dispatched to Inbound Dock as PENDING_DELIVERY. Jade can now cross-reference deliveries against this PO.`);
    }

    // Reset for next PO
    setPoNo(`PO-2026-${Math.floor(1050 + Math.random() * 50)}`);
    setPoNotes('');
  };

  const handleEditDraftPo = (po) => {
    setPoNo(po.poNo);
    setSelectedSupplier(po.supplier);
    setPoNotes(po.notes || '');
    if (Array.isArray(po.items)) {
      setPoDraftItems(po.items.map((it) => ({ ...it })));
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Filtered Ledger Records
  const filteredLedger = useMemo(() => {
    let dataset = [];
    let dateField = 'date';

    if (ledgerType === 'RECEIVING') {
      dataset = receivingReports || [];
    } else if (ledgerType === 'WITHDRAWALS') {
      dataset = withdrawals || [];
    } else if (ledgerType === 'BATCHING') {
      dataset = batchOrders || [];
      dateField = 'requestDate';
    } else if (ledgerType === 'ADJUSTMENTS') {
      dataset = adjustments || [];
    }

    return dataset.filter((row) => {
      const rowDate = row[dateField] || row.date;
      if (!rowDate) return true;

      if (timeframe === 'TODAY' && rowDate !== '2026-11-03') return false;
      if (timeframe === 'CUSTOM') {
        if (rowDate < customStartDate || rowDate > customEndDate) return false;
      }

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const searchable = JSON.stringify(row).toLowerCase();
        return searchable.includes(q);
      }

      return true;
    });
  }, [ledgerType, timeframe, customStartDate, customEndDate, searchTerm, receivingReports, withdrawals, batchOrders, adjustments]);

  // CSV Export Generators
  const handleExportMaterialsCsv = () => {
    const headers = ["ItemCode", "Name", "Category", "Supplier", "StorageRoom", "PrimaryUom", "SecondaryUom", "ConversionFactor", "CurrentBalanceSecondary", "SafetyThresholdSecondary", "UnitCost"];
    const rows = inventory.map((m) => [
      m.code,
      `"${m.name.replace(/"/g, '""')}"`,
      m.category,
      m.supplier,
      m.room,
      m.primaryUom,
      m.secondaryUom,
      m.conversionFactor,
      m.currentBalance,
      m.threshold,
      m.unitCost
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    downloadBlob(csvContent, `JJB_Materials_Master_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handleExportReceivingCsv = () => {
    const headers = ["ReportNo", "Date", "PoNo", "Supplier", "InvoiceNo", "MaterialCode", "MaterialName", "PrimaryQty", "PrimaryUom", "SecondaryQty", "SecondaryUom", "UnitPrice", "TotalAmount", "LotNumber", "ExpiryDate"];
    const rows = [];
    (receivingReports || []).forEach((r) => {
      (r.items || []).forEach((it) => {
        rows.push([
          r.reportNo,
          r.date,
          r.poNo,
          `"${(r.supplier || '').replace(/"/g, '""')}"`,
          r.invoiceNo,
          it.materialCode,
          `"${(it.name || '').replace(/"/g, '""')}"`,
          it.primaryQty,
          it.primaryUom,
          it.secondaryQty,
          it.secondaryUom,
          it.unitPrice,
          it.totalAmount,
          it.lotNumber,
          it.expiryDate
        ]);
      });
    });
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    downloadBlob(csvContent, `JJB_Receiving_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handleExportWithdrawalsCsv = () => {
    const headers = ["SlipNo", "Date", "RequestingLine", "Department", "Purpose", "MaterialCode", "MaterialName", "LotNumber", "QtyIssuedSecondary", "SecondaryUom", "StorageRoom", "EstimatedCost"];
    const rows = [];
    withdrawals.forEach((w) => {
      (w.items || []).forEach((it) => {
        rows.push([
          w.slipNo,
          w.date,
          `"${(w.requestingEntity || '').replace(/"/g, '""')}"`,
          `"${(w.department || '').replace(/"/g, '""')}"`,
          `"${(w.purpose || '').replace(/"/g, '""')}"`,
          it.materialCode,
          `"${(it.name || '').replace(/"/g, '""')}"`,
          it.lotNumber,
          it.qtyIssuedSec,
          it.secondaryUom,
          it.storageRoom,
          it.estimatedCost
        ]);
      });
    });
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    downloadBlob(csvContent, `JJB_Withdrawals_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handleExportBatchingCsv = () => {
    const headers = ["OrderId", "RequestDate", "RecipeSku", "RecipeName", "OutletName", "PlannedBatches", "TotalDoughKg", "Status", "TotalIngredientCost"];
    const rows = batchOrders.map((b) => [
      b.orderId,
      b.requestDate,
      b.recipeSku,
      `"${(b.recipeName || '').replace(/"/g, '""')}"`,
      `"${(b.outletName || '').replace(/"/g, '""')}"`,
      b.plannedBatches,
      b.totalDoughKg,
      b.status,
      b.totalIngredientCost
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    downloadBlob(csvContent, `JJB_Batching_Kits_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const downloadBlob = (content, filename) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold bg-[#C8963E] text-[#240e32] px-2 py-0.5 rounded">
              Form-PUR-002 / REP-001
            </span>
            <h2 className="font-serif text-2xl font-bold text-[#3D1C52]">
              Procurement &amp; Reporting Data Operations Hub
            </h2>
          </div>
          <p className="text-xs text-gray-600 mt-0.5">
            Interactive Form-PUR-002 Purchase Orders · Multi-Supplier Quotations · Bi-Directional CSV Data Hub · Dynamic Audit Ledgers
          </p>
        </div>

        {/* Sub-Tab Navigation Strip */}
        <div className="flex bg-[#FAF6EE] p-1 rounded-xl border border-[#C8963E]/40 gap-1">
          <button
            onClick={() => setActiveSubTab('po_generator')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeSubTab === 'po_generator'
                ? 'bg-[#3D1C52] text-white shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Printer size={13} /> Form-PUR-002 PO Generator &amp; Register ({(purchaseOrders || []).length})
          </button>
          <button
            onClick={() => setActiveSubTab('ledger')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeSubTab === 'ledger'
                ? 'bg-[#3D1C52] text-white shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Calendar size={13} /> Historical Transaction Ledgers
          </button>
          <button
            onClick={() => setActiveSubTab('csv_bridge')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeSubTab === 'csv_bridge'
                ? 'bg-[#3D1C52] text-white shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileSpreadsheet size={13} /> Bi-Directional CSV Data Bridge
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: PO REPLENISHMENT GENERATOR (Form-PUR-002) */}
      {activeSubTab === 'po_generator' && (
        <div className="space-y-6">
          {/* Top Control & Supplier Strip */}
          <div className="bg-white p-5 rounded-2xl border border-[#E2D1B8] shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b pb-3 flex-wrap gap-2">
              <h3 className="font-serif font-bold text-[#3D1C52] text-sm flex items-center gap-2">
                <ShoppingCart size={17} className="text-[#C8963E]" />
                Mariejohn's Purchase Order Replenishment Workbench (`Form-PUR-002`)
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPoDraftItems(lowStockSuggestions.map((it) => ({ ...it })))}
                  className="text-xs px-2.5 py-1 rounded bg-[#FAF6EE] text-[#5B2E7A] border border-[#C8963E]/40 font-bold hover:bg-[#E2D1B8] flex items-center gap-1"
                >
                  <RefreshCw size={12} /> Reload Low-Stock Suggestions
                </button>
                <button
                  type="button"
                  onClick={() => setPoDraftItems([])}
                  className="text-xs px-2.5 py-1 rounded bg-gray-100 text-gray-600 font-bold hover:bg-gray-200"
                >
                  Clear Draft
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Target Vendor / Supplier *</label>
                <select
                  value={selectedSupplier}
                  onChange={(e) => handleSupplierChange(e.target.value)}
                  className="w-full p-2 border rounded bg-white font-medium focus:ring-2 focus:ring-[#C8963E]"
                >
                  <option value="ALL">All Authorized Suppliers ({suppliers.length})</option>
                  {suppliers.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                  <option value="NEW_SUPPLIER">+ Add New / Lowest-Offering Supplier...</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Assigned PO Number *</label>
                <input
                  type="text"
                  value={poNo}
                  onChange={(e) => setPoNo(e.target.value)}
                  className="w-full p-2 border rounded font-mono font-bold text-[#5B2E7A] focus:ring-2 focus:ring-[#C8963E]"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Purchaser / Buyer</label>
                <input
                  type="text"
                  value="Mariejohn F. Tacuban (Purchasing Manager)"
                  readOnly
                  className="w-full p-2 border rounded bg-gray-50 text-gray-600 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Est. Procurement Total</label>
                <div className="p-2 border rounded bg-[#FAF6EE] font-mono font-bold text-base text-[#1E7A3E]">
                  ₱{poTotalEstimatedCost.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* Custom / New Supplier Input Row */}
            {isCustomSupplier && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-2 text-xs">
                <span className="font-bold text-amber-900 block">
                  New Vendor Quotation Details (Record Lowest Market Offering):
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="New Supplier Business Name *"
                    value={customSupplierName}
                    onChange={(e) => setCustomSupplierName(e.target.value)}
                    className="p-2 border rounded bg-white font-bold"
                  />
                  <input
                    type="text"
                    placeholder="Contact Person / Phone (e.g. +63 917 123 4567)"
                    value={customSupplierContact}
                    onChange={(e) => setCustomSupplierContact(e.target.value)}
                    className="p-2 border rounded bg-white"
                  />
                  <input
                    type="text"
                    placeholder="Warehouse / Depot Address"
                    value={customSupplierAddress}
                    onChange={(e) => setCustomSupplierAddress(e.target.value)}
                    className="p-2 border rounded bg-white"
                  />
                </div>
              </div>
            )}

            {/* Add Custom Item Row */}
            <div className="bg-[#FAF6EE] p-3 rounded-xl border border-[#C8963E]/40 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-bold text-[#240e32]">
                + Add Any Inventory Material / Packaging SKU to this PO:
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={addMaterialCode}
                  onChange={(e) => setAddMaterialCode(e.target.value)}
                  className="p-1.5 border rounded bg-white font-medium"
                >
                  {inventory.map((m) => (
                    <option key={m.code} value={m.code}>{m.code} · {m.name} ({m.primaryUom})</option>
                  ))}
                </select>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="1"
                    value={addQty}
                    onChange={(e) => setAddQty(parseFloat(e.target.value) || 1)}
                    className="w-16 p-1.5 border rounded font-mono font-bold text-right"
                  />
                  <span className="font-semibold text-gray-500">
                    {inventory.find((m) => m.code === addMaterialCode)?.primaryUom || 'Units'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAddMaterialToDraft}
                  className="px-3 py-1.5 rounded bg-[#240e32] text-[#E5C585] font-bold hover:bg-[#3D1C52] transition"
                >
                  + Add Item to PO
                </button>
              </div>
            </div>

            {/* Actions Toolbar */}
            <div className="flex justify-between items-center pt-2 border-t flex-wrap gap-2">
              <div className="text-xs text-gray-600">
                Draft SKUs: <strong className="text-[#3D1C52] font-mono">{poDraftItems.length}</strong> · Quantities and Unit Prices are editable directly in the table below.
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleSavePoWithStatus('PO_DRAFT')}
                  disabled={poDraftItems.length === 0}
                  className={`text-xs px-3.5 py-2 rounded-lg font-bold flex items-center gap-1.5 shadow transition ${
                    poDraftItems.length > 0
                      ? 'bg-amber-600 hover:bg-amber-700 text-white'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                  title="Save as editable draft without locking to Inbound Receiving dock yet"
                >
                  <FileText size={14} /> Save as Draft (PO_DRAFT)
                </button>

                <button
                  type="button"
                  onClick={() => handleSavePoWithStatus('PENDING_DELIVERY')}
                  disabled={poDraftItems.length === 0}
                  className={`text-xs px-4 py-2 rounded-lg font-bold flex items-center gap-1.5 shadow transition ${
                    poDraftItems.length > 0
                      ? 'bg-[#1E7A3E] hover:bg-emerald-800 text-white'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                  title="Finalize PO and dispatch to Jade's Inbound Receiving dock selector"
                >
                  <CheckCircle2 size={14} /> Finalize to Dock (PENDING_DELIVERY)
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPoPreview({
                    poNo,
                    supplier: isCustomSupplier
                      ? (customSupplierName.trim() || 'New Supplier')
                      : (selectedSupplier === 'ALL' ? 'Consolidated Vendors' : selectedSupplier),
                    items: poDraftItems,
                    totalCost: poTotalEstimatedCost,
                    generatedDate: new Date().toISOString().slice(0, 10),
                    preparedBy: 'Mariejohn F. Tacuban'
                  })}
                  disabled={poDraftItems.length === 0}
                  className={`text-xs px-4 py-2 rounded-lg font-bold flex items-center gap-1.5 shadow transition ${
                    poDraftItems.length > 0 
                      ? 'bg-[#C8963E] hover:bg-[#b08030] text-[#240e32]' 
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Printer size={14} /> Preview &amp; Print `Form-PUR-002`
                </button>
              </div>
            </div>
          </div>

          {/* Draft Items Interactive Table */}
          <div className="bg-white rounded-xl border border-[#E2D1B8] shadow-sm overflow-hidden">
            <div className="p-4 bg-[#FAF6EE] border-b border-[#E2D1B8] flex justify-between items-center">
              <div>
                <h3 className="font-serif font-bold text-[#3D1C52] text-sm">
                  Active PO Material Specification &amp; Unit Cost Quotation
                </h3>
                <p className="text-[11px] text-gray-500">
                  Update primary order quantity or negotiated unit cost. Secondary quantity and line total update in real-time.
                </p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 bg-amber-100 text-[#D68910] rounded-full">
                {poDraftItems.length} Materials Queued
              </span>
            </div>

            {poDraftItems.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <CheckCircle2 size={32} className="mx-auto text-green-600 mb-2" />
                <p className="font-semibold text-sm">PO Draft is empty!</p>
                <p className="text-xs text-gray-400 mt-1">Click "Reload Low-Stock Suggestions" or use the material selector above to add items.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#5B2E7A] text-white">
                    <tr>
                      <th className="p-2.5">Material SKU</th>
                      <th className="p-2.5">Item Name &amp; Room</th>
                      <th className="p-2.5">Vendor / Source</th>
                      <th className="p-2.5 text-right">Current Stock</th>
                      <th className="p-2.5 text-right font-bold text-[#E5C585]">Order Qty (Primary Bulk)</th>
                      <th className="p-2.5 text-right">Net Equivalent</th>
                      <th className="p-2.5 text-right font-bold text-[#E5C585]">Unit Price (PHP)</th>
                      <th className="p-2.5 text-right">Estimated Line Total</th>
                      <th className="p-2.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {poDraftItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="p-2.5 font-mono font-bold text-[#5B2E7A]">{item.code}</td>
                        <td className="p-2.5">
                          <span className="font-bold text-gray-900">{item.name}</span>
                          <span className="block text-[10px] text-gray-500">{item.room}</span>
                        </td>
                        <td className="p-2.5 font-medium text-gray-700">{item.supplier}</td>
                        <td className="p-2.5 text-right font-mono text-gray-500">
                          {item.currentBalanceSec} {item.secondaryUom}
                        </td>
                        <td className="p-2.5 text-right">
                          <div className="inline-flex items-center gap-1 justify-end">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.suggestedPrimaryQty}
                              onChange={(e) => handleDraftQtyChange(idx, e.target.value)}
                              className="w-16 p-1 border rounded text-right font-mono font-bold text-[#1E7A3E] bg-green-50/50"
                            />
                            <span className="font-semibold text-gray-600">{item.primaryUom}s</span>
                          </div>
                        </td>
                        <td className="p-2.5 text-right font-mono text-gray-700">
                          {Number(item.totalSecondaryQty || 0).toLocaleString()} {item.secondaryUom}
                        </td>
                        <td className="p-2.5 text-right">
                          <div className="inline-flex items-center gap-1 justify-end">
                            <span className="text-gray-500">₱</span>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.unitCost}
                              onChange={(e) => handleDraftUnitCostChange(idx, e.target.value)}
                              className="w-20 p-1 border rounded text-right font-mono text-gray-800"
                            />
                          </div>
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-gray-900">
                          ₱{Number(item.estimatedCost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveDraftItem(idx)}
                            className="text-red-500 hover:text-red-700 p-1"
                            title="Remove from PO"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-[#FAF6EE] font-bold">
                    <tr>
                      <td colSpan={7} className="p-2.5 text-right text-gray-700">Total Purchase Commitment:</td>
                      <td className="p-2.5 text-right font-mono text-sm text-[#1E7A3E]">
                        ₱{poTotalEstimatedCost.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* PO REGISTER & DELIVERY TRACKER TABLE */}
          <div className="bg-white rounded-xl border border-[#E2D1B8] shadow-sm overflow-hidden">
            <div className="p-4 bg-[#FAF6EE] border-b border-[#E2D1B8] flex justify-between items-center">
              <div>
                <h3 className="font-serif font-bold text-[#3D1C52] text-sm">
                  Active &amp; Historical Purchase Orders Register (`Form-PUR-002`)
                </h3>
                <p className="text-[11px] text-gray-500">
                  Track pending orders, dock delivery receipts, and verification statuses cross-referenced by Jade.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-[#5B2E7A]">
                {(purchaseOrders || []).length} Recorded POs
              </span>
            </div>

            {(purchaseOrders || []).length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-xs italic">
                No purchase orders recorded yet. Generate a PO above and click "Save &amp; Record PO".
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#240e32] text-[#E5C585]">
                    <tr>
                      <th className="p-2.5">PO Number</th>
                      <th className="p-2.5">Order Date</th>
                      <th className="p-2.5">Supplier / Vendor</th>
                      <th className="p-2.5 text-right">SKUs</th>
                      <th className="p-2.5 text-right">Commitment (PHP)</th>
                      <th className="p-2.5">Delivery Status</th>
                      <th className="p-2.5">Cross-Ref Ingest Report</th>
                      <th className="p-2.5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(purchaseOrders || []).map((po, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="p-2.5 font-mono font-bold text-[#5B2E7A]">{po.poNo}</td>
                        <td className="p-2.5 font-mono text-gray-600">{po.date}</td>
                        <td className="p-2.5 font-medium">{po.supplier}</td>
                        <td className="p-2.5 text-right font-mono">{po.items?.length || 0}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-[#1E7A3E]">
                          ₱{(po.totalCost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-2.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            po.status === 'RECEIVED'
                              ? 'bg-green-100 text-green-800'
                              : po.status === 'RECEIVED_WITH_CHANGES'
                              ? 'bg-amber-100 text-amber-800'
                              : po.status === 'PO_DRAFT'
                              ? 'bg-yellow-100 text-yellow-900 border border-yellow-300'
                              : po.status === 'CANCELLED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {po.status === 'RECEIVED'
                              ? '✓ RECEIVED CLEAN'
                              : po.status === 'RECEIVED_WITH_CHANGES'
                              ? '⚠️ RECEIVED W/ CHANGES'
                              : po.status === 'PO_DRAFT'
                              ? '📝 PO DRAFT (EDITABLE)'
                              : po.status === 'CANCELLED'
                              ? '✕ CANCELLED'
                              : '⏳ PENDING DELIVERY'}
                          </span>
                        </td>
                        <td className="p-2.5 font-mono text-gray-600">
                          {po.receivingReportNo ? (
                            <span className="text-emerald-700 font-bold">{po.receivingReportNo}</span>
                          ) : po.status === 'PO_DRAFT' ? (
                            <span className="text-yellow-700 italic">Draft (Not Dispatched)</span>
                          ) : (
                            <span className="text-gray-400 italic">Awaiting Dock</span>
                          )}
                        </td>
                        <td className="p-2.5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedPoPreview(po)}
                              className="text-xs text-[#5B2E7A] hover:underline font-bold"
                            >
                              View Form
                            </button>
                            {po.status === 'PO_DRAFT' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleEditDraftPo(po)}
                                  className="text-xs text-amber-700 hover:underline font-bold"
                                  title="Re-open in workbench to adjust prices or quantities"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (onSavePurchaseOrder) {
                                      onSavePurchaseOrder({ ...po, status: 'PENDING_DELIVERY' });
                                      alert(`✅ PO ${po.poNo} finalized and sent to Inbound Receiving dock!`);
                                    }
                                  }}
                                  className="text-xs text-emerald-700 hover:underline font-bold"
                                  title="Finalize draft and dispatch to Jade's dock"
                                >
                                  Finalize
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: HISTORICAL TRANSACTION LEDGER & DYNAMIC TIMEFRAME */}
      {activeSubTab === 'ledger' && (
        <div className="space-y-5">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-[#E2D1B8] shadow-sm space-y-3">
            <div className="flex flex-wrap justify-between items-center gap-3">
              {/* Dataset Selector */}
              <div className="flex gap-1.5 flex-wrap">
                {[
                  { id: 'RECEIVING', label: 'Inbound Receiving (Form-REC-001)', count: (receivingReports || []).length },
                  { id: 'WITHDRAWALS', label: 'Stock Withdrawals (Form-WAR-001)', count: (withdrawals || []).length },
                  { id: 'BATCHING', label: 'Outlet Kitting (Form-ING-001)', count: (batchOrders || []).length },
                  { id: 'ADJUSTMENTS', label: 'Adjustments & NCR', count: (adjustments || []).length + quarantineList.length }
                ].map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setLedgerType(d.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      ledgerType === d.id
                        ? 'bg-[#5B2E7A] text-white shadow-sm'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {d.label} ({d.count})
                  </button>
                ))}
              </div>

              {/* Timeframe Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-600 flex items-center gap-1">
                  <Calendar size={13} /> Timeframe:
                </span>
                <select
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value)}
                  className="p-1.5 text-xs border rounded bg-white font-medium"
                >
                  <option value="ALL">All Records</option>
                  <option value="TODAY">Today (Nov 3 Baseline)</option>
                  <option value="CUSTOM">Custom Date Window...</option>
                </select>
              </div>
            </div>

            {/* Custom Range & Search Bar */}
            <div className="flex flex-wrap justify-between items-center gap-3 pt-2 border-t">
              <div className="flex items-center gap-2">
                {timeframe === 'CUSTOM' && (
                  <div className="flex items-center gap-1 text-xs">
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="p-1 border rounded"
                    />
                    <span className="text-gray-500 font-bold">to</span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="p-1 border rounded"
                    />
                  </div>
                )}
              </div>

              {/* Free-text Filter */}
              <div className="relative w-64">
                <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by lot number, material code, supplier, driver, slip number, or recipe..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 p-1.5 text-xs border rounded bg-gray-50 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="bg-white rounded-xl border border-[#E2D1B8] shadow-sm overflow-hidden">
            <div className="p-3 bg-[#FAF6EE] border-b border-[#E2D1B8] flex justify-between items-center text-xs">
              <span className="font-bold text-gray-700">
                Displaying <strong>{filteredLedger.length}</strong> immutable transaction records
              </span>
              <span className="font-mono text-gray-500">Chronological Sort (Descending)</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#5B2E7A] text-white">
                  <tr>
                    <th className="p-2.5">Record ID / Ref #</th>
                    <th className="p-2.5">Date &amp; Time</th>
                    <th className="p-2.5">Entity / Requester / Outlet</th>
                    <th className="p-2.5">Specific Detail / Description</th>
                    <th className="p-2.5 text-right">Items / Lines</th>
                    <th className="p-2.5 text-right">Valuation / Cost</th>
                    <th className="p-2.5">Status &amp; Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredLedger.map((row, idx) => {
                    const id = row.reportNo || row.slipNo || row.orderId || row.id || `TX-${idx}`;
                    const date = row.date || row.requestDate || row.timestamp || '2026-11-03';
                    const time = row.time || '';
                    const entity = row.supplier || row.requestingEntity || row.outletName || row.reason;
                    const detail = row.invoiceNo ? `Invoice: ${row.invoiceNo}` : row.recipeName ? `${row.recipeName} (${row.plannedBatches} batches)` : row.purpose || row.type || 'Standard Ledger Entry';
                    const lines = Array.isArray(row.items) ? row.items.length : (row.plannedBatches ? `${row.totalDoughKg} kg dough` : 1);
                    const val = row.totalPaid || row.totalCost || row.totalIngredientCost || 0;
                    const status = row.overallStatus || row.status || 'COMMITTED';

                    return (
                      <tr key={idx} className="hover:bg-gray-50 font-mono">
                        <td className="p-2.5 font-bold text-[#5B2E7A]">{id}</td>
                        <td className="p-2.5 text-gray-600">{date} {time}</td>
                        <td className="p-2.5 font-sans font-medium text-gray-900">{entity}</td>
                        <td className="p-2.5 font-sans text-gray-700">{detail}</td>
                        <td className="p-2.5 text-right font-bold">{lines}</td>
                        <td className="p-2.5 text-right font-bold text-[#1E7A3E]">
                          ₱{val ? val.toLocaleString('en-PH', { minimumFractionDigits: 2 }) : '0.00'}
                        </td>
                        <td className="p-2.5">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                            {status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: BI-DIRECTIONAL CSV DATA BRIDGE */}
      {activeSubTab === 'csv_bridge' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-[#E2D1B8] shadow-sm space-y-4">
            <div>
              <h3 className="font-serif font-bold text-[#3D1C52] text-base">
                Bi-Directional CSV Data Hub (Legacy Accounting, ERP &amp; Excel Bridge)
              </h3>
              <p className="text-xs text-gray-600 mt-1">
                Export current operational state into RFC-4180 compliant CSV formats or import warehouse opening counts.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              <div className="border p-3.5 rounded-xl bg-gray-50 space-y-2 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-xs text-[#5B2E7A]">Master Materials Register</h4>
                  <p className="text-[11px] text-gray-500 mt-1">76 authentic raw materials &amp; packaging SKUs with dual UoM factors.</p>
                </div>
                <button
                  onClick={handleExportMaterialsCsv}
                  className="w-full bg-white hover:bg-gray-100 text-[#3D1C52] font-bold text-xs py-2 px-3 rounded-lg border flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Download size={13} /> Export Materials (.CSV)
                </button>
              </div>

              <div className="border p-3.5 rounded-xl bg-gray-50 space-y-2 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-xs text-[#1E7A3E]">Inbound Receiving Reports</h4>
                  <p className="text-[11px] text-gray-500 mt-1">Complete inbound delivery records, QA gates, temperatures &amp; lot allocations.</p>
                </div>
                <button
                  onClick={handleExportReceivingCsv}
                  className="w-full bg-white hover:bg-gray-100 text-[#1E7A3E] font-bold text-xs py-2 px-3 rounded-lg border flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Download size={13} /> Export Receiving (.CSV)
                </button>
              </div>

              <div className="border p-3.5 rounded-xl bg-gray-50 space-y-2 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-xs text-[#C8963E]">Stock Withdrawals Ledger</h4>
                  <p className="text-[11px] text-gray-500 mt-1">SOP-WAR-002 material requisitions, production lines &amp; FEFO lot audits.</p>
                </div>
                <button
                  onClick={handleExportWithdrawalsCsv}
                  className="w-full bg-white hover:bg-gray-100 text-[#C8963E] font-bold text-xs py-2 px-3 rounded-lg border flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Download size={13} /> Export Withdrawals (.CSV)
                </button>
              </div>

              <div className="border p-3.5 rounded-xl bg-gray-50 space-y-2 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-xs text-purple-700">Commercial Batching Orders</h4>
                  <p className="text-[11px] text-gray-500 mt-1">Form-ING-001 outlet requisitions, scaled recipes &amp; kitting records.</p>
                </div>
                <button
                  onClick={handleExportBatchingCsv}
                  className="w-full bg-white hover:bg-gray-100 text-purple-700 font-bold text-xs py-2 px-3 rounded-lg border flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Download size={13} /> Export Batching (.CSV)
                </button>
              </div>
            </div>

            <div className="border-t pt-4 flex justify-between items-center flex-wrap gap-2">
              <span className="text-xs text-gray-500">
                Looking to import external counts from Excel? Open the batch importer modal.
              </span>
              <button
                onClick={onOpenImportModal}
                className="bg-[#240e32] hover:bg-[#3D1C52] text-[#E5C585] text-xs font-bold py-2 px-4 rounded-xl flex items-center gap-1.5 shadow"
              >
                <Upload size={13} /> Launch Opening Inventory CSV Importer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINTABLE FORM-PUR-002 MODAL */}
      {selectedPoPreview && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border-2 border-[#C8963E] space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-[#5B2E7A] pb-3">
              <div>
                <p className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">JANG-JANG BAKESHOP &amp; KINGDOM CONFECTIONARY</p>
                <h3 className="font-serif font-bold text-xl text-[#3D1C52]">
                  Purchase Order / Material Replenishment (`Form-PUR-002`)
                </h3>
                <p className="text-xs text-[#C8963E] font-mono font-bold">PO Number: {selectedPoPreview.poNo}</p>
              </div>
              <button 
                onClick={() => setSelectedPoPreview(null)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs bg-[#FAF6EE] p-3 rounded border border-[#E2D1B8]">
              <div><strong>Vendor:</strong> {selectedPoPreview.supplier}</div>
              <div><strong>Date:</strong> {selectedPoPreview.generatedDate || selectedPoPreview.date}</div>
              <div><strong>Facility:</strong> Indangan Central Plant</div>
              <div><strong>Buyer / Pre-Approver:</strong> {selectedPoPreview.preparedBy}</div>
            </div>

            {/* Items Table */}
            <table className="w-full text-left text-xs border">
              <thead className="bg-[#5B2E7A] text-white">
                <tr>
                  <th className="p-2">Material SKU</th>
                  <th className="p-2">Description</th>
                  <th className="p-2 text-right">Order Qty (Primary)</th>
                  <th className="p-2 text-right">Net Equivalent</th>
                  <th className="p-2 text-right">Unit Cost</th>
                  <th className="p-2 text-right">Amount (PHP)</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {selectedPoPreview.items.map((it, idx) => (
                  <tr key={idx}>
                    <td className="p-2 font-mono font-bold text-[#5B2E7A]">{it.code}</td>
                    <td className="p-2">{it.name}</td>
                    <td className="p-2 text-right font-mono font-bold text-[#1E7A3E]">
                      {it.suggestedPrimaryQty} {it.primaryUom}s
                    </td>
                    <td className="p-2 text-right font-mono text-gray-600">
                      {Number(it.totalSecondaryQty || 0).toLocaleString()} {it.secondaryUom}
                    </td>
                    <td className="p-2 text-right font-mono">
                      ₱{it.unitCost?.toLocaleString()}
                    </td>
                    <td className="p-2 text-right font-mono font-bold">
                      ₱{Number(it.estimatedCost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-100 font-bold">
                <tr>
                  <td colSpan={5} className="p-2 text-right">Total Estimated Purchase Commitment:</td>
                  <td className="p-2 text-right font-mono text-sm text-[#1E7A3E]">
                    ₱{selectedPoPreview.totalCost.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* Delivery Terms */}
            <div className="text-[11px] text-gray-600 bg-gray-50 p-2.5 rounded border space-y-1">
              <p className="font-bold text-gray-700">Inbound Delivery Instructions (SOP-WAR-002):</p>
              <p>• Delivery vehicle must be covered, clean, and free of toxic / chemical contamination.</p>
              <p>• Cold storage items (margarine/butter) must be delivered at &lt; 0°C with intact temperature loggers.</p>
              <p>• Deliveries must be accompanied by Certificate of Analysis (CoA) and Supplier Delivery Receipt (DR).</p>
            </div>

            {/* Signature Blocks */}
            <div className="grid grid-cols-2 gap-4 pt-3 border-t text-xs">
              <div className="border p-2.5 rounded bg-gray-50">
                <p className="text-[10px] uppercase font-bold text-gray-500">Purchasing &amp; Inventory Manager:</p>
                <p className="font-bold text-[#3D1C52] mt-1">Mariejohn F. Tacuban</p>
                <div className="border-b my-2"></div>
                <p className="text-[10px] text-gray-400">Signature &amp; Date</p>
              </div>

              <div className="border p-2.5 rounded bg-gray-50">
                <p className="text-[10px] uppercase font-bold text-gray-500">Chief Operating Authority:</p>
                <p className="font-bold text-[#3D1C52] mt-1">Angelina P. Sun</p>
                <div className="border-b my-2"></div>
                <p className="text-[10px] text-gray-400">Approval Stamp</p>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setSelectedPoPreview(null)}
                className="px-4 py-2 text-xs text-gray-600 hover:underline"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="bg-[#3D1C52] text-white text-xs font-bold px-5 py-2.5 rounded-lg flex items-center gap-1.5"
              >
                <Printer size={14} /> Print Hard-Copy `Form-PUR-002`
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}