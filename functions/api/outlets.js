// ── WMS Outlets & Customer History ──

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const outletId = url.searchParams.get('id');

  try {
    // 1. Fetch a single outlet with history
    if (outletId) {
      const outlet = await env.DB.prepare('SELECT * FROM outlets WHERE id = ?').bind(outletId).first();
      if (!outlet) return json({ error: 'Outlet not found' }, 404);

      // Fetch related Orders (using customer_or_outlet text matching)
      const { results: orders } = await env.DB.prepare(
        'SELECT order_id, status, total_cost_centavos, created_at FROM orders WHERE customer_or_outlet = ? ORDER BY created_at DESC'
      ).bind(outlet.name).all();

      // Fetch related Delivery Shipments
      const { results: deliveries } = await env.DB.prepare(
        'SELECT shipment_id, delivery_date, status, vehicle_plate FROM delivery_shipments WHERE destination_outlet_id = ? ORDER BY delivery_date DESC'
      ).bind(outletId).all();

      return json({ outlet, orders, deliveries });
    }

    // 2. Fetch all outlets (The Customer List)
    const { results: outlets } = await env.DB.prepare(
      'SELECT id, name, address, contact_person, crm_account_id, is_active FROM outlets ORDER BY name ASC'
    ).all();

    return json({ outlets });

  } catch (err) {
    return json({ error: err.message }, 500);
  }
}