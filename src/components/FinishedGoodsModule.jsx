import React, { useState, useEffect } from 'react';
import { Package, Truck, CheckCircle2, Clock, Plus, ShieldCheck, Download } from 'lucide-react';

export default function FinishedGoodsModule({ recipes = [], postSyncEvent }) {
  const [activeTab, setActiveTab] = useState('inventory');
  
  // Data state
  const [lots, setLots] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [showLotForm, setShowLotForm] = useState(false);
  const [lotForm, setLotForm] = useState({ product_sku: '', lot_number: '', production_date: new Date().toISOString().slice(0,10), expiry_date: '', qty_pieces: '', qty_boxes: '', storage_location: 'Indangan-ColdRoom' });

  const [showShipForm, setShowShipForm] = useState(false);
  const [shipForm, setShipForm] = useState({ shipment_id: '', delivery_date: new Date().toISOString().slice(0,10), vehicle_plate: '', driver_name: '', origin_warehouse: 'Indangan', destination_type: 'CLIENT', recipient_name: '', notes: '' });
  const [selectedLots, setSelectedLots] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [lotsRes, shipRes] = await Promise.all([
        fetch('/api/finished-goods').then(r => r.json()),
        fetch('/api/deliveries').then(r => r.json())
      ]);
      setLots(lotsRes.lots || []);
      setShipments(shipRes.shipments || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleCreateLot = (e) => {
    e.preventDefault();
    postSyncEvent('FG_LOT_CREATED', `FG_${Date.now()}`, {
      ...lotForm,
      qty_pieces: Number(lotForm.qty_pieces),
      qty_boxes: Number(lotForm.qty_boxes || 0)
    });
    setShowLotForm(false);
    setLotForm({ ...lotForm, lot_number: '', qty_pieces: '', qty_boxes: '' });
    setTimeout(fetchData, 1000); // Refresh after sync
  };

  const handleApproveLot = (lot) => {
    postSyncEvent('FG_LOT_QA_APPROVED', `QA_${lot.id}_${Date.now()}`, {
      lot_number: lot.lot_number,
      qa_status: 'APPROVED',
      qa_approved_by: 'QA Director'
    });
    setTimeout(fetchData, 1000);
  };

  const handleCreateShipment = (e) => {
    e.preventDefault();
    const items = selectedLots.map(l => ({ fg_lot_id: l.id, qty_loaded: l.qty_pieces }));
    postSyncEvent('DELIVERY_SHIPMENT_CREATED', `SHIP_${Date.now()}`, {
      ...shipForm,
      items
    });
    setShowShipForm(false);
    setSelectedLots([]);
    setTimeout(fetchData, 1000);
  };

  const toggleLotSelection = (lot) => {
    if (selectedLots.find(l => l.id === lot.id)) {
      setSelectedLots(selectedLots.filter(l => l.id !== lot.id));
    } else {
      setSelectedLots([...selectedLots, lot]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="page-header flex-between">
        <div>
          <h1 className="text-2xl font-bold text-[#3D1C52] flex items-center gap-2">
            <Package className="text-[#C8963E]" /> Finished Goods & Delivery
          </h1>
          <p className="text-gray-500">Manage QA-approved production lots and dispatch shipments.</p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-gray-200 pb-2">
        <button onClick={() => setActiveTab('inventory')} className={`px-4 py-2 font-bold text-sm rounded-lg ${activeTab === 'inventory' ? 'bg-[#3D1C52] text-white' : 'text-gray-600 hover:bg-gray-100'}`}>Inventory (Lots)</button>
        <button onClick={() => setActiveTab('dispatch')} className={`px-4 py-2 font-bold text-sm rounded-lg ${activeTab === 'dispatch' ? 'bg-[#3D1C52] text-white' : 'text-gray-600 hover:bg-gray-100'}`}>Dispatch Planner</button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-500">Loading data...</div>
      ) : (
        <>
          {activeTab === 'inventory' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button onClick={() => setShowLotForm(!showLotForm)} className="bg-[#1E7A3E] text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2">
                  <Plus size={16} /> Log Production Lot
                </button>
              </div>

              {showLotForm && (
                <form onSubmit={handleCreateLot} className="bg-white p-4 rounded-xl border border-[#E2D1B8] shadow-sm grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div><label className="text-xs font-bold text-gray-600">Product SKU</label><select required value={lotForm.product_sku} onChange={e => setLotForm({...lotForm, product_sku: e.target.value})} className="w-full p-2 border rounded">{recipes.map(r => <option key={r.sku} value={r.sku}>{r.name}</option>)}</select></div>
                  <div><label className="text-xs font-bold text-gray-600">Lot Number</label><input required placeholder="FG-2026-001" value={lotForm.lot_number} onChange={e => setLotForm({...lotForm, lot_number: e.target.value})} className="w-full p-2 border rounded" /></div>
                  <div><label className="text-xs font-bold text-gray-600">Expiry Date</label><input type="date" required value={lotForm.expiry_date} onChange={e => setLotForm({...lotForm, expiry_date: e.target.value})} className="w-full p-2 border rounded" /></div>
                  <div><label className="text-xs font-bold text-gray-600">Qty (Pieces)</label><input type="number" required value={lotForm.qty_pieces} onChange={e => setLotForm({...lotForm, qty_pieces: e.target.value})} className="w-full p-2 border rounded" /></div>
                  <div className="col-span-full flex justify-end"><button type="submit" className="bg-[#3D1C52] text-white px-6 py-2 rounded-lg font-bold">Save Lot to Outbox</button></div>
                </form>
              )}

              <div className="bg-white rounded-xl border border-[#E2D1B8] overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#FAF6EE] border-b border-[#E2D1B8] text-gray-600">
                    <tr><th className="p-3">Product</th><th className="p-3">Lot #</th><th className="p-3">Expiry</th><th className="p-3 text-right">Qty</th><th className="p-3 text-center">QA Status</th><th className="p-3 text-center">Action</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {lots.map(lot => (
                      <tr key={lot.id} className="hover:bg-gray-50">
                        <td className="p-3 font-semibold">{lot.product_name} <span className="text-xs text-gray-400 block">{lot.product_sku}</span></td>
                        <td className="p-3 font-mono text-xs">{lot.lot_number}</td>
                        <td className="p-3">{lot.expiry_date}</td>
                        <td className="p-3 text-right font-bold">{lot.qty_pieces} pcs</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${lot.qa_status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{lot.qa_status}</span>
                        </td>
                        <td className="p-3 text-center">
                          {lot.qa_status === 'PENDING' && <button onClick={() => handleApproveLot(lot)} className="text-xs font-bold bg-[#1E7A3E] text-white px-3 py-1 rounded">Approve QA</button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'dispatch' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button onClick={() => setShowShipForm(!showShipForm)} className="bg-[#C8963E] text-[#240e32] px-4 py-2 rounded-lg font-bold flex items-center gap-2">
                  <Truck size={16} /> Plan Shipment
                </button>
              </div>

              {showShipForm && (
                <form onSubmit={handleCreateShipment} className="bg-white p-4 rounded-xl border border-[#E2D1B8] shadow-sm space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div><label className="text-xs font-bold text-gray-600">Shipment ID</label><input required placeholder="SHP-001" value={shipForm.shipment_id} onChange={e => setShipForm({...shipForm, shipment_id: e.target.value})} className="w-full p-2 border rounded" /></div>
                    <div><label className="text-xs font-bold text-gray-600">Date</label><input type="date" required value={shipForm.delivery_date} onChange={e => setShipForm({...shipForm, delivery_date: e.target.value})} className="w-full p-2 border rounded" /></div>
                    <div><label className="text-xs font-bold text-gray-600">Driver</label><input required placeholder="Name" value={shipForm.driver_name} onChange={e => setShipForm({...shipForm, driver_name: e.target.value})} className="w-full p-2 border rounded" /></div>
                    <div><label className="text-xs font-bold text-gray-600">Vehicle Plate</label><input placeholder="ABC-123" value={shipForm.vehicle_plate} onChange={e => setShipForm({...shipForm, vehicle_plate: e.target.value})} className="w-full p-2 border rounded" /></div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <h4 className="font-bold text-sm mb-2">Select Approved Lots to Load</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {lots.filter(l => l.qa_status === 'APPROVED').map(lot => (
                        <label key={lot.id} className="flex items-center gap-2 p-2 border rounded hover:bg-gray-50 cursor-pointer">
                          <input type="checkbox" checked={selectedLots.some(l => l.id === lot.id)} onChange={() => toggleLotSelection(lot)} />
                          <span className="text-sm font-semibold">{lot.product_name} ({lot.lot_number}) - {lot.qty_pieces} pcs</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end"><button type="submit" disabled={selectedLots.length === 0} className="bg-[#3D1C52] text-white px-6 py-2 rounded-lg font-bold disabled:opacity-50">Create Shipment</button></div>
                </form>
              )}

              <div className="space-y-4">
                {shipments.map(ship => (
                  <div key={ship.shipment_id} className="bg-white rounded-xl border border-[#E2D1B8] p-4 shadow-sm">
                    <div className="flex justify-between items-center border-b pb-2 mb-3">
                      <div>
                        <h3 className="font-bold text-lg text-[#3D1C52]">{ship.shipment_id}</h3>
                        <p className="text-xs text-gray-500">{ship.delivery_date} • {ship.driver_name} ({ship.vehicle_plate})</p>
                      </div>
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold">{ship.status}</span>
                    </div>
                    <table className="w-full text-xs text-left">
                      <thead className="text-gray-500"><tr><th>Product</th><th>Lot #</th><th className="text-right">Qty Loaded</th></tr></thead>
                      <tbody className="divide-y divide-gray-100">
                        {ship.items.map((item, idx) => (
                          <tr key={idx}><td>{item.product_name}</td><td>{item.lot_number}</td><td className="text-right">{item.qty_loaded} pcs</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}