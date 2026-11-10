// ============================================================================
// JJB-WMS v4.6 — Unified Production Line, Consumption Purpose & Pack Presets
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

// Smart Bulk & Small Pack-Unit Presets per Material Category / Code
export const getMaterialUnitPresets = (material = {}) => {
  const code = String(material.code || '').toUpperCase();
  const name = String(material.name || '').toLowerCase();
  const secUom = material.secondaryUom || 'kg';
  const conv = Number(material.conversionFactor) || 1;

  // 1. Fresh Eggs (Tray = 30 pcs, Half-Tray = 15 pcs, Dozen = 12 pcs, Piece = 1 pc)
  if (code.includes('EGG') || name.includes('egg')) {
    return [
      { label: '1 Tray (30 pcs)', multiplierInSec: secUom === 'pcs' ? 30 : 1.8, badge: 'BULK TRAY' },
      { label: '1/2 Tray (15 pcs)', multiplierInSec: secUom === 'pcs' ? 15 : 0.9, badge: 'HALF TRAY' },
      { label: '1 Dozen (12 pcs)', multiplierInSec: secUom === 'pcs' ? 12 : 0.72, badge: 'DOZEN' },
      { label: '1 Piece (pc)', multiplierInSec: secUom === 'pcs' ? 1 : 0.06, badge: 'SINGLE' },
      { label: `Direct (${secUom})`, multiplierInSec: 1, badge: 'BASE UOM' }
    ];
  }

  // 2. Condensed Milk / Evaporated Milk / Creamer Cans (1 Box = 48 Cans, 4 Cans, 1 Can)
  if (name.includes('condensed') || name.includes('evaporated') || name.includes('creamer') || name.includes('milk can')) {
    const singleCanSec = secUom === 'can' || secUom === 'pcs' ? 1 : 0.39; // 390g can
    return [
      { label: '1 Master Box (48 Cans)', multiplierInSec: +(singleCanSec * 48).toFixed(2), badge: 'BULK BOX' },
      { label: '1/2 Box (24 Cans)', multiplierInSec: +(singleCanSec * 24).toFixed(2), badge: 'HALF BOX' },
      { label: '4 Cans (Line Pack)', multiplierInSec: +(singleCanSec * 4).toFixed(2), badge: '4-CAN PACK' },
      { label: '1 Can', multiplierInSec: singleCanSec, badge: 'SINGLE CAN' },
      { label: `Direct (${secUom})`, multiplierInSec: 1, badge: 'BASE UOM' }
    ];
  }

  // 3. Flour & Sugar Sacks (1 Sack = 25kg / 50kg, Half-Sack, 3kg Kit, 1kg)
  if (code.includes('FLR') || code.includes('SUG') || material.primaryUom === 'Sack') {
    const sackKg = conv > 1 ? conv : 25;
    return [
      { label: `1 Full Sack (${sackKg} ${secUom})`, multiplierInSec: sackKg, badge: 'FULL SACK' },
      { label: `1/2 Sack (${sackKg / 2} ${secUom})`, multiplierInSec: +(sackKg / 2).toFixed(2), badge: 'HALF SACK' },
      { label: `6 ${secUom} (Double Kit)`, multiplierInSec: 6, badge: '6-KG KIT' },
      { label: `3 ${secUom} (Standard Kit)`, multiplierInSec: 3, badge: '3-KG KIT' },
      { label: `1 ${secUom}`, multiplierInSec: 1, badge: 'BASE UOM' }
    ];
  }

  // 4. Butter, Margarine & Shortening Blocks/Cartons
  if (code.includes('FAT') || name.includes('butter') || name.includes('margarine') || name.includes('lard')) {
    const cartonKg = conv > 1 ? conv : 15;
    return [
      { label: `1 Master Carton/Tub (${cartonKg} ${secUom})`, multiplierInSec: cartonKg, badge: 'BULK CARTON' },
      { label: `1 Block (2.5 ${secUom})`, multiplierInSec: 2.5, badge: 'BLOCK' },
      { label: `1 Bar (0.225 ${secUom})`, multiplierInSec: 0.225, badge: '225G BAR' },
      { label: `1 ${secUom}`, multiplierInSec: 1, badge: 'BASE UOM' }
    ];
  }

  // 5. Packaging Pouches / Boxes (Bundle of 100 pcs, 50 pcs, 1 pc)
  if (code.startsWith('PM-') || secUom === 'pcs') {
    return [
      { label: '1 Case / 500 pcs', multiplierInSec: 500, badge: 'MASTER CASE' },
      { label: '1 Bundle (100 pcs)', multiplierInSec: 100, badge: '100-PC BUNDLE' },
      { label: 'Half Bundle (50 pcs)', multiplierInSec: 50, badge: '50-PC PACK' },
      { label: '1 Dozen (12 pcs)', multiplierInSec: 12, badge: '12 PCS' },
      { label: '1 Piece (pc)', multiplierInSec: 1, badge: 'SINGLE' }
    ];
  }

  // Default fallback
  return [
    { label: `1 ${material.primaryUom || 'Pack'} (${conv} ${secUom})`, multiplierInSec: conv, badge: 'PRIMARY PACK' },
    { label: `1 ${secUom}`, multiplierInSec: 1, badge: 'BASE UOM' }
  ];
};

/**
 * Returns a human-readable availability string showing BOTH the primary UoM
 * count (Sack / Tray / Tin Can / Box / etc.) and the secondary UoM count
 * (kg / L / pcs / tank).
 *
 *   Eggs   : "5 Tray (150 pcs)"
 *   Flour  : "5 Sack (125 kg)"
 *   Creamer: "128 Tin Can (49.92 kg)"
 *   LPG    : "5 tank"  (fallback when conversionFactor <= 1)
 */
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