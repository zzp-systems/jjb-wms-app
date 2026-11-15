// ── Delivery Shipments API ──

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const date = url.searchParams.get('date');
    
    let query = 'SELECT * FROM delivery_shipments WHERE 1=1';
    const bindings = [];
    if (date) { query += ' AND delivery_date = ?'; bindings.push(date); }
    query += ' ORDER BY created_at DESC';

    const { results: shipments } = await env.DB.prepare(query).bind(...bindings).all();

    // Fetch items for all retrieved shipments
    const shipmentIds = shipments.map(s => s.shipment_id);
    let items = [];
    if (shipmentIds.length > 0) {
      const placeholders = shipmentIds.map(() => '?').join(',');
      const { results: deliveryItems } = await env.DB.prepare(`
        SELECT di.*, fg.lot_number, fg.product_sku, r.name as product_name
        FROM delivery_items di
        JOIN fg_lots fg ON di.fg_lot_id = fg.id
        LEFT JOIN recipes r ON fg.product_sku = r.sku
        WHERE di.shipment_id IN (${placeholders})
      `).bind(...shipmentIds).all();
      items = deliveryItems;
    }

    // Attach items to shipments
    const shipmentsWithItems = shipments.map(s => ({
      ...s,
      items: items.filter(i => i.shipment_id === s.shipment_id)
    }));

    return json({ shipments: shipmentsWithItems });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}