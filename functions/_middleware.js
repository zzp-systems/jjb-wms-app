// ── JJB WMS Pages Functions Middleware ──
// CORS + JWT auth for all /api/* routes
// Public routes (no auth): /api/auth/login
// Sync routes use X-Sync-Key (handled inside sync handlers)

import { verifyJWT, getTokenFromRequest } from './api/_jwt.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Sync-Key',
};

const PUBLIC_ROUTES = ['/api/auth/login'];

// Sync routes — handler does its own X-Sync-Key auth.
// /api/receiving-sync and /api/delivery-sync were present pre-Batch-4.
// Batch 4 removed them; that removal regresses the case where those
// handlers accept X-Sync-Key server-to-server calls. They are restored
// here pending handler verification. Once verified, they can be removed
// to force JWT (which populates context.data.user for those routes).
const SYNC_ROUTES = ['/api/sync', '/api/receiving-sync', '/api/delivery-sync'];

// Strict prefix matcher: /api/sync matches /api/sync and /api/sync/...,
// but NOT /api/syncfoo or /api/sync-evil.
function matchesRoute(path, routes) {
  for (const r of routes) {
    if (path === r || path.startsWith(r + '/')) return true;
  }
  return false;
}

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (PUBLIC_ROUTES.includes(path)) {
    const res = await next();
    res.headers.set('Access-Control-Allow-Origin', '*');
    return res;
  }

  if (matchesRoute(path, SYNC_ROUTES)) {
    const res = await next();
    res.headers.set('Access-Control-Allow-Origin', '*');
    return res;
  }

  if (path.startsWith('/api/')) {
    const token = getTokenFromRequest(request);
    const payload = await verifyJWT(token, env.JWT_SECRET);
    if (!payload) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }
    context.data = { user: payload };
  }

  const res = await next();
  res.headers.set('Access-Control-Allow-Origin', '*');
  return res;
}