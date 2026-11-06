import { test } from 'node:test';
import assert from 'node:assert';
import { 
  generateInventoryTemplateCsv, 
  parseRawCsvText, 
  parseInventoryCsv, 
  applyInventoryImport 
} from './csvImporter.js';

const mockMaster = [
  {
    code: "RM-FLR-001",
    name: "Continental All Purpose Flour",
    category: "Flour & Grains",
    room: "Dry Room 1",
    primaryUom: "Sack",
    secondaryUom: "kg",
    conversionFactor: 25.00,
    threshold: 250,
    unitCost: 1050,
    currentBalance: 1250,
    lots: [{ lotNumber: "MOCK-1", expiryDate: "2027-01-01", qtySec: 1250, location: "Pallet A1" }]
  },
  {
    code: "RM-SWT-001",
    name: "Crystal Brown Sugar",
    category: "Sweeteners",
    room: "Dry Room 1",
    primaryUom: "Sack",
    secondaryUom: "kg",
    conversionFactor: 50.00,
    threshold: 500,
    unitCost: 2200,
    currentBalance: 2500,
    lots: [{ lotNumber: "MOCK-2", expiryDate: "2027-02-01", qtySec: 2500, location: "Pallet B1" }]
  }
];

test('generateInventoryTemplateCsv creates valid CSV string with headers and master codes', () => {
  const csv = generateInventoryTemplateCsv(mockMaster);
  assert(csv.includes("Material Code,Description,Category"), "Contains header");
  assert(csv.includes("RM-FLR-001"), "Contains RM-FLR-001");
  assert(csv.includes("RM-SWT-001"), "Contains RM-SWT-001");
});

test('parseRawCsvText correctly parses commas inside quotes', () => {
  const text = 'Code,Description,Qty\n"RM-FLR-001","Flour, Hard, High Gluten",10\nRM-SWT-001,Sugar,5';
  const rows = parseRawCsvText(text);
  assert.strictEqual(rows.length, 3);
  assert.strictEqual(rows[1][1], 'Flour, Hard, High Gluten');
  assert.strictEqual(rows[1][2], '10');
});

test('parseInventoryCsv correctly converts primary quantities and matches items', () => {
  const sampleCsv = `Material Code,Description,Count Primary Units,Lot Number,Expiration Date,Storage Location
RM-FLR-001,Continental All Purpose Flour,10,LOT-CNT-999,2027-08-15,Bay 3
RM-SWT-001,Crystal Brown Sugar,4,LOT-SWT-888,2027-09-01,Bay 4`;

  const result = parseInventoryCsv(sampleCsv, mockMaster);
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.matchedCount, 2);

  const flour = result.parsedItems.find(i => i.code === "RM-FLR-001");
  assert.strictEqual(flour.primaryQty, 10);
  assert.strictEqual(flour.secondaryQty, 250); // 10 sacks * 25 kg = 250 kg
  assert.strictEqual(flour.lotNumber, "LOT-CNT-999");

  const sugar = result.parsedItems.find(i => i.code === "RM-SWT-001");
  assert.strictEqual(sugar.primaryQty, 4);
  assert.strictEqual(sugar.secondaryQty, 200); // 4 sacks * 50 kg = 200 kg
});

test('applyInventoryImport replaces old lots with exact new baseline', () => {
  const importedItems = [
    {
      code: "RM-FLR-001",
      primaryQty: 20,
      secondaryQty: 500,
      lotNumber: "INIT-CNT-01",
      expiryDate: "2027-10-01",
      location: "Pallet A1"
    }
  ];

  const updatedInventory = applyInventoryImport(mockMaster, importedItems, 'FRESH_BASELINE');
  const flour = updatedInventory.find(i => i.code === "RM-FLR-001");
  assert.strictEqual(flour.currentBalance, 500);
  assert.strictEqual(flour.lots.length, 1);
  assert.strictEqual(flour.lots[0].lotNumber, "INIT-CNT-01");
  assert.strictEqual(flour.lots[0].qtySec, 500);

  // Unmentioned item in FRESH_BASELINE should be zeroed out
  const sugar = updatedInventory.find(i => i.code === "RM-SWT-001");
  assert.strictEqual(sugar.currentBalance, 0);
  assert.strictEqual(sugar.lots.length, 0);
});
