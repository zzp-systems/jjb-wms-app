import React, { useState, useEffect, useCallback } from 'react';
import {
  Database, Trash2, RefreshCw, ShieldAlert, CheckCircle2,
  Search, RotateCcw, FlaskConical, Lock, X, Layers, AlertTriangle, Eye
} from 'lucide-react';

const GROUP_LABELS = {
  A: 'Group A — Master & Reference',
  B: 'Group B — Transaction Headers',
  C: 'Group C — Line Items & Junctions',
  D: 'Group D — Audit & Sync Logs',
  E: 'Group E — System Config'
};

export default function AdminDatabaseModal({
  isOpen,
  onClose,
  authUser,
  isTestMode,
  setIsTestMode,
  onShowToast
}) {
  const [tablesSummary, setTablesSummary] = useState([]);
  const [totalTestRows, setTotalTestRows] = useState(0);
  const [unbalancedCount, setUnbalancedCount] = useState(0);
  const [syncErrorCount, setSyncErrorCount] = useState(0);

  const [selectedTable, setSelectedTable] = useState('withdrawals');
  const [tableMeta, setTableMeta] = useState({});
  const [rows, setRows] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'test' | 'prod'
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState('browser'); // 'browser' | 'audit'
  const [adminLogs, setAdminLogs] = useState([]);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [inspectRow, setInspectRow] = useState(null);

  // Purge confirmation modal state
  const [isPurgeConfirmOpen, setIsPurgeConfirmOpen] = useState(false);
  const [purgePassword, setPurgePassword] = useState('');
  const [purgeReason, setPurgeReason] = useState('Routine cleanup of floor training / sandbox entries');
  const [purging, setPurging] = useState(false);

  const adminId = authUser?.id || authUser?.username || 'zaphyr';

  const adminFetch = useCallback(async (path, options = {}) => {
    const res = await fetch(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-JJB-Admin-User': adminId,
        ...(options.headers || {})
      }
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    return data;
  }, [adminId]);

  const loadTablesOverview = useCallback(async () => {
    try {
      const data = await adminFetch('/api/admin/tables');
      setTablesSummary(data.tables || []);
      setTotalTestRows(data.total_test_rows || 0);
      setUnbalancedCount(data.unbalanced_materials_count || 0);
      setSyncErrorCount(data.sync_projection_errors_count || 0);
    } catch (err) {
      setErrorMsg(err.message);
    }
  }, [adminFetch]);

  const loadSelectedTable = useCallback(async () => {
    if (!selectedTable) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const params = new URLSearchParams({
        filter: filterMode,
        limit: '100',
        offset: '0'
      });
      if (searchQuery.trim()) params.set('q', searchQuery.trim());

      const data = await adminFetch(`/api/admin/${selectedTable}?${params.toString()}`);
      setRows(data.rows || []);
      setTotalRows(data.total || 0);
      setTableMeta(data.meta || {});
    } catch (err) {
      setErrorMsg(err.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [adminFetch, selectedTable, filterMode, searchQuery]);

  const loadAdminAuditLogs = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await adminFetch('/api/admin/audit?limit=100');
      setAdminLogs(data.logs || []);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }, [adminFetch]);

  useEffect(() => {
    if (!isOpen) return;
    loadTablesOverview();
    if (activeView === 'browser') {
      loadSelectedTable();
    } else {
      loadAdminAuditLogs();
    }
  }, [isOpen, activeView, loadTablesOverview, loadSelectedTable, loadAdminAuditLogs]);

  if (!isOpen) return null;

  const handleDeleteRow = async (row) => {
    const pkCol = tableMeta.pk || 'id';
    const recordId = row[pkCol];
    if (recordId === undefined || recordId === null) return;

    if (!window.confirm(`Delete record "${recordId}" from ${selectedTable}? A full JSON snapshot will be saved in admin_action_log for undo/restore.`)) {
      return;
    }

    try {
      await adminFetch(`/api/admin/${selectedTable}/${encodeURIComponent(recordId)}`, {
        method: 'DELETE',
        body: JSON.stringify({
          reason: `Deleted via Admin Panel by ${authUser?.name || adminId}`
        })
      });
      if (onShowToast) onShowToast(`Deleted ${recordId} from ${selectedTable} (Snapshot saved)`);
      loadTablesOverview();
      loadSelectedTable();
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleToggleTestFlag = async (row) => {
    const pkCol = tableMeta.pk || 'id';
    const recordId = row[pkCol];
    const nextFlag = Number(row.is_test_data) === 1 ? 0 : 1;

    try {
      await adminFetch('/api/admin/toggle-test-flag', {
        method: 'POST',
        body: JSON.stringify({
          table: selectedTable,
          id: recordId,
          isTestData: nextFlag === 1
        })
      });
      if (onShowToast) {
        onShowToast(`Marked ${recordId} as ${nextFlag === 1 ? 'TEST DATA (1)' : 'PRODUCTION (0)'}`);
      }
      loadTablesOverview();
      loadSelectedTable();
    } catch (err) {
      alert(`Failed to toggle test flag: ${err.message}`);
    }
  };

  const handleRestoreAction = async (actionId) => {
    try {
      const res = await adminFetch(`/api/admin/restore/${actionId}`, {
        method: 'POST'
      });
      if (onShowToast) {
        onShowToast(`Restored ${res.restored?.record_id} into ${res.restored?.table}!`);
      }
      loadTablesOverview();
      loadAdminAuditLogs();
    } catch (err) {
      alert(`Restore failed: ${err.message}`);
    }
  };

  const handleExecutePurge = async (e) => {
    e.preventDefault();
    if (!purgePassword.trim()) return;
    setPurging(true);
    try {
      const res = await adminFetch('/api/admin/purge-test-data', {
        method: 'POST',
        body: JSON.stringify({
          password: purgePassword,
          reason: purgeReason
        })
      });
      setPurgePassword('');
      setIsPurgeConfirmOpen(false);
      if (onShowToast) {
        onShowToast(`Purged ${res.total_rows_purged} test records & reconciled material balances!`);
      }
      loadTablesOverview();
      loadSelectedTable();
    } catch (err) {
      alert(`Purge aborted: ${err.message}`);
    } finally {
      setPurging(false);
    }
  };

  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 md:p-6">
      <div className="bg-[#FAF6EE] text-[#2A1B2E] w-full max-w-7xl h-[92vh] rounded-2xl shadow-2xl border-2 border-[#C8963E] flex flex-col overflow-hidden">
        
        {/* Top Executive Bar */}
        <div className="bg-[#240e32] text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-[#C8963E]/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#C8963E]/20 border border-[#C8963E]">
              <Database size={20} className="text-[#E5C585]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base tracking-wide text-white">
                  Cloudflare D1 Backend Admin Panel (24-Table Catalog)
                </h2>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-600/30 text-emerald-300 border border-emerald-500/40">
                  jjb-wms-db
                </span>
              </div>
              <p className="text-[11px] text-gray-300">
                Authenticated as <strong className="text-[#E5C585]">{authUser?.name}</strong> ({authUser?.roleCategory || 'SYSTEMS_DIRECTOR'})
              </p>
            </div>
          </div>

          {/* Right Controls: Sandbox Mode Toggle, Purge Trigger, Close */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsTestMode(!isTestMode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition ${
                isTestMode
                  ? 'bg-amber-500 text-black border-amber-300 shadow-lg'
                  : 'bg-white/10 text-gray-200 border-white/20 hover:bg-white/20'
              }`}
              title="When active, new transactions created in the floor app are tagged with is_test_data = 1"
            >
              <FlaskConical size={14} />
              {isTestMode ? 'SANDBOX MODE: ON (is_test_data=1)' : 'Sandbox Mode: OFF'}
            </button>

            <button
              onClick={() => setIsPurgeConfirmOpen(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-700 text-white flex items-center gap-1.5 shadow border border-red-400"
            >
              <Trash2 size={14} />
              Purge Test Data ({totalTestRows})
            </button>

            <button
              onClick={() => {
                loadTablesOverview();
                activeView === 'browser' ? loadSelectedTable() : loadAdminAuditLogs();
              }}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white"
              title="Refresh D1 state"
            >
              <RefreshCw size={15} />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-white/10 hover:bg-red-600/80 text-white"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Status Strip */}
        <div className="bg-[#2A1B2E] text-xs text-gray-200 px-5 py-2 flex flex-wrap items-center justify-between gap-2 border-b border-[#C8963E]/20">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveView('browser')}
              className={`px-3 py-1 rounded-md font-bold flex items-center gap-1.5 ${
                activeView === 'browser' ? 'bg-[#C8963E] text-[#240e32]' : 'hover:bg-white/10'
              }`}
            >
              <Layers size={14} /> 24-Table Explorer
            </button>
            <button
              onClick={() => setActiveView('audit')}
              className={`px-3 py-1 rounded-md font-bold flex items-center gap-1.5 ${
                activeView === 'audit' ? 'bg-[#C8963E] text-[#240e32]' : 'hover:bg-white/10'
              }`}
            >
              <RotateCcw size={14} /> Admin Action & Restore Log
            </button>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1">
              {unbalancedCount === 0 ? (
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 size={13} /> Book vs. FEFO Lots Reconciled (0 variance)
                </span>
              ) : (
                <span className="text-amber-400 font-semibold flex items-center gap-1">
                  <AlertTriangle size={13} /> {unbalancedCount} materials have book/lot variance
                </span>
              )}
            </span>
            <span className="text-gray-400">|</span>
            <span>
              Sync Projection Errors:{' '}
              <strong className={syncErrorCount > 0 ? 'text-red-400' : 'text-emerald-400'}>
                {syncErrorCount}
              </strong>
            </span>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-red-100 border-b border-red-300 text-red-800 px-5 py-2 text-xs font-semibold flex items-center justify-between">
            <span>⚠️ {errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="underline">Dismiss</button>
          </div>
        )}

        {/* Main Body */}
        {activeView === 'browser' ? (
          <div className="flex-1 flex overflow-hidden">
            {/* Left Sidebar: 24 Tables by Group */}
            <aside className="w-72 bg-white border-r border-gray-200 overflow-y-auto p-3 space-y-4">
              {['A', 'B', 'C', 'D', 'E'].map((grp) => {
                const groupTables = tablesSummary.filter((t) => t.group === grp);
                if (groupTables.length === 0) return null;
                return (
                  <div key={grp}>
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500 px-2 mb-1">
                      {GROUP_LABELS[grp]}
                    </div>
                    <div className="space-y-0.5">
                      {groupTables.map((t) => {
                        const isSelected = selectedTable === t.table_name;
                        return (
                          <button
                            key={t.table_name}
                            onClick={() => setSelectedTable(t.table_name)}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition ${
                              isSelected
                                ? 'bg-[#240e32] text-white font-bold shadow'
                                : 'hover:bg-gray-100 text-gray-800'
                            }`}
                          >
                            <span className="truncate font-mono text-[11px]">{t.table_name}</span>
                            <span className="flex items-center gap-1 shrink-0">
                              {t.test_rows > 0 && (
                                <span
                                  className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500 text-black"
                                  title={`${t.test_rows} test rows`}
                                >
                                  {t.test_rows}T
                                </span>
                              )}
                              <span
                                className={`px-1.5 py-0.2 rounded text-[10px] ${
                                  isSelected ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                                }`}
                              >
                                {t.total_rows}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </aside>

            {/* Right Data Grid */}
            <section className="flex-1 flex flex-col overflow-hidden bg-[#FAF6EE]">
              {/* Table Controls */}
              <div className="p-3 bg-white border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm text-[#240e32]">
                    {selectedTable}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({totalRows} rows · PK: <code>{tableMeta.pk || 'id'}</code>)
                  </span>
                  {tableMeta.immutable && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-gray-200 text-gray-700 font-bold">
                      IMMUTABLE
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {tableMeta.hasTestFlag && (
                    <div className="flex rounded-lg border border-gray-300 overflow-hidden text-xs">
                      {[
                        { id: 'all', label: 'All' },
                        { id: 'test', label: 'Test Only (1)' },
                        { id: 'prod', label: 'Prod Only (0)' }
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setFilterMode(tab.id)}
                          className={`px-2.5 py-1 font-semibold ${
                            filterMode === tab.id
                              ? 'bg-[#240e32] text-white'
                              : 'bg-white text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-2 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search PK or name..."
                      className="pl-7 pr-3 py-1 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-[#C8963E]"
                    />
                  </div>
                </div>
              </div>

              {/* Rows Table */}
              <div className="flex-1 overflow-auto p-3">
                {loading ? (
                  <div className="text-center py-12 text-xs text-gray-500">
                    Loading {selectedTable} from Cloudflare D1...
                  </div>
                ) : rows.length === 0 ? (
                  <div className="text-center py-12 text-xs text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
                    No rows match the current filter in <strong>{selectedTable}</strong>.
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-gray-100 border-b border-gray-200 text-[11px] font-bold text-gray-700 uppercase">
                          <th className="py-2 px-3 sticky left-0 bg-gray-100 z-10">Actions</th>
                          {columns.map((col) => (
                            <th key={col} className="py-2 px-3 whitespace-nowrap font-mono">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {rows.map((r, idx) => {
                          const isTest = Number(r.is_test_data) === 1;
                          return (
                            <tr
                              key={idx}
                              className={`hover:bg-amber-50/50 ${
                                isTest ? 'bg-amber-50/80' : ''
                              }`}
                            >
                              <td className="py-1.5 px-3 whitespace-nowrap sticky left-0 bg-white/95 z-10 border-r border-gray-100">
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => setInspectRow(r)}
                                    className="p-1 rounded hover:bg-gray-200 text-gray-700"
                                    title="Inspect full row JSON"
                                  >
                                    <Eye size={13} />
                                  </button>
                                  {tableMeta.hasTestFlag && (
                                    <button
                                      onClick={() => handleToggleTestFlag(r)}
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                        isTest
                                          ? 'bg-amber-400 text-black border-amber-500'
                                          : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-amber-100'
                                      }`}
                                      title="Toggle is_test_data flag (1 = Test, 0 = Prod)"
                                    >
                                      {isTest ? 'TEST' : 'PROD'}
                                    </button>
                                  )}
                                  {!tableMeta.immutable && (
                                    <button
                                      onClick={() => handleDeleteRow(r)}
                                      className="p-1 rounded hover:bg-red-100 text-red-600"
                                      title="Delete row (saves undo snapshot)"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  )}
                                </div>
                              </td>
                              {columns.map((col) => {
                                const val = r[col];
                                const display =
                                  val === null || val === undefined
                                    ? '—'
                                    : typeof val === 'string' && val.length > 55
                                    ? `${val.slice(0, 55)}…`
                                    : String(val);
                                return (
                                  <td key={col} className="py-1.5 px-3 whitespace-nowrap font-mono text-[11px]">
                                    {display}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          </div>
        ) : (
          /* Admin Action & Undo Log View */
          <div className="flex-1 overflow-auto p-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-200 text-[11px] font-bold text-gray-700 uppercase">
                    <th className="py-2.5 px-3">ID</th>
                    <th className="py-2.5 px-3">UTC Timestamp</th>
                    <th className="py-2.5 px-3">Admin</th>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3">Table</th>
                    <th className="py-2.5 px-3">Record ID</th>
                    <th className="py-2.5 px-3">Reason</th>
                    <th className="py-2.5 px-3">Undo / Restore</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {adminLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="py-2 px-3 font-mono">#{log.id}</td>
                      <td className="py-2 px-3 font-mono text-[11px]">{log.created_at}</td>
                      <td className="py-2 px-3 font-semibold">{log.admin_user_id}</td>
                      <td className="py-2 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-900">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-mono">{log.table_name}</td>
                      <td className="py-2 px-3 font-mono">{log.record_id}</td>
                      <td className="py-2 px-3 text-gray-600">{log.reason}</td>
                      <td className="py-2 px-3">
                        {log.action === 'DELETE_ROW' && (
                          <button
                            onClick={() => handleRestoreAction(log.id)}
                            className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1"
                          >
                            <RotateCcw size={12} /> Restore Row
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Row JSON Inspector Modal */}
        {inspectRow && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full p-4 shadow-2xl border border-gray-300">
              <div className="flex items-center justify-between border-b pb-2 mb-3">
                <h3 className="font-bold text-sm">Row JSON Inspector ({selectedTable})</h3>
                <button onClick={() => setInspectRow(null)} className="text-gray-500 hover:text-black font-bold">✕</button>
              </div>
              <pre className="bg-gray-900 text-emerald-300 p-3 rounded-lg text-xs overflow-auto max-h-96 font-mono">
                {JSON.stringify(inspectRow, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Password-Gated Bulk Test Purge Modal */}
        {isPurgeConfirmOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
            <form
              onSubmit={handleExecutePurge}
              className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border-2 border-red-600 space-y-4"
            >
              <div className="flex items-center gap-2.5 text-red-700">
                <ShieldAlert size={24} />
                <h3 className="font-extrabold text-base">Confirm 18-Step Test Data Purge</h3>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                This will execute the FK-safe 18-step child-first delete across all operational tables where{' '}
                <code className="bg-amber-100 px-1 rounded font-bold">is_test_data = 1</code> ({totalTestRows} rows currently flagged) and automatically recalculate{' '}
                <code>materials.current_balance</code> from surviving production lots.
              </p>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Audit Reason
                </label>
                <input
                  type="text"
                  value={purgeReason}
                  onChange={(e) => setPurgeReason(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                  <Lock size={12} /> Re-enter Admin Password or 4-Digit Shift PIN
                </label>
                <input
                  type="password"
                  value={purgePassword}
                  onChange={(e) => setPurgePassword(e.target.value)}
                  placeholder="Enter password (e.g. SystemDir2026) or PIN"
                  required
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPurgeConfirmOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={purging}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow"
                >
                  {purging ? 'Purging & Reconciling...' : 'Confirm & Purge Test Data'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}