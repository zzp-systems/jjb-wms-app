# JJB-WMS Admin Guide & Maintenance

**Document ID:** JJB-DOC-002  
**Target:** Systems Director (Zaphyr) & Head of Admin (Angelina)

---

## 1. Admin API Routing Syntax

**Important:** The admin API must be placed at `functions/api/admin/[[route]].js`.
- Cloudflare Pages Functions uses `[[route]]` as a wildcard catch-all.
- If placed directly as `admin[[route]].js` in the `api` folder, the router fails to match `/api/admin/...` paths and will return a 404.

---

## 2. Authentication & Authorization

The Admin API is strictly gated. It requires the following HTTP header on every request:
`X-JJB-Admin-User: <username_or_id>`

The API checks the `users` table to verify that the requesting user has `can_delete_test_data = 1` in their role. If not, the request is rejected with a `403 Forbidden`.

---

## 3. Test Data Purging (The 20-Table Engine)

The system allows for comprehensive sandbox testing via the `is_test_data = 1` flag. To clean up this test data, the Admin Panel provides a "Purge Test Data" button.

### 3.1 The PBKDF2 Password Gate
Because this action is irreversible, the Admin must re-enter their password or 4-digit shift PIN. The system uses PBKDF2 (100,000 iterations, SHA-256) to verify the password against the hash in the database.

### 3.2 The Purge Execution
The purge is executed via `executePurgeTestDataBatch()` in `functions/utils/adminDbUtils.js`. 
- It executes a `db.batch()` containing 20 sequential `DELETE` statements.
- **Order matters:** It deletes from the most dependent child tables (e.g., `order_items`) up to parent tables (e.g., `materials`) to avoid foreign key constraint errors.
- Finally, it recalculates the FEFO balance to remove any orphaned test lots.

---

## 4. Admin Action Log & Undo

Every row deletion or test-flag toggle generates an entry in the `admin_action_log` table.

### 4.1 Single-Row Delete Snapshots
When an admin deletes a single row (e.g., a specific withdrawal slip), the API does not just delete it. It captures the entire row and its child rows as a JSON snapshot:
`{ table: 'withdrawals', row: {...}, children: { childTable: 'withdrawal_items', rows: [...] } }`

### 4.2 Restore Row
If a row was deleted by mistake, an admin can click "Restore" in the Admin Panel.
- The API reads the snapshot from `admin_action_log`.
- It uses `INSERT OR REPLACE` to re-insert the parent row and all child rows back into the database.
- It runs the FEFO reconciliation engine immediately to ensure inventory balances are correct.