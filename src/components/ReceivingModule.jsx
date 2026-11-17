// ============================================================================
// FILE: src/components/ReceivingModule.jsx
// ============================================================================
import React, { useState } from 'react';
import {
  Plus, Trash2, CheckCircle2, ShieldCheck,
  Printer, Truck, FileText, Thermometer, Link2, AlertCircle, AlertTriangle
} from 'lucide-react';

export default function ReceivingModule({
  inventory,
  onSaveReceiving,
  receivingReports,
  currentRole,
  isMobileMode,
  prefilledItem,
  purchaseOrders = [],
  onUpdatePoStatus
}) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [reportNo, setReportNo] = useState(`RR-${todayStr.replace(/-/g, '')}-${String(receivingReports.length + 1).padStart(3, '0')}`);
  const [poNo, setPoNo] = useState('');
  const [drNo, setDrNo] = useState('');
  const [supplier, setSupplier] = useState('P.L. Sebastian Corporation');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [deliveryVehicle, setDeliveryVehicle] = useState('');
  const [shipmentNotes, setShipmentNotes] = useState('');
  const [selectedReportView, setSelectedReportView] = useState(null);

  // Cross-reference with Purchase Orders (Form-PUR-002)
  const [selectedPoId, setSelectedPoId] = useState('');

  const defaultMat = inventory[0] || {
    code: 'RM-FLR-001', name: 'All Purpose Flour',
    primaryUom: 'Sack', conversionFactor: 25, secondaryUom: 'kg',
    unitCost: 1050, room: 'Dry Room 1'
  };

  const buildInitialRow = (m) => ({
    materialCode: m.code, name: m.name,
    orderedPrimaryQty: null,
    primaryQty: 0, primaryUom: m.primaryUom,
    conversionFactor: m.conversionFactor || 1,
    secondaryQty: 0, secondaryUom: m.secondaryUom,
    unitPrice: m.unitCost || 0, totalAmount: 0,
    lotNumber: `LOT-${m.code.replace(/[^A-Z0-9]/gi, '')}-${todayStr.slice(2).replace(/-/g, '')}`,
    expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    storageRoom: m.room || 'Dry Room 1',
    binLocation: '', qtyDamaged: 0, chilledTemp: '',
    butterCellophaneSticker: true, eggRinsePassed: true, coaPassed: true
  });

  const [receivingItems, setReceivingItems] = useState([
    buildInitialRow(prefilledItem || defaultMat)
  ]);

  const pendingPos = purchaseOrders.filter((po) => po.status === 'PENDING_DELIVERY');

  const handleSelectPo = (targetPoNo) => {
    setSelectedPoId(targetPoNo);
    if (!targetPoNo) return;
    const po = purchaseOrders.find((p) => p.poNo === targetPoNo);
    if (!po) return;

    setPoNo(po.poNo);
    if (po.supplier) setSupplier(po.supplier);

    if (Array.isArray(po.items) && po.items.length > 0) {
      const mapped = po.items.map((it) => {
        const mat = inventory.find((m) => m.code === (it.code || it.materialCode)) || {};
        const primary = Number(it.suggestedPrimaryQty || it.primaryQty || 1);
        const factor = Number(mat.conversionFactor || it.conversionFactor || 1);
        const unitP = Number(it.unitCost || mat.unitCost || 1000);
        return {
          materialCode: it.code || it.materialCode || mat.code || 'RM-NEW',
          name: it.name || mat.name || 'Raw Material',
          orderedPrimaryQty: primary,
          primaryQty: primary,
          primaryUom: it.primaryUom || mat.primaryUom || 'Unit',
          conversionFactor: factor,
          secondaryQty: +(primary * factor).toFixed(3),
          secondaryUom: it.secondaryUom || mat.secondaryUom || 'kg',
          unitPrice: unitP,
          totalAmount: +(primary * unitP).toFixed(2),
          lotNumber: `LOT-${(it.code || mat.code || 'RM').replace(/[^A-Z0-9]/gi, '')}-${todayStr.slice(2).replace(/-/g, '')}`,
          expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          storageRoom: mat.room || 'Dry Room 1',
          binLocation: '',
          qtyDamaged: 0,
          chilledTemp: '',
          butterCellophaneSticker: true,
          eggRinsePassed: true,
          coaPassed: true
        };
      });
      setReceivingItems(mapped);
    }
  };

  const handleItemSkuChange = (index, code) => {
    const mat = inventory.find((m) => m.code === code);
    if (!mat) return;
    setReceivingItems((prev) => prev.map((item, i) => {
      if (i !== index) return item;
      const primary = item.primaryQty || 1;
      return {
        ...item,
        materialCode: mat.code, name: mat.name,
        primaryUom: mat.primaryUom, conversionFactor: mat.conversionFactor,
        secondaryQty: +(primary * mat.conversionFactor).toFixed(3),
        secondaryUom: mat.secondaryUom,
        unitPrice: mat.unitCost || 1000,
        totalAmount: +(primary * (mat.unitCost || 1000)).toFixed(2),
        storageRoom: mat.room,
        lotNumber: `LOT-${mat.code.replace(/[^A-Z0-9]/gi, '')}-${todayStr.slice(2).replace(/-/g, '')}`
      };
    }));
  };

  const handleQtyChange = (index, primaryQty) => {
    const qty = parseFloat(primaryQty) || 0;
    setReceivingItems((prev) => prev.map((item, i) => {
      if (i !== index) return item;
      return {
        ...item,
        primaryQty: qty,
        secondaryQty: +(qty * item.conversionFactor).toFixed(3),
        totalAmount: +(qty * item.unitPrice).toFixed(2)
      };
    }));
  };

  const handleAddRow = () => {
    const m = inventory[0] || defaultMat;
    const row = buildInitialRow(m);
    row.primaryQty = 10;
    row.secondaryQty = +(10 * (m.conversionFactor || 1)).toFixed(3);
    row.totalAmount = +(10 * (m.unitCost || 1000)).toFixed(2);
    setReceivingItems((prev) => [...prev, row]);
  };

  const handleRemoveRow = (index) => {
    if (receivingItems.length <= 1) return;
    setReceivingItems((prev) => prev.filter((_, i) => i !== index));
  };

  const grandTotal = receivingItems.reduce((s, it) => s + (it.totalAmount || 0), 0);
  const totalDamaged = receivingItems.reduce((s, it) => s + (parseFloat(it.qtyDamaged) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!poNo.trim()) {
      alert('Please provide the Purchase Order (PO) or Delivery Receipt (DR) number.');
      return;
    }

    const newReport = {
      reportNo, poNo, drNo: drNo || poNo, supplier,
      invoiceNo: invoiceNo || `CI-${Date.now().toString().slice(-5)}`,
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      receiver: currentRole, deliveryVehicle,
      items: receivingItems,
      overallStatus: totalDamaged > 0 ? `PARTIALLY DAMAGED (${totalDamaged} units damaged)` : 'ACCEPTED CLEAN',
      totalPaid: grandTotal,
      qcSignoff: `${currentRole} (Warehouse Supervisor)`,
      notes: shipmentNotes
    };

    // 1. Cross-reference comparison against selected Purchase Order
    if (selectedPoId && onUpdatePoStatus) {
      const origPo = purchaseOrders.find((p) => p.poNo === selectedPoId);
      let hasChanges = false;
      const changeLogs = [];

      if (origPo && Array.isArray(origPo.items)) {
        origPo.items.forEach((origIt) => {
          const origCode = origIt.code || origIt.materialCode;
          const origQty = Number(origIt.suggestedPrimaryQty || origIt.primaryQty || 0);
          const rec = receivingItems.find((r) => r.materialCode === origCode);
          if (!rec) {
            hasChanges = true;
            changeLogs.push(`${origIt.name || origCode}: Ordered ${origQty}, but 0 received (omitted)`);
          } else if (Number(rec.primaryQty) !== origQty) {
            hasChanges = true;
            const diff = Number(rec.primaryQty) - origQty;
            changeLogs.push(`${origIt.name || origCode}: Ordered ${origQty}, received ${rec.primaryQty} (${diff >= 0 ? '+' : ''}${diff})`);
          }
        });

        receivingItems.forEach((rec) => {
          const inOrig = origPo.items.some((origIt) => (origIt.code || origIt.materialCode) === rec.materialCode);
          if (!inOrig) {
            hasChanges = true;
            changeLogs.push(`Added unexpected item ${rec.name || rec.materialCode} (${rec.primaryQty} ${rec.primaryUom})`);
          }
        });
      }

      const finalStatus = hasChanges ? 'RECEIVED_WITH_CHANGES' : 'RECEIVED';
      const varianceNotes = hasChanges ? changeLogs.join('; ') : '100% matched PO specifications.';

      onUpdatePoStatus(selectedPoId, finalStatus, {
        receivingReportNo: reportNo,
        receivedDate: newReport.date,
        receivedBy: currentRole,
        notes: varianceNotes
      });
    }

    // 2. Save to WMS
    onSaveReceiving(newReport);

    // 3. Sync to ARAP (Z-Books)
    try {
      const token = localStorage.getItem('jjb_wms_token');
      const res = await fetch('/api/receiving-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          receiving_id: newReport.reportNo,
          supplier_name: newReport.supplier,
          total_amount: newReport.totalPaid,
          invoice_date: newReport.date,
          due_date: newReport.date,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`✅ Receiving saved. AP Invoice ${data.ap_invoice_number} created in ARAP.`);
      }
    } catch (err) {
      console.error('ARAP receiving sync failed:', err);
    }

    // Reset for next shipment
    setReportNo(`RR-${todayStr.replace(/-/g, '')}-${String(receivingReports.length + 2).padStart(3, '0')}`);
    setPoNo(''); setDrNo(''); setInvoiceNo('');
    setShipmentNotes('');
    setSelectedPoId('');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold bg-[#1E7A3E] text-white px-2 py-0.5 rounded">Form-REC-001</span>
            <h2 className="font-serif text-2xl font-bold text-[#3D1C52]">Inbound Receiving &amp; Quality Inspection Dock</h2>
          </div>
          <p className="text-xs text-gray-600 mt-0.5">
            Cross-Reference Form-PUR-002 POs · Mandatory 30-min logging SLA · 0°C Butter Cellophane Gate · Egg Sanitization Rinse Protocol
          </p>
        </div>
        <div className="bg-[#FAF6EE] border border-[#C8963E]/40 px-3 py-1.5 rounded-lg text-right text-xs">
          <p className="font-bold text-[#5B2E7A]">Warehouse Custodian: Jade Q. Dela Cruz</p>
          <p className="text-gray-500 text-[11px]">Cross-ref Delivery Receipts &amp; Invoices against Purchase Orders</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-5 rounded-xl border border-[#E2D1B8] shadow-sm space-y-5">
        <div className="border-b border-gray-200 pb-3 flex justify-between items-center flex-wrap gap-2">
          <h3 className="font-serif font-bold text-[#5B2E7A] flex items-center gap-2 text-base">
            <Truck size={18} /> Delivery Shipment Ingest Details
          </h3>
          <span className="text-xs text-[#1E7A3E] font-bold bg-green-50 px-2.5 py-1 rounded border border-green-200">
            Active Receiving Window (&lt; 30m)
          </span>
        </div>

        {/* PO Cross-Reference Bar */}
        <div className="bg-[#FAF6EE] p-3.5 rounded-xl border border-[#C8963E]/40 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Link2 size={16} className="text-[#C8963E]" />
              <label className="text-xs font-bold text-[#240e32]">Cross-Reference Pending Purchase Order (`Form-PUR-002`):</label>
            </div>
            <span className="text-[11px] font-bold text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full">
              {pendingPos.length} Pending PO{pendingPos.length !== 1 ? 's' : ''} Awaiting Dock Ingest
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedPoId}
              onChange={(e) => handleSelectPo(e.target.value)}
              className="flex-1 p-2 text-xs border rounded bg-white font-medium"
            >
              <option value="">-- Manual Ingest / No Pre-Linked PO --</option>
              {pendingPos.map((po) => (
                <option key={po.poNo} value={po.poNo}>
                  {po.poNo} · {po.supplier} ({po.items?.length || 0} SKUs — ₱{(po.totalCost || 0).toLocaleString()})
                </option>
              ))}
            </select>
            {selectedPoId && (
              <button
                type="button"
                onClick={() => { setSelectedPoId(''); setPoNo(''); }}
                className="text-xs px-2.5 py-1.5 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold"
              >
                Clear Link
              </button>
            )}
          </div>

          {selectedPoId && (
            <div className="text-[11px] text-[#1E7A3E] bg-green-50 border border-green-200 p-2 rounded flex items-center gap-2 font-medium">
              <CheckCircle2 size={14} />
              <span>
                Linked to <strong>{selectedPoId}</strong>. Quantities below are pre-loaded from Mariejohn's PO. You can modify actual received quantities, note damages, or add/remove items as delivered.
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block font-bold text-gray-700 mb-1">Receiving Report No.</label>
            <input type="text" value={reportNo} readOnly className="w-full p-2 border rounded bg-gray-50 font-mono font-bold text-[#5B2E7A]" />
          </div>
          <div>
            <label className="block font-bold text-gray-700 mb-1">PO / DR Number <span className="text-red-500">*</span></label>
            <input
              type="text"
              placeholder="e.g. PO-2026-1045"
              value={poNo}
              onChange={(e) => setPoNo(e.target.value)}
              required
              className="w-full p-2 border rounded font-mono focus:ring-2 focus:ring-[#C8963E] focus:outline-none font-bold"
            />
          </div>
          <div>
            <label className="block font-bold text-gray-700 mb-1">Supplier Name</label>
            <input
              type="text"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder="Supplier / Vendor name"
              className="w-full p-2 border rounded bg-white font-medium focus:ring-2 focus:ring-[#C8963E]"
            />
          </div>
          <div>
            <label className="block font-bold text-gray-700 mb-1">Charge Invoice / Delivery Receipt #</label>
            <input
              type="text"
              placeholder="e.g. CI-29401 / DR-88492"
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
              className="w-full p-2 border rounded font-mono"
            />
          </div>
        </div>

        {/* Dynamic Items Table */}
        <div className="border border-gray-200 rounded-lg overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#5B2E7A] text-white">
              <tr>
                <th className="p-2.5">Material SKU &amp; Name</th>
                <th className="p-2.5 text-right">Delivered Bulk Qty</th>
                <th className="p-2.5">Primary UoM</th>
                <th className="p-2.5 text-right">Net Secondary Qty</th>
                <th className="p-2.5 text-right">Unit Cost</th>
                <th className="p-2.5 text-right">Line Total</th>
                <th className="p-2.5">Assigned Lot Number</th>
                <th className="p-2.5">Expiry Date</th>
                <th className="p-2.5">Storage Location</th>
                <th className="p-2.5 text-center">Damaged Units</th>
                <th className="p-2.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {receivingItems.map((item, idx) => {
                const isPoLinked = item.orderedPrimaryQty != null;
                const hasVariance = isPoLinked && Number(item.primaryQty) !== Number(item.orderedPrimaryQty);
                return (
                  <tr key={idx} className={hasVariance ? 'bg-amber-50/60 hover:bg-amber-50' : 'hover:bg-gray-50'}>
                    <td className="p-2">
                      <select
                        value={item.materialCode}
                        onChange={(e) => handleItemSkuChange(idx, e.target.value)}
                        className="p-1 border rounded text-xs w-48 font-mono font-bold bg-white"
                      >
                        {inventory.map((m) => (
                          <option key={m.code} value={m.code}>{m.code} · {m.name}</option>
                        ))}
                      </select>
                      {isPoLinked && (
                        <div className="text-[10px] text-gray-500 mt-0.5 font-mono">
                          Ordered on PO: <strong>{item.orderedPrimaryQty} {item.primaryUom}</strong>
                          {hasVariance && (
                            <span className="ml-1 text-amber-700 font-bold">
                              (Variance: {Number(item.primaryQty) - Number(item.orderedPrimaryQty) >= 0 ? '+' : ''}{Number(item.primaryQty) - Number(item.orderedPrimaryQty)})
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="p-2 text-right">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={item.primaryQty}
                        onChange={(e) => handleQtyChange(idx, e.target.value)}
                        className="w-16 p-1 border rounded text-right font-mono font-bold text-xs"
                      />
                    </td>
                    <td className="p-2 font-mono text-gray-600">{item.primaryUom}</td>
                    <td className="p-2 text-right font-mono font-bold text-[#1E7A3E]">
                      {item.secondaryQty?.toLocaleString()} {item.secondaryUom}
                    </td>
                    <td className="p-2 text-right font-mono">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={item.unitPrice}
                        onChange={(e) => {
                          const p = parseFloat(e.target.value) || 0;
                          setReceivingItems((prev) => prev.map((r, i) => i === idx ? { ...r, unitPrice: p, totalAmount: +(p * r.primaryQty).toFixed(2) } : r));
                        }}
                        className="w-20 p-1 border rounded text-right font-mono text-xs"
                      />
                    </td>
                    <td className="p-2 text-right font-mono font-bold text-gray-900">
                      ₱{(item.totalAmount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={item.lotNumber}
                        onChange={(e) => {
                          const val = e.target.value;
                          setReceivingItems((prev) => prev.map((r, i) => i === idx ? { ...r, lotNumber: val } : r));
                        }}
                        className="p-1 border rounded text-[11px] font-mono w-28"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="date"
                        value={item.expiryDate}
                        onChange={(e) => {
                          const val = e.target.value;
                          setReceivingItems((prev) => prev.map((r, i) => i === idx ? { ...r, expiryDate: val } : r));
                        }}
                        className="p-1 border rounded text-[11px] w-28"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        placeholder="Bin / Bay"
                        value={item.binLocation}
                        onChange={(e) => {
                          const val = e.target.value;
                          setReceivingItems((prev) => prev.map((r, i) => i === idx ? { ...r, binLocation: val } : r));
                        }}
                        className="p-1 border rounded text-[11px] w-20"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <input
                        type="number"
                        min="0"
                        value={item.qtyDamaged}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setReceivingItems((prev) => prev.map((r, i) => i === idx ? { ...r, qtyDamaged: val } : r));
                        }}
                        className="w-12 p-1 border rounded text-center text-xs font-mono font-bold text-red-600 bg-red-50"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(idx)}
                        disabled={receivingItems.length <= 1}
                        className="text-red-500 hover:text-red-700 disabled:opacity-30"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-[#FAF6EE] font-bold">
              <tr>
                <td colSpan={5} className="p-2.5 text-right text-gray-700">Inbound Shipment Valuation:</td>
                <td className="p-2.5 text-right font-mono text-sm text-[#1E7A3E]">
                  ₱{grandTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </td>
                <td colSpan={5} className="p-2.5 text-right text-red-600 font-mono">
                  {totalDamaged > 0 ? `⚠️ ${totalDamaged} units flagged damaged` : '✓ 100% Quality Pass'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex justify-between items-center flex-wrap gap-2">
          <button
            type="button"
            onClick={handleAddRow}
            className="text-xs bg-[#FAF6EE] hover:bg-[#E2D1B8] text-[#5B2E7A] font-bold py-2 px-3.5 rounded border border-[#C8963E]/40 flex items-center gap-1.5 shadow-sm transition"
          >
            <Plus size={14} /> Add Another Material Line
          </button>
        </div>

        {/* Transport & QA Checks */}
        <div className="bg-[#FAF6EE] p-4 rounded-xl border border-[#E2D1B8] space-y-3">
          <h4 className="font-serif font-bold text-[#3D1C52] text-xs uppercase tracking-wide flex items-center gap-1.5">
            <ShieldCheck size={16} className="text-[#1E7A3E]" /> Transport Vehicle &amp; Cold-Chain QA Inspection
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Delivery Truck Plate / Vehicle</label>
              <input
                type="text"
                placeholder="e.g. ABC-1234 (Reefer Van)"
                value={deliveryVehicle}
                onChange={(e) => setDeliveryVehicle(e.target.value)}
                className="w-full p-2 border rounded bg-white"
              />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input type="checkbox" id="butterCellophane" defaultChecked className="rounded text-[#1E7A3E]" />
              <label htmlFor="butterCellophane" className="text-gray-700 font-semibold">
                Butter Cellophane Seal Intact (&lt; 0°C)
              </label>
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input type="checkbox" id="eggRinse" defaultChecked className="rounded text-[#1E7A3E]" />
              <label htmlFor="eggRinse" className="text-gray-700 font-semibold">
                Egg Sanitization Rinse Passed
              </label>
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input type="checkbox" id="coaVerified" defaultChecked className="rounded text-[#1E7A3E]" />
              <label htmlFor="coaVerified" className="text-gray-700 font-semibold">
                CoA &amp; Food-Grade Verified
              </label>
            </div>
          </div>
        </div>

        {/* Shipment Notes */}
        <div>
          <label className="block font-bold text-gray-700 text-xs mb-1">
            Receiving &amp; Quarantine Observations / Variance Remarks
          </label>
          <textarea
            value={shipmentNotes}
            onChange={(e) => setShipmentNotes(e.target.value)}
            rows={2}
            placeholder="Record any deviations from PO, temperature spikes, damaged cartons, or delivery delays..."
            className="w-full p-2.5 border rounded-lg text-xs"
          />
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="bg-[#1E7A3E] hover:bg-emerald-800 text-white font-extrabold text-sm px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg transition"
          >
            <CheckCircle2 size={18} />
            {selectedPoId ? `Cross-Ref & Receive Against ${selectedPoId}` : 'Log Inbound Shipment to Warehouse'}
          </button>
        </div>
      </form>

      {/* Historical Inbound Receiving Reports Table */}
      <div className="bg-white rounded-xl border border-[#E2D1B8] shadow-sm overflow-hidden">
        <div className="p-4 bg-[#FAF6EE] border-b border-[#E2D1B8] flex justify-between items-center">
          <h3 className="font-serif font-bold text-[#3D1C52] text-sm">
            Archived Inbound Receiving Reports ({receivingReports.length})
          </h3>
          <span className="text-xs text-gray-500 font-mono font-semibold">Indangan Central Plant</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#5B2E7A] text-white">
              <tr>
                <th className="p-2.5">Report #</th>
                <th className="p-2.5">Date &amp; Time</th>
                <th className="p-2.5">Supplier</th>
                <th className="p-2.5">PO / DR #</th>
                <th className="p-2.5">Invoice #</th>
                <th className="p-2.5 text-right">Items Received</th>
                <th className="p-2.5 text-right">Total Amount</th>
                <th className="p-2.5">Status</th>
                <th className="p-2.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {receivingReports.map((r, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="p-2.5 font-mono font-bold text-[#5B2E7A]">{r.reportNo}</td>
                  <td className="p-2.5 font-mono text-gray-600">{r.date} {r.time}</td>
                  <td className="p-2.5 font-medium">{r.supplier}</td>
                  <td className="p-2.5 font-mono font-bold text-gray-700">{r.poNo}</td>
                  <td className="p-2.5 font-mono text-gray-500">{r.invoiceNo}</td>
                  <td className="p-2.5 text-right font-mono font-bold">{r.items?.length || 0} SKUs</td>
                  <td className="p-2.5 text-right font-mono font-bold text-[#1E7A3E]">
                    ₱{(r.totalPaid || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-2.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      String(r.overallStatus).includes('DAMAGED') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {r.overallStatus || 'ACCEPTED CLEAN'}
                    </span>
                  </td>
                  <td className="p-2.5 text-center">
                    <button
                      type="button"
                      onClick={() => setSelectedReportView(r)}
                      className="text-xs text-[#5B2E7A] hover:underline font-bold"
                    >
                      View Report
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PRINTABLE RECEIVING REPORT MODAL */}
      {selectedReportView && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border-2 border-[#C8963E] space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b-2 border-[#5B2E7A] pb-3">
              <div>
                <p className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">JANG-JANG BAKESHOP &amp; KINGDOM CONFECTIONARY</p>
                <h3 className="font-serif font-bold text-xl text-[#3D1C52]">Inbound Receiving Report (Form-REC-001)</h3>
                <p className="text-xs text-[#C8963E] font-mono font-bold">Report ID: {selectedReportView.reportNo}</p>
              </div>
              <button onClick={() => setSelectedReportView(null)} className="text-gray-400 hover:text-gray-600 font-bold text-lg">✕</button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs bg-[#FAF6EE] p-3 rounded border border-[#E2D1B8]">
              <div><strong>Supplier:</strong> {selectedReportView.supplier}</div>
              <div><strong>PO / DR #:</strong> {selectedReportView.poNo}</div>
              <div><strong>Invoice #:</strong> {selectedReportView.invoiceNo}</div>
              <div><strong>Date &amp; Time:</strong> {selectedReportView.date} {selectedReportView.time}</div>
              <div><strong>Transport:</strong> {selectedReportView.deliveryVehicle || 'N/A'}</div>
              <div><strong>Inspector:</strong> {selectedReportView.receiver}</div>
            </div>

            <table className="w-full text-left text-xs border">
              <thead className="bg-[#5B2E7A] text-white">
                <tr>
                  <th className="p-2">Material Code</th>
                  <th className="p-2">Description</th>
                  <th className="p-2 text-right">Delivered Bulk</th>
                  <th className="p-2 text-right">Net Qty</th>
                  <th className="p-2">Lot Number</th>
                  <th className="p-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {selectedReportView.items?.map((it, idx) => (
                  <tr key={idx}>
                    <td className="p-2 font-mono font-bold text-[#5B2E7A]">{it.materialCode}</td>
                    <td className="p-2">{it.name}</td>
                    <td className="p-2 text-right font-mono">{it.primaryQty} {it.primaryUom}</td>
                    <td className="p-2 text-right font-mono font-bold text-[#1E7A3E]">{it.secondaryQty} {it.secondaryUom}</td>
                    <td className="p-2 font-mono text-[11px]">{it.lotNumber}</td>
                    <td className="p-2 text-right font-mono font-bold">₱{(it.totalAmount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-100 font-bold">
                <tr>
                  <td colSpan={5} className="p-2 text-right">Total Shipment Paid:</td>
                  <td className="p-2 text-right font-mono text-sm text-[#1E7A3E]">
                    ₱{(selectedReportView.totalPaid || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>

            {selectedReportView.notes && (
              <div className="bg-gray-50 border p-2.5 rounded text-xs space-y-1">
                <p className="font-bold text-gray-700">Receiving Notes &amp; Observations:</p>
                <p className="text-gray-700 whitespace-pre-line">{selectedReportView.notes}</p>
              </div>
            )}

            <div className="pt-2 flex justify-between items-center text-xs border-t">
              <div>
                <p className="text-[10px] uppercase font-bold text-gray-500">Authorized Receiver Signoff:</p>
                <p className="font-bold text-[#5B2E7A]">{selectedReportView.qcSignoff}</p>
              </div>
              <button onClick={() => window.print()} className="bg-[#3D1C52] text-white text-xs font-bold px-4 py-2 rounded flex items-center gap-1.5 shadow">
                <Printer size={13} /> Print Hard-Copy Slip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}