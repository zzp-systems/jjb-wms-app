// Master Formulation & Product Recipe Register
// Governed by SOP-WAR-002 / SOP-PRO-004 Rev. 04 (JJB-MAN-001 Indangan Site LTO No. 3000013388488 & Sasa Plant LTO No. 3000002291335)
// Standardized Commercial Recipe Manual and Ingredient Handling Protocols

export const MASTER_RECIPES = [
  {
    "sku": "BRD-PAN-3KG",
    "name": "Classic Pandesal – 3.0 kg 1st Class Flour Basis | Yield: ~85 pieces (35 g raw dough each)",
    "category": "Breads / Daily Outlets",
    "targetFacility": "Pan de Verde & Laurice Delicacies",
    "standardBatchFlourKg": 3,
    "unitPieceYield": 85,
    "doughExitTempTarget": "26°C – 28°C",
    "ccp1LethalityTarget": "> 95°C",
    "waterActivityLimit": "Moist Crumb",
    "ingredients": [
      {
        "code": "RM-FLR-003",
        "name": "1st Class Hard Bread Flour (Rossa)",
        "pct": 100,
        "gramsPerBatch": 3000,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-SWT-001",
        "name": "Crystal Brown Sugar",
        "pct": 20,
        "gramsPerBatch": 600,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-SWT-003",
        "name": "Refined Iodized Fine Salt",
        "pct": 1.7,
        "gramsPerBatch": 50,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-OTH-001",
        "name": "Potable Water (Chilled)",
        "pct": 40,
        "gramsPerBatch": 1200,
        "isWater": true,
        "isAsNeeded": false
      },
      {
        "code": "RM-FLV-002",
        "name": "Vanilla Extract",
        "pct": 1.7,
        "gramsPerBatch": 50,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-LEV-001",
        "name": "Instant Dry Yeast",
        "pct": 3,
        "gramsPerBatch": 90,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-DRY-004",
        "name": "Skim Milk Powder (Farmland)",
        "pct": 4,
        "gramsPerBatch": 120,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FAT-003",
        "name": "Vegetable Shortening (Sunny Suy)",
        "pct": 6.7,
        "gramsPerBatch": 200,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FAT-004",
        "name": "Bakery Margarine",
        "pct": 3.8,
        "gramsPerBatch": 115,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-LEV-005",
        "name": "Bread Improver (Dobrim)",
        "pct": 0.5,
        "gramsPerBatch": 15,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-DRY-007",
        "name": "Fine Dry Breadcrumbs",
        "pct": 5.8,
        "gramsPerBatch": 175,
        "isWater": false,
        "isAsNeeded": true
      }
    ],
    "unitProductionCost": 1.45,
    "wholesaleTransferPrice": 2.2,
    "srp": 3,
    "grossMarginPct": 51.7
  },
  {
    "sku": "BIS-001",
    "name": "Biscocho Toasted Bread Delicacy – 25.0 kg 1st Class Hard Wheat Flour Basis | Yield: ~1,000 finished toasted pieces (83 packs)",
    "category": "Pasalubong / Twice-Baked Delicacy",
    "targetFacility": "Indangan Biscocho Hall & Outlets",
    "standardBatchFlourKg": 25,
    "unitPieceYield": 1000,
    "doughExitTempTarget": "26°C – 28°C",
    "ccp1LethalityTarget": "> 95°C",
    "waterActivityLimit": "< 0.60 aw",
    "ingredients": [
      {
        "code": "RM-FLR-003",
        "name": "1st Class Hard Wheat Flour (Rossa)",
        "pct": 100,
        "gramsPerBatch": 25000,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-SWT-001",
        "name": "Crystal Brown Sugar",
        "pct": 8,
        "gramsPerBatch": 2000,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FAT-003",
        "name": "Vegetable Shortening",
        "pct": 4,
        "gramsPerBatch": 1000,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-LEV-001",
        "name": "Instant Dry Yeast (Gloripan)",
        "pct": 1,
        "gramsPerBatch": 250,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-SWT-003",
        "name": "Refined Iodized Fine Salt (RA 8172)",
        "pct": 1,
        "gramsPerBatch": 250,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-OTH-001",
        "name": "Potable Water (Filtered)",
        "pct": 50,
        "gramsPerBatch": 12500,
        "isWater": true,
        "isAsNeeded": false
      },
      {
        "code": "RM-LEV-005",
        "name": "Bread Improver (Baker's Choice)",
        "pct": 0.4,
        "gramsPerBatch": 100,
        "isWater": true,
        "isAsNeeded": false
      },
      {
        "code": "SUB-GLZ-001",
        "name": "Buttermilk Sweet Glaze (Banya):",
        "pct": 0,
        "gramsPerBatch": 1,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-DRY-002",
        "name": "Sweetened Condensed Milk",
        "pct": 8,
        "gramsPerBatch": 2000,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-DRY-003",
        "name": "Evaporated Milk (370ml tins)",
        "pct": 0,
        "gramsPerBatch": 1110,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-SWT-001",
        "name": "Crystal Brown Sugar",
        "pct": 4,
        "gramsPerBatch": 1000,
        "isWater": false,
        "isAsNeeded": false
      }
    ],
    "unitProductionCost": 22.5,
    "wholesaleTransferPrice": 35,
    "srp": 45,
    "grossMarginPct": 50
  },
  {
    "sku": "OTP-001",
    "name": "Otap Layered Puff Pastry – 25.0 kg Flour Blend (18.75 kg 1st Class + 6.25 kg 3rd Class) | Yield: ~1,200 finished oval pieces (100 dozen)",
    "category": "Laminated Flaky Dry Delicacy",
    "targetFacility": "Indangan Otap Hall & Outlets",
    "standardBatchFlourKg": 25,
    "unitPieceYield": 1200,
    "doughExitTempTarget": "26°C – 28°C",
    "ccp1LethalityTarget": "> 95°C",
    "waterActivityLimit": "0.20 – 0.30 aw",
    "ingredients": [
      {
        "code": "RM-FLR-003",
        "name": "1st Class Hard Wheat Flour",
        "pct": 75,
        "gramsPerBatch": 18750,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FLR-002",
        "name": "3rd Class Soft Wheat Flour",
        "pct": 25,
        "gramsPerBatch": 6250,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-SWT-002",
        "name": "Refined White Cane Sugar",
        "pct": 6,
        "gramsPerBatch": 1500,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-LEV-001",
        "name": "Instant Dry Yeast (Gloripan)",
        "pct": 1.5,
        "gramsPerBatch": 375,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-SWT-003",
        "name": "Refined Iodized Fine Salt",
        "pct": 1,
        "gramsPerBatch": 250,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-OTH-001",
        "name": "Potable Water (Filtered)",
        "pct": 40,
        "gramsPerBatch": 10000,
        "isWater": true,
        "isAsNeeded": false
      },
      {
        "code": "RM-FAT-003",
        "name": "Vegetable Shortening",
        "pct": 25,
        "gramsPerBatch": 6250,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FAT-001",
        "name": "Buttercup Margarine / Butter",
        "pct": 15,
        "gramsPerBatch": 3750,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-SWT-002",
        "name": "Coarse White Sucrose (Coating)",
        "pct": 35,
        "gramsPerBatch": 8750,
        "isWater": false,
        "isAsNeeded": true
      }
    ],
    "unitProductionCost": 21.6,
    "wholesaleTransferPrice": 36,
    "srp": 48,
    "grossMarginPct": 55
  },
  {
    "sku": "BRD-PAN-6KG",
    "name": "Classic Pandesal – 6.0 kg 1st Class Flour Basis | Yield: ~170 pieces (35 g raw dough each)",
    "category": "Breads / Daily Outlets",
    "targetFacility": "Pan de Verde & Laurice Delicacies",
    "standardBatchFlourKg": 6,
    "unitPieceYield": 170,
    "doughExitTempTarget": "26°C – 28°C",
    "ccp1LethalityTarget": "> 95°C",
    "waterActivityLimit": "Moist Crumb",
    "ingredients": [
      {
        "code": "RM-FLR-003",
        "name": "1st Class Hard Wheat Flour",
        "pct": 100,
        "gramsPerBatch": 6000,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-SWT-001",
        "name": "Crystal Brown Sugar",
        "pct": 20,
        "gramsPerBatch": 1200,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-SWT-003",
        "name": "Refined Iodized Fine Salt",
        "pct": 1.7,
        "gramsPerBatch": 100,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-OTH-001",
        "name": "Potable Water (Chilled)",
        "pct": 40,
        "gramsPerBatch": 2400,
        "isWater": true,
        "isAsNeeded": false
      },
      {
        "code": "RM-FLV-002",
        "name": "Vanilla Extract",
        "pct": 1.7,
        "gramsPerBatch": 100,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-LEV-001",
        "name": "Instant Dry Yeast",
        "pct": 3,
        "gramsPerBatch": 180,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-DRY-004",
        "name": "Skim Milk Powder",
        "pct": 4,
        "gramsPerBatch": 240,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FAT-003",
        "name": "Vegetable Shortening",
        "pct": 6.7,
        "gramsPerBatch": 400,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FAT-004",
        "name": "Bakery Margarine",
        "pct": 3.8,
        "gramsPerBatch": 230,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-LEV-005",
        "name": "Bread Improver (Dobrim)",
        "pct": 0.5,
        "gramsPerBatch": 30,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-DRY-007",
        "name": "Fine Dry Breadcrumbs",
        "pct": 5.8,
        "gramsPerBatch": 350,
        "isWater": false,
        "isAsNeeded": true
      }
    ],
    "unitProductionCost": 1.45,
    "wholesaleTransferPrice": 2.2,
    "srp": 3,
    "grossMarginPct": 51.7
  },
  {
    "sku": "BRD-STR-001",
    "name": "Star Bread – 6.0 kg Flour Blend (4.2 kg 1st Class + 1.8 kg 3rd Class) | Yield: ~100 pieces (80 g each)",
    "category": "Dense-Crumb Sweet Artisan Bread",
    "targetFacility": "Pan de Verde & Laurice Delicacies",
    "standardBatchFlourKg": 6,
    "unitPieceYield": 100,
    "doughExitTempTarget": "26°C – 28°C",
    "ccp1LethalityTarget": "> 95°C",
    "waterActivityLimit": "Moist Crumb",
    "ingredients": [
      {
        "code": "RM-FLR-003",
        "name": "1st Class Hard Wheat Flour",
        "pct": 70,
        "gramsPerBatch": 4200,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FLR-002",
        "name": "3rd Class Soft Wheat Flour",
        "pct": 30,
        "gramsPerBatch": 1800,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-SWT-001",
        "name": "Crystal Brown Sugar",
        "pct": 20,
        "gramsPerBatch": 1200,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-SWT-003",
        "name": "Refined Iodized Fine Salt",
        "pct": 1.5,
        "gramsPerBatch": 90,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-OTH-001",
        "name": "Potable Water",
        "pct": 40,
        "gramsPerBatch": 2400,
        "isWater": true,
        "isAsNeeded": false
      },
      {
        "code": "RM-FLV-002",
        "name": "Vanilla Extract",
        "pct": 1.7,
        "gramsPerBatch": 100,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-DRY-004",
        "name": "Skim Milk Powder",
        "pct": 4,
        "gramsPerBatch": 240,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-LEV-002",
        "name": "Double Acting Baking Powder",
        "pct": 1,
        "gramsPerBatch": 60,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-LEV-001",
        "name": "Instant Dry Yeast",
        "pct": 1.3,
        "gramsPerBatch": 80,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FAT-004",
        "name": "Bakery Margarine",
        "pct": 3,
        "gramsPerBatch": 180,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-LEV-005",
        "name": "Bread Improver (Dobrim)",
        "pct": 0.4,
        "gramsPerBatch": 24,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FAT-003",
        "name": "Vegetable Shortening",
        "pct": 1.7,
        "gramsPerBatch": 100,
        "isWater": false,
        "isAsNeeded": false
      }
    ],
    "unitProductionCost": 3.85,
    "wholesaleTransferPrice": 6,
    "srp": 8,
    "grossMarginPct": 51.9
  },
  {
    "sku": "BRD-SPN-001",
    "name": "Spanish Bread – 4.0 kg Flour Blend (3.0 kg 1st Class + 1.0 kg 3rd Class) | Yield: ~130 pieces",
    "category": "Soft Filled Sweet Bread Roll",
    "targetFacility": "Pan de Verde & Laurice Delicacies",
    "standardBatchFlourKg": 4,
    "unitPieceYield": 130,
    "doughExitTempTarget": "26°C – 28°C",
    "ccp1LethalityTarget": "> 95°C",
    "waterActivityLimit": "Moist Crumb",
    "ingredients": [
      {
        "code": "RM-FLR-003",
        "name": "1st Class Hard Wheat Flour",
        "pct": 75,
        "gramsPerBatch": 3000,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FLR-002",
        "name": "3rd Class Soft Wheat Flour",
        "pct": 25,
        "gramsPerBatch": 1000,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-SWT-001",
        "name": "Crystal Brown Sugar (Dough)",
        "pct": 15,
        "gramsPerBatch": 600,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-SWT-003",
        "name": "Refined Iodized Fine Salt",
        "pct": 1.3,
        "gramsPerBatch": 50,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-LEV-001",
        "name": "Instant Dry Yeast",
        "pct": 1.3,
        "gramsPerBatch": 50,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-DRY-004",
        "name": "Skim Milk Powder (Dough)",
        "pct": 3.8,
        "gramsPerBatch": 150,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FAT-003",
        "name": "Vegetable Shortening",
        "pct": 5,
        "gramsPerBatch": 200,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-OTH-001",
        "name": "Potable Water",
        "pct": 45,
        "gramsPerBatch": 1800,
        "isWater": true,
        "isAsNeeded": false
      },
      {
        "code": "SUB-FIL-001",
        "name": "Gooey Sweet Filling (4 Mixes):",
        "pct": 0,
        "gramsPerBatch": 2,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-DRY-004",
        "name": "Skim Milk Powder",
        "pct": 7.5,
        "gramsPerBatch": 300,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-SWT-001",
        "name": "Sugar (Refined or Brown)",
        "pct": 25,
        "gramsPerBatch": 1000,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FAT-004",
        "name": "Bakery Margarine",
        "pct": 25,
        "gramsPerBatch": 1000,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-DRY-007",
        "name": "Fine Dry Breadcrumbs",
        "pct": 7.5,
        "gramsPerBatch": 300,
        "isWater": false,
        "isAsNeeded": true
      }
    ],
    "unitProductionCost": 3.15,
    "wholesaleTransferPrice": 5.2,
    "srp": 7,
    "grossMarginPct": 55
  },
  {
    "sku": "PST-ENS-001",
    "name": "Special Butter Ensaymada – 6.0 kg 1st Class Flour Basis | Yield: ~120 coiled units",
    "category": "Brioche / Rich Pastry",
    "targetFacility": "Pan de Verde & Laurice Delicacies",
    "standardBatchFlourKg": 6,
    "unitPieceYield": 120,
    "doughExitTempTarget": "26°C – 28°C",
    "ccp1LethalityTarget": "> 95°C",
    "waterActivityLimit": "Moist Crumb",
    "ingredients": [
      {
        "code": "RM-FLR-003",
        "name": "1st Class Hard Wheat Flour",
        "pct": 100,
        "gramsPerBatch": 6000,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-SWT-001",
        "name": "Crystal Brown Sugar",
        "pct": 20,
        "gramsPerBatch": 1200,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-SWT-003",
        "name": "Refined Iodized Fine Salt",
        "pct": 1.5,
        "gramsPerBatch": 90,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-OTH-001",
        "name": "Potable Water (Chilled)",
        "pct": 38.3,
        "gramsPerBatch": 2300,
        "isWater": true,
        "isAsNeeded": false
      },
      {
        "code": "RM-DRY-001",
        "name": "Fresh Whole Eggs",
        "pct": 0,
        "gramsPerBatch": 10,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-DRY-003",
        "name": "Evaporated Milk (370ml tin)",
        "pct": 0,
        "gramsPerBatch": 370,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-LEV-005",
        "name": "Bread Improver (Dobrim)",
        "pct": 0.5,
        "gramsPerBatch": 30,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-DRY-004",
        "name": "Skim Milk Powder",
        "pct": 4,
        "gramsPerBatch": 240,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FAT-003",
        "name": "Vegetable Shortening",
        "pct": 10,
        "gramsPerBatch": 600,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-LEV-001",
        "name": "Instant Dry Yeast",
        "pct": 2,
        "gramsPerBatch": 120,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "SUB-TOP-001",
        "name": "Rich Buttercream Topping:",
        "pct": 0,
        "gramsPerBatch": 1,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-SWT-004",
        "name": "Confectioners / Powdered Sugar",
        "pct": 13.3,
        "gramsPerBatch": 800,
        "isWater": false,
        "isAsNeeded": true
      },
      {
        "code": "RM-DRY-003",
        "name": "Evaporated Milk",
        "pct": 3.3,
        "gramsPerBatch": 200,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-OTH-003",
        "name": "Grated Processed Cheddar Cheese",
        "pct": 8.3,
        "gramsPerBatch": 500,
        "isWater": false,
        "isAsNeeded": false
      }
    ],
    "unitProductionCost": 6.5,
    "wholesaleTransferPrice": 11,
    "srp": 15,
    "grossMarginPct": 56.7
  },
  {
    "sku": "BRD-BUN-001",
    "name": "Commercial Table Buns (Burger / Dinner) – 12.0 kg 1st Class Flour Basis | Yield: ~340 pieces (50 g each)",
    "category": "Soft Leavened Table Buns",
    "targetFacility": "Pan de Verde & Laurice Delicacies",
    "standardBatchFlourKg": 12,
    "unitPieceYield": 340,
    "doughExitTempTarget": "26°C – 28°C",
    "ccp1LethalityTarget": "> 95°C",
    "waterActivityLimit": "Moist Crumb",
    "ingredients": [
      {
        "code": "RM-FLR-003",
        "name": "1st Class Hard Wheat Flour",
        "pct": 100,
        "gramsPerBatch": 12000,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-SWT-001",
        "name": "Crystal Brown Sugar",
        "pct": 18,
        "gramsPerBatch": 2160,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-SWT-003",
        "name": "Refined Iodized Fine Salt",
        "pct": 1.5,
        "gramsPerBatch": 180,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-OTH-001",
        "name": "Potable Water",
        "pct": 41.7,
        "gramsPerBatch": 5000,
        "isWater": true,
        "isAsNeeded": false
      },
      {
        "code": "RM-FLV-002",
        "name": "Vanilla Extract",
        "pct": 1.7,
        "gramsPerBatch": 200,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-LEV-005",
        "name": "Bread Improver (Dobrim)",
        "pct": 0.5,
        "gramsPerBatch": 60,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-LEV-001",
        "name": "Instant Dry Yeast",
        "pct": 1,
        "gramsPerBatch": 120,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-DRY-004",
        "name": "Skim Milk Powder",
        "pct": 4,
        "gramsPerBatch": 480,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FAT-003",
        "name": "Vegetable Shortening",
        "pct": 5.8,
        "gramsPerBatch": 700,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-DRY-006",
        "name": "White Sesame Seeds (Optional)",
        "pct": 1.3,
        "gramsPerBatch": 150,
        "isWater": false,
        "isAsNeeded": true
      }
    ],
    "unitProductionCost": 2.1,
    "wholesaleTransferPrice": 3.75,
    "srp": 5,
    "grossMarginPct": 58
  },
  {
    "sku": "BRD-PTK-001",
    "name": "Putok Bread (Cracking Crown Roll) – 3.0 kg Flour Blend (2.1 kg 1st Class + 0.9 kg 3rd Class) | Yield: ~70 pieces (60 g each)",
    "category": "Stiff-Dough Crown-Cut Hard Sweet Roll",
    "targetFacility": "Pan de Verde & Laurice Delicacies",
    "standardBatchFlourKg": 3,
    "unitPieceYield": 70,
    "doughExitTempTarget": "26°C – 28°C",
    "ccp1LethalityTarget": "> 95°C",
    "waterActivityLimit": "Moist Crumb",
    "ingredients": [
      {
        "code": "RM-FLR-003",
        "name": "1st Class Hard Wheat Flour",
        "pct": 70,
        "gramsPerBatch": 2100,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FLR-002",
        "name": "3rd Class Soft Wheat Flour",
        "pct": 30,
        "gramsPerBatch": 900,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-SWT-001",
        "name": "Crystal Brown Sugar",
        "pct": 20,
        "gramsPerBatch": 600,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-SWT-003",
        "name": "Refined Iodized Fine Salt",
        "pct": 1.5,
        "gramsPerBatch": 45,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FAT-004",
        "name": "Bakery Margarine",
        "pct": 3,
        "gramsPerBatch": 90,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FAT-003",
        "name": "Vegetable Shortening",
        "pct": 1,
        "gramsPerBatch": 30,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-OTH-001",
        "name": "Potable Water",
        "pct": 32,
        "gramsPerBatch": 960,
        "isWater": true,
        "isAsNeeded": false
      },
      {
        "code": "RM-FLV-002",
        "name": "Vanilla Extract",
        "pct": 1.7,
        "gramsPerBatch": 50,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FAT-006",
        "name": "Refined Vegetable Cooking Oil",
        "pct": 5,
        "gramsPerBatch": 150,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-DRY-004",
        "name": "Skim Milk Powder",
        "pct": 2,
        "gramsPerBatch": 60,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-LEV-002",
        "name": "Double Acting Baking Powder",
        "pct": 2,
        "gramsPerBatch": 60,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-LEV-001",
        "name": "Instant Dry Yeast",
        "pct": 1,
        "gramsPerBatch": 30,
        "isWater": false,
        "isAsNeeded": false
      }
    ],
    "unitProductionCost": 2.6,
    "wholesaleTransferPrice": 4.5,
    "srp": 6,
    "grossMarginPct": 56.7
  },
  {
    "sku": "FRI-SHK-001",
    "name": "Shakoy Bread (Twisted Fried Doughnut) – 5.0 kg Flour Blend (2.5 kg APF + 2.5 kg 3rd Class) | Yield: ~140 pieces (50 g each)",
    "category": "Twisted Deep-Fried Yeast Doughnut",
    "targetFacility": "Pan de Verde & Laurice Delicacies",
    "standardBatchFlourKg": 5,
    "unitPieceYield": 140,
    "doughExitTempTarget": "26°C – 28°C",
    "ccp1LethalityTarget": "> 95°C",
    "waterActivityLimit": "Moist Crumb",
    "ingredients": [
      {
        "code": "RM-FLR-001",
        "name": "All-Purpose Flour",
        "pct": 50,
        "gramsPerBatch": 2500,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FLR-002",
        "name": "3rd Class Soft Wheat Flour",
        "pct": 50,
        "gramsPerBatch": 2500,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-SWT-002",
        "name": "Refined White Sugar (Dough)",
        "pct": 20,
        "gramsPerBatch": 1000,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-SWT-002",
        "name": "Refined White Sugar (Coating)",
        "pct": 10,
        "gramsPerBatch": 500,
        "isWater": false,
        "isAsNeeded": true
      },
      {
        "code": "RM-LEV-001",
        "name": "Instant Dry Yeast",
        "pct": 1,
        "gramsPerBatch": 50,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-DRY-001",
        "name": "Fresh Whole Eggs",
        "pct": 0,
        "gramsPerBatch": 4,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FAT-006",
        "name": "Cooking Oil (Frying Absorption)",
        "pct": 0,
        "gramsPerBatch": 3000,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-OTH-001",
        "name": "Potable Water",
        "pct": 44,
        "gramsPerBatch": 2200,
        "isWater": true,
        "isAsNeeded": false
      },
      {
        "code": "RM-SWT-003",
        "name": "Refined Iodized Fine Salt",
        "pct": 1,
        "gramsPerBatch": 50,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FAT-004",
        "name": "Bakery Margarine",
        "pct": 4,
        "gramsPerBatch": 200,
        "isWater": false,
        "isAsNeeded": false
      }
    ],
    "unitProductionCost": 2.4,
    "wholesaleTransferPrice": 4.5,
    "srp": 6,
    "grossMarginPct": 60
  },
  {
    "sku": "FRI-BNG-001",
    "name": "Binangkal – 3.0 kg Flour Blend (1.5 kg 1st Class + 1.5 kg 3rd Class) | Yield: ~260 pieces (15 g each)",
    "category": "Deep-Fried Sesame Cookie Delicacy",
    "targetFacility": "Pan de Verde & Laurice Delicacies",
    "standardBatchFlourKg": 3,
    "unitPieceYield": 260,
    "doughExitTempTarget": "26°C – 28°C",
    "ccp1LethalityTarget": "> 95°C",
    "waterActivityLimit": "Moist Crumb",
    "ingredients": [
      {
        "code": "RM-FLR-003",
        "name": "1st Class Hard Wheat Flour",
        "pct": 50,
        "gramsPerBatch": 1500,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FLR-002",
        "name": "3rd Class Soft Wheat Flour",
        "pct": 50,
        "gramsPerBatch": 1500,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-SWT-001",
        "name": "Crystal Brown Sugar",
        "pct": 30,
        "gramsPerBatch": 900,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-LEV-002",
        "name": "Double Acting Baking Powder",
        "pct": 3.3,
        "gramsPerBatch": 100,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-SWT-003",
        "name": "Refined Iodized Fine Salt",
        "pct": 1.3,
        "gramsPerBatch": 40,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-DRY-004",
        "name": "Skim Milk Powder",
        "pct": 5,
        "gramsPerBatch": 150,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FAT-006",
        "name": "Refined Cooking Oil (Dough)",
        "pct": 5,
        "gramsPerBatch": 150,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-OTH-001",
        "name": "Potable Water",
        "pct": 30,
        "gramsPerBatch": 900,
        "isWater": true,
        "isAsNeeded": false
      },
      {
        "code": "RM-DRY-006",
        "name": "White Sesame Seeds",
        "pct": 6.7,
        "gramsPerBatch": 200,
        "isWater": false,
        "isAsNeeded": true
      },
      {
        "code": "RM-FAT-006",
        "name": "Refined Cooking Oil (Frying)",
        "pct": 0,
        "gramsPerBatch": 850,
        "isWater": false,
        "isAsNeeded": false
      }
    ],
    "unitProductionCost": 1.15,
    "wholesaleTransferPrice": 2.1,
    "srp": 3,
    "grossMarginPct": 61.7
  },
  {
    "sku": "FRI-DGH-001",
    "name": "Fried Yeast Doughnut – 5.0 kg All-Purpose Flour Basis | Yield: ~150 ring units",
    "category": "Fried Sweet Yeast Ring",
    "targetFacility": "Pan de Verde & Laurice Delicacies",
    "standardBatchFlourKg": 5,
    "unitPieceYield": 150,
    "doughExitTempTarget": "26°C – 28°C",
    "ccp1LethalityTarget": "> 95°C",
    "waterActivityLimit": "Moist Crumb",
    "ingredients": [
      {
        "code": "RM-FLR-001",
        "name": "All-Purpose Flour",
        "pct": 100,
        "gramsPerBatch": 5000,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-SWT-001",
        "name": "Crystal Brown Sugar",
        "pct": 25,
        "gramsPerBatch": 1250,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FAT-003",
        "name": "Vegetable Shortening",
        "pct": 2.5,
        "gramsPerBatch": 125,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FAT-004",
        "name": "Bakery Margarine",
        "pct": 0.2,
        "gramsPerBatch": 10,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-DRY-001",
        "name": "Fresh Whole Eggs",
        "pct": 0,
        "gramsPerBatch": 30,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-DRY-003",
        "name": "Evaporated Milk (370ml tins)",
        "pct": 0,
        "gramsPerBatch": 3700,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-LEV-005",
        "name": "Bread Improver (Dobrim)",
        "pct": 0.2,
        "gramsPerBatch": 10,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-LEV-001",
        "name": "Instant Dry Yeast",
        "pct": 1.5,
        "gramsPerBatch": 75,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-SWT-003",
        "name": "Refined Iodized Fine Salt",
        "pct": 1,
        "gramsPerBatch": 50,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FAT-006",
        "name": "Refined Cooking Oil (Frying)",
        "pct": 0,
        "gramsPerBatch": 600,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-SWT-002",
        "name": "Refined White Sugar (Dusting)",
        "pct": 10,
        "gramsPerBatch": 500,
        "isWater": false,
        "isAsNeeded": true
      }
    ],
    "unitProductionCost": 2.35,
    "wholesaleTransferPrice": 4.5,
    "srp": 6,
    "grossMarginPct": 60.8
  },
  {
    "sku": "PST-HOP-001",
    "name": "Traditional Hopia / Pig-Pie – 2.0 kg Flour Blend (1.0 kg 1st Class + 1.0 kg 3rd Class) | Yield: ~120 pieces",
    "category": "Traditional Flaky Stuffed Pastry",
    "targetFacility": "Pan de Verde & Laurice Delicacies",
    "standardBatchFlourKg": 2,
    "unitPieceYield": 120,
    "doughExitTempTarget": "26°C – 28°C",
    "ccp1LethalityTarget": "> 95°C",
    "waterActivityLimit": "Moist Crumb",
    "ingredients": [
      {
        "code": "RM-SWT-001",
        "name": "Brown Sugar (Filling)",
        "pct": 80,
        "gramsPerBatch": 1600,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FLR-003",
        "name": "1st Class Hard Wheat Flour",
        "pct": 50,
        "gramsPerBatch": 1000,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FLR-002",
        "name": "3rd Class Soft Wheat Flour",
        "pct": 50,
        "gramsPerBatch": 1000,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-DRY-004",
        "name": "Skim Milk Powder",
        "pct": 7.5,
        "gramsPerBatch": 150,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FAT-004",
        "name": "Bakery Margarine",
        "pct": 10,
        "gramsPerBatch": 200,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-OTH-002",
        "name": "Minced Fried Onions (Bombay)",
        "pct": 5,
        "gramsPerBatch": 100,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FAT-006",
        "name": "Refined Vegetable Oil",
        "pct": 7.5,
        "gramsPerBatch": 150,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-OTH-001",
        "name": "Potable Water",
        "pct": 30,
        "gramsPerBatch": 600,
        "isWater": true,
        "isAsNeeded": false
      },
      {
        "code": "RM-FAT-003",
        "name": "Pork Fat / Shortening (Filling)",
        "pct": 15,
        "gramsPerBatch": 300,
        "isWater": false,
        "isAsNeeded": false
      }
    ],
    "unitProductionCost": 4.2,
    "wholesaleTransferPrice": 7.5,
    "srp": 10,
    "grossMarginPct": 58
  },
  {
    "sku": "PST-HPN-001",
    "name": "Hopia Panet (Mung Bean / Kundol) – 1.0 kg Flour Blend (0.75 kg 3rd Class + 0.25 kg 1st Class) | Yield: ~80 pieces",
    "category": "Thin-Crusted Flaky Hopia Variant",
    "targetFacility": "Pan de Verde & Laurice Delicacies",
    "standardBatchFlourKg": 1,
    "unitPieceYield": 80,
    "doughExitTempTarget": "26°C – 28°C",
    "ccp1LethalityTarget": "> 95°C",
    "waterActivityLimit": "Moist Crumb",
    "ingredients": [
      {
        "code": "RM-FLR-002",
        "name": "3rd Class Soft Wheat Flour",
        "pct": 75,
        "gramsPerBatch": 750,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FLR-003",
        "name": "1st Class Hard Wheat Flour",
        "pct": 25,
        "gramsPerBatch": 250,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-SWT-003",
        "name": "Refined Iodized Fine Salt",
        "pct": 0.2,
        "gramsPerBatch": 2,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FAT-006",
        "name": "Refined Vegetable Oil",
        "pct": 10,
        "gramsPerBatch": 100,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-OTH-001",
        "name": "Potable Water",
        "pct": 45,
        "gramsPerBatch": 450,
        "isWater": true,
        "isAsNeeded": false
      },
      {
        "code": "SUB-FIL-002",
        "name": "Sweet Mung Bean / Kundol Filling",
        "pct": 120,
        "gramsPerBatch": 1200,
        "isWater": false,
        "isAsNeeded": false
      }
    ],
    "unitProductionCost": 3.9,
    "wholesaleTransferPrice": 7.5,
    "srp": 10,
    "grossMarginPct": 61
  },
  {
    "sku": "PST-HMN-001",
    "name": "Half Moon Pastry – 3.0 kg 3rd Class Flour Basis | Yield: ~110 crescent-shaped pieces",
    "category": "Soft Crescent Cake / Short-Crust Pastry",
    "targetFacility": "Pan de Verde & Laurice Delicacies",
    "standardBatchFlourKg": 3,
    "unitPieceYield": 110,
    "doughExitTempTarget": "26°C – 28°C",
    "ccp1LethalityTarget": "> 95°C",
    "waterActivityLimit": "Moist Crumb",
    "ingredients": [
      {
        "code": "RM-FLR-002",
        "name": "3rd Class Soft Wheat Flour",
        "pct": 100,
        "gramsPerBatch": 3000,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-SWT-001",
        "name": "Crystal Brown Sugar",
        "pct": 50,
        "gramsPerBatch": 1500,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-SWT-003",
        "name": "Refined Iodized Fine Salt",
        "pct": 1,
        "gramsPerBatch": 30,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FAT-004",
        "name": "Bakery Margarine",
        "pct": 13.3,
        "gramsPerBatch": 400,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FAT-003",
        "name": "Vegetable Shortening",
        "pct": 13.3,
        "gramsPerBatch": 400,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-DRY-004",
        "name": "Skim Milk Powder",
        "pct": 8.3,
        "gramsPerBatch": 250,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-LEV-002",
        "name": "Double Acting Baking Powder",
        "pct": 3.3,
        "gramsPerBatch": 100,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-OTH-001",
        "name": "Potable Water",
        "pct": 16.7,
        "gramsPerBatch": 500,
        "isWater": true,
        "isAsNeeded": false
      },
      {
        "code": "RM-DRY-001",
        "name": "Fresh Whole Eggs",
        "pct": 0,
        "gramsPerBatch": 4,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FLV-002",
        "name": "Vanilla Extract",
        "pct": 1,
        "gramsPerBatch": 30,
        "isWater": false,
        "isAsNeeded": false
      }
    ],
    "unitProductionCost": 4.1,
    "wholesaleTransferPrice": 7.5,
    "srp": 10,
    "grossMarginPct": 59
  },
  {
    "sku": "PST-CSB-001",
    "name": "Rich Cheese Bar – 2.0 kg All-Purpose Flour Basis | Yield: ~100 rectangular bar pieces",
    "category": "Rich Baked Dessert Bar",
    "targetFacility": "Pan de Verde & Laurice Delicacies",
    "standardBatchFlourKg": 2,
    "unitPieceYield": 100,
    "doughExitTempTarget": "26°C – 28°C",
    "ccp1LethalityTarget": "> 95°C",
    "waterActivityLimit": "Moist Crumb",
    "ingredients": [
      {
        "code": "RM-FLR-001",
        "name": "All-Purpose Flour",
        "pct": 100,
        "gramsPerBatch": 2000,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-SWT-002",
        "name": "Refined White Cane Sugar",
        "pct": 110,
        "gramsPerBatch": 2200,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-SWT-003",
        "name": "Refined Iodized Fine Salt",
        "pct": 1,
        "gramsPerBatch": 20,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-DRY-001",
        "name": "Fresh Whole Eggs",
        "pct": 0,
        "gramsPerBatch": 20,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-DRY-004",
        "name": "Skim Milk Powder",
        "pct": 40,
        "gramsPerBatch": 800,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FAT-001",
        "name": "Softened Unsalted Butter",
        "pct": 90,
        "gramsPerBatch": 1800,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FLV-002",
        "name": "Vanilla Extract",
        "pct": 5,
        "gramsPerBatch": 100,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-OTH-003",
        "name": "Shredded Cheddar/Processed Cheese",
        "pct": 50,
        "gramsPerBatch": 1000,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-LEV-002",
        "name": "Double Acting Baking Powder",
        "pct": 1.5,
        "gramsPerBatch": 30,
        "isWater": false,
        "isAsNeeded": false
      }
    ],
    "unitProductionCost": 4.5,
    "wholesaleTransferPrice": 7.5,
    "srp": 10,
    "grossMarginPct": 55
  },
  {
    "sku": "CKI-CRK-001",
    "name": "Crinkle Cookies – 2.5 kg 3rd Class Flour | Yield: ~220 cookies",
    "category": "Rich Fudge Crinkle Cookie",
    "targetFacility": "Pan de Verde & Laurice Delicacies",
    "standardBatchFlourKg": 2.5,
    "unitPieceYield": 220,
    "doughExitTempTarget": "26°C – 28°C",
    "ccp1LethalityTarget": "> 95°C",
    "waterActivityLimit": "Moist Crumb",
    "ingredients": [
      {
        "code": "RM-FLR-002",
        "name": "3rd Class Soft Wheat Flour",
        "pct": 100,
        "gramsPerBatch": 2500,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-SWT-001",
        "name": "Crystal Brown Sugar",
        "pct": 64,
        "gramsPerBatch": 1600,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FLV-005",
        "name": "Dark Cocoa Powder",
        "pct": 12,
        "gramsPerBatch": 300,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-DRY-004",
        "name": "Skim Milk Powder",
        "pct": 12,
        "gramsPerBatch": 300,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FAT-004",
        "name": "Bakery Margarine",
        "pct": 16,
        "gramsPerBatch": 400,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-LEV-002",
        "name": "Double Acting Baking Powder",
        "pct": 4.8,
        "gramsPerBatch": 120,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-DRY-003",
        "name": "Evaporated Milk (370ml tins)",
        "pct": 0,
        "gramsPerBatch": 740,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FLV-006",
        "name": "Chocolate Brown Color Powder",
        "pct": 1.2,
        "gramsPerBatch": 30,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-DRY-001",
        "name": "Fresh Large Eggs",
        "pct": 0,
        "gramsPerBatch": 7,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-SWT-004",
        "name": "Confectioners / Powdered Sugar",
        "pct": 100,
        "gramsPerBatch": 2500,
        "isWater": false,
        "isAsNeeded": true
      },
      {
        "code": "RM-SWT-003",
        "name": "Refined Iodized Fine Salt",
        "pct": 1,
        "gramsPerBatch": 25,
        "isWater": false,
        "isAsNeeded": false
      }
    ],
    "unitProductionCost": 1.95,
    "wholesaleTransferPrice": 3.6,
    "srp": 5,
    "grossMarginPct": 61
  },
  {
    "sku": "BRD-PTS-001",
    "name": "Patatas Bread – 3.0 kg 3rd Class Flour Basis | Yield: ~90 pieces",
    "category": "Molded Potato-Shaped Soft Bread",
    "targetFacility": "Pan de Verde & Laurice Delicacies",
    "standardBatchFlourKg": 3,
    "unitPieceYield": 90,
    "doughExitTempTarget": "26°C – 28°C",
    "ccp1LethalityTarget": "> 95°C",
    "waterActivityLimit": "Moist Crumb",
    "ingredients": [
      {
        "code": "RM-FLR-002",
        "name": "3rd Class Soft Wheat Flour",
        "pct": 100,
        "gramsPerBatch": 3000,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-SWT-001",
        "name": "Crystal Brown Sugar",
        "pct": 18,
        "gramsPerBatch": 540,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-SWT-003",
        "name": "Refined Iodized Fine Salt",
        "pct": 1.2,
        "gramsPerBatch": 35,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-DRY-004",
        "name": "Skim Milk Powder",
        "pct": 4.7,
        "gramsPerBatch": 140,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-LEV-002",
        "name": "Double Acting Baking Powder",
        "pct": 0.5,
        "gramsPerBatch": 15,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FAT-003",
        "name": "Vegetable Shortening",
        "pct": 3,
        "gramsPerBatch": 90,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-OTH-001",
        "name": "Potable Water",
        "pct": 45,
        "gramsPerBatch": 1350,
        "isWater": true,
        "isAsNeeded": false
      },
      {
        "code": "RM-LEV-001",
        "name": "Instant Dry Yeast",
        "pct": 1,
        "gramsPerBatch": 30,
        "isWater": false,
        "isAsNeeded": false
      }
    ],
    "unitProductionCost": 2.95,
    "wholesaleTransferPrice": 5.2,
    "srp": 7,
    "grossMarginPct": 57.9
  },
  {
    "sku": "BRD-SWT-001",
    "name": "Sweetheart Bread – 3.0 kg Flour Blend (2.0 kg 1st Class + 1.0 kg 3rd Class) | Yield: ~85 heart-shaped pieces",
    "category": "Shaped Heart Bread with Red Center",
    "targetFacility": "Pan de Verde & Laurice Delicacies",
    "standardBatchFlourKg": 3,
    "unitPieceYield": 85,
    "doughExitTempTarget": "26°C – 28°C",
    "ccp1LethalityTarget": "> 95°C",
    "waterActivityLimit": "Moist Crumb",
    "ingredients": [
      {
        "code": "RM-FLR-003",
        "name": "1st Class Hard Wheat Flour",
        "pct": 66.7,
        "gramsPerBatch": 2000,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FLR-002",
        "name": "3rd Class Soft Wheat Flour",
        "pct": 33.3,
        "gramsPerBatch": 1000,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-SWT-001",
        "name": "Crystal Brown Sugar",
        "pct": 41.7,
        "gramsPerBatch": 1250,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-SWT-003",
        "name": "Refined Iodized Fine Salt",
        "pct": 0.7,
        "gramsPerBatch": 20,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-DRY-004",
        "name": "Skim Milk Powder",
        "pct": 8.3,
        "gramsPerBatch": 250,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-LEV-002",
        "name": "Double Acting Baking Powder",
        "pct": 1.7,
        "gramsPerBatch": 50,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FLV-002",
        "name": "Vanilla Extract",
        "pct": 1.7,
        "gramsPerBatch": 50,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FAT-003",
        "name": "Vegetable Shortening",
        "pct": 10,
        "gramsPerBatch": 300,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-OTH-001",
        "name": "Potable Water",
        "pct": 16.7,
        "gramsPerBatch": 500,
        "isWater": true,
        "isAsNeeded": false
      },
      {
        "code": "RM-LEV-001",
        "name": "Instant Dry Yeast",
        "pct": 2,
        "gramsPerBatch": 60,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FLV-008",
        "name": "Red Food Color Liquid",
        "pct": 0.3,
        "gramsPerBatch": 10,
        "isWater": false,
        "isAsNeeded": false
      }
    ],
    "unitProductionCost": 3.4,
    "wholesaleTransferPrice": 6,
    "srp": 8,
    "grossMarginPct": 57.5
  },
  {
    "sku": "DEL-BGB-001",
    "name": "Bagong Bayan Reconstituted Delicacy – 12.0 kg Starch Base (6.0 kg 3rd Class Flour + 6.0 kg Breadcrumbs) | Yield: ~350 pieces",
    "category": "Reconstituted Toasted Bakery Delicacy",
    "targetFacility": "Pan de Verde & Laurice Delicacies",
    "standardBatchFlourKg": 12,
    "unitPieceYield": 350,
    "doughExitTempTarget": "26°C – 28°C",
    "ccp1LethalityTarget": "> 95°C",
    "waterActivityLimit": "Moist Crumb",
    "ingredients": [
      {
        "code": "RM-FLR-002",
        "name": "3rd Class Soft Wheat Flour",
        "pct": 50,
        "gramsPerBatch": 6000,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-DRY-007",
        "name": "Toasted Breadcrumbs",
        "pct": 50,
        "gramsPerBatch": 6000,
        "isWater": false,
        "isAsNeeded": true
      },
      {
        "code": "RM-SWT-001",
        "name": "Crystal Brown Sugar",
        "pct": 31.3,
        "gramsPerBatch": 3750,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-SWT-003",
        "name": "Refined Iodized Fine Salt",
        "pct": 0.5,
        "gramsPerBatch": 60,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-LEV-006",
        "name": "Ammonium Bicarbonate (Carbonato)",
        "pct": 0.5,
        "gramsPerBatch": 60,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-LEV-002",
        "name": "Double Acting Baking Powder",
        "pct": 2,
        "gramsPerBatch": 240,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-DRY-004",
        "name": "Skim Milk Powder",
        "pct": 1.3,
        "gramsPerBatch": 150,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FAT-004",
        "name": "Bakery Margarine",
        "pct": 1.7,
        "gramsPerBatch": 200,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FAT-003",
        "name": "Vegetable Shortening",
        "pct": 1.7,
        "gramsPerBatch": 200,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-OTH-001",
        "name": "Potable Water",
        "pct": 20.8,
        "gramsPerBatch": 2500,
        "isWater": true,
        "isAsNeeded": false
      },
      {
        "code": "RM-FLV-002",
        "name": "Vanilla Extract",
        "pct": 1.7,
        "gramsPerBatch": 200,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FLV-003",
        "name": "Egg Yellow Food Color",
        "pct": 0.3,
        "gramsPerBatch": 30,
        "isWater": false,
        "isAsNeeded": false
      }
    ],
    "unitProductionCost": 2.8,
    "wholesaleTransferPrice": 5.8,
    "srp": 8,
    "grossMarginPct": 65
  },
  {
    "sku": "DEL-BGP-001",
    "name": "Bagong Bayan Panit (Red Shell) – 3.0 kg 1st Class Flour Basis | Yield: Wraps ~350 pieces",
    "category": "Thin Crust Casing for Bagong Bayan",
    "targetFacility": "Pan de Verde & Laurice Delicacies",
    "standardBatchFlourKg": 3,
    "unitPieceYield": 350,
    "doughExitTempTarget": "26°C – 28°C",
    "ccp1LethalityTarget": "> 95°C",
    "waterActivityLimit": "Moist Crumb",
    "ingredients": [
      {
        "code": "RM-FLR-003",
        "name": "1st Class Hard Wheat Flour",
        "pct": 100,
        "gramsPerBatch": 3000,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-SWT-001",
        "name": "Crystal Brown Sugar",
        "pct": 6,
        "gramsPerBatch": 180,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-SWT-003",
        "name": "Refined Iodized Fine Salt",
        "pct": 0.7,
        "gramsPerBatch": 20,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-LEV-002",
        "name": "Double Acting Baking Powder",
        "pct": 1,
        "gramsPerBatch": 30,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FAT-003",
        "name": "Vegetable Shortening",
        "pct": 5,
        "gramsPerBatch": 150,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FLV-008",
        "name": "Red Food Color Powder/Liquid",
        "pct": 0.3,
        "gramsPerBatch": 10,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-OTH-001",
        "name": "Potable Water",
        "pct": 50,
        "gramsPerBatch": 1500,
        "isWater": true,
        "isAsNeeded": false
      }
    ],
    "unitProductionCost": 0.65,
    "wholesaleTransferPrice": 1,
    "srp": 1.5,
    "grossMarginPct": 56.7
  },
  {
    "sku": "DEL-DBC-001",
    "name": "Double Body Coconut Delicacy – 3.0 kg 3rd Class Flour Basis | Yield: ~100 paired twin units",
    "category": "Layered Coconut Syrup Delicacy",
    "targetFacility": "Pan de Verde & Laurice Delicacies",
    "standardBatchFlourKg": 3,
    "unitPieceYield": 100,
    "doughExitTempTarget": "26°C – 28°C",
    "ccp1LethalityTarget": "> 95°C",
    "waterActivityLimit": "Moist Crumb",
    "ingredients": [
      {
        "code": "RM-FLR-002",
        "name": "3rd Class Soft Wheat Flour",
        "pct": 100,
        "gramsPerBatch": 3000,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-SWT-001",
        "name": "Crystal Brown Sugar (Dough)",
        "pct": 50,
        "gramsPerBatch": 1500,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-SWT-003",
        "name": "Refined Iodized Fine Salt",
        "pct": 0.3,
        "gramsPerBatch": 10,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-OTH-001",
        "name": "Potable Water (Dough)",
        "pct": 23.3,
        "gramsPerBatch": 700,
        "isWater": true,
        "isAsNeeded": false
      },
      {
        "code": "RM-FLV-002",
        "name": "Vanilla Extract",
        "pct": 1.7,
        "gramsPerBatch": 50,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-DRY-004",
        "name": "Skim Milk Powder",
        "pct": 8.3,
        "gramsPerBatch": 250,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-LEV-002",
        "name": "Double Acting Baking Powder",
        "pct": 3.3,
        "gramsPerBatch": 100,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FAT-003",
        "name": "Shortening / Lard",
        "pct": 10,
        "gramsPerBatch": 300,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "SUB-SYP-001",
        "name": "Sticky Coconut Glaze:",
        "pct": 0,
        "gramsPerBatch": 1,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-OTH-001",
        "name": "Potable Water",
        "pct": 25,
        "gramsPerBatch": 750,
        "isWater": true,
        "isAsNeeded": false
      },
      {
        "code": "RM-DRY-005",
        "name": "Desiccated Coconut",
        "pct": 13.3,
        "gramsPerBatch": 400,
        "isWater": false,
        "isAsNeeded": true
      }
    ],
    "unitProductionCost": 3.1,
    "wholesaleTransferPrice": 5.8,
    "srp": 8,
    "grossMarginPct": 61.3
  },
  {
    "sku": "DEL-DBU-001",
    "name": "Double Body Ube Delicacy – 3.0 kg 3rd Class Flour Basis | Yield: ~100 paired purple twin units",
    "category": "Ube-Flavored Layered Coconut Delicacy",
    "targetFacility": "Pan de Verde & Laurice Delicacies",
    "standardBatchFlourKg": 3,
    "unitPieceYield": 100,
    "doughExitTempTarget": "26°C – 28°C",
    "ccp1LethalityTarget": "> 95°C",
    "waterActivityLimit": "Moist Crumb",
    "ingredients": [
      {
        "code": "RM-FLR-002",
        "name": "3rd Class Soft Wheat Flour",
        "pct": 100,
        "gramsPerBatch": 3000,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-SWT-001",
        "name": "Crystal Brown Sugar",
        "pct": 50,
        "gramsPerBatch": 1500,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-SWT-003",
        "name": "Refined Iodized Fine Salt",
        "pct": 0.3,
        "gramsPerBatch": 10,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-OTH-001",
        "name": "Potable Water",
        "pct": 23.3,
        "gramsPerBatch": 700,
        "isWater": true,
        "isAsNeeded": false
      },
      {
        "code": "RM-FLV-001",
        "name": "Unibake Ube Flavor & Color Blend",
        "pct": 2.3,
        "gramsPerBatch": 70,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-DRY-004",
        "name": "Skim Milk Powder",
        "pct": 8.3,
        "gramsPerBatch": 250,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-LEV-002",
        "name": "Double Acting Baking Powder",
        "pct": 3.3,
        "gramsPerBatch": 100,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FAT-003",
        "name": "Shortening / Lard",
        "pct": 10,
        "gramsPerBatch": 300,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "SUB-SYP-001",
        "name": "Sticky Coconut Glaze:",
        "pct": 0,
        "gramsPerBatch": 1,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-OTH-001",
        "name": "Potable Water",
        "pct": 25,
        "gramsPerBatch": 750,
        "isWater": true,
        "isAsNeeded": false
      },
      {
        "code": "RM-DRY-005",
        "name": "Desiccated Coconut",
        "pct": 13.3,
        "gramsPerBatch": 400,
        "isWater": false,
        "isAsNeeded": true
      }
    ],
    "unitProductionCost": 3.4,
    "wholesaleTransferPrice": 6.5,
    "srp": 9,
    "grossMarginPct": 62.2
  },
  {
    "sku": "DEL-PUD-001",
    "name": "Reconstituted Bakery Pudding – 15.0 kg Breadcrumb Base | Yield: ~180 square portions",
    "category": "Reconstituted Baked Sweet Custard",
    "targetFacility": "Pan de Verde & Laurice Delicacies",
    "standardBatchFlourKg": 15,
    "unitPieceYield": 180,
    "doughExitTempTarget": "26°C – 28°C",
    "ccp1LethalityTarget": "> 95°C",
    "waterActivityLimit": "Moist Crumb",
    "ingredients": [
      {
        "code": "RM-DRY-007",
        "name": "Fine Toasted Breadcrumbs",
        "pct": 100,
        "gramsPerBatch": 15000,
        "isWater": false,
        "isAsNeeded": true
      },
      {
        "code": "RM-FLV-002",
        "name": "Vanilla Extract",
        "pct": 2,
        "gramsPerBatch": 300,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-SWT-001",
        "name": "Crystal Brown Sugar",
        "pct": 10,
        "gramsPerBatch": 1500,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FLV-003",
        "name": "Egg Yellow Food Color",
        "pct": 2,
        "gramsPerBatch": 300,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-OTH-001",
        "name": "Potable Water",
        "pct": 45,
        "gramsPerBatch": 6750,
        "isWater": true,
        "isAsNeeded": false
      },
      {
        "code": "RM-DRY-003",
        "name": "Evaporated Milk (370ml tins)",
        "pct": 0,
        "gramsPerBatch": 740,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-DRY-001",
        "name": "Fresh Whole Eggs",
        "pct": 0,
        "gramsPerBatch": 1000,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FAT-004",
        "name": "Bakery Margarine",
        "pct": 2.7,
        "gramsPerBatch": 400,
        "isWater": false,
        "isAsNeeded": false
      }
    ],
    "unitProductionCost": 4.8,
    "wholesaleTransferPrice": 10.5,
    "srp": 15,
    "grossMarginPct": 68
  },
  {
    "sku": "STM-SPO-001",
    "name": "Siopao Steamed Bun Dough – 1.5 kg Starch Base (1.0 kg APF + 0.5 kg Cornstarch) | Yield: ~35 steamed bun units",
    "category": "Steamed Leavened Bao Dough",
    "targetFacility": "Pan de Verde & Laurice Delicacies",
    "standardBatchFlourKg": 1.5,
    "unitPieceYield": 35,
    "doughExitTempTarget": "26°C – 28°C",
    "ccp1LethalityTarget": "> 95°C",
    "waterActivityLimit": "Moist Crumb",
    "ingredients": [
      {
        "code": "RM-FLR-001",
        "name": "All-Purpose Flour",
        "pct": 66.7,
        "gramsPerBatch": 1000,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FLR-005",
        "name": "Pure Cornstarch (Gawgaw)",
        "pct": 33.3,
        "gramsPerBatch": 500,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-SWT-002",
        "name": "Refined White Cane Sugar",
        "pct": 15,
        "gramsPerBatch": 225,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FAT-003",
        "name": "Vegetable Shortening",
        "pct": 16.7,
        "gramsPerBatch": 250,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-LEV-002",
        "name": "Double Acting Baking Powder",
        "pct": 2,
        "gramsPerBatch": 30,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-LEV-001",
        "name": "Instant Dry Yeast",
        "pct": 1,
        "gramsPerBatch": 15,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-OTH-001",
        "name": "Potable Water",
        "pct": 50,
        "gramsPerBatch": 750,
        "isWater": true,
        "isAsNeeded": false
      },
      {
        "code": "RM-SWT-003",
        "name": "Refined Iodized Fine Salt",
        "pct": 0.7,
        "gramsPerBatch": 10,
        "isWater": false,
        "isAsNeeded": false
      }
    ],
    "unitProductionCost": 8.5,
    "wholesaleTransferPrice": 14.5,
    "srp": 20,
    "grossMarginPct": 57.5
  },
  {
    "sku": "DES-LCH-001",
    "name": "Classic Leche Flan – 10 Fresh Eggs Basis | Yield: 4 Oval Llanera Molds",
    "category": "Traditional Steamed Custard Dessert",
    "targetFacility": "Pan de Verde & Laurice Delicacies",
    "standardBatchFlourKg": 0,
    "unitPieceYield": 4,
    "doughExitTempTarget": "26°C – 28°C",
    "ccp1LethalityTarget": "> 95°C",
    "waterActivityLimit": "Moist Crumb",
    "ingredients": [
      {
        "code": "RM-DRY-001",
        "name": "Fresh Whole Eggs (or Yolks)",
        "pct": 100,
        "gramsPerBatch": 10,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-DRY-003",
        "name": "Evaporated Milk (370ml tin)",
        "pct": 100,
        "gramsPerBatch": 370,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-DRY-002",
        "name": "Sweetened Condensed Milk",
        "pct": 100,
        "gramsPerBatch": 390,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-SWT-001",
        "name": "Crystal White/Brown Sugar",
        "pct": 82,
        "gramsPerBatch": 320,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FLV-002",
        "name": "Vanilla Extract",
        "pct": 4,
        "gramsPerBatch": 15,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-SWT-003",
        "name": "Refined Iodized Fine Salt",
        "pct": 1,
        "gramsPerBatch": 5,
        "isWater": false,
        "isAsNeeded": false
      }
    ],
    "unitProductionCost": 38,
    "wholesaleTransferPrice": 65,
    "srp": 90,
    "grossMarginPct": 57.8
  },
  {
    "sku": "BRD-PAN-001",
    "name": "Classic Pandesal – 12.5 kg Flour Blend (8.75 kg APF + 3.75 kg 3rd Class) | Yield: ~450 pieces (35 g raw dough each)",
    "category": "Breads / Daily Outlets",
    "targetFacility": "Pan de Verde & Laurice Delicacies",
    "standardBatchFlourKg": 12.5,
    "unitPieceYield": 450,
    "doughExitTempTarget": "26°C – 28°C",
    "ccp1LethalityTarget": "> 95°C",
    "waterActivityLimit": "Moist Crumb",
    "ingredients": [
      {
        "code": "RM-FLR-001",
        "name": "Continental All Purpose Flour",
        "pct": 70,
        "gramsPerBatch": 8750,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FLR-002",
        "name": "3rd Class Isla Flour",
        "pct": 30,
        "gramsPerBatch": 3750,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-SWT-001",
        "name": "Crystal Brown Sugar",
        "pct": 16,
        "gramsPerBatch": 2000,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FAT-004",
        "name": "Alpha Margarine",
        "pct": 8,
        "gramsPerBatch": 1000,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-LEV-001",
        "name": "Gloripan Instant Dry Yeast",
        "pct": 1.6,
        "gramsPerBatch": 200,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-SWT-003",
        "name": "Refined Iodized Fine Salt",
        "pct": 1.6,
        "gramsPerBatch": 200,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-DRY-004",
        "name": "Skim Milk Powder (Farmland)",
        "pct": 4,
        "gramsPerBatch": 500,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-LEV-003",
        "name": "Calcium Propionate (CSP Mold Inhibitor)",
        "pct": 0.3,
        "gramsPerBatch": 37.5,
        "isWater": false,
        "isAsNeeded": false
      }
    ],
    "unitProductionCost": 1.45,
    "wholesaleTransferPrice": 2.2,
    "srp": 3,
    "grossMarginPct": 51.7
  },
  {
    "sku": "BRD-UBE-001",
    "name": "Special Ube Cheese Pandesal – 10.0 kg All-Purpose Flour Basis | Yield: ~300 pieces",
    "category": "Signature Outlet Pastry",
    "targetFacility": "Pan de Verde & Laurice Delicacies",
    "standardBatchFlourKg": 10,
    "unitPieceYield": 300,
    "doughExitTempTarget": "26°C – 28°C",
    "ccp1LethalityTarget": "> 95°C",
    "waterActivityLimit": "Moist Crumb",
    "ingredients": [
      {
        "code": "RM-FLR-001",
        "name": "Continental All Purpose Flour",
        "pct": 100,
        "gramsPerBatch": 10000,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-SWT-002",
        "name": "Refined White Sugar",
        "pct": 18,
        "gramsPerBatch": 1800,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FAT-001",
        "name": "Buttercup Margarine / Butter",
        "pct": 10,
        "gramsPerBatch": 1000,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FLV-001",
        "name": "Unibake Ube Flavor & Color Blend",
        "pct": 3.5,
        "gramsPerBatch": 350,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-LEV-001",
        "name": "Gloripan Instant Dry Yeast",
        "pct": 1.8,
        "gramsPerBatch": 180,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-SWT-003",
        "name": "Refined Iodized Fine Salt",
        "pct": 1.5,
        "gramsPerBatch": 150,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-DRY-002",
        "name": "Master Chef Condensada",
        "pct": 5,
        "gramsPerBatch": 500,
        "isWater": false,
        "isAsNeeded": false
      }
    ],
    "unitProductionCost": 4.2,
    "wholesaleTransferPrice": 7,
    "srp": 10,
    "grossMarginPct": 58
  },
  {
    "sku": "BRD-MON-001",
    "name": "Classic Monay & Sweet Loaf – 12.5 kg All-Purpose Flour Basis | Yield: ~250 pieces",
    "category": "Heavy Loaf Breads",
    "targetFacility": "Pan de Verde & Laurice Delicacies",
    "standardBatchFlourKg": 12.5,
    "unitPieceYield": 250,
    "doughExitTempTarget": "26°C – 28°C",
    "ccp1LethalityTarget": "> 95°C",
    "waterActivityLimit": "Moist Crumb",
    "ingredients": [
      {
        "code": "RM-FLR-001",
        "name": "Continental All Purpose Flour",
        "pct": 100,
        "gramsPerBatch": 12500,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-SWT-002",
        "name": "Refined White Sugar",
        "pct": 20,
        "gramsPerBatch": 2500,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FAT-004",
        "name": "Alpha Margarine",
        "pct": 10,
        "gramsPerBatch": 1250,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-DRY-001",
        "name": "Fresh Farm Eggs",
        "pct": 6,
        "gramsPerBatch": 750,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-DRY-004",
        "name": "Skim Milk Powder",
        "pct": 5,
        "gramsPerBatch": 625,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-LEV-001",
        "name": "Gloripan Instant Dry Yeast",
        "pct": 1.8,
        "gramsPerBatch": 225,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-SWT-003",
        "name": "Refined Iodized Fine Salt",
        "pct": 1.6,
        "gramsPerBatch": 200,
        "isWater": false,
        "isAsNeeded": false
      }
    ],
    "unitProductionCost": 4.5,
    "wholesaleTransferPrice": 7.5,
    "srp": 10,
    "grossMarginPct": 55
  },
  {
    "sku": "SUB-GLZ-001",
    "name": "Biscocho Buttermilk Sweet Glaze – 10.0 kg Sugar Sub-Assembly | Yield: Glazes ~1,500 slices",
    "category": "Glaze / Sub-Assembly",
    "targetFacility": "Indangan Biscocho Hall",
    "standardBatchFlourKg": 0,
    "unitPieceYield": 1500,
    "doughExitTempTarget": "Ambient (< 4hr OPRP limit)",
    "ccp1LethalityTarget": "Toast bake CCP-2",
    "waterActivityLimit": "Dry Sugar Glaze",
    "ingredients": [
      {
        "code": "RM-SWT-002",
        "name": "Refined White Sugar",
        "pct": 50,
        "gramsPerBatch": 10000,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FAT-001",
        "name": "Buttercup Margarine / Butter",
        "pct": 35,
        "gramsPerBatch": 7000,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-DRY-003",
        "name": "Jersey Evaporada",
        "pct": 10,
        "gramsPerBatch": 2000,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FLV-004",
        "name": "Pure Ground Cinnamon Powder",
        "pct": 1,
        "gramsPerBatch": 200,
        "isWater": false,
        "isAsNeeded": false
      },
      {
        "code": "RM-FLV-002",
        "name": "Vanilla Flavor FF",
        "pct": 0.5,
        "gramsPerBatch": 100,
        "isWater": false,
        "isAsNeeded": false
      }
    ],
    "unitProductionCost": 120,
    "wholesaleTransferPrice": 180,
    "srp": 220,
    "grossMarginPct": 45.5
  }
];

export const OUTLETS = [
  {
    "id": "pan-de-verde",
    "name": "Pan de Verde Outlet",
    "location": "Purok 8, Communal, Davao City",
    "manager": "Jhoanna Tejano",
    "headBaker": "Feliciano T. Gomera",
    "contact": "+63 905-218-2190",
    "driver": "Othniel Tilan"
  },
  {
    "id": "laurice-delicacies",
    "name": "Laurice Delicacies Outlet",
    "location": "Lower Quary, Brgy 5-A, Bankerohan, Davao City",
    "manager": "Anecita S. Blase",
    "headBaker": "Raffy Boy P. Cortes",
    "contact": "+63 927-142-1510",
    "driver": "Roberto S. Blase"
  },
  {
    "id": "indangan-biscocho",
    "name": "Indangan - Biscocho Commercial Line",
    "location": "Indangan Plant (Biscocho Hall)",
    "manager": "Irene C. Capada",
    "headBaker": "Alwen Hermogeno",
    "contact": "Plant Ext 102",
    "driver": "Internal Floor Transfer"
  },
  {
    "id": "indangan-otap",
    "name": "Indangan - Otap Laminated Line",
    "location": "Indangan Plant (Otap Hall)",
    "manager": "Zillah F. Tilan",
    "headBaker": "Reymark V. Albia",
    "contact": "Plant Ext 104",
    "driver": "Internal Floor Transfer"
  }
];

export const SPECIALTY_RECIPES_STORAGE_KEY = 'JJB_WMS_LIVE_V4_6_SPECIALTY_RECIPES';

/**
 * Returns all active master recipes, dynamically incorporating any approved specialty recipes
 */
export function getAllMasterRecipes() {
  if (typeof window === "undefined" || !window.localStorage) {
    return MASTER_RECIPES;
  }
  try {
    const raw = window.localStorage.getItem(SPECIALTY_RECIPES_STORAGE_KEY);
    if (!raw) return MASTER_RECIPES;
    const proposals = JSON.parse(raw);
    const approved = (proposals || [])
      .filter(p => p.status === "APPROVED")
      .map(p => ({
        sku: p.sku,
        name: p.name,
        category: p.category || "Signature Pastry / Specialty",
        targetFacility: p.targetFacility || "Plant-Wide & Outlets",
        standardBatchFlourKg: p.standardBatchFlourKg || 3,
        unitPieceYield: p.unitPieceYield || 100,
        doughExitTempTarget: p.doughExitTempTarget || "26°C – 28°C",
        ccp1LethalityTarget: p.ccp1LethalityTarget || "> 95°C",
        waterActivityLimit: p.waterActivityLimit || "Moist Crumb",
        unitProductionCost: p.unitProductionCost || 2.5,
        wholesaleTransferPrice: p.wholesaleTransferPrice || 4.0,
        srp: p.srp || 6.0,
        grossMarginPct: p.grossMarginPct || 50.0,
        ingredients: p.ingredients || [],
        isCustomSpecialty: true
      }));

    // Avoid duplicates if already present
    const existingSkus = new Set(MASTER_RECIPES.map(r => r.sku));
    const uniqueApproved = approved.filter(a => !existingSkus.has(a.sku));
    return [...MASTER_RECIPES, ...uniqueApproved];
  } catch (err) {
    console.error("Error reading approved specialty recipes:", err);
    return MASTER_RECIPES;
  }
}
