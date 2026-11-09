// Master Materials Register with Dual Unit of Measure (UoM) Engine
// Sourced from Authentic JJB Inventory as of November 8, 2026 (Indangan Plant LTO No. 3000013388488)
// Rows 1-44: Raw Materials, Leaveners, Flavors & Utilities
// Rows 45-76: Packaging, Packing & Wrapping Materials (Bundles/Packs/Pcs)

export const MASTER_MATERIALS = [
  {
    "code": "RM-FLR-001",
    "category": "Flour & Grains",
    "brand": "JJB Standard",
    "name": "All Purpose Flour",
    "supplier": "Lucky Roma Trading / JCT Wheat",
    "room": "Dry Room 1",
    "primaryUom": "Sack",
    "secondaryUom": "kg",
    "conversionFactor": 25,
    "threshold": 250,
    "unitCost": 1050,
    "currentBalance": 0,
    "lots": []
  },
  {
    "code": "RM-FLR-002",
    "category": "Flour & Grains",
    "brand": "Isla",
    "name": "3rd Class Soft Wheat Flour (Isla - General Milling Corporation)",
    "supplier": "Lucky Roma Trading / JCT Wheat",
    "room": "Dry Room 1",
    "primaryUom": "Sack",
    "secondaryUom": "kg",
    "conversionFactor": 25,
    "threshold": 250,
    "unitCost": 920,
    "currentBalance": 375,
    "lots": [
      {
        "lotNumber": "LOT-RMFLR002-INIT",
        "expiryDate": "2027-06-30",
        "qtySec": 375,
        "location": "Pallet A1"
      }
    ]
  },
  {
    "code": "RM-FLR-003",
    "category": "Flour & Grains",
    "brand": "Naga Rossa",
    "name": "1st Class Hard Wheat Flour (Naga Rossa - Asian Grains Corp)",
    "supplier": "Lucky Roma Trading / JCT Wheat",
    "room": "Dry Room 1",
    "primaryUom": "Sack",
    "secondaryUom": "kg",
    "conversionFactor": 25,
    "threshold": 250,
    "unitCost": 1120,
    "currentBalance": 3325,
    "lots": [
      {
        "lotNumber": "LOT-RMFLR003-INIT",
        "expiryDate": "2027-06-30",
        "qtySec": 3325,
        "location": "Pallet A1"
      }
    ]
  },
  {
    "code": "RM-FLR-005",
    "category": "Flour & Grains",
    "brand": "White Tower",
    "name": "Refined Cornstarch (White Tower)",
    "supplier": "Lucky Roma Trading / JCT Wheat",
    "room": "Dry Room 1",
    "primaryUom": "Sack",
    "secondaryUom": "kg",
    "conversionFactor": 25,
    "threshold": 250,
    "unitCost": 850,
    "currentBalance": 75,
    "lots": [
      {
        "lotNumber": "LOT-RMFLR005-INIT",
        "expiryDate": "2027-06-30",
        "qtySec": 75,
        "location": "Pallet A1"
      }
    ]
  },
  {
    "code": "RM-FLR-006",
    "category": "Flour & Grains",
    "brand": "Low",
    "name": "Soft Cake Flour (Low-Protein / Chlorinated)",
    "supplier": "Lucky Roma Trading / JCT Wheat",
    "room": "Dry Room 1",
    "primaryUom": "Sack",
    "secondaryUom": "kg",
    "conversionFactor": 25,
    "threshold": 250,
    "unitCost": 980,
    "currentBalance": 0,
    "lots": []
  },
  {
    "code": "RM-DRY-005",
    "category": "Flour & Grains",
    "brand": "Good Seed Food Co.",
    "name": "Desiccated Coconut (Good Seed Food Co. - 500g)",
    "supplier": "Lucky Roma Trading / JCT Wheat",
    "room": "Dry Room 1",
    "primaryUom": "Bag",
    "secondaryUom": "kg",
    "conversionFactor": 0.5,
    "threshold": 20,
    "unitCost": 95,
    "currentBalance": 5,
    "lots": [
      {
        "lotNumber": "LOT-RMDRY005-INIT",
        "expiryDate": "2027-06-30",
        "qtySec": 5,
        "location": "Pallet A1"
      }
    ]
  },
  {
    "code": "RM-FAT-007",
    "category": "Fats & Oils",
    "brand": "Buttercup",
    "name": "Refrigerated Margarine (Buttercup)",
    "supplier": "Lucky Roma Trading / JCT Wheat",
    "room": "Cold Room",
    "primaryUom": "Block",
    "secondaryUom": "kg",
    "conversionFactor": 5,
    "threshold": 20,
    "unitCost": 550,
    "currentBalance": 370,
    "lots": [
      {
        "lotNumber": "LOT-RMFAT007-INIT",
        "expiryDate": "2027-06-30",
        "qtySec": 370,
        "location": "Pallet A1"
      }
    ]
  },
  {
    // FIX: code renamed from "RM-FAT-001-BUTTER" → "RM-FAT-001"
    // Reason: CSV (row 8) still uses RM-FAT-001 for this item.
    // The original RM-FAT-001 (Buttercup) has been renamed to RM-FAT-007 above,
    // so this slot is now free. Aligning with CSV prevents a duplicate
    // "Magnolia Unsalted Butter" record (one from seed as RM-FAT-001-BUTTER,
    // one from CSV as RM-FAT-001).
    "code": "RM-FAT-001",
    "category": "Fats & Oils",
    "brand": "Magnolia Gold",
    "name": "Unsalted Butter (Magnolia Gold)",
    "supplier": "Lucky Roma Trading / JCT Wheat",
    "room": "Cold Room",
    "primaryUom": "Block",
    "secondaryUom": "kg",
    "conversionFactor": 5,
    "threshold": 20,
    "unitCost": 1100,
    "currentBalance": 395,
    "lots": [
      {
        "lotNumber": "LOT-RMFAT001-INIT",
        "expiryDate": "2027-06-30",
        "qtySec": 395,
        "location": "Pallet A1"
      }
    ]
  },
  {
    "code": "RM-FAT-002",
    "category": "Fats & Oils",
    "brand": "Marca Leon",
    "name": "Coconut Oil (Marca Leon)",
    "supplier": "Lucky Roma Trading / JCT Wheat",
    "room": "Wet Room",
    "primaryUom": "Tin Can",
    "secondaryUom": "kg",
    "conversionFactor": 17,
    "threshold": 20,
    "unitCost": 1450,
    "currentBalance": 425,
    "lots": [
      {
        "lotNumber": "LOT-RMFAT002-INIT",
        "expiryDate": "2027-06-30",
        "qtySec": 425,
        "location": "Pallet A1"
      }
    ]
  },
  {
    "code": "RM-FAT-003",
    "category": "Fats & Oils",
    "brand": "Sunny Suy",
    "name": "Vegetable Shortening (Sunny Suy)",
    "supplier": "Lucky Roma Trading / JCT Wheat",
    "room": "Wet Room",
    "primaryUom": "Laton",
    "secondaryUom": "kg",
    "conversionFactor": 30,
    "threshold": 250,
    "unitCost": 2100,
    "currentBalance": 1260,
    "lots": [
      {
        "lotNumber": "LOT-RMFAT003-INIT",
        "expiryDate": "2027-06-30",
        "qtySec": 1260,
        "location": "Pallet A1"
      }
    ]
  },
  {
    "code": "RM-FAT-004",
    "category": "Fats & Oils",
    "brand": "Sunny Suy",
    "name": "Premium Margarine (Sunny Suy)",
    "supplier": "Lucky Roma Trading / JCT Wheat",
    "room": "Wet Room",
    "primaryUom": "Laton",
    "secondaryUom": "kg",
    "conversionFactor": 45,
    "threshold": 250,
    "unitCost": 2950,
    "currentBalance": 90,
    "lots": [
      {
        "lotNumber": "LOT-RMFAT004-INIT",
        "expiryDate": "2027-06-30",
        "qtySec": 90,
        "location": "Pallet A1"
      }
    ]
  },
  {
    "code": "RM-FAT-005",
    "category": "Fats & Oils",
    "brand": "Unlabeled",
    "name": "Palm Oil (Unlabeled)",
    "supplier": "Lucky Roma Trading / JCT Wheat",
    "room": "Wet Room",
    "primaryUom": "Tin Can",
    "secondaryUom": "kg",
    "conversionFactor": 17,
    "threshold": 20,
    "unitCost": 1380,
    "currentBalance": 136,
    "lots": [
      {
        "lotNumber": "LOT-RMFAT005-INIT",
        "expiryDate": "2027-06-30",
        "qtySec": 136,
        "location": "Pallet A1"
      }
    ]
  },
  {
    "code": "RM-SWT-001",
    "category": "Sweeteners",
    "brand": "JJB Standard",
    "name": "Crystal Brown Sugar",
    "supplier": "Lucky Roma Trading / JCT Wheat",
    "room": "Dry Room 1",
    "primaryUom": "Sack",
    "secondaryUom": "kg",
    "conversionFactor": 50,
    "threshold": 250,
    "unitCost": 2200,
    "currentBalance": 1250,
    "lots": [
      {
        "lotNumber": "LOT-RMSWT001-INIT",
        "expiryDate": "2027-06-30",
        "qtySec": 1250,
        "location": "Pallet A1"
      }
    ]
  },
  {
    "code": "RM-SWT-002",
    "category": "Sweeteners",
    "brand": "JJB Standard",
    "name": "Refined White Sugar",
    "supplier": "Lucky Roma Trading / JCT Wheat",
    "room": "Dry Room 1",
    "primaryUom": "Sack",
    "secondaryUom": "kg",
    "conversionFactor": 50,
    "threshold": 250,
    "unitCost": 2650,
    "currentBalance": 300,
    "lots": [
      {
        "lotNumber": "LOT-RMSWT002-INIT",
        "expiryDate": "2027-06-30",
        "qtySec": 300,
        "location": "Pallet A1"
      }
    ]
  },
  {
    "code": "RM-SWT-003",
    "category": "Sweeteners & Salt",
    "brand": "JJB Standard",
    "name": "Refined Iodized Fine Salt",
    "supplier": "Lucky Roma Trading / JCT Wheat",
    "room": "Dry Room 1",
    "primaryUom": "Sack",
    "secondaryUom": "kg",
    "conversionFactor": 25,
    "threshold": 250,
    "unitCost": 380,
    "currentBalance": 0,
    "lots": []
  },
  {
    "code": "RM-SWT-004",
    "category": "Sweeteners",
    "brand": "JJB Standard",
    "name": "Confectioners / Powdered Icing Sugar",
    "supplier": "Lucky Roma Trading / JCT Wheat",
    "room": "Dry Room 1",
    "primaryUom": "Pack",
    "secondaryUom": "kg",
    "conversionFactor": 2,
    "threshold": 20,
    "unitCost": 120,
    "currentBalance": 20,
    "lots": [
      {
        "lotNumber": "LOT-RMSWT004-INIT",
        "expiryDate": "2027-06-30",
        "qtySec": 20,
        "location": "Pallet A1"
      }
    ]
  },
  {
    "code": "RM-DRY-001",
    "category": "Dairy & Eggs",
    "brand": "Coop",
    "name": "Fresh Farm Eggs (Coop)",
    "supplier": "Lucky Roma Trading / JCT Wheat",
    "room": "Wet Room",
    "primaryUom": "Tray",
    "secondaryUom": "pcs",
    "conversionFactor": 30,
    "threshold": 250,
    "unitCost": 210,
    "currentBalance": 22265,
    "lots": [
      {
        "lotNumber": "LOT-RMDRY001-INIT",
        "expiryDate": "2027-06-30",
        "qtySec": 22265,
        "location": "Pallet A1"
      }
    ]
  },
  {
    "code": "RM-DRY-002",
    "category": "Dairy & Eggs",
    "brand": "Master Chef",
    "name": "Condensada (Master Chef - 1kg Tin Can / 24 Cans in a Box)",
    "supplier": "Lucky Roma Trading / JCT Wheat",
    "room": "Wet Room",
    "primaryUom": "Tin Can",
    "secondaryUom": "kg",
    "conversionFactor": 1,
    "threshold": 20,
    "unitCost": 65,
    "currentBalance": 1178,
    "lots": [
      {
        "lotNumber": "LOT-RMDRY002-INIT",
        "expiryDate": "2027-06-30",
        "qtySec": 1178,
        "location": "Pallet A1"
      }
    ]
  },
  {
    // FIX: currentBalance and lots[0].qtySec changed from 445.84 → 418.84
    // Reason: 1,132 cans × 0.37 L = 418.84 L. The 445.84 value was a
    // transcription error (1132 × 0.37 ≠ 445.84). CSV has already been
    // corrected to 418.84. Because seed's INSERT OR IGNORE runs first,
    // this value wins in the DB — aligning it here prevents a
    // "0 variance but wrong quantity" silent failure.
    "code": "RM-DRY-003",
    "category": "Dairy & Eggs",
    "brand": "Jersey",
    "name": "Evaporada (Jersey - 370ml Tin Can / 48 Cans in a Box)",
    "supplier": "Lucky Roma Trading / JCT Wheat",
    "room": "Wet Room",
    "primaryUom": "Tin Can",
    "secondaryUom": "L",
    "conversionFactor": 0.37,
    "threshold": 20,
    "unitCost": 28,
    "currentBalance": 418.84,
    "lots": [
      {
        "lotNumber": "LOT-RMDRY003-INIT",
        "expiryDate": "2027-06-30",
        "qtySec": 418.84,
        "location": "Pallet A1"
      }
    ]
  },
  {
    "code": "RM-DRY-004",
    "category": "Dairy & Eggs",
    "brand": "Farmland",
    "name": "Skimmed Milk Powder (Farmland - 25kg Sack)",
    "supplier": "Lucky Roma Trading / JCT Wheat",
    "room": "Dry Room 1",
    "primaryUom": "Sack",
    "secondaryUom": "kg",
    "conversionFactor": 25,
    "threshold": 250,
    "unitCost": 3850,
    "currentBalance": 250,
    "lots": [
      {
        "lotNumber": "LOT-RMDRY004-INIT",
        "expiryDate": "2027-06-30",
        "qtySec": 250,
        "location": "Pallet A1"
      }
    ]
  },
  {
    "code": "RM-LEV-001",
    "category": "Leavening & Additives",
    "brand": "Gloripan",
    "name": "Instant Dry Yeast (Gloripan - 500g Box)",
    "supplier": "Lucky Roma Trading / JCT Wheat",
    "room": "Dry Room 1",
    "primaryUom": "Box",
    "secondaryUom": "kg",
    "conversionFactor": 0.5,
    "threshold": 20,
    "unitCost": 165,
    "currentBalance": 2.5,
    "lots": [
      {
        "lotNumber": "LOT-RMLEV001-INIT",
        "expiryDate": "2027-06-30",
        "qtySec": 2.5,
        "location": "Pallet A1"
      }
    ]
  },
  {
    "code": "RM-LEV-002",
    "category": "Leavening & Additives",
    "brand": "Calumet",
    "name": "Baking Powder (Calumet - 14kg Bag)",
    "supplier": "Lucky Roma Trading / JCT Wheat",
    "room": "Dry Room 1",
    "primaryUom": "Bag",
    "secondaryUom": "kg",
    "conversionFactor": 14,
    "threshold": 20,
    "unitCost": 1450,
    "currentBalance": 0,
    "lots": []
  },
  {
    "code": "RM-LEV-003",
    "category": "Leavening & Additives",
    "brand": "CSP Bread Mold Inhibitor",
    "name": "Calcium Propionate (CSP Bread Mold Inhibitor)",
    "supplier": "Lucky Roma Trading / JCT Wheat",
    "room": "Dry Room 1",
    "primaryUom": "Pack",
    "secondaryUom": "kg",
    "conversionFactor": 1,
    "threshold": 20,
    "unitCost": 220,
    "currentBalance": 1,
    "lots": [
      {
        "lotNumber": "LOT-RMLEV003-INIT",
        "expiryDate": "2027-06-30",
        "qtySec": 1,
        "location": "Pallet A1"
      }
    ]
  },
  {
    "code": "RM-LEV-004",
    "category": "Leavening & Additives",
    "brand": "Granular Antimicrobial",
    "name": "Potassium Sorbate (Granular Antimicrobial)",
    "supplier": "Lucky Roma Trading / JCT Wheat",
    "room": "Dry Room 1",
    "primaryUom": "Pack",
    "secondaryUom": "kg",
    "conversionFactor": 1,
    "threshold": 20,
    "unitCost": 340,
    "currentBalance": 3,
    "lots": [
      {
        "lotNumber": "LOT-RMLEV004-INIT",
        "expiryDate": "2027-06-30",
        "qtySec": 3,
        "location": "Pallet A1"
      }
    ]
  },
  {
    "code": "RM-LEV-005",
    "category": "Leavening & Additives",
    "brand": "Baker's Choice",
    "name": "Non-Bromated Bread Improver (Baker's Choice - 1kg Pack)",
    "supplier": "Lucky Roma Trading / JCT Wheat",
    "room": "Dry Room 1",
    "primaryUom": "Pack",
    "secondaryUom": "kg",
    "conversionFactor": 1,
    "threshold": 20,
    "unitCost": 280,
    "currentBalance": 10,
    "lots": [
      {
        "lotNumber": "LOT-RMLEV005-INIT",
        "expiryDate": "2027-06-30",
        "qtySec": 10,
        "location": "Pallet A1"
      }
    ]
  },
  {
    "code": "RM-FLV-001",
    "category": "Flavors & Colors",
    "brand": "Unibake",
    "name": "Ube Flavor & Color Blend (Unibake - 5L Jug)",
    "supplier": "Lucky Roma Trading / JCT Wheat",
    "room": "Wet Room",
    "primaryUom": "Bottle",
    "secondaryUom": "L",
    "conversionFactor": 5,
    "threshold": 20,
    "unitCost": 1850,
    "currentBalance": 0,
    "lots": []
  },
  {
    "code": "RM-FLV-002",
    "category": "Flavors & Colors",
    "brand": "Kanegie",
    "name": "Vanilla Flavor FF (Kanegie - 3.79L Gallon)",
    "supplier": "Lucky Roma Trading / JCT Wheat",
    "room": "Wet Room",
    "primaryUom": "Gallon",
    "secondaryUom": "L",
    "conversionFactor": 3.79,
    "threshold": 20,
    "unitCost": 850,
    "currentBalance": 49.27,
    "lots": [
      {
        "lotNumber": "LOT-RMFLV002-INIT",
        "expiryDate": "2027-06-30",
        "qtySec": 49.27,
        "location": "Pallet A1"
      }
    ]
  },
  {
    "code": "PM-PAP-001",
    "category": "Packaging Materials",
    "brand": "Otap Wrapping",
    "name": "Glassine Wax Paper Sheets (Otap Wrapping)",
    "supplier": "Mindanao Packaging & Industrial Box Corp",
    "room": "Dry Room 2",
    "primaryUom": "Rim",
    "secondaryUom": "pcs",
    "conversionFactor": 500,
    "threshold": 500,
    "unitCost": 420,
    "currentBalance": 0,
    "lots": [],
    "packagingNote": "Purchased in bundles/bulk packs (4-12 packs/bundle, 100-500 pcs/pack). Standardized bundle conversion active."
  },
  {
    "code": "PM-PAP-002",
    "category": "Packaging Materials",
    "brand": "Laminated Sheets",
    "name": "Baking Pan Pattern Paper (Laminated Sheets)",
    "supplier": "Mindanao Packaging & Industrial Box Corp",
    "room": "Dry Room 2",
    "primaryUom": "Rim",
    "secondaryUom": "pcs",
    "conversionFactor": 500,
    "threshold": 500,
    "unitCost": 450,
    "currentBalance": 0,
    "lots": [],
    "packagingNote": "Purchased in bundles/bulk packs (4-12 packs/bundle, 100-500 pcs/pack). Standardized bundle conversion active."
  },
  {
    "code": "PM-BOX-001",
    "category": "Packaging Materials",
    "brand": "50 pk/box",
    "name": "Jang-Jang Master Shipping Carton Box (50 pk/box)",
    "supplier": "Mindanao Packaging & Industrial Box Corp",
    "room": "Dry Room 2",
    "primaryUom": "Rim",
    "secondaryUom": "pcs",
    "conversionFactor": 20,
    "threshold": 500,
    "unitCost": 580,
    "currentBalance": 540,
    "lots": [
      {
        "lotNumber": "LOT-PMBOX001-INIT",
        "expiryDate": "2027-06-30",
        "qtySec": 540,
        "location": "Pallet A1"
      }
    ],
    "packagingNote": "Purchased in bundles/bulk packs (4-12 packs/bundle, 100-500 pcs/pack). Standardized bundle conversion active."
  },
  {
    "code": "UT-GAS-001",
    "category": "Utilities & Fuel",
    "brand": "JJB Standard",
    "name": "Solane LPG 50kg Industrial Tank",
    "supplier": "Lucky Roma Trading / JCT Wheat",
    "room": "Wet Room",
    "primaryUom": "Tank",
    "secondaryUom": "tank",
    "conversionFactor": 1,
    "threshold": 20,
    "unitCost": 2850,
    "currentBalance": 8,
    "lots": [
      {
        "lotNumber": "LOT-UTGAS001-INIT",
        "expiryDate": "2027-06-30",
        "qtySec": 8,
        "location": "Pallet A1"
      }
    ]
  },
  {
    "code": "RM-FLV-003",
    "category": "Flavors & Colors",
    "brand": "12x500g",
    "name": "Neco Egg Yellow Food Coloring Powder (12x500g)",
    "supplier": "Lucky Roma Trading / JCT Wheat",
    "room": "Dry Room 1",
    "primaryUom": "Pack",
    "secondaryUom": "kg",
    "conversionFactor": 0.5,
    "threshold": 20,
    "unitCost": 180,
    "currentBalance": 3,
    "lots": [
      {
        "lotNumber": "LOT-RMFLV003-INIT",
        "expiryDate": "2027-06-30",
        "qtySec": 3,
        "location": "Pallet A1"
      }
    ]
  },
  {
    "code": "RM-FLV-005",
    "category": "Flavors & Colors",
    "brand": "JJB Standard",
    "name": "Dutché Special Alkalized Dark Cocoa Powder",
    "supplier": "Lucky Roma Trading / JCT Wheat",
    "room": "Dry Room 1",
    "primaryUom": "Pack",
    "secondaryUom": "kg",
    "conversionFactor": 1,
    "threshold": 20,
    "unitCost": 380,
    "currentBalance": 2,
    "lots": [
      {
        "lotNumber": "LOT-RMFLV005-INIT",
        "expiryDate": "2027-06-30",
        "qtySec": 2,
        "location": "Pallet A1"
      }
    ]
  },
  {
    "code": "RM-LEV-006",
    "category": "Leavening & Additives",
    "brand": "JJB Standard",
    "name": "Carbonato — 1 kg",
    "supplier": "Lucky Roma Trading / JCT Wheat",
    "room": "Dry Room 1",
    "primaryUom": "Pack",
    "secondaryUom": "kg",
    "conversionFactor": 1,
    "threshold": 20,
    "unitCost": 120,
    "currentBalance": 10,
    "lots": [
      {
        "lotNumber": "LOT-RMLEV006-INIT",
        "expiryDate": "2027-06-30",
        "qtySec": 10,
        "location": "Pallet A1"
      }
    ]
  },
  {
    "code": "RM-LEV-007",
    "category": "Leavening & Additives",
    "brand": "JJB Standard",
    "name": "Carbonato — 500 g",
    "supplier": "Lucky Roma Trading / JCT Wheat",
    "room": "Dry Room 1",
    "primaryUom": "Pack",
    "secondaryUom": "kg",
    "conversionFactor": 0.5,
    "threshold": 20,
    "unitCost": 65,
    "currentBalance": 2,
    "lots": [
      {
        "lotNumber": "LOT-RMLEV007-INIT",
        "expiryDate": "2027-06-30",
        "qtySec": 2,
        "location": "Pallet A1"
      }
    ]
  },
  {
    "code": "RM-DRY-006",
    "category": "Flour & Grains",
    "brand": "JJB Standard",
    "name": "Sesame Seed — 1 kg",
    "supplier": "Lucky Roma Trading / JCT Wheat",
    "room": "Dry Room 1",
    "primaryUom": "Pack",
    "secondaryUom": "kg",
    "conversionFactor": 1,
    "threshold": 20,
    "unitCost": 195,
    "currentBalance": 8,
    "lots": [
      {
        "lotNumber": "LOT-RMDRY006-INIT",
        "expiryDate": "2027-06-30",
        "qtySec": 8,
        "location": "Pallet A1"
      }
    ]
  },
  {
    "code": "RM-LEV-008",
    "category": "Leavening & Additives",
    "brand": "JJB Standard",
    "name": "Bakers Field Whip It",
    "supplier": "Lucky Roma Trading / JCT Wheat",
    "room": "Dry Room 1",
    "primaryUom": "Pack",
    "secondaryUom": "kg",
    "conversionFactor": 1,
    "threshold": 20,
    "unitCost": 260,
    "currentBalance": 2,
    "lots": [
      {
        "lotNumber": "LOT-RMLEV008-INIT",
        "expiryDate": "2027-06-30",
        "qtySec": 2,
        "location": "Pallet A1"
      }
    ]
  },
  {
    "code": "RM-LEV-009",
    "category": "Leavening & Additives",
    "brand": "JJB Standard",
    "name": "Baking Soda — 500 g",
    "supplier": "Lucky Roma Trading / JCT Wheat",
    "room": "Dry Room 1",
    "primaryUom": "Box",
    "secondaryUom": "kg",
    "conversionFactor": 0.5,
    "threshold": 20,
    "unitCost": 55,
    "currentBalance": 2.5,
    "lots": [
      {
        "lotNumber": "LOT-RMLEV009-INIT",
        "expiryDate": "2027-06-30",
        "qtySec": 2.5,
        "location": "Pallet A1"
      }
    ]
  },
  {
    "code": "RM-FLV-006",
    "category": "Flavors & Colors",
    "brand": "JJB Standard",
    "name": "Neco Choco brown 500g",
    "supplier": "Lucky Roma Trading / JCT Wheat",
    "room": "Dry Room 1",
    "primaryUom": "Tin Can",
    "secondaryUom": "kg",
    "conversionFactor": 0.5,
    "threshold": 20,
    "unitCost": 180,
    "currentBalance": 1.5,
    "lots": [
      {
        "lotNumber": "LOT-RMFLV006-INIT",
        "expiryDate": "2027-06-30",
        "qtySec": 1.5,
        "location": "Pallet A1"
      }
    ]
  },
  {
    "code": "RM-FLV-007",
    "category": "Flavors & Colors",
    "brand": "JJB Standard",
    "name": "Neco choco brown 125g",
    "supplier": "Lucky Roma Trading / JCT Wheat",
    "room": "Dry Room 1",
    "primaryUom": "Tin Can",
    "secondaryUom": "kg",
    "conversionFactor": 0.125,
    "threshold": 20,
    "unitCost": 55,
    "currentBalance": 0.25,
    "lots": [
      {
        "lotNumber": "LOT-RMFLV007-INIT",
        "expiryDate": "2027-06-30",
        "qtySec": 0.25,
        "location": "Pallet A1"
      }
    ]
  },
  {
    "code": "RM-FLR-007",
    "category": "Flour & Grains",
    "brand": "JJB Standard",
    "name": "White Tower Cornstarch — 25 kg",
    "supplier": "Lucky Roma Trading / JCT Wheat",
    "room": "Dry Room 1",
    "primaryUom": "Sack",
    "secondaryUom": "kg",
    "conversionFactor": 25,
    "threshold": 250,
    "unitCost": 850,
    "currentBalance": 0,
    "lots": []
  },
  {
    "code": "RM-FAT-006",
    "category": "Fats & Oils",
    "brand": "JJB Standard",
    "name": "Refined Vegetable Cooking Oil",
    "supplier": "Lucky Roma Trading / JCT Wheat",
    "room": "Wet Room",
    "primaryUom": "Tin Can",
    "secondaryUom": "kg",
    "conversionFactor": 17,
    "threshold": 20,
    "unitCost": 1350,
    "currentBalance": 0,
    "lots": []
  },
  {
    // FIX: primaryUom changed from "Box" → "Tin Can"
    // Reason: with conversionFactor 0.39 and currentBalance 276.51,
    // "709 × 0.39 = 276.51" is only physically coherent if the primary
    // unit is the individual tin can (390g each), not the 48-can box.
    // CSV has already been corrected to Tin Can. Without this fix, seed
    // would write "Box / 0.39 / 276.51" — an impossible triple that the
    // reconciliation view would miss (both current_balance and lot sum
    // share the same wrong numbers → variance = 0).
    "code": "RM-DRY-007",
    "category": "Dairy & Eggs",
    "brand": "Jersey",
    "name": "Condensed Creamer (Jersey -  390g Tin Can / 48 Cans ina  Box)",
    "supplier": "Lucky Roma Trading / JCT Wheat",
    "room": "Wet Room",
    "primaryUom": "Tin Can",
    "secondaryUom": "kg",
    "conversionFactor": 0.39,
    "threshold": 20,
    "unitCost": 52,
    "currentBalance": 276.51,
    "lots": [
      {
        "lotNumber": "LOT-RMDRY007-INIT",
        "expiryDate": "2027-06-30",
        "qtySec": 276.51,
        "location": "Pallet A1"
      }
    ]
  },
  {
    "code": "PM-ROL-001",
    "category": "Packaging Materials",
    "brand": "JJB Standard",
    "name": "Plastic Cellophane Roll 25x50",
    "supplier": "Mindanao Packaging & Industrial Box Corp",
    "room": "Dry Room 2",
    "primaryUom": "Roll",
    "secondaryUom": "pcs",
    "conversionFactor": 1,
    "threshold": 500,
    "unitCost": 280,
    "currentBalance": 0,
    "lots": [],
    "packagingNote": "Purchased in bundles/bulk packs (4-12 packs/bundle, 100-500 pcs/pack). Standardized bundle conversion active."
  },
  {
    "code": "PM-ROL-002",
    "category": "Packaging Materials",
    "brand": "JJB Standard",
    "name": "Plastic Cellophane Roll 9x18",
    "supplier": "Mindanao Packaging & Industrial Box Corp",
    "room": "Dry Room 2",
    "primaryUom": "Rim",
    "secondaryUom": "pcs",
    "conversionFactor": 500,
    "threshold": 500,
    "unitCost": 280,
    "currentBalance": 1000,
    "lots": [
      {
        "lotNumber": "LOT-PMROL002-INIT",
        "expiryDate": "2027-06-30",
        "qtySec": 1000,
        "location": "Pallet A1"
      }
    ],
    "packagingNote": "Purchased in bundles/bulk packs (4-12 packs/bundle, 100-500 pcs/pack). Standardized bundle conversion active."
  },
  {
    "code": "PM-BAG-001",
    "category": "Packaging Materials",
    "brand": "JJB Standard",
    "name": "Calypso Poly Bag 7x14-01",
    "supplier": "Mindanao Packaging & Industrial Box Corp",
    "room": "Dry Room 2",
    "primaryUom": "Rim",
    "secondaryUom": "pcs",
    "conversionFactor": 500,
    "threshold": 500,
    "unitCost": 280,
    "currentBalance": 600,
    "lots": [
      {
        "lotNumber": "LOT-PMBAG001-INIT",
        "expiryDate": "2027-06-30",
        "qtySec": 600,
        "location": "Pallet A1"
      }
    ],
    "packagingNote": "Purchased in bundles/bulk packs (4-12 packs/bundle, 100-500 pcs/pack). Standardized bundle conversion active."
  },
  {
    "code": "PM-BAG-002",
    "category": "Packaging Materials",
    "brand": "JJB Standard",
    "name": "Poly Bag 7x11-02",
    "supplier": "Mindanao Packaging & Industrial Box Corp",
    "room": "Dry Room 2",
    "primaryUom": "Rim",
    "secondaryUom": "pcs",
    "conversionFactor": 500,
    "threshold": 500,
    "unitCost": 280,
    "currentBalance": 0,
    "lots": [],
    "packagingNote": "Purchased in bundles/bulk packs (4-12 packs/bundle, 100-500 pcs/pack). Standardized bundle conversion active."
  },
  {
    "code": "PM-BAG-003",
    "category": "Packaging Materials",
    "brand": "JJB Standard",
    "name": "Poly Bag 5x6-01",
    "supplier": "Mindanao Packaging & Industrial Box Corp",
    "room": "Dry Room 2",
    "primaryUom": "Rim",
    "secondaryUom": "pcs",
    "conversionFactor": 500,
    "threshold": 500,
    "unitCost": 280,
    "currentBalance": 1000,
    "lots": [
      {
        "lotNumber": "LOT-PMBAG003-INIT",
        "expiryDate": "2027-06-30",
        "qtySec": 1000,
        "location": "Pallet A1"
      }
    ],
    "packagingNote": "Purchased in bundles/bulk packs (4-12 packs/bundle, 100-500 pcs/pack). Standardized bundle conversion active."
  },
  {
    "code": "PM-BAG-004",
    "category": "Packaging Materials",
    "brand": "JJB Standard",
    "name": "Poly Bag 4x6-01",
    "supplier": "Mindanao Packaging & Industrial Box Corp",
    "room": "Dry Room 2",
    "primaryUom": "Rim",
    "secondaryUom": "pcs",
    "conversionFactor": 500,
    "threshold": 500,
    "unitCost": 280,
    "currentBalance": 0,
    "lots": [],
    "packagingNote": "Purchased in bundles/bulk packs (4-12 packs/bundle, 100-500 pcs/pack). Standardized bundle conversion active."
  },
  {
    "code": "PM-BAG-005",
    "category": "Packaging Materials",
    "brand": "JJB Standard",
    "name": "Poly Bag 6x10-01",
    "supplier": "Mindanao Packaging & Industrial Box Corp",
    "room": "Dry Room 2",
    "primaryUom": "Rim",
    "secondaryUom": "pcs",
    "conversionFactor": 500,
    "threshold": 500,
    "unitCost": 280,
    "currentBalance": 3200,
    "lots": [
      {
        "lotNumber": "LOT-PMBAG005-INIT",
        "expiryDate": "2027-06-30",
        "qtySec": 3200,
        "location": "Pallet A1"
      }
    ],
    "packagingNote": "Purchased in bundles/bulk packs (4-12 packs/bundle, 100-500 pcs/pack). Standardized bundle conversion active."
  },
  {
    "code": "PM-BAG-006",
    "category": "Packaging Materials",
    "brand": "JJB Standard",
    "name": "Poly Bag 6x10-02",
    "supplier": "Mindanao Packaging & Industrial Box Corp",
    "room": "Dry Room 2",
    "primaryUom": "Rim",
    "secondaryUom": "pcs",
    "conversionFactor": 500,
    "threshold": 500,
    "unitCost": 280,
    "currentBalance": 900,
    "lots": [
      {
        "lotNumber": "LOT-PMBAG006-INIT",
        "expiryDate": "2027-06-30",
        "qtySec": 900,
        "location": "Pallet A1"
      }
    ],
    "packagingNote": "Purchased in bundles/bulk packs (4-12 packs/bundle, 100-500 pcs/pack). Standardized bundle conversion active."
  },
  {
    "code": "PM-BAG-007",
    "category": "Packaging Materials",
    "brand": "JJB Standard",
    "name": "Poly Bag 10-18-01",
    "supplier": "Mindanao Packaging & Industrial Box Corp",
    "room": "Dry Room 2",
    "primaryUom": "Rim",
    "secondaryUom": "pcs",
    "conversionFactor": 500,
    "threshold": 500,
    "unitCost": 280,
    "currentBalance": 750,
    "lots": [
      {
        "lotNumber": "LOT-PMBAG007-INIT",
        "expiryDate": "2027-06-30",
        "qtySec": 750,
        "location": "Pallet A1"
      }
    ],
    "packagingNote": "Purchased in bundles/bulk packs (4-12 packs/bundle, 100-500 pcs/pack). Standardized bundle conversion active."
  },
  {
    "code": "PM-BAG-008",
    "category": "Packaging Materials",
    "brand": "JJB Standard",
    "name": "Tasty Bread Bag 10x18",
    "supplier": "Mindanao Packaging & Industrial Box Corp",
    "room": "Dry Room 2",
    "primaryUom": "Rim",
    "secondaryUom": "pcs",
    "conversionFactor": 500,
    "threshold": 500,
    "unitCost": 280,
    "currentBalance": 500,
    "lots": [
      {
        "lotNumber": "LOT-PMBAG008-INIT",
        "expiryDate": "2027-06-30",
        "qtySec": 500,
        "location": "Pallet A1"
      }
    ],
    "packagingNote": "Purchased in bundles/bulk packs (4-12 packs/bundle, 100-500 pcs/pack). Standardized bundle conversion active."
  },
  {
    "code": "PM-BAG-009",
    "category": "Packaging Materials",
    "brand": "JJB Standard",
    "name": "Special Bread Bag 5x12 SP",
    "supplier": "Mindanao Packaging & Industrial Box Corp",
    "room": "Dry Room 2",
    "primaryUom": "Rim",
    "secondaryUom": "pcs",
    "conversionFactor": 500,
    "threshold": 500,
    "unitCost": 280,
    "currentBalance": 1050,
    "lots": [
      {
        "lotNumber": "LOT-PMBAG009-INIT",
        "expiryDate": "2027-06-30",
        "qtySec": 1050,
        "location": "Pallet A1"
      }
    ],
    "packagingNote": "Purchased in bundles/bulk packs (4-12 packs/bundle, 100-500 pcs/pack). Standardized bundle conversion active."
  },
  {
    "code": "PM-BAG-010",
    "category": "Packaging Materials",
    "brand": "JJB Standard",
    "name": "Long Bread Bag 7x14 SP",
    "supplier": "Mindanao Packaging & Industrial Box Corp",
    "room": "Dry Room 2",
    "primaryUom": "Rim",
    "secondaryUom": "pcs",
    "conversionFactor": 500,
    "threshold": 500,
    "unitCost": 280,
    "currentBalance": 1500,
    "lots": [
      {
        "lotNumber": "LOT-PMBAG010-INIT",
        "expiryDate": "2027-06-30",
        "qtySec": 1500,
        "location": "Pallet A1"
      }
    ],
    "packagingNote": "Purchased in bundles/bulk packs (4-12 packs/bundle, 100-500 pcs/pack). Standardized bundle conversion active."
  },
  {
    "code": "PM-CUP-001",
    "category": "Packaging Materials",
    "brand": "JJB Standard",
    "name": "Baking Cups 5 1/2 oz",
    "supplier": "Mindanao Packaging & Industrial Box Corp",
    "room": "Dry Room 2",
    "primaryUom": "Box",
    "secondaryUom": "pcs",
    "conversionFactor": 1000,
    "threshold": 500,
    "unitCost": 280,
    "currentBalance": 5000,
    "lots": [
      {
        "lotNumber": "LOT-PMCUP001-INIT",
        "expiryDate": "2027-06-30",
        "qtySec": 5000,
        "location": "Pallet A1"
      }
    ],
    "packagingNote": "Purchased in bundles/bulk packs (4-12 packs/bundle, 100-500 pcs/pack). Standardized bundle conversion active."
  },
  {
    "code": "PM-CUP-002",
    "category": "Packaging Materials",
    "brand": "Circle",
    "name": "Baking Cups 2 oz (Circle)",
    "supplier": "Mindanao Packaging & Industrial Box Corp",
    "room": "Dry Room 2",
    "primaryUom": "Box",
    "secondaryUom": "pcs",
    "conversionFactor": 1000,
    "threshold": 500,
    "unitCost": 280,
    "currentBalance": 2300,
    "lots": [
      {
        "lotNumber": "LOT-PMCUP002-INIT",
        "expiryDate": "2027-06-30",
        "qtySec": 2300,
        "location": "Pallet A1"
      }
    ],
    "packagingNote": "Purchased in bundles/bulk packs (4-12 packs/bundle, 100-500 pcs/pack). Standardized bundle conversion active."
  },
  {
    "code": "PM-CUP-003",
    "category": "Packaging Materials",
    "brand": "JJB Standard",
    "name": "Mamon Paper Cups",
    "supplier": "Mindanao Packaging & Industrial Box Corp",
    "room": "Dry Room 2",
    "primaryUom": "Box",
    "secondaryUom": "pcs",
    "conversionFactor": 1000,
    "threshold": 500,
    "unitCost": 280,
    "currentBalance": 5000,
    "lots": [
      {
        "lotNumber": "LOT-PMCUP003-INIT",
        "expiryDate": "2027-06-30",
        "qtySec": 5000,
        "location": "Pallet A1"
      }
    ],
    "packagingNote": "Purchased in bundles/bulk packs (4-12 packs/bundle, 100-500 pcs/pack). Standardized bundle conversion active."
  },
  {
    "code": "PM-CUP-004",
    "category": "Packaging Materials",
    "brand": "JJB Standard",
    "name": "Torta Paper Cups",
    "supplier": "Mindanao Packaging & Industrial Box Corp",
    "room": "Dry Room 2",
    "primaryUom": "Box",
    "secondaryUom": "pcs",
    "conversionFactor": 1000,
    "threshold": 500,
    "unitCost": 280,
    "currentBalance": 1000,
    "lots": [
      {
        "lotNumber": "LOT-PMCUP004-INIT",
        "expiryDate": "2027-06-30",
        "qtySec": 1000,
        "location": "Pallet A1"
      }
    ],
    "packagingNote": "Purchased in bundles/bulk packs (4-12 packs/bundle, 100-500 pcs/pack). Standardized bundle conversion active."
  },
  {
    "code": "PM-BAG-011",
    "category": "Packaging Materials",
    "brand": "Medium / Large",
    "name": "Sando Bag Carrier (Medium / Large)",
    "supplier": "Mindanao Packaging & Industrial Box Corp",
    "room": "Dry Room 2",
    "primaryUom": "Rim",
    "secondaryUom": "pcs",
    "conversionFactor": 500,
    "threshold": 500,
    "unitCost": 280,
    "currentBalance": 560,
    "lots": [
      {
        "lotNumber": "LOT-PMBAG011-INIT",
        "expiryDate": "2027-06-30",
        "qtySec": 560,
        "location": "Pallet A1"
      }
    ],
    "packagingNote": "Purchased in bundles/bulk packs (4-12 packs/bundle, 100-500 pcs/pack). Standardized bundle conversion active."
  },
  {
    "code": "PM-TPE-001",
    "category": "Packaging Materials",
    "brand": "JJB Standard",
    "name": "Sealer Tape",
    "supplier": "Mindanao Packaging & Industrial Box Corp",
    "room": "Dry Room 2",
    "primaryUom": "Roll",
    "secondaryUom": "pcs",
    "conversionFactor": 1,
    "threshold": 500,
    "unitCost": 280,
    "currentBalance": 12,
    "lots": [
      {
        "lotNumber": "LOT-PMTPE001-INIT",
        "expiryDate": "2027-06-30",
        "qtySec": 12,
        "location": "Pallet A1"
      }
    ],
    "packagingNote": "Purchased in bundles/bulk packs (4-12 packs/bundle, 100-500 pcs/pack). Standardized bundle conversion active."
  },
  {
    "code": "PM-TPE-002",
    "category": "Packaging Materials",
    "brand": "JJB Standard",
    "name": "Packing tape 1.5 cm 1 inch",
    "supplier": "Mindanao Packaging & Industrial Box Corp",
    "room": "Dry Room 2",
    "primaryUom": "Roll",
    "secondaryUom": "pcs",
    "conversionFactor": 1,
    "threshold": 500,
    "unitCost": 280,
    "currentBalance": 27,
    "lots": [
      {
        "lotNumber": "LOT-PMTPE002-INIT",
        "expiryDate": "2027-06-30",
        "qtySec": 27,
        "location": "Pallet A1"
      }
    ],
    "packagingNote": "Purchased in bundles/bulk packs (4-12 packs/bundle, 100-500 pcs/pack). Standardized bundle conversion active."
  },
  {
    "code": "PM-TPE-003",
    "category": "Packaging Materials",
    "brand": "JJB Standard",
    "name": "Packing tape 5 cm 1/2 inch",
    "supplier": "Mindanao Packaging & Industrial Box Corp",
    "room": "Dry Room 2",
    "primaryUom": "Roll",
    "secondaryUom": "pcs",
    "conversionFactor": 1,
    "threshold": 500,
    "unitCost": 280,
    "currentBalance": 3,
    "lots": [
      {
        "lotNumber": "LOT-PMTPE003-INIT",
        "expiryDate": "2027-06-30",
        "qtySec": 3,
        "location": "Pallet A1"
      }
    ],
    "packagingNote": "Purchased in bundles/bulk packs (4-12 packs/bundle, 100-500 pcs/pack). Standardized bundle conversion active."
  },
  {
    "code": "PM-BAG-012",
    "category": "Packaging Materials",
    "brand": "JJB Standard",
    "name": "Donewell 16x24 x 500 pcs",
    "supplier": "Mindanao Packaging & Industrial Box Corp",
    "room": "Dry Room 2",
    "primaryUom": "Rim",
    "secondaryUom": "pcs",
    "conversionFactor": 500,
    "threshold": 500,
    "unitCost": 280,
    "currentBalance": 2050,
    "lots": [
      {
        "lotNumber": "LOT-PMBAG012-INIT",
        "expiryDate": "2027-06-30",
        "qtySec": 2050,
        "location": "Pallet A1"
      }
    ],
    "packagingNote": "Purchased in bundles/bulk packs (4-12 packs/bundle, 100-500 pcs/pack). Standardized bundle conversion active."
  },
  {
    "code": "PM-BAG-013",
    "category": "Packaging Materials",
    "brand": "JJB Standard",
    "name": "Smoke Plastic 14x20 x 500pcs",
    "supplier": "Mindanao Packaging & Industrial Box Corp",
    "room": "Dry Room 2",
    "primaryUom": "Rim",
    "secondaryUom": "pcs",
    "conversionFactor": 500,
    "threshold": 500,
    "unitCost": 280,
    "currentBalance": 650,
    "lots": [
      {
        "lotNumber": "LOT-PMBAG013-INIT",
        "expiryDate": "2027-06-30",
        "qtySec": 650,
        "location": "Pallet A1"
      }
    ],
    "packagingNote": "Purchased in bundles/bulk packs (4-12 packs/bundle, 100-500 pcs/pack). Standardized bundle conversion active."
  },
  {
    "code": "PM-BAG-014",
    "category": "Packaging Materials",
    "brand": "JJB Standard",
    "name": "copp 7x11 expandable",
    "supplier": "Mindanao Packaging & Industrial Box Corp",
    "room": "Dry Room 2",
    "primaryUom": "Rim",
    "secondaryUom": "pcs",
    "conversionFactor": 500,
    "threshold": 500,
    "unitCost": 280,
    "currentBalance": 3600,
    "lots": [
      {
        "lotNumber": "LOT-PMBAG014-INIT",
        "expiryDate": "2027-06-30",
        "qtySec": 3600,
        "location": "Pallet A1"
      }
    ],
    "packagingNote": "Purchased in bundles/bulk packs (4-12 packs/bundle, 100-500 pcs/pack). Standardized bundle conversion active."
  },
  {
    "code": "PM-BAG-015",
    "category": "Packaging Materials",
    "brand": "JJB Standard",
    "name": "tasty bread sm",
    "supplier": "Mindanao Packaging & Industrial Box Corp",
    "room": "Dry Room 2",
    "primaryUom": "Pack",
    "secondaryUom": "pcs",
    "conversionFactor": 50,
    "threshold": 500,
    "unitCost": 280,
    "currentBalance": 50,
    "lots": [
      {
        "lotNumber": "LOT-PMBAG015-INIT",
        "expiryDate": "2027-06-30",
        "qtySec": 50,
        "location": "Pallet A1"
      }
    ],
    "packagingNote": "Purchased in bundles/bulk packs (4-12 packs/bundle, 100-500 pcs/pack). Standardized bundle conversion active."
  },
  {
    "code": "PM-BAG-016",
    "category": "Packaging Materials",
    "brand": "JJB Standard",
    "name": "sabako 7 x 14",
    "supplier": "Mindanao Packaging & Industrial Box Corp",
    "room": "Dry Room 2",
    "primaryUom": "Rim",
    "secondaryUom": "pcs",
    "conversionFactor": 500,
    "threshold": 500,
    "unitCost": 280,
    "currentBalance": 600,
    "lots": [
      {
        "lotNumber": "LOT-PMBAG016-INIT",
        "expiryDate": "2027-06-30",
        "qtySec": 600,
        "location": "Pallet A1"
      }
    ],
    "packagingNote": "Purchased in bundles/bulk packs (4-12 packs/bundle, 100-500 pcs/pack). Standardized bundle conversion active."
  },
  {
    "code": "PM-CUP-005",
    "category": "Packaging Materials",
    "brand": "JJB Standard",
    "name": "torta cups 3 1/2",
    "supplier": "Mindanao Packaging & Industrial Box Corp",
    "room": "Dry Room 2",
    "primaryUom": "Box",
    "secondaryUom": "pcs",
    "conversionFactor": 1000,
    "threshold": 500,
    "unitCost": 280,
    "currentBalance": 2000,
    "lots": [
      {
        "lotNumber": "LOT-PMCUP005-INIT",
        "expiryDate": "2027-06-30",
        "qtySec": 2000,
        "location": "Pallet A1"
      }
    ],
    "packagingNote": "Purchased in bundles/bulk packs (4-12 packs/bundle, 100-500 pcs/pack). Standardized bundle conversion active."
  },
  {
    "code": "PM-CUP-006",
    "category": "Packaging Materials",
    "brand": "JJB Standard",
    "name": "bakerite baking cups 3 oz",
    "supplier": "Mindanao Packaging & Industrial Box Corp",
    "room": "Dry Room 2",
    "primaryUom": "Box",
    "secondaryUom": "pcs",
    "conversionFactor": 1000,
    "threshold": 500,
    "unitCost": 280,
    "currentBalance": 2000,
    "lots": [
      {
        "lotNumber": "LOT-PMCUP006-INIT",
        "expiryDate": "2027-06-30",
        "qtySec": 2000,
        "location": "Pallet A1"
      }
    ],
    "packagingNote": "Purchased in bundles/bulk packs (4-12 packs/bundle, 100-500 pcs/pack). Standardized bundle conversion active."
  },
  {
    "code": "PM-BAG-017",
    "category": "Packaging Materials",
    "brand": "JJB Standard",
    "name": "joker excel 8x14",
    "supplier": "Mindanao Packaging & Industrial Box Corp",
    "room": "Dry Room 2",
    "primaryUom": "Rim",
    "secondaryUom": "pcs",
    "conversionFactor": 500,
    "threshold": 500,
    "unitCost": 280,
    "currentBalance": 850,
    "lots": [
      {
        "lotNumber": "LOT-PMBAG017-INIT",
        "expiryDate": "2027-06-30",
        "qtySec": 850,
        "location": "Pallet A1"
      }
    ],
    "packagingNote": "Purchased in bundles/bulk packs (4-12 packs/bundle, 100-500 pcs/pack). Standardized bundle conversion active."
  },
  {
    "code": "PM-BAG-018",
    "category": "Packaging Materials",
    "brand": "JJB Standard",
    "name": "sabako 4x6 002 1,000per ream",
    "supplier": "Mindanao Packaging & Industrial Box Corp",
    "room": "Dry Room 2",
    "primaryUom": "Rim",
    "secondaryUom": "pcs",
    "conversionFactor": 1000,
    "threshold": 500,
    "unitCost": 280,
    "currentBalance": 4500,
    "lots": [
      {
        "lotNumber": "LOT-PMBAG018-INIT",
        "expiryDate": "2027-06-30",
        "qtySec": 4500,
        "location": "Pallet A1"
      }
    ],
    "packagingNote": "Purchased in bundles/bulk packs (4-12 packs/bundle, 100-500 pcs/pack). Standardized bundle conversion active."
  },
  {
    "code": "PM-BAG-019",
    "category": "Packaging Materials",
    "brand": "JJB Standard",
    "name": "sabako 5x6 002 1,000per ream",
    "supplier": "Mindanao Packaging & Industrial Box Corp",
    "room": "Dry Room 2",
    "primaryUom": "Rim",
    "secondaryUom": "pcs",
    "conversionFactor": 1000,
    "threshold": 500,
    "unitCost": 280,
    "currentBalance": 200,
    "lots": [
      {
        "lotNumber": "LOT-PMBAG019-INIT",
        "expiryDate": "2027-06-30",
        "qtySec": 200,
        "location": "Pallet A1"
      }
    ],
    "packagingNote": "Purchased in bundles/bulk packs (4-12 packs/bundle, 100-500 pcs/pack). Standardized bundle conversion active."
  },
  {
    "code": "PM-BAG-020",
    "category": "Packaging Materials",
    "brand": "JJB Standard",
    "name": "sabako 10x18 500 ream",
    "supplier": "Mindanao Packaging & Industrial Box Corp",
    "room": "Dry Room 2",
    "primaryUom": "Rim",
    "secondaryUom": "pcs",
    "conversionFactor": 500,
    "threshold": 500,
    "unitCost": 280,
    "currentBalance": 1450,
    "lots": [
      {
        "lotNumber": "LOT-PMBAG020-INIT",
        "expiryDate": "2027-06-30",
        "qtySec": 1450,
        "location": "Pallet A1"
      }
    ],
    "packagingNote": "Purchased in bundles/bulk packs (4-12 packs/bundle, 100-500 pcs/pack). Standardized bundle conversion active."
  },
  {
    "code": "PM-BAG-021",
    "category": "Packaging Materials",
    "brand": "JJB Standard",
    "name": "cutty shark ice bag 10x18 1,000ream",
    "supplier": "Mindanao Packaging & Industrial Box Corp",
    "room": "Dry Room 2",
    "primaryUom": "Rim",
    "secondaryUom": "pcs",
    "conversionFactor": 1000,
    "threshold": 500,
    "unitCost": 280,
    "currentBalance": 4300,
    "lots": [
      {
        "lotNumber": "LOT-PMBAG021-INIT",
        "expiryDate": "2027-06-30",
        "qtySec": 4300,
        "location": "Pallet A1"
      }
    ],
    "packagingNote": "Purchased in bundles/bulk packs (4-12 packs/bundle, 100-500 pcs/pack). Standardized bundle conversion active."
  }
];

export const STORAGE_ROOMS = [
  {
    "id": "Dry Room 1",
    "name": "Dry Room 1 (Flour, Sugar & Dry Additives)",
    "tempTarget": "20°C – 24°C / <65% RH",
    "desc": "Storage for 1st Class Hard, 3rd Class Soft, Sugars, Improvers, and Bulk Ingredients"
  },
  {
    "id": "Dry Room 2",
    "name": "Dry Room 2 (Packaging, Boxes & Papers)",
    "tempTarget": "Ambient / Dry",
    "desc": "Corrugated master boxes, glassine papers, cellophane rolls, poly pouches, and cups"
  },
  {
    "id": "Cold Room",
    "name": "Cold Room (Chilled Butter & Margarine)",
    "tempTarget": "0°C – 4°C",
    "desc": "Refrigerated buttercup margarine, unsalted butter blocks, and temperature-sensitive goods"
  },
  {
    "id": "Wet Room",
    "name": "Wet Room (Eggs, Milks, Oils & LPG)",
    "tempTarget": "Clean / Well-Ventilated",
    "desc": "Fresh farm eggs, canned condensada, evaporada, bulk oils, and Solane industrial LPG tanks"
  }
];