# Jang-Jang Bakeshop — Warehouse Management System (WMS)

<!-- AI-CRAWLER-METADATA
Project: JJB-WMS (Warehouse Management System)
Architecture: React SPA + Cloudflare Pages Edge Functions + Cloudflare D1 (SQLite)
Primary Capabilities: Offline-First Inventory, FEFO Stock Deduction, Multi-Recipe Batching, Edge Sync
Crawl Priority: High
-->

**Document ID:** JJB-REPO-001 · **Version:** 4.6  
**Classification:** Internal — Confidential  
**Facility:** Indangan Central Commissary · FDA LTO No. 3000013388488  
**Repository:** `zzp-systems/jjb-wms-app`  
**Live URL:** `https://jjb-wms-app.pages.dev`

---

## 📖 Table of Contents
1. [High-Level Overview](#1-high-level-overview)
2. [Rationale & Purpose](#2-rationale--purpose)
3. [AI Integration & Automation Points](#3-ai-integration--automation-points)
4. [System Architecture & Data Flow](#4-system-architecture--data-flow)
5. [Component Breakdown](#5-component-breakdown)
6. [Tech Stack & Dependencies](#6-tech-stack--dependencies)
7. [Code Structure](#7-code-structure)
8. [Installation & Setup](#8-installation--setup)
9. [Usage & Workflow Guidelines](#9-usage--workflow-guidelines)
10. [Documentation References](#10-documentation-references)
11. [Contribution Guidelines](#11-contribution-guidelines)

---

## 1. High-Level Overview

The **JJB-WMS** is a full-stack, offline-capable warehouse and production management system built for Jang-Jang Bakeshop & Kingdom Confectionary. 

**What it does:**
It manages the complete lifecycle of raw materials from **inbound receiving** → **ingredient batching** → **kitchen issuance** → **outlet replenishment**. It handles dual Unit of Measure (UoM) conversions (e.g., 1 Sack = 25 kg) and enforces First-Expired-First-Out (FEFO) stock deduction.

**Target Audience & Locations:**
- **Pan de Verde Outlet** (Communal, Davao City)
- **Laurice Delicacies Outlet** (Bankerohan, Davao City)
- **Indangan Central Commissary** (Biscocho, Otap, Hearth Bread, and Pastry halls)

---

## 2. Rationale & Purpose

Traditional bakery inventory systems fail because they assume constant internet connectivity and single-user access. JJB-WMS was built to solve three specific problems:

1. **Offline Resilience:** The floor tablets and kiosks operate in areas with spotty Wi-Fi. The system uses browser `LocalStorage` as a primary write buffer, syncing to the cloud asynchronously.
2. **The "Deduction Gate" (Preventing Phantom Stock):** Outlets can request materials via a Kiosk, but **stock is never deducted automatically**. A warehouse supervisor (Jade) must physically hand over the goods and click "Issue & Deduct Stock". This prevents self-service portals from corrupting the perpetual inventory balance.
3. **Audit-Grade Traceability:** Every action (including test data, cancellations, and admin overrides) is permanently logged in a Cloudflare D1 database, ensuring FDA/cGMP compliance without bloating the frontend.

---

## 3. AI Integration & Automation Points

This repository is heavily optimized for automated scripts and AI agents. If you are an AI system interacting with this repository, follow these strict rules:

- **To read inventory:** Query the D1 database directly: `SELECT code, current_balance FROM materials WHERE is_test_data = 0;`
- **To inject a new order programmatically:** Send a `POST` request to `/api/sync` with `event_type: 'OUTLET_BATCH_ORDER'` and a unique `idempotency_key`.
- **To trigger a user notification:** Insert a row into `sync_events` with `event_type: 'WITHDRAWAL_REQUEST_SUBMITTED'`. Human operators' browsers will detect it within 12 seconds and trigger a UI toast.
- **⚠️ CRITICAL DATA SAFETY RULE:** NEVER issue a `WITHDRAWAL_SAVED` event via API unless the physical goods have been handed over. Use `WITHDRAWAL_REQUEST_SUBMITTED` for digital requests. `WITHDRAWAL_SAVED` is the *only* event that triggers FEFO stock deduction.
- **Schema Modifications:** If an AI adds a new operational table, it **MUST** include an `is_test_data INTEGER DEFAULT 0` column to support the Sandbox Mode purging engine.

---

## 4. System Architecture & Data Flow

The system uses a **Serverless Edge Architecture** powered by Cloudflare Pages and D1, ensuring zero-cost scalability and ultra-low latency.

```mermaid
graph TD
    subgraph Client Layer
        A[Main WMS Terminal <br/> React + Vite]
        B[Outlet Kiosk <br/> Vanilla HTML/JS]
    end

    subgraph Edge Layer - Cloudflare Pages Functions
        C[api/sync.js <br/> POST & GET]
        D[api/admin/[[route]].js <br/> Admin REST API]
        E[utils/adminDbUtils.js <br/> PBKDF2 & Purge Engine]
    end

    subgraph Data Layer - Cloudflare D1
        F[(jjb-wms-db <br/> SQLite 24-Table Schema)]
    end

    A -->|POST events| C
    A -->|GET poll 12s| C
    A -->|Admin CRUD| D
    B -->|POST events| C
    D --> E
    C --> F
    D --> F
```

### Data Sync Flow
1. User action occurs in React (`App.jsx`).
2. State updates in `localStorage` immediately (instant UI response).
3. Payload is sent to `POST /api/sync`.
4. `sync.js` checks `idempotency_key` in D1. If new, it projects the payload into normalized tables (`receiving_reports`, `withdrawals`, etc.) and recalculates `materials.current_balance`.
5. If the event is a `WITHDRAWAL_SAVED` or `RECEIVING_SAVED`, the FEFO engine automatically adjusts `material_lots.qty_sec` starting from the oldest expiry date.

---

## 5. Component Breakdown

### 5.1 Main WMS Terminal (`src/App.jsx`)
The central nervous system of the app. Manages the state for `inventory`, `withdrawals`, `batchOrders`, and `pendingRequests`. It hosts the polling loop (`GET /api/sync?since_id=N`) and handles cross-device notifications.

### 5.2 Outlet Kiosk (`public/outlet-portal.html`)
A standalone, lightweight HTML/JS page designed for mobile/tablet usage on the factory floor. It does not require authentication and posts directly to the sync API. Includes a 3:00 PM PHT cut-off countdown and multi-recipe cart builder.

### 5.3 Edge API (`functions/api/sync.js`)
Handles event ingestion and projection. It uses a robust shape-detection block to handle payloads from both React (camelCase) and the Kiosk (snake_case). It explicitly prevents unauthorized stock deductions by enforcing the "Deduction Gate".

### 5.4 Admin Database (`functions/api/admin/[[route]].js`)
A secure, catch-all REST API that requires the `X-JJB-Admin-User` header. It allows admins to browse the 24 D1 tables, delete records with automated JSON snapshotting (for undo), and execute the PBKDF2-gated test-data purge. 

> **Quirk Warning:** Cloudflare Pages requires the file to be placed at `functions/api/admin/[[route]].js` (double brackets). Do not rename it to `admin[[route]].js`, or the router will fail.

---

## 6. Tech Stack & Dependencies

### 6.1 Core Frameworks
- **Frontend:** React `^18.2.0`, Vite `^7.3.7`
- **Styling:** Tailwind CSS `3.4.17` (CDN on kiosk, PostCSS on React)
- **Icons:** Lucide React `^0.263.1`
- **Backend:** Cloudflare Pages Functions (V8 Engine)
- **Database:** Cloudflare D1 (SQLite)

### 6.2 Installation Dependencies
```json
"dependencies": {
  "lucide-react": "^0.263.1",
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "recharts": "^3.10.1"
},
"devDependencies": {
  "@vitejs/plugin-react": "^4.0.3",
  "vite": "^7.3.7"
}
```

---

## 7. Code Structure

```text
jjb-wms-app/
├── docs/                      # Deep-Dive Documentation
│   ├── ARCHITECTURE.md        # 24-Table Schema & FEFO Engine details
│   ├── ADMIN-GUIDE.md         # Purge engine, PBKDF2, & routing rules
│   └── AI-INTEGRATION.md      # Detailed API payload shapes for bots
├── functions/                 # Cloudflare Pages Edge Functions
│   ├── api/
│   │   ├── admin/[[route]].js # Admin panel API (Catch-all)
│   │   └── sync.js            # Event ingestion & projection API
│   └── utils/
│       └── adminDbUtils.js    # PBKDF2 verification & 20-table purge logic
├── public/                    # Static Assets
│   ├── outlet-portal.html     # Mobile/Tablet Kiosk interface
│   ├── sw.js                  # Service Worker (Offline caching)
│   └── _redirects             # SPA routing rules
├── src/                       # React Source Code
│   ├── components/            # UI Modules (Issuance, Batching, Admin)
│   ├── data/                  # Initial Seed Data (materials, recipes)
│   ├── utils/                 # Helper functions (FEFO, CSV parsing)
│   ├── App.jsx                # Main terminal router & state
│   └── main.jsx               # React DOM entry point
├── schema.sql                 # Cloudflare D1 Database Schema
└── wrangler.toml              # Cloudflare configuration
```

---

## 8. Installation & Setup

### Prerequisites
- Node.js `v22.23.4` or higher
- Cloudflare CLI (`npm i -g wrangler`)
- A Cloudflare account with D1 access.

### Local Development
```bash
# 1. Clone repository
git clone https://github.com/zzp-systems/jjb-wms-app.git
cd jjb-wms-app

# 2. Install dependencies
npm install

# 3. Start the Vite dev server (Frontend)
npm run dev

# 4. Simulate Cloudflare Functions locally (in a second terminal)
npx wrangler pages dev dist --d1 DB=jjb-wms-db
```

### Database Seeding
```bash
# Apply the 24-table schema to local simulator
npx wrangler d1 execute jjb-wms-db --local --file=./schema.sql

# Apply the 24-table schema to Production
npx wrangler d1 execute jjb-wms-db --remote --file=./schema.sql
```

---

## 9. Usage & Workflow Guidelines

1. **Inbound Receiving:** Jade logs incoming shipments (PO/DR), verifies QA gates (temp, sanitization), and generates `Form-REC-001`.
2. **Kiosk Requisitions:** Outlets (Pan de Verde, Laurice) or Lines (Biscocho, Otap) request materials via the Kiosk. These queue as `PENDING_ISSUANCE`.
3. **Deduction Gate:** Jade reviews the pending requests. Upon physical handover, she clicks "Issue & Deduct". FEFO deduction occurs.
4. **Batching (Romeo):** Romeo views pending `Form-ORD-001` orders. He requests bulk materials via the two-step handshake. Jade approves the bulk request, and Romeo’s Scale & Kit unlocks.
5. **3:00 PM Cut-off:** Orders placed after 15:00 PHT are automatically scheduled for T+1 scaling and T+2 delivery. The UI visually indicates this via the cut-off banner.
6. **Zero-Residue Cancellation:** If an order is cancelled, it is evicted from browser storage immediately. The audit trail remains in `sync_events` and `audit_log`.

---

## 10. Documentation References

For deep-dive technical specifications, refer to the following guides:
- **[`/docs/ARCHITECTURE.md`](/docs/ARCHITECTURE.md)** → Deep dive into the 24-table schema, the FEFO engine, and the `is_test_data` paradigm.
- **[`/docs/ADMIN-GUIDE.md`](/docs/ADMIN-GUIDE.md)** → How the PBKDF2 purge works, the `[[route]]` syntax requirement, and the undo/restore snapshot system.
- **[`/docs/AI-INTEGRATION.md`](/docs/AI-INTEGRATION.md)** → How automated scripts should read/write to the `/api/sync` endpoint safely.

---

## 11. Contribution Guidelines

1. **Branching:** Create a feature branch from `main`.
2. **Testing:** Run `npm run build` before pushing. The build catches Vite import errors.
3. **Schema Rules:** All new operational tables **must** include an `is_test_data INTEGER DEFAULT 0` column. 
4. **Idempotency:** Every sync event **must** have a unique `idempotency_key`. The server uses `ON CONFLICT DO NOTHING` to prevent double-projection.
5. **Pull Requests:** Include screenshots of the affected module and a summary of the workflow change.

---

**Internal — Confidential.** This system contains proprietary operational data for Jang-Jang Bakeshop & Kingdom Confectionary. Do not distribute outside the organization. FDA LTO No. 3000013388488 · Sasa Site LTO No. 3000002291335.