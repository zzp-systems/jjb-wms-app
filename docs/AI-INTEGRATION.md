# JJB-WMS AI Integration Protocol

**Document ID:** JJB-DOC-003  
**Target:** Automated Bots, Web Scrapers, LLM Agents

---

## 1. Overview

The JJB-WMS is designed to be highly readable by automated agents. Any external script interacting with the system should use the central sync API: 
`POST /api/sync`

---

## 2. Reading System State

AI agents should **not** attempt to scrape the React UI. They should query the data directly.

### 2.1 Reading Inventory
Use the Cloudflare D1 API or SQL console:
```sql
SELECT code, name, current_balance, primary_uom 
FROM materials 
WHERE is_test_data = 0;
```

### 2.2 Reading Active Orders
```sql
SELECT order_id, recipe_name, requested_qty_pcs, status 
FROM batch_orders 
WHERE is_test_data = 0 AND status != 'RELEASED';
```

---

## 3. Writing Data Safely

If an AI needs to inject an order or trigger a notification, it must POST to `/api/sync`.

### 3.1 The Payload Shape
Every POST must include:
- `event_type`: The action being performed (e.g., `OUTLET_BATCH_ORDER`).
- `idempotency_key`: A unique string (UUID or timestamp) to prevent double-processing.
- `payload`: The actual data payload.

### 3.2 Safe vs Unsafe Events

| Event Type | Safe for AI? | Description |
|------------|--------------|-------------|
| `WITHDRAWAL_REQUEST_SUBMITTED` | ✅ **SAFE** | Queues a request for Jade. Does not deduct stock. |
| `OUTLET_BATCH_ORDER` | ✅ **SAFE** | Queues a batch order for Romeo. |
| `SPECIALTY_PROPOSAL_CREATED` | ✅ **SAFE** | Proposes a new recipe for QA review. |
| `WITHDRAWAL_SAVED` | ❌ **UNSAFE** | **DEDUCTS STOCK.** Only allowed via the authenticated Admin UI. |
| `RECEIVING_SAVED` | ❌ **UNSAFE** | **ADDS STOCK.** Only allowed via the authenticated Admin UI. |

---

## 4. Example cURL Request

To inject a new batch order request from an external script:

```bash
curl -X POST https://jjb-wms-app.pages.dev/api/sync \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "OUTLET_BATCH_ORDER",
    "idempotency_key": "ai-bot-order-20261111-001",
    "payload": {
      "orderId": "ORD-BOT-001",
      "outletName": "Pan de Verde Outlet",
      "recipeSku": "BRD-PAN-6KG",
      "recipeName": "Classic Pandesal – 6.0 kg",
      "requestedQtyPcs": 170,
      "batchMultiplier": 1.0,
      "requisitionedBy": "AI Auto-Replenish Bot",
      "status": "PENDING_BATCHING"
    }
  }'
```

After this request, Romeo's Batching Workbench will display the order within 12 seconds (via the polling loop).