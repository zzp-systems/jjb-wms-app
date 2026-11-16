// ──────────────────────────────────────────────────────────
// JJB WMS — Change Trail Helper
// Records field-level diffs for every CREATE/UPDATE/DELETE
// ──────────────────────────────────────────────────────────

const FIELD_LABELS = {
  materials: {
    code: 'SKU Code', name: 'Product Name', category: 'Category',
    brand: 'Brand', primary_uom: 'Primary UOM', secondary_uom: 'Secondary UOM',
    unit_cost_centavos: 'Unit Cost', is_vat_exempt: 'VAT-Exempt',
    current_balance: 'Current Balance',
  },
  suppliers: {
    name: 'Supplier Name', tin: 'TIN', is_vat_registered: 'VAT Registered',
  },
};

const CENTAVOS_FIELDS = new Set(['unit_cost_centavos', 'total_cost_centavos']);
const BOOL_FIELDS = new Set(['is_vat_exempt', 'is_vat_registered']);

export function formatValue(field, value) {
  if (value === null || value === undefined || value === '') return '(empty)';
  if (CENTAVOS_FIELDS.has(field)) {
    return '₱' + (Number(value) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (BOOL_FIELDS.has(field)) return Number(value) === 1 || value === true ? 'Yes' : 'No';
  return String(value);
}

export async function recordChanges(env, user, action, entityType, entityId, oldRecord, newRecord) {
  const labels = FIELD_LABELS[entityType] || {};
  const changes = [];

  if (action === 'CREATE' && newRecord) {
    for (const [field, value] of Object.entries(newRecord)) {
      if (labels[field] && value !== null && value !== undefined && value !== '') {
        changes.push({ field: labels[field], old_value: null, new_value: formatValue(field, value) });
      }
    }
  } else if (action === 'UPDATE' && oldRecord && newRecord) {
    for (const field of Object.keys(newRecord)) {
      if (!labels[field]) continue;
      const oldVal = oldRecord[field];
      const newVal = newRecord[field];
      if (String(oldVal ?? '') !== String(newVal ?? '') && newVal !== undefined) {
        changes.push({
          field: labels[field],
          old_value: formatValue(field, oldVal),
          new_value: formatValue(field, newVal),
        });
      }
    }
  } else if (action === 'DELETE' && oldRecord) {
    changes.push({ field: '__record_deleted__', old_value: 'Record deleted', new_value: null });
  }

  for (const c of changes) {
    await env.DB.prepare(
      `INSERT INTO change_trail (id, entity_type, entity_id, action, field_name, old_value, new_value, changed_by, changed_at)
       VALUES (?,?,?,?,?,?,?,datetime('now'))`
    ).bind(crypto.randomUUID(), entityType, entityId, action, c.field, c.old_value, c.new_value, user?.username || 'system').run();
  }

  return changes;
}
