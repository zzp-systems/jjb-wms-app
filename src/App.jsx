import React, { useState, useEffect } from 'react';
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
import { CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

export const STORAGE_KEY = 'JJB_WMS_LIVE_V4_6_STATE';
export const WORKER_SYNC_URL = '/api/sync';
export const GAS_WEB_APP_URL =
  'https://script.google.com/macros/s/AKfycbwBll5ZKuiBO0wX9WSXGRd-Tua4QpxbfKAcrnWhVmdkjkU_3mnwgI7bX-iiRgjHlkYa/exec';

// ============================================================================
// Phase 1.5 — Resolve users.id FK from display name or user object.
// Returns null when no match — the four FK columns this feeds
// (received_by, issued_by, adjusted_by, filed_by) are nullable by schema
// design, so NULL is safe. Do NOT fall back to a hardcoded id like 'jade',
// because that would attribute the action to the wrong person if the login
// session is Grace, Mariejohn, Zaphyr, etc.
// ============================================================================
const resolveUserId = (nameOrId, authUserObj = null) => {
  if (authUserObj?.id) {
    const byAuth = AUTH_USERS.find(
      (u) => u.id === authUserObj.id || u.username === authUserObj.username
    );
    if (byAuth?.id) return byAuth.id;
  }
  const raw = String(nameOrId || '').trim();
  if (!raw) return null;
  const matched = AUTH_USERS.find(
    (u) =>
      u.id === raw ||
      u.username === raw ||
      u.name.toLowerCase() === raw.toLowerCase()
  );
  return matched?.id || null;
};

// ============================================================================
// Phase 1.5 — Withdrawal item normalizer.
// Ensures every withdrawal line item posted to /api/sync carries the six
// fields sync.js projectWithdrawal expects. Resolves FEFO lots on the fly.
// ============================================================================
const buildNormalizedWithdrawalItems = (rawItems, materialsList) => {
  return (rawItems || []).map((item) => {
    const code = item.materialCode || item.material_code || item.code || item.itemCode;
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
        : activeLots[0]?.lotNumber || `OPEN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${code}`;

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
                key === 'batch_orders' ? 'orderId' :
                key === 'withdrawals' ? 'slipNo' : 'requestId';
              const map = new Map();
              existingList.forEach(item => {
                const id = item[idField] || item.withdrawalNo;
                if (id) map.set(id, item);
              });
              value.forEach(item => {
                const id = item[idField] || item.withdrawalNo;
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
      console.error("Storage error:", e);
    }
  };

  // Main WMS State
  const [inventory, setInventory] = useState(() => getSaved('inventory', MASTER_MATERIALS));
  const [receivingReports, setReceivingReports] = useState(() => getSaved('receiving', INITIAL_RECEIVING_REPORTS));
  const [withdrawals, setWithdrawals] = useState(() => getSaved('withdrawals', INITIAL_WITHDRAWALS));
  const [batchOrders, setBatchOrders] = useState(() => getSaved('batch_orders', INITIAL_BATCHING_ORDERS));
  const [adjustments, setAdjustments] = useState(() => getSaved('adjustments', INITIAL_ADJUSTMENTS));
  const [quarantineList, setQuarantineList] = useState(() => getSaved('quarantine', INITIAL_QUARANTINE));
  const [auditLogs, setAuditLogs] = useState(() => getSaved('audit_logs', INITIAL_AUDIT_LOGS));
  const [pendingRequests, setPendingRequests] = useState(() => getSaved('pending_requests', []));

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
  const [currentRole, setCurrentRole] = useState(() => authUser?.name || "Jade Q. Dela Cruz");
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMode, setIsMobileMode] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [prefilledItem, setPrefilledItem] = useState(null);
  const [lastEodTriggerDate, setLastEodTriggerDate] = useState(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [recipes, setRecipes] = useState(() => getAllMasterRecipes());

  // Unified Edge Sync Dispatcher
  const postSyncEvent = (eventType, idempotencyKey, payloadData = {}) => {
    if (isOffline) return;
    fetch(WORKER_SYNC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: eventType,
        eventType: eventType,
        idempotency_key: idempotencyKey,
        idempotencyKey: idempotencyKey,
        payload: payloadData,
        ...payloadData
      })
    }).catch((err) => console.warn('Background sync error:', err));
  };

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 4000);
  };

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
    setAuditLogs(prev => [newLog, ...prev]);

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

  // Specialty Recipe Approval Handler
  const handleApproveSpecialtyRecipe = (proposalId) => {
    try {
      const raw = localStorage.getItem('JJB_WMS_LIVE_V4_6_SPECIALTY_RECIPES');
      let proposals = raw ? JSON.parse(raw) : [];
      const proposal = proposals.find(p => p.proposalId === proposalId);
      if (proposal) {
        proposal.status = 'APPROVED';
        proposal.approvedAt = new Date().toISOString();
        proposal.approvedBy = `${currentRole} (Approved for Master Register)`;
        localStorage.setItem('JJB_WMS_LIVE_V4_6_SPECIALTY_RECIPES', JSON.stringify(proposals));

        const updatedRecipes = getAllMasterRecipes();
        setRecipes(updatedRecipes);

        recordAudit(
          "SPECIALTY_RECIPE_APPROVED",
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
    const matched = AUTH_USERS.find(u => u.name === newRoleName);
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
      "STAFF_LOGIN_AUTHENTICATED",
      `${user.name} (${user.title}) successfully authenticated session at ${user.station}.`
    );
    showToast(`Welcome back, ${user.name}! Terminal authenticated.`);
  };

  const handleLogout = () => {
    try {
      sessionStorage.removeItem('JJB_WMS_AUTH_SESSION');
    } catch (e) {}
    setIsAuthenticated(false);
    showToast("Terminal session locked. Please sign in to proceed.");
  };

  // Sync state to LocalStorage
  useEffect(() => { saveToStorage('inventory', inventory); }, [inventory]);
  useEffect(() => { saveToStorage('receiving', receivingReports); }, [receivingReports]);
  useEffect(() => { saveToStorage('withdrawals', withdrawals); }, [withdrawals]);
  useEffect(() => { saveToStorage('batch_orders', batchOrders); }, [batchOrders]);
  useEffect(() => { saveToStorage('adjustments', adjustments); }, [adjustments]);
  useEffect(() => { saveToStorage('quarantine', quarantineList); }, [quarantineList]);
  useEffect(() => { saveToStorage('audit_logs', auditLogs); }, [auditLogs]);
  useEffect(() => { saveToStorage('pending_requests', pendingRequests); }, [pendingRequests]);

  // Real-Time Cross-Tab & Floor Kiosk Synchronization
  useEffect(() => {
    const reloadExternalData = () => {
      try {
        const rawOrders = localStorage.getItem(`${STORAGE_KEY}_batch_orders`);
        if (rawOrders) setBatchOrders(JSON.parse(rawOrders));

        const rawWithdrawals = localStorage.getItem(`${STORAGE_KEY}_withdrawals`);
        if (rawWithdrawals) setWithdrawals(JSON.parse(rawWithdrawals));

        const rawInv = localStorage.getItem(`${STORAGE_KEY}_inventory`);
        if (rawInv) setInventory(JSON.parse(rawInv));

        const rawPending = localStorage.getItem(`${STORAGE_KEY}_pending_requests`);
        if (rawPending) setPendingRequests(JSON.parse(rawPending));

        setRecipes(getAllMasterRecipes());
      } catch (err) {
        console.warn("Real-time sync parse error:", err);
      }
    };

    const handleStorageEvent = (e) => {
      if (
        e.key === `${STORAGE_KEY}_batch_orders` ||
        e.key === `${STORAGE_KEY}_withdrawals` ||
        e.key === `${STORAGE_KEY}_inventory` ||
        e.key === `${STORAGE_KEY}_pending_requests` ||
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
  }, []);

  // 5-MINUTE SYNC POLLING LOOP (GET health-check to preserve D1 write quota)
  useEffect(() => {
    if (isOffline) return;
    const interval = setInterval(async () => {
      if (document.hidden) return;
      try { await fetch(WORKER_SYNC_URL, { method: 'GET' }); } catch (err) {}
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isOffline]);

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
            "AUTOMATED_EOD_2345_WATCHER_TRIGGER",
            `23:45 PHT cutoff reached. Automated nightly operations dossier queued for ${EOD_EMAIL_RECIPIENTS.join(', ')}`
          );
          showToast("23:45 PHT Nightly EOD Watcher: Ledger balanced & queued for distribution.");
        }
      } catch (e) {}
    };
    const timer = setInterval(checkEodTime, 30000);
    return () => clearInterval(timer);
  }, [lastEodTriggerDate]);

  // ============================================================================
  // WORKFLOW 1 — Inbound Receiving Save (unchanged)
  // ============================================================================
  const handleSaveReceiving = (newReport) => {
    setReceivingReports(prev => [newReport, ...prev]);

    setInventory(prevInv => prevInv.map(mat => {
      const receivedItem = newReport.items.find(it => it.materialCode === mat.code);
      if (!receivedItem) return mat;
      const addedSec = receivedItem.secondaryQty || 0;
      const newLot = {
        lotNumber: receivedItem.lotNumber,
        expiryDate: receivedItem.expiryDate,
        qtySec: addedSec,
        location: receivedItem.binLocation || 'Pallet Staging'
      };
      return {
        ...mat,
        currentBalance: mat.currentBalance + addedSec,
        lots: [newLot, ...(mat.lots || [])]
      };
    }));

    recordAudit(
      "INBOUND_RECEIVING",
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
        items: (newReport.items || []).map(it => ({
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
  // Shared issuance core — used by both handleSaveWithdrawal (Jade direct)
  // and handleIssuePendingRequest (Jade approves a queued request).
  // Assumes materials were physically pulled & handed over before this runs.
  // ============================================================================
  const performWithdrawal = (newWithdrawal, opts = {}) => {
    const normalizedItems = buildNormalizedWithdrawalItems(newWithdrawal.items, inventory);
    const enrichedWithdrawal = { ...newWithdrawal, items: normalizedItems };

    setWithdrawals(prev => [enrichedWithdrawal, ...prev]);

    setInventory(prevInv => prevInv.map(mat => {
      const issuedItem = normalizedItems.find(it => it.materialCode === mat.code);
      if (!issuedItem) return mat;
      const deductedSec = issuedItem.qtyIssuedSec || 0;
      const newBalance = Math.max(0, mat.currentBalance - deductedSec);
      const { updatedLots } = deductFefoLots(mat.lots || [], deductedSec);
      return { ...mat, currentBalance: newBalance, lots: updatedLots };
    }));

    recordAudit(
      opts.auditAction || "STOCK_OUT_ISSUANCE",
      opts.auditDetails ||
        `Issued Slip ${newWithdrawal.slipNo} to ${newWithdrawal.requestingEntity} (${normalizedItems.length} materials)`
    );

    postSyncEvent(
      'WITHDRAWAL_SAVED',
      `WD_${newWithdrawal.slipNo}_${Date.now()}`,
      {
        slipNo: newWithdrawal.slipNo,
        date: newWithdrawal.date,
        time: newWithdrawal.time,
        requestingEntity: newWithdrawal.requestingEntity,
        department: newWithdrawal.department,
        purpose: newWithdrawal.purpose,
        requestedBy: newWithdrawal.requestedBy,
        issuedBy: resolveUserId(newWithdrawal.issuedBy || currentRole, authUser),
        receivedBy: newWithdrawal.receivedBy,
        totalCost: newWithdrawal.totalCost,
        status: newWithdrawal.status || 'ISSUED & RECONCILED',
        notes: newWithdrawal.notes || '',
        sourceChannel: newWithdrawal.sourceChannel || 'MANUAL',
        linkedRequestId: newWithdrawal.linkedRequestId || null,
        itemCount: normalizedItems.length,
        items: normalizedItems,
        timestamp: new Date().toISOString()
      }
    );

    return enrichedWithdrawal;
  };

  // ============================================================================
  // WORKFLOW 2 — Jade direct issuance (via IssuanceModule "Save Withdrawal")
  // ============================================================================
  const handleSaveWithdrawal = (newWithdrawal) => {
    performWithdrawal(newWithdrawal, {
      auditAction: "STOCK_OUT_ISSUANCE",
      auditDetails: `Issued Slip ${newWithdrawal.slipNo} to ${newWithdrawal.requestingEntity} (${newWithdrawal.items.length} materials)`
    });
    showToast(`Withdrawal Slip ${newWithdrawal.slipNo} authorized & stock deducted!`);
    setActiveTab('dashboard');
  };

  // ============================================================================
  // WORKFLOW 3A — Portal / staff-entry REQUEST (queued, NOT issued)
  // This is what runs when:
  //   • outlet-portal.html is submitted (self-service)
  //   • OutletRequisitionPortal inside the app is submitted by Jade/Romeo/Grace
  //     on behalf of a phone-in / texted request
  // No inventory change, no withdrawal record, no WITHDRAWAL_SAVED event.
  // Only a queued request + informational sync event.
  // ============================================================================
  const handleSubmitWithdrawalRequest = (portalReq) => {
    const now = new Date();
    const requestId = `REQ-${now.getTime()}`;
    const requestSlipNo = portalReq.withdrawalNo || `WS-REQ-${now.getTime().toString().slice(-8)}`;

    const normalizedItems = (portalReq.items || []).map(row => {
      const code = row.materialCode || row.material_code || row.itemCode || row.code;
      const mat = inventory.find(m => m.code === code) || {};
      const qty = Number(
        row.qtyRequestedSec ?? row.qty_requested_sec ?? row.requestedQtySec ?? row.qty ?? 0
      );
      return {
        materialCode: code,
        name: row.name || row.description || row.materialName || mat.name || code,
        qtyRequestedSec: qty,
        secondaryUom: row.secondaryUom || row.uom || mat.secondaryUom || 'kg',
        storageRoom: row.storageRoom || mat.room || 'Dry Room 1',
        estimatedCost: Number(row.estimatedCost ?? row.estimated_cost ?? 0),
        remarks: row.remarks || ''
      };
    });

    const totalEstimatedCost = portalReq.totalCost != null
      ? Number(portalReq.totalCost)
      : +normalizedItems.reduce((s, it) => s + (it.estimatedCost || 0), 0).toFixed(2);

    const newRequest = {
      requestId,
      requestSlipNo,
      sourceChannel: portalReq.sourceChannel || 'IN_APP_STAFF_ENTRY',
      dateRequested: portalReq.withdrawalDate || now.toISOString().slice(0, 10),
      timeRequested: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      neededByDate: portalReq.neededByDate || portalReq.withdrawalDate || now.toISOString().slice(0, 10),
      requestingEntity: portalReq.requestingLine || portalReq.requestingEntity || 'Unspecified',
      department: portalReq.department ||
        (portalReq.purpose?.includes('Mess Hall')
          ? 'Indangan Facility Mess Hall (Staff Meals & Snacks)'
          : 'Production Floor'),
      purpose: portalReq.purpose || 'Material Requisition',
      requestedBy: portalReq.requisitionedBy || portalReq.requestedBy || 'Authorized Staff',
      enteredBy: portalReq.enteredBy || (portalReq.sourceChannel === 'PORTAL'
        ? `${portalReq.requisitionedBy || 'Staff'} (Portal)`
        : currentRole),
      notes: portalReq.notes || '',
      items: normalizedItems,
      totalEstimatedCost,
      status: 'PENDING_ISSUANCE',
      createdAt: now.toISOString(),
      issuedAt: null,
      issuedBy: null,
      withdrawalSlipNo: null
    };

    setPendingRequests(prev => [newRequest, ...prev]);

    recordAudit(
      'WITHDRAWAL_REQUEST_QUEUED',
      `Request ${requestId} from ${newRequest.requestingEntity} by ${newRequest.requestedBy} queued for Jade's Issuance review (${normalizedItems.length} materials, est. ₱${totalEstimatedCost.toLocaleString()}).`
    );

    // Informational sync event — NOT balance-affecting, NOT projected into withdrawals.
    postSyncEvent(
      'WITHDRAWAL_REQUEST_SUBMITTED',
      `REQ_${requestId}_${Date.now()}`,
      {
        requestId,
        requestSlipNo,
        sourceChannel: newRequest.sourceChannel,
        requestingEntity: newRequest.requestingEntity,
        department: newRequest.department,
        requestedBy: newRequest.requestedBy,
        enteredBy: newRequest.enteredBy,
        purpose: newRequest.purpose,
        neededByDate: newRequest.neededByDate,
        date: newRequest.dateRequested,
        time: newRequest.timeRequested,
        totalEstimatedCost,
        itemCount: normalizedItems.length,
        items: normalizedItems,
        status: 'PENDING_ISSUANCE',
        notes: newRequest.notes,
        timestamp: now.toISOString()
      }
    );

    showToast(`Request ${requestId} queued for Jade's Pending Issuance.`);
    return newRequest;
  };

  // ============================================================================
  // WORKFLOW 3B — Jade ISSUES a pending request.
  // This is the ONLY path that converts a portal request into a deduction.
  // Material physically handed over → Jade clicks "Issue" → withdrawal created
  // + inventory deducted + WITHDRAWAL_SAVED posted.
  // ============================================================================
  const handleIssuePendingRequest = (requestId, overrides = {}) => {
    const req = pendingRequests.find(r => r.requestId === requestId);
    if (!req) {
      showToast(`Request ${requestId} not found — it may already be issued.`);
      return;
    }
    if (req.status !== 'PENDING_ISSUANCE') {
      showToast(`Request ${requestId} is already ${req.status.toLowerCase()}.`);
      return;
    }

    const now = new Date();
    const slipNo = `WS-PORTAL-${now.getTime().toString().slice(-8)}`;

    // FEFO lots are resolved at issue time against live inventory
    const resolvedItems = req.items.map(it => {
      const mat = inventory.find(m => m.code === it.materialCode);
      const activeLots = Array.isArray(mat?.lots)
        ? [...mat.lots].filter(l => Number(l.qtySec) > 0)
            .sort((a, b) => String(a.expiryDate || '9999').localeCompare(String(b.expiryDate || '9999')))
        : [];
      const lotNo = activeLots[0]?.lotNumber ||
        `OPEN-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${it.materialCode}`;
      return {
        materialCode: it.materialCode,
        name: it.name,
        qtyRequestedSec: it.qtyRequestedSec,
        qtyIssuedSec: it.qtyRequestedSec,
        secondaryUom: it.secondaryUom,
        lotNumber: lotNo,
        storageRoom: it.storageRoom,
        estimatedCost: it.estimatedCost,
        remarks: it.remarks || `Issued against request ${req.requestId}`
      };
    });

    const newWithdrawal = {
      slipNo,
      date: now.toISOString().slice(0, 10),
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      requestingEntity: req.requestingEntity,
      department: req.department,
      purpose: req.purpose,
      requestedBy: req.requestedBy,
      issuedBy: `${currentRole} (Warehouse Custodian)`,
      receivedBy: overrides.receivedBy || req.requestedBy,
      items: resolvedItems,
      totalCost: req.totalEstimatedCost,
      status: 'ISSUED & RECONCILED',
      notes: req.notes || '',
      sourceChannel: req.sourceChannel,
      linkedRequestId: req.requestId
    };

    performWithdrawal(newWithdrawal, {
      auditAction: 'PENDING_REQUEST_ISSUED',
      auditDetails: `Jade issued request ${req.requestId} as slip ${slipNo} for ${req.requestingEntity} (${resolvedItems.length} materials, ₱${req.totalEstimatedCost.toLocaleString()}).`
    });

    setPendingRequests(prev => prev.map(r => {
      if (r.requestId !== requestId) return r;
      return {
        ...r,
        status: 'ISSUED',
        issuedAt: now.toISOString(),
        issuedBy: currentRole,
        withdrawalSlipNo: slipNo
      };
    }));

    showToast(`Request ${req.requestId} issued as ${slipNo} — stock deducted & synced.`);
  };

  // ============================================================================
  // WORKFLOW 3C — Jade CANCELS a pending request (materials not available, etc.)
  // ============================================================================
  const handleCancelPendingRequest = (requestId, reason = '') => {
    const req = pendingRequests.find(r => r.requestId === requestId);
    if (!req || req.status !== 'PENDING_ISSUANCE') return;

    const now = new Date();
    setPendingRequests(prev => prev.map(r => {
      if (r.requestId !== requestId) return r;
      return {
        ...r,
        status: 'CANCELLED',
        cancelledAt: now.toISOString(),
        cancelledBy: currentRole,
        cancellationReason: reason || 'Cancelled by Jade'
      };
    }));

    recordAudit(
      'WITHDRAWAL_REQUEST_CANCELLED',
      `Request ${requestId} for ${req.requestingEntity} cancelled by ${currentRole}: ${reason || 'no reason given'}`
    );

    postSyncEvent(
      'WITHDRAWAL_REQUEST_CANCELLED',
      `REQ_CANCEL_${requestId}_${Date.now()}`,
      {
        requestId,
        requestSlipNo: req.requestSlipNo,
        requestingEntity: req.requestingEntity,
        requestedBy: req.requestedBy,
        cancelledBy: currentRole,
        cancellationReason: reason || 'Cancelled by Jade',
        timestamp: now.toISOString()
      }
    );

    showToast(`Request ${requestId} cancelled.`);
  };

  // ============================================================================
  // WORKFLOW 4 — Batch Order Save
  // ============================================================================
  const handleSaveBatchOrder = (newOrder) => {
    setBatchOrders(prev => [newOrder, ...prev]);

    recordAudit(
      "OUTLET_ORDER_INTAKE",
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

  // ============================================================================
  // WORKFLOW 5 — Romeo requests bulk materials (unchanged — stays a queue item
  // on the batch order, Jade later approves via handleApprovePendingWithdrawal)
  // ============================================================================
  const handleRequestBulkMaterials = (orderId) => {
    const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const order = batchOrders.find(o => o.orderId === orderId);
    if (!order) return;

    const slipNo = `BULK-REQ-${Date.now().toString().slice(-6)}`;

    setBatchOrders(prev => prev.map(o => {
      if (o.orderId !== orderId) return o;
      return {
        ...o,
        bulkRequestStatus: 'PENDING_JADE_APPROVAL',
        bulkRequisitionSlipNo: slipNo,
        bulkRequestedAt: nowStr
      };
    }));

    recordAudit(
      "BULK_REQUISITION_SUBMITTED",
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

    showToast(`Bulk requisition for ${order.recipeName} sent to Jade Dela Cruz in Tab 3!`);
  };

  // ============================================================================
  // WORKFLOW 6 — Jade approves Romeo's bulk requisition (unchanged pattern —
  // Jade trigger is the only path that deducts)
  // ============================================================================
  const handleApprovePendingWithdrawal = (orderId) => {
    const order = batchOrders.find(o => o.orderId === orderId);
    if (!order) return;

    const recipe = recipes.find(r => r.sku === order.recipeSku) || MASTER_RECIPES.find(r => r.sku === order.recipeSku);
    if (!recipe) return;

    const requiredIngredients = calculateRecipeIngredients(recipe, order.batchMultiplier);
    const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const slipNo = `WS-BULK-${Date.now().toString().slice(-6)}`;

    const rawItems = requiredIngredients.map(ing => {
      const mat = inventory.find(m => m.code === ing.code);
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

    const normalizedItems = buildNormalizedWithdrawalItems(rawItems, inventory);
    const computedTotalCost = +normalizedItems
      .reduce((sum, it) => sum + (Number(it.estimatedCost) || 0), 0)
      .toFixed(2);

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
      items: normalizedItems,
      totalCost: computedTotalCost,
      status: "ISSUED & RECONCILED",
      sourceChannel: 'BULK_BATCHING'
    };

    performWithdrawal(newWithdrawal, {
      auditAction: 'BULK_REQUISITION_APPROVED',
      auditDetails: `Jade authorized bulk bodega release (Slip: ${slipNo}) for ${order.recipeName} (${order.orderId}). Scale & Kit unlocked for Romeo.`
    });

    setBatchOrders(prev => prev.map(o => {
      if (o.orderId !== orderId) return o;
      return {
        ...o,
        bulkRequestStatus: 'BULK_ISSUED_BY_JADE',
        bulkApprovedAt: nowStr,
        bulkApprovedBy: currentRole
      };
    }));

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

  // ============================================================================
  // WORKFLOW 7 — Update Batch Order Status
  // ============================================================================
  const handleUpdateOrderStatus = (orderId, newStatus, tagId = null, batchedKg = 0) => {
    const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const targetOrder = batchOrders.find(o => o.orderId === orderId);
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
          ? "Othniel Tilan (Pan de Verde Driver)"
          : "Roberto S. Blase (Laurice Driver)"
        : undefined;

    setBatchOrders(prev => prev.map(order => {
      if (order.orderId !== orderId) return order;
      if (newStatus === 'BATCHED_KITTED') {
        return {
          ...order,
          status: 'BATCHED_KITTED',
          batchTagId: resolvedTagId,
          actualBatchedKg: resolvedBatchedKg,
          actualBatchedUnits: order.requestedQtyPcs,
          batchedAt: nowStr,
          batchedBy: "Romeo B. Malusay",
          scaleUsed: "Bench Scale #1 (Govt Seal #798073) Valid",
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
    }));

    recordAudit(
      newStatus === 'BATCHED_KITTED' ? "BATCH_KITTED" : "BATCH_RELEASED",
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
        batchedBy: newStatus === 'BATCHED_KITTED' ? "Romeo B. Malusay" : undefined,
        scaleUsed: newStatus === 'BATCHED_KITTED' ? "Bench Scale #1 (Govt Seal #798073) Valid" : undefined,
        sifter40MeshChecked: newStatus === 'BATCHED_KITTED' ? true : undefined,
        releasedAt: newStatus === 'RELEASED' ? nowStr : undefined,
        releasedTo: resolvedReleasedTo,
        timestamp: new Date().toISOString()
      }
    );

    showToast(`Order ${orderId} updated to ${newStatus}!`);
  };

  // ============================================================================
  // WORKFLOW 8 — Collective Release All Completed
  // ============================================================================
  const handleBulkReleaseOrders = () => {
    const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const kittedOrders = batchOrders.filter(o => o.status === 'BATCHED_KITTED');
    if (kittedOrders.length === 0) return;

    setBatchOrders(prev => prev.map(order => {
      if (order.status === 'BATCHED_KITTED') {
        return {
          ...order,
          status: 'RELEASED',
          releasedAt: nowStr,
          releasedTo: order.outletName.includes('Pan de Verde') ? "Othniel Tilan (Pan de Verde Driver)" : "Roberto S. Blase (Laurice Driver)"
        };
      }
      return order;
    }));

    kittedOrders.forEach(order => {
      postSyncEvent(
        'BATCH_ORDER_UPDATED',
        `BATCH_REL_${order.orderId}_${Date.now()}`,
        {
          orderId: order.orderId,
          status: 'RELEASED',
          releasedAt: nowStr,
          releasedTo: order.outletName.includes('Pan de Verde')
            ? "Othniel Tilan (Pan de Verde Driver)"
            : "Roberto S. Blase (Laurice Driver)"
        }
      );
    });

    recordAudit(
      "BULK_BATCH_RELEASE",
      `Romeo Malusay collectively marked ${kittedOrders.length} recipe mix batches as RELEASED to outlet logistics.`
    );

    showToast(`Successfully released all ${kittedOrders.length} completed batches to outlet logistics!`);
  };

  // ============================================================================
  // WORKFLOW 9 — Physical Adjustment
  // ============================================================================
  const handleSaveAdjustment = (newAdj) => {
    setAdjustments(prev => [newAdj, ...prev]);
    const matchedMat = inventory.find(m => m.code === newAdj.materialCode);

    setInventory(prevInv => prevInv.map(mat => {
      if (mat.code !== newAdj.materialCode) return mat;
      const diff = newAdj.type.includes('OUT') ? -newAdj.qtySec : newAdj.qtySec;
      return { ...mat, currentBalance: mat.currentBalance + diff };
    }));

    recordAudit(
      "INVENTORY_ADJUSTMENT",
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

  // ============================================================================
  // WORKFLOW 10 — Quarantine
  // ============================================================================
  const handleSaveQuarantine = (newNcr) => {
    setQuarantineList(prev => [newNcr, ...prev]);

    recordAudit(
      "QUARANTINE_NCR_FILED",
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

  // ============================================================================
  // WORKFLOW 11 — CSV Inventory Import
  // ============================================================================
  const handleImportInventoryCsv = (updates = []) => {
    if (!Array.isArray(updates) || updates.length === 0) return;
    setInventory(prevInv => prevInv.map(mat => {
      const update = updates.find(u => u.code.toLowerCase() === mat.code.toLowerCase());
      if (update && !isNaN(update.newBalance)) {
        return { ...mat, currentBalance: update.newBalance };
      }
      return mat;
    }));
    showToast(`Imported count updates for ${updates.length} inventory items!`);
  };

  const handleApplyInventoryImport = ({ newInventory, mode, clearHistory, summary }) => {
    setInventory(newInventory);
    if (clearHistory) {
      setReceivingReports([]);
      setWithdrawals([]);
      setBatchOrders([]);
      setAdjustments([]);
      setQuarantineList([]);
      setPendingRequests([]);
    }
    recordAudit(
      "OPENING_BASELINE_CSV_IMPORT",
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

  const handleZeroOutAll = ({ actor, clearHistory }) => {
    const zeroed = MASTER_MATERIALS.map(m => ({ ...m, currentBalance: 0, lots: [] }));
    setInventory(zeroed);
    if (clearHistory) {
      setReceivingReports([]);
      setWithdrawals([]);
      setBatchOrders([]);
      setAdjustments([]);
      setQuarantineList([]);
      setPendingRequests([]);
    }
    recordAudit(
      "INVENTORY_ZERO_OUT",
      `All ${MASTER_MATERIALS.length} warehouse materials reset to 0.00 quantity for fresh production start. By: ${actor}`
    );
    postSyncEvent(
      'INVENTORY_ZERO_OUT',
      `ZERO_OUT_${Date.now()}`,
      { actor, timestamp: new Date().toISOString() }
    );
    showToast("Warehouse inventory zeroed out successfully! Ready for fresh inbound receiving.");
  };

  const handleQuickAction = (action, item = null) => {
    setPrefilledItem(item);
    if (action === 'receiving') setActiveTab('receiving');
    if (action === 'issuance') setActiveTab('issuance');
    if (action === 'batching') setActiveTab('batching');
    if (action === 'orderHistory') setActiveTab('orderHistory');
    if (action === 'portal') setActiveTab('portal');
  };

  const handleResetData = () => {
    if (window.confirm("Reset all WMS data back to authentic initial system seeds?")) {
      localStorage.clear();
      setInventory(MASTER_MATERIALS);
      setReceivingReports(INITIAL_RECEIVING_REPORTS);
      setWithdrawals(INITIAL_WITHDRAWALS);
      setBatchOrders(INITIAL_BATCHING_ORDERS);
      setAdjustments(INITIAL_ADJUSTMENTS);
      setQuarantineList(INITIAL_QUARANTINE);
      setAuditLogs(INITIAL_AUDIT_LOGS);
      setPendingRequests([]);
      showToast("Data restored to factory seeds!");
    }
  };

  const handleExportJson = () => {
    const backup = {
      system: "JJB Warehouse Inventory System v4.6",
      facility: "Indangan Central Manufacturing Plant (LTO #3000013388488)",
      exportedAt: new Date().toISOString(),
      inventory, receivingReports, withdrawals, batchOrders,
      adjustments, quarantineList, auditLogs, pendingRequests
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `JJB_WMS_BACKUP_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    recordAudit("SYSTEM_BACKUP_EXPORT", "Exported JSON snapshot of all warehouse data");
    showToast("System backup downloaded!");
  };

  // Counts
  const lowStockCount = inventory.filter(i => i.currentBalance <= i.threshold).length;
  const pendingBatchCount = batchOrders.filter(b => b.status === 'PENDING_BATCHING').length;
  const pendingBulkApprovalCount = batchOrders.filter(b => b.bulkRequestStatus === 'PENDING_JADE_APPROVAL').length;
  const pendingRequestCount = pendingRequests.filter(r => r.status === 'PENDING_ISSUANCE').length;

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

      <Header
        currentRole={currentRole}
        setCurrentRole={handleRoleChange}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isMobileMode={isMobileMode}
        setIsMobileMode={setIsMobileMode}
        isOffline={isOffline}
        setIsOffline={setIsOffline}
        queueCount={pendingRequestCount}
        pendingBatchCount={pendingBatchCount}
        pendingBulkApprovalCount={pendingBulkApprovalCount}
        pendingRequestCount={pendingRequestCount}
        lowStockCount={lowStockCount}
        onQuickEod={() => setActiveTab('eod')}
        onOpenImportModal={() => setIsImportModalOpen(true)}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
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
            onSpecialtyRecipeSubmitted={() => setRecipes(getAllMasterRecipes())}
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
            batchOrders={batchOrders}
            onApprovePendingWithdrawal={handleApprovePendingWithdrawal}
            pendingRequests={pendingRequests}
            onIssuePendingRequest={handleIssuePendingRequest}
            onCancelPendingRequest={handleCancelPendingRequest}
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
            pendingRequests={pendingRequests}
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
            pendingRequests={pendingRequests}
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

      <footer className="bg-[#240e32] text-white py-4 px-6 text-center text-xs border-t border-[#C8963E]/30 mt-auto">
        <div className="max-w-4xl mx-auto space-y-1">
          <p className="font-semibold text-gray-200">
            Jang-Jang Bakeshop & Kingdom Confectionary Business Lines · Manual of Operations Rev. 4.6 WMS Engine
          </p>
          <p className="text-[#E5C585] text-[11px]">
            Indangan Subject Site FDA LTO No. 3000013388488 · Sasa Site LTO No. 3000002291335 · Davao City, Philippines
          </p>
          <p className="text-gray-400 text-[10px]">
            Designed for Jade Q. Dela Cruz (Receiving & Withdrawals) · Romeo B. Malusay (Batching & Releasing) · Mariejohn F. Tacuban (Inventory & PO Replenishment)
          </p>
        </div>
      </footer>
    </div>
  );
}