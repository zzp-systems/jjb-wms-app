import React, { useState, useEffect, useRef, useCallback } from 'react';
import Header from './components/Header';
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

import { MASTER_MATERIALS, STORAGE_ROOMS } from './data/materialsData';
import { MASTER_RECIPES, OUTLETS, getAllMasterRecipes } from './data/recipesData';
import { AUTH_USERS } from './data/authUsers';
import {
  INITIAL_RECEIVING_REPORTS,
  INITIAL_WITHDRAWALS,
  INITIAL_BATCHING_ORDERS,
  INITIAL_ADJUSTMENTS,
  INITIAL_QUARANTINE,
  INITIAL_AUDIT_LOGS,
  EOD_EMAIL_RECIPIENTS
} from './data/initialData';

import { deductFefoLots, calculateRecipeIngredients } from './utils/wmsLogic';
import { CheckCircle2, Bell } from 'lucide-react';

export const STORAGE_KEY = 'JJB_WMS_LIVE_V4_6_STATE';
export const WORKER_SYNC_URL = '/api/sync';
export const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwBll5ZKuiBO0wX9WSXGRd-Tua4QpxbfKAcrnWhVmdkjkU_3mnwgI7bX-iiRgjHlkYa/exec';

// ============================================================================
// Helper: Resolve D1 users.id FK from display name or user object
// ============================================================================
const resolveUserId = (nameOrId, authUserObj = null) => {
  if (authUserObj?.id) {
    const byAuth = AUTH_USERS.find((u) => u.id === authUserObj.id || u.username === authUserObj.username);
    if (byAuth?.id) return byAuth.id;
  }
  const raw = String(nameOrId || '').trim();
  if (!raw) return 'jade';
  const matched = AUTH_USERS.find(
    (u) =>
      u.id === raw ||
      u.username === raw ||
      u.name.toLowerCase() === raw.toLowerCase() ||
      raw.toLowerCase().includes(u.name.split(' ')[0].toLowerCase())
  );
  return matched?.id || 'jade';
};

// ============================================================================
// Helper: Withdrawal item normalizer
// ============================================================================
const buildNormalizedWithdrawalItems = (rawItems, materialsList) => {
  return (rawItems || []).map((item) => {
    const code = item.materialCode || item.material_code || item.itemCode || item.code;
    const mat = (materialsList || []).find((m) => m.code === code) || {};
    const qtyIssued = Number(
      item.qtyIssuedSec ?? item.qty_issued_sec ?? item.qtyRequestedSec ?? item.requestedQtySec ?? item.qty ?? 0
    );
    const qtyRequested = Number(
      item.qtyRequestedSec ?? item.qty_requested_sec ?? item.requestedQtySec ?? qtyIssued
    );

    const unitCostPerSecondary =
      mat.unitCost != null && mat.conversionFactor
        ? Number(mat.unitCost) / Number(mat.conversionFactor)
        : Number(mat.unitCost ?? 0);

    const rawEstCost = Number(item.estimatedCost ?? item.estimated_cost ?? 0);
    const estimatedCostPhp =
      rawEstCost > 0 ? rawEstCost : +(qtyIssued * unitCostPerSecondary).toFixed(2);

    const activeLots = Array.isArray(mat.lots)
      ? [...mat.lots]
          .filter((l) => Number(l.qtySec) > 0)
          .sort((a, b) =>
            String(a.expiryDate || '9999').localeCompare(String(b.expiryDate || '9999'))
          )
      : [];
    const resolvedLotNo =
      item.lotNumber && item.lotNumber !== 'FEFO-AUTO' && item.lotNumber !== 'DEFAULT-LOT'
        ? item.lotNumber
        : activeLots[0]?.lotNumber || `OPEN-20261108-${code}`;

    return {
      materialCode: code,
      name: item.name || item.materialName || item.description || mat.name || code,
      lotNumber: resolvedLotNo,
      qtyRequestedSec: qtyRequested,
      qtyIssuedSec: qtyIssued,
      secondaryUom: item.secondaryUom || item.uom || mat.secondaryUom || 'kg',
      storageRoom: item.storageRoom || mat.room || 'Dry Room 1',
      estimatedCost: estimatedCostPhp,
      remarks: item.remarks || ''
    };
  });
};

export default function App() {
  // Persistence Helpers
  const getSaved = (key, fallback) => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_${key}`);
      return saved ? JSON.parse(saved) : fallback;
    } catch (e) {
      return fallback;
    }
  };

  const saveToStorage = (key, value) => {
    try {
      const fullKey = `${STORAGE_KEY}_${key}`;
      if ((key === 'batch_orders' || key === 'withdrawals' || key === 'pending_requests') && Array.isArray(value)) {
        const existingRaw = localStorage.getItem(fullKey);
        if (existingRaw) {
          try {
            const existingList = JSON.parse(existingRaw);
            if (Array.isArray(existingList)) {
              const idField =
                key === 'batch_orders'
                  ? 'orderId'
                  : key === 'pending_requests'
                  ? 'requestId'
                  : 'slipNo';
              const map = new Map();
              existingList.forEach((item) => {
                const id = item[idField] || item.withdrawalNo || item.orderId;
                if (id) map.set(id, item);
              });
              value.forEach((item) => {
                const id = item[idField] || item.withdrawalNo || item.orderId;
                if (id) map.set(id, item);
              });
              const merged = Array.from(map.values());
              localStorage.setItem(fullKey, JSON.stringify(merged));
              return;
            }
          } catch (e) {}
        }
      }
      localStorage.setItem(fullKey, JSON.stringify(value));
    } catch (e) {
      console.error('Storage error:', e);
    }
  };

  // Main WMS State
  const [inventory, setInventory] = useState(() => getSaved('inventory', MASTER_MATERIALS));
  const [receivingReports, setReceivingReports] = useState(() => getSaved('receiving', INITIAL_RECEIVING_REPORTS));
  const [withdrawals, setWithdrawals] = useState(() => getSaved('withdrawals', INITIAL_WITHDRAWALS));
  const [pendingRequests, setPendingRequests] = useState(() => getSaved('pending_requests', []));
  const [batchOrders, setBatchOrders] = useState(() => getSaved('batch_orders', INITIAL_BATCHING_ORDERS));
  const [adjustments, setAdjustments] = useState(() => getSaved('adjustments', INITIAL_ADJUSTMENTS));
  const [quarantineList, setQuarantineList] = useState(() => getSaved('quarantine', INITIAL_QUARANTINE));
  const [auditLogs, setAuditLogs] = useState(() => getSaved('audit_logs', INITIAL_AUDIT_LOGS));

  // Operational & Authentication State
  const [authUser, setAuthUser] = useState(() => {
    try {
      const saved = localStorage.getItem('JJB_WMS_AUTH_USER');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return AUTH_USERS[0];
  });
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      return sessionStorage.getItem('JJB_WMS_AUTH_SESSION') === 'ACTIVE';
    } catch (e) {
      return false;
    }
  });
  const [currentRole, setCurrentRole] = useState(() => authUser?.name || 'Jade Q. Dela Cruz');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isTestMode, setIsTestMode] = useState(() => {
    try {
      return sessionStorage.getItem('JJB_WMS_SANDBOX_MODE') === '1';
    } catch {
      return false;
    }
  });

  const toggleTestMode = (val) => {
    setIsTestMode(val);
    try {
      sessionStorage.setItem('JJB_WMS_SANDBOX_MODE', val ? '1' : '0');
    } catch {}
  };

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMode, setIsMobileMode] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [prefilledItem, setPrefilledItem] = useState(null);
  const [lastEodTriggerDate, setLastEodTriggerDate] = useState(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [recipes, setRecipes] = useState(() => getAllMasterRecipes());

  // Cross-Device Notification Bell State
  const [unreadNotifications, setUnreadNotifications] = useState([]);
  const lastSeenSyncIdRef = useRef(
    Number(localStorage.getItem(`${STORAGE_KEY}_last_sync_id`) || 0)
  );
  const initialPollDoneRef = useRef(false);

  const showToast = useCallback((message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 4500);
  }, []);

  // ============================================================================
  // Unified Edge Sync Dispatcher
  // ============================================================================
  const postSyncEvent = useCallback((eventType, idempotencyKey, payloadData = {}) => {
    if (isOffline) return;
    const enrichedPayload = {
      ...payloadData,
      is_test_data: payloadData.is_test_data ?? (isTestMode ? 1 : 0)
    };
    fetch(WORKER_SYNC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: eventType,
        eventType: eventType,
        idempotency_key: idempotencyKey,
        idempotencyKey: idempotencyKey,
        payload: enrichedPayload,
        ...enrichedPayload
      })
    }).catch((err) => console.warn('Background sync error:', err));
  }, [isOffline, isTestMode]);

  // ============================================================================
  // Phase 2.5 — Cross-Device D1 Poller
  // Pulls mobile /outlet-portal.html submissions from Cloudflare D1 every 12s
  // and merges them into React state + triggers desktop notification bell.
  // ============================================================================
  const pollCrossDeviceEvents = useCallback(async () => {
    if (isOffline) return;
    try {
      const sinceId = lastSeenSyncIdRef.current || 0;
      const res = await fetch(`${WORKER_SYNC_URL}?since_id=${sinceId}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      const text = await res.text();
      if (!res.ok || text.trim().startsWith('<')) return;

      const data = JSON.parse(text);
      const incomingEvents = Array.isArray(data.events) ? data.events : [];
      const remoteBatchOrders = Array.isArray(data.batch_orders) ? data.batch_orders : [];

      // 1. Hydrate any batch_orders present in D1 table that aren't in local state yet
      if (remoteBatchOrders.length > 0) {
        setBatchOrders((prev) => {
          const map = new Map(prev.map((o) => [o.orderId, o]));
          let changed = false;
          remoteBatchOrders.forEach((ro) => {
            const oid = ro.order_id || ro.orderId;
            if (!oid) return;
            if (!map.has(oid)) {
              changed = true;
              map.set(oid, {
                orderId: oid,
                outletName: ro.outlet_name || ro.outletName || 'Outlet Portal',
                recipeSku: ro.recipe_sku || ro.recipeSku || 'BRD-PAN-001',
                recipeName: ro.recipe_name_snapshot || ro.recipeName || 'Commercial Formulation',
                requestedQtyPcs: Number(ro.requested_qty_pcs ?? ro.requestedQtyPcs ?? 0),
                batchMultiplier: Number(ro.batch_multiplier ?? ro.batchMultiplier ?? 1),
                status: ro.status || 'PENDING_BATCHING',
                bulkRequestStatus: ro.bulk_request_status || null,
                bulkRequisitionSlipNo: ro.bulk_requisition_slip_no || null,
                bulkRequestedAt: ro.bulk_requested_at || null,
                bulkApprovedAt: ro.bulk_approved_at || null,
                bulkApprovedBy: ro.bulk_approved_by || null,
                batchTagId: ro.batch_tag_id || null,
                actualBatchedKg: ro.actual_batched_kg ? Number(ro.actual_batched_kg) : undefined,
                actualBatchedUnits: ro.actual_batched_units ? Number(ro.actual_batched_units) : undefined,
                batchedAt: ro.batched_at || null,
                batchedBy: ro.batched_by || null,
                releasedAt: ro.released_at || null,
                releasedTo: ro.released_to || null
              });
            }
          });
          return changed ? Array.from(map.values()) : prev;
        });
      }

      if (incomingEvents.length === 0) {
        initialPollDoneRef.current = true;
        return;
      }

      const newNotifs = [];

      incomingEvents.forEach((ev) => {
        const evType = String(ev.event_type || '').toUpperCase();
        const p = ev.payload || {};

        // A. Mobile Material / Mess Hall Request -> Queue in Jade's Pending Requests
        if (evType === 'WITHDRAWAL_REQUEST_SUBMITTED') {
          const reqId = p.requestId || p.withdrawalNo || p.slipNo;
          if (!reqId) return;

          setPendingRequests((prev) => {
            if (prev.some((r) => (r.requestId || r.withdrawalNo) === reqId)) return prev;
            const newReq = {
              requestId: reqId,
              withdrawalNo: p.withdrawalNo || reqId,
              withdrawalDate: p.withdrawalDate || p.date || new Date().toISOString().slice(0, 10),
              submittedAt: p.submittedAt || ev.created_at || new Date().toISOString(),
              requestingLine: p.requestingLine || p.requestingEntity || 'Outlet Portal',
              requisitionedBy: p.requisitionedBy || p.requestedBy || 'Outlet Staff',
              department: p.department || 'Production Floor',
              purpose: p.purpose || 'Material Requisition',
              notes: p.notes || '',
              totalCost: Number(p.totalCost || 0),
              status: p.status || 'PENDING_ISSUANCE',
              items: Array.isArray(p.items) ? p.items : []
            };
            if (initialPollDoneRef.current) {
              newNotifs.push({
                id: `NOTIF_${reqId}`,
                type: 'MATERIAL_REQUEST',
                title: `New Material Request (${reqId})`,
                subtitle: `${newReq.requestingLine} · By ${newReq.requisitionedBy}`,
                targetTab: 'issuance',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              });
            }
            return [newReq, ...prev];
          });
        }

        // B. Cancelled Request or Issued Withdrawal -> Remove from Pending Queue
        if (evType === 'WITHDRAWAL_REQUEST_CANCELLED' || evType === 'WITHDRAWAL_SAVED') {
          const targetId = p.requestId || p.sourceRequestId || p.withdrawalNo || p.slipNo;
          if (targetId) {
            setPendingRequests((prev) =>
              prev.filter((r) => r.requestId !== targetId && r.withdrawalNo !== targetId)
            );
          }
        }

        // C. Mobile Batch Order (Form-ORD-001) -> Queue in Romeo's Workbench
        if (evType === 'BATCH_ORDER_SAVED' || evType === 'OUTLET_BATCH_ORDER') {
          const orderId = p.orderId || p.order_id;
          if (!orderId) return;

          setBatchOrders((prev) => {
            if (prev.some((o) => o.orderId === orderId)) return prev;
            const newOrder = {
              orderId,
              outletName: p.outletName || p.outlet_name || 'Retail Outlet',
              recipeSku: p.recipeSku || p.recipe_sku || 'BRD-PAN-001',
              recipeName: p.recipeName || p.recipe_name || 'Commercial Batch',
              requestedQtyPcs: Number(p.requestedQtyPcs || p.requested_qty_pcs || 0),
              batchMultiplier: Number(p.batchMultiplier || p.batch_multiplier || 1),
              targetDelivery: p.targetDelivery || '05:30 AM Pull-Out',
              requisitionedBy: p.requisitionedBy || 'Outlet Staff',
              status: p.status || 'PENDING_BATCHING'
            };
            if (initialPollDoneRef.current) {
              newNotifs.push({
                id: `NOTIF_${orderId}`,
                type: 'BATCH_ORDER',
                title: `New Batch Order (${orderId})`,
                subtitle: `${newOrder.outletName}: ${newOrder.requestedQtyPcs} pcs ${newOrder.recipeName}`,
                targetTab: 'batching',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              });
            }
            return [newOrder, ...prev];
          });
        }

        // D. Mobile Specialty R&D Proposal (Form-RND-001) -> Save to localStorage & notify Romeo
        if (evType === 'SPECIALTY_PROPOSAL_SAVED' || evType === 'SPECIALTY_PROPOSAL_CREATED') {
          const propId = p.proposalId || p.proposal_id;
          if (!propId) return;
          try {
            const raw = localStorage.getItem('JJB_WMS_LIVE_V4_6_SPECIALTY_RECIPES');
            const list = raw ? JSON.parse(raw) : [];
            if (!list.some((x) => x.proposalId === propId)) {
              list.unshift(p);
              localStorage.setItem('JJB_WMS_LIVE_V4_6_SPECIALTY_RECIPES', JSON.stringify(list));
              setRecipes(getAllMasterRecipes());
              if (initialPollDoneRef.current) {
                newNotifs.push({
                  id: `NOTIF_${propId}`,
                  type: 'SPECIALTY_PROPOSAL',
                  title: `New R&D Recipe Proposal (${propId})`,
                  subtitle: `${p.title || p.name} · By ${p.bakerName || 'Baker'}`,
                  targetTab: 'batching',
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                });
              }
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
    } catch (err) {
      // Silent retry on next interval
    }
  }, [isOffline, showToast]);

  // Poll D1 every 12 seconds + immediately on mount & window focus
  useEffect(() => {
    pollCrossDeviceEvents();
    const interval = setInterval(() => {
      if (!document.hidden) pollCrossDeviceEvents();
    }, 12000);
    return () => clearInterval(interval);
  }, [pollCrossDeviceEvents]);

  // Specialty Recipe Approval Handler
  const handleApproveSpecialtyRecipe = (proposalId) => {
    try {
      const raw = localStorage.getItem('JJB_WMS_LIVE_V4_6_SPECIALTY_RECIPES');
      let proposals = raw ? JSON.parse(raw) : [];
      const proposal = proposals.find((p) => p.proposalId === proposalId);
      if (proposal) {
        proposal.status = 'APPROVED';
        proposal.approvedAt = new Date().toISOString();
        proposal.approvedBy = `${currentRole} (Approved for Master Register)`;
        localStorage.setItem('JJB_WMS_LIVE_V4_6_SPECIALTY_RECIPES', JSON.stringify(proposals));

        const updatedRecipes = getAllMasterRecipes();
        setRecipes(updatedRecipes);

        recordAudit(
          'SPECIALTY_RECIPE_APPROVED',
          `Romeo Malusay / ${currentRole} approved specialty formulation "${proposal.name}" into Master Formulations register.`
        );
        showToast(`Specialty recipe "${proposal.title}" approved and active in Master Formulations!`);

        postSyncEvent(
          'SPECIALTY_PROPOSAL_APPROVED',
          `APPV-${proposal.proposalId}-${Date.now()}`,
          proposal
        );
      }
    } catch (err) {
      console.error('Error approving specialty recipe:', err);
    }
  };

  // Sync auth user to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('JJB_WMS_AUTH_USER', JSON.stringify(authUser));
    } catch (e) {}
  }, [authUser]);

  const handleRoleChange = (newRoleName) => {
    setCurrentRole(newRoleName);
    const matched = AUTH_USERS.find((u) => u.name === newRoleName);
    if (matched) setAuthUser(matched);
  };

  const handleLoginSuccess = (user) => {
    setAuthUser(user);
    setCurrentRole(user.name);
    setIsAuthenticated(true);
    try {
      sessionStorage.setItem('JJB_WMS_AUTH_SESSION', 'ACTIVE');
      localStorage.setItem('JJB_WMS_AUTH_USER', JSON.stringify(user));
    } catch (e) {}
    setIsLoginModalOpen(false);
    recordAudit(
      'STAFF_LOGIN_AUTHENTICATED',
      `${user.name} (${user.title}) successfully authenticated session at ${user.station}.`
    );
    showToast(`Welcome back, ${user.name}! Terminal authenticated.`);
  };

  const handleLogout = () => {
    try {
      sessionStorage.removeItem('JJB_WMS_AUTH_SESSION');
    } catch (e) {}
    setIsAuthenticated(false);
    showToast('Terminal session locked. Please sign in to proceed.');
  };

  // Sync state to LocalStorage
  useEffect(() => { saveToStorage('inventory', inventory); }, [inventory]);
  useEffect(() => { saveToStorage('receiving', receivingReports); }, [receivingReports]);
  useEffect(() => { saveToStorage('withdrawals', withdrawals); }, [withdrawals]);
  useEffect(() => { saveToStorage('pending_requests', pendingRequests); }, [pendingRequests]);
  useEffect(() => { saveToStorage('batch_orders', batchOrders); }, [batchOrders]);
  useEffect(() => { saveToStorage('adjustments', adjustments); }, [adjustments]);
  useEffect(() => { saveToStorage('quarantine', quarantineList); }, [quarantineList]);
  useEffect(() => { saveToStorage('audit_logs', auditLogs); }, [auditLogs]);

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

        setRecipes(getAllMasterRecipes());
      } catch (err) {
        console.warn('Real-time sync parse error:', err);
      }
      pollCrossDeviceEvents();
    };

    const handleStorageEvent = (e) => {
      if (
        e.key === `${STORAGE_KEY}_batch_orders` ||
        e.key === `${STORAGE_KEY}_withdrawals` ||
        e.key === `${STORAGE_KEY}_pending_requests` ||
        e.key === `${STORAGE_KEY}_inventory` ||
        e.key === 'JJB_WMS_LIVE_V4_6_SPECIALTY_RECIPES'
      ) {
        reloadExternalData();
      }
    };
    window.addEventListener('storage', handleStorageEvent);

    const handleFocus = () => reloadExternalData();
    window.addEventListener('focus', handleFocus);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') reloadExternalData();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    let bc = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('JJB_WMS_SYNC_CHANNEL');
        bc.onmessage = (msg) => {
          if (msg.data && msg.data.type === 'NEW_REQUISITION') {
            reloadExternalData();
            showToast(`New ${msg.data.entityType || 'floor requisition'} received from ${msg.data.origin || 'Outlet'}!`);
          }
        };
      }
    } catch (e) {}

    return () => {
      window.removeEventListener('storage', handleStorageEvent);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (bc) bc.close();
    };
  }, [pollCrossDeviceEvents, showToast]);

  const recordAudit = (action, details) => {
    const newLog = {
      id: Date.now(),
      timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
      actor: currentRole,
      role: currentRole.includes('Jade') ? 'Warehouse Supervisor' :
            currentRole.includes('Romeo') ? 'Ingredient Batching Preparer' :
            currentRole.includes('Mariejohn') ? 'Inventory & Purchasing Manager' :
            currentRole.includes('Grace') ? 'FSCO & QA Director' :
            currentRole.includes('Zaphyr') ? 'Systems Director & Architect' : 'Chief Operating Authority',
      action,
      details
    };
    setAuditLogs((prev) => [newLog, ...prev]);

    postSyncEvent(
      'AUDIT_LOG',
      `AUDIT_${newLog.id}_${Math.random().toString(36).substring(2, 7)}`,
      {
        action,
        actor: newLog.actor,
        role: newLog.role,
        details,
        timestamp: newLog.timestamp
      }
    );
  };

  // 23:45 PHT NIGHTLY EOD WATCHER
  useEffect(() => {
    const checkEodTime = () => {
      try {
        const now = new Date();
        const phtString = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Manila' });
        const [hours, minutes] = phtString.split(':').map(Number);
        const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

        if (hours === 23 && minutes >= 45 && lastEodTriggerDate !== todayStr) {
          setLastEodTriggerDate(todayStr);
          recordAudit(
            'AUTOMATED_EOD_2345_WATCHER_TRIGGER',
            `23:45 PHT cutoff reached. Automated nightly operations dossier queued for ${EOD_EMAIL_RECIPIENTS.join(', ')}`
          );
          showToast('23:45 PHT Nightly EOD Watcher: Ledger balanced & queued for distribution.');
        }
      } catch (e) {}
    };

    const timer = setInterval(checkEodTime, 30000);
    return () => clearInterval(timer);
  }, [lastEodTriggerDate]);

  // WORKFLOW 1: Inbound Receiving Save
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

    showToast(`Shipment ${newReport.reportNo} received & inventory updated!`);
    setActiveTab('dashboard');
  };

  // ============================================================================
  // Phase 1.5 DEDUCTION GATE — Shared Withdrawal Executor
  // Only called when Jade explicitly issues a manual slip, approves a portal
  // request (handleIssuePendingRequest), or approves Romeo's bulk requisition.
  // ============================================================================
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

  // WORKFLOW 2A: Direct Warehouse Stock Withdrawal Save (Jade in Tab 4)
  const handleSaveWithdrawal = (newWithdrawal) => {
    performWithdrawal(newWithdrawal, {
      sourceChannel: 'MANUAL',
      auditAction: 'STOCK_OUT_ISSUANCE'
    });
    showToast(`Withdrawal Slip ${newWithdrawal.slipNo} authorized & stock deducted!`);
    setActiveTab('dashboard');
  };

  // WORKFLOW 2B: Portal Requisition Intake (Queues for Jade — No premature stock deduction)
  const handleSubmitWithdrawalRequest = (portalReq) => {
    const requestId = portalReq.requestId || portalReq.withdrawalNo || `REQ-${Date.now().toString().slice(-6)}`;
    const normalizedItems = buildNormalizedWithdrawalItems(
      (portalReq.items || []).map((row) => ({
        materialCode: row.itemCode || row.materialCode,
        name: row.description || row.name,
        qtyRequestedSec: row.requestedQtySec ?? row.qtyRequestedSec,
        qtyIssuedSec: row.requestedQtySec ?? row.qtyIssuedSec,
        secondaryUom: row.secondaryUom || 'kg',
        lotNumber: 'FEFO-AUTO',
        estimatedCost: row.estimatedCost || 0,
        remarks: `Portal req: ${portalReq.purpose || 'Operation'}`
      })),
      inventory
    );

    const computedTotalCost =
      portalReq.totalCost ||
      +normalizedItems.reduce((sum, it) => sum + (Number(it.estimatedCost) || 0), 0).toFixed(2);

    const queuedRequest = {
      requestId,
      withdrawalNo: requestId,
      withdrawalDate: portalReq.withdrawalDate || new Date().toISOString().slice(0, 10),
      submittedAt: new Date().toISOString(),
      requestingLine: portalReq.requestingLine || 'Indangan Facility',
      department: portalReq.purpose?.includes('Mess Hall')
        ? 'Indangan Facility Mess Hall (Staff Meals & Snacks)'
        : 'Production Floor',
      purpose: portalReq.purpose || 'Material Requisition',
      requisitionedBy: portalReq.requisitionedBy || 'Authorized Staff',
      notes: portalReq.notes || '',
      totalCost: computedTotalCost,
      status: 'PENDING_ISSUANCE',
      items: normalizedItems
    };

    setPendingRequests((prev) => [queuedRequest, ...prev]);

    recordAudit(
      'WITHDRAWAL_REQUEST_SUBMITTED',
      `Queued material requisition ${requestId} from ${queuedRequest.requestingLine} by ${queuedRequest.requisitionedBy} (awaiting Jade's release).`
    );

    postSyncEvent(
      'WITHDRAWAL_REQUEST_SUBMITTED',
      `REQ_SUB_${requestId}_${Date.now()}`,
      queuedRequest
    );

    showToast(`Requisition ${requestId} queued for Jade Dela Cruz's release!`);
  };

  // WORKFLOW 2C: Jade Approves & Issues a Queued Portal Request
  const handleIssuePendingRequest = (requestId, overrides = {}) => {
    const req = pendingRequests.find(
      (r) => r.requestId === requestId || r.withdrawalNo === requestId
    );
    if (!req) return;

    const slipNo = overrides.slipNo || `WS-PORTAL-${Date.now().toString().slice(-6)}`;
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
      items: overrides.items || req.items || [],
      totalCost: req.totalCost || 0,
      status: 'ISSUED & RECONCILED',
      notes: req.notes || ''
    };

    performWithdrawal(newWithdrawal, {
      sourceChannel: 'PORTAL',
      sourceRequestId: requestId,
      auditAction: 'PORTAL_MATERIAL_REQUISITION_ISSUED',
      auditDetails: `Jade / ${currentRole} issued Slip ${slipNo} for queued request ${requestId} (${newWithdrawal.requestingEntity})`
    });

    setPendingRequests((prev) =>
      prev.filter((r) => r.requestId !== requestId && r.withdrawalNo !== requestId)
    );

    showToast(`Request ${requestId} issued as Slip ${slipNo} & stock deducted!`);
  };

  // WORKFLOW 2D: Cancel a Queued Portal Request
  const handleCancelPendingRequest = (requestId, reason = 'Cancelled by Warehouse Supervisor') => {
    setPendingRequests((prev) =>
      prev.filter((r) => r.requestId !== requestId && r.withdrawalNo !== requestId)
    );
    recordAudit('WITHDRAWAL_REQUEST_CANCELLED', `Cancelled queued request ${requestId}: ${reason}`);
    postSyncEvent('WITHDRAWAL_REQUEST_CANCELLED', `REQ_CANC_${requestId}_${Date.now()}`, {
      requestId,
      reason,
      cancelledBy: currentRole,
      timestamp: new Date().toISOString()
    });
    showToast(`Queued request ${requestId} cancelled.`);
  };

  // WORKFLOW 3: Batch Order Save
  const handleSaveBatchOrder = (newOrder) => {
    setBatchOrders((prev) => [newOrder, ...prev]);

    recordAudit(
      'OUTLET_ORDER_INTAKE',
      `Intake batch order ${newOrder.orderId} for ${newOrder.outletName}: ${newOrder.requestedQtyPcs} pcs of ${newOrder.recipeName}`
    );

    postSyncEvent(
      'BATCH_ORDER_SAVED',
      `ORDER_${newOrder.orderId}_${Date.now()}`,
      {
        orderId: newOrder.orderId,
        outletName: newOrder.outletName,
        recipeSku: newOrder.recipeSku,
        recipeName: newOrder.recipeName,
        requestedQtyPcs: newOrder.requestedQtyPcs,
        batchMultiplier: newOrder.batchMultiplier,
        status: newOrder.status || 'PENDING_BATCHING',
        timestamp: new Date().toISOString()
      }
    );

    showToast(`Order ${newOrder.orderId} queued for Romeo Malusay!`);
  };

  // WORKFLOW 3B: Romeo Requests Bulk Raw Materials
  const handleRequestBulkMaterials = (orderId) => {
    const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const order = batchOrders.find((o) => o.orderId === orderId);
    if (!order) return;

    const slipNo = `BULK-REQ-${Date.now().toString().slice(-6)}`;

    setBatchOrders((prev) =>
      prev.map((o) => {
        if (o.orderId !== orderId) return o;
        return {
          ...o,
          bulkRequestStatus: 'PENDING_JADE_APPROVAL',
          bulkRequisitionSlipNo: slipNo,
          bulkRequestedAt: nowStr
        };
      })
    );

    recordAudit(
      'BULK_REQUISITION_SUBMITTED',
      `Romeo Malusay submitted bulk ingredients requisition for ${order.recipeName} (${order.orderId}) to Jade Dela Cruz.`
    );

    postSyncEvent(
      'BATCH_ORDER_UPDATED',
      `BULK_REQ_${orderId}_${Date.now()}`,
      {
        orderId,
        bulkRequestStatus: 'PENDING_JADE_APPROVAL',
        bulkRequisitionSlipNo: slipNo,
        bulkRequestedAt: nowStr
      }
    );

    showToast(`Bulk requisition for ${order.recipeName} sent to Jade Dela Cruz in Tab 4!`);
  };

  // WORKFLOW 3C: Jade Approves Romeo's Bulk Requisition
  const handleApprovePendingWithdrawal = (orderId) => {
    const order = batchOrders.find((o) => o.orderId === orderId);
    if (!order) return;

    const recipe =
      recipes.find((r) => r.sku === order.recipeSku) ||
      MASTER_RECIPES.find((r) => r.sku === order.recipeSku);
    if (!recipe) return;

    const requiredIngredients = calculateRecipeIngredients(recipe, order.batchMultiplier);
    const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const slipNo = `WS-BULK-${Date.now().toString().slice(-6)}`;

    const rawWithdrawalItems = requiredIngredients.map((ing) => {
      const mat = inventory.find((m) => m.code === ing.code);
      return {
        materialCode: ing.code,
        name: ing.name,
        qtyRequestedSec: ing.requiredKg,
        qtyIssuedSec: ing.requiredKg,
        secondaryUom: mat?.secondaryUom || 'kg',
        lotNumber: 'FEFO-AUTO',
        storageRoom: mat ? mat.room : 'Dry Room 1',
        remarks: `Bulk batching issue for ${order.orderId}`
      };
    });

    const newWithdrawal = {
      slipNo,
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      requestingEntity: `${order.outletName} (Romeo Batching)`,
      department: 'Batching Workbench (Dry Room 2)',
      purpose: `Recipe Kitting: ${order.recipeName} (${order.requestedQtyPcs} pcs)`,
      requestedBy: 'Romeo B. Malusay (Ingredient Batching Preparer)',
      issuedBy: `${currentRole} (Warehouse Custodian)`,
      receivedBy: 'Romeo B. Malusay',
      items: rawWithdrawalItems,
      status: 'ISSUED & RECONCILED'
    };

    performWithdrawal(newWithdrawal, {
      sourceChannel: 'BULK_BATCHING',
      auditAction: 'BULK_REQUISITION_APPROVED',
      auditDetails: `Jade Dela Cruz authorized bulk bodega release (Slip: ${slipNo}) for ${order.recipeName} (${order.orderId}). Scale & Kit unlocked for Romeo.`
    });

    setBatchOrders((prev) =>
      prev.map((o) => {
        if (o.orderId !== orderId) return o;
        return {
          ...o,
          bulkRequestStatus: 'BULK_ISSUED_BY_JADE',
          bulkApprovedAt: nowStr,
          bulkApprovedBy: currentRole
        };
      })
    );

    postSyncEvent(
      'BATCH_ORDER_UPDATED',
      `BATCH_BULK_APPV_${orderId}_${Date.now()}`,
      {
        orderId,
        bulkRequestStatus: 'BULK_ISSUED_BY_JADE',
        bulkApprovedAt: nowStr,
        bulkApprovedBy: currentRole
      }
    );

    showToast(`Bulk materials authorized & deducted! Romeo's Scale & Kit is unlocked.`);
  };

  // WORKFLOW 4: Update Batch Order Status
  const handleUpdateOrderStatus = (orderId, newStatus, tagId = null, batchedKg = 0) => {
    const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const targetOrder = batchOrders.find((o) => o.orderId === orderId);
    const resolvedTagId =
      newStatus === 'BATCHED_KITTED'
        ? tagId || targetOrder?.batchTagId || `KIT-${Date.now().toString().slice(-6)}`
        : undefined;
    const resolvedBatchedKg =
      newStatus === 'BATCHED_KITTED'
        ? batchedKg || ((targetOrder?.requestedQtyPcs || 0) * 0.04 + 5)
        : undefined;
    const resolvedReleasedTo =
      newStatus === 'RELEASED'
        ? targetOrder?.outletName?.includes('Pan de Verde')
          ? 'Othniel Tilan (Pan de Verde Driver)'
          : 'Roberto S. Blase (Laurice Driver)'
        : undefined;

    setBatchOrders((prev) =>
      prev.map((order) => {
        if (order.orderId !== orderId) return order;

        if (newStatus === 'BATCHED_KITTED') {
          return {
            ...order,
            status: 'BATCHED_KITTED',
            batchTagId: resolvedTagId,
            actualBatchedKg: resolvedBatchedKg,
            actualBatchedUnits: order.requestedQtyPcs,
            batchedAt: nowStr,
            batchedBy: 'Romeo B. Malusay',
            scaleUsed: 'Bench Scale #1 (Govt Seal #798073) Valid',
            sifter40MeshChecked: true
          };
        } else if (newStatus === 'RELEASED') {
          return {
            ...order,
            status: 'RELEASED',
            releasedAt: nowStr,
            releasedTo: resolvedReleasedTo
          };
        }
        return { ...order, status: newStatus };
      })
    );

    recordAudit(
      newStatus === 'BATCHED_KITTED' ? 'BATCH_KITTED' : 'BATCH_RELEASED',
      `Batch order ${orderId} marked as ${newStatus} by ${currentRole}`
    );

    postSyncEvent(
      'BATCH_ORDER_UPDATED',
      `BATCH_UPD_${orderId}_${newStatus}_${Date.now()}`,
      {
        orderId,
        status: newStatus,
        batchTagId: resolvedTagId,
        actualBatchedKg: resolvedBatchedKg,
        actualBatchedUnits: newStatus === 'BATCHED_KITTED' ? targetOrder?.requestedQtyPcs : undefined,
        batchedAt: newStatus === 'BATCHED_KITTED' ? nowStr : undefined,
        batchedBy: newStatus === 'BATCHED_KITTED' ? 'Romeo B. Malusay' : undefined,
        scaleUsed: newStatus === 'BATCHED_KITTED' ? 'Bench Scale #1 (Govt Seal #798073) Valid' : undefined,
        sifter40MeshChecked: newStatus === 'BATCHED_KITTED' ? true : undefined,
        releasedAt: newStatus === 'RELEASED' ? nowStr : undefined,
        releasedTo: resolvedReleasedTo,
        timestamp: new Date().toISOString()
      }
    );

    showToast(`Order ${orderId} updated to ${newStatus}!`);
  };

  // WORKFLOW 5: Collective Release All Completed
  const handleBulkReleaseOrders = () => {
    const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const kittedOrders = batchOrders.filter((o) => o.status === 'BATCHED_KITTED');
    if (kittedOrders.length === 0) return;

    setBatchOrders((prev) =>
      prev.map((order) => {
        if (order.status === 'BATCHED_KITTED') {
          return {
            ...order,
            status: 'RELEASED',
            releasedAt: nowStr,
            releasedTo: order.outletName.includes('Pan de Verde')
              ? 'Othniel Tilan (Pan de Verde Driver)'
              : 'Roberto S. Blase (Laurice Driver)'
          };
        }
        return order;
      })
    );

    kittedOrders.forEach((order) => {
      postSyncEvent(
        'BATCH_ORDER_UPDATED',
        `BATCH_REL_${order.orderId}_${Date.now()}`,
        {
          orderId: order.orderId,
          status: 'RELEASED',
          releasedAt: nowStr,
          releasedTo: order.outletName.includes('Pan de Verde')
            ? 'Othniel Tilan (Pan de Verde Driver)'
            : 'Roberto S. Blase (Laurice Driver)'
        }
      );
    });

    recordAudit(
      'BULK_BATCH_RELEASE',
      `Romeo Malusay collectively marked ${kittedOrders.length} recipe mix batches as RELEASED to outlet logistics.`
    );

    showToast(`Successfully released all ${kittedOrders.length} completed batches to outlet logistics!`);
  };

  // WORKFLOW 6: Physical Adjustment
  const handleSaveAdjustment = (newAdj) => {
    setAdjustments((prev) => [newAdj, ...prev]);

    const matchedMat = inventory.find((m) => m.code === newAdj.materialCode);

    setInventory((prevInv) => {
      return prevInv.map((mat) => {
        if (mat.code !== newAdj.materialCode) return mat;
        const diff = newAdj.type.includes('OUT') ? -newAdj.qtySec : newAdj.qtySec;
        return {
          ...mat,
          currentBalance: mat.currentBalance + diff
        };
      });
    });

    recordAudit(
      'INVENTORY_ADJUSTMENT',
      `${newAdj.type} for ${newAdj.materialCode}: ${newAdj.qtySec} ${newAdj.uom} (${newAdj.reason})`
    );

    postSyncEvent(
      'ADJUSTMENT_SAVED',
      `ADJ_${newAdj.id || Date.now()}`,
      {
        id: newAdj.id,
        materialCode: newAdj.materialCode,
        materialName: newAdj.materialName || matchedMat?.name || newAdj.materialCode,
        type: String(newAdj.type || '').toUpperCase().includes('OUT') ? 'OUT' : 'IN',
        qtySec: newAdj.qtySec,
        uom: newAdj.uom || matchedMat?.secondaryUom || 'kg',
        reason: newAdj.reason,
        adjustedBy: resolveUserId(newAdj.adjustedBy || currentRole, authUser),
        adjustedAt: newAdj.adjustedAt || newAdj.date || new Date().toISOString().slice(0, 19).replace('T', ' '),
        notes: newAdj.notes || ''
      }
    );

    showToast(`Adjustment ${newAdj.id} committed to book balance!`);
  };

  // WORKFLOW 7: Quarantine
  const handleSaveQuarantine = (newNcr) => {
    setQuarantineList((prev) => [newNcr, ...prev]);

    recordAudit(
      'QUARANTINE_NCR_FILED',
      `Form-NCR-001 filed: ${newNcr.ncrNo} - ${newNcr.itemDescription} (${newNcr.reason})`
    );

    postSyncEvent(
      'QUARANTINE_SAVED',
      `NCR_${newNcr.ncrNo}_${Date.now()}`,
      {
        ncrNo: newNcr.ncrNo,
        itemDescription: newNcr.itemDescription,
        lotNumber: newNcr.lotNumber || null,
        materialCode: newNcr.materialCode || null,
        materialName: newNcr.materialName || newNcr.itemDescription,
        qtySec: newNcr.qtySec || 0,
        reason: newNcr.reason,
        status: newNcr.status || 'QUARANTINED',
        filedBy: resolveUserId(newNcr.filedBy || currentRole, authUser),
        filedAt: newNcr.filedAt || newNcr.date || new Date().toISOString().slice(0, 19).replace('T', ' '),
        disposition: newNcr.disposition || null
      }
    );

    showToast(`NCR ${newNcr.ncrNo} logged into exterior quarantine cabinet!`);
  };

  // WORKFLOW 8: CSV Inventory Import
  const handleImportInventoryCsv = (updates = []) => {
    if (!Array.isArray(updates) || updates.length === 0) return;

    setInventory((prevInv) => {
      return prevInv.map((mat) => {
        const update = updates.find((u) => u.code.toLowerCase() === mat.code.toLowerCase());
        if (update && !isNaN(update.newBalance)) {
          return {
            ...mat,
            currentBalance: update.newBalance
          };
        }
        return mat;
      });
    });

    showToast(`Imported count updates for ${updates.length} inventory items!`);
  };

  // One-Time Physical Count Baseline Import
  const handleApplyInventoryImport = ({ newInventory, mode, clearHistory, summary }) => {
    setInventory(newInventory);

    if (clearHistory) {
      setReceivingReports([]);
      setWithdrawals([]);
      setPendingRequests([]);
      setBatchOrders([]);
      setAdjustments([]);
      setQuarantineList([]);
    }

    recordAudit(
      'OPENING_BASELINE_CSV_IMPORT',
      `Imported fresh opening inventory for ${summary.totalItems} materials totaling ₱${summary.totalValuation.toLocaleString()} (${summary.totalWeightKg.toLocaleString()} kg). Mode: ${mode}. History cleared: ${clearHistory}`
    );

    postSyncEvent(
      'OPENING_BASELINE_CSV_IMPORT',
      `BASELINE_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      {
        actor: summary.actor,
        totalItems: summary.totalItems,
        totalValuation: summary.totalValuation,
        mode,
        timestamp: new Date().toISOString()
      }
    );

    showToast(`Opening Inventory Baseline applied! ${summary.totalItems} material counts initialized.`);
  };

  // Reset/Zero Out all materials
  const handleZeroOutAll = ({ actor, clearHistory }) => {
    const zeroed = MASTER_MATERIALS.map((m) => ({
      ...m,
      currentBalance: 0,
      lots: []
    }));
    setInventory(zeroed);

    if (clearHistory) {
      setReceivingReports([]);
      setWithdrawals([]);
      setPendingRequests([]);
      setBatchOrders([]);
      setAdjustments([]);
      setQuarantineList([]);
    }

    recordAudit(
      'INVENTORY_ZERO_OUT',
      `All ${MASTER_MATERIALS.length} warehouse materials reset to 0.00 quantity for fresh production start. By: ${actor}`
    );

    postSyncEvent(
      'INVENTORY_ZERO_OUT',
      `ZERO_OUT_${Date.now()}`,
      {
        actor,
        timestamp: new Date().toISOString()
      }
    );

    showToast('Warehouse inventory zeroed out successfully! Ready for fresh inbound receiving.');
  };

  // Quick Action from Dashboard
  const handleQuickAction = (action, item = null) => {
    setPrefilledItem(item);
    if (action === 'receiving') setActiveTab('receiving');
    if (action === 'issuance') setActiveTab('issuance');
    if (action === 'batching') setActiveTab('batching');
    if (action === 'orderHistory') setActiveTab('orderHistory');
    if (action === 'portal') setActiveTab('portal');
  };

  // Reset Demo Data
  const handleResetData = () => {
    if (window.confirm('Reset all WMS data back to authentic initial system seeds?')) {
      localStorage.clear();
      setInventory(MASTER_MATERIALS);
      setReceivingReports(INITIAL_RECEIVING_REPORTS);
      setWithdrawals(INITIAL_WITHDRAWALS);
      setPendingRequests([]);
      setBatchOrders(INITIAL_BATCHING_ORDERS);
      setAdjustments(INITIAL_ADJUSTMENTS);
      setQuarantineList(INITIAL_QUARANTINE);
      setAuditLogs(INITIAL_AUDIT_LOGS);
      showToast('Data restored to factory seeds!');
    }
  };

  // JSON Export
  const handleExportJson = () => {
    const backup = {
      system: 'JJB Warehouse Inventory System v4.6',
      facility: 'Indangan Central Manufacturing Plant (LTO #3000013388488)',
      exportedAt: new Date().toISOString(),
      inventory,
      receivingReports,
      withdrawals,
      pendingRequests,
      batchOrders,
      adjustments,
      quarantineList,
      auditLogs
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `JJB_WMS_BACKUP_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    recordAudit('SYSTEM_BACKUP_EXPORT', 'Exported JSON snapshot of all warehouse data');
    showToast('System backup downloaded!');
  };

  // Counts
  const lowStockCount = inventory.filter((i) => i.currentBalance <= i.threshold).length;
  const pendingBatchCount = batchOrders.filter((b) => b.status === 'PENDING_BATCHING').length;
  const pendingBulkApprovalCount = batchOrders.filter((b) => b.bulkRequestStatus === 'PENDING_JADE_APPROVAL').length;
  const pendingRequestCount = pendingRequests.filter((r) => r.status === 'PENDING_ISSUANCE').length;
  const totalIssuanceBadgeCount = pendingBulkApprovalCount + pendingRequestCount;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#240e32] flex flex-col justify-center items-center p-4">
        <LoginModal
          isOpen={true}
          isMandatoryGate={true}
          onLoginSuccess={handleLoginSuccess}
          currentUsername={authUser?.username || ''}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF6EE] text-[#2A1B2E] font-sans flex flex-col relative antialiased selection:bg-[#C8963E] selection:text-white">
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-[#1E7A3E] text-white text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-green-300 animate-bounce">
          <CheckCircle2 size={18} />
          <span className="font-bold tracking-wide">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-3 hover:opacity-75 font-bold">✕</button>
        </div>
      )}

      {/* Floating Cross-Device Notification Bell Bar when unread mobile requests arrive */}
      {unreadNotifications.length > 0 && (
        <div className="bg-amber-100 border-b border-amber-300 px-4 py-2 text-xs text-[#240e32] flex flex-wrap items-center justify-between gap-2 shadow-sm">
          <div className="flex items-center gap-2 font-bold">
            <Bell size={15} className="text-amber-700 animate-bounce" />
            <span>
              {unreadNotifications.length} New Cross-Device Portal Submission{unreadNotifications.length > 1 ? 's' : ''}:
            </span>
            <span className="font-normal text-gray-800">
              {unreadNotifications[0].title} ({unreadNotifications[0].subtitle})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveTab(unreadNotifications[0].targetTab || 'issuance');
                setUnreadNotifications([]);
              }}
              className="px-2.5 py-1 rounded bg-[#240e32] text-[#E5C585] font-bold text-[11px] hover:bg-black"
            >
              Open Queue
            </button>
            <button
              onClick={() => setUnreadNotifications([])}
              className="text-gray-600 hover:text-black font-bold px-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <Header
        currentRole={currentRole}
        setCurrentRole={handleRoleChange}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isMobileMode={isMobileMode}
        setIsMobileMode={setIsMobileMode}
        isOffline={isOffline}
        setIsOffline={setIsOffline}
        queueCount={unreadNotifications.length}
        pendingBatchCount={pendingBatchCount}
        pendingBulkApprovalCount={totalIssuanceBadgeCount}
        pendingRequestCount={pendingRequestCount}
        lowStockCount={lowStockCount}
        onQuickEod={() => setActiveTab('eod')}
        onOpenImportModal={() => setIsImportModalOpen(true)}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
        onOpenAdminModal={() => setIsAdminModalOpen(true)}
        isTestMode={isTestMode}
        setIsTestMode={toggleTestMode}
      />

      <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full">
        {activeTab === 'dashboard' && (
          <ExecutiveDashboard
            inventory={inventory}
            isMobileMode={isMobileMode}
            onQuickAction={handleQuickAction}
            storageRooms={STORAGE_ROOMS}
            onOpenImportModal={() => setIsImportModalOpen(true)}
            batchOrders={batchOrders}
            withdrawals={withdrawals}
            pendingRequests={pendingRequests}
          />
        )}

        {activeTab === 'portal' && (
          <OutletRequisitionPortal
            inventory={inventory}
            recipes={recipes}
            onSubmitBatchOrder={handleSaveBatchOrder}
            onSubmitMaterialRequest={handleSubmitWithdrawalRequest}
            onSpecialtyRecipeSubmitted={(newProposal) => {
              setRecipes(getAllMasterRecipes());
              if (newProposal) {
                postSyncEvent(
                  'SPECIALTY_PROPOSAL_SAVED',
                  `SPEC_${newProposal.proposalId || Date.now()}`,
                  newProposal
                );
              }
            }}
            currentRole={currentRole}
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
            batchOrders={batchOrders}
            onApprovePendingWithdrawal={handleApprovePendingWithdrawal}
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
            onApproveSpecialtyRecipe={handleApproveSpecialtyRecipe}
            recipes={recipes}
            outlets={OUTLETS}
            inventory={inventory}
            currentRole={currentRole}
            isMobileMode={isMobileMode}
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
            onRecordAudit={recordAudit}
          />
        )}

        {activeTab === 'audit' && (
          <AuditTrailModule
            auditLogs={auditLogs}
            onResetData={handleResetData}
            onExportJson={handleExportJson}
          />
        )}

        {activeTab === 'orderHistory' && (
          <OrderHistory
            currentRole={currentRole}
            batchOrders={batchOrders}
            withdrawals={withdrawals}
            pendingRequests={pendingRequests}
            onUpdateOrderStatus={handleUpdateOrderStatus}
          />
        )}
      </main>

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        currentUsername={authUser?.username || ''}
      />

      <InitialDataImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        masterMaterials={MASTER_MATERIALS}
        currentInventory={inventory}
        onApplyImport={handleApplyInventoryImport}
        onZeroOutAll={handleZeroOutAll}
        actorName={currentRole}
      />

      <AdminDatabaseModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        authUser={authUser}
        isTestMode={isTestMode}
        setIsTestMode={toggleTestMode}
        onShowToast={showToast}
      />

      <footer className="bg-[#240e32] text-white py-4 px-6 text-center text-xs border-t border-[#C8963E]/30 mt-auto">
        <div className="max-w-4xl mx-auto space-y-1">
          <p className="font-semibold text-gray-200">
            Jang-Jang Bakeshop &amp; Kingdom Confectionary Business Lines · Manual of Operations Rev. 4.6 WMS Engine
          </p>
          <p className="text-[#E5C585] text-[11px]">
            Indangan Subject Site FDA LTO No. 3000013388488 · Sasa Site LTO No. 3000002291335 · Davao City, Philippines
          </p>
          <p className="text-gray-400 text-[10px]">
            Designed for Jade Q. Dela Cruz (Receiving &amp; Withdrawals) · Romeo B. Malusay (Batching &amp; Releasing) · Mariejohn F. Tacuban (Inventory &amp; PO Replenishment)
          </p>
        </div>
      </footer>
    </div>
  );
}