import { FileSpreadsheet, Menu, X } from 'lucide-react';
import { MotionConfig } from 'motion/react';
import { useMemo, useState } from 'react';
import { CrashCartView } from './components/CrashCartView';
import { DataReportModal } from './components/DataReportModal';
import { EnvironmentalRoundView } from './components/EnvironmentalRoundView';
import { InventoryModuleView } from './components/InventoryModuleView';
import { MaintenanceFollowUpView } from './components/MaintenanceFollowUpView';
import { OverviewScheduleView } from './components/OverviewScheduleView';
import { OxygenCylinderView } from './components/OxygenCylinderView';
import { type NavSectionId, Sidebar } from './components/Sidebar';
import { CORE_CATEGORIES } from './data/initialWardData';
import { useWardStore } from './hooks/useWardStore';
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
    updateEnvironmentalCheck,
    addEnvironmentalCheck,
    addMaintenanceTicket,
    updateMaintenanceTicketStatus,
    deleteMaintenanceTicket,
    logOxygenCylinderCheck,
    addOxygenCylinder,
    deleteOxygenCylinder,
    updateCrashCart,
    updateCrashCartItemSlot,
    addCrashCart,
    importBackupData,
    markBackupDone,
    resetToInitialData,
  } = useWardStore();

  const today = getTodayIso();
  const [activeNav, setActiveNav] = useState<NavSectionId>('schedule');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [newCatLabel, setNewCatLabel] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  const allCategories = useMemo(
    () => [...CORE_CATEGORIES, ...data.customCategories],
    [data.customCategories]
  );

  // Live operational counters for sidebar and overview strip
  const metrics = useMemo(() => {
    const overdueTaskCount = data.tasks.filter((t) => {
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
  }, [data, today]);

  const activeCategory = useMemo(() => {
    if (!activeNav.startsWith('inv:')) return null;
    const catId = activeNav.slice(4);
    return allCategories.find((c) => c.id === catId) || null;
  }, [activeNav, allCategories]);

  const breadcrumbTitle = useMemo(() => {
    if (activeNav === 'schedule') return 'Weekly & Monthly Schedule';
    if (activeNav === 'crash-cart') return 'Crash Cart Weekly Check (Appendix 2)';
    if (activeNav === 'environmental') return 'Environmental Round & Fire Safety';
    if (activeNav === 'oxygen') return 'Weekly Oxygen Cylinders Tool';
    if (activeNav === 'maintenance') return 'Maintenance Follow-Up';
    if (activeCategory) return activeCategory.label;
    return 'Ward Overview';
  }, [activeNav, activeCategory]);

  const handleSelectNav = (nav: NavSectionId) => {
    setActiveNav(nav);
    setMobileMenuOpen(false);
  };

  const handleCreateCustomCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatLabel.trim()) return;
    const createdId = addCustomCategory(newCatLabel.trim(), newCatDesc.trim());
    setNewCatLabel('');
    setNewCatDesc('');
    setShowNewCategoryModal(false);
    setActiveNav(`inv:${createdId}`);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen flex bg-slate-50 text-slate-900">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block shrink-0">
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
            onOpenNewCategory={() => setShowNewCategoryModal(true)}
          />
        </div>

        {/* Mobile / Narrow Window Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
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
                  setShowNewCategoryModal(true);
                }}
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
        <div className="flex-1 min-w-0 flex flex-col">
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
                <span>{data.defaultInspector}</span>
              </div>

              <button
                type="button"
                onClick={() => setReportModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-teal-700" />
                Reports &amp; Backup
              </button>
            </div>
          </header>

          {/* Active View Content */}
          <main className="flex-1 p-6 max-w-[1380px] w-full mx-auto">
            {activeNav === 'schedule' && (
              <OverviewScheduleView
                tasks={data.tasks}
                defaultInspector={data.defaultInspector}
                expiringCount={metrics.expiringCount}
                expiredCount={metrics.expiredCount}
                openTicketsCount={metrics.openTicketCount}
                criticalOxygenCount={metrics.criticalOxygenCount}
                onCompleteTask={completeTaskAndAdvance}
                onReopenTask={reopenTask}
                onAddTask={addTask}
                onDeleteTask={deleteTask}
                onNavigate={handleSelectNav}
              />
            )}

            {activeNav === 'crash-cart' && (
              <CrashCartView
                carts={data.crashCarts}
                defaultInspector={data.defaultInspector}
                onUpdateCart={updateCrashCart}
                onUpdateSlot={updateCrashCartItemSlot}
                onAddCart={addCrashCart}
              />
            )}

            {activeCategory && (
              <InventoryModuleView
                key={activeCategory.id}
                category={activeCategory}
                items={data.inventory}
                defaultInspector={data.defaultInspector}
                onAddItem={addInventoryItem}
                onUpdateItem={updateInventoryItem}
                onDeleteItem={deleteInventoryItem}
                onVerifyItem={verifyInventoryItem}
              />
            )}

            {activeNav === 'environmental' && (
              <EnvironmentalRoundView
                checks={data.environmentalChecks}
                defaultInspector={data.defaultInspector}
                onUpdateCheck={updateEnvironmentalCheck}
                onAddCheck={addEnvironmentalCheck}
              />
            )}

            {activeNav === 'oxygen' && (
              <OxygenCylinderView
                cylinders={data.oxygenCylinders}
                logs={data.oxygenLogs}
                defaultInspector={data.defaultInspector}
                onLogCheck={logOxygenCylinderCheck}
                onAddCylinder={addOxygenCylinder}
                onDeleteCylinder={deleteOxygenCylinder}
              />
            )}

            {activeNav === 'maintenance' && (
              <MaintenanceFollowUpView
                tickets={data.maintenanceTickets}
                defaultInspector={data.defaultInspector}
                onAddTicket={addMaintenanceTicket}
                onUpdateStatus={updateMaintenanceTicketStatus}
                onDeleteTicket={deleteMaintenanceTicket}
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
          onSetWardName={setWardName}
          onSetDefaultInspector={setDefaultInspector}
          onImportBackup={importBackupData}
          onMarkBackupDone={markBackupDone}
          onResetData={resetToInitialData}
        />

        {/* Add Custom Ward Area Modal */}
        {showNewCategoryModal && (
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
