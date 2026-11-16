// ───────────────────────────────────────────────────────────
// WMS Frontend Snippet — Delivery Confirmation → ARAP
// Add this to BatchingWorkbench.jsx or OrderHistory.jsx
// in the jjb-wms-app project.
//
// This fires when an order/batch is marked as "DELIVERED"
// or "RELEASED", sending the confirmation to z-books-systems
// to update the corresponding AR invoice status.
//
// INTEGRATION POINT: Call syncDeliveryToArap() inside your
// existing "release" or "deliver" handler, right after the
// batch_orders / orders status is updated in D1.
// ───────────────────────────────────────────────────────────


// ── 1. Add this helper function near the top of your component file ──

/**
 * Syncs a delivery/release confirmation to z-books-systems (ARAP)
 * to update the corresponding AR invoice status from "Open" → "Delivered".
 *
 * @param {string} orderId      - The WMS order_id or batch_orders.order_id
 * @param {string} status      - "DELIVERED", "RELEASED", etc.
 * @param {string} [crmDealId]  - Optional CRM deal ID (for linking if order_id doesn't match)
 */
async function syncDeliveryToArap(orderId, status, crmDealId) {
  const token = localStorage.getItem('jjb_wms_token'); // adjust to match your WMS token key

  try {
    const res = await fetch('/api/delivery-sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        order_id: orderId,
        status: status,
        crm_deal_id: crmDealId || null,
      }),
    });

    const data = await res.json();

    if (data.success) {
      if (data.arap_invoice_found) {
        console.log(`✅ ARAP AR invoice updated to Delivered for order ${orderId}`);
      } else {
        console.log(`ℹ️ No matching AR invoice found in ARAP for order ${orderId} (may be a non-CRM order)`);
      }
      return data;
    } else {
      console.error('ARAP delivery sync error:', data.error);
      return null;
    }
  } catch (err) {
    console.error('ARAP delivery sync failed (network):', err.message);
    return null;
  }
}


// ── 2. Call syncDeliveryToArap() inside your existing release/deliver handler ──
//
// EXAMPLE A — Inside BatchingWorkbench.jsx, in the release handler:

/*
async function handleReleaseBatch(batchOrder) {
  // ... your existing code to update batch_orders status to "Released" ...

  // ── ADD THIS: Sync delivery to ARAP ──
  await syncDeliveryToArap(
    batchOrder.order_id,           // batch_orders.order_id
    'RELEASED',                    // status
    batchOrder.crm_deal_id          // optional CRM deal ID (if stored on the batch order)
  );
}
*/


// ── EXAMPLE B — Inside OrderHistory.jsx, in the deliver handler:

/*
async function handleMarkDelivered(order) {
  // ... your existing code to update orders.status to "Delivered" ...

  // ── ADD THIS: Sync delivery to ARAP ──
  await syncDeliveryToArap(
    order.order_id,                // orders.order_id
    'DELIVERED',                   // status
    null                           // CRM deal ID (not available on orders table — ARAP matches by order_id)
  );
}
*/


// ── 3. If you have a button that triggers the release/deliver action ──
/*
<button onClick={() => handleReleaseBatch(selectedBatch)}>
  Release Batch
</button>

<button onClick={() => handleMarkDelivered(selectedOrder)}>
  Mark Delivered
</button>
*/
