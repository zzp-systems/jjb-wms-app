// ============================================================================
// JJB-WMS v4.6 — Unified Production Line, Consumption Purpose, Pack Presets
// & 3:00 PM PHT Batching Cut-Off Scheduling Engine
// ============================================================================

export const UNIFIED_PRODUCTION_LINES = [
  { id: 'PDV-COMMUNAL', label: '1. Pan de Verde Outlet (Communal, Davao City)', department: 'Retail Outlet Dispatch', defaultPurpose: 'Daily Outlet Display & Pull-Out Replenishment' },
  { id: 'LAURICE-BANKEROHAN', label: '2. Laurice Delicacies Outlet (Bankerohan, Davao City)', department: 'Retail Outlet Dispatch', defaultPurpose: 'Daily Outlet Display & Pull-Out Replenishment' },
  { id: 'IND-BISCOCHO', label: '3. Indangan - Biscocho Commercial Hall', department: 'Production Floor (Dry Room 2)', defaultPurpose: 'Daily Commercial Production Line Issuance' },
  { id: 'IND-OTAP', label: '4. Indangan - Otap Laminated Hall', department: 'Production Floor (Dry Room 2)', defaultPurpose: 'Daily Commercial Production Line Issuance' },
  { id: 'IND-HEARTH', label: '5. Indangan - Hearth Bread Production Line', department: 'Production Floor (Main Bake Hall)', defaultPurpose: 'Daily Commercial Production Line Issuance' },
  { id: 'IND-PASTRY', label: '6. Indangan - Pastry, Cake & Sweets Line', department: 'Finishing & Decorating Room', defaultPurpose: 'Pastry, Cake & Filling Preparation' },
  { id: 'IND-MESS-HALL', label: '7. Indangan Facility Mess Hall (Staff Meals & Snacks)', department: 'Indangan Facility Mess Hall (Staff Meals & Snacks)', defaultPurpose: 'Facility Mess Hall - Staff Meals & Snacks Consumption' },
  { id: 'IND-QA-RND', label: '8. QA Laboratory & R&D Kitchen', department: 'Quality Assurance & R&D', defaultPurpose: 'QA Retention Sample & R&D Test Formulation' },
  { id: 'IND-MAINT', label: '9. Facility Maintenance & Plant Sanitation', department: 'Plant Engineering & Sanitation', defaultPurpose: 'Plant Sanitation, Cleaning & Preventive Maintenance' },
  { id: 'CUSTOM', label: '10. Custom Write-in Department / Satellite Kiosk...', department: 'Special Operations', defaultPurpose: 'Daily Commercial Production Line Issuance' }
];

export const UNIFIED_CONSUMPTION_PURPOSES = [
  'Daily Commercial Production Line Issuance',
  'Pre-Bake Door Handoff — Real-Time Floor Release',
  'Facility Mess Hall - Staff Meals & Snacks Consumption',
  'Daily Outlet Display & Pull-Out Replenishment',
  'Pastry, Cake & Filling Preparation',
  'Packaging, Pouches & Corrugated Box Replenishment',
  'QA Retention Sample & R&D Test Formulation',
  'Emergency Batch Top-Up / Re-Scale',
  'Plant Sanitation, Cleaning & Preventive Maintenance'
];

// ============================================================================
// 15:00 PHT (3:00 PM) Recipe Ingredient Batching Cut-Off Engine
// - Before 15:00 PHT: Pre-scaling Today (T+0), Delivery Tomorrow (T+1)
// - At/After 15:00 PHT: Pre-scaling Tomorrow (T+1), Delivery Subsequent Day (T+2)
// ============================================================================
export function evaluateBatchCutoffPht(nowDate = new Date()) {
  const phtParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(nowDate);

  const partMap = {};
  phtParts.forEach((p) => { partMap[p.type] = p.value; });

  const year = Number(partMap.year);
  const month = Number(partMap.month);
  const day = Number(partMap.day);
  const hour = Number(partMap.hour === '24' ? 0 : partMap.hour);
  const minute = Number(partMap.minute);

  const isAfterCutoff = hour >= 15;

  const addDaysIso = (daysToAdd) => {
    const d = new Date(Date.UTC(year, month - 1, day + daysToAdd));
    return d.toISOString().slice(0, 10);
  };

  const orderDate = addDaysIso(0);
  const scheduledScalingDate = isAfterCutoff ? addDaysIso(1) : addDaysIso(0);
  const scheduledDeliveryDate = isAfterCutoff ? addDaysIso(2) : addDaysIso(1);

  return {
    isAfterCutoff,
    phtTimeFormatted: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} PHT`,
    orderDate,
    scheduledScalingDate,
    scheduledDeliveryDate,
    cutoffStatusLabel: isAfterCutoff
      ? `PAST 3:00 PM CUT-OFF — Scheduled for Pre-Scaling Tomorrow (${scheduledScalingDate}) & Delivery (${scheduledDeliveryDate})`
      : `WITHIN 3:00 PM CUT-OFF — Scheduled for Today's Pre-Scaling (${scheduledScalingDate}) & Next-Day Delivery (${scheduledDeliveryDate})`
  };
}

// Smart Bulk & Small Pack-Unit Presets per Material Category / Code
export const getMaterialUnitPresets = (material = {}) => {
  const code = String(material.code || '').toUpperCase();
  const name = String(material.name || '').toLowerCase();
  const secUom = material.secondaryUom || 'kg';
  const conv = Number(material.conversionFactor) || 1;

  if (code.includes('EGG') || name.includes('egg')) {
    return [
      { label: '1 Tray (30 pcs)', multiplierInSec: secUom === 'pcs' ? 30 : 1.8, badge: 'BULK TRAY' },
      { label: '1/2 Tray (15 pcs)', multiplierInSec: secUom === 'pcs' ? 15 : 0.9, badge: 'HALF TRAY' },
      { label: '1 Dozen (12 pcs)', multiplierInSec: secUom === 'pcs' ? 12 : 0.72, badge: 'DOZEN' },
      { label: '1 Piece (pc)', multiplierInSec: secUom === 'pcs' ? 1 : 0.06, badge: 'SINGLE' },
      { label: `Direct (${secUom})`, multiplierInSec: 1, badge: 'BASE UOM' }
    ];
  }

  if (name.includes('condensed') || name.includes('condensada') || name.includes('evaporated') || name.includes('evaporada') || name.includes('creamer') || name.includes('milk can')) {
    const singleCanSec = secUom === 'can' || secUom === 'pcs' ? 1 : (conv > 0 && conv <= 2 ? conv : 0.39);
    const cansPerBox = name.includes('condensada') ? 24 : 48;
    return [
      { label: `1 Master Box (${cansPerBox} Cans)`, multiplierInSec: +(singleCanSec * cansPerBox).toFixed(2), badge: 'BULK BOX' },
      { label: `1/2 Box (${cansPerBox / 2} Cans)`, multiplierInSec: +(singleCanSec * (cansPerBox / 2)).toFixed(2), badge: 'HALF BOX' },
      { label: '4 Cans (Line Pack)', multiplierInSec: +(singleCanSec * 4).toFixed(2), badge: '4-CAN PACK' },
      { label: '1 Can', multiplierInSec: singleCanSec, badge: 'SINGLE CAN' },
      { label: `Direct (${secUom})`, multiplierInSec: 1, badge: 'BASE UOM' }
    ];
  }

  if (code.includes('FLR') || code.includes('SUG') || code.includes('SWT') || material.primaryUom === 'Sack') {
    const sackKg = conv > 1 ? conv : 25;
    return [
      { label: `1 Full Sack (${sackKg} ${secUom})`, multiplierInSec: sackKg, badge: 'FULL SACK' },
      { label: `1/2 Sack (${sackKg / 2} ${secUom})`, multiplierInSec: +(sackKg / 2).toFixed(2), badge: 'HALF SACK' },
      { label: `6 ${secUom} (Double Kit)`, multiplierInSec: 6, badge: '6-KG KIT' },
      { label: `3 ${secUom} (Standard Kit)`, multiplierInSec: 3, badge: '3-KG KIT' },
      { label: `1 ${secUom}`, multiplierInSec: 1, badge: 'BASE UOM' }
    ];
  }

  if (code.includes('FAT') || name.includes('butter') || name.includes('margarine') || name.includes('lard') || name.includes('shortening')) {
    const cartonKg = conv > 1 ? conv : 15;
    return [
      { label: `1 ${material.primaryUom || 'Carton/Block'} (${cartonKg} ${secUom})`, multiplierInSec: cartonKg, badge: 'PRIMARY UNIT' },
      { label: `1 Block (2.5 ${secUom})`, multiplierInSec: 2.5, badge: 'BLOCK' },
      { label: `1 Bar (0.225 ${secUom})`, multiplierInSec: 0.225, badge: '225G BAR' },
      { label: `1 ${secUom}`, multiplierInSec: 1, badge: 'BASE UOM' }
    ];
  }

  if (code.startsWith('PM-') || secUom === 'pcs') {
    return [
      { label: '1 Case / 500 pcs', multiplierInSec: 500, badge: 'MASTER CASE' },
      { label: '1 Bundle (100 pcs)', multiplierInSec: 100, badge: '100-PC BUNDLE' },
      { label: 'Half Bundle (50 pcs)', multiplierInSec: 50, badge: '50-PC PACK' },
      { label: '1 Dozen (12 pcs)', multiplierInSec: 12, badge: '12 PCS' },
      { label: '1 Piece (pc)', multiplierInSec: 1, badge: 'SINGLE' }
    ];
  }

  return [
    { label: `1 ${material.primaryUom || 'Pack'} (${conv} ${secUom})`, multiplierInSec: conv, badge: 'PRIMARY PACK' },
    { label: `1 ${secUom}`, multiplierInSec: 1, badge: 'BASE UOM' }
  ];
};

// ---------------------------------------------------------------------------
// Availability string "5 Sack (125 kg)" for UI dropdowns
// ---------------------------------------------------------------------------
export function formatMaterialAvailability(material = {}) {
  const secQty = Number(material.currentBalance || 0);
  const secUom = material.secondaryUom || material.uom || 'kg';
  const conv = Number(material.conversionFactor ?? material.conversion ?? 1);
  const primUom = material.primaryUom || '';

  const secStr = `${secQty.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${secUom}`;

  if (conv > 1 && primUom) {
    const primQty = secQty / conv;
    const primStr = `${primQty.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${primUom}`;
    return `${primStr} (${secStr})`;
  }
  return secStr;
}

// ---------------------------------------------------------------------------
// Pluralize a primary UoM label (Box → Boxes, Sack → Sacks, Tin Can → Tin Cans)
// ---------------------------------------------------------------------------
function pluralizeUom(uom, count) {
  if (Number(count) === 1) return uom;
  const lc = String(uom || '').toLowerCase();
  if (lc.endsWith('x') || lc.endsWith('s') || lc.endsWith('ch') || lc.endsWith('sh')) {
    return `${uom}es`;
  }
  return `${uom}s`;
}

// ---------------------------------------------------------------------------
// Dual-Unit formatter for Romeo & Jade consolidated views
//   12 kg flour (conv=25) → "0.48 Sacks (12 kg)"
//   47 eggs (conv=30)    → "1.57 Trays (47 pcs)"
// ---------------------------------------------------------------------------
export function formatDualUnitQuantity(qtySec, material = {}) {
  const sec = Number(qtySec || 0);
  const secUom = material?.secondaryUom || 'kg';
  const conv = Number(material?.conversionFactor || 1);
  const primUom = material?.primaryUom || '';

  const secDisplay = `${sec.toLocaleString(undefined, { maximumFractionDigits: 3 })} ${secUom}`;
  if (conv > 0 && primUom && primUom.toLowerCase() !== secUom.toLowerCase()) {
    const primCount = +(sec / conv).toFixed(2);
    return `${primCount} ${pluralizeUom(primUom, primCount)} (${secDisplay})`;
  }
  return secDisplay;
}

// ---------------------------------------------------------------------------
// Recipe Batch Breakdown — scales ingredient BOM and computes total estimated cost
// ---------------------------------------------------------------------------
export function computeRecipeBatchBreakdown(recipe = {}, multiplier = 1, inventory = []) {
  const mult = Number(multiplier) > 0 ? Number(multiplier) : 1;
  const baseYield = Number(recipe.unitPieceYield || recipe.baseYieldPcs || recipe.yieldPcs || 100);
  const estimatedYieldPcs = Math.round(baseYield * mult);

  let calculatedCostFromBom = 0;

  const scaledIngredients = (recipe.ingredients || [])
    .filter((ing) => !ing.code?.startsWith('SUB-') || Number(ing.gramsPerBatch) > 10)
    .map((ing) => {
      const mat = inventory.find((m) => m.code === ing.code) || {};
      const isEggPcs = ing.code === 'RM-DRY-001' && Number(ing.gramsPerBatch) <= 60;
      const rawScaled = Number(ing.gramsPerBatch || 0) * mult;

      let requiredSec = 0;
      let secUom = mat.secondaryUom || 'kg';

      if (isEggPcs) {
        requiredSec = +rawScaled.toFixed(2);
        secUom = 'pcs';
      } else {
        requiredSec = +(rawScaled / 1000).toFixed(3);
        secUom = mat.secondaryUom === 'L' ? 'L' : 'kg';
      }

      const costPerSec =
        mat.unitCost != null && mat.conversionFactor
          ? Number(mat.unitCost) / Number(mat.conversionFactor)
          : Number(mat.unitCost || 0);

      const lineCost = ing.isWater ? 0 : +(requiredSec * costPerSec).toFixed(2);
      calculatedCostFromBom += lineCost;

      return {
        code: ing.code,
        name: ing.name || mat.name || ing.code,
        pct: ing.pct,
        isWater: !!ing.isWater,
        requiredGrams: isEggPcs ? Math.round(rawScaled * 60) : Math.round(rawScaled),
        requiredSec,
        secondaryUom: secUom,
        primaryUom: mat.primaryUom || 'Unit',
        conversionFactor: Number(mat.conversionFactor || 1),
        dualUnitDisplay: ing.isWater
          ? `${requiredSec} L (Filtered Water)`
          : formatDualUnitQuantity(requiredSec, mat),
        lineCost
      };
    });

  const fallbackUnitCost = Number(recipe.unitProductionCost || 0) * estimatedYieldPcs;
  const totalEstimatedCost =
    calculatedCostFromBom > 0 ? +calculatedCostFromBom.toFixed(2) : +fallbackUnitCost.toFixed(2);

  return {
    estimatedYieldPcs,
    totalEstimatedCost,
    scaledIngredients
  };
}