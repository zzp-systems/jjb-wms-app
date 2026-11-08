// Pure business logic for Baker Specialty & Seasonal Recipe Submissions (Form-RND-001)
// Enables outlet bakers to propose recipes and Romeo/Zaphyr to incorporate into Master Formulations

export const SPECIALTY_RECIPES_STORAGE_KEY = 'JJB_WMS_LIVE_V4_6_SPECIALTY_RECIPES';

/**
 * Creates a validated specialty recipe proposal object
 */
export function createSpecialtyProposal(data = {}) {
  const {
    title = '',
    requestingLocation = 'pan-de-verde',
    locationName = 'Pan de Verde Outlet',
    bakerName = '',
    category = 'Signature Pastry / Specialty',
    flourKg = 3.0,
    flourDescription = 'Flour Blend',
    unitPieceYield = 100,
    pieceWeightGrams = 40,
    srp = 8.0,
    estimatedCostPerUnit = 3.5,
    doughExitTemp = '26°C – 28°C',
    mixingNotes = '',
    ingredients = []
  } = data;

  if (!title.trim()) {
    throw new Error('Recipe Title / Commercial Name is required.');
  }

  const cleanFlourKg = Math.max(0.1, parseFloat(flourKg) || 1.0);
  const cleanYield = Math.max(1, parseInt(unitPieceYield, 10) || 1);
  const cleanSrp = Math.max(0.5, parseFloat(srp) || 5.0);
  const cleanCost = Math.max(0.1, parseFloat(estimatedCostPerUnit) || 2.5);
  const grossMarginPct = parseFloat((((cleanSrp - cleanCost) / cleanSrp) * 100).toFixed(1));

  // Standardized naming: "Title – X.X kg Flour Description | Yield: ~YY pieces (ZZ g each)"
  const formattedName = `${title.trim()} – ${cleanFlourKg.toFixed(1)} kg ${flourDescription.trim() || 'Flour Basis'} | Yield: ~${cleanYield} pieces${pieceWeightGrams ? ` (${pieceWeightGrams} g each)` : ''}`;
  const timestamp = Date.now();
  const proposalId = `SPEC-${timestamp.toString().slice(-6)}`;
  const proposedSku = `SPC-${title.slice(0, 3).toUpperCase()}-${timestamp.toString().slice(-3)}`;

  // Normalize ingredients and calculate baker's percentage based on total flour
  const baseFlourGrams = cleanFlourKg * 1000;
  const processedIngredients = (ingredients || []).map((ing, idx) => {
    const grams = parseFloat(ing.gramsPerBatch) || 0;
    const pct = baseFlourGrams > 0 ? parseFloat(((grams / baseFlourGrams) * 100).toFixed(1)) : 0;
    return {
      code: ing.code || `RM-SPEC-${idx + 1}`,
      name: ing.name || `Ingredient #${idx + 1}`,
      gramsPerBatch: grams,
      pct: ing.pct !== undefined ? ing.pct : pct,
      isWater: !!ing.isWater,
      isAsNeeded: !!ing.isAsNeeded
    };
  });

  return {
    proposalId,
    sku: proposedSku,
    title: title.trim(),
    name: formattedName,
    category,
    targetFacility: locationName,
    requestingLocation,
    bakerName: bakerName.trim() || 'Branch Head Baker',
    standardBatchFlourKg: cleanFlourKg,
    unitPieceYield: cleanYield,
    pieceWeightGrams: parseFloat(pieceWeightGrams) || 40,
    doughExitTempTarget: doughExitTemp,
    ccp1LethalityTarget: '> 95°C',
    waterActivityLimit: 'Moist Crumb',
    unitProductionCost: cleanCost,
    wholesaleTransferPrice: parseFloat((cleanCost * 1.5).toFixed(2)),
    srp: cleanSrp,
    grossMarginPct,
    mixingNotes: mixingNotes.trim(),
    ingredients: processedIngredients,
    status: 'PENDING_APPROVAL', // PENDING_APPROVAL | APPROVED | REJECTED
    submittedAt: new Date().toISOString()
  };
}

/**
 * Transforms an approved proposal into an official Master Recipe object
 */
export function promoteProposalToMasterRecipe(proposal, officialSku = null) {
  if (!proposal) throw new Error('Proposal is required');

  return {
    sku: officialSku || proposal.sku,
    name: proposal.name,
    category: proposal.category || 'Signature Specialty',
    targetFacility: proposal.targetFacility || 'Plant-Wide & Outlets',
    standardBatchFlourKg: proposal.standardBatchFlourKg,
    unitPieceYield: proposal.unitPieceYield,
    doughExitTempTarget: proposal.doughExitTempTarget || '26°C – 28°C',
    ccp1LethalityTarget: proposal.ccp1LethalityTarget || '> 95°C',
    waterActivityLimit: proposal.waterActivityLimit || 'Moist Crumb',
    unitProductionCost: proposal.unitProductionCost || 2.5,
    wholesaleTransferPrice: proposal.wholesaleTransferPrice || 4.0,
    srp: proposal.srp || 6.0,
    grossMarginPct: proposal.grossMarginPct || 50.0,
    ingredients: proposal.ingredients || [],
    isCustomSpecialty: true,
    approvedBy: 'Romeo Malusay & Zaphyr Pomicpic',
    approvedAt: new Date().toISOString()
  };
}

/**
 * Loads stored specialty recipe proposals from localStorage (safe in SSR/Node)
 */
export function loadStoredSpecialtyProposals() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(SPECIALTY_RECIPES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Saves proposals to localStorage
 */
export function persistSpecialtyProposals(proposals = []) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(SPECIALTY_RECIPES_STORAGE_KEY, JSON.stringify(proposals));
  } catch (err) {
    console.error('Failed to save specialty proposals to localStorage:', err);
  }
}
