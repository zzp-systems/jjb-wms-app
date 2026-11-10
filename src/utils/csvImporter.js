// CSV Parser, Template Generator, and Validation Engine for Warehouse Opening Inventory
// Governed by SOP-WAR-002 (JJB Indangan Bodega LTO No. 3000013388488)
//
// PUBLIC API (used by InitialDataImportModal.jsx):
//   • generateInventoryTemplateCsv(masterMaterials)  → string
//   • parseInventoryCsv(csvContent, masterMaterials) → { success, parsedItems, warnings, ... }
//   • applyInventoryImport(currentInventory, parsedItems, mode) → array
//   • parseRawCsvText(text) → string[][]  (utility, kept for backwards compat)

/**
 * Generates a clean CSV template pre-populated with master materials.
 * One row per material — all count columns left at 0 for the physical count.
 */
export function generateInventoryTemplateCsv(masterMaterials) {
  const headers = [
    'Material Code',
    'Description',
    'Category',
    'Storage Room',
    'Primary Unit',
    'Conversion Factor',
    'Secondary Unit',
    'Count Primary Units',
    'Count Secondary Units',
    'Lot Number',
    'Expiration Date',
    'Storage Location'
  ];

  const escape = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;

  const rows = masterMaterials.map((m) => {
    const defaultLot = `LOT-${String(m.code).replace(/[^A-Z0-9]/gi, '')}-INIT`;
    return [
      m.code,
      escape(m.name),
      escape(m.category),
      escape(m.room || 'Dry Room 1'),
      m.primaryUom || 'Sack',
      m.conversionFactor || 1,
      m.secondaryUom || 'kg',
      0,
      0,
      defaultLot,
      '2027-06-30',
      'Pallet A1'
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\r\n');
}

/**
 * Handles quotes, embedded commas, escaped double-quotes, and CRLF/LF/CR
 * line endings. Returns a 2D array of trimmed cell strings.
 */
export function parseRawCsvText(text) {
  const cleanText = String(text || '').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').trim();
  const rows = [];
  let currentRow = [];
  let currentCell = '';
  let insideQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if (char === '\n' && !insideQuotes) {
      currentRow.push(currentCell.trim());
      if (currentRow.some((c) => c.length > 0)) rows.push(currentRow);
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((c) => c.length > 0)) rows.push(currentRow);
  }

  return rows;
}

function normalizeHeader(header) {
  return String(header || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Accepts YYYY-MM-DD, ISO timestamps, or Date-parseable strings.
 * Returns null for garbage — caller substitutes a sane default.
 */
function sanitizeDate(v) {
  if (!v) return null;
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

/**
 * Parses + validates an uploaded CSV against the master catalog.
 *
 * @returns {{
 *   success: boolean,
 *   error?: string,
 *   totalRowsParsed: number,
 *   matchedCount: number,
 *   totalQuantityKg: number,
 *   totalValuation: number,
 *   parsedItems: Array,
 *   errors: string[],
 *   warnings: string[]
 * }}
 */
export function parseInventoryCsv(csvContent, masterMaterials) {
  const rows = parseRawCsvText(csvContent);

  if (rows.length < 2) {
    return {
      success: false,
      error: 'CSV file is empty or does not contain both a header row and at least one data row.',
      totalRowsParsed: 0,
      matchedCount: 0,
      totalQuantityKg: 0,
      totalValuation: 0,
      parsedItems: [],
      errors: ['File contains no data rows.'],
      warnings: []
    };
  }

  const rawHeaders = rows[0];
  const headerMap = {};
  rawHeaders.forEach((h, idx) => {
    headerMap[normalizeHeader(h)] = idx;
  });

  const getCol = (possibleNames) => {
    for (const name of possibleNames) {
      const norm = normalizeHeader(name);
      if (headerMap[norm] !== undefined) return headerMap[norm];
    }
    return -1;
  };

  const codeIdx = getCol(['materialcode', 'code', 'itemcode', 'sku', 'material']);
  const descIdx = getCol(['description', 'name', 'itemdescription', 'item']);
  const countPrimIdx = getCol(['countprimaryunits', 'primaryunits', 'primaryqty', 'quantityprimary', 'countprimary', 'bags', 'sacks', 'boxes', 'tins', 'primarycount']);
  const countSecIdx = getCol(['countsecondaryunits', 'secondaryunits', 'secondaryqty', 'quantitysecondary', 'countsecondary', 'quantity', 'qty', 'count', 'kg', 'grams', 'pieces']);
  const factorIdx = getCol(['conversionfactor', 'factor', 'conversion']);
  const lotIdx = getCol(['lotnumber', 'lot', 'lotno', 'batchnumber', 'batch']);
  const expiryIdx = getCol(['expirationdate', 'expirydate', 'expiry', 'expdate']);
  const locationIdx = getCol(['storagelocation', 'location', 'pallet', 'bay', 'bin']);
  const roomIdx = getCol(['storageroom', 'room', 'chamber']);

  if (codeIdx === -1 && descIdx === -1) {
    return {
      success: false,
      error: 'Unable to find a "Material Code" or "Description" column in the CSV header.',
      totalRowsParsed: 0,
      matchedCount: 0,
      totalQuantityKg: 0,
      totalValuation: 0,
      parsedItems: [],
      errors: ['Missing required column: Material Code / SKU (or Description).'],
      warnings: []
    };
  }

  const masterByCode = new Map(masterMaterials.map((m) => [String(m.code).trim().toUpperCase(), m]));
  const masterByName = new Map(masterMaterials.map((m) => [String(m.name).trim().toLowerCase(), m]));

  const parsedItems = [];
  const errors = [];
  const warnings = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0 || row.every((c) => !c)) continue;

    const rawCode = codeIdx !== -1 ? String(row[codeIdx] || '').trim().toUpperCase() : '';
    const rawDesc = descIdx !== -1 ? String(row[descIdx] || '').trim() : '';

    let matchedMaterial = masterByCode.get(rawCode);
    if (!matchedMaterial && rawDesc) matchedMaterial = masterByName.get(rawDesc.toLowerCase());

    if (!matchedMaterial) {
      warnings.push(`Row ${r + 1}: Unknown material "${rawCode || rawDesc}". Row skipped.`);
      continue;
    }

    // ── Quantity resolution ──────────────────────────────────────────
    const rawCountPrim = countPrimIdx !== -1 ? parseFloat(row[countPrimIdx]) : NaN;
    const rawCountSec = countSecIdx !== -1 ? parseFloat(row[countSecIdx]) : NaN;
    const factor =
      factorIdx !== -1 && Number.isFinite(parseFloat(row[factorIdx]))
        ? parseFloat(row[factorIdx])
        : Number(matchedMaterial.conversionFactor) || 1;

    let finalPrimaryQty = 0;
    let finalSecondaryQty = 0;

    if (!isNaN(rawCountPrim) && rawCountPrim >= 0) {
      finalPrimaryQty = rawCountPrim;
      finalSecondaryQty =
        !isNaN(rawCountSec) && rawCountSec > 0 ? rawCountSec : rawCountPrim * (factor || 1);
    } else if (!isNaN(rawCountSec) && rawCountSec >= 0) {
      finalSecondaryQty = rawCountSec;
      finalPrimaryQty = finalSecondaryQty / (factor || 1);
    }

    // ── Lot / expiry / location ──────────────────────────────────────
    const lotNumber =
      lotIdx !== -1 && row[lotIdx]
        ? String(row[lotIdx]).trim()
        : `OPEN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${matchedMaterial.code}`;

    const expiryDate =
      sanitizeDate(expiryIdx !== -1 ? row[expiryIdx] : null) || '2027-06-30';

    const location =
      locationIdx !== -1 && row[locationIdx]
        ? String(row[locationIdx]).trim()
        : 'Pallet A1';

    const room =
      roomIdx !== -1 && row[roomIdx]
        ? String(row[roomIdx]).trim()
        : matchedMaterial.room || 'Dry Room 1';

    parsedItems.push({
      code: matchedMaterial.code,
      name: matchedMaterial.name,
      category: matchedMaterial.category,
      brand: matchedMaterial.brand,
      supplier: matchedMaterial.supplier,
      room,
      primaryUom: matchedMaterial.primaryUom,
      secondaryUom: matchedMaterial.secondaryUom,
      conversionFactor: factor || 1,
      threshold: matchedMaterial.threshold,
      unitCost: matchedMaterial.unitCost,
      primaryQty: Math.round(finalPrimaryQty * 1000) / 1000,
      secondaryQty: Math.round(finalSecondaryQty * 1000) / 1000,
      lotNumber,
      expiryDate,
      location
    });
  }

  if (parsedItems.length === 0) {
    return {
      success: false,
      error: 'No rows in the CSV matched any material in the master catalog.',
      totalRowsParsed: rows.length - 1,
      matchedCount: 0,
      totalQuantityKg: 0,
      totalValuation: 0,
      parsedItems: [],
      errors,
      warnings
    };
  }

  const totalQuantityKg =
    Math.round(parsedItems.reduce((s, it) => s + (it.secondaryQty || 0), 0) * 100) / 100;

  // Valuation: for each line, prefer primaryQty × unitCost (exact when possible);
  // fall back to secondaryQty × (unitCost / factor) when primary is zero.
  const totalValuation =
    Math.round(
      parsedItems.reduce((sum, it) => {
        const factor = it.conversionFactor || 1;
        if (it.primaryQty > 0) return sum + it.primaryQty * (it.unitCost || 0);
        return sum + it.secondaryQty * ((it.unitCost || 0) / factor);
      }, 0) * 100
    ) / 100;

  return {
    success: true,
    totalRowsParsed: rows.length - 1,
    matchedCount: parsedItems.length,
    totalQuantityKg,
    totalValuation,
    parsedItems,
    errors,
    warnings
  };
}

/**
 * Applies the imported baseline rows into the inventory state.
 *
 * @param {Array}  currentInventory - Existing inventory state (masterMaterials + live balances)
 * @param {Array}  importedRows     - `parseResult.parsedItems`
 * @param {string} mode             - 'FRESH_BASELINE' | 'UPDATE_ONLY' (alias: 'UPDATE_QUANTITIES')
 *
 * Behaviour:
 *   FRESH_BASELINE — every material's `currentBalance` becomes exactly the
 *                    sum of its imported lots. Materials absent from the CSV
 *                    are zeroed. This is what the 2027 general inventory uses.
 *
 *   UPDATE_ONLY    — same replacement logic for materials present in the CSV
 *                    (i.e. the imported row becomes the source of truth),
 *                    but materials absent from the CSV are left untouched.
 *                    Downstream D1 reconciliation (buildReconciliationStatement)
 *                    keeps `materials.current_balance = SUM(material_lots.qty_sec)`
 *                    consistent regardless of mode.
 *
 *   Multi-lot support: if the same material code appears on N rows with
 *   different lot numbers, all N lots are preserved and their quantities
 *   summed into the material's balance.
 */
export function applyInventoryImport(currentInventory, importedRows, mode = 'FRESH_BASELINE') {
  const isFreshBaseline = mode === 'FRESH_BASELINE';
  const isUpdateMode = mode === 'UPDATE_ONLY' || mode === 'UPDATE_QUANTITIES';

  // Group imported rows by material code so multi-lot CSVs aggregate cleanly
  const importedByCode = new Map();
  for (const row of importedRows || []) {
    const code = row.code;
    if (!code) continue;
    if (!importedByCode.has(code)) importedByCode.set(code, []);
    importedByCode.get(code).push(row);
  }

  return currentInventory.map((item) => {
    const importedList = importedByCode.get(item.code);

    // ── Material not present in the CSV ───────────────────────────────
    if (!importedList || importedList.length === 0) {
      if (isFreshBaseline) {
        // Zero out unmentioned items — clean year-start baseline
        return { ...item, currentBalance: 0, lots: [] };
      }
      // UPDATE_ONLY / unknown modes: leave existing stock alone
      return item;
    }

    // ── Material present in the CSV ───────────────────────────────────
    const totalSecondaryQty =
      Math.round(importedList.reduce((s, r) => s + (Number(r.secondaryQty) || 0), 0) * 1000) / 1000;

    const newLots = importedList
      .filter((r) => Number(r.secondaryQty) > 0)
      .map((r) => ({
        lotNumber: r.lotNumber,
        expiryDate: r.expiryDate,
        qtySec: Number(r.secondaryQty),
        location: r.location
      }));

    const resolvedRoom = importedList[0]?.room || item.room;

    // Both FRESH_BASELINE and UPDATE_ONLY replace the material's lots with
    // the imported set — this matches the "clean slate" physical count the
    // operator enters. Anything not in the CSV for that material is
    // considered counted-as-zero.
    return {
      ...item,
      currentBalance: totalSecondaryQty,
      lots: newLots,
      room: resolvedRoom
    };
  });
}