// Cloudflare Pages Function: /api/sync
// Handles Edge persistence via Cloudflare D1 (SQLite) with Idempotency Keys
// and relays WMS synchronization events to Google Apps Script (GAS) Web App.

const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwBll5ZKuiBO0wX9WSXGRd-Tua4QpxbfKAcrnWhVmdkjkU_3mnwgI7bX-iiRgjHlkYa/exec';

export async function onRequestPost({ request, env }) {
  try {
    const payload = await request.json();

    // 1. Generate or extract Idempotency Key
    const idempotencyKey = payload.idempotencyKey ||
      request.headers.get('x-idempotency-key') ||
      `SYNC_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const eventType = payload.eventType || payload.type || 'WMS_STATE_SYNC';
    const payloadStr = JSON.stringify(payload);

    let d1Status = 'SKIPPED_NO_DB_BINDING';
    let isDuplicate = false;

    // 2. Persist to Cloudflare D1 SQLite if bound
    if (env && env.DB) {
      try {
        // Ensure table exists defensively
        await env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS sync_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            idempotency_key TEXT UNIQUE NOT NULL,
            event_type TEXT NOT NULL,
            payload TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            synced_to_gas INTEGER DEFAULT 0
          )
        `).run();

        // Check if event already exists
        const existing = await env.DB.prepare(
          'SELECT id, created_at, synced_to_gas FROM sync_events WHERE idempotency_key = ?'
        ).bind(idempotencyKey).first();

        if (existing) {
          isDuplicate = true;
          d1Status = 'DUPLICATE_IDEMPOTENT_IGNORED';
        } else {
          await env.DB.prepare(
            'INSERT INTO sync_events (idempotency_key, event_type, payload, synced_to_gas) VALUES (?, ?, ?, 0)'
          ).bind(idempotencyKey, eventType, payloadStr).run();
          d1Status = 'PERSISTED_TO_D1';
        }
      } catch (dbErr) {
        console.error('D1 execution warning:', dbErr);
        d1Status = `D1_ERROR: ${dbErr.message}`;
      }
    }

    // 3. Relay to Google Apps Script Web App (unless already a recorded duplicate)
    let gasResponse = null;
    let gasRelayed = false;
    if (!isDuplicate) {
      try {
        const gasFetch = await fetch(GAS_WEB_APP_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...payload,
            idempotencyKey,
            edgeServer: 'Cloudflare Pages Indangan Bodega Edge',
            edgeTimestamp: new Date().toISOString()
          })
        });
        if (gasFetch.ok) {
          gasResponse = await gasFetch.json().catch(() => ({ status: 'OK' }));
          gasRelayed = true;

          // Update D1 record with synced_to_gas = 1
          if (env && env.DB) {
            await env.DB.prepare(
              'UPDATE sync_events SET synced_to_gas = 1 WHERE idempotency_key = ?'
            ).bind(idempotencyKey).run().catch(() => {});
          }
        }
      } catch (gasErr) {
        console.warn('GAS Web App relay warning (offline/relay fallback):', gasErr.message);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      idempotencyKey,
      isDuplicate,
      d1Status,
      gasStatus: gasRelayed ? 'RELAYED' : (isDuplicate ? 'IDEMPOTENT_SKIPPED' : 'LOCAL_QUEUED'),
      syncedAt: new Date().toISOString(),
      server: 'Cloudflare Pages Worker (JJB Indangan Bodega Edge)'
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      error: err.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function onRequestGet({ env }) {
  let eventStats = { totalEvents: 0, unsyncedToGas: 0 };
  if (env && env.DB) {
    try {
      const stats = await env.DB.prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN synced_to_gas = 0 THEN 1 ELSE 0 END) as pending
        FROM sync_events
      `).first();
      if (stats) {
        eventStats = {
          totalEvents: stats.total || 0,
          unsyncedToGas: stats.pending || 0
        };
      }
    } catch {
      // Return default stats if table not yet populated
    }
  }

  return new Response(JSON.stringify({
    status: 'ONLINE',
    version: 'JJB WMS v4.6 (Cloudflare Edge)',
    facility: 'Indangan Central Plant LTO #3000013388488 & Sasa LTO #3000002291335',
    serverTime: new Date().toISOString(),
    eodCutoff: '23:45 PHT',
    d1Database: env && env.DB ? 'CONNECTED' : 'STANDALONE_LOCAL',
    eventStats
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
