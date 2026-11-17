import { FileSpreadsheet, Lock, Menu, X } from 'lucide-react';
import { MotionConfig } from 'motion/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CrashCartView } from './components/CrashCartView';
import { DataReportModal } from './components/DataReportModal';
import { EnvironmentalRoundView } from './components/EnvironmentalRoundView';
import { InventoryModuleView } from './components/InventoryModuleView';
import { IvMedsModuleView } from './components/IvMedsModuleView';
import { LoginGateView } from './components/LoginGateView';
import { MaintenanceFollowUpView } from './components/MaintenanceFollowUpView';
import { OverviewScheduleView } from './components/OverviewScheduleView';
import { OxygenCylinderView } from './components/OxygenCylinderView';
import { PharmacyFormsView } from './components/PharmacyFormsView';
import { type NavSectionId, Sidebar } from './components/Sidebar';
import { UserManagementView } from './components/UserManagementView';
import { useAuth } from './context/AuthContext';
import { CORE_CATEGORIES } from './data/initialWardData';
import { createInitialIvMedsAuditMeta } from './data/ivMedsSeed';
import { useWardStore } from './hooks/useWardStore';
import { TASK_MODULE_DEFINITIONS, type TaskModuleKey } from './types/auth';
import {
  daysBetween,
  formatShortDate,
  getCylinderPressureState,
  getExpiryStatus,
  getTaskDueState,
  getTodayIso,
  isItemAttentionNeeded,
} from './utils/dateUtils';

export default function App() {
  const {
    accessStatus,
    userAccess,
    isAdmin,
    signOutUser,
    getTaskAccess,
    getInventoryAccess,
    canViewTaskModule,
    canEditTaskModule,
    canFullTaskModule,
    canViewInventory,
    canEditInventory,
    canFullInventory,
    isScheduleTaskAllowed,
    canExportBackup,
    canAddCustomInventory,
  } = useAuth();

  const {
    data,
    setDefaultInspector,
    setWardName,
    completeTaskAndAdvance,
    reopenTask,
    addTask,
    deleteTask,
    addCustomCategory,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    verifyInventoryItem,
    addEquipmentMaintenanceLog,
    updateEquipmentMaintenanceLog,
    deleteEquipmentMaintenanceLog,
    syncEquipmentToMaintenanceTickets,
    updateEnvironmentalCheck,
    addEnvironmentalCheck,
    setEnvironmentalResponse,
    setEnvironmentalGroupResponse,
    deleteEnvironmentalCheck,
    updateEnvironmentalRoundMeta,
    addMaintenanceTicket,
    updateMaintenanceTicketStatus,
    deleteMaintenanceTicket,
    logOxygenCylinderCheck,
    updateOxygenCylinder,
    addOxygenCylinder,
    deleteOxygenCylinder,
    updateCylinderSchedule,
    updateCylinderWeekDate,
    updateCylinderWeekStaff,
    copyCylinderWeek1StaffToAll,
    updateCylinderWeekRecord,
    updateCrashCart,
    updateCrashCartItemSlot,
    addCrashCart,
    updateCadForm,
    updateWeeklyStockForm,
    updateMonthlyStoreForm,
    updatePharmacyRequestForm,
    addCustomRequestCatalogItem,
    deleteCustomRequestCatalogItem,
    setAutoSyncNearExpiry,
    resyncNearExpiry,
    updateTransferBagMeta,
    updateIvMedsAuditMeta,
    updateSectionMeta,
    resyncIvMedsFromForms,
    importBackupData,
    markBackupDone,
    resetToInitialData,
  } = useWardStore();

  const today = getTodayIso();
  const [activeNav, setActiveNav] = useState<NavSectionId>('schedule');
  const [equipmentTabOnOpen, setEquipmentTabOnOpen] = useState<'inventory' | 'maintenance'>(
    'inventory'
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [newCatLabel, setNewCatLabel] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  const allCategories = useMemo(
    () => [...CORE_CATEGORIES, ...data.customCategories],
    [data.customCategories]
  );

  const visibleTasks = useMemo(
    () => data.tasks.filter((t) => isScheduleTaskAllowed(t.id)),
    [data.tasks, isScheduleTaskAllowed]
  );

  const isNavAllowed = useCallback(
    (nav: NavSectionId) => {
      if (nav === 'users') return isAdmin;
      if (nav.startsWith('inv:')) {
        const catId = nav.slice(4);
        return allCategories.some((c) => c.id === catId) && canViewInventory(catId);
      }
      return canViewTaskModule(nav as TaskModuleKey);
    },
    [isAdmin, allCategories, canViewInventory, canViewTaskModule]
  );

  const firstAllowedNav = useMemo<NavSectionId | null>(() => {
    const firstTask = TASK_MODULE_DEFINITIONS.find((m) => canViewTaskModule(m.id));
    if (firstTask) return firstTask.id;
    const firstCat = allCategories.find((c) => canViewInventory(c.id));
    if (firstCat) return `inv:${firstCat.id}`;
    if (isAdmin) return 'users';
    return null;
  }, [canViewTaskModule, allCategories, canViewInventory, isAdmin]);

  useEffect(() => {
    if (accessStatus !== 'authorized') return;
    if (!isNavAllowed(activeNav) && firstAllowedNav) {
      setActiveNav(firstAllowedNav);
    }
  }, [accessStatus, activeNav, isNavAllowed, firstAllowedNav]);

  // Live operational counters for sidebar and overview strip
  const metrics = useMemo(() => {
    const overdueTaskCount = visibleTasks.filter((t) => {
      const due = getTaskDueState(t, today);
      return (due.state === 'overdue' || due.state === 'follow-up') && t.status !== 'completed';
    }).length;

    let expiredCount = 0;
    let expiringCount = 0;
    const categoryAlertCounts: Record<string, number> = {};

    for (const item of data.inventory) {
      const exp = getExpiryStatus(item.expiryDate, today);
      if (exp.state === 'expired') expiredCount += 1;
      else if (exp.state === 'expiring-soon') expiringCount += 1;

      if (isItemAttentionNeeded(item, today)) {
        categoryAlertCounts[item.categoryId] = (categoryAlertCounts[item.categoryId] || 0) + 1;
      }
    }

    const envAlertCount = data.environmentalChecks.filter(
      (c) => c.result === 'action-needed'
    ).length;

    const oxygenAlertCount = data.oxygenCylinders.filter((c) => {
      const p = getCylinderPressureState(c);
      const due = daysBetween(c.lastCheckedDate, today) >= 7;
      return p.state === 'critical' || !c.valveAndLeakCheck || !c.securedInRack || due;
    }).length;

    const criticalOxygenCount = data.oxygenCylinders.filter(
      (c) => getCylinderPressureState(c).state === 'critical'
    ).length;

    const openTicketCount = data.maintenanceTickets.filter((t) => t.status !== 'Resolved').length;

    return {
      overdueTaskCount,
      expiredCount,
      expiringCount,
      categoryAlertCounts,
      envAlertCount,
      oxygenAlertCount,
      criticalOxygenCount,
      openTicketCount,
    };
  }, [data, visibleTasks, today]);

  const activeCategory = useMemo(() => {
    if (!activeNav.startsWith('inv:')) return null;
    const catId = activeNav.slice(4);
    return allCategories.find((c) => c.id === catId) || null;
  }, [activeNav, allCategories]);

  const breadcrumbTitle = useMemo(() => {
    if (activeNav === 'users') return 'Users & Access Control';
    if (activeNav === 'schedule') return 'Weekly & Monthly Schedule';
    if (activeNav === 'crash-cart') return 'Crash Cart Weekly Check (Appendix 2)';
    if (activeNav === 'pharmacy-forms') return 'Pharmacy & Store Printable Forms';
    if (activeNav === 'environmental') return 'Environmental Round & Fire Safety';
    if (activeNav === 'oxygen') return 'Weekly Oxygen Cylinders Tool';
    if (activeNav === 'maintenance') return 'Maintenance Follow-Up';
    if (activeCategory) return activeCategory.label;
    return 'Ward Overview';
  }, [activeNav, activeCategory]);

  const activeInspectorName = userAccess?.displayName || data.defaultInspector;

  const handleSelectNav = (nav: NavSectionId) => {
    if (!isNavAllowed(nav)) return;
    setEquipmentTabOnOpen('inventory');
    setActiveNav(nav);
    setMobileMenuOpen(false);
  };

  const handleCreateCustomCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAddCustomInventory || !newCatLabel.trim()) return;
    const createdId = addCustomCategory(newCatLabel.trim(), newCatDesc.trim());
    setNewCatLabel('');
    setNewCatDesc('');
    setShowNewCategoryModal(false);
    setActiveNav(`inv:${createdId}`);
  };

  if (accessStatus !== 'authorized') {
    return (
      <MotionConfig reducedMotion="user">
        <LoginGateView />
      </MotionConfig>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="app-shell-root min-h-screen flex bg-slate-50 text-slate-900">
        {/* Desktop Sidebar */}
        <div className="no-print hidden lg:block shrink-0">
          <Sidebar
            activeNav={activeNav}
            onSelectNav={handleSelectNav}
            wardName={data.wardName}
            categories={allCategories}
            overdueTaskCount={metrics.overdueTaskCount}
            crashCartCount={data.crashCarts.length}
            categoryAlertCounts={metrics.categoryAlertCounts}
            envAlertCount={metrics.envAlertCount}
            oxygenAlertCount={metrics.oxygenAlertCount}
            openTicketCount={metrics.openTicketCount}
            onOpenNewCategory={() => {
              if (canAddCustomInventory) setShowNewCategoryModal(true);
            }}
            isAdmin={isAdmin}
            canViewTaskModule={canViewTaskModule}
            canViewInventory={canViewInventory}
            canAddCustomInventory={canAddCustomInventory}
            userDisplayName={userAccess?.displayName}
            userEmail={userAccess?.email}
            onSignOut={() => void signOutUser()}
          />
        </div>

        {/* Mobile / Narrow Window Drawer */}
        {mobileMenuOpen && (
          <div className="no-print fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-slate-900/40"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative z-10 flex">
              <Sidebar
                activeNav={activeNav}
                onSelectNav={handleSelectNav}
                wardName={data.wardName}
                categories={allCategories}
                overdueTaskCount={metrics.overdueTaskCount}
                crashCartCount={data.crashCarts.length}
                categoryAlertCounts={metrics.categoryAlertCounts}
                envAlertCount={metrics.envAlertCount}
                oxygenAlertCount={metrics.oxygenAlertCount}
                openTicketCount={metrics.openTicketCount}
                onOpenNewCategory={() => {
                  setMobileMenuOpen(false);
                  if (canAddCustomInventory) setShowNewCategoryModal(true);
                }}
                isAdmin={isAdmin}
                canViewTaskModule={canViewTaskModule}
                canViewInventory={canViewInventory}
                canAddCustomInventory={canAddCustomInventory}
                userDisplayName={userAccess?.displayName}
                userEmail={userAccess?.email}
                onSignOut={() => void signOutUser()}
              />
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMobileMenuOpen(false)}
                className="m-3 p-2 h-9 w-9 bg-white rounded-md text-slate-700 shadow"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Main Workspace */}
        <div className="app-shell-main-wrap flex-1 min-w-0 flex flex-col">
          {/* Top Header Bar */}
          <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-8 sticky top-0 z-30">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                aria-label="Open navigation"
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-1.5 text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2 text-sm min-w-0">
                <span className="text-slate-500 whitespace-nowrap hidden sm:inline">
                  Ward Operations
                </span>
                <span className="text-slate-300 hidden sm:inline" aria-hidden="true">
                  /
                </span>
                <h1 className="font-semibold text-slate-900 truncate">{breadcrumbTitle}</h1>
              </div>
            </div>

            <div className="flex items-center gap-6 shrink-0">
              <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 whitespace-nowrap">
                <span className="font-mono tabular-nums">{formatShortDate(today)}</span>
                <span aria-hidden="true">·</span>
                <span>{activeInspectorName}</span>
                <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase rounded bg-slate-100 text-slate-700">
                  {isAdmin ? 'Admin' : 'Staff'}
                </span>
              </div>

              {(isAdmin || canExportBackup) && (
                <button
                  type="button"
                  onClick={() => setReportModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-teal-700" />
                  Reports &amp; Backup
                </button>
              )}
            </div>
          </header>

          {/* Active View Content */}
          <main className="flex-1 p-6 max-w-[1380px] w-full mx-auto">
            {!firstAllowedNav && (
              <div className="bg-white border border-slate-200 rounded-lg p-12 text-center max-w-lg mx-auto mt-10">
                <div className="w-11 h-11 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mx-auto mb-3">
                  <Lock className="w-5 h-5" />
                </div>
                <h2 className="text-base font-semibold text-slate-900">
                  No Tasks or Inventories Assigned
                </h2>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  Your account is active, but no ward task modules or inventory categories have
                  been enabled for you yet. Contact the Ward Administrator to assign access.
                </p>
              </div>
            )}

            {activeNav === 'users' && isAdmin && (
              <UserManagementView categories={allCategories} tasks={data.tasks} />
            )}

            {activeNav === 'schedule' && canViewTaskModule('schedule') && (
              <OverviewScheduleView
                tasks={visibleTasks}
                defaultInspector={activeInspectorName}
                expiringCount={metrics.expiringCount}
                expiredCount={metrics.expiredCount}
                openTicketsCount={metrics.openTicketCount}
                criticalOxygenCount={metrics.criticalOxygenCount}
                permission={getTaskAccess('schedule')}
                canNavigateBloodTrolley={canViewInventory('blood-trolley')}
                canNavigateOxygen={canViewTaskModule('oxygen')}
                canNavigateMaintenance={canViewTaskModule('maintenance')}
                onCompleteTask={(taskId, inspector, outcome, notes) => {
                  if (!canEditTaskModule('schedule') || !isScheduleTaskAllowed(taskId)) return;
                  completeTaskAndAdvance(taskId, inspector, outcome, notes);
                }}
                onReopenTask={(taskId) => {
                  if (!canEditTaskModule('schedule') || !isScheduleTaskAllowed(taskId)) return;
                  reopenTask(taskId);
                }}
                onAddTask={(task) => {
                  if (!canFullTaskModule('schedule')) return;
                  addTask(task);
                }}
                onDeleteTask={(taskId) => {
                  if (!canFullTaskModule('schedule') || !isScheduleTaskAllowed(taskId)) return;
                  deleteTask(taskId);
                }}
                onNavigate={handleSelectNav}
              />
            )}

            {activeNav === 'crash-cart' && canViewTaskModule('crash-cart') && (
              <CrashCartView
                carts={data.crashCarts}
                defaultInspector={activeInspectorName}
                permission={getTaskAccess('crash-cart')}
                onUpdateCart={(cartId, patch) => {
                  if (!canEditTaskModule('crash-cart')) return;
                  updateCrashCart(cartId, patch);
                }}
                onUpdateSlot={(cartId, itemId, slotIdx, value) => {
                  if (!canEditTaskModule('crash-cart')) return;
                  updateCrashCartItemSlot(cartId, itemId, slotIdx, value);
                }}
                onAddCart={(defibLabel) => {
                  if (!canFullTaskModule('crash-cart')) return '';
                  return addCrashCart(defibLabel);
                }}
              />
            )}

            {activeNav === 'pharmacy-forms' && canViewTaskModule('pharmacy-forms') && (
              <PharmacyFormsView
                forms={data.pharmacyForms}
                crashCarts={data.crashCarts}
                inventory={data.inventory}
                wardName={data.wardName}
                defaultInspector={activeInspectorName}
                permission={getTaskAccess('pharmacy-forms')}
                onUpdateCad={(patch) => {
                  if (!canEditTaskModule('pharmacy-forms')) return;
                  updateCadForm(patch);
                }}
                onUpdateWeeklyForm={(formId, patch) => {
                  if (!canEditTaskModule('pharmacy-forms')) return;
                  updateWeeklyStockForm(formId, patch);
                }}
                onUpdateMonthlyStore={(patch) => {
                  if (!canEditTaskModule('pharmacy-forms')) return;
                  updateMonthlyStoreForm(patch);
                }}
                onUpdateRequestForm={(patch) => {
                  if (!canEditTaskModule('pharmacy-forms')) return;
                  updatePharmacyRequestForm(patch);
                }}
                onAddRequestCatalogItem={(item) => {
                  if (!canFullTaskModule('pharmacy-forms')) {
                    return { id: '', ...item, isCustom: true };
                  }
                  return addCustomRequestCatalogItem(item);
                }}
                onDeleteRequestCatalogItem={(itemId) => {
                  if (!canFullTaskModule('pharmacy-forms')) return;
                  deleteCustomRequestCatalogItem(itemId);
                }}
                onToggleAutoSyncNearExpiry={(enabled) => {
                  if (!canEditTaskModule('pharmacy-forms')) return;
                  setAutoSyncNearExpiry(enabled);
                }}
                onResyncNearExpiry={() => {
                  if (!canEditTaskModule('pharmacy-forms')) return;
                  resyncNearExpiry();
                }}
              />
            )}

            {activeCategory &&
              activeCategory.id === 'iv-meds' &&
              canViewInventory('iv-meds') && (
                <IvMedsModuleView
                  key={activeCategory.id}
                  category={activeCategory}
                  items={data.inventory}
                  auditMeta={data.ivMedsAuditMeta || createInitialIvMedsAuditMeta(today)}
                  monthlyTask={data.tasks.find((t) => t.id === 'tsk-08')}
                  wardName={data.wardName}
                  defaultInspector={activeInspectorName}
                  permission={getInventoryAccess('iv-meds')}
                  onAddItem={(item) => {
                    if (!canFullInventory('iv-meds')) return;
                    addInventoryItem(item);
                  }}
                  onUpdateItem={(itemId, patch) => {
                    if (!canEditInventory('iv-meds')) return;
                    updateInventoryItem(itemId, patch);
                  }}
                  onDeleteItem={(itemId) => {
                    if (!canFullInventory('iv-meds')) return;
                    deleteInventoryItem(itemId);
                  }}
                  onVerifyItem={(itemId, inspector) => {
                    if (!canEditInventory('iv-meds')) return;
                    verifyInventoryItem(itemId, inspector);
                  }}
                  onUpdateAuditMeta={(patch) => {
                    if (!canEditInventory('iv-meds')) return;
                    updateIvMedsAuditMeta(patch);
                  }}
                  onResyncFromForms={() => {
                    if (!canEditInventory('iv-meds')) return;
                    resyncIvMedsFromForms();
                  }}
                  onCompleteMonthlyTask={
                    canEditTaskModule('schedule') && isScheduleTaskAllowed('tsk-08')
                      ? completeTaskAndAdvance
                      : undefined
                  }
                />
              )}

            {activeCategory &&
              activeCategory.id !== 'iv-meds' &&
              canViewInventory(activeCategory.id) && (
                <InventoryModuleView
                  key={`${activeCategory.id}-${equipmentTabOnOpen}`}
                  category={activeCategory}
                  items={data.inventory}
                  wardName={data.wardName}
                  defaultInspector={activeInspectorName}
                  permission={getInventoryAccess(activeCategory.id)}
                  transferBagMeta={data.transferBagMeta}
                  onUpdateTransferBagMeta={(patch) => {
                    if (!canEditInventory(activeCategory.id)) return;
                    updateTransferBagMeta(patch);
                  }}
                  sectionMeta={data.sectionMeta?.[activeCategory.id]}
                  onUpdateSectionMeta={(patch) => {
                    if (!canEditInventory(activeCategory.id)) return;
                    updateSectionMeta(activeCategory.id, patch);
                  }}
                  onAddItem={(item) => {
                    if (!canFullInventory(activeCategory.id)) return;
                    addInventoryItem(item);
                  }}
                  onUpdateItem={(itemId, patch) => {
                    if (!canEditInventory(activeCategory.id)) return;
                    updateInventoryItem(itemId, patch);
                  }}
                  onDeleteItem={(itemId) => {
                    if (!canFullInventory(activeCategory.id)) return;
                    deleteInventoryItem(itemId);
                  }}
                  onVerifyItem={(itemId, inspector) => {
                    if (!canEditInventory(activeCategory.id)) return;
                    verifyInventoryItem(itemId, inspector);
                  }}
                  equipmentMaintenanceLogs={data.equipmentMaintenanceLogs}
                  onAddEquipmentMaintenanceLog={(entry, syncStatus) => {
                    if (!canFullInventory(activeCategory.id)) return;
                    addEquipmentMaintenanceLog(entry, syncStatus);
                  }}
                  onUpdateEquipmentMaintenanceLog={(entryId, patch, syncStatus) => {
                    if (!canEditInventory(activeCategory.id)) return;
                    updateEquipmentMaintenanceLog(entryId, patch, syncStatus);
                  }}
                  onDeleteEquipmentMaintenanceLog={(entryId) => {
                    if (!canFullInventory(activeCategory.id)) return;
                    deleteEquipmentMaintenanceLog(entryId);
                  }}
                  initialEquipmentTab={
                    activeCategory.id === 'equipment' ? equipmentTabOnOpen : 'inventory'
                  }
                />
              )}

            {activeNav === 'environmental' && canViewTaskModule('environmental') && (
              <EnvironmentalRoundView
                checks={data.environmentalChecks}
                maintenanceTickets={
                  canViewTaskModule('maintenance') ? data.maintenanceTickets : []
                }
                defaultInspector={activeInspectorName}
                roundMeta={data.environmentalRoundMeta}
                permission={getTaskAccess('environmental')}
                onUpdateRoundMeta={(patch) => {
                  if (!canEditTaskModule('environmental')) return;
                  updateEnvironmentalRoundMeta(patch);
                }}
                onSetResponse={(checkId, response, inspector, notes) => {
                  if (!canEditTaskModule('environmental')) return;
                  setEnvironmentalResponse(checkId, response, inspector, notes);
                }}
                onSetGroupResponse={(groupId, response) => {
                  if (!canEditTaskModule('environmental')) return;
                  setEnvironmentalGroupResponse(groupId, response);
                }}
                onUpdateCheck={(checkId, result, inspector, measuredValue, notes, createTicket) => {
                  if (!canEditTaskModule('environmental')) return;
                  updateEnvironmentalCheck(
                    checkId,
                    result,
                    inspector,
                    measuredValue,
                    notes,
                    createTicket
                  );
                }}
                onAddCheck={(check) => {
                  if (!canFullTaskModule('environmental')) return;
                  addEnvironmentalCheck(check);
                }}
                onDeleteCheck={(checkId) => {
                  if (!canFullTaskModule('environmental')) return;
                  deleteEnvironmentalCheck(checkId);
                }}
                onOpenMaintenance={
                  canViewTaskModule('maintenance') ? () => setActiveNav('maintenance') : undefined
                }
              />
            )}

            {activeNav === 'oxygen' && canViewTaskModule('oxygen') && (
              <OxygenCylinderView
                cylinders={data.oxygenCylinders}
                logs={data.oxygenLogs}
                defaultInspector={activeInspectorName}
                cylinderSchedule={data.cylinderSchedule}
                permission={getTaskAccess('oxygen')}
                onUpdateSchedule={(patch) => {
                  if (!canEditTaskModule('oxygen')) return;
                  updateCylinderSchedule(patch);
                }}
                onUpdateWeekDate={(weekNumber, checkDate) => {
                  if (!canEditTaskModule('oxygen')) return;
                  updateCylinderWeekDate(weekNumber, checkDate);
                }}
                onUpdateWeekStaff={(weekNumber, assignedStaff) => {
                  if (!canEditTaskModule('oxygen')) return;
                  updateCylinderWeekStaff(weekNumber, assignedStaff);
                }}
                onCopyWeek1StaffToAll={() => {
                  if (!canEditTaskModule('oxygen')) return;
                  copyCylinderWeek1StaffToAll();
                }}
                onUpdateWeekRecord={(weekNumber, cylinderId, recordPatch) => {
                  if (!canEditTaskModule('oxygen')) return;
                  updateCylinderWeekRecord(weekNumber, cylinderId, recordPatch);
                }}
                onLogCheck={(cylinderId, payload) => {
                  if (!canEditTaskModule('oxygen')) return;
                  logOxygenCylinderCheck(cylinderId, payload);
                }}
                onUpdateCylinder={(cylinderId, patch) => {
                  if (!canEditTaskModule('oxygen')) return;
                  updateOxygenCylinder(cylinderId, patch);
                }}
                onAddCylinder={(cyl) => {
                  if (!canFullTaskModule('oxygen')) return;
                  addOxygenCylinder(cyl);
                }}
                onDeleteCylinder={(cylinderId) => {
                  if (!canFullTaskModule('oxygen')) return;
                  deleteOxygenCylinder(cylinderId);
                }}
              />
            )}

            {activeNav === 'maintenance' && canViewTaskModule('maintenance') && (
              <MaintenanceFollowUpView
                tickets={data.maintenanceTickets}
                wardName={data.wardName}
                defaultInspector={activeInspectorName}
                permission={getTaskAccess('maintenance')}
                equipmentItems={
                  canViewInventory('equipment')
                    ? data.inventory.filter((it) => it.categoryId === 'equipment')
                    : []
                }
                onAddTicket={(ticket, options) => {
                  if (!canFullTaskModule('maintenance')) return;
                  addMaintenanceTicket(ticket, options);
                }}
                onUpdateStatus={(ticketId, status) => {
                  if (!canEditTaskModule('maintenance')) return;
                  updateMaintenanceTicketStatus(ticketId, status);
                }}
                onDeleteTicket={(ticketId) => {
                  if (!canFullTaskModule('maintenance')) return;
                  deleteMaintenanceTicket(ticketId);
                }}
                onSyncEquipmentLogs={() => {
                  if (!canEditTaskModule('maintenance')) return;
                  syncEquipmentToMaintenanceTickets();
                }}
                onOpenEquipmentRepairLog={
                  canViewInventory('equipment')
                    ? () => {
                        setEquipmentTabOnOpen('maintenance');
                        setActiveNav('inv:equipment');
                      }
                    : undefined
                }
                onOpenEnvironmentalRound={
                  canViewTaskModule('environmental')
                    ? () => setActiveNav('environmental')
                    : undefined
                }
              />
            )}
          </main>
        </div>

        {/* Reports, Settings & Backup Modal */}
        <DataReportModal
          open={reportModalOpen}
          onClose={() => setReportModalOpen(false)}
          data={data}
          categories={allCategories}
          isAdmin={isAdmin}
          canEditWardProfile={isAdmin}
          canExportBackup={canExportBackup}
          onSetWardName={(name) => {
            if (!isAdmin) return;
            setWardName(name);
          }}
          onSetDefaultInspector={(name) => {
            if (!isAdmin) return;
            setDefaultInspector(name);
          }}
          onImportBackup={(imported) => {
            if (!isAdmin) return;
            importBackupData(imported);
          }}
          onMarkBackupDone={() => {
            if (!isAdmin) return;
            markBackupDone();
          }}
          onResetData={() => {
            if (!isAdmin) return;
            resetToInitialData();
          }}
        />

        {/* Add Custom Ward Area Modal */}
        {canAddCustomInventory && showNewCategoryModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-lg w-full max-w-md shadow-lg">
              <div className="px-5 py-4 border-b border-slate-200">
                <h3 className="text-base font-semibold text-slate-900">
                  Add Custom Inventory Area
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Create an extra ward trolley, cabinet, or stock category
                </p>
              </div>
              <form onSubmit={handleCreateCustomCategory} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Area / Trolley Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newCatLabel}
                    onChange={(e) => setNewCatLabel(e.target.value)}
                    placeholder="e.g., Resuscitation Crash Cart"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={newCatDesc}
                    onChange={(e) => setNewCatDesc(e.target.value)}
                    placeholder="Optional inspection notes..."
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNewCategoryModal(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-md cursor-pointer"
                  >
                    Create Area
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </MotionConfig>
  );
}
