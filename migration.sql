-- ──────────────────────────────────────────────────────────
-- JJB WMS — Sync Migration
-- Run: npx wrangler d1 execute jjb-wms-db --remote --file=migration.sql
--
-- Adds crm_account_id column to outlets so CRM accounts
-- can be linked to WMS outlets for bi-directional sync.
-- ──────────────────────────────────────────────────────────

-- Add CRM account ID column to outlets (nullable — existing rows stay NULL)
ALTER TABLE outlets ADD COLUMN crm_account_id TEXT;

-- Index for fast lookups when CRM pushes account updates
CREATE INDEX IF NOT EXISTS idx_outlets_crm_account_id ON outlets(crm_account_id);
