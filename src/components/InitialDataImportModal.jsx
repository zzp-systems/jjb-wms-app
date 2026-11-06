import React, { useState, useRef } from 'react';
import { 
  Upload, Download, FileSpreadsheet, CheckCircle2, AlertTriangle, 
  Trash2, RefreshCw, X, Eye, FileText, Check, ShieldAlert, Sparkles, Layers
} from 'lucide-react';
import { 
  generateInventoryTemplateCsv, 
  parseInventoryCsv, 
  applyInventoryImport 
} from '../utils/csvImporter';

export default function InitialDataImportModal({
  isOpen,
  onClose,
  masterMaterials,
  currentInventory,
  onApplyImport,
  onZeroOutAll,
  actorName = "Jade Q. Dela Cruz"
}) {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'paste' | 'preview'
  const [dragActive, setDragActive] = useState(false);
  const [csvRawText, setCsvRawText] = useState('');
  const [fileName, setFileName] = useState('');
  const [parseResult, setParseResult] = useState(null);
  const [importMode, setImportMode] = useState('FRESH_BASELINE'); // 'FRESH_BASELINE' | 'UPDATE_ONLY'
  const [clearHistory, setClearHistory] = useState(true);
  const [showConfirmZero, setShowConfirmZero] = useState(false);

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  // Handle Template Download
  const handleDownloadTemplate = () => {
    const csvData = generateInventoryTemplateCsv(masterMaterials);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `JJB_Opening_Inventory_Template_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Process CSV Text
  const processCsv = (text, name = 'uploaded_inventory.csv') => {
    setFileName(name);
    setCsvRawText(text);
    const result = parseInventoryCsv(text, masterMaterials);
    setParseResult(result);
    if (result.success && result.parsedItems.length > 0) {
      setActiveTab('preview');
    }
  };

  // File Upload Handler
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        processCsv(content, file.name);
      }
    };
    reader.readAsText(file);
  };

  // Drag and Drop Handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result;
        if (typeof content === 'string') {
          processCsv(content, file.name);
        }
      };
      reader.readAsText(file);
    }
  };

  // Execute Import
  const handleConfirmImport = () => {
    if (!parseResult || !parseResult.parsedItems || parseResult.parsedItems.length === 0) return;

    const updated = applyInventoryImport(currentInventory, parseResult.parsedItems, importMode);
    onApplyImport({
      newInventory: updated,
      mode: importMode,
      clearHistory,
      summary: {
        totalItems: parseResult.parsedItems.length,
        totalValuation: parseResult.totalValuation,
        totalWeightKg: parseResult.totalQuantityKg,
        actor: actorName
      }
    });
    onClose();
  };

  // Execute Zero Out All
  const handleExecuteZeroOut = () => {
    onZeroOutAll({
      actor: actorName,
      clearHistory: true
    });
    setShowConfirmZero(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-[#E2D1B8] overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="bg-[#3D1C52] text-white px-6 py-4 flex items-center justify-between border-b border-[#C8963E]/40 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C8963E]/20 border border-[#C8963E]/60 flex items-center justify-center text-[#E5C585]">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif font-bold text-lg text-white">Opening Inventory Baseline Import</h2>
                <span className="bg-[#C8963E] text-[#240e32] text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                  Fresh Start
                </span>
              </div>
              <p className="text-xs text-[#E5C585]">
                Upload physical warehouse counts by unit to establish official starting stock (SOP-WAR-002)
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Action Tabs & Sub-bar */}
        <div className="bg-[#FAF6EE] px-6 py-2.5 border-b border-[#E2D1B8] flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'upload'
                  ? 'bg-[#3D1C52] text-white shadow-sm'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-[#E2D1B8]'
              }`}
            >
              <Upload size={13} /> Upload CSV File
            </button>
            <button
              onClick={() => setActiveTab('paste')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'paste'
                  ? 'bg-[#3D1C52] text-white shadow-sm'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-[#E2D1B8]'
              }`}
            >
              <FileText size={13} /> Paste CSV Text
            </button>
            {parseResult && parseResult.success && (
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'preview'
                    ? 'bg-[#C8963E] text-[#240e32] shadow-sm'
                    : 'bg-white text-[#3D1C52] hover:bg-gray-100 border border-[#C8963E]/40'
                }`}
              >
                <Eye size={13} /> Preview Matched Data ({parseResult.matchedCount})
              </button>
            )}
          </div>

          {/* Download Template Button */}
          <button
            onClick={handleDownloadTemplate}
            className="text-xs bg-white hover:bg-gray-50 text-[#3D1C52] border border-[#C8963E] px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition shadow-sm ml-auto"
            title="Download CSV containing all 69 standard materials pre-populated"
          >
            <Download size={13} className="text-[#C8963E]" />
            <span>Download CSV Template (69 SKUs)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* TAB 1: FILE UPLOAD & DRAG DROP */}
          {activeTab === 'upload' && (
            <div className="space-y-6">
              <div 
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition ${
                  dragActive 
                    ? 'border-[#C8963E] bg-[#C8963E]/10 scale-[1.01]' 
                    : 'border-gray-300 hover:border-[#3D1C52] bg-gray-50/50 hover:bg-white'
                }`}
              >
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept=".csv,text/csv,text/plain" 
                  onChange={handleFileChange} 
                  className="hidden" 
                />
                <div className="w-14 h-14 mx-auto rounded-full bg-[#FAF6EE] border border-[#E2D1B8] flex items-center justify-center text-[#C8963E] mb-3">
                  <Upload size={26} />
                </div>
                <h3 className="font-bold text-gray-800 text-sm">
                  Click to browse or drag &amp; drop your inventory CSV here
                </h3>
                <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                  Accepts standard CSV with columns: Material Code, Description, Count Primary Units, Lot Number, Expiration Date, Storage Location.
                </p>
                <span className="inline-block mt-3 text-[11px] font-semibold text-[#5B2E7A] bg-[#5B2E7A]/10 px-3 py-1 rounded-full">
                  Supports Excel &amp; Google Sheets exported CSVs
                </span>
              </div>

              {/* Step-by-Step Instructions Card */}
              <div className="bg-[#FAF6EE] p-4 rounded-xl border border-[#E2D1B8] space-y-3">
                <h4 className="text-xs font-bold text-[#3D1C52] uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={14} className="text-[#C8963E]" /> How to prepare your physical count:
                </h4>
                <ol className="text-xs text-gray-700 space-y-2 list-decimal list-inside leading-relaxed">
                  <li>
                    Click <strong className="text-[#3D1C52]">"Download CSV Template"</strong> above to get the master list of all 69 warehouse materials.
                  </li>
                  <li>
                    Open the file in Microsoft Excel, Apple Numbers, or Google Sheets.
                  </li>
                  <li>
                    Enter the counted physical packages in the <strong className="text-[#3D1C52]">"Count Primary Units"</strong> column (e.g. 50 Sacks, 12 Tins, 20 Boxes).
                  </li>
                  <li>
                    Save as CSV and drop the file above to verify and apply your opening balances.
                  </li>
                </ol>
              </div>

              {/* Zero-Out Fast Action Card */}
              <div className="border border-red-200 bg-red-50/50 p-4 rounded-xl flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-red-900 flex items-center gap-1.5">
                    <Trash2 size={14} className="text-red-600" /> Start with Zero Inventory Immediately
                  </h4>
                  <p className="text-xs text-red-700 mt-0.5">
                    Clear all default mock stock and lots now so all balances start at 0.00 until you enter receiving deliveries.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowConfirmZero(true)}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg shadow-sm whitespace-nowrap transition"
                >
                  Zero Out All Stock
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: PASTE CSV DIRECTLY */}
          {activeTab === 'paste' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Paste Raw CSV / Spreadsheet Rows:
                </label>
                <textarea
                  value={csvRawText}
                  onChange={(e) => setCsvRawText(e.target.value)}
                  placeholder="Material Code,Description,Count Primary Units,Lot Number,Expiration Date&#10;RM-FLR-001,Continental All Purpose Flour,50,LOT-CNT-01,2027-05-01&#10;RM-SWT-001,Crystal Brown Sugar,20,LOT-SWT-01,2027-06-01"
                  rows={10}
                  className="w-full p-3 font-mono text-xs border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C8963E]"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => processCsv(csvRawText, 'pasted_data.csv')}
                  disabled={!csvRawText.trim()}
                  className="bg-[#3D1C52] hover:bg-[#2b133b] disabled:opacity-50 text-white font-bold text-xs px-4 py-2 rounded-lg shadow transition"
                >
                  Parse &amp; Validate Pasted Rows
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: PREVIEW & VERIFY DATA */}
          {activeTab === 'preview' && parseResult && (
            <div className="space-y-6">
              {/* Parse Summary Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[#FAF6EE] p-3 rounded-xl border border-[#E2D1B8]">
                  <p className="text-[10px] text-gray-500 font-bold uppercase">Matched Materials</p>
                  <p className="text-lg font-bold text-[#3D1C52]">
                    {parseResult.matchedCount} <span className="text-xs font-normal text-gray-500">/ {masterMaterials.length}</span>
                  </p>
                </div>
                <div className="bg-[#FAF6EE] p-3 rounded-xl border border-[#E2D1B8]">
                  <p className="text-[10px] text-gray-500 font-bold uppercase">Total Primary Packages</p>
                  <p className="text-lg font-bold text-[#3D1C52]">
                    {parseResult.parsedItems.reduce((s, i) => s + i.primaryQty, 0).toLocaleString()}
                  </p>
                </div>
                <div className="bg-[#FAF6EE] p-3 rounded-xl border border-[#E2D1B8]">
                  <p className="text-[10px] text-gray-500 font-bold uppercase">Total Weight / Units</p>
                  <p className="text-lg font-bold text-[#1E7A3E]">
                    {parseResult.totalQuantityKg.toLocaleString('en-US', { maximumFractionDigits: 1 })} kg
                  </p>
                </div>
                <div className="bg-[#FAF6EE] p-3 rounded-xl border border-[#E2D1B8]">
                  <p className="text-[10px] text-gray-500 font-bold uppercase">Estimated Stock Value</p>
                  <p className="text-lg font-bold text-[#C8963E]">
                    ₱{parseResult.totalValuation.toLocaleString('en-PH', { maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Warnings / Errors Banner if any */}
              {parseResult.warnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-yellow-800">
                    <AlertTriangle size={14} />
                    <span>{parseResult.warnings.length} SKU Warnings Detected:</span>
                  </div>
                  <ul className="text-[11px] text-yellow-700 list-disc list-inside space-y-0.5 max-h-24 overflow-y-auto">
                    {parseResult.warnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Import Mode Selection */}
              <div className="bg-white p-4 rounded-xl border border-[#E2D1B8] space-y-3">
                <h4 className="text-xs font-bold text-[#3D1C52] uppercase tracking-wider">
                  Select Baseline Application Mode:
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label 
                    onClick={() => setImportMode('FRESH_BASELINE')}
                    className={`p-3 rounded-xl border cursor-pointer flex items-start gap-3 transition ${
                      importMode === 'FRESH_BASELINE'
                        ? 'border-[#3D1C52] bg-[#FAF6EE] ring-1 ring-[#3D1C52]'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="importMode" 
                      checked={importMode === 'FRESH_BASELINE'} 
                      onChange={() => setImportMode('FRESH_BASELINE')}
                      className="mt-1"
                    />
                    <div>
                      <p className="text-xs font-bold text-[#3D1C52]">Clean Slate Baseline (Recommended)</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Overwrites existing stock with exact CSV physical counts. Items with 0 in the CSV will start at zero balance.
                      </p>
                    </div>
                  </label>

                  <label 
                    onClick={() => setImportMode('UPDATE_ONLY')}
                    className={`p-3 rounded-xl border cursor-pointer flex items-start gap-3 transition ${
                      importMode === 'UPDATE_ONLY'
                        ? 'border-[#3D1C52] bg-[#FAF6EE] ring-1 ring-[#3D1C52]'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="importMode" 
                      checked={importMode === 'UPDATE_ONLY'} 
                      onChange={() => setImportMode('UPDATE_ONLY')}
                      className="mt-1"
                    />
                    <div>
                      <p className="text-xs font-bold text-[#3D1C52]">Update Stock Balances Only</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Updates quantities for matching rows and keeps existing transaction records intact.
                      </p>
                    </div>
                  </label>
                </div>

                {importMode === 'FRESH_BASELINE' && (
                  <div className="pt-2 border-t border-gray-100 flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="clearHistoryCheck"
                      checked={clearHistory}
                      onChange={(e) => setClearHistory(e.target.checked)}
                      className="rounded border-gray-300 text-[#3D1C52] focus:ring-[#C8963E]"
                    />
                    <label htmlFor="clearHistoryCheck" className="text-xs text-gray-700 font-medium cursor-pointer">
                      Wipe mock historical demo transactions (clear sample receiving, withdrawals, and batch orders) to start production clean.
                    </label>
                  </div>
                )}
              </div>

              {/* Preview Table */}
              <div className="border border-[#E2D1B8] rounded-xl overflow-hidden">
                <div className="bg-[#3D1C52] text-white px-4 py-2 text-xs font-bold flex justify-between items-center">
                  <span>Parsed Inventory Records ({parseResult.parsedItems.length})</span>
                  <span className="text-[11px] text-[#E5C585]">{fileName}</span>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAF6EE] text-gray-600 border-b border-[#E2D1B8] sticky top-0">
                      <tr>
                        <th className="p-2 font-bold">Code</th>
                        <th className="p-2 font-bold">Material Description</th>
                        <th className="p-2 font-bold">Primary Qty</th>
                        <th className="p-2 font-bold">Secondary Qty</th>
                        <th className="p-2 font-bold">Initial Lot #</th>
                        <th className="p-2 font-bold">Expiry Date</th>
                        <th className="p-2 font-bold">Location</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-mono">
                      {parseResult.parsedItems.map((item, i) => (
                        <tr key={i} className="hover:bg-gray-50 font-sans">
                          <td className="p-2 font-mono font-bold text-[#5B2E7A]">{item.code}</td>
                          <td className="p-2">
                            <span className="font-semibold text-gray-800">{item.name}</span>
                            <span className="text-[10px] text-gray-400 block">{item.category} · {item.room}</span>
                          </td>
                          <td className="p-2 font-semibold">
                            {item.primaryQty} {item.primaryUom}
                          </td>
                          <td className="p-2 font-bold text-[#1E7A3E]">
                            {item.secondaryQty.toLocaleString()} {item.secondaryUom}
                          </td>
                          <td className="p-2 text-gray-600 font-mono text-[11px]">{item.lotNumber}</td>
                          <td className="p-2 text-gray-600">{item.expiryDate}</td>
                          <td className="p-2 text-gray-500 text-[11px]">{item.location}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* CONFIRM ZERO OUT MODAL OVERLAY */}
          {showConfirmZero && (
            <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
              <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border-2 border-red-500 space-y-4">
                <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                  <ShieldAlert size={28} />
                </div>
                <div className="text-center">
                  <h3 className="font-bold text-gray-900 text-base">Reset All Stock to Zero?</h3>
                  <p className="text-xs text-gray-600 mt-1">
                    This will set all 69 warehouse materials to 0.00 quantity and remove all mock demo lots. You can subsequently enter real deliveries via Inbound Receiving or upload your CSV.
                  </p>
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button
                    onClick={() => setShowConfirmZero(false)}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExecuteZeroOut}
                    className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow transition"
                  >
                    Yes, Reset to Zero
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-[#FAF6EE] px-6 py-4 border-t border-[#E2D1B8] flex items-center justify-between gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-[#E2D1B8] transition"
          >
            Cancel
          </button>

          {activeTab === 'preview' && parseResult && parseResult.success && (
            <button
              onClick={handleConfirmImport}
              className="bg-[#1E7A3E] hover:bg-[#165c2f] text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-lg flex items-center gap-2 transition"
            >
              <CheckCircle2 size={16} />
              <span>Apply Opening Baseline ({parseResult.parsedItems.length} Materials)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
