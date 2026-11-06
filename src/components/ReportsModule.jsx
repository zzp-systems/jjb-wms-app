import React, { useState, useMemo } from 'react';
import { 
  FileText, Download, Upload, ShoppingCart, Calendar, 
  Search, Filter, CheckCircle2, AlertTriangle, Printer,
  RefreshCw, DollarSign, Package, ArrowDownRight, ArrowUpRight,
  ShieldCheck, Layers, FileSpreadsheet
} from 'lucide-react';
import { calculateReorderSuggestions, calcSecondaryQty } from '../utils/wmsLogic';

export default function ReportsModule({
  inventory,
  receivingReports,
  withdrawals,
  batchOrders,
  adjustments,
  quarantineList,
  currentRole,
  onImportInventoryCsv,
  onRecordAudit,
  onOpenImportModal
}) {
  const [activeSubTab, setActiveSubTab] = useState('po_generator'); // 'po_generator' | 'ledger' | 'csv_bridge'
  const [timeframe, setTimeframe] = useState('ALL'); // 'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM'
  const [customStartDate, setCustomStartDate] = useState('2026-11-01');
  const [customEndDate, setCustomEndDate] = useState('2026-11-30');
  const [ledgerType, setLedgerType] = useState('RECEIVING'); // 'RECEIVING' | 'WITHDRAWALS' | 'BATCHING' | 'ADJUSTMENTS'
  const [searchTerm, setSearchTerm] = useState('');

  // PO Generator State
  const [selectedSupplier, setSelectedSupplier] = useState('ALL');
  const [customPoItems, setCustomPoItems] = useState([]);
  const [poNo, setPoNo] = useState(`PO-2026-${Math.floor(1050 + Math.random() * 50)}`);
  const [selectedPoPreview, setSelectedPoPreview] = useState(null);

  // CSV Import State
  const [csvInputText, setCsvInputText] = useState('');
  const [importStatus, setImportStatus] = useState(null);

  // Low stock suggestions
  const lowStockSuggestions = useMemo(() => {
    return calculateReorderSuggestions(inventory);
  }, [inventory]);

  // Suppliers list from inventory
  const suppliers = useMemo(() => {
    const set = new Set();
    inventory.forEach(i => { if (i.supplier) set.add(i.supplier); });
    return Array.from(set);
  }, [inventory]);

  // Items for PO based on selected supplier
  const poItems = useMemo(() => {
    const base = lowStockSuggestions.filter(s => {
      if (selectedSupplier === 'ALL') return true;
      return s.supplier === selectedSupplier;
    });
    return base;
  }, [lowStockSuggestions, selectedSupplier]);

  const poTotalEstimatedCost = poItems.reduce((acc, it) => acc + it.estimatedCost, 0);

  // Filtered Ledger Records
  const filteredLedger = useMemo(() => {
    let dataset = [];
    let dateField = 'date';

    if (ledgerType === 'RECEIVING') {
      dataset = receivingReports;
    } else if (ledgerType === 'WITHDRAWALS') {
      dataset = withdrawals;
    } else if (ledgerType === 'BATCHING') {
      dataset = batchOrders;
      dateField = 'requestDate';
    } else if (ledgerType === 'ADJUSTMENTS') {
      dataset = adjustments;
    }

    return dataset.filter(row => {
      const rowDate = row[dateField] || row.date;
      if (!rowDate) return true;

      // Timeframe check
      if (timeframe === 'TODAY' && rowDate !== '2026-11-03') return false;
      if (timeframe === 'CUSTOM') {
        if (rowDate < customStartDate || rowDate > customEndDate) return false;
      }

      // Search check
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const jsonStr = JSON.stringify(row).toLowerCase();
        return jsonStr.includes(query);
      }

      return true;
    });
  }, [ledgerType, receivingReports, withdrawals, batchOrders, adjustments, timeframe, customStartDate, customEndDate, searchTerm]);

  // CSV Exporter Helper
  const exportToCsv = (filename, headers, rows) => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${(val ?? '').toString().replace(/"/g, '""')}"`).join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();

    if (onRecordAudit) {
      onRecordAudit("CSV_EXPORT", `Exported dataset: ${filename}`);
    }
  };

  // Export Master Inventory
  const handleExportInventoryCsv = () => {
    const headers = ["ItemCode", "Name", "Category", "Supplier", "StorageRoom", "PrimaryUom", "SecondaryUom", "ConversionFactor", "CurrentBalanceSec", "ThresholdSec", "UnitCostPhp", "EstimatedValuationPhp"];
    const rows = inventory.map(m => [
      m.code,
      m.name,
      m.category,
      m.supplier,
      m.room,
      m.primaryUom,
      m.secondaryUom,
      m.conversionFactor,
      m.currentBalance,
      m.threshold,
      m.unitCost,
      ((m.currentBalance / m.conversionFactor) * m.unitCost).toFixed(2)
    ]);
    exportToCsv("JJB_MASTER_INVENTORY_FEFO", headers, rows);
  };

  // Export Receiving Log
  const handleExportReceivingCsv = () => {
    const headers = ["ReportNo", "Date", "PoNo", "Supplier", "InvoiceNo", "MaterialCode", "MaterialName", "PrimaryQty", "PrimaryUom", "SecondaryQty", "SecondaryUom", "LotNo", "ExpiryDate", "Room", "Status", "AmountPhp"];
    const rows = [];
    receivingReports.forEach(r => {
      r.items?.forEach(it => {
        rows.push([
          r.reportNo,
          r.date,
          r.poNo,
          r.supplier,
          r.invoiceNo,
          it.materialCode,
          it.name,
          it.primaryQty,
          it.primaryUom,
          it.secondaryQty,
          it.secondaryUom,
          it.lotNumber,
          it.expiryDate,
          it.storageRoom,
          r.overallStatus,
          it.totalAmount
        ]);
      });
    });
    exportToCsv("JJB_RECEIVING_REPORT_FORM_REC_001", headers, rows);
  };

  // Export Withdrawals Log
  const handleExportWithdrawalsCsv = () => {
    const headers = ["SlipNo", "Date", "Time", "RequestingEntity", "Department", "Purpose", "MaterialCode", "MaterialName", "QtyIssuedSec", "SecondaryUom", "LotNo", "RequestedBy", "IssuedBy", "ReceivedBy", "Status"];
    const rows = [];
    withdrawals.forEach(w => {
      w.items?.forEach(it => {
        rows.push([
          w.slipNo,
          w.date,
          w.time,
          w.requestingEntity,
          w.department,
          w.purpose,
          it.materialCode,
          it.name,
          it.qtyIssuedSec,
          it.secondaryUom,
          it.lotNumber,
          w.requestedBy,
          w.issuedBy,
          w.receivedBy,
          w.status
        ]);
      });
    });
    exportToCsv("JJB_WITHDRAWALS_REPORT_FORM_WAR_001", headers, rows);
  };

  // Export Batching Orders Log
  const handleExportBatchOrdersCsv = () => {
    const headers = ["OrderId", "RequestDate", "TargetDate", "OutletName", "RecipeSku", "RecipeName", "BatchMultiplier", "RequestedPcs", "Status", "BatchTagId", "ActualBatchedKg", "BatchedBy", "BatchedAt", "ReleasedAt", "ReleasedTo"];
    const rows = batchOrders.map(b => [
      b.orderId,
      b.requestDate,
      b.targetDate,
      b.outletName,
      b.recipeSku,
      b.recipeName,
      b.batchMultiplier,
      b.requestedQtyPcs,
      b.status,
      b.batchTagId || 'N/A',
      b.actualBatchedKg || 0,
      b.batchedBy || 'N/A',
      b.batchedAt || 'N/A',
      b.releasedAt || 'N/A',
      b.releasedTo || 'N/A'
    ]);
    exportToCsv("JJB_BATCHING_KITTING_FORM_ING_001", headers, rows);
  };

  // Parse and commit imported CSV
  const handleProcessCsvImport = () => {
    if (!csvInputText.trim()) {
      setImportStatus({ type: 'error', message: 'CSV input is empty.' });
      return;
    }

    try {
      const lines = csvInputText.trim().split('\n');
      if (lines.length < 2) {
        setImportStatus({ type: 'error', message: 'CSV must contain a header row and at least 1 data row.' });
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
      
      const codeIdx = headers.findIndex(h => h.includes('code') || h === 'itemcode');
      const balanceIdx = headers.findIndex(h => h.includes('balance') || h.includes('qty'));
      
      if (codeIdx === -1 || balanceIdx === -1) {
        setImportStatus({ 
          type: 'error', 
          message: 'Header must contain at least "ItemCode" (or code) and "CurrentBalanceSec" (or balance).' 
        });
        return;
      }

      const updates = [];
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map(p => p.trim().replace(/^"|"$/g, ''));
        if (parts.length <= Math.max(codeIdx, balanceIdx)) continue;
        const code = parts[codeIdx];
        const newBalance = parseFloat(parts[balanceIdx]);
        if (code && !isNaN(newBalance)) {
          updates.push({ code, newBalance });
        }
      }

      if (updates.length === 0) {
        setImportStatus({ type: 'error', message: 'No valid data rows found in CSV.' });
        return;
      }

      if (onImportInventoryCsv) {
        onImportInventoryCsv(updates);
      }

      setImportStatus({ 
        type: 'success', 
        message: `Successfully updated stock balances for ${updates.length} items from CSV!` 
      });
      setCsvInputText('');

      if (onRecordAudit) {
        onRecordAudit("CSV_INVENTORY_IMPORT", `Imported balance updates for ${updates.length} materials`);
      }
    } catch (e) {
      setImportStatus({ type: 'error', message: `CSV parse error: ${e.message}` });
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Header */}
      <div className="flex justify-between items-start flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold bg-[#C8963E] text-[#240e32] px-2 py-0.5 rounded">
              Form-PUR-002 / REP-001
            </span>
            <h2 className="font-serif text-2xl font-bold text-[#3D1C52]">
              Reports, Audit Dossiers &amp; Replenishment PO Generator
            </h2>
          </div>
          <p className="text-xs text-gray-600 mt-0.5">
            Dynamic Ledger Audits (Nov 2026+) · Bi-Directional CSV Data Hub · Automated Form-PUR-002 Reorder Replenishment
          </p>
        </div>

        {/* Sub-Tabs Selector */}
        <div className="flex bg-white p-1 rounded-lg border border-[#E2D1B8] shadow-sm">
          <button
            onClick={() => setActiveSubTab('po_generator')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
              activeSubTab === 'po_generator'
                ? 'bg-[#3D1C52] text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ShoppingCart size={14} /> PO Replenishment ({lowStockSuggestions.length} Low)
          </button>
          <button
            onClick={() => setActiveSubTab('ledger')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
              activeSubTab === 'ledger'
                ? 'bg-[#5B2E7A] text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText size={14} /> Historical Ledgers &amp; Audits
          </button>
          <button
            onClick={() => setActiveSubTab('csv_bridge')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
              activeSubTab === 'csv_bridge'
                ? 'bg-[#1E7A3E] text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileSpreadsheet size={14} /> CSV Hub &amp; Import
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: PO REPLENISHMENT GENERATOR (Form-PUR-002) */}
      {activeSubTab === 'po_generator' && (
        <div className="space-y-5">
          {/* Top Control Strip */}
          <div className="bg-white p-4 rounded-xl border border-[#E2D1B8] shadow-sm flex flex-wrap justify-between items-center gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-0.5">Filter by Vendor / Supplier:</label>
                <select
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                  className="p-1.5 text-xs border rounded bg-white font-medium"
                >
                  <option value="ALL">All Authorized Suppliers ({suppliers.length})</option>
                  {suppliers.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-0.5">Assigned PO Number:</label>
                <input
                  type="text"
                  value={poNo}
                  onChange={(e) => setPoNo(e.target.value)}
                  className="p-1.5 text-xs border rounded font-mono font-bold text-[#5B2E7A] w-36"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600 font-semibold">
                Est. Procurement Total: <strong className="text-[#1E7A3E] font-mono text-sm">₱{poTotalEstimatedCost.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong>
              </span>
              <button
                onClick={() => setSelectedPoPreview({
                  poNo,
                  supplier: selectedSupplier === 'ALL' ? 'Consolidated Vendors' : selectedSupplier,
                  items: poItems,
                  totalCost: poTotalEstimatedCost,
                  generatedDate: new Date().toISOString().slice(0, 10),
                  preparedBy: currentRole
                })}
                disabled={poItems.length === 0}
                className={`text-xs px-4 py-2 rounded-lg font-bold flex items-center gap-1.5 shadow transition ${
                  poItems.length > 0 
                    ? 'bg-[#C8963E] hover:bg-[#b08030] text-[#240e32]' 
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Printer size={14} /> Generate &amp; Print `Form-PUR-002`
              </button>
            </div>
          </div>

          {/* Low Stock Items List */}
          <div className="bg-white rounded-xl border border-[#E2D1B8] shadow-sm overflow-hidden">
            <div className="p-4 bg-[#FAF6EE] border-b border-[#E2D1B8] flex justify-between items-center">
              <div>
                <h3 className="font-serif font-bold text-[#3D1C52] text-sm">
                  Recommended Replenishment Pull List (Trigger: Current Balance ≤ Safety Threshold)
                </h3>
                <p className="text-[11px] text-gray-500">
                  Target Inventory Level = 2× Safety Threshold · Quantities rounded up to whole bulk packages (sacks, blocks, tins, rims)
                </p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 bg-amber-100 text-[#D68910] rounded-full">
                {poItems.length} Low-Stock SKUs Found
              </span>
            </div>

            {poItems.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <CheckCircle2 size={32} className="mx-auto text-green-600 mb-2" />
                <p className="font-semibold text-sm">All raw material inventory balances are currently above safety thresholds!</p>
                <p className="text-xs text-gray-400 mt-1">Select "All Authorized Suppliers" or simulate withdrawals to view reorder recommendations.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#5B2E7A] text-white">
                    <tr>
                      <th className="p-2.5">Material SKU</th>
                      <th className="p-2.5">Item Name &amp; Room</th>
                      <th className="p-2.5">Authorized Vendor</th>
                      <th className="p-2.5 text-right">Current Balance</th>
                      <th className="p-2.5 text-right">Safety Threshold</th>
                      <th className="p-2.5 text-right font-bold text-[#E5C585]">Suggested Order (Primary)</th>
                      <th className="p-2.5 text-right">Net Qty (Secondary)</th>
                      <th className="p-2.5 text-right">Unit Price</th>
                      <th className="p-2.5 text-right">Estimated Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {poItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="p-2.5 font-mono font-bold text-[#5B2E7A]">{item.code}</td>
                        <td className="p-2.5">
                          <span className="font-bold text-gray-900">{item.name}</span>
                          <span className="block text-[10px] text-gray-500">{item.room}</span>
                        </td>
                        <td className="p-2.5 font-medium text-gray-700">{item.supplier}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-red-600">
                          {item.currentBalanceSec} {item.secondaryUom}
                        </td>
                        <td className="p-2.5 text-right font-mono text-gray-500">
                          {item.thresholdSec} {item.secondaryUom}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-[#1E7A3E] bg-green-50/50">
                          {item.suggestedPrimaryQty} {item.primaryUom}s
                        </td>
                        <td className="p-2.5 text-right font-mono text-gray-700">
                          {item.totalSecondaryQty.toLocaleString()} {item.secondaryUom}
                        </td>
                        <td className="p-2.5 text-right font-mono text-gray-600">
                          ₱{item.unitCost?.toLocaleString()} / {item.primaryUom}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-gray-900">
                          ₱{item.estimatedCost?.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
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
                  { id: 'RECEIVING', label: 'Inbound Receiving (Form-REC-001)', count: receivingReports.length },
                  { id: 'WITHDRAWALS', label: 'Stock Withdrawals (Form-WAR-001)', count: withdrawals.length },
                  { id: 'BATCHING', label: 'Outlet Kitting (Form-ING-001)', count: batchOrders.length },
                  { id: 'ADJUSTMENTS', label: 'Adjustments & NCR', count: adjustments.length + quarantineList.length }
                ].map(d => (
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
                  <option value="TODAY">Today Only (Nov 03, 2026)</option>
                  <option value="CUSTOM">Custom Date Window</option>
                </select>
              </div>
            </div>

            {/* Custom Date Range Picker */}
            {timeframe === 'CUSTOM' && (
              <div className="flex items-center gap-3 pt-2 border-t text-xs">
                <span>From Date:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="p-1 border rounded"
                />
                <span>To Date:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="p-1 border rounded"
                />
              </div>
            )}

            {/* Search Input */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by lot number, material code, supplier, driver, slip number, or recipe..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border rounded-lg text-xs"
              />
            </div>
          </div>

          {/* Ledger Table */}
          <div className="bg-white rounded-xl border border-[#E2D1B8] shadow-sm overflow-hidden">
            <div className="p-3 bg-[#FAF6EE] border-b border-[#E2D1B8] flex justify-between items-center text-xs">
              <span className="font-bold text-[#3D1C52]">
                Displaying {filteredLedger.length} filtered audit records
              </span>
              <span className="text-gray-500">Live Bodega Audit Trail</span>
            </div>

            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#3D1C52] text-white sticky top-0 z-10">
                  <tr>
                    <th className="p-2.5">Record ID / Slip #</th>
                    <th className="p-2.5">Date / Time</th>
                    <th className="p-2.5">Primary Entity / Entity</th>
                    <th className="p-2.5">Key Description &amp; Materials</th>
                    <th className="p-2.5">Authorized Signoff</th>
                    <th className="p-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredLedger.map((row, i) => {
                    const id = row.reportNo || row.slipNo || row.orderId || row.id || `REC-${i}`;
                    const date = row.date || row.requestDate || row.timestamp;
                    const entity = row.supplier || row.requestingEntity || row.outletName || row.reason;
                    const desc = row.items 
                      ? row.items.map(it => `${it.name} (${it.qtyIssuedSec || it.secondaryQty || ''} ${it.secondaryUom || ''})`).join(', ')
                      : (row.recipeName || row.type || row.action);
                    const signoff = row.receiver || row.issuedBy || row.batchedBy || row.author || row.actor;
                    const status = row.overallStatus || row.status || 'LOGGED';

                    return (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="p-2.5 font-mono font-bold text-[#5B2E7A]">{id}</td>
                        <td className="p-2.5 text-gray-600 whitespace-nowrap">{date}</td>
                        <td className="p-2.5 font-medium text-gray-900">{entity}</td>
                        <td className="p-2.5 text-gray-700 max-w-xs truncate" title={desc}>{desc}</td>
                        <td className="p-2.5 text-gray-600">{signoff}</td>
                        <td className="p-2.5 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-[#1E7A3E]">
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

      {/* SUB-TAB 3: CSV DATA BRIDGE & INVENTORY IMPORT */}
      {activeSubTab === 'csv_bridge' && (
        <div className="space-y-6">
          {/* Quick Export Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-xl border border-[#E2D1B8] shadow-sm flex flex-col justify-between space-y-3">
              <div>
                <p className="font-bold text-sm text-[#3D1C52]">Master Inventory CSV</p>
                <p className="text-[11px] text-gray-500 mt-1">69 authentic raw material SKUs with lots, thresholds, and conversion factors.</p>
              </div>
              <button
                onClick={handleExportInventoryCsv}
                className="bg-[#3D1C52] hover:bg-[#240e32] text-white text-xs font-bold py-2 px-3 rounded flex items-center justify-center gap-1.5 transition"
              >
                <Download size={13} /> Export Master CSV
              </button>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#E2D1B8] shadow-sm flex flex-col justify-between space-y-3">
              <div>
                <p className="font-bold text-sm text-[#1E7A3E]">Receiving Log (`Form-REC-001`)</p>
                <p className="text-[11px] text-gray-500 mt-1">Complete inbound delivery records, QA gates, temperatures, and supplier invoices.</p>
              </div>
              <button
                onClick={handleExportReceivingCsv}
                className="bg-[#1E7A3E] hover:bg-[#165c2f] text-white text-xs font-bold py-2 px-3 rounded flex items-center justify-center gap-1.5 transition"
              >
                <Download size={13} /> Export Receiving CSV
              </button>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#E2D1B8] shadow-sm flex flex-col justify-between space-y-3">
              <div>
                <p className="font-bold text-sm text-[#5B2E7A]">Withdrawals Log (`Form-WAR-001`)</p>
                <p className="text-[11px] text-gray-500 mt-1">Stock-out records for Biscocho, Otap, and outlet dough mix releases.</p>
              </div>
              <button
                onClick={handleExportWithdrawalsCsv}
                className="bg-[#5B2E7A] hover:bg-[#3D1C52] text-white text-xs font-bold py-2 px-3 rounded flex items-center justify-center gap-1.5 transition"
              >
                <Download size={13} /> Export Issuance CSV
              </button>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#E2D1B8] shadow-sm flex flex-col justify-between space-y-3">
              <div>
                <p className="font-bold text-sm text-[#C8963E]">Batching Log (`Form-ING-001`)</p>
                <p className="text-[11px] text-gray-500 mt-1">Outlet kitting records, actual scaled kg by Romeo, and release handoff timestamps.</p>
              </div>
              <button
                onClick={handleExportBatchOrdersCsv}
                className="bg-[#C8963E] hover:bg-[#b08030] text-[#240e32] text-xs font-bold py-2 px-3 rounded flex items-center justify-center gap-1.5 transition"
              >
                <Download size={13} /> Export Batching CSV
              </button>
            </div>
          </div>

          {/* CSV Import Interface */}
          <div className="bg-white p-5 rounded-xl border border-[#E2D1B8] shadow-sm space-y-4">
            <div className="border-b pb-2 flex justify-between items-center flex-wrap gap-2">
              <div>
                <h3 className="font-serif font-bold text-base text-[#3D1C52] flex items-center gap-2">
                  <Upload size={16} /> Live CSV Inventory Stock Balance Import
                </h3>
                <p className="text-xs text-gray-500">
                  Update stock levels directly by uploading or pasting a CSV file with updated physical counts
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={onOpenImportModal}
                  className="bg-[#C8963E] hover:bg-[#b08030] text-[#240e32] text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1.5 transition"
                >
                  <FileSpreadsheet size={14} /> Launch Full CSV Baseline Import Wizard
                </button>
                <span className="text-[11px] font-mono text-[#5B2E7A] bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                  Format: ItemCode, CurrentBalanceSec
                </span>
              </div>
            </div>

            {importStatus && (
              <div className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                importStatus.type === 'success' ? 'bg-green-100 text-[#1E7A3E]' : 'bg-red-100 text-red-800'
              }`}>
                {importStatus.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                <span>{importStatus.message}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Paste CSV Contents or Type Stock Count Updates:
              </label>
              <textarea
                rows={6}
                value={csvInputText}
                onChange={(e) => setCsvInputText(e.target.value)}
                placeholder="ItemCode, CurrentBalanceSec&#10;RM-FLR-001, 1500&#10;RM-FLR-002, 12000&#10;RM-SWT-001, 450"
                className="w-full p-3 border rounded-lg font-mono text-xs text-gray-800 bg-gray-50"
              />
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-[11px] text-gray-500">
                Tip: Copy from Excel or Google Sheets and paste here directly.
              </span>
              <button
                type="button"
                onClick={handleProcessCsvImport}
                className="bg-[#1E7A3E] hover:bg-[#165c2f] text-white text-xs font-bold px-6 py-2.5 rounded-lg shadow flex items-center gap-1.5 transition"
              >
                <CheckCircle2 size={14} /> Commit CSV Balance Updates to Perpetual Inventory
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
              <div><strong>Date:</strong> {selectedPoPreview.generatedDate}</div>
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
                      {it.totalSecondaryQty.toLocaleString()} {it.secondaryUom}
                    </td>
                    <td className="p-2 text-right font-mono">
                      ₱{it.unitCost?.toLocaleString()}
                    </td>
                    <td className="p-2 text-right font-mono font-bold">
                      ₱{it.estimatedCost?.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
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
