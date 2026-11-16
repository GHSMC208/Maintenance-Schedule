import { useEffect, useState } from 'react';
import { createInitialCrashCarts } from '../data/crashCartSeed';
import {
  createDefaultSectionPeriodMeta,
  createInitialSectionMeta,
  createInitialStoreStaff,
  createInitialWardData,
} from '../data/initialWardData';
import {
  createInitialIvMedsAuditMeta,
  createInitialIvMedsItems,
} from '../data/ivMedsSeed';
import { createInitialPharmacyForms } from '../data/pharmacyFormsSeed';
import { createInitialStoreItems } from '../data/storeItemsSeed';
import {
  createInitialTransferBagItems,
  createInitialTransferBagMeta,
} from '../data/transferBagSeed';
import type {
  CadChecklistForm,
  CategoryMeta,
  CrashCartChecklist,
  EnvironmentalCheckItem,
  InventoryItem,
  IvMedsAuditMeta,
  MaintenanceTicket,
  MonthlyStoreChecklistForm,
  OxygenCheckLog,
  OxygenCylinder,
  PharmacyCatalogItem,
  PharmacyFormsState,
  PharmacyRequestForm,
  RoundCheckResult,
  ScheduleTask,
  SectionPeriodMeta,
  TicketStatus,
  TransferBagChecklistMeta,
  WardStoreData,
  WeeklyStockChecklistForm,
  WeeklyStockFormId,
} from '../types/ward';
import { addDaysIso, addMonthsIso, getTodayIso } from '../utils/dateUtils';
import { syncPharmacyFormItemsIntoIvMeds } from '../utils/ivMedsSync';
import { syncNearExpiryInPharmacyForms } from '../utils/nearExpirySync';

const STORAGE_KEY = 'wardcare_schedule_store_v1';

function migrateLegacyTransferBagInventory(inventory: InventoryItem[]): InventoryItem[] {
  const tbItems = inventory.filter((it) => it.categoryId === 'transfer-bag');
  const isLegacyThree =
    tbItems.length === 3 &&
    tbItems.every((it) => it.id === 'tb-01' || it.id === 'tb-02' || it.id === 'tb-03') &&
    tbItems.some((it) => it.name.includes('Adult Bag-Valve-Mask'));

  if (!isLegacyThree) return inventory;

  const nonTb = inventory.filter((it) => it.categoryId !== 'transfer-bag');
  return [...nonTb, ...createInitialTransferBagItems(getTodayIso())];
}

function migrateLegacyStoreInventory(
  inventory: InventoryItem[],
  today: string
): InventoryItem[] {
  const storeItems = inventory.filter((it) => it.categoryId === 'store');
  const isLegacyFour =
    storeItems.length === 4 &&
    storeItems.every((it) => ['st-01', 'st-02', 'st-03', 'st-04'].includes(it.id)) &&
    storeItems.some((it) => it.name.includes('Sterile Gauze Swabs 10x10cm'));

  if (isLegacyFour) {
    const nonStore = inventory.filter((it) => it.categoryId !== 'store');
    return [...nonStore, ...createInitialStoreItems(today)];
  }

  return inventory.map((it) =>
    it.categoryId === 'store' && it.locationDetail === 'STATIONARY STORE - GFO - GSS'
      ? { ...it, locationDetail: 'STATIONARY STORE' }
      : it
  );
}

function migrateLegacyIvMedsInventory(
  inventory: InventoryItem[],
  forms: PharmacyFormsState,
  today: string,
  defaultInspector: string
): InventoryItem[] {
  const ivItems = inventory.filter((it) => it.categoryId === 'iv-meds');
  const isLegacyFour =
    ivItems.length === 4 &&
    ivItems.every((it) => ['iv-01', 'iv-02', 'iv-03', 'iv-04'].includes(it.id)) &&
    ivItems.some((it) => it.name.includes('0.9% Normal Saline IV Bag 1000ml'));

  const baseInventory = isLegacyFour
    ? [...inventory.filter((it) => it.categoryId !== 'iv-meds'), ...createInitialIvMedsItems(today)]
    : inventory;

  return syncPharmacyFormItemsIntoIvMeds(baseInventory, forms, today, defaultInspector);
}

function hydrateIvMedsAuditMeta(
  raw: IvMedsAuditMeta | undefined,
  today: string
): IvMedsAuditMeta {
  const base = createInitialIvMedsAuditMeta(today);
  if (!raw) return base;
  const staff =
    Array.isArray(raw.staffAssignments) && raw.staffAssignments.length > 0
      ? [...raw.staffAssignments]
      : [...base.staffAssignments];
  const monthParts = (raw.monthYear || '').trim().split(/\s+/);
  const derivedYear =
    monthParts.length > 1 && /^\d{4}$/.test(monthParts[monthParts.length - 1])
      ? monthParts[monthParts.length - 1]
      : '';
  const derivedMonth = derivedYear
    ? monthParts.slice(0, -1).join(' ')
    : monthParts.join(' ');
  const month = raw.month !== undefined ? raw.month : derivedMonth || base.month || '';
  const year = raw.year !== undefined ? raw.year : derivedYear || base.year || '';
  const combined = [month.trim(), year.trim()].filter(Boolean).join(' ');
  return {
    wardNumber: raw.wardNumber ?? base.wardNumber ?? '',
    month,
    year,
    monthYear: combined || raw.monthYear || base.monthYear,
    staffAssignments: staff,
    notes: raw.notes ?? base.notes,
  };
}

function hydrateSectionMeta(
  raw: Record<string, SectionPeriodMeta> | undefined,
  today: string
): Record<string, SectionPeriodMeta> {
  const base = createInitialSectionMeta(today);
  if (!raw || typeof raw !== 'object') return base;
  const merged: Record<string, SectionPeriodMeta> = { ...base };
  for (const [key, val] of Object.entries(raw)) {
    if (val && typeof val === 'object') {
      const def = createDefaultSectionPeriodMeta(today);
      let staffAssignments = val.staffAssignments;
      if (key === 'store') {
        if (Array.isArray(val.staffAssignments) && val.staffAssignments.length > 0) {
          staffAssignments = val.staffAssignments.map((st) => ({
            ...st,
            assignedSections: st.assignedSections.replace(
              /\s*-\s*GFO\s*-\s*GSS/gi,
              ''
            ),
          }));
        } else if (val.staffName || val.signature || val.date) {
          const fallback = createInitialStoreStaff(today)[0];
          staffAssignments = [
            {
              ...fallback,
              staffName: val.staffName ?? fallback.staffName,
              signature: val.signature ?? '',
              checkedDate: val.date ?? fallback.checkedDate,
            },
          ];
        } else {
          staffAssignments = createInitialStoreStaff(today);
        }
      }
      merged[key] = {
        wardNumber: val.wardNumber ?? def.wardNumber,
        month: val.month ?? def.month,
        year: val.year ?? def.year,
        staffName: val.staffName,
        signature: val.signature,
        date: val.date,
        staffAssignments,
      };
    }
  }
  return merged;
}

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
        const today = getTodayIso();
        const hydratedForms = syncNearExpiryInPharmacyForms(rawPharmacyForms, hydratedCrashCarts);
        const migratedInventory = migrateLegacyIvMedsInventory(
          migrateLegacyStoreInventory(
            migrateLegacyTransferBagInventory(parsed.inventory),
            today
          ),
          hydratedForms,
          today,
          parsed.defaultInspector || initial.defaultInspector
        );
        return {
          ...initial,
          ...parsed,
          inventory: migratedInventory,
          crashCarts: hydratedCrashCarts,
          pharmacyForms: hydratedForms,
          transferBagMeta: {
            ...createInitialTransferBagMeta(today),
            ...(parsed.transferBagMeta || {}),
          },
          ivMedsAuditMeta: hydrateIvMedsAuditMeta(parsed.ivMedsAuditMeta, today),
          sectionMeta: hydrateSectionMeta(parsed.sectionMeta, today),
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
    setData((prev) => ({
      ...prev,
      inventory:
        item.categoryId === 'transfer-bag' || item.categoryId === 'iv-meds'
          ? [...prev.inventory, newItem]
          : [newItem, ...prev.inventory],
    }));
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
    const today = getTodayIso();
    setData((prev) => {
      const nextCarts = prev.crashCarts.map((c) => (c.id === cartId ? { ...c, ...patch } : c));
      const syncedForms = syncNearExpiryInPharmacyForms(prev.pharmacyForms, nextCarts);
      return {
        ...prev,
        crashCarts: nextCarts,
        inventory: syncPharmacyFormItemsIntoIvMeds(
          prev.inventory,
          syncedForms,
          today,
          prev.defaultInspector
        ),
        pharmacyForms: syncedForms,
      };
    });
  };

  const updateCrashCartItemSlot = (
    cartId: string,
    itemId: string,
    slotIdx: number,
    value: string
  ) => {
    const today = getTodayIso();
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
      const syncedForms = syncNearExpiryInPharmacyForms(prev.pharmacyForms, nextCarts);
      return {
        ...prev,
        crashCarts: nextCarts,
        inventory: syncPharmacyFormItemsIntoIvMeds(
          prev.inventory,
          syncedForms,
          today,
          prev.defaultInspector
        ),
        pharmacyForms: syncedForms,
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
    const today = getTodayIso();
    setData((prev) => {
      const nextForms = {
        ...prev.pharmacyForms,
        cad: { ...prev.pharmacyForms.cad, ...patch },
      };
      const syncedForms = syncNearExpiryInPharmacyForms(nextForms, prev.crashCarts);
      return {
        ...prev,
        inventory: syncPharmacyFormItemsIntoIvMeds(
          prev.inventory,
          syncedForms,
          today,
          prev.defaultInspector
        ),
        pharmacyForms: syncedForms,
      };
    });
  };

  const updateWeeklyStockForm = (
    formId: WeeklyStockFormId,
    patch: Partial<WeeklyStockChecklistForm>
  ) => {
    const today = getTodayIso();
    setData((prev) => {
      const nextForms = {
        ...prev.pharmacyForms,
        weeklyForms: {
          ...prev.pharmacyForms.weeklyForms,
          [formId]: { ...prev.pharmacyForms.weeklyForms[formId], ...patch },
        },
      };
      const syncedForms =
        formId === 'near-expiry'
          ? nextForms
          : syncNearExpiryInPharmacyForms(nextForms, prev.crashCarts);
      const nextInventory =
        formId === 'high-alert' || formId === 'refrigerator' || formId === 'near-expiry'
          ? syncPharmacyFormItemsIntoIvMeds(
              prev.inventory,
              syncedForms,
              today,
              prev.defaultInspector
            )
          : prev.inventory;
      return {
        ...prev,
        inventory: nextInventory,
        pharmacyForms: syncedForms,
      };
    });
  };

  const updateMonthlyStoreForm = (patch: Partial<MonthlyStoreChecklistForm>) => {
    const today = getTodayIso();
    setData((prev) => {
      const nextForms = {
        ...prev.pharmacyForms,
        monthlyStore: { ...prev.pharmacyForms.monthlyStore, ...patch },
      };
      const syncedForms = syncNearExpiryInPharmacyForms(nextForms, prev.crashCarts);
      return {
        ...prev,
        inventory: syncPharmacyFormItemsIntoIvMeds(
          prev.inventory,
          syncedForms,
          today,
          prev.defaultInspector
        ),
        pharmacyForms: syncedForms,
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
    const today = getTodayIso();
    setData((prev) => {
      const updated = {
        ...prev.pharmacyForms,
        autoSyncNearExpiry: enabled,
      };
      const nextForms = enabled
        ? syncNearExpiryInPharmacyForms(updated, prev.crashCarts, true)
        : updated;
      return {
        ...prev,
        inventory: enabled
          ? syncPharmacyFormItemsIntoIvMeds(
              prev.inventory,
              nextForms,
              today,
              prev.defaultInspector
            )
          : prev.inventory,
        pharmacyForms: nextForms,
      };
    });
  };

  const resyncNearExpiry = () => {
    const today = getTodayIso();
    setData((prev) => {
      const syncedForms = syncNearExpiryInPharmacyForms(prev.pharmacyForms, prev.crashCarts, true);
      return {
        ...prev,
        inventory: syncPharmacyFormItemsIntoIvMeds(
          prev.inventory,
          syncedForms,
          today,
          prev.defaultInspector
        ),
        pharmacyForms: syncedForms,
      };
    });
  };

  const updateTransferBagMeta = (patch: Partial<TransferBagChecklistMeta>) => {
    setData((prev) => ({
      ...prev,
      transferBagMeta: {
        ...createInitialTransferBagMeta(getTodayIso()),
        ...(prev.transferBagMeta || {}),
        ...patch,
      },
    }));
  };

  const updateIvMedsAuditMeta = (patch: Partial<IvMedsAuditMeta>) => {
    setData((prev) => {
      const current = hydrateIvMedsAuditMeta(prev.ivMedsAuditMeta, getTodayIso());
      const nextMonth = patch.month !== undefined ? patch.month : current.month || '';
      const nextYear = patch.year !== undefined ? patch.year : current.year || '';
      const combined = [nextMonth.trim(), nextYear.trim()].filter(Boolean).join(' ');
      return {
        ...prev,
        ivMedsAuditMeta: {
          ...current,
          ...patch,
          monthYear:
            patch.month !== undefined || patch.year !== undefined
              ? combined
              : patch.monthYear !== undefined
                ? patch.monthYear
                : current.monthYear,
        },
      };
    });
  };

  const updateSectionMeta = (sectionId: string, patch: Partial<SectionPeriodMeta>) => {
    const today = getTodayIso();
    setData((prev) => {
      const prevMap = prev.sectionMeta || {};
      const existing = prevMap[sectionId] || createDefaultSectionPeriodMeta(today);
      return {
        ...prev,
        sectionMeta: {
          ...prevMap,
          [sectionId]: {
            ...existing,
            ...patch,
          },
        },
      };
    });
  };

  const resyncIvMedsFromForms = () => {
    const today = getTodayIso();
    setData((prev) => ({
      ...prev,
      inventory: syncPharmacyFormItemsIntoIvMeds(
        prev.inventory,
        prev.pharmacyForms,
        today,
        prev.defaultInspector
      ),
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
    const today = getTodayIso();
    const hydratedForms = syncNearExpiryInPharmacyForms(rawForms, nextCarts);
    const nextInventory = Array.isArray(imported.inventory)
      ? migrateLegacyIvMedsInventory(
          migrateLegacyStoreInventory(
            migrateLegacyTransferBagInventory(imported.inventory),
            today
          ),
          hydratedForms,
          today,
          imported.defaultInspector || initial.defaultInspector
        )
      : initial.inventory;
    setData({
      ...initial,
      ...imported,
      inventory: nextInventory,
      crashCarts: nextCarts,
      pharmacyForms: hydratedForms,
      transferBagMeta: {
        ...createInitialTransferBagMeta(today),
        ...(imported.transferBagMeta || {}),
      },
      ivMedsAuditMeta: hydrateIvMedsAuditMeta(imported.ivMedsAuditMeta, today),
      sectionMeta: hydrateSectionMeta(imported.sectionMeta, today),
      lastBackupDate: today,
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
    updateTransferBagMeta,
    updateIvMedsAuditMeta,
    updateSectionMeta,
    resyncIvMedsFromForms,
    importBackupData,
    markBackupDone,
    resetToInitialData,
  };
}
