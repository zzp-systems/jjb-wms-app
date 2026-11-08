import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSpecialtyProposal,
  promoteProposalToMasterRecipe
} from './specialtyRecipeLogic.js';

test('createSpecialtyProposal validates required fields and computes standardized name', () => {
  assert.throws(() => {
    createSpecialtyProposal({ title: '' });
  }, /Recipe Title \/ Commercial Name is required/);

  const proposal = createSpecialtyProposal({
    title: 'Ube Cheese Piaya',
    bakerName: 'Feliciano T. Gomera',
    locationName: 'Pan de Verde Outlet',
    flourKg: 4.0,
    flourDescription: 'Flour Blend (2.5 kg APF + 1.5 kg 3rd Class)',
    unitPieceYield: 120,
    pieceWeightGrams: 45,
    srp: 12.0,
    estimatedCostPerUnit: 5.0,
    ingredients: [
      { code: 'RM-FLR-001', name: 'All Purpose Flour', gramsPerBatch: 2500 },
      { code: 'RM-FLR-002', name: '3rd Class Flour', gramsPerBatch: 1500 },
      { code: 'RM-SWT-001', name: 'Brown Sugar', gramsPerBatch: 800 }
    ]
  });

  assert.equal(
    proposal.name,
    'Ube Cheese Piaya – 4.0 kg Flour Blend (2.5 kg APF + 1.5 kg 3rd Class) | Yield: ~120 pieces (45 g each)'
  );
  assert.equal(proposal.standardBatchFlourKg, 4.0);
  assert.equal(proposal.unitPieceYield, 120);
  assert.equal(proposal.status, 'PENDING_APPROVAL');
  assert.equal(proposal.bakerName, 'Feliciano T. Gomera');

  // Check baker's percentage calculation on base flour 4000g: 800g / 4000g = 20%
  const sugar = proposal.ingredients.find(i => i.code === 'RM-SWT-001');
  assert.equal(sugar.pct, 20.0);
  // Check margin: (12 - 5) / 12 = 58.3%
  assert.equal(proposal.grossMarginPct, 58.3);
});

test('promoteProposalToMasterRecipe transforms proposal to official Master Recipe with custom flag', () => {
  const proposal = createSpecialtyProposal({
    title: 'Spanish Pan de Coco',
    flourKg: 5.0,
    flourDescription: '1st Class Flour Basis',
    unitPieceYield: 150,
    pieceWeightGrams: 50,
    srp: 8.0,
    estimatedCostPerUnit: 3.2,
    ingredients: [
      { code: 'RM-FLR-003', name: '1st Class Hard Flour', gramsPerBatch: 5000, pct: 100 }
    ]
  });

  const masterRecipe = promoteProposalToMasterRecipe(proposal, 'BRD-PDC-001');
  assert.equal(masterRecipe.sku, 'BRD-PDC-001');
  assert.equal(masterRecipe.isCustomSpecialty, true);
  assert.equal(masterRecipe.standardBatchFlourKg, 5.0);
  assert.equal(masterRecipe.unitPieceYield, 150);
  assert.match(masterRecipe.name, /Spanish Pan de Coco – 5.0 kg 1st Class Flour Basis/);
});
