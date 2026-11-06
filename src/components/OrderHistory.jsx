import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, Search, Filter, RefreshCw, CheckCircle2, Clock, 
  Truck, AlertCircle, FileText, Printer, ArrowUpRight, 
  DollarSign, Package, Calendar, ChevronRight, User, MapPin
} from 'lucide-react';
import { mockOrderService } from '../services/mockOrderService';

export default function OrderHistory({ currentRole }) {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedChannel, setSelectedChannel] = useState('ALL');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  // Fetch orders from mock service
  const loadOrders = async () => {
    setLoading(true);
    try {
      const [orderList, summaryStats] = await Promise.all([
        mockOrderService.fetchOrderHistory({
          search: searchTerm,
          status: selectedStatus,
          channel: selectedChannel
        }),
        mockOrderService.getOrderStats()
      ]);
      setOrders(orderList);
      setStats(summaryStats);
    } catch (err) {
      console.error("Failed to fetch order history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [selectedStatus, selectedChannel]);

  // Handle search with debounce/trigger
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadOrders();
  };

  // Status update through mock service
  const handleStatusChange = async (orderId, newStatus) => {
    setUpdatingId(orderId);
    try {
      await mockOrderService.updateOrderStatus(orderId, newStatus);
      await loadOrders();
      if (selectedOrder && selectedOrder.orderId === orderId) {
        setSelectedOrder(prev => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      console.error("Status update error:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  // Status Badge Helper
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'Delivered':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-[#1E7A3E] border border-green-200 flex items-center gap-1">
            <CheckCircle2 size={12} /> Delivered
          </span>
        );
      case 'Batched / Kitted':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-[#5B2E7A] border border-purple-200 flex items-center gap-1">
            <Package size={12} /> Batched / Kitted
          </span>
        );
      case 'Pending Release':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-[#D68910] border border-amber-200 flex items-center gap-1">
            <Clock size={12} /> Pending Release
          </span>
        );
      case 'In Production':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
            <RefreshCw size={12} className="animate-spin" /> In Production
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-800 border border-gray-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Module Title & Action Header */}
      <div className="bg-white p-4 md:p-6 rounded-2xl border border-[#E2D1B8] shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider bg-[#5B2E7A]/10 text-[#5B2E7A] px-2.5 py-0.5 rounded border border-[#5B2E7A]/20">
              Form-ORD-002 · Sales &amp; Dispatch Archive
            </span>
            <span className="text-xs text-gray-500">Live Mock Service</span>
          </div>
          <h2 className="text-xl md:text-2xl font-serif font-bold text-[#3D1C52] mt-1">
            Outlet &amp; Wholesale Order History
          </h2>
          <p className="text-xs md:text-sm text-gray-600">
            Complete transaction ledger of past finished product requisitions, wholesale delivery dispatches, and real-time total order costing.
          </p>
        </div>

        <button
          onClick={loadOrders}
          disabled={loading}
          className="bg-[#5B2E7A] hover:bg-[#3D1C52] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-2 transition disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span>Refresh Orders</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-[#E2D1B8] shadow-sm border-l-4 border-l-[#C8963E] flex items-center justify-between">
            <div>
              <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Total Sales / Cost Volume</p>
              <h3 className="text-xl md:text-2xl font-bold font-serif text-[#C8963E] mt-0.5">
                ₱{stats.totalCost.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-[11px] text-gray-500 mt-1">Sum of all past logged orders</p>
            </div>
            <div className="bg-[#C8963E]/10 p-3 rounded-lg text-[#C8963E]">
              <DollarSign size={24} />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-[#E2D1B8] shadow-sm border-l-4 border-l-[#5B2E7A] flex items-center justify-between">
            <div>
              <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Total Orders Logged</p>
              <h3 className="text-xl md:text-2xl font-bold font-serif text-[#3D1C52] mt-0.5">
                {stats.totalOrders} Orders
              </h3>
              <p className="text-[11px] text-gray-500 mt-1">Outlets &amp; Wholesale combined</p>
            </div>
            <div className="bg-[#5B2E7A]/10 p-3 rounded-lg text-[#5B2E7A]">
              <ShoppingBag size={24} />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-[#E2D1B8] shadow-sm border-l-4 border-l-[#1E7A3E] flex items-center justify-between">
            <div>
              <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Delivered &amp; Fulfilled</p>
              <h3 className="text-xl md:text-2xl font-bold font-serif text-[#1E7A3E] mt-0.5">
                {stats.deliveredCount} Orders
              </h3>
              <p className="text-[11px] text-gray-500 mt-1">Sign-off received by drivers</p>
            </div>
            <div className="bg-[#1E7A3E]/10 p-3 rounded-lg text-[#1E7A3E]">
              <CheckCircle2 size={24} />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-[#E2D1B8] shadow-sm border-l-4 border-l-[#D68910] flex items-center justify-between">
            <div>
              <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Active In-Pipeline</p>
              <h3 className="text-xl md:text-2xl font-bold font-serif text-[#D68910] mt-0.5">
                {stats.inProgressCount} Orders
              </h3>
              <p className="text-[11px] text-gray-500 mt-1">Kitted or awaiting dispatch</p>
            </div>
            <div className="bg-[#D68910]/10 p-3 rounded-lg text-[#D68910]">
              <Truck size={24} />
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#E2D1B8] shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search size={16} className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search order ID (e.g. ORD-2026-1104), outlet/customer, product..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-20 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C8963E]"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1.5 px-3 py-1 bg-[#5B2E7A] text-white text-xs font-bold rounded hover:bg-[#3D1C52]"
          >
            Search
          </button>
        </form>

        <div className="flex gap-2 flex-wrap items-center">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <Filter size={14} className="text-gray-400" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs p-2 border border-gray-300 rounded-lg bg-white font-medium focus:outline-none focus:ring-2 focus:ring-[#C8963E]"
            >
              <option value="ALL">All Order Statuses</option>
              <option value="Delivered">Delivered</option>
              <option value="Batched / Kitted">Batched / Kitted</option>
              <option value="Pending Release">Pending Release</option>
              <option value="In Production">In Production</option>
            </select>
          </div>

          {/* Channel Filter */}
          <select
            value={selectedChannel}
            onChange={(e) => setSelectedChannel(e.target.value)}
            className="text-xs p-2 border border-gray-300 rounded-lg bg-white font-medium focus:outline-none focus:ring-2 focus:ring-[#C8963E]"
          >
            <option value="ALL">All Sales Channels</option>
            <option value="Retail Outlet Requisition">Retail Outlet Requisitions</option>
            <option value="Wholesale Commercial / Institutional">Wholesale / Institutional</option>
          </select>

          {(searchTerm || selectedStatus !== 'ALL' || selectedChannel !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedStatus('ALL');
                setSelectedChannel('ALL');
              }}
              className="text-xs text-gray-500 hover:text-gray-800 underline px-2"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Orders List / Table */}
      <div className="bg-white rounded-xl border border-[#E2D1B8] shadow-sm overflow-hidden">
        <div className="px-6 py-3.5 bg-[#FAF6EE] border-b border-[#E2D1B8] flex justify-between items-center flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h3 className="font-serif font-bold text-[#3D1C52]">
              Historical Orders Register
            </h3>
            <span className="text-xs bg-[#5B2E7A]/10 text-[#5B2E7A] px-2.5 py-0.5 rounded-full font-bold">
              {orders.length} orders retrieved
            </span>
          </div>
          <p className="text-[11px] text-gray-500">
            Powered by Mock Order Data Service with simulated latency
          </p>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <RefreshCw size={28} className="animate-spin text-[#C8963E] mx-auto mb-3" />
            <p className="font-semibold text-sm">Querying order archive from mock data service...</p>
            <p className="text-xs text-gray-400 mt-1">Retrieving line items, pricing, and fulfillment state</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <ShoppingBag size={32} className="text-gray-300 mx-auto mb-2" />
            <p className="font-semibold text-sm">No past orders match your search filters.</p>
            <p className="text-xs text-gray-400 mt-1">Try resetting the status or channel dropdowns above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#5B2E7A] text-white">
                <tr>
                  <th className="p-3">Order ID</th>
                  <th className="p-3">Order &amp; Target Date</th>
                  <th className="p-3">Customer / Outlet</th>
                  <th className="p-3">Channel</th>
                  <th className="p-3">Itemized Products</th>
                  <th className="p-3 text-right">Total Cost (PHP)</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2D1B8]">
                {orders.map((order) => {
                  const itemCount = order.items.reduce((sum, it) => sum + it.qty, 0);

                  return (
                    <tr key={order.orderId} className="hover:bg-[#FAF6EE]/50 transition-colors">
                      <td className="p-3 font-mono font-bold text-[#5B2E7A]">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="hover:underline text-left"
                        >
                          {order.orderId}
                        </button>
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-gray-900">{order.orderDate}</div>
                        <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                          <Truck size={11} /> Delivery: {order.deliveryDate}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-gray-900">{order.customerOrOutlet}</div>
                        <div className="text-[11px] text-gray-500">{order.contactPerson}</div>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-700">
                          {order.channel}
                        </span>
                      </td>
                      <td className="p-3 max-w-xs">
                        <div className="space-y-1">
                          {order.items.slice(0, 2).map((it, idx) => (
                            <div key={idx} className="text-[11px] text-gray-700 truncate">
                              <span className="font-bold text-[#5B2E7A]">{it.qty} {it.unit}</span> · {it.name}
                            </div>
                          ))}
                          {order.items.length > 2 && (
                            <div className="text-[10px] text-[#C8963E] font-semibold">
                              + {order.items.length - 2} more items ({itemCount} total units)
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-sm text-[#3D1C52]">
                        ₱{order.totalCost.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-center">
                        <div className="inline-flex justify-center">
                          {renderStatusBadge(order.status)}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="px-2.5 py-1 bg-[#FAF6EE] text-[#5B2E7A] border border-[#E2D1B8] hover:border-[#5B2E7A] rounded text-[11px] font-bold shadow-sm transition flex items-center gap-1"
                            title="Inspect itemized sales order & invoice"
                          >
                            <FileText size={12} /> View Slip
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Full Itemized Order & Cost Breakdown (Form-ORD-002) */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-[#C8963E]/40 space-y-4 my-8">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-gray-200 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-[#5B2E7A] text-white px-2 py-0.5 rounded font-mono">
                    Form-ORD-002
                  </span>
                  <span className="text-xs font-mono font-bold text-[#5B2E7A]">{selectedOrder.orderId}</span>
                </div>
                <h3 className="text-lg md:text-xl font-serif font-bold text-gray-900 mt-1">
                  Outlet Sales Order &amp; Requisition Slip
                </h3>
                <p className="text-xs text-gray-500">
                  Jang-Jang Bakeshop &amp; Kingdom Confectionary · Indangan Plant
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-400 hover:text-gray-600 font-bold text-xl px-2 py-1"
              >
                ✕
              </button>
            </div>

            {/* Customer & Delivery Metadata Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-[#FAF6EE] p-4 rounded-xl border border-[#E2D1B8] text-xs">
              <div className="space-y-1.5">
                <div>
                  <span className="text-gray-500 text-[10px] uppercase font-bold block">Customer / Destination Outlet:</span>
                  <span className="font-bold text-gray-900 text-sm">{selectedOrder.customerOrOutlet}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] uppercase font-bold block">Contact Person &amp; Phone:</span>
                  <span className="text-gray-800">{selectedOrder.contactPerson} ({selectedOrder.contactNumber})</span>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] uppercase font-bold block">Sales Channel:</span>
                  <span className="text-gray-800 font-medium">{selectedOrder.channel}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div>
                  <span className="text-gray-500 text-[10px] uppercase font-bold block">Order Date &amp; Time:</span>
                  <span className="font-mono text-gray-800">{selectedOrder.orderDate}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] uppercase font-bold block">Scheduled Delivery Time:</span>
                  <span className="font-mono text-gray-800">{selectedOrder.deliveryDate}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] uppercase font-bold block">Assigned Delivery Driver:</span>
                  <span className="text-gray-800 font-semibold">{selectedOrder.deliveryDriver}</span>
                </div>
              </div>
            </div>

            {/* Status & Quick Status Update Row */}
            <div className="flex flex-wrap justify-between items-center gap-2 p-3 bg-white rounded-lg border border-gray-200 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-gray-500 font-bold uppercase text-[10px]">Current Status:</span>
                {renderStatusBadge(selectedOrder.status)}
              </div>

              {/* Status Updater for Authorized Roles */}
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500 text-[10px] font-bold">Update State:</span>
                <select
                  value={selectedOrder.status}
                  disabled={updatingId === selectedOrder.orderId}
                  onChange={(e) => handleStatusChange(selectedOrder.orderId, e.target.value)}
                  className="p-1 border border-gray-300 rounded text-xs font-semibold bg-white cursor-pointer"
                >
                  <option value="In Production">In Production</option>
                  <option value="Batched / Kitted">Batched / Kitted</option>
                  <option value="Pending Release">Pending Release</option>
                  <option value="Delivered">Delivered</option>
                </select>
                {updatingId === selectedOrder.orderId && (
                  <RefreshCw size={12} className="animate-spin text-[#C8963E]" />
                )}
              </div>
            </div>

            {/* Itemized Products & Total Costing Breakdown */}
            <div>
              <h4 className="text-xs font-bold uppercase text-gray-700 mb-2 flex items-center gap-1">
                <Package size={14} className="text-[#C8963E]" /> Itemized Products &amp; Price Breakdown:
              </h4>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
                    <tr>
                      <th className="p-2.5">SKU</th>
                      <th className="p-2.5">Description</th>
                      <th className="p-2.5 text-right">Quantity</th>
                      <th className="p-2.5 text-right">Unit Price</th>
                      <th className="p-2.5 text-right">Line Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedOrder.items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="p-2.5 font-mono font-bold text-[#5B2E7A]">{it.sku}</td>
                        <td className="p-2.5 text-gray-800 font-medium">{it.name}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-gray-900">
                          {it.qty} {it.unit}
                        </td>
                        <td className="p-2.5 text-right font-mono text-gray-600">
                          ₱{it.unitPrice.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-gray-900">
                          ₱{it.subtotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-[#FAF6EE] font-bold text-xs border-t border-gray-200">
                    <tr>
                      <td colSpan="4" className="p-2.5 text-right text-gray-600">Logistics &amp; Delivery Handling:</td>
                      <td className="p-2.5 text-right font-mono text-gray-800">
                        ₱{selectedOrder.logisticsFee.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr className="border-t border-[#E2D1B8]">
                      <td colSpan="4" className="p-3 text-right text-[#3D1C52] text-sm font-bold uppercase">
                        Total Order Cost:
                      </td>
                      <td className="p-3 text-right font-mono text-base font-bold text-[#3D1C52]">
                        ₱{selectedOrder.totalCost.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Payment & Instructions Footer */}
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs flex justify-between items-center">
              <div>
                <span className="font-bold text-gray-700">Payment Terms: </span>
                <span className="text-gray-600">{selectedOrder.paymentTerms} ({selectedOrder.paymentStatus})</span>
              </div>
              <div className="text-right">
                <span className="font-bold text-gray-700">Notes: </span>
                <span className="text-gray-600 italic">{selectedOrder.notes || 'None'}</span>
              </div>
            </div>

            {/* Custodial Sign-Off Block */}
            <div className="grid grid-cols-3 gap-3 pt-2 text-[10px] text-gray-500 text-center border-t border-dashed">
              <div className="border-t pt-1">
                <p className="font-bold text-gray-700">{selectedOrder.contactPerson}</p>
                <p>Requisitioning Authority</p>
              </div>
              <div className="border-t pt-1">
                <p className="font-bold text-gray-700">Jade Q. Dela Cruz</p>
                <p>Warehouse Supervisor (Dispatched)</p>
              </div>
              <div className="border-t pt-1">
                <p className="font-bold text-gray-700">{selectedOrder.deliveryDriver}</p>
                <p>Logistics Carrier Receipt</p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() => window.print()}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition"
              >
                <Printer size={14} /> Print Slip
              </button>
              <button
                onClick={() => setSelectedOrder(null)}
                className="bg-[#3D1C52] hover:bg-[#240e32] text-white text-xs font-bold px-5 py-2 rounded-xl transition"
              >
                Close Slip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
