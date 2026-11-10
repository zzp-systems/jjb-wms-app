import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, PackagePlus, PackageMinus, Scale, SlidersHorizontal,
  FileSpreadsheet, Clock, ShieldCheck, Wifi, WifiOff, Smartphone, Monitor,
  Upload, UserCheck, Store, ClipboardList, LogOut, Database, FlaskConical,
  Palette, PanelLeft, Activity, Menu, X
} from 'lucide-react';

export const ROLES = [
  "Jade Q. Dela Cruz (Warehouse Supervisor)",
  "Romeo B. Malusay (Ingredient Batching Preparer)",
  "Mariejohn F. Tacuban (Inventory & Purchasing Manager)",
  "Grace P. Suico (FSCO & QA Director)",
  "Angelina P. Sun (Head of Admin / COA)",
  "Zaphyr Zur T. Pomicpic (Systems Director & Architect)"
];

export const THEMES = [
  { id: 'jjb-gold', name: 'JJB Royal Gold', headerBg: 'bg-[#240e32]', accentBg: 'bg-[#C8963E]', accentText: 'text-[#E5C585]' },
  { id: 'athena-teal', name: 'Athena Executive', headerBg: 'bg-[#1a202c]', accentBg: 'bg-[#004d40]', accentText: 'text-[#FFD700]' },
  { id: 'forgie-exec', name: 'Forgie Corporate', headerBg: 'bg-[#001f3f]', accentBg: 'bg-[#0074d9]', accentText: 'text-[#87ceeb]' },
  { id: 'forgie-dark', name: 'Forgie Cyber Slate', headerBg: 'bg-[#0a192f]', accentBg: 'bg-[#0ea5e9]', accentText: 'text-[#64ffda]' }
];

export const NAV_CATEGORIES = [
  {
    group: 'Floor & Kiosk Intake',
    items: [
      { id: 'dashboard', label: 'Command Center', icon: LayoutDashboard, badgeKey: 'lowStock' },
      { id: 'portal', label: 'Outlet & Line Kiosk', icon: Store, staticBadge: 'KIOSK' }
    ]
  },
  {
    group: 'Warehouse & Batching',
    items: [
      { id: 'receiving', label: 'Inbound Receiving', icon: PackagePlus },
      { id: 'issuance', label: 'Stock Withdrawal', icon: PackageMinus, badgeKey: 'issuance' },
      { id: 'batching', label: 'Romeo Batching', icon: Scale, badgeKey: 'batching' },
      { id: 'adjustments', label: 'Adjustments & NCR', icon: SlidersHorizontal }
    ]
  },
  {
    group: 'Ledgers & Compliance',
    items: [
      { id: 'orderHistory', label: 'Active Queue Ledger', icon: ClipboardList },
      { id: 'reports', label: 'Reports & POs', icon: FileSpreadsheet },
      { id: 'eod', label: '23:45 EOD Dossier', icon: Clock },
      { id: 'audit', label: 'Immutable Audit Trail', icon: ShieldCheck }
    ]
  }
];

// ---------------------------------------------------------------------------
// Helper: shared badge resolver (used by both Header topbar + SidebarNavigation)
// ---------------------------------------------------------------------------
const resolveBadge = (item, { lowStockCount, pendingBatchCount, pendingBulkApprovalCount }) => {
  if (item.staticBadge) return item.staticBadge;
  if (item.badgeKey === 'lowStock' && lowStockCount > 0) return lowStockCount;
  if (item.badgeKey === 'issuance' && pendingBulkApprovalCount > 0) return pendingBulkApprovalCount;
  if (item.badgeKey === 'batching' && pendingBatchCount > 0) return pendingBatchCount;
  return null;
};

// ===========================================================================
// Default export — Top Header Bar (includes top-nav when navLayout === 'topbar')
// ===========================================================================
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
  lowStockCount = 0,
  onOpenImportModal,
  onOpenLoginModal,
  onLogout,
  onOpenAdminModal,
  isTestMode = false,
  setIsTestMode,
  themeId = 'jjb-gold',
  setThemeId,
  navLayout = 'sidebar',
  setNavLayout,
  isActivityFeedOpen = true,
  setIsActivityFeedOpen
}) {
  const [phtTime, setPhtTime] = useState('');

  useEffect(() => {
    const updateClock = () => {
      setPhtTime(
        new Date().toLocaleString('en-PH', {
          timeZone: 'Asia/Manila',
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        })
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  const isAdminPrivilege =
    Boolean(currentRole) &&
    (currentRole.includes('Zaphyr') ||
      currentRole.includes('Angelina') ||
      currentRole.includes('Systems Director') ||
      currentRole.includes('COA'));

  const activeTheme = THEMES.find((t) => t.id === themeId) || THEMES[0];
  const matchedRoleOption =
    ROLES.find((r) => r.startsWith(currentRole.split(' (')[0])) || ROLES[0];

  const badgeCtx = { lowStockCount, pendingBatchCount, pendingBulkApprovalCount };

  return (
    <header className={`${activeTheme.headerBg} text-white shadow-xl border-b-2 border-[#C8963E] sticky top-0 z-40 transition-colors duration-300`}>
      {isTestMode && (
        <div className="bg-amber-500 text-[#240e32] px-4 py-1 text-[11px] font-extrabold flex items-center justify-between border-b border-amber-300">
          <div className="flex items-center gap-2">
            <FlaskConical size={14} className="animate-bounce" />
            <span>
              SANDBOX MODE ACTIVE — New entries are tagged <code className="bg-black/15 px-1 rounded">is_test_data = 1</code> for 1-click purge.
            </span>
          </div>
          {isAdminPrivilege && setIsTestMode && (
            <button
              onClick={() => setIsTestMode(false)}
              className="bg-[#240e32] text-amber-300 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase"
            >
              Exit Sandbox
            </button>
          )}
        </div>
      )}

      <div className="max-w-[1600px] mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {setNavLayout && (
            <button
              onClick={() => setNavLayout(navLayout === 'sidebar' ? 'topbar' : 'sidebar')}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-[#E5C585] transition"
              title="Switch between Left Submenu Dock and Top Horizontal Bar"
            >
              <PanelLeft size={18} />
            </button>
          )}
          <img
            src="/jjb-logo-transaparent.png"
            alt="JJB Logo"
            className="h-10 w-10 object-contain rounded-xl bg-white/10 p-1 border border-[#C8963E]/50"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded bg-[#C8963E] text-[#240e32]">
                JJB-WMS v4.6
              </span>
              <span className={`text-[11px] font-semibold ${activeTheme.accentText}`}>
                Indangan Central Commissary · LTO #3000013388488
              </span>
            </div>
            <h1 className="text-sm md:text-base font-extrabold tracking-tight text-white">
              Jang-Jang Bakeshop & Kingdom Confectionary — Operations Command
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="hidden xl:flex items-center gap-1.5 bg-white/10 px-2.5 py-1.5 rounded-lg border border-white/15 text-[#E5C585] font-mono text-[11px]">
            <Clock size={13} />
            <span>{phtTime || 'PHT'}</span>
          </div>

          {setThemeId && (
            <div className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-lg border border-white/15">
              <Palette size={13} className="text-[#E5C585]" />
              <select
                value={themeId}
                onChange={(e) => setThemeId(e.target.value)}
                aria-label="Select UI Theme"
                className="bg-transparent text-white text-[11px] font-bold focus:outline-none cursor-pointer"
              >
                {THEMES.map((t) => (
                  <option key={t.id} value={t.id} className="bg-[#1a202c] text-white">
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {isAdminPrivilege && (
            <div className="flex items-center gap-1.5 bg-black/25 px-2 py-1 rounded-xl border border-[#C8963E]/60">
              {setIsTestMode && (
                <button
                  onClick={() => setIsTestMode(!isTestMode)}
                  className={`px-2 py-1 rounded-lg font-bold flex items-center gap-1 text-[11px] transition ${
                    isTestMode ? 'bg-amber-400 text-black' : 'bg-white/10 text-amber-200 hover:bg-white/20'
                  }`}
                >
                  <FlaskConical size={12} />
                  <span>{isTestMode ? 'Sandbox: ON' : 'Sandbox'}</span>
                </button>
              )}
              {onOpenAdminModal && (
                <button
                  onClick={onOpenAdminModal}
                  className="px-2.5 py-1 rounded-lg font-bold bg-[#C8963E] hover:bg-[#d9a74a] text-[#240e32] flex items-center gap-1 text-[11px] shadow"
                >
                  <Database size={12} />
                  <span>D1 Admin</span>
                </button>
              )}
            </div>
          )}

          {onOpenImportModal && (
            <button
              onClick={onOpenImportModal}
              className="bg-white/10 hover:bg-white/20 text-[#E5C585] border border-[#C8963E]/40 px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1"
            >
              <Upload size={13} />
              <span className="hidden sm:inline">CSV Baseline</span>
            </button>
          )}

          <button
            onClick={() => setIsMobileMode(!isMobileMode)}
            className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1 border ${
              isMobileMode ? 'bg-[#C8963E] text-[#240e32]' : 'bg-white/10 text-gray-200 border-white/15'
            }`}
          >
            {isMobileMode ? <Smartphone size={13} /> : <Monitor size={13} />}
            <span className="hidden md:inline">{isMobileMode ? 'Kiosk UI' : 'Desktop'}</span>
          </button>

          <button
            onClick={() => setIsOffline(!isOffline)}
            className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1 border ${
              isOffline ? 'bg-red-600 text-white border-red-400' : 'bg-emerald-700/80 text-emerald-100 border-emerald-500/50'
            }`}
          >
            {isOffline ? <WifiOff size={13} /> : <Wifi size={13} />}
            <span className="hidden sm:inline">{isOffline ? 'Offline' : 'D1 Live'}</span>
          </button>

          {setIsActivityFeedOpen && (
            <button
              onClick={() => setIsActivityFeedOpen(!isActivityFeedOpen)}
              className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1 border transition ${
                isActivityFeedOpen
                  ? 'bg-[#C8963E] text-[#240e32] border-[#E5C585]'
                  : 'bg-white/10 text-gray-200 border-white/15 hover:bg-white/20'
              }`}
              title="Toggle Right-Hand Live Activity & Queue Dock"
            >
              <Activity size={13} />
              <span className="hidden lg:inline">Live Dock</span>
              {queueCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-600 text-white font-extrabold">
                  {queueCount}
                </span>
              )}
            </button>
          )}

          <select
            value={matchedRoleOption}
            onChange={(e) => setCurrentRole(e.target.value.split(' (')[0])}
            className="bg-black/40 text-[#E5C585] border border-[#C8963E]/60 rounded-lg px-2 py-1.5 text-xs font-bold max-w-[190px] truncate"
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
              className="bg-[#C8963E]/20 hover:bg-[#C8963E]/30 text-[#E5C585] border border-[#C8963E] px-2 py-1.5 rounded-lg font-bold flex items-center gap-1"
            >
              <UserCheck size={13} />
              <span>Auth</span>
            </button>
          )}

          {onLogout && (
            <button
              onClick={onLogout}
              className="bg-red-600/20 hover:bg-red-600 text-red-200 hover:text-white border border-red-500/40 p-1.5 rounded-lg"
              title="Lock Session"
            >
              <LogOut size={14} />
            </button>
          )}
        </div>
      </div>

      {navLayout === 'topbar' && (
        <nav className="bg-black/30 border-t border-white/10">
          <div className="max-w-[1600px] mx-auto px-4 flex items-center gap-1 overflow-x-auto py-1.5 no-scrollbar">
            {NAV_CATEGORIES.flatMap((g) => g.items).map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const badgeVal = resolveBadge(item, badgeCtx);
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
                  {badgeVal !== null && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-amber-500 text-black">
                      {badgeVal}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </header>
  );
}

// ===========================================================================
// Named export — SidebarNavigation (rendered by App.jsx inside a flex-row)
// ===========================================================================
export function SidebarNavigation({
  activeTab,
  setActiveTab,
  lowStockCount = 0,
  pendingBatchCount = 0,
  pendingBulkApprovalCount = 0
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const badgeCtx = { lowStockCount, pendingBatchCount, pendingBulkApprovalCount };

  return (
    <aside
      className={`hidden md:flex flex-col ${sidebarCollapsed ? 'w-16' : 'w-56'} bg-[#240e32] text-white border-r border-[#C8963E]/30 transition-all duration-300 shrink-0 h-full`}
    >
      <div className="p-2 border-b border-white/10 flex justify-end">
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[#E5C585]"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <Menu size={16} /> : <X size={16} />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-4">
        {NAV_CATEGORIES.map((group) => (
          <div key={group.group}>
            {!sidebarCollapsed && (
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#E5C585]/70 px-2 mb-1">
                {group.group}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                const badgeVal = resolveBadge(item, badgeCtx);
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-xs font-bold transition text-left ${
                      isActive
                        ? 'bg-[#C8963E] text-[#240e32] shadow'
                        : 'text-gray-300 hover:bg-white/10 hover:text-white'
                    }`}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <Icon size={16} className="shrink-0" />
                    {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                    {badgeVal !== null && !sidebarCollapsed && (
                      <span className="ml-auto px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-amber-500 text-black">
                        {badgeVal}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}