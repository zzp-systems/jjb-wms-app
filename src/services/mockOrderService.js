// Production Wholesale & Outlet Order Ledger Service
// Effective Launch: Monday, November 9, 2026

export const MOCK_ORDERS = [];

// In-memory store initialized from seeds or local storage
const STORAGE_ORDERS_KEY = 'JJB_WMS_LIVE_ORDER_HISTORY';

function getStoredOrders() {
  try {
    const raw = localStorage.getItem(STORAGE_ORDERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to read order history storage:", e);
  }
  return MOCK_ORDERS;
}

function setStoredOrders(orders) {
  try {
    localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(orders));
  } catch (e) {
    console.error("Failed to write order history storage:", e);
  }
}

export const mockOrderService = {
  /**
   * Fetch all past orders with optional filters and simulated async delay
   */
  async fetchOrderHistory({ search = '', status = 'ALL', channel = 'ALL' } = {}) {
    await new Promise(resolve => setTimeout(resolve, 150));
    let orders = getStoredOrders();

    if (status && status !== 'ALL') {
      orders = orders.filter(o => o.status === status);
    }

    if (channel && channel !== 'ALL') {
      orders = orders.filter(o => o.channel === channel);
    }

    if (search && search.trim() !== '') {
      const q = search.toLowerCase().trim();
      orders = orders.filter(o => 
        o.orderId.toLowerCase().includes(q) ||
        o.customerOrOutlet.toLowerCase().includes(q) ||
        o.contactPerson.toLowerCase().includes(q) ||
        o.items.some(it => it.name.toLowerCase().includes(q) || it.sku.toLowerCase().includes(q))
      );
    }

    return orders;
  },

  /**
   * Get single order by ID
   */
  async getOrderById(orderId) {
    await new Promise(resolve => setTimeout(resolve, 100));
    const orders = getStoredOrders();
    return orders.find(o => o.orderId === orderId) || null;
  },

  /**
   * Update order status
   */
  async updateOrderStatus(orderId, newStatus) {
    await new Promise(resolve => setTimeout(resolve, 150));
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
    await new Promise(resolve => setTimeout(resolve, 200));
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
    await new Promise(resolve => setTimeout(resolve, 80));
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
  },

  /**
   * Clear all wholesale orders (Reset to fresh state)
   */
  clearAllOrders() {
    setStoredOrders([]);
  }
};
