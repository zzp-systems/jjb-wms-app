// ───────────────────────────────────────────────────────────
// JJB WMS — Receiving → ARAP Sync Endpoint (v2: VAT/EWT)
// Paste as: jjb-wms-app/functions/api/receiving-sync.js
//
// Called by the WMS frontend (ReceivingModule.jsx) after a
// receiving report is marked complete. Forwards the receiving
// data to z-books-systems to auto-create an AP invoice + GL entry.
//
// v2: Passes supplier TIN, is_vat_supplier, and EWT ATC code
//     so ARAP can auto-compute Input VAT and EWT.
//
// Route: POST /api/receiving-sync
// Auth: JWT (handled by WMS _middleware.js — this is a frontend-facing endpoint)
//
// REQUIRED: Set these secrets in the WMS Pages project:
//   npx wrangler pages secret put ARAP_API_URL    (e.g., https://z-books-systems.pages.dev)
//   npx wrangler pages secret put SYNC_API_KEY    (shared with CRM + ARAP)
// ───────────────────────────────────────────────────────────

export async function onRequestPost({ request, env, data }) {
  const body = await request.json();

  // Validate required fields
  if (!body.receiving_id || !body.supplier_name) {
    return json({ error: 'receiving_id and supplier_name are required' }, 400);
  }

  const arapUrl = env.ARAP_API_URL;
  const syncKey = env.SYNC_API_KEY;

  if (!arapUrl) {
    return json({ error: 'ARAP_API_URL not configured. Run: wrangler pages secret put ARAP_API_URL' }, 500);
  }

  // ── Build the AP invoice payload for ARAP (v2 with tax fields) ──
  // ARAP will auto-create:
  //   VAT Supplier:    Debit 5000 COGS + 1160 Input VAT / Credit 2000 AP + 2110 EWT Payable
  //   Non-VAT Supplier: Debit 5000 COGS / Credit 2000 AP (no VAT, no EWT)
  const apPayload = {
    idempotency_key: `wms-receiving-${body.receiving_id}`,
    po: {
      supplier_name: body.supplier_name,
      supplier_id: body.supplier_id || null,
      supplier_tin: body.supplier_tin || null,
      // ── v2: VAT status of supplier ──
      // 1 = VAT-registered (flour, packaging, utilities, equipment)
      // 0 = Non-VAT (farmers, wet-market suppliers of raw agricultural goods)
      is_vat_supplier: body.is_vat_supplier !== undefined ? (body.is_vat_supplier ? 1 : 0) : 1,
      // ── v2: EWT ATC code ──
      // WC158 = 1% Goods (default), WC160 = 2% Services (pest control, maintenance)
      ewt_atc_code: body.ewt_atc_code || 'WC158',
      // ──
      wms_receiving_id: body.receiving_id,
      // Amount in centavos (WMS stores centavos) — pass through directly
      amount: body.total_amount || 0,
      // If WMS provides explicit vatable purchase (net of VAT), pass it
      vatable_purchase_centavos: body.vatable_purchase_centavos || 0,
      input_vat_centavos: body.input_vat_centavos || 0,
      invoice_date: body.invoice_date || new Date().toISOString().slice(0, 10),
      due_date: body.due_date || body.invoice_date || new Date().toISOString().slice(0, 10),
    },
  };

  // ── Call ARAP /api/sync/wms-po ──
  try {
    const arapRes = await fetch(`${arapUrl}/api/sync/wms-po`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Key': syncKey || '',
      },
      body: JSON.stringify(apPayload),
    });

    if (!arapRes.ok) {
      const err = await arapRes.text();
      return json({ error: `ARAP rejected AP invoice: ${err}` }, 502);
    }

    const arapData = await arapRes.json();

    // ── Log sync event in WMS sync_events table ──
    try {
      await env.DB.prepare(
        'INSERT INTO sync_events (idempotency_key, event_type, payload) VALUES (?,?,?)'
      ).bind(
        `wms-receiving-${body.receiving_id}`,
        'RECEIVING_PUSHED_TO_ARAP',
        JSON.stringify({
          ap_invoice_number: arapData.invoice_number,
          ap_invoice_id: arapData.invoice_id,
          is_vat_supplier: apPayload.po.is_vat_supplier,
          ewt_atc_code: apPayload.po.ewt_atc_code,
        })
      ).run();
    } catch {
      // sync_events table might not exist or payload column constraints — non-fatal
    }

    return json({
      success: true,
      ap_invoice_number: arapData.invoice_number,
      ap_invoice_id: arapData.invoice_id,
    });
  } catch (e) {
    return json({ error: `ARAP sync failed: ${e.message}` }, 502);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
