import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingBag, Search, Filter, RefreshCw, CheckCircle2, Clock, 
  Truck, AlertCircle, FileText, Printer, ArrowUpRight, 
  DollarSign, Package, Calendar, ChevronRight, User, MapPin,
  Utensils, Coffee, Layers, Tag, Inbox
} from 'lucide-react';
import { mockOrderService } from '../services/mockOrderService';

export default function OrderHistory({ 
  currentRole,
  batchOrders = [],
  withdrawals = [],
  pendingRequests = [],   // NEW — optional, backward-compatible
  onUpdateOrderStatus
}) {
  const [wholesaleOrders, setWholesaleOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedChannel, setSelectedChannel] = useState('ALL');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const loadWholesaleOrders = async () => {
    setLoading(true);
    try {
      const [orderList, summaryStats] = await Promise.all([
        mockOrderService.fetchOrderHistory({
          search: searchTerm,
          status: selectedStatus === 'ALL' ? 'ALL' : selectedStatus,
          channel: 'ALL'
        }),
        mockOrderService.getOrderStats()
      ]);
      setWholesaleOrders(orderList);
      setStats(summaryStats);
    } catch (err) {
      console.error("Failed to fetch order history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWholesaleOrders();
  }, [selectedStatus]);

  // ----- Recipe batch orders -----
  const formattedBatchOrders = useMemo(() => {
    return (batchOrders || []).map(b => {
      const estimatedCost = (b.requestedQtyPcs || 100) * 4.5;
      return {
        orderId: b.orderId,
        formType: 'Form-ORD-001',
        orderType: 'RECIPE_BATCH',
        orderDate: b.requestDate || new Date().toISOString().slice(0, 10),
        deliveryDate: b.targetDate || 'Same-day Scaling',
        customerOrOutlet: b.outletName || 'Outlet / Production Line',
        contactPerson: b.requestedBy || 'Branch Baker',
        contactNumber: 'Plant Internal Intercom / Dispatch',
        channel: 'Recipe Batched Ingredients (Form-ORD-001)',
        categoryTag: b.outletName?.toLowerCase().includes('mess') ? 'MESS_HALL' : 'BATCHING',
        deliveryDriver: b.status === 'RELEASED' ? (b.releasedTo || 'Othniel Tilan / Roberto Blase') : 'Pending Romeo Malusay Kitting',
        status: b.status === 'BATCHED_KITTED' ? 'Batched / Kitted' :
                b.status === 'RELEASED' ? 'Delivered' : 'In Production',
        rawStatus: b.status,
        items: [
          {
            sku: b.recipeSku || 'RECIPE-MIX',
            name: `${b.recipeName} (${b.batchMultiplier || 1.0}x Scale)`,
            qty: b.requestedQtyPcs || 100,
            unit: 'pcs yield',
            unitPrice: 4.50,
            subtotal: estimatedCost
          }
        ],
        totalCost: estimatedCost,
        logisticsFee: 0,
        paymentTerms: 'Internal Plant Production Allocation',
        paymentStatus: 'Reconciled via Bodega',
        notes: b.notes || `Requisition for ${b.outletName}`,
        sourceData: b
      };
    });
  }, [batchOrders]);

  // ----- Issued withdrawals (already deducted) -----
  const formattedWithdrawals = useMemo(() => {
    return (withdrawals || []).map(w => {
      const isMessHall = (w.requestingEntity || w.requestingLine || '').toLowerCase().includes('mess') ||
                         (w.purpose || '').toLowerCase().includes('meal') ||
                         (w.purpose || '').toLowerCase().includes('snack');

      const itemsList = (w.items || []).map(it => {
        const qty = it.qtyIssuedSec || it.qtyRequestedSec || it.qty || 1;
        const uom = it.secondaryUom || it.uom || 'kg';
        const costPerUnit = it.unitCost || 65;
        return {
          sku: it.materialCode || it.itemCode || 'RM-RAW',
          name: it.name || it.description || 'Raw Material Item',
          qty: qty,
          unit: uom,
          unitPrice: costPerUnit,
          subtotal: (it.estimatedCost) || (qty * costPerUnit)
        };
      });

      const totalCalculated = itemsList.reduce((sum, it) => sum + it.subtotal, 0) || w.totalCost || 1200;

      return {
        orderId: w.slipNo || w.withdrawalNo || `WS-${Date.now().toString().slice(-6)}`,
        formType: 'Form-WAR-001',
        orderType: 'MATERIAL_WITHDRAWAL',
        orderDate: w.date || w.withdrawalDate || new Date().toISOString().slice(0, 10),
        deliveryDate: w.date || w.withdrawalDate || 'Immediate Issuance',
        customerOrOutlet: w.requestingEntity || w.requestingLine || (isMessHall ? 'Indangan Facility Mess Hall' : 'Plant Floor'),
        contactPerson: w.requestedBy || w.requisitionedBy || 'Indangan Facility Staff',
        contactNumber: 'Plant Internal Staff',
        channel: isMessHall
          ? 'Mess Hall Staff Meals & Snacks (Form-WAR-001)'
          : 'Raw Material Withdrawal (Form-WAR-001)',
        categoryTag: isMessHall ? 'MESS_HALL' : 'WITHDRAWAL',
        deliveryDriver: w.receivedBy || w.requisitionedBy || 'Bodega Floor Release',
        status: (w.status === 'ISSUED & RECONCILED' || w.status === 'RELEASED') ? 'Delivered' : 'Pending Release',
        rawStatus: w.status,
        items: itemsList,
        totalCost: totalCalculated,
        logisticsFee: 0,
        paymentTerms: isMessHall ? 'Company Subsidized Staff Meals' : 'Operational Cost Center',
        paymentStatus: 'Approved & Deducted',
        notes: w.purpose || w.notes || 'Warehouse raw material withdrawal',
        sourceChannel: w.sourceChannel || 'MANUAL',
        linkedRequestId: w.linkedRequestId || null,
        sourceData: w
      };
    });
  }, [withdrawals]);

  // ----- NEW: Pending requests (queued, not yet issued, no stock deducted) -----
  const formattedPendingRequests = useMemo(() => {
    return (pendingRequests || [])
      .filter(r => r.status === 'PENDING_ISSUANCE')
      .map(r => {
        const isMessHall = (r.requestingEntity || '').toLowerCase().includes('mess') ||
                           (r.purpose || '').toLowerCase().includes('meal') ||
                           (r.purpose || '').toLowerCase().includes('snack');

        const itemsList = (r.items || []).map(it => {
          const qty = it.qtyRequestedSec || it.qty || 1;
          const uom = it.secondaryUom || 'kg';
          const unitPrice = it.estimatedCost && qty > 0 ? (it.estimatedCost / qty) : 0;
          return {
            sku: it.materialCode || 'RM-RAW',
            name: it.name || 'Raw Material Item',
            qty,
            unit: uom,
            unitPrice,
            subtotal: it.estimatedCost || 0
          };
        });

        return {
          orderId: r.requestId,
          formType: 'Form-WAR-001',
          orderType: 'PENDING_REQUEST',
          orderDate: r.dateRequested || new Date().toISOString().slice(0, 10),
          deliveryDate: r.neededByDate || 'Queued',
          customerOrOutlet: r.requestingEntity || 'Unspecified',
          contactPerson: r.requestedBy || 'Authorized Staff',
          contactNumber: r.enteredBy ? `Entered by: ${r.enteredBy}` : 'Staff Entry',
          channel: r.sourceChannel === 'PORTAL' ? 'Self-Service Portal Requisition' : 'In-App Staff Entry',
          categoryTag: isMessHall ? 'MESS_HALL' : 'WITHDRAWAL',
          deliveryDriver: 'Awaiting Jade Q. Dela Cruz Issuance',
          status: 'Pending Jade Issuance',
          rawStatus: 'PENDING_ISSUANCE',
          items: itemsList,
          totalCost: Number(r.totalEstimatedCost || 0),
          logisticsFee: 0,
          paymentTerms: isMessHall ? 'Company Subsidized Staff Meals' : 'Operational Cost Center',
          paymentStatus: 'Queued — Not Yet Deducted',
          notes: r.notes || r.purpose || 'Pending issuance queue',
          sourceChannel: r.sourceChannel || 'MANUAL',
          sourceData: r
        };
      });
  }, [pendingRequests]);

  // ----- Combine everything -----
  const allUnifiedOrders = useMemo(() => {
    const wholesaleFormatted = (wholesaleOrders || []).map(o => ({
      ...o,
      formType: 'Form-ORD-002',
      orderType: 'WHOLESALE_DISPATCH',
      categoryTag: 'WHOLESALE'
    }));

    return [
      ...formattedPendingRequests,
      ...formattedBatchOrders,
      ...formattedWithdrawals,
      ...wholesaleFormatted
    ];
  }, [formattedPendingRequests, formattedBatchOrders, formattedWithdrawals, wholesaleOrders]);

  const filteredOrders = useMemo(() => {
    return allUnifiedOrders.filter(order => {
      if (selectedChannel === 'RECIPE_BATCHING' && order.orderType !== 'RECIPE_BATCH') return false;
      if (selectedChannel === 'MATERIAL_WITHDRAWALS' && order.orderType !== 'MATERIAL_WITHDRAWAL') return false;
      if (selectedChannel === 'PENDING_REQUESTS' && order.orderType !== 'PENDING_REQUEST') return false;
      if (selectedChannel === 'MESS_HALL' && order.categoryTag !== 'MESS_HALL') return false;
      if (selectedChannel === 'WHOLESALE' && order.orderType !== 'WHOLESALE_DISPATCH') return false;
      if (selectedChannel === 'OUTLETS' && !order.customerOrOutlet.toLowerCase().includes('outlet') && !order.customerOrOutlet.toLowerCase().includes('pan de verde') && !order.customerOrOutlet.toLowerCase().includes('laurice')) return false;
      if (selectedChannel === 'PRODUCTION_LINES' && !order.customerOrOutlet.toLowerCase().includes('hall') && !order.customerOrOutlet.toLowerCase().includes('line')) return false;

      if (selectedStatus !== 'ALL') {
        if (order.status !== selectedStatus) return false;
      }

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesId = order.orderId.toLowerCase().includes(query);
        const matchesTarget = order.customerOrOutlet.toLowerCase().includes(query);
        const matchesPerson = order.contactPerson.toLowerCase().includes(query);
        const matchesItem = order.items.some(it => it.name.toLowerCase().includes(query) || it.sku.toLowerCase().includes(query));
        if (!matchesId && !matchesTarget && !matchesPerson && !matchesItem) return false;
      }

      return true;
    });
  }, [allUnifiedOrders, selectedChannel, selectedStatus, searchTerm]);

  const dynamicStats = useMemo(() => {
    const totalCost = filteredOrders.reduce((sum, o) => sum + (o.totalCost || 0), 0);
    const deliveredCount = filteredOrders.filter(o => o.status === 'Delivered').length;
    const inProgressCount = filteredOrders.filter(o => o.status !== 'Delivered' && o.orderType !== 'PENDING_REQUEST').length;
    const messHallCount = filteredOrders.filter(o => o.categoryTag === 'MESS_HALL').length;
    const pendingCount = filteredOrders.filter(o => o.orderType === 'PENDING_REQUEST').length;

    return {
      totalOrders: filteredOrders.length,
      totalCost,
      deliveredCount,
      inProgressCount,
      messHallCount,
      pendingCount
    };
  }, [filteredOrders]);

  const handleStatusChange = async (orderId, newStatus) => {
    setUpdatingId(orderId);
    try {
      const isWholesale = wholesaleOrders.some(o => o.orderId === orderId);
      if (isWholesale) {
        await mockOrderService.updateOrderStatus(orderId, newStatus);
        await loadWholesaleOrders();
      } else if (onUpdateOrderStatus) {
        const mappedStatus = newStatus === 'Batched / Kitted' ? 'BATCHED_KITTED' :
                             newStatus === 'Delivered' ? 'RELEASED' : 'PENDING_BATCHING';
        onUpdateOrderStatus(orderId, mappedStatus);
      }

      if (selectedOrder && selectedOrder.orderId === orderId) {
        setSelectedOrder(prev => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      console.error("Status update error:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'Delivered':
      case 'ISSUED & RECONCILED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-green-100 text-[#1E7A3E] border border-green-200 flex items-center gap-1">
            <CheckCircle2 size={12} /> Delivered / Issued
          </span>
        );
      case 'Batched / Kitted':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-[#5B2E7A] border border-purple-200 flex items-center gap-1">
            <Package size={12} /> Batched / Kitted
          </span>
        );
      case 'Pending Jade Issuance':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1 animate-pulse">
            <Inbox size={12} /> Pending Jade Issuance
          </span>
        );
      case 'Pending Release':
      case 'PENDING_ISSUANCE':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-[#D68910] border border-amber-200 flex items-center gap-1">
            <Clock size={12} /> Pending Release
          </span>
        );
      case 'In Production':
      case 'PENDING_BATCHING':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
            <RefreshCw size={12} className="animate-spin" /> In Production
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-100 text-gray-800 border border-gray-200">
            {status}
          </span>
        );
    }
  };

  const renderSourceChip = (order) => {
    if (order.orderType === 'PENDING_REQUEST') {
      return (
        <span className="text-[9px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded border border-blue-200">
          QUEUED
        </span>
      );
    }
    if (order.sourceChannel === 'PORTAL') {
      return (
        <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded border border-emerald-200">
          PORTAL
        </span>
      );
    }
    if (order.sourceChannel === 'BULK_BATCHING') {
      return (
        <span className="text-[9px] font-bold bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded border border-purple-200">
          BULK
        </span>
      );
    }
    if (order.sourceChannel === 'IN_APP_STAFF_ENTRY') {
      return (
        <span className="text-[9px] font-bold bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded border border-indigo-200">
          STAFF
        </span>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Module Title */}
      <div className="bg-white p-4 md:p-6 rounded-2xl border border-[#E2D1B8] shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider bg-[#5B2E7A] text-white px-2.5 py-0.5 rounded font-mono">
              Unified Requisitions &amp; Order Register
            </span>
            <span className="text-xs text-gray-500">Live Bodega Ledger</span>
          </div>
          <h2 className="text-xl md:text-2xl font-serif font-bold text-[#3D1C52] mt-1">
            Outlet, Line &amp; Mess Hall Order History
          </h2>
          <p className="text-xs md:text-sm text-gray-600">
            Unified chronological ledger of all Recipe Batched Ingredients orders, Raw Material withdrawals (including Indangan Mess Hall staff meals/snacks), and past wholesale dispatches. Pending portal requests appear as <strong>queued</strong> until Jade issues them.
          </p>
        </div>

        <button
          onClick={loadWholesaleOrders}
          disabled={loading}
          className="bg-[#5B2E7A] hover:bg-[#3D1C52] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-2 transition disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span>Sync Ledger</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#E2D1B8] shadow-sm border-l-4 border-l-[#C8963E] flex items-center justify-between">
          <div>
            <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Total Ledger Valuation</p>
            <h3 className="text-xl md:text-2xl font-bold font-serif text-[#C8963E] mt-0.5">
              ₱{dynamicStats.totalCost.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-[11px] text-gray-500 mt-1">Across {dynamicStats.totalOrders} total orders &amp; slips</p>
          </div>
          <div className="bg-[#C8963E]/10 p-3 rounded-lg text-[#C8963E]">
            <DollarSign size={24} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E2D1B8] shadow-sm border-l-4 border-l-[#5B2E7A] flex items-center justify-between">
          <div>
            <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Batched / In-Production</p>
            <h3 className="text-xl md:text-2xl font-bold font-serif text-[#3D1C52] mt-0.5">
              {dynamicStats.inProgressCount} Active
            </h3>
            <p className="text-[11px] text-gray-500 mt-1">Scaling or awaiting release</p>
          </div>
          <div className="bg-[#5B2E7A]/10 p-3 rounded-lg text-[#5B2E7A]">
            <Package size={24} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E2D1B8] shadow-sm border-l-4 border-l-[#1E7A3E] flex items-center justify-between">
          <div>
            <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Completed / Dispatched</p>
            <h3 className="text-xl md:text-2xl font-bold font-serif text-[#1E7A3E] mt-0.5">
              {dynamicStats.deliveredCount} Fulfilled
            </h3>
            <p className="text-[11px] text-gray-500 mt-1">Received by drivers &amp; lines</p>
          </div>
          <div className="bg-[#1E7A3E]/10 p-3 rounded-lg text-[#1E7A3E]">
            <CheckCircle2 size={24} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E2D1B8] shadow-sm border-l-4 border-l-[#2563EB] flex items-center justify-between">
          <div>
            <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Pending Jade Issuance</p>
            <h3 className="text-xl md:text-2xl font-bold font-serif text-blue-700 mt-0.5">
              {dynamicStats.pendingCount} Queued
            </h3>
            <p className="text-[11px] text-gray-500 mt-1">Awaiting physical handoff confirmation</p>
          </div>
          <div className="bg-blue-100 p-3 rounded-lg text-blue-700">
            <Inbox size={24} />
          </div>
        </div>
      </div>

      {/* Filter Channel Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'ALL', label: `All Transactions (${allUnifiedOrders.length})` },
          { id: 'PENDING_REQUESTS', label: `Pending Issuance (${formattedPendingRequests.length})` },
          { id: 'RECIPE_BATCHING', label: `Recipe Batch Orders (${formattedBatchOrders.length})` },
          { id: 'MATERIAL_WITHDRAWALS', label: `Material Withdrawals (${formattedWithdrawals.length})` },
          { id: 'MESS_HALL', label: `Indangan Mess Hall (${allUnifiedOrders.filter(o => o.categoryTag === 'MESS_HALL').length})` },
          { id: 'OUTLETS', label: 'Retail Outlets (Pan de Verde & Laurice)' },
          { id: 'PRODUCTION_LINES', label: 'Biscocho & Otap Halls' },
          { id: 'WHOLESALE', label: `Wholesale Orders (${wholesaleOrders.length})` }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setSelectedChannel(tab.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
              selectedChannel === tab.id
                ? 'bg-[#3D1C52] text-white border-[#3D1C52] shadow-sm'
                : 'bg-white text-gray-600 border-[#E2D1B8] hover:bg-[#FAF6EE]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search & Status */}
      <div className="bg-white p-4 rounded-xl border border-[#E2D1B8] shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search order ID (BORD / WS / REQ / ORD), requester, outlet, product..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C8963E]"
          />
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <div className="flex items-center gap-1.5">
            <Filter size={14} className="text-gray-400" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs p-2 border border-gray-300 rounded-lg bg-white font-medium focus:outline-none focus:ring-2 focus:ring-[#C8963E]"
            >
              <option value="ALL">All Statuses</option>
              <option value="Delivered">Delivered / Issued</option>
              <option value="Batched / Kitted">Batched / Kitted</option>
              <option value="Pending Jade Issuance">Pending Jade Issuance</option>
              <option value="Pending Release">Pending Release</option>
              <option value="In Production">In Production / Batching</option>
            </select>
          </div>

          {(searchTerm || selectedStatus !== 'ALL' || selectedChannel !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedStatus('ALL');
                setSelectedChannel('ALL');
              }}
              className="text-xs text-gray-500 hover:text-gray-800 underline px-2"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-[#E2D1B8] shadow-sm overflow-hidden">
        <div className="px-6 py-3.5 bg-[#FAF6EE] border-b border-[#E2D1B8] flex justify-between items-center flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h3 className="font-serif font-bold text-[#3D1C52]">
              Order &amp; Requisition Ledger
            </h3>
            <span className="text-xs bg-[#5B2E7A]/10 text-[#5B2E7A] px-2.5 py-0.5 rounded-full font-bold">
              {filteredOrders.length} transactions displayed
            </span>
          </div>
          <p className="text-[11px] text-gray-500">
            Real-time feed of Recipe Batching, Bodega Withdrawals, Pending Requests &amp; Wholesale Logistics
          </p>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <ShoppingBag size={32} className="text-gray-300 mx-auto mb-2" />
            <p className="font-semibold text-sm">No orders or requisitions match your search filters.</p>
            <p className="text-xs text-gray-400 mt-1">Try selecting a different channel tab or resetting your query above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#5B2E7A] text-white">
                <tr>
                  <th className="p-3">Order / Slip Ref</th>
                  <th className="p-3">Date &amp; Schedule</th>
                  <th className="p-3">Requesting Line / Outlet</th>
                  <th className="p-3">Requisitioned By</th>
                  <th className="p-3">Category / Channel</th>
                  <th className="p-3">Products / Materials</th>
                  <th className="p-3 text-right">Est. Cost (PHP)</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2D1B8]">
                {filteredOrders.map((order) => {
                  const itemCount = order.items.reduce((sum, it) => sum + (it.qty || 1), 0);
                  const isMessHall = order.categoryTag === 'MESS_HALL';
                  const isPending = order.orderType === 'PENDING_REQUEST';

                  return (
                    <tr 
                      key={order.orderId} 
                      className={`transition-colors ${
                        isPending ? 'bg-blue-50/30 hover:bg-blue-50/60 border-l-2 border-l-blue-400' :
                        isMessHall ? 'bg-amber-50/40 hover:bg-amber-50' : 
                        'hover:bg-[#FAF6EE]/50'
                      }`}
                    >
                      <td className="p-3 font-mono font-bold text-[#5B2E7A]">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="hover:underline text-left block"
                        >
                          {order.orderId}
                        </button>
                        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded inline-block ${
                            order.formType === 'Form-ORD-001' ? 'bg-purple-100 text-purple-800' :
                            order.formType === 'Form-WAR-001' ? 'bg-emerald-100 text-emerald-800' :
                            'bg-indigo-100 text-indigo-800'
                          }`}>
                            {order.formType}
                          </span>
                          {renderSourceChip(order)}
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="font-semibold text-gray-900">{order.orderDate}</div>
                        <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                          <Truck size={10} /> {order.deliveryDate}
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="font-bold text-gray-900 flex items-center gap-1.5">
                          {isMessHall && <Utensils size={12} className="text-amber-600 flex-shrink-0" />}
                          <span>{order.customerOrOutlet}</span>
                        </div>
                        {isMessHall && (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded mt-0.5 inline-block">
                            Staff Meals &amp; Snacks
                          </span>
                        )}
                      </td>

                      <td className="p-3">
                        <div className="font-medium text-gray-800">{order.contactPerson}</div>
                        <div className="text-[10px] text-gray-500">{order.contactNumber}</div>
                      </td>

                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-700 block truncate max-w-[160px]">
                          {order.channel}
                        </span>
                      </td>

                      <td className="p-3 max-w-xs">
                        <div className="space-y-0.5">
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
                            title="Inspect itemized requisition slip & invoice"
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

      {/* Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-[#C8963E]/40 space-y-4 my-8">
            <div className="flex justify-between items-start border-b border-gray-200 pb-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-[#5B2E7A] text-white px-2 py-0.5 rounded font-mono">
                    {selectedOrder.formType}
                  </span>
                  <span className="text-xs font-mono font-bold text-[#5B2E7A]">{selectedOrder.orderId}</span>
                  {renderSourceChip(selectedOrder)}
                </div>
                <h3 className="text-lg md:text-xl font-serif font-bold text-gray-900 mt-1">
                  {selectedOrder.orderType === 'RECIPE_BATCH' ? 'Outlet Recipe Batched Ingredients Order' :
                   selectedOrder.orderType === 'PENDING_REQUEST' ? 'Queued Material Request — Awaiting Issuance' :
                   selectedOrder.orderType === 'MATERIAL_WITHDRAWAL' ? 'Warehouse Raw Material Withdrawal Slip' :
                   'Outlet Sales Order & Requisition Slip'}
                </h3>
                <p className="text-xs text-gray-500">
                  Jang-Jang Bakeshop &amp; Kingdom Confectionary · Indangan Plant FDA LTO #3000013388488
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-400 hover:text-gray-600 font-bold text-xl px-2 py-1"
              >
                ✕
              </button>
            </div>

            {/* Pending-request informational banner */}
            {selectedOrder.orderType === 'PENDING_REQUEST' && (
              <div className="bg-blue-50 border border-blue-300 p-3 rounded-xl text-xs text-blue-900 space-y-1">
                <div className="flex items-center gap-2 font-bold">
                  <Inbox size={14} /> Awaiting Jade Q. Dela Cruz Issuance
                </div>
                <p className="text-[11px]">
                  This request is queued in Jade's Pending Issuance list in the Stock Release tab.
                  No inventory has been deducted yet. Once Jade confirms physical handoff and clicks
                  "Issue &amp; Deduct Stock", this request becomes a formal `Form-WAR-001` withdrawal.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-[#FAF6EE] p-4 rounded-xl border border-[#E2D1B8] text-xs">
              <div className="space-y-1.5">
                <div>
                  <span className="text-gray-500 text-[10px] uppercase font-bold block">Requesting Line / Outlet / Department:</span>
                  <span className="font-bold text-gray-900 text-sm">{selectedOrder.customerOrOutlet}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] uppercase font-bold block">Requisitioned By (Baker / Staff Name):</span>
                  <span className="text-gray-800 font-semibold">{selectedOrder.contactPerson}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] uppercase font-bold block">Requisition Category / Purpose:</span>
                  <span className="text-gray-800 font-medium">{selectedOrder.channel}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div>
                  <span className="text-gray-500 text-[10px] uppercase font-bold block">Request Date:</span>
                  <span className="font-mono text-gray-800">{selectedOrder.orderDate}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] uppercase font-bold block">Scheduled Delivery / Fulfillment Time:</span>
                  <span className="font-mono text-gray-800">{selectedOrder.deliveryDate}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] uppercase font-bold block">Assigned Handler / Driver:</span>
                  <span className="text-gray-800 font-semibold">{selectedOrder.deliveryDriver}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-between items-center gap-2 p-3 bg-white rounded-lg border border-gray-200 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-gray-500 font-bold uppercase text-[10px]">Current Status:</span>
                {renderStatusBadge(selectedOrder.status)}
              </div>

              {/* Only allow status change for non-pending orders */}
              {selectedOrder.orderType !== 'PENDING_REQUEST' && (
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-500 text-[10px] font-bold">Update State:</span>
                  <select
                    value={selectedOrder.status}
                    disabled={updatingId === selectedOrder.orderId}
                    onChange={(e) => handleStatusChange(selectedOrder.orderId, e.target.value)}
                    className="p-1 border border-gray-300 rounded text-xs font-semibold bg-white cursor-pointer"
                  >
                    <option value="In Production">In Production / Batching</option>
                    <option value="Batched / Kitted">Batched / Kitted</option>
                    <option value="Pending Release">Pending Release</option>
                    <option value="Delivered">Delivered / Issued</option>
                  </select>
                  {updatingId === selectedOrder.orderId && (
                    <RefreshCw size={12} className="animate-spin text-[#C8963E]" />
                  )}
                </div>
              )}
            </div>

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
                          ₱{it.unitPrice?.toLocaleString('en-PH', { minimumFractionDigits: 2 }) || '0.00'}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-gray-900">
                          ₱{it.subtotal?.toLocaleString('en-PH', { minimumFractionDigits: 2 }) || '0.00'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-[#FAF6EE] font-bold text-xs border-t border-gray-200">
                    <tr className="border-t border-[#E2D1B8]">
                      <td colSpan="4" className="p-3 text-right text-[#3D1C52] text-sm font-bold uppercase">
                        Total Order / Requisition Valuation:
                      </td>
                      <td className="p-3 text-right font-mono text-base font-bold text-[#3D1C52]">
                        ₱{selectedOrder.totalCost.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs flex justify-between items-center">
              <div>
                <span className="font-bold text-gray-700">Allocation Terms: </span>
                <span className="text-gray-600">{selectedOrder.paymentTerms}</span>
              </div>
              <div className="text-right">
                <span className="font-bold text-gray-700">Remarks: </span>
                <span className="text-gray-600 italic">{selectedOrder.notes || 'None'}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2 text-[10px] text-gray-500 text-center border-t border-dashed">
              <div className="border-t pt-1">
                <p className="font-bold text-gray-700">{selectedOrder.contactPerson}</p>
                <p>Requisitioning Authority</p>
              </div>
              <div className="border-t pt-1">
                <p className="font-bold text-gray-700">Jade Q. Dela Cruz</p>
                <p>{selectedOrder.orderType === 'PENDING_REQUEST' ? 'Warehouse Supervisor (Pending)' : 'Warehouse Supervisor (Dispatched)'}</p>
              </div>
              <div className="border-t pt-1">
                <p className="font-bold text-gray-700">{selectedOrder.deliveryDriver}</p>
                <p>Logistics Carrier Receipt</p>
              </div>
            </div>

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