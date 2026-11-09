import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  PackagePlus,
  PackageMinus,
  Scale,
  SlidersHorizontal,
  FileSpreadsheet,
  Clock,
  ShieldCheck,
  Wifi,
  WifiOff,
  Smartphone,
  Monitor,
  Upload,
  UserCheck,
  Store,
  ClipboardList,
  LogOut,
  Database,
  FlaskConical,
  Bell
} from 'lucide-react';

export const ROLES = [
  "Jade Q. Dela Cruz (Warehouse Supervisor)",
  "Romeo B. Malusay (Ingredient Batching Preparer)",
  "Mariejohn F. Tacuban (Inventory & Purchasing Manager)",
  "Grace P. Suico (FSCO & QA Director)",
  "Angelina P. Sun (Head of Admin / COA)",
  "Zaphyr Zur T. Pomicpic (Systems Director & Architect)"
];

export default function Header({
  currentRole,
  setCurrentRole,
  activeTab,
  setActiveTab,
  isMobileMode,
  setIsMobileMode,
  isOffline,
  setIsOffline,
  queueCount = 0,
  pendingBatchCount = 0,
  pendingBulkApprovalCount = 0,
  pendingRequestCount = 0,
  lowStockCount = 0,
  onQuickEod,
  onOpenImportModal,
  onOpenLoginModal,
  onLogout,
  onOpenAdminModal,
  isTestMode = false,
  setIsTestMode
}) {
  const [phtTime, setPhtTime] = useState('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const formatted = now.toLocaleString('en-PH', {
        timeZone: 'Asia/Manila',
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
      setPhtTime(formatted);
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  // Role permission gate: Only Zaphyr Zur T. Pomicpic (SYSTEMS_DIRECTOR)
  // and Angelina P. Sun (ADMIN_COA) have can_delete_test_data = 1
  const isAdminPrivilege =
    Boolean(currentRole) &&
    (currentRole.includes('Zaphyr') ||
      currentRole.includes('Angelina') ||
      currentRole.includes('Systems Director') ||
      currentRole.includes('COA'));

  // Combined issuance queue: Romeo's bulk requisitions + Jade's portal requests
  const issuanceQueueTotal = pendingBulkApprovalCount + pendingRequestCount;

  const navItems = [
    { id: 'dashboard', label: '1. Command Center', icon: LayoutDashboard, badge: lowStockCount > 0 ? lowStockCount : null, badgeColor: 'bg-red-600 text-white' },
    { id: 'portal', label: '2. Outlet & Line Portal', icon: Store, badge: 'KIOSK', badgeColor: 'bg-[#C8963E] text-[#240e32]' },
    { id: 'receiving', label: '3. Inbound Receiving', icon: PackagePlus },
    {
      id: 'issuance',
      label: '4. Stock Withdrawal',
      icon: PackageMinus,
      badge: issuanceQueueTotal > 0 ? issuanceQueueTotal : null,
      badgeColor: 'bg-amber-500 text-black animate-pulse'
    },
    { id: 'batching', label: '5. Romeo Batching', icon: Scale, badge: pendingBatchCount > 0 ? pendingBatchCount : null, badgeColor: 'bg-amber-500 text-black' },
    { id: 'orderHistory', label: '6. Requisition & Order Ledger', icon: ClipboardList },
    { id: 'adjustments', label: '7. Adjustments & NCR', icon: SlidersHorizontal },
    { id: 'reports', label: '8. Reports & POs', icon: FileSpreadsheet },
    { id: 'eod', label: '9. 23:45 EOD Dossier', icon: Clock },
    { id: 'audit', label: '10. Audit Trail', icon: ShieldCheck }
  ];

  const matchedRoleOption =
    ROLES.find((r) => r.startsWith(currentRole.split(' (')[0])) || ROLES[0];

  return (
    <header className="bg-[#240e32] text-white shadow-xl border-b-2 border-[#C8963E] sticky top-0 z-40">
      {/* Active Sandbox Mode Banner */}
      {isTestMode && (
        <div className="bg-amber-500 text-[#240e32] px-4 py-1 text-[11px] font-extrabold tracking-wide flex items-center justify-between border-b border-amber-300">
          <div className="flex items-center gap-2">
            <FlaskConical size={14} className="animate-bounce" />
            <span>
              SANDBOX / TRAINING MODE ACTIVE — All new transactions are tagged with{' '}
              <code className="bg-black/15 px-1 rounded">is_test_data = 1</code> and can be cleanly purged from the D1 Admin Panel.
            </span>
          </div>
          {isAdminPrivilege && setIsTestMode && (
            <button
              onClick={() => setIsTestMode(false)}
              className="bg-[#240e32] text-amber-300 hover:bg-black px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider transition"
            >
              Exit Sandbox Mode
            </button>
          )}
        </div>
      )}

      {/* Top Corporate Bar */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <img
            src="/jjb-logo-transaparent.png"
            alt="Jang-Jang Bakeshop Logo"
            className="h-11 w-11 object-contain rounded-xl bg-white/10 p-1 border border-[#C8963E]/50 shadow"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded bg-[#C8963E] text-[#240e32]">
                JJB-WMS v4.6
              </span>
              <span className="text-[11px] text-[#E5C585] font-semibold">
                Indangan Central Commissary · FDA LTO #3000013388488
              </span>
              {isTestMode && (
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-400 text-black border border-amber-200 flex items-center gap-1 shadow">
                  <FlaskConical size={11} /> SANDBOX (is_test_data=1)
                </span>
              )}
            </div>
            <h1 className="text-base md:text-lg font-extrabold tracking-tight text-white">
              Jang-Jang Bakeshop & Kingdom Confectionary — Warehouse Management System
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="hidden lg:flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg border border-white/15 text-[#E5C585] font-mono text-[11px]">
            <Clock size={13} />
            <span>{phtTime || 'PHT (UTC+8)'}</span>
          </div>

          {/* Notification Bell — action items count, click jumps to Stock Withdrawal tab */}
          {issuanceQueueTotal > 0 && (
            <button
              onClick={() => setActiveTab('issuance')}
              className="relative bg-amber-500 hover:bg-amber-400 text-black font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 border border-amber-300 shadow transition"
              title={`${issuanceQueueTotal} action item${issuanceQueueTotal !== 1 ? 's' : ''} pending issuance`}
            >
              <Bell size={14} className="animate-pulse" />
              <span className="text-[11px]">{issuanceQueueTotal}</span>
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-600 animate-ping" />
            </button>
          )}

          {isAdminPrivilege && (
            <div className="flex items-center gap-1.5 bg-[#38144c] px-2 py-1 rounded-xl border border-[#C8963E]/60 shadow-inner">
              {setIsTestMode && (
                <button
                  onClick={() => setIsTestMode(!isTestMode)}
                  className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 text-[11px] transition ${
                    isTestMode
                      ? 'bg-amber-400 text-black shadow'
                      : 'bg-white/10 text-amber-200 hover:bg-white/20'
                  }`}
                  title="Toggle Sandbox / Training Mode (tags new transactions with is_test_data = 1)"
                >
                  <FlaskConical size={13} />
                  <span>{isTestMode ? 'Sandbox: ON' : 'Sandbox'}</span>
                </button>
              )}

              {onOpenAdminModal && (
                <button
                  onClick={onOpenAdminModal}
                  className="px-2.5 py-1 rounded-lg font-bold bg-[#C8963E] hover:bg-[#d9a74a] text-[#240e32] flex items-center gap-1 text-[11px] shadow transition"
                  title="Open Cloudflare D1 24-Table Backend Admin Panel & Test Purge Engine"
                >
                  <Database size={13} />
                  <span>D1 Admin</span>
                </button>
              )}
            </div>
          )}

          {onOpenImportModal && (
            <button
              onClick={onOpenImportModal}
              className="bg-white/10 hover:bg-white/20 text-[#E5C585] border border-[#C8963E]/40 px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1 transition"
              title="Import Physical Inventory Count CSV Baseline"
            >
              <Upload size={13} />
              <span className="hidden sm:inline">CSV Baseline</span>
            </button>
          )}

          <button
            onClick={() => setIsMobileMode(!isMobileMode)}
            className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1 border transition ${
              isMobileMode
                ? 'bg-[#C8963E] text-[#240e32] border-[#E5C585]'
                : 'bg-white/10 text-gray-200 border-white/15 hover:bg-white/20'
            }`}
            title="Toggle Floor Tablet Kiosk Ergonomic Mode"
          >
            {isMobileMode ? <Smartphone size={14} /> : <Monitor size={14} />}
            <span className="hidden md:inline">{isMobileMode ? 'Tablet UI' : 'Desktop UI'}</span>
          </button>

          <button
            onClick={() => setIsOffline(!isOffline)}
            className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1 border transition ${
              isOffline
                ? 'bg-red-600/90 text-white border-red-400'
                : 'bg-emerald-700/80 text-emerald-100 border-emerald-500/50 hover:bg-emerald-700'
            }`}
            title="Toggle Offline Floor Cache Simulation"
          >
            {isOffline ? <WifiOff size={14} /> : <Wifi size={14} />}
            <span className="hidden sm:inline">
              {isOffline ? `Offline (${queueCount})` : 'Edge Online'}
            </span>
          </button>

          <select
            value={matchedRoleOption}
            onChange={(e) => {
              const cleanName = e.target.value.split(' (')[0];
              setCurrentRole(cleanName);
            }}
            aria-label="Active Operator Role"
            className="bg-[#180822] text-[#E5C585] border border-[#C8963E]/60 rounded-lg px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:border-[#C8963E] max-w-[210px] truncate"
          >
            {ROLES.map((role) => (
              <option key={role} value={role} className="bg-[#240e32] text-white">
                {role}
              </option>
            ))}
          </select>

          {onOpenLoginModal && (
            <button
              onClick={onOpenLoginModal}
              className="bg-[#C8963E]/20 hover:bg-[#C8963E]/30 text-[#E5C585] border border-[#C8963E] px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1 transition"
              title="Switch Authenticated Staff Account"
            >
              <UserCheck size={14} />
              <span>Auth</span>
            </button>
          )}

          {onLogout && (
            <button
              onClick={onLogout}
              className="bg-red-600/20 hover:bg-red-600 text-red-200 hover:text-white border border-red-500/40 p-1.5 rounded-lg transition"
              title="Lock Terminal Session"
            >
              <LogOut size={14} />
            </button>
          )}
        </div>
      </div>

      <nav className="bg-[#1a0924] border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 overflow-x-auto py-1.5 no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition shrink-0 ${
                  isActive
                    ? 'bg-[#C8963E] text-[#240e32] shadow-md'
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon size={14} />
                <span>{item.label}</span>
                {item.badge !== null && item.badge !== undefined && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                      item.badgeColor || 'bg-red-600 text-white'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </header>
  );
}