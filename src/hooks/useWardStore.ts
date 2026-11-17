import { useEffect, useState } from 'react';
import {
  createInitialBloodTrolleyItems,
  createInitialBloodTrolleySdItems,
} from '../data/bloodTrolleySeed';
import { createInitialCrashCarts } from '../data/crashCartSeed';
import {
  createInitialEquipmentItems,
  createInitialEquipmentMaintenanceLogs,
} from '../data/equipmentSeed';
import {
  createDefaultSectionPeriodMeta,
  createInitialBloodTrolleyStaff,
  createInitialEquipmentStaff,
  createInitialPrepRoomStaff,
  createInitialProcedureTrolleyStaff,
  createInitialSectionMeta,
  createInitialStoreStaff,
  createInitialWardData,
} from '../data/initialWardData';
import {
  createInitialIvMedsAuditMeta,
  createInitialIvMedsItems,
} from '../data/ivMedsSeed';
import { createInitialPharmacyForms } from '../data/pharmacyFormsSeed';
import {
  createInitialPrepRoomItems,
  DEFAULT_PREP_ROOM_CCU_COMMENTS,
} from '../data/prepRoomSeed';
import { createInitialProcedureTrolleyItems } from '../data/procedureTrolleySeed';
import { createInitialStoreItems } from '../data/storeItemsSeed';
import {
  createInitialTransferBagItems,
  createInitialTransferBagMeta,
} from '../data/transferBagSeed';
import {
  buildCylinderWeeksForMonth,
  createDefaultWeekStaff,
  createInitialCylinderSchedule,
  createInitialOfficialCylinders,
} from '../data/oxygenCylinderSeed';
import {
  createInitialEnvironmentalRoundMeta,
  createInitialEnvironmentalStaff,
  migrateLegacyEnvironmentalChecks,
  responseToResult,
} from '../data/environmentalRoundSeed';
import type {
  CadChecklistForm,
  CategoryMeta,
  CrashCartChecklist,
  CylinderMonthlySchedule,
  CylinderWeekRowRecord,
  CylinderWeekStaffMember,
  EnvironmentalCheckItem,
  EnvironmentalResponse,
  EnvironmentalRoundMeta,
  EquipmentMaintenanceLogEntry,
  EquipmentStatus,
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
import {
  isoToSlashDate,
  mapTicketDeptToServiceDept,
  mapTicketStatusToEquipmentLogStatus,
  syncMaintenanceTicketsFromEquipmentLogs,
} from '../utils/maintenanceSync';
import { syncNearExpiryInPharmacyForms } from '../utils/nearExpirySync';

export interface AddMaintenanceTicketSyncOptions {
  syncToEnvironmentalLog?: boolean;
  syncToEquipmentLog?: boolean;
  equipmentItemId?: string;
  equipmentName?: string;
  tableName?: string;
  mohNumber?: string;
  workOrderNo?: string;
}

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

function migrateLegacyProcedureTrolleyInventory(
  inventory: InventoryItem[],
  today: string
): InventoryItem[] {
  const ptItems = inventory.filter((it) => it.categoryId === 'procedure-trolley');
  const isLegacyThree =
    ptItems.length === 3 &&
    ptItems.every((it) => ['pt-01', 'pt-02', 'pt-03'].includes(it.id)) &&
    ptItems.some((it) => it.name.includes('Triple-Lumen Central Venous Catheter Kit'));

  if (!isLegacyThree) return inventory;

  const nonPt = inventory.filter((it) => it.categoryId !== 'procedure-trolley');
  return [...nonPt, ...createInitialProcedureTrolleyItems(today)];
}

function migrateLegacyPrepRoomInventory(
  inventory: InventoryItem[],
  today: string
): InventoryItem[] {
  const prItems = inventory.filter((it) => it.categoryId === 'prep-room');
  const isLegacyFour =
    prItems.length === 4 &&
    prItems.every((it) => ['pr-01', 'pr-02', 'pr-03', 'pr-04'].includes(it.id)) &&
    prItems.some((it) => it.name.includes('Sterile Water for Injection 100ml'));

  if (!isLegacyFour) return inventory;

  const nonPr = inventory.filter((it) => it.categoryId !== 'prep-room');
  return [...nonPr, ...createInitialPrepRoomItems(today)];
}

function migrateLegacyBloodTrolleyInventory(
  inventory: InventoryItem[],
  today: string
): InventoryItem[] {
  const btItems = inventory.filter((it) => it.categoryId === 'blood-trolley');
  const isLegacyFour =
    btItems.length === 4 &&
    btItems.every((it) => ['bt-01', 'bt-02', 'bt-03', 'bt-04'].includes(it.id)) &&
    btItems.some((it) => it.name.includes('EDTA Purple-Top Vacutainer Tubes 4ml'));

  if (isLegacyFour) {
    const nonBt = inventory.filter((it) => it.categoryId !== 'blood-trolley');
    return [...nonBt, ...createInitialBloodTrolleyItems(today)];
  }

  const hasSdItems = btItems.some((it) => it.unit === 'SD' || it.id.startsWith('bt-sd-'));
  if (btItems.length > 0 && !hasSdItems) {
    return [...inventory, ...createInitialBloodTrolleySdItems(today)];
  }

  return inventory;
}

function migrateLegacyEquipmentInventory(
  inventory: InventoryItem[],
  today: string
): InventoryItem[] {
  const eqItems = inventory.filter((it) => it.categoryId === 'equipment');
  const isLegacySix =
    eqItems.length === 6 &&
    eqItems.every((it) => ['eq-01', 'eq-02', 'eq-03', 'eq-04', 'eq-05', 'eq-06'].includes(it.id)) &&
    eqItems.some((it) => it.name.includes('Philips IntelliVue MX550'));

  if (!isLegacySix) return inventory;

  const nonEq = inventory.filter((it) => it.categoryId !== 'equipment');
  return [...nonEq, ...createInitialEquipmentItems(today)];
}

function migrateLegacyOxygenCylinders(
  cylinders: OxygenCylinder[] | undefined,
  today: string
): OxygenCylinder[] {
  if (!Array.isArray(cylinders) || cylinders.length === 0) {
    return createInitialOfficialCylinders(today);
  }
  const isLegacyFive =
    cylinders.length === 5 &&
    cylinders.every((c) => ['ox-01', 'ox-02', 'ox-03', 'ox-04', 'ox-05'].includes(c.id)) &&
    cylinders.some((c) => c.cylinderCode === 'O2-CCU-E01');

  if (isLegacyFive) {
    return createInitialOfficialCylinders(today);
  }

  return cylinders.map((c) => ({
    ...c,
    sizeLiters:
      c.sizeLiters ?? (c.size === 'H/J-Cylinder (Backup)' ? 1000 : 500),
    dateOfFilling: c.dateOfFilling ?? '',
    typeOfGas: c.typeOfGas ?? 'OXYGEN',
    cylinderType: c.cylinderType ?? 'Aluminium',
    conditionStatus: c.conditionStatus ?? 'GOOD/ green',
    spareAvailable: c.spareAvailable ?? true,
  }));
}

function hydrateCylinderSchedule(
  raw: CylinderMonthlySchedule | undefined,
  today: string
): CylinderMonthlySchedule {
  const base = createInitialCylinderSchedule(today);
  if (!raw || typeof raw !== 'object') return base;
  const month =
    Number.isFinite(raw.month) && raw.month >= 1 && raw.month <= 12 ? raw.month : base.month;
  const year =
    Number.isFinite(raw.year) && raw.year >= 2020 && raw.year <= 2099 ? raw.year : base.year;
  const checkDayOfWeek =
    raw.checkDayOfWeek >= 0 && raw.checkDayOfWeek <= 6
      ? raw.checkDayOfWeek
      : base.checkDayOfWeek;
  const recomputedWeeks = buildCylinderWeeksForMonth(
    year,
    month,
    checkDayOfWeek,
    Array.isArray(raw.weeks) ? raw.weeks : undefined
  );
  // Preserve manual date overrides if the stored week matches the same month & year
  const weeks = recomputedWeeks.map((wk) => {
    const prev = raw.weeks?.find((pw) => pw.weekNumber === wk.weekNumber);
    if (
      prev?.checkDate &&
      prev.checkDate.startsWith(`${year}-${String(month).padStart(2, '0')}-`) &&
      raw.month === month &&
      raw.year === year &&
      raw.checkDayOfWeek === checkDayOfWeek
    ) {
      return { ...wk, checkDate: prev.checkDate };
    }
    return wk;
  });

  return {
    wardLocation: raw.wardLocation?.trim() || base.wardLocation,
    month,
    year,
    checkDayOfWeek,
    weeks,
  };
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
      } else if (key === 'procedure-trolley') {
        if (Array.isArray(val.staffAssignments) && val.staffAssignments.length > 0) {
          staffAssignments = [...val.staffAssignments];
        } else if (val.staffName || val.signature || val.date) {
          const fallback = createInitialProcedureTrolleyStaff(today)[0];
          staffAssignments = [
            {
              ...fallback,
              staffName: val.staffName ?? fallback.staffName,
              signature: val.signature ?? '',
              checkedDate: val.date ?? fallback.checkedDate,
            },
          ];
        } else {
          staffAssignments = createInitialProcedureTrolleyStaff(today);
        }
      } else if (key === 'prep-room') {
        if (Array.isArray(val.staffAssignments) && val.staffAssignments.length > 0) {
          staffAssignments = [...val.staffAssignments];
        } else if (val.staffName && val.staffName !== createInitialPrepRoomStaff(today)[0].staffName) {
          const defaults = createInitialPrepRoomStaff(today);
          staffAssignments = [
            {
              ...defaults[0],
              staffName: val.staffName,
              signature: val.signature ?? '',
              checkedDate: val.date ?? defaults[0].checkedDate,
            },
            ...defaults.slice(1),
          ];
        } else {
          staffAssignments = createInitialPrepRoomStaff(today);
        }
      } else if (key === 'blood-trolley') {
        if (Array.isArray(val.staffAssignments) && val.staffAssignments.length > 0) {
          staffAssignments = [...val.staffAssignments];
        } else if (val.staffName || val.signature || val.date) {
          const fallback = createInitialBloodTrolleyStaff(today)[0];
          staffAssignments = [
            {
              ...fallback,
              staffName: val.staffName ?? fallback.staffName,
              signature: val.signature ?? '',
              checkedDate: val.date ?? fallback.checkedDate,
            },
          ];
        } else {
          staffAssignments = createInitialBloodTrolleyStaff(today);
        }
      } else if (key === 'equipment') {
        if (Array.isArray(val.staffAssignments) && val.staffAssignments.length > 0) {
          staffAssignments = [...val.staffAssignments];
        } else if (val.staffName || val.signature || val.date) {
          const fallback = createInitialEquipmentStaff(today)[0];
          staffAssignments = [
            {
              ...fallback,
              staffName: val.staffName ?? fallback.staffName,
              signature: val.signature ?? '',
              checkedDate: val.date ?? fallback.checkedDate,
            },
          ];
        } else {
          staffAssignments = createInitialEquipmentStaff(today);
        }
      } else if (key === 'environmental') {
        if (Array.isArray(val.staffAssignments) && val.staffAssignments.length > 0) {
          staffAssignments = [...val.staffAssignments];
        } else {
          staffAssignments = createInitialEnvironmentalStaff(today);
        }
      }
      merged[key] = {
        wardNumber:
          key === 'blood-trolley'
            ? val.wardNumber === '208 CCU'
              ? '208'
              : val.wardNumber || '208'
            : val.wardNumber ?? def.wardNumber,
        month: val.month ?? def.month,
        year: val.year ?? def.year,
        staffName: val.staffName,
        signature: val.signature,
        date: val.date,
        comments:
          key === 'prep-room'
            ? val.comments ?? DEFAULT_PREP_ROOM_CCU_COMMENTS
            : val.comments,
        staffAssignments,
      };
    }
  }
  return merged;
}

function hydrateEnvironmentalRoundMeta(
  raw: EnvironmentalRoundMeta | undefined,
  today: string
): EnvironmentalRoundMeta {
  const base = createInitialEnvironmentalRoundMeta(today);
  if (!raw || typeof raw !== 'object') return base;
  return {
    departmentInspected: raw.departmentInspected ?? base.departmentInspected,
    inspectionDateMonth: raw.inspectionDateMonth ?? base.inspectionDateMonth,
    managerHead: raw.managerHead ?? base.managerHead,
    groupComments: {
      ...base.groupComments,
      ...(raw.groupComments && typeof raw.groupComments === 'object' ? raw.groupComments : {}),
    },
    followUpTableHeader: raw.followUpTableHeader ?? base.followUpTableHeader,
    followUpRows: Array.isArray(raw.followUpRows) ? raw.followUpRows : base.followUpRows,
    followUpFooterNote: raw.followUpFooterNote ?? base.followUpFooterNote,
    staffAssignments:
      Array.isArray(raw.staffAssignments) && raw.staffAssignments.length > 0
        ? raw.staffAssignments
        : base.staffAssignments,
  };
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
        const migratedInventory = migrateLegacyEquipmentInventory(
          migrateLegacyBloodTrolleyInventory(
            migrateLegacyPrepRoomInventory(
              migrateLegacyProcedureTrolleyInventory(
                migrateLegacyIvMedsInventory(
                  migrateLegacyStoreInventory(
                    migrateLegacyTransferBagInventory(parsed.inventory),
                    today
                  ),
                  hydratedForms,
                  today,
                  parsed.defaultInspector || initial.defaultInspector
                ),
                today
              ),
              today
            ),
            today
          ),
          today
        );
        const rawEqLogs = Array.isArray(parsed.equipmentMaintenanceLogs)
          ? parsed.equipmentMaintenanceLogs
          : createInitialEquipmentMaintenanceLogs(today);
        const syncedEquip = syncMaintenanceTicketsFromEquipmentLogs(
          rawEqLogs,
          Array.isArray(parsed.maintenanceTickets)
            ? parsed.maintenanceTickets
            : initial.maintenanceTickets,
          parsed.defaultInspector || initial.defaultInspector,
          today
        );
        return {
          ...initial,
          ...parsed,
          inventory: migratedInventory,
          environmentalChecks: migrateLegacyEnvironmentalChecks(parsed.environmentalChecks, today),
          environmentalRoundMeta: hydrateEnvironmentalRoundMeta(
            parsed.environmentalRoundMeta,
            today
          ),
          equipmentMaintenanceLogs: syncedEquip.equipmentLogs,
          maintenanceTickets: syncedEquip.maintenanceTickets,
          oxygenCylinders: migrateLegacyOxygenCylinders(parsed.oxygenCylinders, today),
          cylinderSchedule: hydrateCylinderSchedule(parsed.cylinderSchedule, today),
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
  const initialFresh = createInitialWardData();
  const todayFresh = getTodayIso();
  const syncedFresh = syncMaintenanceTicketsFromEquipmentLogs(
    initialFresh.equipmentMaintenanceLogs || [],
    initialFresh.maintenanceTickets,
    initialFresh.defaultInspector,
    todayFresh
  );
  return {
    ...initialFresh,
    equipmentMaintenanceLogs: syncedFresh.equipmentLogs,
    maintenanceTickets: syncedFresh.maintenanceTickets,
  };
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
        item.categoryId === 'transfer-bag' ||
        item.categoryId === 'iv-meds' ||
        item.categoryId === 'procedure-trolley' ||
        item.categoryId === 'prep-room' ||
        item.categoryId === 'blood-trolley' ||
        item.categoryId === 'store'
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

  // --- Medical Equipment Maintenance & Repair Log ---
  const addEquipmentMaintenanceLog = (
    entry: Omit<EquipmentMaintenanceLogEntry, 'id'>,
    syncEquipmentStatus?: EquipmentStatus
  ) => {
    const today = getTodayIso();
    const newEntry: EquipmentMaintenanceLogEntry = {
      ...entry,
      id: `eqm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
    };
    setData((prev) => {
      const nextLogs = [newEntry, ...(prev.equipmentMaintenanceLogs || [])];
      const synced = syncMaintenanceTicketsFromEquipmentLogs(
        nextLogs,
        prev.maintenanceTickets,
        prev.defaultInspector,
        today
      );
      return {
        ...prev,
        equipmentMaintenanceLogs: synced.equipmentLogs,
        maintenanceTickets: synced.maintenanceTickets,
        inventory:
          syncEquipmentStatus && entry.equipmentItemId
            ? prev.inventory.map((it) =>
                it.id === entry.equipmentItemId
                  ? { ...it, equipmentStatus: syncEquipmentStatus }
                  : it
              )
            : prev.inventory,
      };
    });
  };

  const updateEquipmentMaintenanceLog = (
    entryId: string,
    patch: Partial<EquipmentMaintenanceLogEntry>,
    syncEquipmentStatus?: EquipmentStatus
  ) => {
    const today = getTodayIso();
    setData((prev) => {
      const existing = (prev.equipmentMaintenanceLogs || []).find((e) => e.id === entryId);
      const targetItemId = patch.equipmentItemId ?? existing?.equipmentItemId;
      const updatedLogs = (prev.equipmentMaintenanceLogs || []).map((e) =>
        e.id === entryId ? { ...e, ...patch } : e
      );
      const synced = syncMaintenanceTicketsFromEquipmentLogs(
        updatedLogs,
        prev.maintenanceTickets,
        prev.defaultInspector,
        today
      );
      return {
        ...prev,
        equipmentMaintenanceLogs: synced.equipmentLogs,
        maintenanceTickets: synced.maintenanceTickets,
        inventory:
          syncEquipmentStatus && targetItemId
            ? prev.inventory.map((it) =>
                it.id === targetItemId ? { ...it, equipmentStatus: syncEquipmentStatus } : it
              )
            : prev.inventory,
      };
    });
  };

  const deleteEquipmentMaintenanceLog = (entryId: string) => {
    const today = getTodayIso();
    setData((prev) => {
      const remainingLogs = (prev.equipmentMaintenanceLogs || []).filter(
        (e) => e.id !== entryId
      );
      const synced = syncMaintenanceTicketsFromEquipmentLogs(
        remainingLogs,
        prev.maintenanceTickets,
        prev.defaultInspector,
        today
      );
      return {
        ...prev,
        equipmentMaintenanceLogs: synced.equipmentLogs,
        maintenanceTickets: synced.maintenanceTickets,
      };
    });
  };

  const syncEquipmentToMaintenanceTickets = () => {
    const today = getTodayIso();
    setData((prev) => {
      const synced = syncMaintenanceTicketsFromEquipmentLogs(
        prev.equipmentMaintenanceLogs || [],
        prev.maintenanceTickets,
        prev.defaultInspector,
        today
      );
      return {
        ...prev,
        equipmentMaintenanceLogs: synced.equipmentLogs,
        maintenanceTickets: synced.maintenanceTickets,
      };
    });
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

  const setEnvironmentalResponse = (
    checkId: string,
    response: EnvironmentalResponse,
    inspector?: string,
    notes?: string
  ) => {
    const today = getTodayIso();
    setData((prev) => ({
      ...prev,
      environmentalChecks: prev.environmentalChecks.map((c) =>
        c.id === checkId
          ? {
              ...c,
              response,
              result: responseToResult(response),
              measuredValue: response.toUpperCase(),
              lastCheckedDate: today,
              inspector: inspector || prev.defaultInspector,
              notes: notes !== undefined ? notes : c.notes,
            }
          : c
      ),
    }));
  };

  const setEnvironmentalGroupResponse = (groupId: string, response: EnvironmentalResponse) => {
    const today = getTodayIso();
    setData((prev) => ({
      ...prev,
      environmentalChecks: prev.environmentalChecks.map((c) =>
        c.groupId === groupId
          ? {
              ...c,
              response,
              result: responseToResult(response),
              measuredValue: response.toUpperCase(),
              lastCheckedDate: today,
              inspector: prev.defaultInspector,
            }
          : c
      ),
    }));
  };

  const deleteEnvironmentalCheck = (checkId: string) => {
    setData((prev) => ({
      ...prev,
      environmentalChecks: prev.environmentalChecks.filter((c) => c.id !== checkId),
    }));
  };

  const updateEnvironmentalRoundMeta = (patch: Partial<EnvironmentalRoundMeta>) => {
    const today = getTodayIso();
    setData((prev) => {
      const current = hydrateEnvironmentalRoundMeta(prev.environmentalRoundMeta, today);
      return {
        ...prev,
        environmentalRoundMeta: {
          ...current,
          ...patch,
          groupComments: patch.groupComments
            ? { ...current.groupComments, ...patch.groupComments }
            : current.groupComments,
        },
      };
    });
  };

  // --- Maintenance Follow-Up Tickets ---
  const addMaintenanceTicket = (
    ticket: Omit<MaintenanceTicket, 'id'>,
    syncOptions?: boolean | AddMaintenanceTicketSyncOptions
  ) => {
    const today = getTodayIso();
    const opts: AddMaintenanceTicketSyncOptions =
      typeof syncOptions === 'boolean'
        ? { syncToEnvironmentalLog: syncOptions }
        : syncOptions || {};

    const ticketId = `mnt-${Date.now().toString(36)}`;
    let linkedFollowUpId: string | undefined;
    let linkedEquipmentLogId: string | undefined;

    setData((prev) => {
      let nextEqLogs = prev.equipmentMaintenanceLogs || [];
      let nextInventory = prev.inventory;
      let nextEnvMeta = prev.environmentalRoundMeta;

      if (opts.syncToEquipmentLog) {
        const newLogId = `eqm-${Date.now().toString(36)}-${Math.random()
          .toString(36)
          .slice(2, 5)}`;
        linkedEquipmentLogId = newLogId;
        const unitNormalized: EquipmentMaintenanceLogEntry['unit'] =
          ticket.unit === 'CCU' || ticket.unit === 'SD' || ticket.unit === 'General Ward'
            ? ticket.unit
            : 'CCU';
        const newEqLog: EquipmentMaintenanceLogEntry = {
          id: newLogId,
          equipmentItemId: opts.equipmentItemId || undefined,
          equipmentName: opts.equipmentName?.trim() || ticket.title,
          tableName: opts.tableName?.trim() || 'Table 9 - Others',
          mohNumber: opts.mohNumber?.trim() || '—',
          unit: unitNormalized,
          issueDescription: ticket.title,
          reportedDate: ticket.reportedDate || today,
          reportedBy: ticket.reportedBy || prev.defaultInspector,
          workOrderNo: opts.workOrderNo?.trim() || '',
          serviceDepartment: mapTicketDeptToServiceDept(ticket.department),
          actionTaken: ticket.notes?.trim() || '',
          status: mapTicketStatusToEquipmentLogStatus(ticket.status),
          resolvedDate: ticket.resolvedDate,
          verifiedBy: ticket.status === 'Resolved' ? prev.defaultInspector : '',
          linkedTicketId: ticketId,
        };
        nextEqLogs = [newEqLog, ...nextEqLogs];

        if (opts.equipmentItemId) {
          nextInventory = prev.inventory.map((it) =>
            it.id === opts.equipmentItemId
              ? {
                  ...it,
                  equipmentStatus:
                    ticket.status === 'Resolved' ? 'Operational' : 'Under Maintenance',
                }
              : it
          );
        }
      }

      if (opts.syncToEnvironmentalLog) {
        const envMeta = hydrateEnvironmentalRoundMeta(prev.environmentalRoundMeta, today);
        const newRowId = `ghfu-${Date.now().toString(36)}`;
        linkedFollowUpId = newRowId;
        nextEnvMeta = {
          ...envMeta,
          followUpRows: [
            ...envMeta.followUpRows,
            {
              id: newRowId,
              issue: ticket.title,
              date: isoToSlashDate(ticket.reportedDate || today),
              responsibleDept: ticket.department,
              workOrderSubmitted: ticket.status !== 'Open',
              dateCompleted:
                ticket.status === 'Resolved' ? isoToSlashDate(today) : 'Pending',
              highlightRed: ticket.priority === 'Urgent' && ticket.status !== 'Resolved',
              linkedTicketId: ticketId,
            },
          ],
        };
      }

      const newTicket: MaintenanceTicket = {
        ...ticket,
        id: ticketId,
        linkedFollowUpId,
        linkedEquipmentLogId,
      };

      return {
        ...prev,
        maintenanceTickets: [newTicket, ...prev.maintenanceTickets],
        equipmentMaintenanceLogs: nextEqLogs,
        inventory: nextInventory,
        environmentalRoundMeta: nextEnvMeta,
      };
    });
  };

  const updateMaintenanceTicketStatus = (
    ticketId: string,
    status: TicketStatus,
    notes?: string
  ) => {
    const today = getTodayIso();
    setData((prev) => {
      const targetTicket = prev.maintenanceTickets.find((tk) => tk.id === ticketId);
      const nextTickets = prev.maintenanceTickets.map((tk) =>
        tk.id === ticketId
          ? {
              ...tk,
              status,
              resolvedDate: status === 'Resolved' ? today : null,
              notes: notes !== undefined ? notes : tk.notes,
            }
          : tk
      );

      let nextEqLogs = prev.equipmentMaintenanceLogs || [];
      let nextInventory = prev.inventory;

      const linkedLogId = targetTicket?.linkedEquipmentLogId;
      if (linkedLogId) {
        const existingLog = nextEqLogs.find((l) => l.id === linkedLogId);
        if (existingLog) {
          const nextLogStatus = mapTicketStatusToEquipmentLogStatus(
            status,
            existingLog.status
          );
          nextEqLogs = nextEqLogs.map((l) =>
            l.id === linkedLogId
              ? {
                  ...l,
                  status: nextLogStatus,
                  resolvedDate: status === 'Resolved' ? today : null,
                  verifiedBy:
                    status === 'Resolved'
                      ? l.verifiedBy || prev.defaultInspector
                      : l.verifiedBy,
                  actionTaken: notes !== undefined ? notes : l.actionTaken,
                }
              : l
          );
          if (existingLog.equipmentItemId) {
            nextInventory = prev.inventory.map((it) =>
              it.id === existingLog.equipmentItemId
                ? {
                    ...it,
                    equipmentStatus:
                      status === 'Resolved' ? 'Operational' : 'Under Maintenance',
                  }
                : it
            );
          }
        }
      }

      let nextEnvMeta = prev.environmentalRoundMeta;
      if (targetTicket?.linkedFollowUpId && prev.environmentalRoundMeta) {
        nextEnvMeta = {
          ...prev.environmentalRoundMeta,
          followUpRows: prev.environmentalRoundMeta.followUpRows.map((r) =>
            r.id === targetTicket.linkedFollowUpId
              ? {
                  ...r,
                  workOrderSubmitted: status !== 'Open',
                  dateCompleted:
                    status === 'Resolved' ? isoToSlashDate(today) : 'Pending',
                  highlightRed: status !== 'Resolved' && r.highlightRed,
                }
              : r
          ),
        };
      }

      return {
        ...prev,
        maintenanceTickets: nextTickets,
        equipmentMaintenanceLogs: nextEqLogs,
        inventory: nextInventory,
        environmentalRoundMeta: nextEnvMeta,
      };
    });
  };

  const deleteMaintenanceTicket = (ticketId: string) => {
    setData((prev) => {
      const targetTicket = prev.maintenanceTickets.find((tk) => tk.id === ticketId);
      const nextEqLogs = targetTicket?.linkedEquipmentLogId
        ? (prev.equipmentMaintenanceLogs || []).filter(
            (l) => l.id !== targetTicket.linkedEquipmentLogId
          )
        : prev.equipmentMaintenanceLogs;
      const nextEnvMeta =
        targetTicket?.linkedFollowUpId && prev.environmentalRoundMeta
          ? {
              ...prev.environmentalRoundMeta,
              followUpRows: prev.environmentalRoundMeta.followUpRows.filter(
                (r) => r.id !== targetTicket.linkedFollowUpId
              ),
            }
          : prev.environmentalRoundMeta;

      return {
        ...prev,
        maintenanceTickets: prev.maintenanceTickets.filter((tk) => tk.id !== ticketId),
        equipmentMaintenanceLogs: nextEqLogs,
        environmentalRoundMeta: nextEnvMeta,
      };
    });
  };

  // --- Oxygen Cylinder Weekly Checking Tool ---
  const logOxygenCylinderCheck = (
    cylinderId: string,
    payload: {
      pressurePsi: number;
      valveAndLeakCheck: boolean;
      securedInRack: boolean;
      conditionStatus?: string;
      spareAvailable?: boolean;
      weekNumber?: number;
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

      const baseSchedule = prev.cylinderSchedule || createInitialCylinderSchedule(today);
      const nextWeeks =
        payload.weekNumber !== undefined
          ? baseSchedule.weeks.map((wk) => {
              if (wk.weekNumber !== payload.weekNumber) return wk;
              const prevRec = wk.records?.[cylinderId];
              return {
                ...wk,
                records: {
                  ...(wk.records || {}),
                  [cylinderId]: {
                    ...(prevRec || { cylinderId }),
                    cylinderId,
                    pressurePsi: payload.pressurePsi,
                    valveFunctioning: payload.valveAndLeakCheck,
                    conditionStatus:
                      payload.conditionStatus ?? cyl.conditionStatus ?? 'GOOD/ green',
                    spareAvailable: payload.spareAvailable ?? cyl.spareAvailable ?? true,
                    checkedBy: payload.inspector || prev.defaultInspector,
                    remarks: payload.notes,
                  },
                },
              };
            })
          : baseSchedule.weeks;

      return {
        ...prev,
        oxygenCylinders: prev.oxygenCylinders.map((c) =>
          c.id === cylinderId
            ? {
                ...c,
                pressurePsi: payload.pressurePsi,
                valveAndLeakCheck: payload.valveAndLeakCheck,
                securedInRack: payload.securedInRack,
                conditionStatus: payload.conditionStatus ?? c.conditionStatus ?? 'GOOD/ green',
                spareAvailable: payload.spareAvailable ?? c.spareAvailable ?? true,
                lastCheckedDate: today,
                lastCheckedBy: payload.inspector || prev.defaultInspector,
                notes: payload.notes,
              }
            : c
        ),
        cylinderSchedule: { ...baseSchedule, weeks: nextWeeks },
        oxygenLogs: [newLog, ...prev.oxygenLogs].slice(0, 100),
      };
    });
  };

  const updateOxygenCylinder = (cylinderId: string, patch: Partial<OxygenCylinder>) => {
    setData((prev) => ({
      ...prev,
      oxygenCylinders: prev.oxygenCylinders.map((c) =>
        c.id === cylinderId ? { ...c, ...patch } : c
      ),
    }));
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

  const updateCylinderSchedule = (
    patch: Partial<Pick<CylinderMonthlySchedule, 'wardLocation' | 'month' | 'year' | 'checkDayOfWeek'>>
  ) => {
    const today = getTodayIso();
    setData((prev) => {
      const current = prev.cylinderSchedule || createInitialCylinderSchedule(today);
      const nextMonth = patch.month ?? current.month;
      const nextYear = patch.year ?? current.year;
      const nextDay = patch.checkDayOfWeek ?? current.checkDayOfWeek;
      const scheduleChanged =
        nextMonth !== current.month ||
        nextYear !== current.year ||
        nextDay !== current.checkDayOfWeek;

      const nextWeeks = scheduleChanged
        ? buildCylinderWeeksForMonth(nextYear, nextMonth, nextDay, current.weeks)
        : current.weeks;

      return {
        ...prev,
        cylinderSchedule: {
          ...current,
          ...patch,
          month: nextMonth,
          year: nextYear,
          checkDayOfWeek: nextDay,
          weeks: nextWeeks,
        },
      };
    });
  };

  const updateCylinderWeekDate = (weekNumber: number, checkDate: string) => {
    const today = getTodayIso();
    setData((prev) => {
      const current = prev.cylinderSchedule || createInitialCylinderSchedule(today);
      return {
        ...prev,
        cylinderSchedule: {
          ...current,
          weeks: current.weeks.map((wk) =>
            wk.weekNumber === weekNumber ? { ...wk, checkDate } : wk
          ),
        },
      };
    });
  };

  const updateCylinderWeekStaff = (
    weekNumber: number,
    assignedStaff: CylinderWeekStaffMember[]
  ) => {
    const today = getTodayIso();
    setData((prev) => {
      const current = prev.cylinderSchedule || createInitialCylinderSchedule(today);
      const safeStaff =
        assignedStaff.length > 0 ? assignedStaff : createDefaultWeekStaff(weekNumber);
      return {
        ...prev,
        cylinderSchedule: {
          ...current,
          weeks: current.weeks.map((wk) =>
            wk.weekNumber === weekNumber ? { ...wk, assignedStaff: safeStaff } : wk
          ),
        },
      };
    });
  };

  const copyCylinderWeek1StaffToAll = () => {
    const today = getTodayIso();
    setData((prev) => {
      const current = prev.cylinderSchedule || createInitialCylinderSchedule(today);
      const week1 = current.weeks.find((w) => w.weekNumber === 1);
      if (!week1) return prev;
      return {
        ...prev,
        cylinderSchedule: {
          ...current,
          weeks: current.weeks.map((wk) =>
            wk.weekNumber === 1
              ? wk
              : {
                  ...wk,
                  assignedStaff: week1.assignedStaff.map((st, idx) => ({
                    ...st,
                    id: `cyl-w${wk.weekNumber}-st-${idx + 1}-${Date.now().toString(36)}`,
                  })),
                }
          ),
        },
      };
    });
  };

  const updateCylinderWeekRecord = (
    weekNumber: number,
    cylinderId: string,
    recordPatch: Partial<CylinderWeekRowRecord>
  ) => {
    const today = getTodayIso();
    setData((prev) => {
      const current = prev.cylinderSchedule || createInitialCylinderSchedule(today);
      return {
        ...prev,
        cylinderSchedule: {
          ...current,
          weeks: current.weeks.map((wk) => {
            if (wk.weekNumber !== weekNumber) return wk;
            const existing = wk.records?.[cylinderId] || { cylinderId };
            return {
              ...wk,
              records: {
                ...(wk.records || {}),
                [cylinderId]: { ...existing, ...recordPatch, cylinderId },
              },
            };
          }),
        },
      };
    });
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
      ? migrateLegacyEquipmentInventory(
          migrateLegacyBloodTrolleyInventory(
            migrateLegacyPrepRoomInventory(
              migrateLegacyProcedureTrolleyInventory(
                migrateLegacyIvMedsInventory(
                  migrateLegacyStoreInventory(
                    migrateLegacyTransferBagInventory(imported.inventory),
                    today
                  ),
                  hydratedForms,
                  today,
                  imported.defaultInspector || initial.defaultInspector
                ),
                today
              ),
              today
            ),
            today
          ),
          today
        )
      : initial.inventory;
    const rawImportedEqLogs = Array.isArray(imported.equipmentMaintenanceLogs)
      ? imported.equipmentMaintenanceLogs
      : createInitialEquipmentMaintenanceLogs(today);
    const syncedImportedEquip = syncMaintenanceTicketsFromEquipmentLogs(
      rawImportedEqLogs,
      Array.isArray(imported.maintenanceTickets)
        ? imported.maintenanceTickets
        : initial.maintenanceTickets,
      imported.defaultInspector || initial.defaultInspector,
      today
    );
    setData({
      ...initial,
      ...imported,
      inventory: nextInventory,
      environmentalChecks: migrateLegacyEnvironmentalChecks(imported.environmentalChecks, today),
      environmentalRoundMeta: hydrateEnvironmentalRoundMeta(
        imported.environmentalRoundMeta,
        today
      ),
      equipmentMaintenanceLogs: syncedImportedEquip.equipmentLogs,
      maintenanceTickets: syncedImportedEquip.maintenanceTickets,
      oxygenCylinders: migrateLegacyOxygenCylinders(imported.oxygenCylinders, today),
      cylinderSchedule: hydrateCylinderSchedule(imported.cylinderSchedule, today),
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
  };
}
