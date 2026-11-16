import { useEffect, useState } from 'react';
import { createInitialCrashCarts } from '../data/crashCartSeed';
import { createInitialWardData } from '../data/initialWardData';
import { createInitialPharmacyForms } from '../data/pharmacyFormsSeed';
import type {
  CadChecklistForm,
  CategoryMeta,
  CrashCartChecklist,
  EnvironmentalCheckItem,
  InventoryItem,
  MaintenanceTicket,
  MonthlyStoreChecklistForm,
  OxygenCheckLog,
  OxygenCylinder,
  PharmacyCatalogItem,
  PharmacyRequestForm,
  RoundCheckResult,
  ScheduleTask,
  TicketStatus,
  WardStoreData,
  WeeklyStockChecklistForm,
  WeeklyStockFormId,
} from '../types/ward';
import { addDaysIso, addMonthsIso, getTodayIso } from '../utils/dateUtils';
import { syncNearExpiryInPharmacyForms } from '../utils/nearExpirySync';

const STORAGE_KEY = 'wardcare_schedule_store_v1';

function loadInitialStore(): WardStoreData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as WardStoreData;
      if (parsed && Array.isArray(parsed.tasks) && Array.isArray(parsed.inventory)) {
        const initial = createInitialWardData();
        const hydratedCrashCarts =
          Array.isArray(parsed.crashCarts) && parsed.crashCarts.length > 0
            ? parsed.crashCarts
            : initial.crashCarts;
        const baseForms = createInitialPharmacyForms();
        const rawPharmacyForms = parsed.pharmacyForms
          ? {
              ...baseForms,
              ...parsed.pharmacyForms,
              weeklyForms: {
                ...baseForms.weeklyForms,
                ...(parsed.pharmacyForms.weeklyForms || {}),
              },
              requestForm: {
                ...baseForms.requestForm,
                ...(parsed.pharmacyForms.requestForm || {}),
              },
              customRequestCatalogItems: Array.isArray(
                parsed.pharmacyForms.customRequestCatalogItems
              )
                ? parsed.pharmacyForms.customRequestCatalogItems
                : [],
            }
          : initial.pharmacyForms;
        return {
          ...initial,
          ...parsed,
          crashCarts: hydratedCrashCarts,
          pharmacyForms: syncNearExpiryInPharmacyForms(rawPharmacyForms, hydratedCrashCarts),
        };
      }
    }
  } catch {
    // Fallback to initial seed data if localStorage is unavailable or malformed
  }
  return createInitialWardData();
}

export function useWardStore() {
  const [data, setData] = useState<WardStoreData>(loadInitialStore);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Ignore storage quota errors cleanly
    }
  }, [data]);

  const setDefaultInspector = (name: string) => {
    setData((prev) => ({ ...prev, defaultInspector: name }));
  };

  const setWardName = (name: string) => {
    setData((prev) => ({ ...prev, wardName: name }));
  };

  // --- Schedule Tasks ---
  const completeTaskAndAdvance = (
    taskId: string,
    inspector: string,
    outcome: 'completed' | 'follow-up',
    notes?: string
  ) => {
    const today = getTodayIso();
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => {
        if (t.id !== taskId) return t;
        if (outcome === 'completed') {
          const nextDue =
            t.frequency === 'weekly' ? addDaysIso(today, 7) : addMonthsIso(today, 1);
          return {
            ...t,
            status: 'completed',
            lastCompletedDate: today,
            lastInspector: inspector || prev.defaultInspector,
            dueDate: nextDue,
            notes: notes !== undefined ? notes : t.notes,
          };
        }
        return {
          ...t,
          status: 'follow-up',
          lastInspector: inspector || prev.defaultInspector,
          notes: notes !== undefined ? notes : t.notes,
        };
      }),
    }));
  };

  const reopenTask = (taskId: string) => {
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, status: 'pending' } : t)),
    }));
  };

  const addTask = (task: Omit<ScheduleTask, 'id'>) => {
    const newTask: ScheduleTask = {
      ...task,
      id: `tsk-${Date.now().toString(36)}`,
    };
    setData((prev) => ({ ...prev, tasks: [newTask, ...prev.tasks] }));
  };

  const deleteTask = (taskId: string) => {
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => t.id !== taskId),
    }));
  };

  // --- Custom Categories ---
  const addCustomCategory = (label: string, description: string) => {
    const slug =
      label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || `cat-${Date.now()}`;
    const newCat: CategoryMeta = {
      id: `custom-${slug}-${Date.now().toString(36).slice(-3)}`,
      label,
      shortLabel: label,
      description: description || 'Custom ward inventory & expiry section.',
      supportsUnitSplit: true,
    };
    setData((prev) => ({
      ...prev,
      customCategories: [...prev.customCategories, newCat],
    }));
    return newCat.id;
  };

  // --- Inventory & Equipment ---
  const addInventoryItem = (item: Omit<InventoryItem, 'id'>) => {
    const newItem: InventoryItem = {
      ...item,
      id: `inv-${Date.now().toString(36)}`,
    };
    setData((prev) => ({ ...prev, inventory: [newItem, ...prev.inventory] }));
  };

  const updateInventoryItem = (itemId: string, patch: Partial<InventoryItem>) => {
    setData((prev) => ({
      ...prev,
      inventory: prev.inventory.map((it) => (it.id === itemId ? { ...it, ...patch } : it)),
    }));
  };

  const deleteInventoryItem = (itemId: string) => {
    setData((prev) => ({
      ...prev,
      inventory: prev.inventory.filter((it) => it.id !== itemId),
    }));
  };

  const verifyInventoryItem = (itemId: string, inspector: string) => {
    const today = getTodayIso();
    setData((prev) => ({
      ...prev,
      inventory: prev.inventory.map((it) =>
        it.id === itemId
          ? {
              ...it,
              lastCheckedDate: today,
              lastCheckedBy: inspector || prev.defaultInspector,
            }
          : it
      ),
    }));
  };

  // --- Environmental Round Checklist ---
  const updateEnvironmentalCheck = (
    checkId: string,
    result: RoundCheckResult,
    inspector: string,
    measuredValue?: string,
    notes?: string,
    createTicket?: boolean
  ) => {
    const today = getTodayIso();
    setData((prev) => {
      const target = prev.environmentalChecks.find((c) => c.id === checkId);
      let nextTickets = prev.maintenanceTickets;

      if (createTicket && result === 'action-needed' && target) {
        const dept = target.section.includes('Fire')
          ? 'Fire Safety'
          : target.section.includes('Cold Chain')
            ? 'Facilities & HVAC'
            : 'Facilities & HVAC';
        const newTicket: MaintenanceTicket = {
          id: `mnt-${Date.now().toString(36)}`,
          title: `Follow-up: ${target.title}`,
          sourceArea: `Environmental Round (${target.location})`,
          unit: target.location.includes('CCU')
            ? 'CCU'
            : target.location.includes('SD')
              ? 'SD'
              : 'All Units',
          department: dept,
          priority: target.section.includes('Fire') ? 'Urgent' : 'Routine',
          status: 'Open',
          reportedDate: today,
          reportedBy: inspector || prev.defaultInspector,
          targetDate: addDaysIso(today, target.section.includes('Fire') ? 2 : 5),
          resolvedDate: null,
          notes: notes || target.notes || 'Raised from ward environmental round.',
        };
        nextTickets = [newTicket, ...prev.maintenanceTickets];
      }

      return {
        ...prev,
        maintenanceTickets: nextTickets,
        environmentalChecks: prev.environmentalChecks.map((c) =>
          c.id === checkId
            ? {
                ...c,
                result,
                lastCheckedDate: today,
                inspector: inspector || prev.defaultInspector,
                measuredValue: measuredValue !== undefined ? measuredValue : c.measuredValue,
                notes: notes !== undefined ? notes : c.notes,
              }
            : c
        ),
      };
    });
  };

  const addEnvironmentalCheck = (check: Omit<EnvironmentalCheckItem, 'id'>) => {
    const newCheck: EnvironmentalCheckItem = {
      ...check,
      id: `env-${Date.now().toString(36)}`,
    };
    setData((prev) => ({
      ...prev,
      environmentalChecks: [...prev.environmentalChecks, newCheck],
    }));
  };

  // --- Maintenance Follow-Up Tickets ---
  const addMaintenanceTicket = (ticket: Omit<MaintenanceTicket, 'id'>) => {
    const newTicket: MaintenanceTicket = {
      ...ticket,
      id: `mnt-${Date.now().toString(36)}`,
    };
    setData((prev) => ({
      ...prev,
      maintenanceTickets: [newTicket, ...prev.maintenanceTickets],
    }));
  };

  const updateMaintenanceTicketStatus = (
    ticketId: string,
    status: TicketStatus,
    notes?: string
  ) => {
    const today = getTodayIso();
    setData((prev) => ({
      ...prev,
      maintenanceTickets: prev.maintenanceTickets.map((tk) =>
        tk.id === ticketId
          ? {
              ...tk,
              status,
              resolvedDate: status === 'Resolved' ? today : null,
              notes: notes !== undefined ? notes : tk.notes,
            }
          : tk
      ),
    }));
  };

  const deleteMaintenanceTicket = (ticketId: string) => {
    setData((prev) => ({
      ...prev,
      maintenanceTickets: prev.maintenanceTickets.filter((tk) => tk.id !== ticketId),
    }));
  };

  // --- Oxygen Cylinder Weekly Checking Tool ---
  const logOxygenCylinderCheck = (
    cylinderId: string,
    payload: {
      pressurePsi: number;
      valveAndLeakCheck: boolean;
      securedInRack: boolean;
      inspector: string;
      notes: string;
    }
  ) => {
    const today = getTodayIso();
    setData((prev) => {
      const cyl = prev.oxygenCylinders.find((c) => c.id === cylinderId);
      if (!cyl) return prev;

      const newLog: OxygenCheckLog = {
        id: `oxl-${Date.now().toString(36)}`,
        cylinderId,
        cylinderCode: cyl.cylinderCode,
        checkedDate: today,
        inspector: payload.inspector || prev.defaultInspector,
        pressurePsi: payload.pressurePsi,
        valvePass: payload.valveAndLeakCheck,
        securedPass: payload.securedInRack,
        notes: payload.notes,
      };

      return {
        ...prev,
        oxygenCylinders: prev.oxygenCylinders.map((c) =>
          c.id === cylinderId
            ? {
                ...c,
                pressurePsi: payload.pressurePsi,
                valveAndLeakCheck: payload.valveAndLeakCheck,
                securedInRack: payload.securedInRack,
                lastCheckedDate: today,
                lastCheckedBy: payload.inspector || prev.defaultInspector,
                notes: payload.notes,
              }
            : c
        ),
        oxygenLogs: [newLog, ...prev.oxygenLogs].slice(0, 100),
      };
    });
  };

  const addOxygenCylinder = (cyl: Omit<OxygenCylinder, 'id'>) => {
    const newCyl: OxygenCylinder = {
      ...cyl,
      id: `ox-${Date.now().toString(36)}`,
    };
    setData((prev) => ({
      ...prev,
      oxygenCylinders: [...prev.oxygenCylinders, newCyl],
    }));
  };

  const deleteOxygenCylinder = (cylinderId: string) => {
    setData((prev) => ({
      ...prev,
      oxygenCylinders: prev.oxygenCylinders.filter((c) => c.id !== cylinderId),
    }));
  };

  // --- Crash Cart Weekly Checklists ---
  const updateCrashCart = (cartId: string, patch: Partial<CrashCartChecklist>) => {
    setData((prev) => {
      const nextCarts = prev.crashCarts.map((c) => (c.id === cartId ? { ...c, ...patch } : c));
      return {
        ...prev,
        crashCarts: nextCarts,
        pharmacyForms: syncNearExpiryInPharmacyForms(prev.pharmacyForms, nextCarts),
      };
    });
  };

  const updateCrashCartItemSlot = (
    cartId: string,
    itemId: string,
    slotIdx: number,
    value: string
  ) => {
    setData((prev) => {
      const nextCarts = prev.crashCarts.map((c) => {
        if (c.id !== cartId) return c;
        return {
          ...c,
          items: c.items.map((it) => {
            if (it.id !== itemId) return it;
            const nextSlots = [...it.slots];
            nextSlots[slotIdx] = value;
            return { ...it, slots: nextSlots };
          }),
        };
      });
      return {
        ...prev,
        crashCarts: nextCarts,
        pharmacyForms: syncNearExpiryInPharmacyForms(prev.pharmacyForms, nextCarts),
      };
    });
  };

  const addCrashCart = (defibLabel: string) => {
    const template = createInitialCrashCarts()[0];
    const cleanLabel = defibLabel.trim().toUpperCase() || 'D';
    const newCart: CrashCartChecklist = {
      ...template,
      id: `cart-${Date.now().toString(36)}`,
      defibLabel: cleanLabel,
      cartTitle: `Crash Cart ${cleanLabel}`,
      lockNumber: '',
      staffNurseComment: '',
      staffNurseName: '',
      supervisorComment: '',
      supervisorName: '',
      headNurseComment: '',
      headNurseName: '',
      staffCommentsContinued: '',
    };
    setData((prev) => {
      const nextCarts = [...prev.crashCarts, newCart];
      return {
        ...prev,
        crashCarts: nextCarts,
        pharmacyForms: syncNearExpiryInPharmacyForms(prev.pharmacyForms, nextCarts),
      };
    });
    return newCart.id;
  };

  // --- Pharmacy & Monthly Store Forms ---
  const updateCadForm = (patch: Partial<CadChecklistForm>) => {
    setData((prev) => {
      const nextForms = {
        ...prev.pharmacyForms,
        cad: { ...prev.pharmacyForms.cad, ...patch },
      };
      return {
        ...prev,
        pharmacyForms: syncNearExpiryInPharmacyForms(nextForms, prev.crashCarts),
      };
    });
  };

  const updateWeeklyStockForm = (
    formId: WeeklyStockFormId,
    patch: Partial<WeeklyStockChecklistForm>
  ) => {
    setData((prev) => {
      const nextForms = {
        ...prev.pharmacyForms,
        weeklyForms: {
          ...prev.pharmacyForms.weeklyForms,
          [formId]: { ...prev.pharmacyForms.weeklyForms[formId], ...patch },
        },
      };
      return {
        ...prev,
        pharmacyForms:
          formId === 'near-expiry'
            ? nextForms
            : syncNearExpiryInPharmacyForms(nextForms, prev.crashCarts),
      };
    });
  };

  const updateMonthlyStoreForm = (patch: Partial<MonthlyStoreChecklistForm>) => {
    setData((prev) => {
      const nextForms = {
        ...prev.pharmacyForms,
        monthlyStore: { ...prev.pharmacyForms.monthlyStore, ...patch },
      };
      return {
        ...prev,
        pharmacyForms: syncNearExpiryInPharmacyForms(nextForms, prev.crashCarts),
      };
    });
  };

  const updatePharmacyRequestForm = (patch: Partial<PharmacyRequestForm>) => {
    setData((prev) => ({
      ...prev,
      pharmacyForms: {
        ...prev.pharmacyForms,
        requestForm: { ...prev.pharmacyForms.requestForm, ...patch },
      },
    }));
  };

  const addCustomRequestCatalogItem = (
    item: Omit<PharmacyCatalogItem, 'id' | 'isCustom'>
  ): PharmacyCatalogItem => {
    const created: PharmacyCatalogItem = {
      id: `custom-cat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      catalog: item.catalog,
      description: item.description.trim(),
      itemCode: item.itemCode.trim(),
      defaultUom: item.defaultUom.trim() || 'Unit',
      isCustom: true,
    };
    setData((prev) => {
      const existing = prev.pharmacyForms.customRequestCatalogItems || [];
      return {
        ...prev,
        pharmacyForms: {
          ...prev.pharmacyForms,
          customRequestCatalogItems: [created, ...existing],
        },
      };
    });
    return created;
  };

  const deleteCustomRequestCatalogItem = (itemId: string) => {
    setData((prev) => {
      const existing = prev.pharmacyForms.customRequestCatalogItems || [];
      return {
        ...prev,
        pharmacyForms: {
          ...prev.pharmacyForms,
          customRequestCatalogItems: existing.filter((it) => it.id !== itemId),
        },
      };
    });
  };

  const setAutoSyncNearExpiry = (enabled: boolean) => {
    setData((prev) => {
      const updated = {
        ...prev.pharmacyForms,
        autoSyncNearExpiry: enabled,
      };
      return {
        ...prev,
        pharmacyForms: enabled
          ? syncNearExpiryInPharmacyForms(updated, prev.crashCarts, true)
          : updated,
      };
    });
  };

  const resyncNearExpiry = () => {
    setData((prev) => ({
      ...prev,
      pharmacyForms: syncNearExpiryInPharmacyForms(prev.pharmacyForms, prev.crashCarts, true),
    }));
  };

  // --- Backup & Reset ---
  const importBackupData = (imported: WardStoreData) => {
    const initial = createInitialWardData();
    const nextCarts =
      Array.isArray(imported.crashCarts) && imported.crashCarts.length > 0
        ? imported.crashCarts
        : initial.crashCarts;
    const baseForms = createInitialPharmacyForms();
    const rawForms = imported.pharmacyForms
      ? {
          ...baseForms,
          ...imported.pharmacyForms,
          weeklyForms: {
            ...baseForms.weeklyForms,
            ...(imported.pharmacyForms.weeklyForms || {}),
          },
          requestForm: {
            ...baseForms.requestForm,
            ...(imported.pharmacyForms.requestForm || {}),
          },
          customRequestCatalogItems: Array.isArray(
            imported.pharmacyForms.customRequestCatalogItems
          )
            ? imported.pharmacyForms.customRequestCatalogItems
            : [],
        }
      : initial.pharmacyForms;
    setData({
      ...initial,
      ...imported,
      crashCarts: nextCarts,
      pharmacyForms: syncNearExpiryInPharmacyForms(rawForms, nextCarts),
      lastBackupDate: getTodayIso(),
    });
  };

  const markBackupDone = () => {
    setData((prev) => ({ ...prev, lastBackupDate: getTodayIso() }));
  };

  const resetToInitialData = () => {
    setData(createInitialWardData());
  };

  return {
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
    updateCadForm,
    updateWeeklyStockForm,
    updateMonthlyStoreForm,
    updatePharmacyRequestForm,
    addCustomRequestCatalogItem,
    deleteCustomRequestCatalogItem,
    setAutoSyncNearExpiry,
    resyncNearExpiry,
    importBackupData,
    markBackupDone,
    resetToInitialData,
  };
}
