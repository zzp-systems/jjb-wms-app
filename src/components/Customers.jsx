import React, { useState, useEffect } from 'react';
import { Users, Package, Truck, RefreshCw, User } from 'lucide-react';

export default function Customers() {
  const [outlets, setOutlets] = useState([]);
  const [selectedOutlet, setSelectedOutlet] = useState(null);
  const [history, setHistory] = useState({ orders: [], deliveries: [] });
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => { fetchOutlets(); }, []);

  const fetchOutlets = async () => {
    try {
      const res = await fetch('/api/outlets');
      const data = await res.json();
      if (data.outlets) setOutlets(data.outlets);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async (id) => {
    setHistoryLoading(true);
    setSelectedOutlet(id);
    try {
      const res = await fetch(`/api/outlets?id=${id}`);
      const data = await res.json();
      if (data.outlet) {
        setHistory({ orders: data.orders || [], deliveries: data.deliveries || [] });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-sm text-gray-500">
        <RefreshCw size={20} className="mx-auto mb-2 animate-spin text-[#C8963E]" />
        Loading customer directory…
      </div>
    );
  }

  return (
    <div className="flex gap-4 items-start">
      {/* Customer List */}
      <div className="flex-1 bg-white rounded-2xl border border-[#E2D1B8] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#E2D1B8] bg-[#FAF6EE]">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-[#C8963E]" />
            <h2 className="text-sm font-extrabold text-[#240e32]">Customer Directory</h2>
          </div>
          <p className="text-[11px] text-gray-500 mt-0.5">Synced from CRM Master Data · {outlets.length} customers</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#240e32] text-[#E5C585]">
              <tr>
                <th className="px-3 py-2.5 font-bold">Customer Name</th>
                <th className="px-3 py-2.5 font-bold">Contact</th>
                <th className="px-3 py-2.5 font-bold">Address</th>
                <th className="px-3 py-2.5 font-bold">CRM Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {outlets.map((outlet) => (
                <tr
                  key={outlet.id}
                  onClick={() => loadHistory(outlet.id)}
                  className={`cursor-pointer hover:bg-[#FAF6EE] transition ${
                    selectedOutlet === outlet.id ? 'bg-amber-50' : ''
                  }`}
                >
                  <td className="px-3 py-2 font-bold text-[#240e32]">{outlet.name}</td>
                  <td className="px-3 py-2 text-gray-600">{outlet.contact_person || '—'}</td>
                  <td className="px-3 py-2 text-gray-500 text-[11px]">{outlet.address || '—'}</td>
                  <td className="px-3 py-2">
                    {outlet.crm_account_id ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900">
                        ✓ Synced
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                        Local Only
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {outlets.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-gray-400 italic">
                    No customers synced yet. Create one in the CRM to see it here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Activity Panel */}
      {selectedOutlet && (
        <div className="w-96 shrink-0 space-y-3">
          <div className="bg-white rounded-2xl border border-[#E2D1B8] shadow-sm p-4">
            <h3 className="text-xs font-extrabold text-[#240e32] flex items-center gap-1.5 mb-2">
              <Package size={14} className="text-[#C8963E]" /> Recent Orders
              <span className="ml-auto text-[10px] font-mono text-gray-500">
                {history.orders.length} total
              </span>
            </h3>
            {historyLoading ? (
              <p className="text-xs text-gray-400 italic">Loading…</p>
            ) : history.orders.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-3">No orders yet.</p>
            ) : (
              <ul className="space-y-2 max-h-80 overflow-y-auto">
                {history.orders.map((o) => (
                  <li key={o.order_id} className="pb-2 border-b border-gray-100 last:border-0">
                    <div className="flex justify-between items-center text-xs">
                      <strong className="text-[#240e32] font-mono">{o.order_id}</strong>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-900">
                        {o.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      ₱{((o.total_cost_centavos || 0) / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 })} •{' '}
                      {new Date(o.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-[#E2D1B8] shadow-sm p-4">
            <h3 className="text-xs font-extrabold text-[#240e32] flex items-center gap-1.5 mb-2">
              <Truck size={14} className="text-[#C8963E]" /> Delivery Shipments
              <span className="ml-auto text-[10px] font-mono text-gray-500">
                {history.deliveries.length} total
              </span>
            </h3>
            {historyLoading ? (
              <p className="text-xs text-gray-400 italic">Loading…</p>
            ) : history.deliveries.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-3">No deliveries yet.</p>
            ) : (
              <ul className="space-y-2 max-h-80 overflow-y-auto">
                {history.deliveries.map((d) => (
                  <li key={d.shipment_id} className="pb-2 border-b border-gray-100 last:border-0">
                    <div className="flex justify-between items-center text-xs">
                      <strong className="text-[#240e32] font-mono">{d.shipment_id}</strong>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900">
                        {d.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {d.delivery_date} • {d.vehicle_plate || 'No plate recorded'}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}