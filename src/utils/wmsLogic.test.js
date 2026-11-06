import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  calcSecondaryQty, 
  deductFefoLots, 
  calculateRecipeIngredients, 
  calculateReorderSuggestions 
} from './wmsLogic.js';

test('calcSecondaryQty calculates dual-UoM conversion accurately', () => {
  assert.equal(calcSecondaryQty(2, 25), 50);
  assert.equal(calcSecondaryQty(3.5, 20), 70);
  assert.equal(calcSecondaryQty(0, 25), 0);
  assert.equal(calcSecondaryQty(40, 1), 40);
});

test('deductFefoLots enforces strict First-Expired, First-Out order', () => {
  const mockLots = [
    { lotNumber: 'LOT-LATER', expiryDate: '2027-06-01', qtySec: 100, location: 'Pallet B' },
    { lotNumber: 'LOT-SOONER', expiryDate: '2027-01-15', qtySec: 30, location: 'Pallet A' }
  ];

  // Requesting 20kg should be deducted entirely from LOT-SOONER
  const res1 = deductFefoLots(mockLots, 20);
  assert.equal(res1.deductedLots.length, 1);
  assert.equal(res1.deductedLots[0].lotNumber, 'LOT-SOONER');
  assert.equal(res1.deductedLots[0].deductedQty, 20);
  assert.equal(res1.remainingShortage, 0);

  // Requesting 50kg should deplete LOT-SOONER (30kg) and take 20kg from LOT-LATER
  const res2 = deductFefoLots(mockLots, 50);
  assert.equal(res2.deductedLots.length, 2);
  assert.equal(res2.deductedLots[0].lotNumber, 'LOT-SOONER');
  assert.equal(res2.deductedLots[0].deductedQty, 30);
  assert.equal(res2.deductedLots[1].lotNumber, 'LOT-LATER');
  assert.equal(res2.deductedLots[1].deductedQty, 20);
  assert.equal(res2.remainingShortage, 0);

  // Remaining lot should have 80kg
  const remainingLot = res2.updatedLots.find(l => l.lotNumber === 'LOT-LATER');
  assert.equal(remainingLot.qtySec, 80);
});

test('calculateRecipeIngredients accurately scales ingredients and computes grams and kg', () => {
  const mockRecipe = {
    sku: 'BRD-TEST',
    name: 'Test Pandesal',
    ingredients: [
      { code: 'RM-FLR-001', name: 'Flour', pct: 100, gramsPerBatch: 3000 },
      { code: 'RM-SWT-001', name: 'Sugar', pct: 20, gramsPerBatch: 600 }
    ]
  };

  const scaled2x = calculateRecipeIngredients(mockRecipe, 2.0);
  assert.equal(scaled2x.length, 2);
  assert.equal(scaled2x[0].requiredGrams, 6000);
  assert.equal(scaled2x[0].requiredKg, 6.0);
  assert.equal(scaled2x[1].requiredGrams, 1200);
  assert.equal(scaled2x[1].requiredKg, 1.2);

  const scaledHalf = calculateRecipeIngredients(mockRecipe, 0.5);
  assert.equal(scaledHalf[0].requiredGrams, 1500);
  assert.equal(scaledHalf[0].requiredKg, 1.5);
});

test('calculateReorderSuggestions identifies low-stock items and calculates recommended PO package quantities', () => {
  const mockInventory = [
    {
      code: 'RM-FLR-LOW',
      name: 'Low Flour',
      currentBalance: 100, // <= threshold (500)
      threshold: 500,
      conversionFactor: 25,
      unitCost: 1000,
      primaryUom: 'Sack',
      secondaryUom: 'kg',
      supplier: 'Test Supplier'
    },
    {
      code: 'RM-SUG-HIGH',
      name: 'High Sugar',
      currentBalance: 2000, // > threshold (500)
      threshold: 500,
      conversionFactor: 50,
      unitCost: 2000,
      primaryUom: 'Sack',
      secondaryUom: 'kg',
      supplier: 'Test Supplier'
    }
  ];

  const suggestions = calculateReorderSuggestions(mockInventory);
  assert.equal(suggestions.length, 1);
  assert.equal(suggestions[0].code, 'RM-FLR-LOW');
  // target = 500 * 2 = 1000. Needed = 1000 - 100 = 900. Factor = 25. Suggested sacks = 900 / 25 = 36 sacks.
  assert.equal(suggestions[0].suggestedPrimaryQty, 36);
  assert.equal(suggestions[0].totalSecondaryQty, 900);
  assert.equal(suggestions[0].estimatedCost, 36000);
});
