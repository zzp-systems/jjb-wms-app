// ───────────────────────────────────────────────────────────
// JJB WMS — Delivery Confirmation → ARAP Sync Endpoint
// Paste as: jjb-wms-app/functions/api/delivery-sync.js
//
// Called by the WMS frontend (BatchingWorkbench.jsx or
// OrderHistory.jsx) when an order/batch is marked as
// "DELIVERED" or "RELEASED". Forwards the delivery
// confirmation to z-books-systems to update the corresponding
// AR invoice status from "Open" → "Delivered".
//
// Route: POST /api/delivery-sync
// Auth: JWT (handled by WMS _middleware.js — frontend-facing)
//
// REQUIRED: Set these secrets in the WMS Pages project:
//   npx wrangler pages secret put ARAP_API_URL    (e.g., https://z-books-systems.pages.dev)
//   npx wrangler pages secret put SYNC_API_KEY    (shared with CRM + ARAP)
// ───────────────────────────────────────────────────────────

export async function onRequestPost({ request, env, data }) {
  const body = await request.json();

  // Validate required fields
  if (!body.order_id) {
    return json({ error: 'order_id is required' }, 400);
  }

  const arapUrl = env.ARAP_API_URL;
  const syncKey = env.SYNC_API_KEY;

  if (!arapUrl) {
    return json({ error: 'ARAP_API_URL not configured. Run: wrangler pages secret put ARAP_API_URL' }, 500);
  }

  // ── Build the delivery confirmation payload for ARAP ──
  // ARAP will:
  //   1. Find the AR invoice by wms_order_id (or crm_deal_id fallback)
  //   2. Update status from "Open" → "Delivered"
  //   3. Log the status change in audit_log
  const deliveryPayload = {
    idempotency_key: `wms-delivery-${body.order_id}-${body.status || 'delivered'}`,
    wms_order_id: body.order_id,
    status: body.status || 'DELIVERED',           // "DELIVERED", "RELEASED", etc.
    crm_deal_id: body.crm_deal_id || null,         // optional — ARAP uses this if wms_order_id doesn't match
  };

  // ── Call ARAP /api/sync/wms-delivery ──
  try {
    const arapRes = await fetch(`${arapUrl}/api/sync/wms-delivery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Key': syncKey || '',
      },
      body: JSON.stringify(deliveryPayload),
    });

    if (!arapRes.ok) {
      const err = await arapRes.text();
      return json({ error: `ARAP rejected delivery update: ${err}` }, 502);
    }

    const arapData = await arapRes.json();

    // ── Log sync event in WMS sync_events table ──
    try {
      await env.DB.prepare(
        'INSERT INTO sync_events (idempotency_key, event_type, payload) VALUES (?,?,?)'
      ).bind(
        deliveryPayload.idempotency_key,
        'DELIVERY_PUSHED_TO_ARAP',
        JSON.stringify({
          order_id: body.order_id,
          status: body.status,
          arap_invoice_found: arapData.invoice_found,
          arap_invoice_id: arapData.invoice_id,
        })
      ).run();
    } catch {
      // sync_events table constraint — non-fatal
    }

    return json({
      success: true,
      arap_invoice_found: arapData.invoice_found,
      arap_invoice_id: arapData.invoice_id || null,
    });
  } catch (e) {
    return json({ error: `ARAP sync failed: ${e.message}` }, 502);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
