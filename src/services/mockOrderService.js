// Mock Data Service for Order History
// Simulates an asynchronous backend API fetching past customer, outlet, and wholesale orders

export const MOCK_ORDERS = [
  {
    orderId: "ORD-2026-1104-01",
    orderDate: "2026-11-04 14:30",
    deliveryDate: "2026-11-05 06:00",
    customerOrOutlet: "Pan de Verde Outlet (Communal)",
    channel: "Retail Outlet Requisition",
    contactPerson: "Jhoanna Tejano / Feliciano Gomera",
    contactNumber: "+63 905-218-2190",
    status: "Delivered",
    paymentTerms: "Internal Plant Transfer",
    paymentStatus: "Settled",
    deliveryDriver: "Othniel Tilan (Pan de Verde Van)",
    items: [
      { sku: "BIS-001", name: "Biscocho Toasted Bread Delicacy (Packs)", qty: 60, unit: "packs", unitPrice: 75.0, subtotal: 4500.0 },
      { sku: "OTP-001", name: "Otap Layered Puff Pastry (Packs)", qty: 50, unit: "packs", unitPrice: 65.0, subtotal: 3250.0 },
      { sku: "BRD-PAN-3KG", name: "Classic Davao Pandesal (3kg Scaled Mix)", qty: 2, unit: "scaled kits", unitPrice: 320.0, subtotal: 640.0 },
      { sku: "BRD-UBE-001", name: "Special Ube Cheese Pandesal Mix", qty: 1, unit: "batch kit", unitPrice: 850.0, subtotal: 850.0 }
    ],
    logisticsFee: 150.0,
    totalCost: 9390.0,
    notes: "Early morning 06:00 AM delivery. Biscocho placed in dry upper rack."
  },
  {
    orderId: "ORD-2026-1104-02",
    orderDate: "2026-11-04 16:15",
    deliveryDate: "2026-11-05 08:30",
    customerOrOutlet: "Laurice Delicacies (Bankerohan)",
    channel: "Retail Outlet Requisition",
    contactPerson: "Anecita S. Blase / Raffy Boy Cortes",
    contactNumber: "+63 927-142-1510",
    status: "Batched / Kitted",
    paymentTerms: "Internal Plant Transfer",
    paymentStatus: "Pending Dispatch",
    deliveryDriver: "Roberto S. Blase (Laurice Dropside)",
    items: [
      { sku: "BIS-001", name: "Biscocho Toasted Bread Delicacy (Packs)", qty: 80, unit: "packs", unitPrice: 75.0, subtotal: 6000.0 },
      { sku: "OTP-001", name: "Otap Layered Puff Pastry (Packs)", qty: 70, unit: "packs", unitPrice: 65.0, subtotal: 4550.0 },
      { sku: "PST-ENS-001", name: "Special Butter Ensaymada (Box of 12)", qty: 10, unit: "boxes", unitPrice: 360.0, subtotal: 3600.0 }
    ],
    logisticsFee: 150.0,
    totalCost: 14300.0,
    notes: "Packed in branded carton boxes with protective wax dividers."
  },
  {
    orderId: "ORD-2026-1103-01",
    orderDate: "2026-11-03 09:10",
    deliveryDate: "2026-11-03 15:00",
    customerOrOutlet: "SM City Davao Pasalubong Hub (Ecoland)",
    channel: "Wholesale Commercial / Institutional",
    contactPerson: "Carmela D. Morales",
    contactNumber: "+63 917-882-9014",
    status: "Delivered",
    paymentTerms: "30-Day Commercial Terms",
    paymentStatus: "Invoice Sent",
    deliveryDriver: "Othniel Tilan (Pan de Verde Van)",
    items: [
      { sku: "BIS-001", name: "Biscocho Toasted Bread Delicacy (Master Carton - 50 pk)", qty: 4, unit: "cartons", unitPrice: 3500.0, subtotal: 14000.0 },
      { sku: "OTP-001", name: "Otap Layered Puff Pastry (Master Carton - 50 pk)", qty: 4, unit: "cartons", unitPrice: 3000.0, subtotal: 12000.0 }
    ],
    logisticsFee: 400.0,
    totalCost: 26400.0,
    notes: "Official receipt #JJB-OR-8821 attached. Display rack replenishment."
  },
  {
    orderId: "ORD-2026-1103-02",
    orderDate: "2026-11-03 11:45",
    deliveryDate: "2026-11-04 07:00",
    customerOrOutlet: "Abreeza Mall Ayala Pasalubong Center",
    channel: "Wholesale Commercial / Institutional",
    contactPerson: "Jonathan Tan",
    contactNumber: "+63 920-554-1928",
    status: "Delivered",
    paymentTerms: "15-Day Terms",
    paymentStatus: "Invoice Sent",
    deliveryDriver: "Roberto S. Blase",
    items: [
      { sku: "BIS-001", name: "Biscocho Toasted Bread Delicacy (Packs)", qty: 100, unit: "packs", unitPrice: 75.0, subtotal: 7500.0 },
      { sku: "OTP-001", name: "Otap Layered Puff Pastry (Packs)", qty: 120, unit: "packs", unitPrice: 65.0, subtotal: 7800.0 }
    ],
    logisticsFee: 300.0,
    totalCost: 15600.0,
    notes: "Requires FDA LTO verification document copy with shipment."
  },
  {
    orderId: "ORD-2026-1102-01",
    orderDate: "2026-11-02 08:20",
    deliveryDate: "2026-11-02 13:00",
    customerOrOutlet: "Pan de Verde Outlet (Communal)",
    channel: "Retail Outlet Requisition",
    contactPerson: "Feliciano Gomera",
    contactNumber: "+63 905-218-2190",
    status: "Delivered",
    paymentTerms: "Internal Plant Transfer",
    paymentStatus: "Settled",
    deliveryDriver: "Othniel Tilan",
    items: [
      { sku: "BRD-PAN-001", name: "Classic Davao Pandesal (Half-Sack 12.5kg)", qty: 2, unit: "batches", unitPrice: 1250.0, subtotal: 2500.0 },
      { sku: "BIS-001", name: "Biscocho Toasted Bread Delicacy (Packs)", qty: 40, unit: "packs", unitPrice: 75.0, subtotal: 3000.0 },
      { sku: "OTP-001", name: "Otap Layered Puff Pastry (Packs)", qty: 40, unit: "packs", unitPrice: 65.0, subtotal: 2600.0 }
    ],
    logisticsFee: 150.0,
    totalCost: 8250.0,
    notes: "Daily afternoon outlet batching replenishment."
  },
  {
    orderId: "ORD-2026-1102-02",
    orderDate: "2026-11-02 14:00",
    deliveryDate: "2026-11-03 09:00",
    customerOrOutlet: "Davao Airport Pasalubong Depot (Buhangin)",
    channel: "Wholesale Commercial / Institutional",
    contactPerson: "Giselle P. Ramos",
    contactNumber: "+63 919-441-2093",
    status: "Delivered",
    paymentTerms: "Cash on Delivery (COD)",
    paymentStatus: "Paid (Receipt #4192)",
    deliveryDriver: "Roberto S. Blase",
    items: [
      { sku: "BIS-001", name: "Biscocho Toasted Bread Delicacy (Packs)", qty: 150, unit: "packs", unitPrice: 75.0, subtotal: 11250.0 },
      { sku: "OTP-001", name: "Otap Layered Puff Pastry (Packs)", qty: 150, unit: "packs", unitPrice: 65.0, subtotal: 9750.0 }
    ],
    logisticsFee: 500.0,
    totalCost: 21500.0,
    notes: "High turnover airport kiosk. Checked freshness guarantee & shelf life."
  },
  {
    orderId: "ORD-2026-1101-01",
    orderDate: "2026-11-01 10:15",
    deliveryDate: "2026-11-01 16:30",
    customerOrOutlet: "Gaisano Mall Davao Kiosk",
    channel: "Wholesale Commercial / Institutional",
    contactPerson: "Ferdinand Cruz",
    contactNumber: "+63 922-384-9021",
    status: "Delivered",
    paymentTerms: "15-Day Terms",
    paymentStatus: "Settled",
    deliveryDriver: "Othniel Tilan",
    items: [
      { sku: "BIS-001", name: "Biscocho Toasted Bread Delicacy (Packs)", qty: 75, unit: "packs", unitPrice: 75.0, subtotal: 5625.0 },
      { sku: "OTP-001", name: "Otap Layered Puff Pastry (Packs)", qty: 75, unit: "packs", unitPrice: 65.0, subtotal: 4875.0 }
    ],
    logisticsFee: 250.0,
    totalCost: 10750.0,
    notes: "Delivered to Basement Food Court entrance."
  },
  {
    orderId: "ORD-2026-1105-01",
    orderDate: "2026-11-05 08:00",
    deliveryDate: "2026-11-05 14:00",
    customerOrOutlet: "Laurice Delicacies (Bankerohan)",
    channel: "Retail Outlet Requisition",
    contactPerson: "Anecita S. Blase",
    contactNumber: "+63 927-142-1510",
    status: "Pending Release",
    paymentTerms: "Internal Plant Transfer",
    paymentStatus: "Approved by Bodega",
    deliveryDriver: "Roberto S. Blase",
    items: [
      { sku: "BRD-MON-001", name: "Classic Monay & Sweet Loaf Mix", qty: 2, unit: "scaled kits", unitPrice: 650.0, subtotal: 1300.0 },
      { sku: "BIS-001", name: "Biscocho Toasted Bread Delicacy (Packs)", qty: 50, unit: "packs", unitPrice: 75.0, subtotal: 3750.0 },
      { sku: "OTP-001", name: "Otap Layered Puff Pastry (Packs)", qty: 40, unit: "packs", unitPrice: 65.0, subtotal: 2600.0 }
    ],
    logisticsFee: 150.0,
    totalCost: 7800.0,
    notes: "Romeo scheduled to finish scaling at 11:30 AM."
  },
  {
    orderId: "ORD-2026-1105-02",
    orderDate: "2026-11-05 11:20",
    deliveryDate: "2026-11-06 08:00",
    customerOrOutlet: "Victoria Plaza Pasalubong Corner",
    channel: "Wholesale Commercial / Institutional",
    contactPerson: "Arlene C. Santos",
    contactNumber: "+63 918-912-4433",
    status: "In Production",
    paymentTerms: "Cash on Delivery (COD)",
    paymentStatus: "Pending Delivery",
    deliveryDriver: "Othniel Tilan",
    items: [
      { sku: "BIS-001", name: "Biscocho Toasted Bread Delicacy (Packs)", qty: 90, unit: "packs", unitPrice: 75.0, subtotal: 6750.0 },
      { sku: "OTP-001", name: "Otap Layered Puff Pastry (Packs)", qty: 90, unit: "packs", unitPrice: 65.0, subtotal: 5850.0 },
      { sku: "PST-ENS-001", name: "Special Butter Ensaymada (Box of 12)", qty: 5, unit: "boxes", unitPrice: 360.0, subtotal: 1800.0 }
    ],
    logisticsFee: 300.0,
    totalCost: 14700.0,
    notes: "Special packing requested for holiday pasalubong gift boxes."
  }
];

// In-memory store initialized from seeds or local storage
const STORAGE_ORDERS_KEY = 'JJB_WMS_MOCK_ORDER_HISTORY';

function getStoredOrders() {
  try {
    const raw = localStorage.getItem(STORAGE_ORDERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // fallback
  }
  return MOCK_ORDERS;
}

function setStoredOrders(orders) {
  try {
    localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(orders));
  } catch (e) {
    console.error("Storage error:", e);
  }
}

/**
 * Mock Data Service API
 */
export const mockOrderService = {
  /**
   * Fetches the list of past orders with simulated network latency
   */
  async fetchOrderHistory(filters = {}) {
    // Simulate async network request
    await new Promise(resolve => setTimeout(resolve, 320));

    let orders = getStoredOrders();

    if (filters.search) {
      const q = filters.search.toLowerCase();
      orders = orders.filter(o => 
        o.orderId.toLowerCase().includes(q) ||
        o.customerOrOutlet.toLowerCase().includes(q) ||
        o.channel.toLowerCase().includes(q) ||
        o.items.some(it => it.name.toLowerCase().includes(q) || it.sku.toLowerCase().includes(q))
      );
    }

    if (filters.status && filters.status !== 'ALL') {
      orders = orders.filter(o => o.status === filters.status);
    }

    if (filters.channel && filters.channel !== 'ALL') {
      orders = orders.filter(o => o.channel === filters.channel);
    }

    // Sort descending by orderDate
    return [...orders].sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
  },

  /**
   * Get single order by ID
   */
  async getOrderById(orderId) {
    await new Promise(resolve => setTimeout(resolve, 150));
    const orders = getStoredOrders();
    return orders.find(o => o.orderId === orderId) || null;
  },

  /**
   * Update order status
   */
  async updateOrderStatus(orderId, newStatus) {
    await new Promise(resolve => setTimeout(resolve, 200));
    const orders = getStoredOrders();
    const updated = orders.map(o => {
      if (o.orderId === orderId) {
        return { ...o, status: newStatus };
      }
      return o;
    });
    setStoredOrders(updated);
    return updated.find(o => o.orderId === orderId);
  },

  /**
   * Add a new order into the history
   */
  async createOrder(orderData) {
    await new Promise(resolve => setTimeout(resolve, 250));
    const orders = getStoredOrders();
    const newOrder = {
      ...orderData,
      orderId: orderData.orderId || `ORD-${Date.now().toString().slice(-8)}`,
      orderDate: orderData.orderDate || new Date().toISOString().slice(0, 16).replace('T', ' ')
    };
    const updated = [newOrder, ...orders];
    setStoredOrders(updated);
    return newOrder;
  },

  /**
   * Calculate summary statistics
   */
  async getOrderStats() {
    await new Promise(resolve => setTimeout(resolve, 100));
    const orders = getStoredOrders();
    const totalCost = orders.reduce((sum, o) => sum + (o.totalCost || 0), 0);
    const deliveredCount = orders.filter(o => o.status === 'Delivered').length;
    const inProgressCount = orders.filter(o => o.status === 'Batched / Kitted' || o.status === 'In Production' || o.status === 'Pending Release').length;

    return {
      totalOrders: orders.length,
      totalCost,
      deliveredCount,
      inProgressCount,
      avgOrderCost: orders.length > 0 ? totalCost / orders.length : 0
    };
  }
};
