// CSV Parser, Template Generator, and Validation Engine for Warehouse Opening Inventory
// Governed by SOP-WAR-002 (JJB Indangan Bodega LTO No. 3000013388488)

/**
 * Generates a clean CSV template pre-populated with master materials
 * @param {Array} masterMaterials - List of master materials
 * @returns {string} - CSV formatted string
 */
export function generateInventoryTemplateCsv(masterMaterials) {
  const headers = [
    "Material Code",
    "Description",
    "Category",
    "Storage Room",
    "Primary Unit",
    "Conversion Factor",
    "Secondary Unit",
    "Count Primary Units",
    "Count Secondary Units",
    "Lot Number",
    "Expiration Date",
    "Storage Location"
  ];

  const rows = masterMaterials.map(m => {
    // Escape quotes and commas in fields
    const desc = `"${(m.name || '').replace(/"/g, '""')}"`;
    const cat = `"${(m.category || '').replace(/"/g, '""')}"`;
    const room = `"${(m.room || 'Dry Room 1').replace(/"/g, '""')}"`;
    const primaryUom = m.primaryUom || 'Sack';
    const factor = m.conversionFactor || 1;
    const secondaryUom = m.secondaryUom || 'kg';
    const countPrimary = 0; // Empty/zero baseline for fresh count
    const countSecondary = 0;
    const defaultLot = `LOT-${m.code.replace(/[^A-Z0-9]/g, '')}-INIT`;
    const defaultExpiry = "2027-06-30";
    const defaultLocation = "Pallet A1";

    return [
      m.code,
      desc,
      cat,
      room,
      primaryUom,
      factor,
      secondaryUom,
      countPrimary,
      countSecondary,
      defaultLot,
      defaultExpiry,
      defaultLocation
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\r\n");
}

/**
 * Simple robust CSV text parser that handles quotes, commas, and newlines
 * @param {string} text - Raw CSV string
 * @returns {Array<Array<string>>} - Array of rows with cell strings
 */
export function parseRawCsvText(text) {
  const cleanText = text.replace(/^\uFEFF/, '').trim(); // Remove UTF-8 BOM
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
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentCell.trim());
      if (currentRow.some(c => c.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some(c => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Normalizes header names for flexible CSV mapping
 */
function normalizeHeader(header) {
  return header.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Parses and validates an uploaded CSV file against the warehouse master materials
 * @param {string} csvContent - Raw CSV text
 * @param {Array} masterMaterials - Master materials catalog
 * @returns {Object} - { parsedItems, matchedCount, totalQuantityKg, totalValuation, errors, warnings }
 */
export function parseInventoryCsv(csvContent, masterMaterials) {
  const rows = parseRawCsvText(csvContent);
  if (rows.length < 2) {
    return {
      success: false,
      error: "CSV file is empty or does not contain a header row and data rows.",
      parsedItems: [],
      errors: ["File contains no data rows."],
      warnings: []
    };
  }

  const rawHeaders = rows[0];
  const headerMap = {};
  rawHeaders.forEach((h, idx) => {
    headerMap[normalizeHeader(h)] = idx;
  });

  // Find column indices
  const getCol = (possibleNames) => {
    for (const name of possibleNames) {
      const norm = normalizeHeader(name);
      if (headerMap[norm] !== undefined) return headerMap[norm];
    }
    return -1;
  };

  const codeIdx = getCol(["materialcode", "code", "itemcode", "sku", "material_code", "material"]);
  const descIdx = getCol(["description", "name", "itemdescription", "item_name", "item"]);
  const countPrimIdx = getCol(["countprimaryunits", "primaryunits", "primaryqty", "quantityprimary", "countprimary", "bags", "sacks", "boxes", "tins", "primarycount"]);
  const countSecIdx = getCol(["countsecondaryunits", "secondaryunits", "secondaryqty", "quantitysecondary", "countsecondary", "quantity", "qty", "count", "kg", "grams", "pieces"]);
  const factorIdx = getCol(["conversionfactor", "factor", "conversion"]);
  const lotIdx = getCol(["lotnumber", "lot", "lotno", "batchnumber", "batch"]);
  const expiryIdx = getCol(["expirationdate", "expirydate", "expiry", "expdate"]);
  const locationIdx = getCol(["storagelocation", "location", "pallet", "bay", "bin"]);
  const roomIdx = getCol(["storageroom", "room", "chamber"]);

  if (codeIdx === -1 && descIdx === -1) {
    return {
      success: false,
      error: "Unable to find 'Material Code' or 'Description' column in CSV header.",
      parsedItems: [],
      errors: ["Missing Material Code / SKU column in header."],
      warnings: []
    };
  }

  const masterByCode = new Map(masterMaterials.map(m => [m.code.trim().toUpperCase(), m]));
  const masterByName = new Map(masterMaterials.map(m => [m.name.trim().toLowerCase(), m]));

  const parsedItems = [];
  const errors = [];
  const warnings = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.length === 0 || row.every(c => !c)) continue; // skip blank row

    const rawCode = codeIdx !== -1 ? (row[codeIdx] || '').trim().toUpperCase() : '';
    const rawDesc = descIdx !== -1 ? (row[descIdx] || '').trim() : '';

    // Match material
    let matchedMaterial = masterByCode.get(rawCode);
    if (!matchedMaterial && rawDesc) {
      matchedMaterial = masterByName.get(rawDesc.toLowerCase());
    }

    if (!matchedMaterial) {
      warnings.push(`Row ${r + 1}: Unknown Material Code '${rawCode || rawDesc}'. Row will be skipped.`);
      continue;
    }

    // Determine quantity
    const rawCountPrim = countPrimIdx !== -1 ? parseFloat(row[countPrimIdx]) : NaN;
    const rawCountSec = countSecIdx !== -1 ? parseFloat(row[countSecIdx]) : NaN;
    const factor = (factorIdx !== -1 && !isNaN(parseFloat(row[factorIdx]))) 
      ? parseFloat(row[factorIdx]) 
      : (matchedMaterial.conversionFactor || 1);

    let finalSecondaryQty = 0;
    let finalPrimaryQty = 0;

    if (!isNaN(rawCountPrim) && rawCountPrim >= 0) {
      finalPrimaryQty = rawCountPrim;
      finalSecondaryQty = (!isNaN(rawCountSec) && rawCountSec > 0) ? rawCountSec : rawCountPrim * factor;
    } else if (!isNaN(rawCountSec) && rawCountSec >= 0) {
      finalSecondaryQty = rawCountSec;
      finalPrimaryQty = finalSecondaryQty / (factor || 1);
    } else {
      // Default to 0
      finalPrimaryQty = 0;
      finalSecondaryQty = 0;
    }

    const lotNumber = (lotIdx !== -1 && row[lotIdx]) 
      ? row[lotIdx].trim() 
      : `INIT-${matchedMaterial.code.replace(/[^A-Z0-9]/g, '')}-${new Date().toISOString().slice(2, 7).replace('-', '')}`;
    
    const expiryDate = (expiryIdx !== -1 && row[expiryIdx]) 
      ? row[expiryIdx].trim() 
      : "2027-06-30";

    const location = (locationIdx !== -1 && row[locationIdx]) 
      ? row[locationIdx].trim() 
      : "Pallet A1";

    const room = (roomIdx !== -1 && row[roomIdx]) 
      ? row[roomIdx].trim() 
      : (matchedMaterial.room || "Dry Room 1");

    parsedItems.push({
      code: matchedMaterial.code,
      name: matchedMaterial.name,
      category: matchedMaterial.category,
      brand: matchedMaterial.brand,
      supplier: matchedMaterial.supplier,
      room,
      primaryUom: matchedMaterial.primaryUom,
      secondaryUom: matchedMaterial.secondaryUom,
      conversionFactor: factor,
      threshold: matchedMaterial.threshold,
      unitCost: matchedMaterial.unitCost,
      primaryQty: finalPrimaryQty,
      secondaryQty: Math.round(finalSecondaryQty * 100) / 100,
      lotNumber,
      expiryDate,
      location
    });
  }

  const totalQuantityKg = parsedItems.reduce((sum, item) => sum + (item.secondaryQty || 0), 0);
  const totalValuation = parsedItems.reduce((sum, item) => sum + (item.primaryQty * (item.unitCost || 0)), 0);

  return {
    success: true,
    totalRowsParsed: parsedItems.length,
    matchedCount: parsedItems.length,
    totalQuantityKg,
    totalValuation,
    parsedItems,
    errors,
    warnings
  };
}

/**
 * Applies the imported baseline rows into the inventory state
 * @param {Array} currentInventory - Existing inventory state
 * @param {Array} importedRows - Rows parsed from CSV
 * @param {string} mode - 'FRESH_BASELINE' | 'UPDATE_QUANTITIES'
 * @returns {Array} - New updated inventory state
 */
export function applyInventoryImport(currentInventory, importedRows, mode = 'FRESH_BASELINE') {
  const importedMap = new Map(importedRows.map(row => [row.code, row]));

  return currentInventory.map(item => {
    const imported = importedMap.get(item.code);

    if (imported) {
      if (mode === 'FRESH_BASELINE') {
        // Complete clean baseline: set exact balance and single verified initial lot
        const newLots = imported.secondaryQty > 0 ? [
          {
            lotNumber: imported.lotNumber,
            expiryDate: imported.expiryDate,
            qtySec: imported.secondaryQty,
            location: imported.location
          }
        ] : [];

        return {
          ...item,
          currentBalance: imported.secondaryQty,
          lots: newLots,
          room: imported.room || item.room
        };
      } else {
        // UPDATE_QUANTITIES: append or adjust
        return {
          ...item,
          currentBalance: imported.secondaryQty,
          lots: imported.secondaryQty > 0 ? [
            {
              lotNumber: imported.lotNumber,
              expiryDate: imported.expiryDate,
              qtySec: imported.secondaryQty,
              location: imported.location
            }
          ] : []
        };
      }
    } else {
      // Item in master catalog not present in CSV
      if (mode === 'FRESH_BASELINE') {
        // Zero out unmentioned items to ensure fresh baseline
        return {
          ...item,
          currentBalance: 0,
          lots: []
        };
      }
      return item;
    }
  });
}
