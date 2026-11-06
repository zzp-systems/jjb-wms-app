// Signature Products Inventory & Production Data
// Focused on Flagship Delicacies: Biscocho and Otap alongside Outlet Breads

export const SIGNATURE_PRODUCTS_INVENTORY = [
  {
    sku: "BIS-001",
    name: "Biscocho Toasted Bread Delicacy",
    shortName: "Biscocho",
    category: "Pasalubong Delicacy",
    productionFacility: "Indangan Biscocho Commercial Hall",
    unit: "packs",
    piecesPerPack: 12,
    currentStock: 485, // packs in finished goods warehouse
    safetyThreshold: 250, // minimum reserve
    maxCapacity: 800,
    inProduction: 120, // currently in oven / kitted in Dry Room 2
    dailyDemand: 95,
    unitCost: 38.5,
    wholesalePrice: 75.0,
    color: "#C8963E", // Gold
    status: "HEALTHY",
    storageArea: "Finished Goods Staging Bay 1"
  },
  {
    sku: "OTP-001",
    name: "Otap Layered Puff Pastry",
    shortName: "Otap",
    category: "Laminated Dry Delicacy",
    productionFacility: "Indangan Otap Laminated Hall",
    unit: "packs",
    piecesPerPack: 10,
    currentStock: 320, // packs
    safetyThreshold: 300, // approaching threshold!
    maxCapacity: 750,
    inProduction: 180, // active batch kitted
    dailyDemand: 110,
    unitCost: 32.0,
    wholesalePrice: 65.0,
    color: "#5B2E7A", // Purple
    status: "ATTENTION_NEEDED",
    storageArea: "Finished Goods Staging Bay 2"
  },
  {
    sku: "BRD-PAN-001",
    name: "Classic Davao Pandesal",
    shortName: "Pandesal",
    category: "Daily Outlet Bread",
    productionFacility: "Pan de Verde & Laurice Ovens",
    unit: "scaled kits (450 pcs)",
    piecesPerPack: 450,
    currentStock: 24, // scaled mix kits
    safetyThreshold: 15,
    maxCapacity: 50,
    inProduction: 8,
    dailyDemand: 18,
    unitCost: 450.0,
    wholesalePrice: 900.0,
    color: "#1E7A3E", // Green
    status: "HEALTHY",
    storageArea: "Dry Room 2 Staging"
  },
  {
    sku: "BRD-UBE-001",
    name: "Special Ube Cheese Pandesal",
    shortName: "Ube Pandesal",
    category: "Signature Pastry",
    productionFacility: "Pan de Verde & Laurice Ovens",
    unit: "scaled kits (300 pcs)",
    piecesPerPack: 300,
    currentStock: 12,
    safetyThreshold: 10,
    maxCapacity: 35,
    inProduction: 4,
    dailyDemand: 8,
    unitCost: 420.0,
    wholesalePrice: 850.0,
    color: "#8E44AD", // Violet
    status: "HEALTHY",
    storageArea: "Dry Room 2 Staging"
  },
  {
    sku: "PST-ENS-001",
    name: "Special Butter Ensaymada",
    shortName: "Ensaymada",
    category: "Brioche Pastry",
    productionFacility: "Pan de Verde Kitchen",
    unit: "boxes (12 pcs)",
    piecesPerPack: 12,
    currentStock: 45,
    safetyThreshold: 50, // Below safety threshold!
    maxCapacity: 150,
    inProduction: 25,
    dailyDemand: 22,
    unitCost: 180.0,
    wholesalePrice: 360.0,
    color: "#D68910", // Amber
    status: "LOW_STOCK",
    storageArea: "Air-Conditioned Pastry Racks"
  },
  {
    sku: "BRD-MON-001",
    name: "Classic Monay & Sweet Loaf",
    shortName: "Monay Loaf",
    category: "Heavy Loaf Breads",
    productionFacility: "Laurice Bakery Line",
    unit: "scaled kits (250 pcs)",
    piecesPerPack: 250,
    currentStock: 18,
    safetyThreshold: 12,
    maxCapacity: 40,
    inProduction: 6,
    dailyDemand: 10,
    unitCost: 310.0,
    wholesalePrice: 650.0,
    color: "#B9770E",
    status: "HEALTHY",
    storageArea: "Dry Room 2 Staging"
  }
];

// 7-Day Stock Trajectory & Burn Rate Comparison for Flagship Biscocho vs Otap
export const BISCOCHO_OTAP_7DAY_TREND = [
  { day: "Oct 30", date: "10/30", biscochoStock: 520, biscochoShipments: 85, otapStock: 460, otapShipments: 95 },
  { day: "Oct 31", date: "10/31", biscochoStock: 480, biscochoShipments: 110, otapStock: 410, otapShipments: 120 },
  { day: "Nov 01", date: "11/01", biscochoStock: 560, biscochoShipments: 90, otapStock: 450, otapShipments: 105 }, // Restock
  { day: "Nov 02", date: "11/02", biscochoStock: 510, biscochoShipments: 130, otapStock: 390, otapShipments: 135 },
  { day: "Nov 03", date: "11/03", biscochoStock: 470, biscochoShipments: 95, otapStock: 340, otapShipments: 115 },
  { day: "Nov 04", date: "11/04", biscochoStock: 530, biscochoShipments: 100, otapStock: 370, otapShipments: 110 }, // Restock
  { day: "Nov 05", date: "11/05", biscochoStock: 485, biscochoShipments: 95, otapStock: 320, otapShipments: 110 }
];

// Distribution Channels Breakdown for Biscocho & Otap
export const SIGNATURE_OUTLET_DISTRIBUTION = [
  { name: "Pan de Verde (Communal)", biscochoPct: 28, otapPct: 24, totalPacks: 220, color: "#C8963E" },
  { name: "Laurice Delicacies (Bankerohan)", biscochoPct: 32, otapPct: 30, totalPacks: 260, color: "#5B2E7A" },
  { name: "SM City & Malls Pasalubong", biscochoPct: 22, otapPct: 26, totalPacks: 205, color: "#1E7A3E" },
  { name: "Airport Kiosk & Travel Hubs", biscochoPct: 18, otapPct: 20, totalPacks: 165, color: "#D68910" }
];

// Raw Material Batch Capacity for Biscocho & Otap
// Based on current raw materials in Indangan Bodega chambers
export const RAW_MATERIAL_BATCH_POTENTIAL = [
  {
    product: "Biscocho (1,000 pcs / 83 pk)",
    limitingIngredient: "Buttercup Margarine (Cold Room)",
    batchesPossible: 64, // 129kg available / 2kg per batch
    flourBatchesPossible: 171, // 4,275kg Rossa Hard Flour / 25kg
    sugarBatchesPossible: 208, // 1,250kg Busco / 6kg
    maxPotentialPacks: 5312,
    readinessScore: 92
  },
  {
    product: "Otap (1,200 pcs / 100 dozen)",
    limitingIngredient: "Vegetable Shortening (Sunny Suy)",
    batchesPossible: 109, // 959.8kg available / 8.75kg per batch
    flourBatchesPossible: 213, // 4,275kg Rossa / 20kg
    sugarBatchesPossible: 200, // 1,250kg Busco / 6.25kg
    maxPotentialPacks: 10900,
    readinessScore: 96
  }
];
