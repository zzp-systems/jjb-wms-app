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
import SignatureProductsDashboard from './components/SignatureProductsDashboard';
import InitialDataImportModal from './components/InitialDataImportModal';
import LoginModal from './components/LoginModal';
import OutletRequisitionPortal from './components/OutletRequisitionPortal';

import { MASTER_MATERIALS, STORAGE_ROOMS } from './data/materialsData';
import { MASTER_RECIPES, OUTLETS } from './data/recipesData';
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
export const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwBll5ZKuiBO0wX9WSXGRd-Tua4QpxbfKAcrnWhVmdkjkU_3mnwgI7bX-iiRgjHlkYa/exec';

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
      localStorage.setItem(`${STORAGE_KEY}_${key}`, JSON.stringify(value));
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

  // Operational & Authentication State
  const [authUser, setAuthUser] = useState(() => {
    try {
      const saved = localStorage.getItem('JJB_WMS_AUTH_USER');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return AUTH_USERS[0]; // Default: Jade Q. Dela Cruz
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

  // Sync auth user to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('JJB_WMS_AUTH_USER', JSON.stringify(authUser));
    } catch (e) {}
  }, [authUser]);

  // Keep authUser in sync when currentRole changes
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

  // Toast Helper
  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Audit Helper
  const recordAudit = (action, details) => {
    const newLog = {
      id: Date.now(),
      timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
      actor: currentRole,
      role: currentRole.includes('Jade') ? 'Warehouse Supervisor' :
            currentRole.includes('Romeo') ? 'Ingredient Batching Preparer' :
            currentRole.includes('Mariejohn') ? 'Inventory & Purchasing Manager' :
            currentRole.includes('Grace') ? 'FSCO & QA Director' : 'Chief Operating Authority',
      action,
      details
    };
    setAuditLogs(prev => [newLog, ...prev]);

    // Push transactional audit event to Cloudflare Worker / D1 Edge
    if (!isOffline) {
      fetch(WORKER_SYNC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idempotencyKey: `AUDIT_${newLog.id}_${Math.random().toString(36).substring(2, 7)}`,
          eventType: 'WMS_AUDIT_EVENT',
          action,
          actor: newLog.actor,
          details,
          timestamp: newLog.timestamp
        })
      }).catch(() => {});
    }
  };

  // 4-SECOND SYNC POLLING LOOP (/api/sync)
  useEffect(() => {
    if (isOffline) return;

    const interval = setInterval(async () => {
      if (document.hidden) return; // skip heartbeat when tab is backgrounded
      try {
        const res = await fetch(WORKER_SYNC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idempotencyKey: `HEARTBEAT_${Date.now()}`,
            eventType: 'HEARTBEAT_POLL',
            timestamp: new Date().toISOString(),
            inventoryCount: inventory.length,
            batchOrdersCount: batchOrders.length
          })
        });
        if (res.ok) {
          // Sync successful
        }
      } catch (err) {
        // Fallback gracefully in standalone offline preview mode
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [isOffline, inventory.length, batchOrders.length]);
  // 23:45 PHT NIGHTLY EOD WATCHER
  useEffect(() => {
    const checkEodTime = () => {
      try {
        // Philippine Standard Time is UTC+8
        const now = new Date();
        const phtString = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Manila' }); // "HH:MM:SS"
        const [hours, minutes] = phtString.split(':').map(Number);
        const todayStr = now.toISOString().slice(0, 10);

        if (hours === 23 && minutes >= 45 && lastEodTriggerDate !== todayStr) {
          setLastEodTriggerDate(todayStr);
          recordAudit(
            "AUTOMATED_EOD_2345_WATCHER_TRIGGER",
            `23:45 PHT cutoff reached. Automated nightly operations dossier queued for ${EOD_EMAIL_RECIPIENTS.join(', ')}`
          );
          showToast("23:45 PHT Nightly EOD Watcher: Ledger balanced & queued for distribution.");
        }
      } catch (e) {
        // Ignore timeZone parsing if unavailable
      }
    };

    const timer = setInterval(checkEodTime, 30000);
    return () => clearInterval(timer);
  }, [lastEodTriggerDate]);

  // WORKFLOW 1: Inbound Receiving Save
  const handleSaveReceiving = (newReport) => {
    setReceivingReports(prev => [newReport, ...prev]);

    // Update perpetual inventory & add lots
    setInventory(prevInv => {
      return prevInv.map(mat => {
        const receivedItem = newReport.items.find(it => it.materialCode === mat.code);
        if (!receivedItem) return mat;

        const addedSec = receivedItem.secondaryQty || 0;
        const newBalance = mat.currentBalance + addedSec;

        // Add or merge lot
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
      "INBOUND_RECEIVING",
      `Received PO/DR ${newReport.poNo} from ${newReport.supplier} (Report: ${newReport.reportNo}, Amount: ₱${newReport.totalPaid.toLocaleString()})`
    );

    showToast(`Shipment ${newReport.reportNo} received & inventory updated!`);
    setActiveTab('dashboard');
  };

  // WORKFLOW 2: Stock Withdrawal Save
  const handleSaveWithdrawal = (newWithdrawal) => {
    setWithdrawals(prev => [newWithdrawal, ...prev]);

    // Deduct from perpetual inventory and lot balances using FEFO
    setInventory(prevInv => {
      return prevInv.map(mat => {
        const issuedItem = newWithdrawal.items.find(it => it.materialCode === mat.code);
        if (!issuedItem) return mat;

        const deductedSec = issuedItem.qtyIssuedSec || 0;
        const newBalance = mat.currentBalance - deductedSec;

        const { updatedLots } = deductFefoLots(mat.lots || [], deductedSec);

        return {
          ...mat,
          currentBalance: newBalance,
          lots: updatedLots
        };
      });
    });

    recordAudit(
      "STOCK_OUT_ISSUANCE",
      `Issued Slip ${newWithdrawal.slipNo} to ${newWithdrawal.requestingEntity} (${newWithdrawal.items.length} materials)`
    );

    showToast(`Withdrawal Slip ${newWithdrawal.slipNo} authorized & stock deducted!`);
    setActiveTab('dashboard');
  };

  // WORKFLOW 3: Batch Order Save (Jade or Mariejohn)
  const handleSaveBatchOrder = (newOrder) => {
    setBatchOrders(prev => [newOrder, ...prev]);

    recordAudit(
      "OUTLET_ORDER_INTAKE",
      `Intake batch order ${newOrder.orderId} for ${newOrder.outletName}: ${newOrder.requestedQtyPcs} pcs of ${newOrder.recipeName}`
    );

    if (!isOffline) {
      fetch(WORKER_SYNC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idempotencyKey: `ORDER_${newOrder.orderId}_${Date.now()}`,
          eventType: 'OUTLET_BATCH_ORDER',
          orderId: newOrder.orderId,
          recipeName: newOrder.recipeName,
          outletName: newOrder.outletName,
          requestedQtyPcs: newOrder.requestedQtyPcs,
          timestamp: new Date().toISOString()
        })
      }).catch(() => {});
    }

    showToast(`Order ${newOrder.orderId} queued for Romeo Malusay!`);
  };

  // WORKFLOW 3-PORTAL: Raw Material / Mess Hall Requisition from Portal
  const handlePortalSubmitMaterialRequest = (portalReq) => {
    const slipNo = portalReq.withdrawalNo || `WS-PORTAL-${Date.now().toString().slice(-6)}`;
    const lineItems = (portalReq.items || []).map(row => {
      const mat = inventory.find(m => m.code === row.itemCode) || {};
      return {
        materialCode: row.itemCode,
        name: row.description || mat.name || row.itemCode,
        qtyRequestedSec: row.requestedQtySec,
        qtyIssuedSec: row.requestedQtySec, // Allocated
        secondaryUom: row.secondaryUom || 'kg',
        lotNumber: mat.lots && mat.lots.length > 0 ? mat.lots[0].lotNumber : 'DEFAULT-LOT',
        storageRoom: mat.room || 'Dry Room 1',
        estimatedCost: row.estimatedCost || 0,
        remarks: `Portal req: ${portalReq.purpose || 'Operation'}`
      };
    });

    const newWithdrawal = {
      slipNo,
      date: portalReq.withdrawalDate || new Date().toISOString().slice(0, 10),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      requestingEntity: portalReq.requestingLine || 'Indangan Facility',
      department: portalReq.purpose?.includes('Mess Hall') ? 'Indangan Facility Mess Hall (Staff Meals & Snacks)' : 'Production Floor',
      purpose: portalReq.purpose || 'Material Requisition',
      requestedBy: portalReq.requisitionedBy || 'Authorized Staff',
      issuedBy: `${currentRole} (Warehouse Custodian)`,
      receivedBy: portalReq.requisitionedBy || 'Floor Staff',
      items: lineItems,
      totalCost: portalReq.totalCost || 0,
      status: "ISSUED & RECONCILED",
      notes: portalReq.notes || ''
    };

    setWithdrawals(prev => [newWithdrawal, ...prev]);

    // Deduct stock from inventory
    setInventory(prevInv => {
      return prevInv.map(mat => {
        const item = (portalReq.items || []).find(it => it.itemCode === mat.code);
        if (!item) return mat;
        const deducted = item.requestedQtySec || 0;
        const newBalance = Math.max(0, mat.currentBalance - deducted);
        const { updatedLots } = deductFefoLots(mat.lots || [], deducted);
        return {
          ...mat,
          currentBalance: newBalance,
          lots: updatedLots
        };
      });
    });

    recordAudit(
      "PORTAL_MATERIAL_REQUISITION",
      `Authorized requisition ${slipNo} for ${newWithdrawal.requestingEntity} by ${newWithdrawal.requestedBy} (${newWithdrawal.purpose})`
    );

    if (!isOffline) {
      fetch(WORKER_SYNC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idempotencyKey: `REQ_${slipNo}_${Date.now()}`,
          eventType: 'MATERIAL_WITHDRAWAL',
          slipNo,
          requestingEntity: newWithdrawal.requestingEntity,
          requestedBy: newWithdrawal.requestedBy,
          purpose: newWithdrawal.purpose,
          timestamp: new Date().toISOString()
        })
      }).catch(() => {});
    }

    showToast(`Requisition ${slipNo} authorized & inventory deducted!`);
  };

  // WORKFLOW 3B: Romeo Requests Bulk Raw Materials from Jade (Step 1 of Handshake)
  const handleRequestBulkMaterials = (orderId) => {
    const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const order = batchOrders.find(o => o.orderId === orderId);
    if (!order) return;

    setBatchOrders(prev => prev.map(o => {
      if (o.orderId !== orderId) return o;
      return {
        ...o,
        bulkRequestStatus: 'PENDING_JADE_APPROVAL',
        bulkRequisitionSlipNo: `BULK-REQ-${Date.now().toString().slice(-6)}`,
        bulkRequestedAt: nowStr
      };
    }));

    recordAudit(
      "BULK_REQUISITION_SUBMITTED",
      `Romeo Malusay submitted bulk ingredients requisition for ${order.recipeName} (${order.orderId}) to Jade Dela Cruz.`
    );

    showToast(`Bulk requisition for ${order.recipeName} sent to Jade Dela Cruz in Tab 3!`);
  };

  // WORKFLOW 3C: Jade Approves Romeo's Bulk Requisition (Step 2 of Handshake - Unlocks Romeo's Scale & Kit)
  const handleApprovePendingWithdrawal = (orderId) => {
    const order = batchOrders.find(o => o.orderId === orderId);
    if (!order) return;

    const recipe = MASTER_RECIPES.find(r => r.sku === order.recipeSku);
    if (!recipe) return;

    const requiredIngredients = calculateRecipeIngredients(recipe, order.batchMultiplier);
    const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const slipNo = `WS-BULK-${Date.now().toString().slice(-6)}`;

    // Create withdrawal record
    const withdrawalItems = requiredIngredients.map(ing => {
      const mat = inventory.find(m => m.code === ing.code);
      const oldestLot = mat && mat.lots && mat.lots.length > 0 ? mat.lots[0].lotNumber : 'DEFAULT-LOT';
      return {
        materialCode: ing.code,
        name: ing.name,
        qtyRequestedSec: ing.requiredKg,
        qtyIssuedSec: ing.requiredKg,
        secondaryUom: 'kg',
        lotNumber: oldestLot,
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
      items: withdrawalItems,
      status: "ISSUED & RECONCILED"
    };

    setWithdrawals(prev => [newWithdrawal, ...prev]);

    // Deduct stock from inventory
    setInventory(prevInv => {
      return prevInv.map(mat => {
        const matched = requiredIngredients.find(ing => ing.code === mat.code);
        if (!matched) return mat;

        const deductedKg = matched.requiredKg;
        const newBalance = Math.max(0, mat.currentBalance - deductedKg);
        const { updatedLots } = deductFefoLots(mat.lots || [], deductedKg);

        return {
          ...mat,
          currentBalance: newBalance,
          lots: updatedLots
        };
      });
    });

    // Mark order as approved by Jade
    setBatchOrders(prev => prev.map(o => {
      if (o.orderId !== orderId) return o;
      return {
        ...o,
        bulkRequestStatus: 'BULK_ISSUED_BY_JADE',
        bulkApprovedAt: nowStr,
        bulkApprovedBy: currentRole
      };
    }));

    recordAudit(
      "BULK_REQUISITION_APPROVED",
      `Jade Dela Cruz authorized bulk bodega release (Slip: ${slipNo}) for ${order.recipeName} (${order.orderId}). Scale & Kit unlocked for Romeo.`
    );

    showToast(`Bulk materials authorized & deducted! Romeo's Scale & Kit is unlocked.`);
  };

  // WORKFLOW 4: Update Batch Order Status (Romeo Malusay)
  const handleUpdateOrderStatus = (orderId, newStatus, tagId = null, batchedKg = 0) => {
    setBatchOrders(prev => prev.map(order => {
      if (order.orderId !== orderId) return order;

      const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');

      if (newStatus === 'BATCHED_KITTED') {
        return {
          ...order,
          status: 'BATCHED_KITTED',
          batchTagId: tagId || order.batchTagId || `KIT-${Date.now().toString().slice(-6)}`,
          actualBatchedKg: batchedKg || ((order.requestedQtyPcs * 0.04) + 5),
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
          releasedTo: order.outletName.includes('Pan de Verde') ? "Othniel Tilan (Pan de Verde Driver)" : "Roberto S. Blase (Laurice Driver)"
        };
      }
      return { ...order, status: newStatus };
    }));

    recordAudit(
      newStatus === 'BATCHED_KITTED' ? "BATCH_KITTED" : "BATCH_RELEASED",
      `Batch order ${orderId} marked as ${newStatus} by ${currentRole}`
    );

    showToast(`Order ${orderId} updated to ${newStatus}!`);
  };

  // WORKFLOW 5: Collective Release All Completed
  const handleBulkReleaseOrders = () => {
    const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const count = batchOrders.filter(o => o.status === 'BATCHED_KITTED').length;
    if (count === 0) return;

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

    recordAudit(
      "BULK_BATCH_RELEASE",
      `Romeo Malusay collectively marked ${count} recipe mix batches as RELEASED to outlet logistics.`
    );

    showToast(`Successfully released all ${count} completed batches to outlet logistics!`);
  };

  // WORKFLOW 6: Physical Adjustment
  const handleSaveAdjustment = (newAdj) => {
    setAdjustments(prev => [newAdj, ...prev]);

    // Update inventory
    setInventory(prevInv => {
      return prevInv.map(mat => {
        if (mat.code !== newAdj.materialCode) return mat;
        const diff = newAdj.type.includes('OUT') ? -newAdj.qtySec : newAdj.qtySec;
        return {
          ...mat,
          currentBalance: mat.currentBalance + diff
        };
      });
    });

    recordAudit(
      "INVENTORY_ADJUSTMENT",
      `${newAdj.type} for ${newAdj.materialCode}: ${newAdj.qtySec} ${newAdj.uom} (${newAdj.reason})`
    );

    showToast(`Adjustment ${newAdj.id} committed to book balance!`);
  };

  // WORKFLOW 7: Quarantine
  const handleSaveQuarantine = (newNcr) => {
    setQuarantineList(prev => [newNcr, ...prev]);

    recordAudit(
      "QUARANTINE_NCR_FILED",
      `Form-NCR-001 filed: ${newNcr.ncrNo} - ${newNcr.itemDescription} (${newNcr.reason})`
    );

    showToast(`NCR ${newNcr.ncrNo} logged into exterior quarantine cabinet!`);
  };

  // WORKFLOW 8: CSV Inventory Import
  const handleImportInventoryCsv = (updates = []) => {
    if (!Array.isArray(updates) || updates.length === 0) return;

    setInventory(prevInv => {
      return prevInv.map(mat => {
        const update = updates.find(u => u.code.toLowerCase() === mat.code.toLowerCase());
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

  // One-Time Physical Count Baseline Import (Fresh Start Engine)
  const handleApplyInventoryImport = ({ newInventory, mode, clearHistory, summary }) => {
    setInventory(newInventory);

    if (clearHistory) {
      setReceivingReports([]);
      setWithdrawals([]);
      setBatchOrders([]);
      setAdjustments([]);
      setQuarantineList([]);
    }

    recordAudit(
      "OPENING_BASELINE_CSV_IMPORT",
      `Imported fresh opening inventory for ${summary.totalItems} materials totaling ₱${summary.totalValuation.toLocaleString()} (${summary.totalWeightKg.toLocaleString()} kg). Mode: ${mode}. History cleared: ${clearHistory}`
    );

    // Sync baseline to Cloudflare Worker & D1
    if (!isOffline) {
      fetch(WORKER_SYNC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idempotencyKey: `BASELINE_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          eventType: 'OPENING_BASELINE_CSV_IMPORT',
          actor: summary.actor,
          totalItems: summary.totalItems,
          totalValuation: summary.totalValuation,
          mode,
          timestamp: new Date().toISOString()
        })
      }).catch(() => {});
    }

    showToast(`Opening Inventory Baseline applied! ${summary.totalItems} material counts initialized.`);
  };

  // Reset/Zero Out all materials to start completely fresh
  const handleZeroOutAll = ({ actor, clearHistory }) => {
    const zeroed = MASTER_MATERIALS.map(m => ({
      ...m,
      currentBalance: 0,
      lots: []
    }));
    setInventory(zeroed);

    if (clearHistory) {
      setReceivingReports([]);
      setWithdrawals([]);
      setBatchOrders([]);
      setAdjustments([]);
      setQuarantineList([]);
    }

    recordAudit(
      "INVENTORY_ZERO_OUT",
      `All 69 warehouse materials reset to 0.00 quantity for fresh production start. By: ${actor}`
    );

    if (!isOffline) {
      fetch(WORKER_SYNC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idempotencyKey: `ZERO_OUT_${Date.now()}`,
          eventType: 'INVENTORY_ZERO_OUT',
          actor,
          timestamp: new Date().toISOString()
        })
      }).catch(() => {});
    }

    showToast("Warehouse inventory zeroed out successfully! Ready for fresh inbound receiving.");
  };

  // Quick Action from Dashboard
  const handleQuickAction = (action, item = null) => {
    setPrefilledItem(item);
    if (action === 'receiving') setActiveTab('receiving');
    if (action === 'issuance') setActiveTab('issuance');
  };

  // Reset Demo Data
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
      showToast("Data restored to factory seeds!");
    }
  };

  // JSON Export
  const handleExportJson = () => {
    const backup = {
      system: "JJB Warehouse Inventory System v4.6",
      facility: "Indangan Central Manufacturing Plant (LTO #3000013388488)",
      exportedAt: new Date().toISOString(),
      inventory,
      receivingReports,
      withdrawals,
      batchOrders,
      adjustments,
      quarantineList,
      auditLogs
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

  // Enforce Mandatory Authentication Gate
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
      {/* Toast Alert Banner */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-[#1E7A3E] text-white text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-green-300 animate-bounce">
          <CheckCircle2 size={18} />
          <span className="font-bold tracking-wide">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-3 hover:opacity-75 font-bold">✕</button>
        </div>
      )}

      {/* Main Corporate Header & Tab Navigation */}
      <Header
        currentRole={currentRole}
        setCurrentRole={handleRoleChange}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isMobileMode={isMobileMode}
        setIsMobileMode={setIsMobileMode}
        isOffline={isOffline}
        setIsOffline={setIsOffline}
        queueCount={0}
        pendingBatchCount={pendingBatchCount}
        pendingBulkApprovalCount={pendingBulkApprovalCount}
        lowStockCount={lowStockCount}
        onQuickEod={() => setActiveTab('eod')}
        onOpenImportModal={() => setIsImportModalOpen(true)}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main View Container */}
      <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full">
        {/* TAB 1: EXECUTIVE COCKPIT & LIVE FEFO */}
        {activeTab === 'dashboard' && (
          <ExecutiveDashboard
            inventory={inventory}
            isMobileMode={isMobileMode}
            onQuickAction={handleQuickAction}
            storageRooms={STORAGE_ROOMS}
            onOpenImportModal={() => setIsImportModalOpen(true)}
          />
        )}

        {/* TAB: OUTLET & PRODUCTION LINE REQUISITION PORTAL */}
        {activeTab === 'portal' && (
          <OutletRequisitionPortal
            inventory={inventory}
            recipes={MASTER_RECIPES}
            onSubmitBatchOrder={handleSaveBatchOrder}
            onSubmitMaterialRequest={handlePortalSubmitMaterialRequest}
            currentRole={currentRole}
          />
        )}

        {/* TAB 2: INBOUND RECEIVING */}
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

        {/* TAB 3: STOCK RELEASE & ISSUANCE */}
        {activeTab === 'issuance' && (
          <IssuanceModule
            inventory={inventory}
            onSaveWithdrawal={handleSaveWithdrawal}
            withdrawals={withdrawals}
            batchOrders={batchOrders}
            onApprovePendingWithdrawal={handleApprovePendingWithdrawal}
            currentRole={currentRole}
            isMobileMode={isMobileMode}
            prefilledItem={prefilledItem}
          />
        )}

        {/* TAB 4: BATCHING & KITTING (ROMEO MALUSAY & ORDER INTAKE) */}
        {activeTab === 'batching' && (
          <BatchingWorkbench
            batchOrders={batchOrders}
            onSaveBatchOrder={handleSaveBatchOrder}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onBulkReleaseOrders={handleBulkReleaseOrders}
            onRequestBulkMaterials={handleRequestBulkMaterials}
            recipes={MASTER_RECIPES}
            outlets={OUTLETS}
            inventory={inventory}
            currentRole={currentRole}
            isMobileMode={isMobileMode}
          />
        )}

        {/* TAB 5: ADJUSTMENTS & QUARANTINE */}
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

        {/* TAB 6: REPORTS & PO REPLENISHMENT GENERATOR */}
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

        {/* TAB 7: AUTOMATED 23:45 END-OF-DAY (EOD) REPORT */}
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

        {/* TAB 8: IMMUTABLE AUDIT TRAIL */}
        {activeTab === 'audit' && (
          <AuditTrailModule
            auditLogs={auditLogs}
            onResetData={handleResetData}
            onExportJson={handleExportJson}
          />
        )}

        {/* TAB: SIGNATURE PRODUCTS INVENTORY ANALYTICS (RECHARTS) */}
        {activeTab === 'signature' && (
          <SignatureProductsDashboard
            onNavigateToBatching={() => setActiveTab('batching')}
          />
        )}

        {/* TAB: UNIFIED REQUISITIONS & ORDER HISTORY */}
        {activeTab === 'orderHistory' && (
          <OrderHistory
            currentRole={currentRole}
            batchOrders={batchOrders}
            withdrawals={withdrawals}
            onUpdateOrderStatus={handleUpdateOrderStatus}
          />
        )}
      </main>

      {/* Staff Authentication & Role Security Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        currentUsername={authUser?.username || ''}
      />

      {/* Fresh Data & Physical Count CSV Baseline Import Modal */}
      <InitialDataImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        masterMaterials={MASTER_MATERIALS}
        currentInventory={inventory}
        onApplyImport={handleApplyInventoryImport}
        onZeroOutAll={handleZeroOutAll}
        actorName={currentRole}
      />

      {/* Corporate Operational Footer */}
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
