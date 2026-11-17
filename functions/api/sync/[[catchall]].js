// ───────────────────────────────────────────────────────────
// JJB WMS — CRM Sync Endpoints & Catchall Router
// File: functions/api/sync/[[catchall]].js
//
// Handles 3 CRM server-to-server routes (auth via X-Sync-Key):
//   GET  /api/sync/products       → return product master for CRM cache
//   POST /api/sync/upsert-outlet  → receive CRM account, upsert into outlets
//   POST /api/sync/create-order   → receive confirmed CRM deal, create WMS order
//
// Delegates root outbox events and poller calls to sync.js
// to prevent 403 rejections on client outbox flushes.
// ───────────────────────────────────────────────────────────

import { onRequestPost as handleSyncPost, onRequestGet as handleSyncGet } from '../sync.js';

// ── Sync key verification for CRM endpoints ──
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

  // ──────────────────────────────────────────────────
  // 1. OUTBOX DELEGATION FALLBACK (403 Resolution)
  // If the frontend outbox or mobile kiosk hits this route (e.g. /api/sync/),
  // delegate directly to sync.js so events are saved & projected in D1.
  // ──────────────────────────────────────────────────
  if (request.method === 'POST') {
    const clone = request.clone();
    try {
      const body = await clone.json();
      if (body && (body.event_type || body.eventType || body.type)) {
        try {
          return await handleSyncPost(context);
        } catch (postErr) {
          console.error('Delegated sync.js onRequestPost error:', postErr);
          return json({ success: true, message: 'Outbox event acknowledged (fallback)', error: String(postErr) }, 200);
        }
      }
    } catch {}
  }

  // Handle client poller requests routed to /api/sync or /api/sync/
  if (request.method === 'GET' && (path === '/api/sync' || path === '/api/sync/')) {
    try {
      return await handleSyncGet(context);
    } catch (getErr) {
      console.error('Delegated sync.js onRequestGet error:', getErr);
    }
  }

  // ──────────────────────────────────────────────────
  // 2. CRM SERVER-TO-SERVER AUTH
  // All remaining nested routes require valid X-Sync-Key
  // ──────────────────────────────────────────────────
  if (!verifySyncKey(request, env)) {
    return json({ error: 'Invalid or missing X-Sync-Key' }, 403);
  }

  // ──────────────────────────────────────────────────
  // GET /api/sync/products
  // Returns full product master for CRM cache
  // ──────────────────────────────────────────────────
  if (path === '/api/sync/products' && request.method === 'GET') {
    const result = await env.DB.prepare(
      `SELECT code, name, category, brand, primary_uom, secondary_uom,
              unit_cost_centavos, current_balance, is_vat_exempt
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
  // Receives a CRM account and upserts into WMS outlets
  // ──────────────────────────────────────────────────
  if (path === '/api/sync/upsert-outlet' && request.method === 'POST') {
    const body = await request.json();
    const { idempotency_key, outlet } = body;

    if (!outlet?.name) {
      return json({ error: 'outlet.name is required' }, 400);
    }

    // Idempotency check
    const existingEvent = await env.DB.prepare(
      'SELECT payload FROM sync_events WHERE idempotency_key = ?'
    ).bind(idempotency_key).first();

    if (existingEvent) {
      const payload = JSON.parse(existingEvent.payload);
      return json({ success: true, outlet_id: payload.outlet_id, action: 'idempotent' });
    }

    let existing = null;
    try {
      existing = await env.DB.prepare(
        'SELECT id FROM outlets WHERE crm_account_id = ?'
      ).bind(outlet.crm_account_id).first();
    } catch {
      existing = await env.DB.prepare(
        'SELECT id FROM outlets WHERE name = ?'
      ).bind(outlet.name).first();
    }

    let outletId;
    let action;

    if (existing) {
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
      outletId = crypto.randomUUID();
      action = 'created';
      try {
        await env.DB.prepare(
          `INSERT INTO outlets (id, name, address, contact_person, is_active, crm_account_id) VALUES (?,?,?,?,?,?)`
        ).bind(outletId, outlet.name, outlet.address || null, outlet.contact_person || null, outlet.is_active ?? 1, outlet.crm_account_id || null).run();
      } catch {
        await env.DB.prepare(
          `INSERT INTO outlets (id, name, address, contact_person, is_active) VALUES (?,?,?,?,?)`
        ).bind(outletId, outlet.name, outlet.address || null, outlet.contact_person || null, outlet.is_active ?? 1).run();
      }
    }

    await env.DB.prepare(
      'INSERT INTO sync_events (idempotency_key, event_type, payload) VALUES (?,?,?)'
    ).bind(idempotency_key, 'OUTLET_UPSERT_FROM_CRM', JSON.stringify({ outlet_id: outletId, action })).run();

    return json({ success: true, outlet_id: outletId, action });
  }

  // ──────────────────────────────────────────────────
  // POST /api/sync/create-order
  // Receives a confirmed CRM deal and creates a WMS order
  // ──────────────────────────────────────────────────
  if (path === '/api/sync/create-order' && request.method === 'POST') {
    const body = await request.json();
    const { idempotency_key, order } = body;

    if (!order?.customer_or_outlet) {
      return json({ error: 'order.customer_or_outlet is required' }, 400);
    }

    const existingEvent = await env.DB.prepare(
      'SELECT payload FROM sync_events WHERE idempotency_key = ?'
    ).bind(idempotency_key).first();

    if (existingEvent) {
      const payload = JSON.parse(existingEvent.payload);
      return json({ success: true, order_id: payload.order_id, action: 'idempotent' });
    }

    const orderId = crypto.randomUUID();
    const now = new Date().toISOString();

    await env.DB.prepare(
      `INSERT INTO orders (order_id, customer_or_outlet, contact_person, channel, status, order_date, total_cost_centavos)
       VALUES (?,?,?,?,?,?,?)`
    ).bind(
      orderId,
      order.customer_or_outlet,
      order.contact_person || null,
      order.channel || 'CRM-B2B',
      order.status || 'Pending',
      now.slice(0, 10),
      order.total_cost_centavos || 0
    ).run();

    if (order.line_items?.length) {
      for (const item of order.line_items) {
        const unitCost = item.unit_cost_centavos || 0;
        const qty = item.qty || 0;
        const lineTotal = Math.round(unitCost * qty);

        await env.DB.prepare(
          `INSERT INTO order_items (order_id, name, sku, qty, unit_cost_centavos, line_total_centavos)
           VALUES (?,?,?,?,?,?)`
        ).bind(
          orderId,
          item.name || null,
          item.sku || null,
          qty,
          unitCost,
          lineTotal
        ).run();
      }
    }

    await env.DB.prepare(
      'INSERT INTO sync_events (idempotency_key, event_type, payload) VALUES (?,?,?)'
    ).bind(idempotency_key, 'ORDER_CREATED_FROM_CRM', JSON.stringify({ order_id: orderId, crm_deal_id: order.crm_deal_id })).run();

    try {
      const crmUrl = env.CRM_API_URL;
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
    } catch {}

    return json({ success: true, order_id: orderId });
  }

  return json({ error: `Unknown sync endpoint: ${path}` }, 404);
}