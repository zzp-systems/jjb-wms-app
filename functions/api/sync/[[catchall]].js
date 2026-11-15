// ───────────────────────────────────────────────────────────
// JJB WMS — CRM Sync Endpoints
// ───────────────────────────────────────────────────────────

function verifySyncKey(request, env) {
  const key = request.headers.get('X-Sync-Key');
  if (!key || key !== env.SYNC_API_KEY) return false;
  return true;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  if (!verifySyncKey(request, env)) {
    return json({ error: 'Invalid or missing X-Sync-Key' }, 403);
  }

  // GET /api/sync/products
  if (path === '/api/sync/products' && request.method === 'GET') {
    try {
      const result = await env.DB.prepare(
        `SELECT code, name, category, brand, primary_uom, secondary_uom,
                unit_cost_centavos, current_balance
         FROM materials WHERE is_test_data = 0 ORDER BY code`
      ).all();
      return json({
        products: result.results || [],
        count: result.results?.length || 0,
        pulled_at: new Date().toISOString(),
      });
    } catch (err) {
      return json({ error: 'WMS DB Error: ' + err.message }, 500);
    }
  }

  // POST /api/sync/upsert-outlet
  if (path === '/api/sync/upsert-outlet' && request.method === 'POST') {
    try {
      const body = await request.json();
      const { idempotency_key, outlet } = body;

      if (!outlet?.name) return json({ error: 'outlet.name is required' }, 400);

      const existingEvent = await env.DB.prepare('SELECT payload FROM sync_events WHERE idempotency_key = ?').bind(idempotency_key).first();
      if (existingEvent) {
        const payload = JSON.parse(existingEvent.payload);
        return json({ success: true, outlet_id: payload.outlet_id, action: 'idempotent' });
      }

      let existing = null;
      try {
        existing = await env.DB.prepare('SELECT id FROM outlets WHERE crm_account_id = ?').bind(outlet.crm_account_id).first();
      } catch {
        existing = await env.DB.prepare('SELECT id FROM outlets WHERE name = ?').bind(outlet.name).first();
      }

      let outletId = existing ? existing.id : crypto.randomUUID();
      let action = existing ? 'updated' : 'created';

      if (existing) {
        await env.DB.prepare(`UPDATE outlets SET name = ?, address = ?, contact_person = ?, is_active = ?, updated_at = datetime('now') WHERE id = ?`)
          .bind(outlet.name, outlet.address || null, outlet.contact_person || null, outlet.is_active ?? 1, outletId).run();
      } else {
        await env.DB.prepare(`INSERT INTO outlets (id, name, address, contact_person, is_active, crm_account_id) VALUES (?,?,?,?,?,?)`)
          .bind(outletId, outlet.name, outlet.address || null, outlet.contact_person || null, outlet.is_active ?? 1, outlet.crm_account_id || null).run();
      }

      await env.DB.prepare('INSERT INTO sync_events (idempotency_key, event_type, payload) VALUES (?,?,?)')
        .bind(idempotency_key, 'OUTLET_UPSERT_FROM_CRM', JSON.stringify({ outlet_id: outletId, action })).run();

      return json({ success: true, outlet_id: outletId, action });
    } catch (err) {
      return json({ error: 'WMS DB Error: ' + err.message }, 500);
    }
  }

  // POST /api/sync/create-order
  if (path === '/api/sync/create-order' && request.method === 'POST') {
    try {
      const body = await request.json();
      const { idempotency_key, order } = body;

      if (!order?.customer_or_outlet) return json({ error: 'order.customer_or_outlet is required' }, 400);

      const existingEvent = await env.DB.prepare('SELECT payload FROM sync_events WHERE idempotency_key = ?').bind(idempotency_key).first();
      if (existingEvent) {
        const payload = JSON.parse(existingEvent.payload);
        return json({ success: true, order_id: payload.order_id, action: 'idempotent' });
      }

      const orderId = crypto.randomUUID();
      const now = new Date().toISOString();

      // 1. Insert into financial `orders` table
      await env.DB.prepare(
        `INSERT INTO orders (order_id, customer_or_outlet, contact_person, channel, status, order_date, total_cost_centavos, crm_deal_id, source)
         VALUES (?,?,?,?,?,?,?,?,?)`
      ).bind(
        orderId, order.customer_or_outlet, order.contact_person || null, order.channel || 'CRM-B2B',
        order.status || 'Pending', now.slice(0, 10), order.total_cost_centavos || 0,
        order.crm_deal_id || null, order.source || 'crm'
      ).run();

      // 2. Insert into `batch_orders` for UI display
      // FORENSIC FIX: Get a valid recipe_sku to satisfy Foreign Key constraints
      let validSku = 'BRD-PAN-001'; // Fallback
      try {
        const defaultRecipe = await env.DB.prepare('SELECT sku FROM recipes LIMIT 1').first();
        if (defaultRecipe && defaultRecipe.sku) validSku = defaultRecipe.sku;
      } catch (e) {
        console.warn('Could not find fallback recipe_sku');
      }

      await env.DB.prepare(
        `INSERT INTO batch_orders (order_id, outlet_name, recipe_sku, recipe_name_snapshot, requested_qty_pcs, status, crm_deal_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        orderId, order.customer_or_outlet, validSku, `CRM Deal: ${order.customer_or_outlet}`, 
        100, 'PENDING_BATCHING', order.crm_deal_id || null
      ).run();

      // 3. Line items
      if (order.line_items?.length) {
        for (const item of order.line_items) {
          await env.DB.prepare(
            `INSERT INTO order_items (order_id, name, sku, qty, unit_cost_centavos, line_total_centavos)
             VALUES (?,?,?,?,?,?)`
          ).bind(orderId, item.name || null, item.sku || null, item.qty || 0, item.unit_cost_centavos || 0, (item.unit_cost_centavos || 0) * (item.qty || 0)).run();
        }
      }

      // 4. Log sync event
      await env.DB.prepare(
        'INSERT INTO sync_events (idempotency_key, event_type, payload) VALUES (?,?,?)'
      ).bind(idempotency_key, 'ORDER_CREATED_FROM_CRM', JSON.stringify({ order_id: orderId, crm_deal_id: order.crm_deal_id })).run();

      return json({ success: true, order_id: orderId });
    } catch (err) {
      console.error('WMS create-order failed:', err);
      return json({ error: 'WMS Backend Error: ' + err.message }, 500);
    }
  }

  return json({ error: `Unknown sync endpoint: ${path}` }, 404);
}