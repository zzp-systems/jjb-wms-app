// ── Finished Goods API ──

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const sku = url.searchParams.get('sku');
    const status = url.searchParams.get('status');

    let query = `
      SELECT fg.*, r.name as product_name 
      FROM fg_lots fg
      LEFT JOIN recipes r ON fg.product_sku = r.sku
      WHERE 1=1
    `;
    const bindings = [];

    if (sku) { query += ' AND fg.product_sku = ?'; bindings.push(sku); }
    if (status) { query += ' AND fg.qa_status = ?'; bindings.push(status); }
    
    query += ' ORDER BY fg.created_at DESC';

    const { results } = await env.DB.prepare(query).bind(...bindings).all();
    return json({ lots: results });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}