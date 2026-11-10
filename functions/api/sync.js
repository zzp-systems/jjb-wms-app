// ============================================================================
// JJB WMS — /api/sync  (Phase 1.5 projection + Phase 2.5/2.6 polling + Phase 3 Cutoff)
// ============================================================================

// --------------------------- helpers -------------------------------------
const str = v => (v === null || v === undefined ? null : String(v));
const num = v => { const n = Number(v); return Number.isFinite(n) ? n : null; };
const cents = v => { const n = Number(v); return Number.isFinite(n) ? Math.round(n * 100) : null; };
const isoDate = v => (v ? String(v).slice(0, 10) : null);
const bool = v => (v ? 1 : 0);
const pick = (o, ...keys) => {
  for (const k of keys) if (o && o[k] != null) return o[k];
  return undefined;
};
const asTest = v => (v === true || v === 1 || v === '1' || v === 'true') ? 1 : 0;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function phtDate(ts) {
  if (!ts) return null;
  const s = String(ts);
  if (s.endsWith('Z')) {
    const d = new Date(s);
    if (isNaN(d)) return s.slice(0, 10);
    return new Date(d.getTime() + 8 * 3600 * 1000).toISOString().slice(0, 10);
  }
  return s.slice(0, 10);
}
function phtTime(ts) {
  if (!ts) return null;
  const s = String(ts);
  if (s.endsWith('Z')) {
    const d = new Date(s);
    if (isNaN(d)) return null;
    return new Date(d.getTime() + 8 * 3600 * 1000).toISOString().slice(11, 19);
  }
  const m = s.match(/[\sT](\d{2}:\d{2}(?::\d{2})?)/);
  return m ? m[1] : null;
}

// --------------------------- projection handlers -------------------------
function projectReceiving(env, p, isTest) {
  const stmts = [];
  const reportNo = pick(p, 'reportNo', 'report_no');
  if (!reportNo) throw new Error('MISSING_REPORT_NO');

  const items = p.items || p.lines || [];
  if (items.length === 0) throw new Error('NO_LINE_ITEMS');

  stmts.push(env.DB.prepare(`
    INSERT INTO receiving_reports
      (report_no, po_no, supplier, total_paid_centavos, received_by,
       received_date, received_time, is_test_data)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(report_no) DO UPDATE SET
      po_no=excluded.po_no, supplier=excluded.supplier,
      total_paid_centavos=excluded.total_paid_centavos,
      received_by=excluded.received_by, received_date=excluded.received_date,
      received_time=excluded.received_time, is_test_data=excluded.is_test_data,
      updated_at=datetime('now')
  `).bind(
    reportNo, str(pick(p, 'poNo', 'po_no')), str(p.supplier),
    cents(pick(p, 'totalPaid', 'total_paid')),
    str(pick(p, 'receivedBy', 'received_by')),
    isoDate(pick(p, 'date', 'receivedDate', 'received_date')) || phtDate(p.timestamp),
    str(pick(p, 'time', 'receivedTime', 'received_time')) || phtTime(p.timestamp),
    isTest
  ));

  stmts.push(env.DB.prepare(`DELETE FROM receiving_items WHERE report_no = ?`).bind(reportNo));

  for (const item of items) {
    const materialCode = pick(item, 'materialCode', 'material_code', 'code');
    if (!materialCode) continue;

    stmts.push(env.DB.prepare(`
      INSERT INTO receiving_items
        (report_no, material_code, material_name_snapshot, lot_number, expiry_date,
         secondary_qty, bin_location, unit_cost_centavos, is_test_data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      reportNo, materialCode, str(pick(item, 'name', 'materialName')),
      str(pick(item, 'lotNumber', 'lot_number')),
      isoDate(pick(item, 'expiryDate', 'expiry_date')),
      num(pick(item, 'secondaryQty', 'qty')),
      str(pick(item, 'binLocation', 'bin_location')),
      cents(pick(item, 'unitCost', 'unit_cost')), isTest
    ));

    const lotNo = pick(item, 'lotNumber', 'lot_number');
    const qty = num(pick(item, 'secondaryQty', 'qty')) || 0;
    if (lotNo && qty) {
      stmts.push(env.DB.prepare(`
        INSERT INTO material_lots (material_code, lot_number, expiry_date, qty_sec, location, is_test_data)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(material_code, lot_number) DO UPDATE SET
          qty_sec = qty_sec + excluded.qty_sec, updated_at = datetime('now')
      `).bind(
        materialCode, lotNo, isoDate(pick(item, 'expiryDate', 'expiry_date')),
        qty, str(pick(item, 'binLocation', 'bin_location')), isTest
      ));
    }
  }
  return stmts;
}

function projectWithdrawal(env, p, isTest) {
  const stmts = [];
  const slipNo = pick(p, 'slipNo', 'slip_no', 'issuanceSlipNumber', 'issuance_slip_number');
  if (!slipNo) throw new Error('MISSING_SLIP_NO');

  const items = p.items || p.lines || [];
  if (items.length === 0) throw new Error('NO_LINE_ITEMS');

  stmts.push(env.DB.prepare(`
    INSERT INTO withdrawals
      (slip_no, withdrawal_date, withdrawal_time, requesting_entity, department,
       purpose, requested_by, issued_by, received_by, total_cost_centavos,
       status, notes, source_channel, is_test_data)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(slip_no) DO UPDATE SET
      withdrawal_date=excluded.withdrawal_date, withdrawal_time=excluded.withdrawal_time,
      requesting_entity=excluded.requesting_entity, department=excluded.department,
      purpose=excluded.purpose, requested_by=excluded.requested_by,
      issued_by=excluded.issued_by, received_by=excluded.received_by,
      total_cost_centavos=excluded.total_cost_centavos, status=excluded.status,
      notes=excluded.notes, source_channel=excluded.source_channel,
      is_test_data=excluded.is_test_data, updated_at=datetime('now')
  `).bind(
    slipNo,
    isoDate(pick(p, 'date', 'withdrawalDate', 'withdrawal_date')) || phtDate(p.timestamp),
    str(pick(p, 'time', 'withdrawalTime', 'withdrawal_time')) || phtTime(p.timestamp),
    str(pick(p, 'requestingEntity', 'requesting_entity')),
    str(p.department), str(p.purpose),
    str(pick(p, 'requestedBy', 'requested_by')),
    str(pick(p, 'issuedBy', 'issued_by')),
    str(pick(p, 'receivedBy', 'received_by')),
    cents(pick(p, 'totalCost', 'total_cost')),
    str(p.status), str(p.notes),
    str(pick(p, 'sourceChannel', 'source_channel')), isTest
  ));

  stmts.push(env.DB.prepare(`DELETE FROM withdrawal_items WHERE slip_no = ?`).bind(slipNo));

  for (const item of items) {
    const materialCode = pick(item, 'materialCode', 'material_code', 'code');
    if (!materialCode) continue;

    stmts.push(env.DB.prepare(`
      INSERT INTO withdrawal_items
        (slip_no, material_code, name_snapshot, qty_requested_sec, qty_issued_sec,
         secondary_uom, lot_number, storage_room, estimated_cost_centavos, remarks, is_test_data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      slipNo, materialCode, str(pick(item, 'name', 'materialName')),
      num(pick(item, 'qtyRequestedSec', 'qty_requested_sec', 'qtyRequested')),
      num(pick(item, 'qtyIssuedSec', 'qty_issued_sec', 'qtyIssued')),
      str(pick(item, 'secondaryUom', 'secondary_uom')),
      str(pick(item, 'lotNumber', 'lot_number')),
      str(pick(item, 'storageRoom', 'storage_room')),
      cents(pick(item, 'estimatedCost', 'estimated_cost')),
      str(item.remarks), isTest
    ));

    const lotNo = pick(item, 'lotNumber', 'lot_number');
    const qty = num(pick(item, 'qtyIssuedSec', 'qty_issued_sec', 'qtyIssued')) || 0;
    if (lotNo && qty) {
      stmts.push(env.DB.prepare(`
        UPDATE material_lots SET qty_sec = qty_sec - ?, updated_at = datetime('now')
        WHERE material_code = ? AND lot_number = ? AND is_test_data = ?
      `).bind(qty, materialCode, lotNo, isTest));
    }
  }
  return stmts;
}

function projectAdjustment(env, p, isTest) {
  const stmts = [];
  const materialCode = pick(p, 'materialCode', 'material_code');
  if (!materialCode) throw new Error('MISSING_MATERIAL_CODE');

  const type = String(p.type || p.adjustmentType || '').toUpperCase();
  const qty = num(pick(p, 'qtySec', 'qty_sec')) || 0;
  const signed = type === 'OUT' ? -qty : qty;

  stmts.push(env.DB.prepare(`
    INSERT INTO adjustments
      (material_code, material_name_snapshot, adjustment_type, qty_sec, uom,
       reason, adjusted_by, adjusted_at, notes, is_test_data)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    materialCode, str(pick(p, 'materialName', 'name')), type || null, qty,
    str(p.uom), str(p.reason),
    str(pick(p, 'adjustedBy', 'adjusted_by')),
    str(pick(p, 'adjustedAt', 'adjusted_at')) || str(p.timestamp),
    str(p.notes), isTest
  ));

  if (signed !== 0) {
    const syntheticLot = `ADJ-${p.id || p.adjustmentId || Date.now()}`;
    stmts.push(env.DB.prepare(`
      INSERT INTO material_lots (material_code, lot_number, expiry_date, qty_sec, location, is_test_data)
      VALUES (?, ?, NULL, ?, 'ADJUSTMENT', ?)
      ON CONFLICT(material_code, lot_number) DO UPDATE SET
        qty_sec = qty_sec + excluded.qty_sec, updated_at = datetime('now')
    `).bind(materialCode, syntheticLot, signed, isTest));
  }
  return stmts;
}

function projectBatchOrder(env, p, isTest) {
  const orderId = pick(p, 'orderId', 'order_id');
  if (!orderId) throw new Error('MISSING_ORDER_ID');

  // We use COALESCE heavily so that if a payload from a partial update (e.g. releasing)
  // omits fields, the existing values in D1 are NOT overwritten with NULL.
  return [env.DB.prepare(`
    INSERT INTO batch_orders
      (order_id, outlet_name, recipe_sku, recipe_name_snapshot, requested_qty_pcs,
       batch_multiplier, status, bulk_request_status, bulk_requisition_slip_no,
       bulk_requested_at, bulk_approved_at, bulk_approved_by, batch_tag_id,
       actual_batched_kg, actual_batched_units, batched_at, batched_by,
       scale_used, sifter_40mesh_checked, released_at, released_to,
       scheduled_scaling_date, scheduled_delivery_date, is_after_cutoff, 
       cutoff_status_label, group_order_ref, estimated_cost, notes, is_test_data)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(order_id) DO UPDATE SET
      outlet_name              = COALESCE(excluded.outlet_name,              batch_orders.outlet_name),
      recipe_sku               = COALESCE(excluded.recipe_sku,               batch_orders.recipe_sku),
      recipe_name_snapshot     = COALESCE(excluded.recipe_name_snapshot,     batch_orders.recipe_name_snapshot),
      requested_qty_pcs        = COALESCE(excluded.requested_qty_pcs,        batch_orders.requested_qty_pcs),
      batch_multiplier         = COALESCE(excluded.batch_multiplier,         batch_orders.batch_multiplier),
      status                   = COALESCE(excluded.status,                   batch_orders.status),
      bulk_request_status      = COALESCE(excluded.bulk_request_status,      batch_orders.bulk_request_status),
      bulk_requisition_slip_no = COALESCE(excluded.bulk_requisition_slip_no, batch_orders.bulk_requisition_slip_no),
      bulk_requested_at        = COALESCE(excluded.bulk_requested_at,        batch_orders.bulk_requested_at),
      bulk_approved_at         = COALESCE(excluded.bulk_approved_at,         batch_orders.bulk_approved_at),
      bulk_approved_by         = COALESCE(excluded.bulk_approved_by,         batch_orders.bulk_approved_by),
      batch_tag_id             = COALESCE(excluded.batch_tag_id,             batch_orders.batch_tag_id),
      actual_batched_kg        = COALESCE(excluded.actual_batched_kg,        batch_orders.actual_batched_kg),
      actual_batched_units     = COALESCE(excluded.actual_batched_units,     batch_orders.actual_batched_units),
      batched_at               = COALESCE(excluded.batched_at,               batch_orders.batched_at),
      batched_by               = COALESCE(excluded.batched_by,               batch_orders.batched_by),
      scale_used               = COALESCE(excluded.scale_used,               batch_orders.scale_used),
      sifter_40mesh_checked    = COALESCE(excluded.sifter_40mesh_checked,    batch_orders.sifter_40mesh_checked),
      released_at              = COALESCE(excluded.released_at,              batch_orders.released_at),
      released_to              = COALESCE(excluded.released_to,              batch_orders.released_to),
      scheduled_scaling_date   = COALESCE(excluded.scheduled_scaling_date,   batch_orders.scheduled_scaling_date),
      scheduled_delivery_date  = COALESCE(excluded.scheduled_delivery_date,  batch_orders.scheduled_delivery_date),
      is_after_cutoff          = COALESCE(excluded.is_after_cutoff,          batch_orders.is_after_cutoff),
      cutoff_status_label      = COALESCE(excluded.cutoff_status_label,      batch_orders.cutoff_status_label),
      group_order_ref          = COALESCE(excluded.group_order_ref,          batch_orders.group_order_ref),
      estimated_cost           = COALESCE(excluded.estimated_cost,           batch_orders.estimated_cost),
      notes                    = COALESCE(excluded.notes,                    batch_orders.notes),
      is_test_data             = excluded.is_test_data,
      updated_at               = datetime('now')
  `).bind(
    orderId,
    str(pick(p, 'outletName', 'outlet_name')),
    str(pick(p, 'recipeSku', 'recipe_sku')),
    str(pick(p, 'recipeName', 'recipe_name')),
    num(pick(p, 'requestedQtyPcs', 'requested_qty_pcs')),
    num(pick(p, 'batchMultiplier', 'batch_multiplier')),
    str(p.status),
    str(pick(p, 'bulkRequestStatus', 'bulk_request_status')),
    str(pick(p, 'bulkRequisitionSlipNo', 'bulk_requisition_slip_no')),
    str(pick(p, 'bulkRequestedAt', 'bulk_requested_at')),
    str(pick(p, 'bulkApprovedAt', 'bulk_approved_at')),
    str(pick(p, 'bulkApprovedBy', 'bulk_approved_by')),
    str(pick(p, 'batchTagId', 'batch_tag_id')),
    num(pick(p, 'actualBatchedKg', 'actual_batched_kg')),
    num(pick(p, 'actualBatchedUnits', 'actual_batched_units')),
    str(pick(p, 'batchedAt', 'batched_at')),
    str(pick(p, 'batchedBy', 'batched_by')),
    str(pick(p, 'scaleUsed', 'scale_used')),
    p.sifter40MeshChecked != null ? bool(p.sifter40MeshChecked) : null,
    str(pick(p, 'releasedAt', 'released_at')),
    str(pick(p, 'releasedTo', 'released_to')),
    isoDate(pick(p, 'scheduledScalingDate', 'scheduled_scaling_date')),
    isoDate(pick(p, 'scheduledDeliveryDate', 'scheduled_delivery_date', 'targetDate')),
    p.isAfter3PmCutoff != null ? bool(p.isAfter3PmCutoff) : (p.is_after_cutoff != null ? bool(p.is_after_cutoff) : null),
    str(pick(p, 'cutoffStatusLabel', 'cutoff_status_label')),
    str(pick(p, 'groupOrderRef', 'group_order_ref')),
    cents(pick(p, 'estimatedCost', 'estimated_cost')),
    str(p.notes),
    isTest
  )];
}

function projectBatchOrderCancel(env, p, isTest) {
  const stmts = [];
  const orderId = pick(p, 'orderId', 'order_id');
  if (!orderId) throw new Error('MISSING_ORDER_ID');

  const reason = str(p.cancellationReason || p.reason || 'Cancelled');
  const actor = str(p.cancelledBy || p.cancelledByName || 'Warehouse Staff');

  stmts.push(env.DB.prepare(`DELETE FROM batch_orders WHERE order_id = ?`).bind(orderId));
  stmts.push(env.DB.prepare(`
      INSERT INTO audit_log (timestamp, actor, role, action, details, is_test_data)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      str(p.timestamp) || new Date().toISOString(),
      actor, str(p.cancelledByRole) || null,
      'BATCH_ORDER_CANCELLED',
      `Batch order ${orderId} cancelled: ${reason}`,
      isTest
    ));
  return stmts;
}

function projectOrder(env, p, isTest) {
  const stmts = [];
  const orderId = pick(p, 'orderId', 'order_id');
  if (!orderId) throw new Error('MISSING_ORDER_ID');

  const items = p.items || p.lines || [];
  if (items.length === 0) throw new Error('NO_LINE_ITEMS');

  stmts.push(env.DB.prepare(`
    INSERT INTO orders
      (order_id, customer_or_outlet, contact_person, channel, status,
       order_date, total_cost_centavos, is_test_data)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(order_id) DO UPDATE SET
      customer_or_outlet=excluded.customer_or_outlet,
      contact_person=excluded.contact_person, channel=excluded.channel,
      status=excluded.status, order_date=excluded.order_date,
      total_cost_centavos=excluded.total_cost_centavos,
      is_test_data=excluded.is_test_data, updated_at=datetime('now')
  `).bind(
    orderId, str(pick(p, 'customerOrOutlet', 'customer_or_outlet')),
    str(pick(p, 'contactPerson', 'contact_person')), str(p.channel),
    str(p.status),
    isoDate(pick(p, 'orderDate', 'order_date')) || phtDate(p.timestamp),
    cents(pick(p, 'totalCost', 'total_cost')), isTest
  ));

  stmts.push(env.DB.prepare(`DELETE FROM order_items WHERE order_id = ?`).bind(orderId));

  for (const item of items) {
    stmts.push(env.DB.prepare(`
      INSERT INTO order_items
        (order_id, name, sku, qty, unit_cost_centavos, line_total_centavos, is_test_data)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      orderId, str(item.name), str(item.sku), num(item.qty),
      cents(pick(item, 'unitCost', 'unit_cost')),
      cents(pick(item, 'lineTotal', 'line_total')), isTest
    ));
  }
  return stmts;
}

function projectAudit(env, p, isTest) {
  return [env.DB.prepare(`
    INSERT INTO audit_log (timestamp, actor, role, action, details, is_test_data)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    str(p.timestamp) || new Date().toISOString(),
    str(p.actor), str(p.role),
    str(p.action) || 'UNKNOWN',
    str(p.details), isTest
  )];
}

function projectQuarantine(env, p, isTest) {
  const ncrNo = pick(p, 'ncrNo', 'ncr_no');
  if (!ncrNo) throw new Error('MISSING_NCR_NO');

  return [env.DB.prepare(`
    INSERT INTO quarantine_ncr
      (ncr_no, item_description, lot_number, material_code, material_name_snapshot,
       qty_sec, reason, status, filed_by, filed_at, disposition, disposition_by,
       disposition_at, is_test_data)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(ncr_no) DO UPDATE SET
      item_description=excluded.item_description,
      lot_number=excluded.lot_number, material_code=excluded.material_code,
      material_name_snapshot=excluded.material_name_snapshot,
      qty_sec=excluded.qty_sec, reason=excluded.reason, status=excluded.status,
      filed_by=excluded.filed_by, filed_at=excluded.filed_at,
      disposition=excluded.disposition, disposition_by=excluded.disposition_by,
      disposition_at=excluded.disposition_at, is_test_data=excluded.is_test_data,
      updated_at=datetime('now')
  `).bind(
    ncrNo, str(pick(p, 'itemDescription', 'item_description')),
    str(pick(p, 'lotNumber', 'lot_number')),
    str(pick(p, 'materialCode', 'material_code')),
    str(pick(p, 'materialName', 'name')),
    num(pick(p, 'qtySec', 'qty_sec')), str(p.reason), str(p.status),
    str(pick(p, 'filedBy', 'filed_by')),
    str(pick(p, 'filedAt', 'filed_at')) || str(p.timestamp),
    str(p.disposition), str(pick(p, 'dispositionBy', 'disposition_by')),
    str(pick(p, 'dispositionAt', 'disposition_at')), isTest
  )];
}

function projectSpecialty(env, p, isTest) {
  const stmts = [];
  const proposalId = pick(p, 'proposalId', 'proposal_id');
  if (!proposalId) throw new Error('MISSING_PROPOSAL_ID');

  stmts.push(env.DB.prepare(`
    INSERT INTO specialty_recipe_proposals
      (proposal_id, sku, title, name, category, target_facility, requesting_location,
       baker_name, standard_batch_flour_kg, unit_piece_yield, piece_weight_grams,
       dough_exit_temp_target, ccp1_lethality_target, water_activity_limit,
       unit_production_cost_centavos, wholesale_transfer_price_centavos,
       srp_centavos, gross_margin_pct, mixing_notes, status, submitted_at,
       approved_at, approved_by, is_test_data)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(proposal_id) DO UPDATE SET
      sku=excluded.sku, title=excluded.title, name=excluded.name,
      category=excluded.category, target_facility=excluded.target_facility,
      requesting_location=excluded.requesting_location, baker_name=excluded.baker_name,
      standard_batch_flour_kg=excluded.standard_batch_flour_kg,
      unit_piece_yield=excluded.unit_piece_yield,
      piece_weight_grams=excluded.piece_weight_grams,
      dough_exit_temp_target=excluded.dough_exit_temp_target,
      ccp1_lethality_target=excluded.ccp1_lethality_target,
      water_activity_limit=excluded.water_activity_limit,
      unit_production_cost_centavos=excluded.unit_production_cost_centavos,
      wholesale_transfer_price_centavos=excluded.wholesale_transfer_price_centavos,
      srp_centavos=excluded.srp_centavos, gross_margin_pct=excluded.gross_margin_pct,
      mixing_notes=excluded.mixing_notes, status=excluded.status,
      submitted_at=excluded.submitted_at, approved_at=excluded.approved_at,
      approved_by=excluded.approved_by, is_test_data=excluded.is_test_data,
      updated_at=datetime('now')
  `).bind(
    proposalId, str(p.sku), str(p.title), str(p.name), str(p.category),
    str(pick(p, 'targetFacility', 'target_facility')),
    str(pick(p, 'requestingLocation', 'requesting_location')),
    str(pick(p, 'bakerName', 'baker_name')),
    num(pick(p, 'standardBatchFlourKg', 'standard_batch_flour_kg')),
    num(pick(p, 'unitPieceYield', 'unit_piece_yield')),
    num(pick(p, 'pieceWeightGrams', 'piece_weight_grams')),
    str(pick(p, 'doughExitTempTarget', 'dough_exit_temp_target')),
    str(pick(p, 'ccp1LethalityTarget', 'ccp1_lethality_target')),
    str(pick(p, 'waterActivityLimit', 'water_activity_limit')),
    cents(pick(p, 'unitProductionCost', 'unit_production_cost')),
    cents(pick(p, 'wholesaleTransferPrice', 'wholesale_transfer_price')),
    cents(p.srp), num(pick(p, 'grossMarginPct', 'gross_margin_pct')),
    str(pick(p, 'mixingNotes', 'mixing_notes')),
    str(p.status) || 'PENDING_APPROVAL',
    str(pick(p, 'submittedAt', 'submitted_at')) || str(p.timestamp),
    str(pick(p, 'approvedAt', 'approved_at')),
    str(pick(p, 'approvedBy', 'approved_by')), isTest
  ));

  stmts.push(env.DB.prepare(`DELETE FROM specialty_recipe_ingredients WHERE proposal_id = ?`).bind(proposalId));

  for (const ing of p.ingredients || []) {
    stmts.push(env.DB.prepare(`
      INSERT INTO specialty_recipe_ingredients
        (proposal_id, material_code, ingredient_name_snapshot, pct, grams_per_batch,
         is_water, is_as_needed, is_packaging, sort_order, is_test_data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      proposalId, str(pick(ing, 'code', 'materialCode')), str(ing.name),
      num(ing.pct), num(pick(ing, 'gramsPerBatch', 'grams_per_batch')),
      bool(ing.isWater), bool(ing.isAsNeeded), bool(ing.isPackaging),
      num(ing.sortOrder) || 0, isTest
    ));
  }
  return stmts;
}

// --------------------------- dispatcher -----------------------------------
const HANDLERS = {
  'RECEIVING_SAVED': projectReceiving,
  'RECEIVING_CREATED': projectReceiving,
  'WITHDRAWAL_SAVED': projectWithdrawal,
  'WITHDRAWAL_ISSUED': projectWithdrawal,
  'ADJUSTMENT_SAVED': projectAdjustment,
  'BATCH_ORDER_SAVED': projectBatchOrder,
  'BATCH_ORDER_UPDATED': projectBatchOrder,
  'BATCH_CREATED': projectBatchOrder,
  'BATCH_BULK_APPROVED': projectBatchOrder,
  'BATCH_COMPLETED': projectBatchOrder,
  'BATCH_RELEASED': projectBatchOrder,
  'OUTLET_BATCH_ORDER': projectBatchOrder,
  'BATCH_ORDER_CANCELLED': projectBatchOrderCancel,
  'ORDER_SAVED': projectOrder,
  'ORDER_CREATED': projectOrder,
  'AUDIT_LOG': projectAudit,
  'AUDIT_LOG_ENTRY': projectAudit,
  'WMS_AUDIT_EVENT': projectAudit,
  'QUARANTINE_SAVED': projectQuarantine,
  'QUARANTINE_FILED': projectQuarantine,
  'SPECIALTY_PROPOSAL_SAVED': projectSpecialty,
  'SPECIALTY_PROPOSAL_CREATED': projectSpecialty,
  'SPECIALTY_PROPOSAL_APPROVED': projectSpecialty
};

const BALANCE_AFFECTING = new Set([
  'RECEIVING_SAVED', 'RECEIVING_CREATED',
  'WITHDRAWAL_SAVED', 'WITHDRAWAL_ISSUED',
  'ADJUSTMENT_SAVED'
]);

function buildReconciliationStatement(env) {
  return env.DB.prepare(`
    UPDATE materials
    SET current_balance = COALESCE((
          SELECT ROUND(SUM(qty_sec), 4)
          FROM material_lots
          WHERE material_lots.material_code = materials.code
            AND material_lots.is_test_data = 0
        ), 0),
        updated_at = datetime('now')
    WHERE is_test_data = 0
  `);
}

// --------------------------- POST handler --------------------------------
export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ status: 'error', error: 'invalid_json' }, 400);
  }

  const type = String(
    body.event_type || body.eventType || body.type || ''
  ).toUpperCase();
  const key = String(
    body.idempotency_key || body.idempotencyKey || body.id || crypto.randomUUID()
  );
  const payload = body.payload || body.data || body;

  const isTest = asTest(payload.is_test_data);

  const existing = await env.DB.prepare(
    `SELECT id, projected_at, synced_to_gas FROM sync_events WHERE idempotency_key = ?`
  ).bind(key).first();

  if (!existing) {
    try {
      await env.DB.prepare(
        `INSERT INTO sync_events (idempotency_key, event_type, payload) VALUES (?, ?, ?)`
      ).bind(key, type, JSON.stringify(payload)).run();
    } catch (e) {
      console.warn('sync_events insert race', e.message);
    }
  }

  const state = existing || await env.DB.prepare(
    `SELECT id, projected_at, synced_to_gas FROM sync_events WHERE idempotency_key = ?`
  ).bind(key).first();

  let projectionOk = !!state?.projected_at;

  if (!projectionOk) {
    const handler = HANDLERS[type];
    if (handler) {
      try {
        const stmts = handler(env, payload, isTest);
        if (BALANCE_AFFECTING.has(type)) stmts.push(buildReconciliationStatement(env));
        if (stmts.length > 0) await env.DB.batch(stmts);
        await env.DB.prepare(
          `UPDATE sync_events SET projected_at = datetime('now'), projection_error = NULL WHERE idempotency_key = ?`
        ).bind(key).run();
        projectionOk = true;
      } catch (e) {
        await env.DB.prepare(
          `UPDATE sync_events SET projected_at = datetime('now'), projection_error = ? WHERE idempotency_key = ?`
        ).bind(String(e.message || e), key).run();
        projectionOk = true;
      }
    } else {
      await env.DB.prepare(
        `UPDATE sync_events SET projected_at = datetime('now') WHERE idempotency_key = ?`
      ).bind(key).run();
      projectionOk = true;
    }
  }

  let gasOk = !!state?.synced_to_gas;
  if (!gasOk && env.GAS_WEB_APP_URL) {
    try {
      const res = await fetch(env.GAS_WEB_APP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_type: type, payload })
      });
      gasOk = res.ok;
    } catch (e) {
      console.error('gas forward failed', e);
    }
  } else if (!env.GAS_WEB_APP_URL) {
    gasOk = true;
  }

  if (projectionOk && gasOk) {
    await env.DB.prepare(
      `UPDATE sync_events SET synced_to_gas = 1 WHERE idempotency_key = ?`
    ).bind(key).run();
  }

  return json({
    status: 'ok',
    event_type: type,
    idempotency: key,
    projected: projectionOk,
    synced_to_gas: gasOk,
    is_test_data: isTest
  });
}

// --------------------------- GET handler (Phase 2.5/2.6) -----------------
export async function onRequestGet({ request, env }) {
  if (!env.DB) {
    return json({ ok: false, error: 'D1 not configured' }, 500);
  }

  const url = new URL(request.url);
  const sinceId = Math.max(0, parseInt(url.searchParams.get('since_id') || '0', 10) || 0);

  const POLLED_EVENT_TYPES = [
    'WITHDRAWAL_REQUEST_SUBMITTED',
    'WITHDRAWAL_REQUEST_CANCELLED',
    'WITHDRAWAL_SAVED',
    'BATCH_ORDER_SAVED',
    'BATCH_ORDER_UPDATED',
    'OUTLET_BATCH_ORDER',
    'BATCH_ORDER_CANCELLED',
    'SPECIALTY_PROPOSAL_SAVED',
    'SPECIALTY_PROPOSAL_CREATED',
    'SPECIALTY_PROPOSAL_APPROVED'
  ];

  let events = [];
  let recentBatchOrders = [];

  try {
    const placeholders = POLLED_EVENT_TYPES.map((_, i) => `?${i + 2}`).join(', ');
    const out = await env.DB.prepare(`
      SELECT id, idempotency_key, event_type, payload, created_at
      FROM sync_events
      WHERE id > ?1
        AND event_type IN (${placeholders})
      ORDER BY id ASC
      LIMIT 100
    `).bind(sinceId, ...POLLED_EVENT_TYPES).all();
    events = out?.results || [];
  } catch (e) {
    return json({ ok: false, error: String(e.message || e) }, 500);
  }

  try {
    const boOut = await env.DB.prepare(`
      SELECT * FROM batch_orders
      WHERE is_test_data = 0
      ORDER BY rowid DESC
      LIMIT 25
    `).all();
    recentBatchOrders = boOut?.results || [];
  } catch (e) {
    // Non-fatal
  }

  const serverMaxId = events.length > 0 ? events[events.length - 1].id : sinceId;

  return json({
    ok: true,
    since_id: sinceId,
    server_max_id: serverMaxId,
    last_event_id: serverMaxId,
    count: events.length,
    events: events.map((r) => {
      let payload = {};
      try { payload = JSON.parse(r.payload || '{}'); } catch (e) {}
      return {
        id: r.id,
        key: r.idempotency_key,
        type: r.event_type,
        event_type: r.event_type,
        payload,
        created_at: r.created_at
      };
    }),
    batch_orders: recentBatchOrders
  });
}