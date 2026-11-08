// Authenticated Staff Register for JJB Warehouse & Kitting OS
// Indangan Plant FDA LTO No. 3000013388488 & Sasa Plant LTO No. 3000002291335

export const AUTH_USERS = [
  {
    id: "jade",
    username: "jadedelacruz",
    password: "WhouseSup2026",
    name: "Jade Q. Dela Cruz",
    title: "Warehouse Supervisor",
    station: "Receiving Dock & Bodega Storage",
    roleCategory: "WAREHOUSE_SUPERVISOR",
    avatarBg: "bg-[#1E7A3E]",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300",
    description: "Inbound receiving, quality inspection, raw material lot allocation, and stock withdrawal issuances."
  },
  {
    id: "romeo",
    username: "romeomalusay",
    password: "BatchPrep2026",
    name: "Romeo B. Malusay",
    title: "Ingredient Batching Preparer",
    station: "Dry Room 2 & Batching Workbench",
    roleCategory: "BATCHING_PREPARER",
    avatarBg: "bg-[#C8963E]",
    badgeColor: "bg-amber-100 text-amber-900 border-amber-300",
    description: "Outlet recipe kitting, precision ingredient scaling, micro-dosing, and batch mix release."
  },
  {
    id: "mariejohn",
    username: "marietacuban",
    password: "PurchMan2026",
    name: "Mariejohn F. Tacuban",
    title: "Inventory & Purchasing Manager",
    station: "Admin & PO Reconciliation",
    roleCategory: "PURCHASING_MANAGER",
    avatarBg: "bg-[#5B2E7A]",
    badgeColor: "bg-purple-100 text-purple-900 border-purple-300",
    description: "Perpetual stock levels, supplier purchase orders, low-stock reorder suggestions, and EOD dispatch."
  },
  {
    id: "grace",
    username: "gracesuico",
    password: "QAControl2026",
    name: "Grace P. Suico",
    title: "FSCO & QA Control Director",
    station: "QA Bench & Quarantine Control",
    roleCategory: "QA_DIRECTOR",
    avatarBg: "bg-[#C0392B]",
    badgeColor: "bg-red-100 text-red-900 border-red-300",
    description: "cGMP compliance, non-conformance quarantine governance, sensory evaluation, and CCP verification."
  },
  {
    id: "angelina",
    username: "angelinasun",
    password: "Admin2026",
    name: "Angelina P. Sun",
    title: "Head of Administration / COA",
    station: "Executive Office",
    roleCategory: "ADMIN_COA",
    avatarBg: "bg-[#3D1C52]",
    badgeColor: "bg-indigo-100 text-indigo-900 border-indigo-300",
    description: "Executive oversight, financial authorization of purchase commitments, and compliance ratification."
  },
  {
    id: "zaphyr",
    username: "zaphyrpomicpic",
    password: "SystemDir2026",
    name: "Zaphyr Zur T. Pomicpic",
    title: "Systems Director & Architect",
    station: "Executive & Systems Engineering",
    roleCategory: "SYSTEMS_DIRECTOR",
    avatarBg: "bg-[#0B3C5D]",
    badgeColor: "bg-sky-100 text-sky-900 border-sky-300",
    description: "WMS infrastructure engineering, Cloudflare edge persistence, master recipe formulations, and D1 sync."
  }
];

export function authenticateUser(username, password) {
  if (!username || !password) return null;
  const cleanU = username.trim().toLowerCase();
  const cleanP = password.trim();
  const user = AUTH_USERS.find(u => u.username.toLowerCase() === cleanU && u.password === cleanP);
  return user || null;
}
