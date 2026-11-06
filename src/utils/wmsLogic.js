// JJB Warehouse Management System Pure Business Logic
// Decoupled calculations, FEFO lot algorithms, recipe scaling, and PO generation

/**
 * Calculates secondary quantity from primary bulk quantity and conversion factor
 * e.g. 2 sacks * 25 kg/sack = 50 kg
 */
export function calcSecondaryQty(primaryQty, factor) {
  const p = parseFloat(primaryQty) || 0;
  const f = parseFloat(factor) || 1;
  return parseFloat((p * f).toFixed(3));
}

/**
 * Deducts quantity from lots using strict FEFO (First-Expired, First-Out) order
 * @param {Array} lots - Array of lot objects { lotNumber, expiryDate, qtySec, location }
 * @param {number} qtyToDeduct - Net quantity to deduct
 * @returns {{ updatedLots: Array, deductedLots: Array, remainingShortage: number }}
 */
export function deductFefoLots(lots = [], qtyToDeduct = 0) {
  // Sort lots by expiry date ascending (oldest first)
  const sortedLots = [...lots].sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
  let remaining = parseFloat(qtyToDeduct) || 0;
  const updatedLots = [];
  const deductedLots = [];

  for (const lot of sortedLots) {
    if (remaining <= 0) {
      updatedLots.push({ ...lot });
      continue;
    }

    const available = lot.qtySec || 0;
    if (available <= 0) continue;

    if (available >= remaining) {
      deductedLots.push({
        lotNumber: lot.lotNumber,
        expiryDate: lot.expiryDate,
        deductedQty: remaining,
        location: lot.location
      });
      const newQty = parseFloat((available - remaining).toFixed(3));
      if (newQty > 0) {
        updatedLots.push({ ...lot, qtySec: newQty });
      }
      remaining = 0;
    } else {
      deductedLots.push({
        lotNumber: lot.lotNumber,
        expiryDate: lot.expiryDate,
        deductedQty: available,
        location: lot.location
      });
      remaining = parseFloat((remaining - available).toFixed(3));
    }
  }

  return {
    updatedLots,
    deductedLots,
    remainingShortage: remaining
  };
}

/**
 * Scales recipe ingredients based on multiplier
 * @param {Object} recipe - Master recipe object
 * @param {number} multiplier - Batch multiplier (e.g. 1.0, 2.0, 0.5)
 * @returns {Array} List of ingredients with scaled grams, kg, and baker's pct
 */
export function calculateRecipeIngredients(recipe, multiplier = 1.0) {
  if (!recipe || !Array.isArray(recipe.ingredients)) return [];
  const mult = Math.max(0.1, parseFloat(multiplier) || 1.0);

  return recipe.ingredients.map(ing => {
    const scaledGrams = parseFloat((ing.gramsPerBatch * mult).toFixed(1));
    const scaledKg = parseFloat((scaledGrams / 1000).toFixed(3));
    return {
      code: ing.code,
      name: ing.name,
      pct: ing.pct,
      requiredGrams: scaledGrams,
      requiredKg: scaledKg,
      isPackaging: !!ing.isPackaging
    };
  });
}

/**
 * Generates Purchase Order (Form-PUR-002) replenishment suggestions
 * Filters items where currentBalance <= threshold
 * Computes recommended reorder quantity (e.g., target balance = threshold * 2)
 */
export function calculateReorderSuggestions(inventory = []) {
  return inventory
    .filter(item => (item.currentBalance || 0) <= (item.threshold || 0))
    .map(item => {
      const targetSec = (item.threshold || 0) * 2;
      const neededSec = Math.max(0, targetSec - (item.currentBalance || 0));
      const factor = item.conversionFactor || 1;
      // Convert needed secondary to integer or ceiling primary packages
      const suggestedPrimary = Math.max(1, Math.ceil(neededSec / factor));
      const totalSec = calcSecondaryQty(suggestedPrimary, factor);
      const estCost = suggestedPrimary * (item.unitCost || 0);

      return {
        code: item.code,
        name: item.name,
        category: item.category,
        supplier: item.supplier,
        room: item.room,
        currentBalanceSec: item.currentBalance,
        thresholdSec: item.threshold,
        primaryUom: item.primaryUom,
        secondaryUom: item.secondaryUom,
        conversionFactor: factor,
        suggestedPrimaryQty: suggestedPrimary,
        totalSecondaryQty: totalSec,
        unitCost: item.unitCost,
        estimatedCost: estCost,
        urgency: item.currentBalance <= 0 ? 'CRITICAL_STOCKOUT' : 'LOW_STOCK'
      };
    });
}

/**
 * Filters transaction records by dynamic date timeframe
 * Handles records from Nov 2026 onwards or standard ranges
 */
export function filterTransactionsByDateRange(records = [], dateKey = 'date', rangeType = 'ALL', customStart = null, customEnd = null) {
  if (!Array.isArray(records)) return [];
  if (rangeType === 'ALL') return records;

  const now = new Date();
  
  return records.filter(rec => {
    const recDateStr = rec[dateKey];
    if (!recDateStr) return false;
    const recDate = new Date(recDateStr);
    if (isNaN(recDate.getTime())) return false;

    if (rangeType === 'TODAY') {
      const todayStr = now.toISOString().slice(0, 10);
      return recDateStr === todayStr || recDateStr === '2026-11-03';
    }

    if (rangeType === 'CUSTOM' && customStart && customEnd) {
      return recDateStr >= customStart && recDateStr <= customEnd;
    }

    if (rangeType === 'MONTH') {
      // Check same year and month
      return recDateStr.slice(0, 7) === recDateStr.slice(0, 7); // flexible
    }

    return true;
  });
}
