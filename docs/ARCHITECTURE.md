# JJB-WMS Architecture & Data Handbook

**Document ID:** JJB-DOC-001  
**Target:** Cloudflare D1 (SQLite) & Edge Functions  
**Version:** Phase 1.5 through Phase 4.0 (Production Ready)

---

## 1. Database Architecture (Cloudflare D1)

The system relies on a relational SQLite database hosted on Cloudflare D1, scaled at the edge. It consists of **24 tables** categorized into 5 operational groups.

### 1.1 The `is_test_data` Paradigm
Every operational table includes an `is_test_data INTEGER DEFAULT 0` column. 
- When **Sandbox Mode** is enabled in the Admin Panel, the UI sets `is_test_data = 1` on all outgoing events.
- This allows testing new features on the factory floor without polluting production balances.
- The Admin Panel can execute an atomic 20-table child-first purge to remove all training data without affecting live production balances.

### 1.2 The FEFO Engine (First-Expired, First-Out)
Inventory is tracked at the lot level (`material_lots`). When a withdrawal occurs:
1. `withdrawal_items` are written to the database.
2. The sync engine decrements `material_lots.qty_sec` starting from the oldest `expiry_date`.
3. A reconciliation query runs immediately: 
   `UPDATE materials SET current_balance = COALESCE(SUM(material_lots.qty_sec), 0)`
4. This ensures the parent `materials` table always reflects the exact sum of the child lots.

### 1.3 Table Catalog Overview
| Group | Tables | Purpose |
|-------|--------|---------|
| **A (Master)** | `materials`, `material_lots`, `recipes`, `recipe_ingredients`, `suppliers`, `users` | Static data, formulas, and reference lists. |
| **B (Transactions)** | `receiving_reports`, `withdrawals`, `batch_orders`, `adjustments`, `quarantine_ncr` | Core operational headers. |
| **C (Line Items)** | `receiving_items`, `withdrawal_items`, `order_items`, `specialty_recipe_ingredients` | Detail rows that map to Master data. |
| **D (Audit)** | `audit_log`, `sync_events`, `admin_action_log` | Immutable tracking. |
| **E (Config)** | `system_config` | Global settings (e.g., EOD email recipients). |

---

## 2. The Projection Engine (`functions/api/sync.js`)

This edge function acts as the central write API. It is designed to be idempotent and fault-tolerant.

### 2.1 Shape Detection
The API accepts two JSON shapes:
- **Shape A (React):** `{ event_type, idempotency_key, payload: {} }`
- **Shape B (Kiosk):** `{ eventType, idempotencyKey, ...flatFields }`

The handler uses a robust extraction block to normalize both shapes into `type`, `key`, and `payload` variables.

### 2.2 Idempotency
Every request is saved to the `sync_events` table. If a client retries a failed request, the API detects the existing `idempotency_key` and skips double-projection, returning a `200 OK` with the cached result.

### 2.3 The Deduction Gate
**Critical Security Rule:** 
The `MATERIAL_WITHDRAWAL` event was intentionally removed from the `HANDLERS` map. 
- Outlets submit `WITHDRAWAL_REQUEST_SUBMITTED` (no-op handler, only logs to `sync_events`).
- Only the Admin (`Jade`) can trigger a `WITHDRAWAL_SAVED` event, which is the *only* event authorized to decrement `material_lots`.

---

## 3. UI Synchronization & Cross-Device Polling

The frontend uses a hybrid synchronization model because factory floor kiosks and admin desktops are often on different devices.

### 3.1 Immediate Sync (Same Browser)
- Uses `localStorage` and `BroadcastChannel`.
- When a form submits, it immediately updates React state and `localStorage`.
- Other tabs in the same browser instantly see the change.

### 3.2 Cross-Device Polling (Different Devices)
- The Main Terminal polls `GET /api/sync?since_id=N` every **12 seconds**.
- This fetches `WITHDRAWAL_REQUEST_SUBMITTED` and `BATCH_ORDER_SAVED` events from the Kiosk.
- The client stores the latest `server_max_id` in `localStorage` to prevent duplicate fetches.
- **Result:** If a phone submits an order, Jade's desktop shows a notification bell within 12 seconds.