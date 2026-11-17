// ============================================================================
// FILE: src/App.jsx
// ============================================================================
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Header, { SidebarNavigation } from './components/Header';
import ExecutiveDashboard from './components/ExecutiveDashboard';
import ReceivingModule from './components/ReceivingModule';
import IssuanceModule from './components/IssuanceModule';
import BatchingWorkbench from './components/BatchingWorkbench';
import AdjustmentsModule from './components/AdjustmentsModule';
import ReportsModule from './components/ReportsModule';
import EodReportModule from './components/EodReportModule';
import AuditTrailModule from './components/AuditTrailModule';
import OrderHistory from './components/OrderHistory';
import InitialDataImportModal from './components/InitialDataImportModal';
import LoginModal from './components/LoginModal';
import OutletRequisitionPortal from './components/OutletRequisitionPortal';
import AdminDatabaseModal from './components/AdminDatabaseModal';
import Customers from './components/Customers';
import FinishedGoodsModule from './components/FinishedGoodsModule';

import { MASTER_MATERIALS, STORAGE_ROOMS } from './data/materialsData';
import { MASTER_RECIPES, OUTLETS, getAllMasterRecipes } from './data/recipesData';
import { AUTH_USERS } from './data/authUsers';
import {
  INITIAL_RECEIVING_REPORTS,
  INITIAL_WITHDRAWALS,
  INITIAL_BATCHING_ORDERS,
  INITIAL_ADJUSTMENTS,
  INITIAL_QUARANTINE,
  INITIAL_AUDIT_LOGS
} from './data/initialData';
import { deductFefoLots, calculateRecipeIngredients } from './utils/wmsLogic';
import {
  enqueueEvent,
  getPendingEvents,
  getRetryableEvents,
  updateEventStatus,
  clearSyncedEvents,
  getDeadEvents,
  reviveEvent,
  discardEvent
} from './utils/offlineDb';
import { CheckCircle2, Bell, AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

export const STORAGE_KEY = 'JJB_WMS_LIVE_V4_6_STATE';
export const UI_PREF_KEY = 'JJB_WMS_UI_PREFS';
export const WORKER_SYNC_URL = '/api/sync';
export const GAS_WEB_APP_URL = '[suspicious link removed]';

// Polling cadence (3s = near real-time, reasonable D1 cost)
export const POLL_INTERVAL_MS = 3000;

// BroadcastChannel for instant cross-tab sync without waiting for poller
let syncChannel = null;
try {
  if (typeof BroadcastChannel !== 'undefined') {
    syncChannel = new BroadcastChannel('jjb_wms_cross_tab');
  }
} catch {
  // BroadcastChannel unavailable
}

function broadcastCrossTab(entityType, origin = 'Main WMS') {
  try {
    if (syncChannel) {
      syncChannel.postMessage({ type: 'DATA_CHANGED', entityType, origin, ts: Date.now() });
    }
    // Touch an invisible localStorage key to wake up storage listeners in other tabs
    localStorage.setItem(`${STORAGE_KEY}_bc_touch`, String(Date.now()));
  } catch {}
}

function resolveUserId(userNameOrRole, authUser) {
  if (!userNameOrRole) return authUser?.id || null;
  const s = String(userNameOrRole).trim().toLowerCase();
  const match = AUTH_USERS.find((u) => {
    const fullName = String(u.fullName || '').toLowerCase();
    const username = String(u.username || '').toLowerCase();
    const role = String(u.role || '').toLowerCase();
    return s.includes(username) || s.includes(role) || (fullName && s.includes(fullName));
  });
  return match?.id || authUser?.id || null;
}

function loadUiPrefs() {
  try {
    const raw = localStorage.getItem(UI_PREF_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { navLayout: 'sidebar', themeId: 'jjb-gold' };
}

function buildNormalizedWithdrawalItems(rawItems, inventory) {
  if (!Array.isArray(rawItems)) return [];
  return rawItems.map((item) => {
    const code = item.materialCode || item.itemCode || item.code;
    const mat = inventory.find((m) => m.code === code) || {};
    const qtySec =
      item.qtyIssuedSec != null
        ? Number(item.qtyIssuedSec)
        : item.qtyRequestedSec != null
        ? Number(item.qtyRequestedSec)
        : Number(item.qty || 0);

    const unitCostPerSec =
      mat.unitCost != null && mat.conversionFactor
        ? Number(mat.unitCost) / Number(mat.conversionFactor)
        : Number(mat.unitCost || 0);
    const estCost =
      item.estimatedCost != null
        ? Number(item.estimatedCost)
        : +(qtySec * unitCostPerSec).toFixed(2);

    const activeLots = Array.isArray(mat.lots)
      ? [...mat.lots]
          .filter((l) => Number(l.qtySec) > 0)
          .sort((a, b) => String(a.expiryDate || '9999').localeCompare(String(b.expiryDate || '9999')))
      : [];
    const lotNumber =
      item.lotNumber ||
      activeLots[0]?.lotNumber ||
      `OPEN-20261108-${code}`;

    return {
      materialCode: code,
      name: item.name || item.description || mat.name || code,
      lotNumber,
      qtyRequestedSec: Number(item.qtyRequestedSec ?? qtySec),
      qtyIssuedSec: qtySec,
      secondaryUom: item.secondaryUom || mat.secondaryUom || 'kg',
      storageRoom: item.storageRoom || mat.room || 'Dry Room 1',
      estimatedCost: estCost,
      composition: Array.isArray(item.composition) ? item.composition : undefined,
      remarks: item.remarks || undefined
    };
  });
}

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMode, setIsMobileMode] = useState(false);
  const [prefilledItem, setPrefilledItem] = useState(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAdminDbModalOpen, setIsAdminDbModalOpen] = useState(false);

  // Dynamic Recipes state
  const [recipes, setRecipes] = useState(() => getAllMasterRecipes());

  // Master Ledgers & States
  const getSaved = (key, fallback) => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_${key}`);
      return saved ? JSON.parse(saved) : fallback;
    } catch {
      return fallback;
    }
  };

  const [inventory, setInventory] = useState(() => getSaved('inventory', MASTER_MATERIALS));
  const [receivingReports, setReceivingReports] = useState(() => getSaved('receiving', INITIAL_RECEIVING_REPORTS));
  const [withdrawals, setWithdrawals] = useState(() => getSaved('withdrawals', INITIAL_WITHDRAWALS));
  const [pendingRequests, setPendingRequests] = useState(() => getSaved('pending_requests', []));
  const [batchOrders, setBatchOrders] = useState(() => getSaved('batch_orders', INITIAL_BATCHING_ORDERS));
  const [adjustments, setAdjustments] = useState(() => getSaved('adjustments', INITIAL_ADJUSTMENTS));
  const [quarantineList, setQuarantineList] = useState(() => getSaved('quarantine', INITIAL_QUARANTINE));
  const [auditLogs, setAuditLogs] = useState(() => getSaved('audit_logs', INITIAL_AUDIT_LOGS));
  const [purchaseOrders, setPurchaseOrders] = useState(() => getSaved('purchase_orders', []));

  // UI Preferences
  const initialUiPrefs = loadUiPrefs();
  const [themeId, setThemeId] = useState(initialUiPrefs.themeId || 'jjb-gold');
  const [navLayout, setNavLayout] = useState(initialUiPrefs.navLayout || 'sidebar');

  useEffect(() => {
    try {
      localStorage.setItem(UI_PREF_KEY, JSON.stringify({ navLayout, themeId }));
    } catch {}
  }, [navLayout, themeId]);

  // Auth State
  const [authUser, setAuthUser] = useState(() => {
    try {
      const saved = localStorage.getItem('JJB_WMS_AUTH_USER');
      if (saved) return JSON.parse(saved);
    } catch {}
    return AUTH_USERS[0];
  });
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      return localStorage.getItem('JJB_WMS_AUTH_STATUS') === 'authenticated';
    } catch {
      return false;
    }
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const currentRole = authUser ? `${authUser.fullName} (${authUser.role})` : 'Authorized Staff';

  // Cross-Device Poller State
  const [unreadNotifications, setUnreadNotifications] = useState([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [toastMessage, setToastMessage] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Outbox UI state
  const [outboxCount, setOutboxCount] = useState(0);
  const [deadEvents, setDeadEvents] = useState([]);
  const [isOutboxModalOpen, setIsOutboxModalOpen] = useState(false);

  const lastSeenSyncIdRef = useRef(0);
  const pollInFlightRef = useRef(false);
  const initialPollDoneRef = useRef(false);
  const flushInFlightRef = useRef(false);
  const flushAgainRef = useRef(false);

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 4000);
  }, []);

  const refreshOutboxBadge = useCallback(async () => {
    try {
      const pending = await getPendingEvents();
      setOutboxCount(pending.length);
    } catch {}
  }, []);

  const loadDeadEvents = useCallback(async () => {
    try {
      const dead = await getDeadEvents();
      setDeadEvents(dead);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_last_sync_id`);
      if (saved) lastSeenSyncIdRef.current = Number(saved) || 0;
    } catch {}
    refreshOutboxBadge();
  }, [refreshOutboxBadge]);

  useEffect(() => {
    const handleOnline = () => { setIsOffline(false); flushOutbox(); };
    const handleOffline = () => { setIsOffline(true); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const pollCrossDeviceEvents = useCallback(async (isManual = false) => {
    if (isOffline) return;
    if (pollInFlightRef.current) return;
    pollInFlightRef.current = true;
    if (isManual) setIsSyncing(true);

    try {
      const sinceId = lastSeenSyncIdRef.current;
      const res = await fetch(`${WORKER_SYNC_URL}?since_id=${sinceId}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (!res.ok) {
        setSyncStatus('error');
        return;
      }

      setSyncStatus('ok');
      const data = await res.json();
      const events = Array.isArray(data.events) ? data.events : [];
      const remoteBatchOrders = Array.isArray(data.batch_orders) ? data.batch_orders : [];
      const remoteWithdrawalRequests = Array.isArray(data.withdrawal_requests) ? data.withdrawal_requests : [];

      if (remoteWithdrawalRequests.length > 0) {
        setPendingRequests((prev) => {
          const map = new Map();
          prev.forEach((r) => map.set(r.requestId || r.withdrawalNo, r));
          remoteWithdrawalRequests.forEach((rw) => {
            const k = rw.requestId || rw.withdrawalNo;
            if (!map.has(k)) {
              map.set(k, rw);
            }
          });
          return Array.from(map.values());
        });
      }

      if (remoteBatchOrders.length > 0) {
        setBatchOrders((prev) => {
          const map = new Map();
          prev.forEach((o) => map.set(o.orderId, o));
          remoteBatchOrders.forEach((ro) => {
            if (!map.has(ro.order_id)) {
              map.set(ro.order_id, {
                orderId: ro.order_id,
                outletName: ro.outlet_name,
                recipeSku: ro.recipe_sku,
                recipeName: ro.recipe_name_snapshot,
                plannedBatches: ro.planned_batches,
                totalDoughKg: Number(ro.total_dough_kg || 0),
                totalIngredientCost: Number(ro.total_cost_centavos || 0) / 100,
                status: ro.status,
                bulkRequestStatus: ro.bulk_request_status || 'NOT_REQUESTED',
                requestDate: ro.order_date,
                timestamp: ro.submitted_at,
                source: ro.source || 'OUTLET_PORTAL'
              });
            }
          });
          return Array.from(map.values());
        });
      }

      const newNotifs = [];

      events.forEach((ev) => {
        const type = ev.event_type || ev.type;
        const p = ev.payload || {};

        if (initialPollDoneRef.current) {
          try {
            if (type === 'WITHDRAWAL_REQUEST_SUBMITTED') {
              newNotifs.push({
                id: ev.id || `${Date.now()}_${Math.random()}`,
                title: 'New Portal Requisition',
                subtitle: `${p.requestingLine} (${p.purpose})`,
                targetTab: 'issuance',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              });
            } else if (type === 'BATCH_ORDER_SAVED' || type === 'OUTLET_BATCH_ORDER') {
              newNotifs.push({
                id: ev.id || `${Date.now()}_${Math.random()}`,
                title: 'New Batching Order',
                subtitle: `${p.title || p.name} · By ${p.bakerName || 'Baker'}`,
                targetTab: 'batching',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              });
            }
          } catch {}
        }
      });

      if (data.last_event_id && Number(data.last_event_id) > lastSeenSyncIdRef.current) {
        lastSeenSyncIdRef.current = Number(data.last_event_id);
        try {
          localStorage.setItem(`${STORAGE_KEY}_last_sync_id`, String(data.last_event_id));
        } catch {}
      }

      if (newNotifs.length > 0) {
        setUnreadNotifications((prev) => [...newNotifs, ...prev].slice(0, 25));
        showToast(`🔔 ${newNotifs[0].title} — ${newNotifs[0].subtitle}`);
      }

      initialPollDoneRef.current = true;
    } catch {
      // Silent retry on next interval
    } finally {
      pollInFlightRef.current = false;
      if (isManual) setIsSyncing(false);
    }
  }, [isOffline, showToast]);

  // Offline-First Outbox Flusher
  const flushOutbox = useCallback(async () => {
    if (isOffline) return;
    if (flushInFlightRef.current) {
      flushAgainRef.current = true;
      return;
    }

    flushInFlightRef.current = true;
    let syncedAny = false;
    let deadNewly = 0;

    try {
      do {
        flushAgainRef.current = false;
        const retryable = await getRetryableEvents();
        if (retryable.length === 0) break;

        for (const event of retryable) {
          await updateEventStatus(event.id, 'SYNCING');

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000);
          try {
            const res = await fetch(WORKER_SYNC_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                event_type: event.event_type,
                idempotency_key: event.idempotency_key,
                payload: event.payload
              }),
              signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (res.ok) {
              await updateEventStatus(event.id, 'SYNCED');
              syncedAny = true;
              continue;
            }

            let serverDetail = '';
            try {
              const errBody = await res.json();
              if (errBody?.error) serverDetail = `: ${errBody.error}`;
            } catch {}

            const httpStatus = res.status;
            const isClientError = httpStatus >= 400 && httpStatus < 500;
            const isTransient429Or408 = httpStatus === 429 || httpStatus === 408;

            if (isClientError && !isTransient429Or408) {
              await updateEventStatus(event.id, 'DEAD', {
                errorMsg: `Payload permanently rejected (HTTP ${httpStatus})${serverDetail}`,
                httpStatus
              });
              deadNewly++;
            } else {
              await updateEventStatus(event.id, 'FAILED', {
                errorMsg: `Transient failure (HTTP ${httpStatus})${serverDetail}`,
                httpStatus
              });
            }
          } catch (err) {
            clearTimeout(timeoutId);
            const isAbort = err?.name === 'AbortError';
            await updateEventStatus(event.id, 'FAILED', {
              errorMsg: isAbort ? 'Request timeout (15s)' : (err.message || 'Network error')
            });
          }
        }

        await clearSyncedEvents();
      } while (flushAgainRef.current);

      const remaining = await getPendingEvents();
      setOutboxCount(remaining.length);

      if (deadNewly > 0) {
        showToast(`⚠️ ${deadNewly} queued event${deadNewly > 1 ? 's' : ''} permanently rejected. Open Outbox to review.`);
      }

      if (syncedAny) {
        pollCrossDeviceEvents(true);
      }
    } catch (err) {
      console.warn('flushOutbox error:', err);
    } finally {
      flushInFlightRef.current = false;
    }
  }, [isOffline, pollCrossDeviceEvents, showToast]);

  const handleReviveEvent = async (id) => {
    await reviveEvent(id);
    await loadDeadEvents();
    await flushOutbox();
    showToast('Event queued for re-transmission.');
  };

  const handleDiscardEvent = async (id) => {
    if (!window.confirm('Permanently discard this outbox event?')) return;
    await discardEvent(id);
    await loadDeadEvents();
    await refreshOutboxBadge();
    showToast('Event permanently discarded.');
  };

  const handleReviveAllEvents = async () => {
    for (const ev of deadEvents) {
      await reviveEvent(ev.id);
    }
    await loadDeadEvents();
    await flushOutbox();
    showToast('All rejected events re-queued.');
  };

  const postSyncEvent = async (eventType, idempotencyKey, payload) => {
    try {
      await enqueueEvent({ event_type: eventType, idempotency_key: idempotencyKey, payload });
      await refreshOutboxBadge();
      flushOutbox();
    } catch (err) {
      console.warn('postSyncEvent enqueue error:', err);
    }
  };

  useEffect(() => {
    pollCrossDeviceEvents();
    const interval = setInterval(pollCrossDeviceEvents, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [pollCrossDeviceEvents]);

  // Storage Persistence
  const saveToStorage = (key, value) => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_${key}`, JSON.stringify(value));
    } catch (e) {
      console.error(`Error saving ${key} to localStorage:`, e);
    }
  };

  useEffect(() => { saveToStorage('inventory', inventory); }, [inventory]);
  useEffect(() => { saveToStorage('receiving', receivingReports); }, [receivingReports]);
  useEffect(() => { saveToStorage('withdrawals', withdrawals); }, [withdrawals]);
  useEffect(() => { saveToStorage('pending_requests', pendingRequests); }, [pendingRequests]);
  useEffect(() => { saveToStorage('batch_orders', batchOrders); }, [batchOrders]);
  useEffect(() => { saveToStorage('adjustments', adjustments); }, [adjustments]);
  useEffect(() => { saveToStorage('quarantine', quarantineList); }, [quarantineList]);
  useEffect(() => { saveToStorage('audit_logs', auditLogs); }, [auditLogs]);
  useEffect(() => { saveToStorage('purchase_orders', purchaseOrders); }, [purchaseOrders]);

  // Real-Time Cross-Tab & Floor Kiosk Synchronization
  useEffect(() => {
    const reloadExternalData = () => {
      try {
        const rawOrders = localStorage.getItem(`${STORAGE_KEY}_batch_orders`);
        if (rawOrders) setBatchOrders(JSON.parse(rawOrders));

        const rawWithdrawals = localStorage.getItem(`${STORAGE_KEY}_withdrawals`);
        if (rawWithdrawals) setWithdrawals(JSON.parse(rawWithdrawals));

        const rawPending = localStorage.getItem(`${STORAGE_KEY}_pending_requests`);
        if (rawPending) setPendingRequests(JSON.parse(rawPending));

        const rawInv = localStorage.getItem(`${STORAGE_KEY}_inventory`);
        if (rawInv) setInventory(JSON.parse(rawInv));

        const rawPos = localStorage.getItem(`${STORAGE_KEY}_purchase_orders`);
        if (rawPos) setPurchaseOrders(JSON.parse(rawPos));
      } catch {}
    };

    const handleStorageChange = (e) => {
      if (e.key?.startsWith(STORAGE_KEY)) reloadExternalData();
    };

    const handleChannelMessage = () => reloadExternalData();

    window.addEventListener('storage', handleStorageChange);
    if (syncChannel) syncChannel.addEventListener('message', handleChannelMessage);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      if (syncChannel) syncChannel.removeEventListener('message', handleChannelMessage);
    };
  }, []);

  const recordAudit = (action, details) => {
    const newEntry = {
      id: Date.now(),
      timestamp: new Date().toLocaleString(),
      actor: authUser ? authUser.fullName : 'Authorized User',
      role: authUser ? authUser.role : 'System',
      action,
      details
    };
    setAuditLogs((prev) => [newEntry, ...prev]);
  };

  const handleSaveReceiving = (newReport) => {
    setReceivingReports((prev) => [newReport, ...prev]);

    setInventory((prevInv) => {
      return prevInv.map((mat) => {
        const receivedItem = newReport.items.find((it) => it.materialCode === mat.code);
        if (!receivedItem) return mat;

        const addedSec = receivedItem.secondaryQty || 0;
        const newBalance = mat.currentBalance + addedSec;

        const newLot = {
          lotNumber: receivedItem.lotNumber,
          expiryDate: receivedItem.expiryDate,
          qtySec: addedSec,
          location: receivedItem.binLocation || 'Pallet Staging'
        };

        return {
          ...mat,
          currentBalance: newBalance,
          lots: [newLot, ...(mat.lots || [])]
        };
      });
    });

    recordAudit(
      'INBOUND_RECEIVING',
      `Received PO/DR ${newReport.poNo} from ${newReport.supplier} (Report: ${newReport.reportNo}, Amount: ₱${newReport.totalPaid.toLocaleString()})`
    );

    postSyncEvent(
      'RECEIVING_SAVED',
      `RECV_${newReport.reportNo}_${Date.now()}`,
      {
        reportNo: newReport.reportNo,
        poNo: newReport.poNo,
        supplier: newReport.supplier,
        totalPaid: newReport.totalPaid,
        receivedBy: resolveUserId(newReport.receivedBy || currentRole, authUser),
        date: newReport.date || new Date().toISOString().slice(0, 10),
        time: newReport.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        items: (newReport.items || []).map((it) => ({
          materialCode: it.materialCode,
          name: it.name,
          lotNumber: it.lotNumber,
          expiryDate: it.expiryDate,
          secondaryQty: it.secondaryQty,
          unitCost: it.unitCost,
          binLocation: it.binLocation
        })),
        timestamp: new Date().toISOString()
      }
    );

    showToast(`Inbound Receiving Report ${newReport.reportNo} saved!`);
  };

  const performWithdrawal = (newWithdrawal, opts = {}) => {
    const normalizedItems = buildNormalizedWithdrawalItems(newWithdrawal.items, inventory);
    const computedCost =
      Number(newWithdrawal.totalCost) > 0
        ? Number(newWithdrawal.totalCost)
        : +normalizedItems.reduce((sum, it) => sum + (Number(it.estimatedCost) || 0), 0).toFixed(2);

    const enrichedWithdrawal = {
      ...newWithdrawal,
      items: normalizedItems,
      totalCost: computedCost,
      sourceChannel: opts.sourceChannel || newWithdrawal.sourceChannel || 'MANUAL'
    };

    setWithdrawals((prev) => [enrichedWithdrawal, ...prev]);

    setInventory((prevInv) => {
      return prevInv.map((mat) => {
        const issuedItem = normalizedItems.find((it) => it.materialCode === mat.code);
        if (!issuedItem) return mat;

        const deductedSec = issuedItem.qtyIssuedSec || 0;
        const newBalance = Math.max(0, mat.currentBalance - deductedSec);
        const { updatedLots } = deductFefoLots(mat.lots || [], deductedSec);

        return {
          ...mat,
          currentBalance: newBalance,
          lots: updatedLots
        };
      });
    });

    recordAudit(
      opts.auditAction || 'STOCK_OUT_ISSUANCE',
      opts.auditDetails ||
        `Issued Slip ${enrichedWithdrawal.slipNo} to ${enrichedWithdrawal.requestingEntity} (${normalizedItems.length} materials)`
    );

    postSyncEvent(
      'WITHDRAWAL_SAVED',
      `WD_${enrichedWithdrawal.slipNo}_${Date.now()}`,
      {
        slipNo: enrichedWithdrawal.slipNo,
        sourceRequestId: opts.sourceRequestId || undefined,
        date: enrichedWithdrawal.date,
        time: enrichedWithdrawal.time,
        requestingEntity: enrichedWithdrawal.requestingEntity,
        department: enrichedWithdrawal.department,
        purpose: enrichedWithdrawal.purpose,
        requestedBy: enrichedWithdrawal.requestedBy,
        issuedBy: resolveUserId(enrichedWithdrawal.issuedBy || currentRole, authUser),
        receivedBy: enrichedWithdrawal.receivedBy,
        totalCost: enrichedWithdrawal.totalCost,
        status: enrichedWithdrawal.status || 'ISSUED & RECONCILED',
        notes: enrichedWithdrawal.notes || '',
        sourceChannel: enrichedWithdrawal.sourceChannel,
        itemCount: normalizedItems.length,
        items: normalizedItems,
        timestamp: new Date().toISOString()
      }
    );
  };

  const handleSaveWithdrawal = (newWithdrawal) => {
    performWithdrawal(newWithdrawal);
    showToast(`Withdrawal Slip ${newWithdrawal.slipNo} issued & stock deducted!`);
  };

  const handleSavePurchaseOrder = (newPo) => {
    setPurchaseOrders((prev) => [newPo, ...prev.filter((p) => p.poNo !== newPo.poNo)]);
    recordAudit(
      'PURCHASE_ORDER_CREATED',
      `Mariejohn created Form-PUR-002 ${newPo.poNo} for ${newPo.supplier} (₱${Number(newPo.totalCost || 0).toLocaleString()}, ${newPo.items?.length || 0} items)`
    );
    postSyncEvent('PURCHASE_ORDER_SAVED', `PO_${newPo.poNo}_${Date.now()}`, {
      poNo: newPo.poNo,
      supplier: newPo.supplier,
      date: newPo.date,
      totalCost: newPo.totalCost,
      status: newPo.status || 'PENDING_DELIVERY',
      preparedBy: newPo.preparedBy || currentRole,
      items: newPo.items || [],
      timestamp: new Date().toISOString()
    });
    showToast(`Purchase Order ${newPo.poNo} recorded as PENDING!`);
  };

  const handleUpdatePoStatus = (poNo, status, meta = {}) => {
    setPurchaseOrders((prev) =>
      prev.map((po) => {
        if (po.poNo === poNo) {
          return {
            ...po,
            status,
            receivingReportNo: meta.receivingReportNo || po.receivingReportNo,
            receivedDate: meta.receivedDate || new Date().toISOString().slice(0, 10),
            receivedBy: meta.receivedBy || currentRole,
            varianceNotes: meta.notes || po.varianceNotes,
            updatedAt: new Date().toISOString()
          };
        }
        return po;
      })
    );
    recordAudit(
      'PURCHASE_ORDER_STATUS_UPDATED',
      `PO ${poNo} marked ${status} by ${currentRole}${meta.receivingReportNo ? ` (Report: ${meta.receivingReportNo})` : ''}`
    );
    postSyncEvent('PO_STATUS_UPDATED', `PO_STATUS_${poNo}_${Date.now()}`, {
      poNo,
      status,
      meta,
      timestamp: new Date().toISOString()
    });
  };

  const handleUpdatePendingRequest = (requestId, updatedData) => {
    setPendingRequests((prev) =>
      prev.map((r) => {
        if (r.requestId === requestId || r.withdrawalNo === requestId) {
          return { ...r, ...updatedData };
        }
        return r;
      })
    );
    showToast(`Requisition ${requestId} updated.`);
  };

  const handleIssuePendingRequest = (requestId, overrides = {}) => {
    const req = pendingRequests.find(
      (r) => r.requestId === requestId || r.withdrawalNo === requestId
    );
    if (!req) return;

    const slipNo = overrides.slipNo || `WS-PORTAL-${Date.now().toString().slice(-6)}`;
    const itemsToIssue = overrides.items || req.items || [];
    const computedCost = overrides.totalCost != null
      ? Number(overrides.totalCost)
      : +itemsToIssue.reduce((s, it) => s + (Number(it.estimatedCost) || 0), 0).toFixed(2);

    const newWithdrawal = {
      slipNo,
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      requestingEntity: req.requestingLine || 'Indangan Facility',
      department: req.department || 'Production Floor',
      purpose: req.purpose || 'Material Requisition',
      requestedBy: req.requisitionedBy || 'Authorized Staff',
      issuedBy: `${currentRole} (Warehouse Custodian)`,
      receivedBy: overrides.receivedBy || req.requisitionedBy || 'Floor Staff',
      items: itemsToIssue,
      totalCost: computedCost,
      status: 'ISSUED & RECONCILED',
      notes: overrides.notes !== undefined ? overrides.notes : (req.notes || '')
    };

    performWithdrawal(newWithdrawal, {
      sourceChannel: 'PORTAL',
      sourceRequestId: requestId,
      auditAction: 'PORTAL_MATERIAL_REQUISITION_ISSUED',
      auditDetails: `Jade / ${currentRole} issued Slip ${slipNo} for queued request ${requestId} (${newWithdrawal.requestingEntity})${newWithdrawal.notes ? ` [Notes: ${newWithdrawal.notes}]` : ''}`
    });

    setPendingRequests((prev) =>
      prev.filter((r) => r.requestId !== requestId && r.withdrawalNo !== requestId)
    );
    broadcastCrossTab('issuance', 'Main WMS');

    showToast(`Request ${requestId} issued as Slip ${slipNo} & stock deducted!`);
  };

  const handleCancelPendingRequest = (requestId, reason = 'Cancelled by Warehouse Supervisor') => {
    setPendingRequests((prev) =>
      prev.filter((r) => r.requestId !== requestId && r.withdrawalNo !== requestId)
    );
    broadcastCrossTab('cancellation', 'Main WMS');
    recordAudit('WITHDRAWAL_REQUEST_CANCELLED', `Cancelled queued request ${requestId}: ${reason}`);
    postSyncEvent('WITHDRAWAL_REQUEST_CANCELLED', `REQ_CANC_${requestId}_${Date.now()}`, {
      requestId,
      reason,
      cancelledBy: currentRole,
      timestamp: new Date().toISOString()
    });
    showToast(`Queued request ${requestId} cancelled.`);
  };

  const handleSaveBatchOrder = (newOrder) => {
    const normalizedOrder = {
      ...newOrder,
      status: newOrder.status || 'PENDING_BATCHING',
      bulkRequestStatus: newOrder.bulkRequestStatus || 'NOT_REQUESTED',
      timestamp: newOrder.timestamp || new Date().toISOString()
    };

    setBatchOrders((prev) => {
      const idx = prev.findIndex((o) => o.orderId === normalizedOrder.orderId);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = normalizedOrder;
        return updated;
      }
      return [normalizedOrder, ...prev];
    });

    recordAudit(
      'BATCH_ORDER_QUEUED',
      `Queued order ${normalizedOrder.orderId}: ${normalizedOrder.recipeName} (${normalizedOrder.plannedBatches} batches) for ${normalizedOrder.outletName}`
    );

    postSyncEvent(
      'BATCH_ORDER_SAVED',
      `BATCH_${normalizedOrder.orderId}_${Date.now()}`,
      {
        orderId: normalizedOrder.orderId,
        outletName: normalizedOrder.outletName,
        recipeSku: normalizedOrder.recipeSku,
        recipeName: normalizedOrder.recipeName,
        plannedBatches: normalizedOrder.plannedBatches,
        totalDoughKg: normalizedOrder.totalDoughKg,
        totalIngredientCost: normalizedOrder.totalIngredientCost,
        status: normalizedOrder.status,
        bulkRequestStatus: normalizedOrder.bulkRequestStatus,
        bakerName: normalizedOrder.bakerName || currentRole,
        orderDate: normalizedOrder.requestDate,
        timestamp: normalizedOrder.timestamp
      }
    );

    broadcastCrossTab('batching', 'Main WMS');
    showToast(`Batch Order ${normalizedOrder.orderId} queued for kitting!`);
  };

  const handleUpdateOrderStatus = (orderId, newStatus) => {
    setBatchOrders((prev) =>
      prev.map((ord) => (ord.orderId === orderId ? { ...ord, status: newStatus } : ord))
    );
    broadcastCrossTab('batch_status', 'Main WMS');
    recordAudit('BATCH_STATUS_CHANGE', `Order ${orderId} moved to ${newStatus}`);
    postSyncEvent('BATCH_ORDER_UPDATED', `BUPD_${orderId}_${Date.now()}`, {
      orderId,
      status: newStatus,
      updatedBy: currentRole,
      timestamp: new Date().toISOString()
    });
  };

  const handleCancelBatchOrder = (orderId, reason = 'Cancelled by Baker / Production Supervisor') => {
    setBatchOrders((prev) => prev.filter((o) => o.orderId !== orderId));
    broadcastCrossTab('batch_cancellation', 'Main WMS');
    recordAudit('BATCH_ORDER_CANCELLED', `Cancelled commercial order ${orderId}: ${reason}`);
    postSyncEvent('BATCH_ORDER_CANCELLED', `BCANC_${orderId}_${Date.now()}`, {
      orderId,
      reason,
      cancelledBy: currentRole,
      timestamp: new Date().toISOString()
    });
    showToast(`Order ${orderId} cancelled.`);
  };

  const handleBulkReleaseOrders = (orderIds) => {
    setBatchOrders((prev) =>
      prev.map((ord) => (orderIds.includes(ord.orderId) ? { ...ord, status: 'SCALED & KITTED' } : ord))
    );
    broadcastCrossTab('bulk_release', 'Main WMS');
    recordAudit('BULK_BATCH_RELEASE', `Released ${orderIds.length} batching orders: ${orderIds.join(', ')}`);
    postSyncEvent('BATCH_BULK_APPROVED', `BULK_REL_${Date.now()}`, {
      orderIds,
      status: 'SCALED & KITTED',
      approvedBy: currentRole,
      timestamp: new Date().toISOString()
    });
    showToast(`Bulk released ${orderIds.length} orders!`);
  };

  const handleRequestBulkMaterials = (orderId) => {
    setBatchOrders((prev) =>
      prev.map((ord) =>
        ord.orderId === orderId ? { ...ord, bulkRequestStatus: 'PENDING_JADE_APPROVAL' } : ord
      )
    );
    recordAudit('BULK_WITHDRAWAL_REQUESTED', `Baker requested Dry Room 1 bulk material allocation for ${orderId}`);
    postSyncEvent('BATCH_ORDER_UPDATED', `BULK_REQ_${orderId}_${Date.now()}`, {
      orderId,
      bulkRequestStatus: 'PENDING_JADE_APPROVAL',
      timestamp: new Date().toISOString()
    });
    showToast(`Bulk requisition sent to Jade for order ${orderId}`);
  };

  const handleApprovePendingWithdrawal = (orderId) => {
    const order = batchOrders.find((o) => o.orderId === orderId);
    if (!order) return;

    const recipe = recipes.find((r) => r.sku === order.recipeSku) || MASTER_RECIPES[0];
    const ingredients = calculateRecipeIngredients(recipe, order.plannedBatches, inventory);

    const withdrawalLines = ingredients.map((ing) => {
      const mat = inventory.find((m) => m.code === ing.code) || {};
      const activeLots = Array.isArray(mat.lots)
        ? [...mat.lots]
            .filter((l) => Number(l.qtySec) > 0)
            .sort((a, b) => String(a.expiryDate || '9999').localeCompare(String(b.expiryDate || '9999')))
        : [];
      return {
        materialCode: ing.code,
        name: ing.name,
        lotNumber: activeLots[0]?.lotNumber || `OPEN-20261108-${ing.code}`,
        qtyRequestedSec: ing.requiredDoughGrams / 1000,
        qtyIssuedSec: ing.requiredDoughGrams / 1000,
        secondaryUom: 'kg',
        storageRoom: mat.room || 'Dry Room 1',
        estimatedCost: ing.lineCost
      };
    });

    const slipNo = `WS-BATCH-${Date.now().toString().slice(-6)}`;
    const newWithdrawal = {
      slipNo,
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      requestingEntity: order.outletName || 'Production Floor',
      department: 'Batching & Kitting',
      purpose: `Bulk Recipe Allocation: ${order.recipeName}`,
      requestedBy: order.bakerName || 'Baker',
      issuedBy: `${currentRole} (Warehouse Custodian)`,
      receivedBy: 'Romeo B. Malusay (Dry Room 2 Kitter)',
      items: withdrawalLines,
      totalCost: order.totalIngredientCost || 0,
      status: 'ISSUED & RECONCILED',
      notes: `Auto-generated from approved bulk request for ${order.orderId}`
    };

    performWithdrawal(newWithdrawal, {
      auditAction: 'BULK_WITHDRAWAL_APPROVED',
      auditDetails: `Jade approved bulk materials for ${order.orderId} (Slip: ${slipNo})`
    });

    setBatchOrders((prev) =>
      prev.map((ord) => (ord.orderId === orderId ? { ...ord, bulkRequestStatus: 'APPROVED' } : ord))
    );

    showToast(`Bulk materials approved for ${orderId} & stock deducted!`);
  };

  const handleDeclineBulkWithdrawal = (orderId, reason = 'Declined by Jade') => {
    setBatchOrders((prev) =>
      prev.map((ord) =>
        ord.orderId === orderId ? { ...ord, bulkRequestStatus: 'DECLINED', bulkDeclineReason: reason } : ord
      )
    );
    recordAudit('BULK_WITHDRAWAL_DECLINED', `Jade declined bulk allocation for ${orderId}: ${reason}`);
    showToast(`Bulk allocation for ${orderId} declined.`);
  };

  const handleApproveSpecialtyRecipe = (proposal) => {
    const newSku = `SPEC-${Date.now().toString().slice(-4)}`;
    const scaledBaseYield = 100;
    const scaledTotalDoughKg = +(proposal.targetPieces * 0.05).toFixed(2);

    const calculatedIngredients = (proposal.items || []).map((it) => {
      const mat = inventory.find((m) => m.code === it.materialCode) || {};
      const ratioPerPiece = Number(it.targetUsageKg) / (Number(proposal.targetPieces) || 1);
      const bakerGrams = +(ratioPerPiece * scaledBaseYield * 1000).toFixed(2);
      const unitCostPerKg =
        mat.unitCost && mat.conversionFactor ? Number(mat.unitCost) / Number(mat.conversionFactor) : Number(mat.unitCost || 0);

      return {
        code: it.materialCode,
        name: mat.name || it.name,
        bakerPercentage: 0,
        bakerGrams,
        unitCostPerKg,
        storageRoom: mat.room || 'Dry Room 1'
      };
    });

    const newRecipe = {
      sku: newSku,
      name: proposal.name,
      category: 'Specialty / Event Cakes',
      baseYieldPieces: scaledBaseYield,
      standardDoughKg: scaledTotalDoughKg,
      doughGramsPerPiece: 50,
      targetChamber: 'Dry Room 2 Scale',
      colorBadge: 'bg-gradient-to-r from-amber-500 to-purple-600 text-white',
      sopNotice: `Specialty Event Recipe approved by ${currentRole}. Strict QC bake signoff required.`,
      ingredients: calculatedIngredients
    };

    setRecipes((prev) => [newRecipe, ...prev]);

    const orderId = `BO-SPEC-${Date.now().toString().slice(-4)}`;
    const newOrder = {
      orderId,
      outletName: proposal.requestingOutlet || 'Specialty Production',
      recipeSku: newSku,
      recipeName: proposal.name,
      plannedBatches: 1,
      totalDoughKg: scaledTotalDoughKg,
      totalIngredientCost: Number(proposal.totalCostCentavos || 0) / 100,
      status: 'PENDING_BATCHING',
      bulkRequestStatus: 'NOT_REQUESTED',
      requestDate: new Date().toISOString().slice(0, 10),
      timestamp: new Date().toISOString(),
      bakerName: proposal.requestedBy || 'Baker'
    };

    setBatchOrders((prev) => [newOrder, ...prev]);

    recordAudit('SPECIALTY_RECIPE_APPROVED', `Approved specialty proposal ${proposal.proposalId} as SKU ${newSku} and queued ${orderId}`);
    postSyncEvent('SPECIALTY_PROPOSAL_APPROVED', `SPEC_APP_${proposal.proposalId}_${Date.now()}`, {
      proposalId: proposal.proposalId,
      recipeSku: newSku,
      orderId,
      approvedBy: currentRole,
      timestamp: new Date().toISOString()
    });

    showToast(`Proposal approved as SKU ${newSku} & queued in Batching Workbench!`);
    setActiveTab('batching');
  };

  const handleSaveAdjustment = (newAdj) => {
    setAdjustments((prev) => [newAdj, ...prev]);
    recordAudit('INVENTORY_ADJUSTMENT', `${newAdj.type} of ${newAdj.materialName}: ${newAdj.reason}`);
    showToast(`Inventory Adjustment ${newAdj.id} recorded.`);
  };

  const handleSaveQuarantine = (newQ) => {
    setQuarantineList((prev) => [newQ, ...prev]);
    recordAudit('QUARANTINE_LOGGED', `Quarantined lot ${newQ.lotNumber} (${newQ.materialName})`);
    showToast(`Lot ${newQ.lotNumber} moved to Quarantine Vault.`);
  };

  const handleImportInventoryCsv = (importedMaterials) => {
    setInventory(importedMaterials);
    recordAudit('CSV_IMPORT_COMMITTED', `Imported ${importedMaterials.length} master inventory items via CSV`);
    showToast(`Successfully imported ${importedMaterials.length} materials into master catalog!`);
  };

  const handleQuickAction = (action, item) => {
    setPrefilledItem(item);
    if (action === 'RECEIVE') setActiveTab('receiving');
    else if (action === 'ISSUE') setActiveTab('issuance');
    else if (action === 'BATCH') setActiveTab('batching');
  };

  const pendingRequestCount = pendingRequests.filter((r) => r.status === 'PENDING_ISSUANCE').length;

  return (
    <div className={`min-h-screen bg-[#FDFBF7] text-gray-900 ${themeId}`}>
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-[#240e32] text-[#E5C585] px-4 py-2.5 rounded-xl shadow-2xl border border-[#C8963E] flex items-center gap-2 animate-bounce">
          <Bell size={16} className="text-[#C8963E]" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        unreadNotifications={unreadNotifications}
        setUnreadNotifications={setUnreadNotifications}
        isNotificationsOpen={isNotificationsOpen}
        setIsNotificationsOpen={setIsNotificationsOpen}
        syncStatus={syncStatus}
        isSyncing={isSyncing}
        onManualSync={() => pollCrossDeviceEvents(true)}
        isOffline={isOffline}
        authUser={authUser}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        themeId={themeId}
        setThemeId={setThemeId}
        navLayout={navLayout}
        setNavLayout={setNavLayout}
        onOpenAdminDb={() => setIsAdminDbModalOpen(true)}
        outboxCount={outboxCount}
        onOpenOutbox={async () => {
          await loadDeadEvents();
          setIsOutboxModalOpen(true);
        }}
      />

      {/* Main Body */}
      <div className={navLayout === 'sidebar' ? 'flex flex-1' : ''}>
        {navLayout === 'sidebar' && (
          <aside className="w-64 bg-[#240e32] border-r border-[#C8963E]/30 hidden lg:block shrink-0 min-h-[calc(100vh-64px)] p-3">
            <SidebarNavigation
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              pendingRequestCount={pendingRequestCount}
              outboxCount={outboxCount}
              onOpenOutbox={async () => {
                await loadDeadEvents();
                setIsOutboxModalOpen(true);
              }}
              onOpenAdminDb={() => setIsAdminDbModalOpen(true)}
            />
          </aside>
        )}

        <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full">
          {activeTab === 'portal' ? (
            <OutletRequisitionPortal
              inventory={inventory}
              onSaveRequisition={(req) => {
                setPendingRequests((prev) => [req, ...prev]);
                broadcastCrossTab('issuance', 'Kiosk');
                postSyncEvent('WITHDRAWAL_REQUEST_SUBMITTED', `REQ_${req.requestId}_${Date.now()}`, req);
                showToast(`Requisition ${req.requestId} submitted to Warehouse Queue!`);
              }}
              onClose={() => setActiveTab('dashboard')}
            />
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <ExecutiveDashboard
                  inventory={inventory}
                  isMobileMode={isMobileMode}
                  onQuickAction={handleQuickAction}
                  storageRooms={STORAGE_ROOMS}
                  onOpenImportModal={() => setIsImportModalOpen(true)}
                  batchOrders={batchOrders}
                  withdrawals={withdrawals}
                />
              )}

              {activeTab === 'receiving' && (
                <ReceivingModule
                  inventory={inventory}
                  onSaveReceiving={handleSaveReceiving}
                  receivingReports={receivingReports}
                  currentRole={currentRole}
                  isMobileMode={isMobileMode}
                  prefilledItem={prefilledItem}
                  purchaseOrders={purchaseOrders}
                  onUpdatePoStatus={handleUpdatePoStatus}
                />
              )}

              {activeTab === 'issuance' && (
                <IssuanceModule
                  inventory={inventory}
                  onSaveWithdrawal={handleSaveWithdrawal}
                  withdrawals={withdrawals}
                  pendingRequests={pendingRequests}
                  onIssuePendingRequest={handleIssuePendingRequest}
                  onCancelPendingRequest={handleCancelPendingRequest}
                  onUpdatePendingRequest={handleUpdatePendingRequest}
                  batchOrders={batchOrders}
                  onApprovePendingWithdrawal={handleApprovePendingWithdrawal}
                  onDeclineBulkWithdrawal={handleDeclineBulkWithdrawal}
                  currentRole={currentRole}
                  isMobileMode={isMobileMode}
                  prefilledItem={prefilledItem}
                />
              )}

              {activeTab === 'batching' && (
                <BatchingWorkbench
                  batchOrders={batchOrders}
                  onSaveBatchOrder={handleSaveBatchOrder}
                  onUpdateOrderStatus={handleUpdateOrderStatus}
                  onBulkReleaseOrders={handleBulkReleaseOrders}
                  onRequestBulkMaterials={handleRequestBulkMaterials}
                  onCancelOrder={handleCancelBatchOrder}
                  onApproveSpecialtyRecipe={handleApproveSpecialtyRecipe}
                  recipes={recipes}
                  outlets={OUTLETS}
                  inventory={inventory}
                  currentRole={currentRole}
                  isMobileMode={isMobileMode}
                />
              )}

              {activeTab === 'finished-goods' && (
                <FinishedGoodsModule
                  recipes={recipes}
                  postSyncEvent={postSyncEvent}
                />
              )}

              {activeTab === 'adjustments' && (
                <AdjustmentsModule
                  inventory={inventory}
                  adjustments={adjustments}
                  quarantineList={quarantineList}
                  onSaveAdjustment={handleSaveAdjustment}
                  onSaveQuarantine={handleSaveQuarantine}
                  currentRole={currentRole}
                />
              )}

              {activeTab === 'customers' && (
                <Customers />
              )}

              {activeTab === 'reports' && (
                <ReportsModule
                  inventory={inventory}
                  receivingReports={receivingReports}
                  withdrawals={withdrawals}
                  batchOrders={batchOrders}
                  adjustments={adjustments}
                  quarantineList={quarantineList}
                  currentRole={currentRole}
                  onImportInventoryCsv={handleImportInventoryCsv}
                  onRecordAudit={recordAudit}
                  onOpenImportModal={() => setIsImportModalOpen(true)}
                  purchaseOrders={purchaseOrders}
                  onSavePurchaseOrder={handleSavePurchaseOrder}
                />
              )}

              {activeTab === 'eod' && (
                <EodReportModule
                  receivingReports={receivingReports}
                  withdrawals={withdrawals}
                  batchOrders={batchOrders}
                  inventory={inventory}
                  quarantineList={quarantineList}
                  currentRole={currentRole}
                  postSyncEvent={postSyncEvent}
                />
              )}

              {activeTab === 'audit' && (
                <AuditTrailModule auditLogs={auditLogs} />
              )}

              {activeTab === 'history' && (
                <OrderHistory batchOrders={batchOrders} onCancelOrder={handleCancelBatchOrder} />
              )}
            </>
          )}
        </main>
      </div>

      {/* Outbox Diagnostics Modal */}
      {isOutboxModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border-2 border-amber-500 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <h3 className="font-serif font-bold text-lg text-[#240e32] flex items-center gap-2">
                  <RefreshCw size={18} className="text-amber-600" /> Outbox Diagnostics &amp; DLQ
                </h3>
                <p className="text-xs text-gray-500">
                  Pending: {outboxCount} · Permanently Rejected (DEAD): {deadEvents.length}
                </p>
              </div>
              <button onClick={() => setIsOutboxModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold">
                ✕
              </button>
            </div>

            {deadEvents.length === 0 ? (
              <div className="p-4 bg-green-50 text-green-800 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 size={16} /> No permanently rejected events in Dead-Letter Queue.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-red-700">Rejected Events (Poison Pills Protected):</span>
                  <button
                    onClick={handleReviveAllEvents}
                    className="bg-amber-600 text-white font-bold px-3 py-1 rounded hover:bg-amber-700 text-xs"
                  >
                    Revive All
                  </button>
                </div>
                <div className="space-y-2">
                  {deadEvents.map((ev) => (
                    <div key={ev.id} className="p-3 border rounded-xl bg-red-50/50 text-xs space-y-1">
                      <div className="flex justify-between font-mono font-bold">
                        <span className="text-[#5B2E7A]">{ev.event_type}</span>
                        <span className="text-gray-500">{new Date(ev.created_at).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-[11px] text-red-600 font-mono">{ev.last_error}</p>
                      <div className="flex justify-end gap-2 pt-1 border-t border-red-100">
                        <button
                          onClick={() => handleDiscardEvent(ev.id)}
                          className="text-red-700 hover:underline font-bold text-[11px] flex items-center gap-1"
                        >
                          <Trash2 size={11} /> Discard
                        </button>
                        <button
                          onClick={() => handleReviveEvent(ev.id)}
                          className="bg-[#1E7A3E] text-white font-bold px-2.5 py-0.5 rounded text-[11px]"
                        >
                          Revive
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Login Modal */}
      {isLoginModalOpen && (
        <LoginModal
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
          onLoginSuccess={(user) => {
            setAuthUser(user);
            setIsAuthenticated(true);
            try {
              localStorage.setItem('JJB_WMS_AUTH_USER', JSON.stringify(user));
              localStorage.setItem('JJB_WMS_AUTH_STATUS', 'authenticated');
            } catch {}
            setIsLoginModalOpen(false);
            showToast(`Welcome back, ${user.fullName}!`);
          }}
          currentUsername={authUser?.username}
        />
      )}

      {/* Admin DB Modal */}
      {isAdminDbModalOpen && (
        <AdminDatabaseModal
          isOpen={isAdminDbModalOpen}
          onClose={() => setIsAdminDbModalOpen(false)}
          authUser={authUser}
          onRecordAudit={recordAudit}
          onRefreshData={() => pollCrossDeviceEvents(true)}
        />
      )}

      {/* Initial CSV Import Modal */}
      {isImportModalOpen && (
        <InitialDataImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onImportCommitted={handleImportInventoryCsv}
        />
      )}
    </div>
  );
}