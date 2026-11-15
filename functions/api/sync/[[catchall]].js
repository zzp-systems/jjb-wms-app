// ───────────────────────────────────────────────────────────
// JJB WMS — CRM Sync Endpoints
// Paste as: jjb-wms-app/functions/api/sync/[[catchall]].js
//
// Handles 3 routes (server-to-server, auth via X-Sync-Key):
//   GET  /api/sync/products       → return product master for CRM cache
//   POST /api/sync/upsert-outlet  → receive CRM account, upsert into outlets
//   POST /api/sync/create-order   → receive confirmed CRM deal, create WMS order
//
// REQUIRED: Set SYNC_API_KEY secret in WMS Pages project
//   npx wrangler pages secret put SYNC_API_KEY
//   (must match the SYNC_API_KEY set in the CRM project)
//
// NOTE: If your WMS _middleware.js enforces JWT on all /api/* routes,
//       add an exception for /api/sync/* so these endpoints use X-Sync-Key instead.
// ───────────────────────────────────────────────────────────

// ── Sync key verification ──
function verifySyncKey(request, env) {
  const key = request.headers.get('X-Sync-Key');
  if (!key || key !== env.SYNC_API_KEY) return false;
  return true;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ── Main router ──
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  // ── Auth: verify X-Sync-Key for all sync endpoints ──
  if (!verifySyncKey(request, env)) {
    return json({ error: 'Invalid or missing X-Sync-Key' }, 403);
  }

  // ──────────────────────────────────────────────────
  // GET /api/sync/products
  // Returns the full product master (materials table) for CRM to cache.
  // CRM calls this on a cron schedule to refresh crm_product_cache.
  // ──────────────────────────────────────────────────
  if (path === '/api/sync/products' && request.method === 'GET') {
    const result = await env.DB.prepare(
      `SELECT code, name, category, brand, primary_uom, secondary_uom,
              unit_cost_centavos, current_balance
       FROM materials
       WHERE is_test_data = 0
       ORDER BY code`
    ).all();

    return json({
      products: result.results || [],
      count: result.results?.length || 0,
      pulled_at: new Date().toISOString(),
    });
  }

  // ──────────────────────────────────────────────────
  // POST /api/sync/upsert-outlet
  // Receives a CRM account and upserts it into the WMS outlets table.
  // CRM is the customer master; WMS outlets sync down.
  //
  // Request body:
  //   {
  //     "idempotency_key": "crm-account-<uuid>",
  //     "outlet": {
  //       "name": "SM Davao",
  //       "address": "SM City Davao...",
  //       "contact_person": "Juan Dela Cruz",
  //       "is_active": 1,
  //       "crm_account_id": "<uuid>"
  //     }
  //   }
  //
  // Response:
  //   { "success": true, "outlet_id": "<uuid>", "action": "created" | "updated" }
  // ──────────────────────────────────────────────────
  if (path === '/api/sync/upsert-outlet' && request.method === 'POST') {
    const body = await request.json();
    const { idempotency_key, outlet } = body;

    if (!outlet?.name) {
      return json({ error: 'outlet.name is required' }, 400);
    }

    // ── Idempotency check ──
    const existingEvent = await env.DB.prepare(
      'SELECT payload FROM sync_events WHERE idempotency_key = ?'
    ).bind(idempotency_key).first();

    if (existingEvent) {
      const payload = JSON.parse(existingEvent.payload);
      return json({ success: true, outlet_id: payload.outlet_id, action: 'idempotent' });
    }

    // ── Find existing outlet by crm_account_id (if column exists) or by name ──
    let existing = null;
    try {
      existing = await env.DB.prepare(
        'SELECT id FROM outlets WHERE crm_account_id = ?'
      ).bind(outlet.crm_account_id).first();
    } catch {
      // crm_account_id column doesn't exist yet — fall back to name match
      existing = await env.DB.prepare(
        'SELECT id FROM outlets WHERE name = ?'
      ).bind(outlet.name).first();
    }

    let outletId;
    let action;

    if (existing) {
      // ── Update existing outlet ──
      outletId = existing.id;
      action = 'updated';
      await env.DB.prepare(
        `UPDATE outlets SET name = ?, address = ?, contact_person = ?, is_active = ?, updated_at = datetime('now') WHERE id = ?`
      ).bind(
        outlet.name,
        outlet.address || null,
        outlet.contact_person || null,
        outlet.is_active ?? 1,
        outletId
      ).run();
    } else {
      // ── Create new outlet ──
      outletId = crypto.randomUUID();
      action = 'created';
      try {
        await env.DB.prepare(
          `INSERT INTO outlets (id, name, address, contact_person, is_active, crm_account_id) VALUES (?,?,?,?,?,?)`
        ).bind(outletId, outlet.name, outlet.address || null, outlet.contact_person || null, outlet.is_active ?? 1, outlet.crm_account_id || null).run();
      } catch {
        // crm_account_id column doesn't exist — insert without it
        await env.DB.prepare(
          `INSERT INTO outlets (id, name, address, contact_person, is_active) VALUES (?,?,?,?,?)`
        ).bind(outletId, outlet.name, outlet.address || null, outlet.contact_person || null, outlet.is_active ?? 1).run();
      }
    }

    // ── Log sync event for idempotency ──
    await env.DB.prepare(
      'INSERT INTO sync_events (idempotency_key, event_type, payload) VALUES (?,?,?)'
    ).bind(idempotency_key, 'OUTLET_UPSERT_FROM_CRM', JSON.stringify({ outlet_id: outletId, action })).run();

    return json({ success: true, outlet_id: outletId, action });
  }

  // ──────────────────────────────────────────────────
  // POST /api/sync/create-order
  // ──────────────────────────────────────────────────
  if (path === '/api/sync/create-order' && request.method === 'POST') {
    const body = await request.json();
    const { idempotency_key, order } = body;

    if (!order?.customer_or_outlet) {
      return json({ error: 'order.customer_or_outlet is required' }, 400);
    }

    // ── Idempotency check ──
    const existingEvent = await env.DB.prepare(
      'SELECT payload FROM sync_events WHERE idempotency_key = ?'
    ).bind(idempotency_key).first();

    if (existingEvent) {
      const payload = JSON.parse(existingEvent.payload);
      return json({ success: true, order_id: payload.order_id, action: 'idempotent' });
    }

    // ── Create the order ──
    const orderId = crypto.randomUUID();
    const now = new Date().toISOString();

    await env.DB.prepare(
      `INSERT INTO orders (order_id, customer_or_outlet, contact_person, channel, status, order_date, total_cost_centavos, crm_deal_id, source)
       VALUES (?,?,?,?,?,?,?,?,?)`
    ).bind(
      orderId,
      order.customer_or_outlet,
      order.contact_person || null,
      order.channel || 'CRM-B2B',
      order.status || 'Pending',
      now.slice(0, 10),
      order.total_cost_centavos || 0,
      order.crm_deal_id || null,
      order.source || 'crm'
    ).run();

    // ── Insert line items if provided ──
    if (order.line_items?.length) {
      for (const item of order.line_items) {
        const unitCost = item.unit_cost_centavos || 0;
        const qty = item.qty || 0;
        const lineTotal = Math.round(unitCost * qty);

        await env.DB.prepare(
          `INSERT INTO order_items (order_id, name, sku, qty, unit_cost_centavos, line_total_centavos)
           VALUES (?,?,?,?,?,?)`
        ).bind(orderId, item.name || null, item.sku || null, qty, unitCost, lineTotal).run();
      }
    }

    // ── Log sync event for idempotency ──
    await env.DB.prepare(
      'INSERT INTO sync_events (idempotency_key, event_type, payload) VALUES (?,?,?)'
    ).bind(idempotency_key, 'ORDER_CREATED_FROM_CRM', JSON.stringify({ order_id: orderId, crm_deal_id: order.crm_deal_id })).run();

    // ── Push order status back to CRM via webhook (fire-and-forget) ──
    try {
      const crmUrl = (env.CRM_API_URL || '').replace(/\/$/, '');
      const syncKey = env.SYNC_API_KEY;
      if (crmUrl) {
        await fetch(`${crmUrl}/api/sync/receive-wms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Sync-Key': syncKey || '' },
          body: JSON.stringify({
            wms_order_id: orderId,
            status: 'Pending',
            crm_deal_id: order.crm_deal_id,
          }),
        });
      }
    } catch (err) {
      console.error('Webhook back to CRM failed:', err);
    }

    return json({ success: true, order_id: orderId });
  }

  // ── Unknown sync route ──
  return json({ error: `Unknown sync endpoint: ${path}` }, 404);
}
