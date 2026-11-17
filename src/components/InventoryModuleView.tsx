import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Edit3,
  Eye,
  FileEdit,
  Minus,
  Plus,
  Printer,
  Search,
  Trash2,
  Users,
  Wrench,
  XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type {
  CategoryMeta,
  EquipmentMaintenanceLogEntry,
  EquipmentStatus,
  InventoryItem,
  SectionPeriodMeta,
  StoreStaffAssignment,
  TransferBagChecklistMeta,
} from '../types/ward';
import {
  daysBetween,
  formatShortDate,
  getExpiryStatus,
  getTodayIso,
  isItemAttentionNeeded,
  isStoreItemNearExpiry,
} from '../utils/dateUtils';
import { BLOOD_TROLLEY_DRAWERS } from '../data/bloodTrolleySeed';
import {
  computeTable5ColumnTotals,
  EQUIPMENT_TABLES,
  getEquipmentTableExtraCols,
  isEquipmentAccessoryTicked,
  isTickableEquipmentTable,
} from '../data/equipmentSeed';
import { getEarliestIsoFromExpiryText } from '../data/prepRoomSeed';
import { STORE_SECTIONS } from '../data/storeItemsSeed';
import { BloodTrolleyPrintView, type BloodTrolleyPrintScope } from './BloodTrolleyPrintView';
import { EmergencyBagPrintView } from './EmergencyBagPrintView';
import { EquipmentMaintenanceLogSection } from './EquipmentMaintenanceLogSection';
import {
  EquipmentPrintView,
  type EquipmentMaintenancePrintFilter,
  type EquipmentPrintLayoutMode,
  type EquipmentPrintScope,
} from './EquipmentPrintView';
import { PrepRoomPrintView, type PrepRoomPrintScope } from './PrepRoomPrintView';
import { ProcedureTrolleyPrintView } from './ProcedureTrolleyPrintView';
import {
  StoreChecklistPrintView,
  type StorePrintLayoutMode,
  type StorePrintScope,
} from './StoreChecklistPrintView';

interface InventoryModuleViewProps {
  category: CategoryMeta;
  items: InventoryItem[];
  wardName?: string;
  defaultInspector: string;
  transferBagMeta?: TransferBagChecklistMeta;
  onUpdateTransferBagMeta?: (patch: Partial<TransferBagChecklistMeta>) => void;
  sectionMeta?: SectionPeriodMeta;
  onUpdateSectionMeta?: (patch: Partial<SectionPeriodMeta>) => void;
  onAddItem: (item: Omit<InventoryItem, 'id'>) => void;
  onUpdateItem: (itemId: string, patch: Partial<InventoryItem>) => void;
  onDeleteItem: (itemId: string) => void;
  onVerifyItem: (itemId: string, inspector: string) => void;
  equipmentMaintenanceLogs?: EquipmentMaintenanceLogEntry[];
  onAddEquipmentMaintenanceLog?: (
    entry: Omit<EquipmentMaintenanceLogEntry, 'id'>,
    syncEquipmentStatus?: EquipmentStatus
  ) => void;
  onUpdateEquipmentMaintenanceLog?: (
    entryId: string,
    patch: Partial<EquipmentMaintenanceLogEntry>,
    syncEquipmentStatus?: EquipmentStatus
  ) => void;
  onDeleteEquipmentMaintenanceLog?: (entryId: string) => void;
  initialEquipmentTab?: 'inventory' | 'maintenance';
}

export function InventoryModuleView({
  category,
  items,
  wardName = '',
  defaultInspector,
  transferBagMeta,
  onUpdateTransferBagMeta,
  sectionMeta,
  onUpdateSectionMeta,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onVerifyItem,
  equipmentMaintenanceLogs = [],
  onAddEquipmentMaintenanceLog,
  onUpdateEquipmentMaintenanceLog,
  onDeleteEquipmentMaintenanceLog,
  initialEquipmentTab = 'inventory',
}: InventoryModuleViewProps) {
  const today = getTodayIso();
  const isTransferBag = category.id === 'transfer-bag';
  const isStore = category.id === 'store';
  const isProcedureTrolley = category.id === 'procedure-trolley';
  const isPrepRoom = category.id === 'prep-room';
  const isBloodTrolley = category.id === 'blood-trolley';
  const isEquipmentModule = category.id === 'equipment';
  const [viewMode, setViewMode] = useState<'editor' | 'print-preview'>('editor');
  const [unitFilter, setUnitFilter] = useState<'All' | 'CCU' | 'SD' | 'General Ward'>('All');
  const [storeSectionFilter, setStoreSectionFilter] = useState<string>('All');
  const [bloodTrolleyDrawerFilter, setBloodTrolleyDrawerFilter] = useState<string>('All');
  const [equipmentTableFilter, setEquipmentTableFilter] = useState<string>('All');
  const [storePrintLayout, setStorePrintLayout] = useState<StorePrintLayoutMode>('two-per-sheet');
  const [storePrintScope, setStorePrintScope] = useState<StorePrintScope>('all');
  const [storeNearExpiryMonths, setStoreNearExpiryMonths] = useState<1 | 3 | 6>(3);
  const [storeEditorNearExpiryOnly, setStoreEditorNearExpiryOnly] = useState<boolean>(false);
  const [trolleyPrintLayout, setTrolleyPrintLayout] = useState<StorePrintLayoutMode>('two-per-sheet');
  const [prepRoomPrintScope, setPrepRoomPrintScope] = useState<PrepRoomPrintScope>('both');
  const [prepRoomPrintLayout, setPrepRoomPrintLayout] = useState<StorePrintLayoutMode>('two-per-sheet');
  const [bloodTrolleyPrintScope, setBloodTrolleyPrintScope] =
    useState<BloodTrolleyPrintScope>('both');
  const [bloodTrolleyPrintLayout, setBloodTrolleyPrintLayout] =
    useState<StorePrintLayoutMode>('two-per-sheet');
  const [equipmentPrintLayout, setEquipmentPrintLayout] =
    useState<EquipmentPrintLayoutMode>('grouped');
  const [equipmentPrintScope, setEquipmentPrintScope] = useState<EquipmentPrintScope>(
    initialEquipmentTab === 'maintenance' ? 'maintenance-only' : 'all'
  );
  const [includeEquipmentMaintenanceLog, setIncludeEquipmentMaintenanceLog] = useState(true);
  const [equipmentMaintenancePrintFilter, setEquipmentMaintenancePrintFilter] =
    useState<EquipmentMaintenancePrintFilter>('all');
  const [equipmentMaintenanceUnitFilter, setEquipmentMaintenanceUnitFilter] = useState<
    'All' | 'CCU' | 'SD' | 'General Ward'
  >('All');
  const [equipmentSectionTab, setEquipmentSectionTab] = useState<'inventory' | 'maintenance'>(
    initialEquipmentTab
  );
  const [preselectedItemForRepair, setPreselectedItemForRepair] =
    useState<InventoryItem | null>(null);
  const [collapsedStoreSections, setCollapsedStoreSections] = useState<Record<string, boolean>>({});
  const [collapsedEquipmentTables, setCollapsedEquipmentTables] = useState<Record<string, boolean>>(
    {}
  );
  const [statusFilter, setStatusFilter] = useState<'all' | 'attention'>('all');
  const [search, setSearch] = useState('');

  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state for add / edit
  const [formName, setFormName] = useState('');
  const [formUnit, setFormUnit] = useState<'CCU' | 'SD' | 'General Ward'>('CCU');
  const [formLocation, setFormLocation] = useState('');
  const [formQty, setFormQty] = useState(1);
  const [formPar, setFormPar] = useState(1);
  const [formUom, setFormUom] = useState(category.isEquipment ? 'unit' : 'pcs');
  const [formBatch, setFormBatch] = useState('');
  const [formOtherCode, setFormOtherCode] = useState('');
  const [formExpiry, setFormExpiry] = useState('');
  const [formExpiryDisplay, setFormExpiryDisplay] = useState('');
  const [formSecondExpiry, setFormSecondExpiry] = useState('');
  const [formEqStatus, setFormEqStatus] = useState<EquipmentStatus>('Operational');
  const [formNextPm, setFormNextPm] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formExtraCols, setFormExtraCols] = useState<Record<string, string>>({});

  const categoryItems = useMemo(
    () => items.filter((it) => it.categoryId === category.id),
    [items, category.id]
  );

  const summary = useMemo(() => {
    let expired = 0;
    let expiringSoon = 0;
    let lowStockOrFault = 0;

    for (const it of categoryItems) {
      const exp = getExpiryStatus(it.expiryDate, today);
      if (exp.state === 'expired') expired += 1;
      else if (exp.state === 'expiring-soon') expiringSoon += 1;

      if (category.isEquipment) {
        if (it.equipmentStatus && it.equipmentStatus !== 'Operational') lowStockOrFault += 1;
        else if (it.nextPmDate && daysBetween(today, it.nextPmDate) <= 14) lowStockOrFault += 1;
      } else if (it.quantity < it.parLevel) {
        lowStockOrFault += 1;
      }
    }
    return {
      total: categoryItems.length,
      expired,
      expiringSoon,
      lowStockOrFault,
    };
  }, [categoryItems, category.isEquipment, today]);

  const storeSections = useMemo(() => {
    if (!isStore) return [];
    const counts = new Map<string, number>();
    for (const sec of STORE_SECTIONS) counts.set(sec, 0);
    for (const it of categoryItems) {
      const key = it.locationDetail || 'SURGICAL DISPOSABLE';
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return Array.from(counts.entries())
      .filter(([, count]) => count > 0)
      .map(([name, count]) => ({ name, count }));
  }, [categoryItems, isStore]);

  const bloodTrolleyDrawers = useMemo(() => {
    if (!isBloodTrolley) return [];
    const counts = new Map<string, number>();
    for (const dr of BLOOD_TROLLEY_DRAWERS) counts.set(dr, 0);
    for (const it of categoryItems) {
      if (unitFilter !== 'All' && it.unit !== unitFilter) continue;
      const key = it.locationDetail?.trim() || BLOOD_TROLLEY_DRAWERS[0];
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return Array.from(counts.entries())
      .filter(([, count]) => count > 0)
      .map(([name, count]) => ({ name, count }));
  }, [categoryItems, isBloodTrolley, unitFilter]);

  const bloodTrolleyUnitTotal = useMemo(() => {
    if (!isBloodTrolley) return 0;
    if (unitFilter === 'All') return categoryItems.length;
    return categoryItems.filter((it) => it.unit === unitFilter).length;
  }, [categoryItems, isBloodTrolley, unitFilter]);

  const equipmentTablesSummary = useMemo(() => {
    if (!isEquipmentModule) return [];
    const counts = new Map<string, number>();
    for (const tbl of EQUIPMENT_TABLES) counts.set(tbl, 0);
    for (const it of categoryItems) {
      if (unitFilter !== 'All' && it.unit !== unitFilter) continue;
      const key = it.locationDetail?.trim() || 'Table 9 - Others';
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return Array.from(counts.entries())
      .filter(([, count]) => count > 0)
      .map(([name, count]) => ({ name, count }));
  }, [categoryItems, isEquipmentModule, unitFilter]);

  const equipmentUnitTotal = useMemo(() => {
    if (!isEquipmentModule) return 0;
    if (unitFilter === 'All') return categoryItems.length;
    return categoryItems.filter((it) => it.unit === unitFilter).length;
  }, [categoryItems, isEquipmentModule, unitFilter]);

  const filteredItems = useMemo(() => {
    return categoryItems.filter((it) => {
      if (category.supportsUnitSplit && unitFilter !== 'All' && it.unit !== unitFilter) return false;
      if (isStore && storeSectionFilter !== 'All' && it.locationDetail !== storeSectionFilter) {
        return false;
      }
      if (
        isBloodTrolley &&
        bloodTrolleyDrawerFilter !== 'All' &&
        it.locationDetail !== bloodTrolleyDrawerFilter
      ) {
        return false;
      }
      if (
        isEquipmentModule &&
        equipmentTableFilter !== 'All' &&
        it.locationDetail !== equipmentTableFilter
      ) {
        return false;
      }
      if (
        isStore &&
        storeEditorNearExpiryOnly &&
        !isStoreItemNearExpiry(it, today, storeNearExpiryMonths)
      ) {
        return false;
      }
      if (!isStore && statusFilter === 'attention' && !isItemAttentionNeeded(it, today)) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const extraHay = it.extraColumns ? Object.values(it.extraColumns).join(' ') : '';
        const hay =
          `${it.name} ${it.locationDetail} ${it.batchOrSerial} ${it.otherCode || ''} ${it.notes} ${extraHay}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    categoryItems,
    category.supportsUnitSplit,
    unitFilter,
    isStore,
    storeSectionFilter,
    storeEditorNearExpiryOnly,
    storeNearExpiryMonths,
    isBloodTrolley,
    bloodTrolleyDrawerFilter,
    isEquipmentModule,
    equipmentTableFilter,
    statusFilter,
    search,
    today,
  ]);

  const storeNearExpiryCount = useMemo(() => {
    if (!isStore) return 0;
    return categoryItems.filter((it) =>
      isStoreItemNearExpiry(it, today, storeNearExpiryMonths)
    ).length;
  }, [categoryItems, isStore, today, storeNearExpiryMonths]);

  const printableStoreItems = useMemo(() => {
    if (!isStore) return categoryItems;
    return categoryItems.filter((it) => {
      if (storeSectionFilter !== 'All' && it.locationDetail !== storeSectionFilter) return false;
      if (
        storePrintScope === 'near-expiry' &&
        !isStoreItemNearExpiry(it, today, storeNearExpiryMonths)
      ) {
        return false;
      }
      return true;
    });
  }, [
    categoryItems,
    isStore,
    storeSectionFilter,
    storePrintScope,
    storeNearExpiryMonths,
    today,
  ]);

  const groupedStoreSections = useMemo(() => {
    if (!isStore) return [];
    const map = new Map<string, InventoryItem[]>();
    for (const sec of STORE_SECTIONS) map.set(sec, []);
    for (const it of filteredItems) {
      const key = it.locationDetail?.trim() || STORE_SECTIONS[0];
      const bucket = map.get(key);
      if (bucket) bucket.push(it);
      else map.set(key, [it]);
    }
    return Array.from(map.entries())
      .filter(([, list]) => list.length > 0)
      .map(([name, list]) => ({ name, items: list }));
  }, [filteredItems, isStore]);

  const groupedEquipmentTables = useMemo(() => {
    if (!isEquipmentModule) return [];
    const map = new Map<string, InventoryItem[]>();
    for (const tbl of EQUIPMENT_TABLES) map.set(tbl, []);
    for (const it of filteredItems) {
      const key = it.locationDetail?.trim() || 'Table 9 - Others';
      const bucket = map.get(key);
      if (bucket) bucket.push(it);
      else map.set(key, [it]);
    }
    return Array.from(map.entries())
      .filter(([, list]) => list.length > 0)
      .map(([name, list]) => ({ name, items: list }));
  }, [filteredItems, isEquipmentModule]);

  const table5ColumnTotals = useMemo(() => {
    if (!isEquipmentModule) return {};
    const table5AllItems = categoryItems.filter(
      (it) => it.locationDetail?.trim() === 'Table 5 – Suction and Oxygenation Items'
    );
    return computeTable5ColumnTotals(table5AllItems);
  }, [categoryItems, isEquipmentModule]);

  const toggleStoreSection = (secName: string) => {
    setCollapsedStoreSections((prev) => ({
      ...prev,
      [secName]: !prev[secName],
    }));
  };

  const setAllStoreSectionsCollapsed = (collapsed: boolean) => {
    const next: Record<string, boolean> = {};
    for (const sec of groupedStoreSections) {
      next[sec.name] = collapsed;
    }
    setCollapsedStoreSections(next);
  };

  const toggleEquipmentTable = (tableName: string) => {
    setCollapsedEquipmentTables((prev) => ({
      ...prev,
      [tableName]: !prev[tableName],
    }));
  };

  const setAllEquipmentTablesCollapsed = (collapsed: boolean) => {
    const next: Record<string, boolean> = {};
    for (const tbl of groupedEquipmentTables) {
      next[tbl.name] = collapsed;
    }
    setCollapsedEquipmentTables(next);
  };

  const sectionStaffAssignments: StoreStaffAssignment[] = useMemo(() => {
    if (sectionMeta?.staffAssignments && sectionMeta.staffAssignments.length > 0) {
      return sectionMeta.staffAssignments;
    }
    const [y, m, d] = today.split('-');
    const slashDate = y && m && d ? `${d}/${m}/${y}` : '';
    return [
      {
        id: isProcedureTrolley
          ? 'pt-staff-1'
          : isPrepRoom
            ? 'pr-staff-1'
            : isBloodTrolley
              ? 'bt-staff-1'
              : isEquipmentModule
                ? 'eq-staff-1'
                : 'st-staff-1',
        staffName: sectionMeta?.staffName ?? defaultInspector,
        role: isProcedureTrolley
          ? 'Staff Nurse / Trolley Lead'
          : isPrepRoom
            ? 'Staff Nurse / CCU & SD Lead'
            : isBloodTrolley
              ? 'Staff Nurse / Trolley Lead'
              : isEquipmentModule
                ? 'Staff Nurse / Equipment Lead'
                : 'Staff Nurse / Store Lead',
        assignedSections: isProcedureTrolley
          ? 'All Procedure Trolley Items (No. 1–42)'
          : isPrepRoom
            ? 'CCU & SD Preparation Room Checklists'
            : isBloodTrolley
              ? 'All Drawers (1st – 4th Drawer)'
              : isEquipmentModule
                ? 'All Medical Equipment Tables (1–9)'
                : 'All Store Categories',
        checkedDate: sectionMeta?.date || slashDate,
        signature: sectionMeta?.signature || '',
      },
    ];
  }, [
    sectionMeta,
    defaultInspector,
    today,
    isProcedureTrolley,
    isPrepRoom,
    isBloodTrolley,
    isEquipmentModule,
  ]);

  const syncSectionStaffList = (nextList: StoreStaffAssignment[]) => {
    if (!onUpdateSectionMeta) return;
    const first = nextList[0];
    onUpdateSectionMeta({
      staffAssignments: nextList,
      staffName: first?.staffName || '',
      signature: first?.signature || '',
      date: first?.checkedDate || '',
    });
  };

  const updateSectionStaffField = (
    idx: number,
    field: keyof StoreStaffAssignment,
    val: string
  ) => {
    const next = sectionStaffAssignments.map((st, i) =>
      i === idx ? { ...st, [field]: val } : st
    );
    syncSectionStaffList(next);
  };

  const addSectionStaffRow = () => {
    const [y, m, d] = today.split('-');
    const slashDate = y && m && d ? `${d}/${m}/${y}` : '';
    const next: StoreStaffAssignment[] = [
      ...sectionStaffAssignments,
      {
        id: `${
          isProcedureTrolley
            ? 'pt'
            : isPrepRoom
              ? 'pr'
              : isBloodTrolley
                ? 'bt'
                : isEquipmentModule
                  ? 'eq'
                  : 'st'
        }-staff-${Date.now().toString(36)}`,
        staffName: '',
        role: 'Staff Nurse',
        assignedSections: '',
        checkedDate: slashDate,
        signature: '',
      },
    ];
    syncSectionStaffList(next);
  };

  const removeSectionStaffRow = (idx: number) => {
    if (sectionStaffAssignments.length <= 1) return;
    syncSectionStaffList(sectionStaffAssignments.filter((_, i) => i !== idx));
  };

  const openAdd = (presetSectionOrTable?: string) => {
    const defaultPrepUnit: 'CCU' | 'SD' = unitFilter === 'SD' ? 'SD' : 'CCU';
    const defaultEqUnit: 'CCU' | 'SD' | 'General Ward' =
      unitFilter === 'SD' ? 'SD' : unitFilter === 'General Ward' ? 'General Ward' : 'CCU';
    const targetEqTable =
      presetSectionOrTable ||
      (equipmentTableFilter !== 'All' ? equipmentTableFilter : EQUIPMENT_TABLES[0]);
    const nextEqRowNo = isEquipmentModule
      ? String(categoryItems.filter((it) => it.locationDetail === targetEqTable).length + 1)
      : '';

    setEditingItem(null);
    setFormName('');
    setFormUnit(
      isPrepRoom || isBloodTrolley
        ? defaultPrepUnit
        : isEquipmentModule
          ? defaultEqUnit
          : category.supportsUnitSplit
            ? 'CCU'
            : 'General Ward'
    );
    setFormLocation(
      isStore
        ? presetSectionOrTable ||
            (storeSectionFilter !== 'All' ? storeSectionFilter : STORE_SECTIONS[0])
        : isEquipmentModule
          ? targetEqTable
          : isProcedureTrolley
            ? `No. ${categoryItems.length + 1}`
            : isPrepRoom
              ? `${defaultPrepUnit} Prep Room #${String(
                  categoryItems.filter((it) => it.unit === defaultPrepUnit).length + 1
                ).padStart(2, '0')}`
              : isBloodTrolley
                ? bloodTrolleyDrawerFilter !== 'All'
                  ? bloodTrolleyDrawerFilter
                  : BLOOD_TROLLEY_DRAWERS[0]
                : ''
    );
    setFormQty(
      category.isEquipment
        ? 1
        : isStore
          ? 0
          : isProcedureTrolley || isPrepRoom || isBloodTrolley
            ? 1
            : 10
    );
    setFormPar(
      category.isEquipment
        ? 1
        : isStore
          ? 0
          : isProcedureTrolley || isPrepRoom || isBloodTrolley
            ? 1
            : 10
    );
    setFormUom(category.isEquipment ? 'unit' : 'pcs');
    setFormBatch(isPrepRoom && defaultPrepUnit === 'CCU' ? 'CSSD' : '');
    setFormOtherCode(nextEqRowNo);
    setFormExpiry('');
    setFormExpiryDisplay('');
    setFormSecondExpiry('');
    setFormEqStatus('Operational');
    setFormNextPm('');
    setFormNotes('');
    setFormExtraCols({});
    setShowAddModal(true);
  };

  const openEdit = (item: InventoryItem) => {
    const displayExp =
      item.expiryDisplay !== undefined
        ? item.expiryDisplay
        : item.expiryDate
          ? item.expiryDate.split('-').reverse().join('/')
          : '';
    setEditingItem(item);
    setFormName(item.name);
    setFormUnit(item.unit);
    setFormLocation(item.locationDetail);
    setFormQty(item.quantity);
    setFormPar(item.parLevel);
    setFormUom(item.unitOfMeasure);
    setFormBatch(item.batchOrSerial);
    setFormOtherCode(item.otherCode || '');
    setFormExpiry(item.expiryDate || '');
    setFormExpiryDisplay(displayExp);
    setFormSecondExpiry(item.secondExpiryDate || '');
    setFormEqStatus(item.equipmentStatus || 'Operational');
    setFormNextPm(item.nextPmDate || '');
    setFormNotes(item.notes);
    setFormExtraCols(item.extraColumns ? { ...item.extraColumns } : {});
    setShowAddModal(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const computedExpiryDate =
      isPrepRoom || isBloodTrolley
        ? getEarliestIsoFromExpiryText(formExpiryDisplay)
        : formExpiry
          ? formExpiry
          : null;

    const eqTableCols = isEquipmentModule ? getEquipmentTableExtraCols(formLocation) : [];
    const cleanedExtraCols = isEquipmentModule
      ? (() => {
          const out: Record<string, string> = {};
          const isTickTable =
            isTickableEquipmentTable(formLocation) &&
            !(
              formLocation === 'Table 5 – Suction and Oxygenation Items' &&
              (formOtherCode.trim() === 'Store' || formOtherCode.trim() === 'Total')
            );
          for (const col of eqTableCols) {
            if (isTickTable) {
              out[col.key] = isEquipmentAccessoryTicked(formExtraCols[col.key]) ? '✓' : '';
            } else {
              out[col.key] = (formExtraCols[col.key] || '').trim();
            }
          }
          if (formLocation === 'Table 4 – Crash Cart Trolleys') {
            out.defibrillator = (formExtraCols.defibrillator || formName).trim();
          }
          return Object.keys(out).length > 0 ? out : undefined;
        })()
      : editingItem?.extraColumns;

    const payload: Omit<InventoryItem, 'id'> = {
      categoryId: category.id,
      name: formName.trim(),
      unit: category.supportsUnitSplit ? formUnit : isBloodTrolley ? 'CCU' : 'General Ward',
      locationDetail: formLocation.trim() || category.shortLabel,
      quantity: Math.max(0, Number(formQty) || 0),
      parLevel: Math.max(0, Number(formPar) || 0),
      unitOfMeasure: formUom.trim() || 'pcs',
      batchOrSerial: formBatch.trim() || '—',
      otherCode:
        isStore || isEquipmentModule ? formOtherCode.trim() || undefined : editingItem?.otherCode,
      expiryDate: computedExpiryDate,
      expiryDisplay:
        isPrepRoom || isBloodTrolley ? formExpiryDisplay.trim() : editingItem?.expiryDisplay,
      secondExpiryDate:
        isStore || isProcedureTrolley
          ? formSecondExpiry
            ? formSecondExpiry
            : null
          : editingItem?.secondExpiryDate,
      equipmentStatus: category.isEquipment ? formEqStatus : undefined,
      nextPmDate: category.isEquipment ? formNextPm || null : undefined,
      extraColumns: cleanedExtraCols,
      lastCheckedDate: today,
      lastCheckedBy: defaultInspector,
      notes: formNotes.trim(),
    };

    if (editingItem) {
      onUpdateItem(editingItem.id, payload);
    } else {
      onAddItem(payload);
    }
    setShowAddModal(false);
  };

  return (
    <div className="space-y-5">
      {/* Section Header & Summary Strip */}
      <div className="no-print bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{category.label}</h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">{category.description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-right">
            <div>
              <div className="text-[11px] font-medium text-slate-500">Tracked Items</div>
              <div className="text-xl font-semibold font-mono tabular-nums text-slate-900">
                {summary.total}
              </div>
            </div>
            {!category.isEquipment && (
              <>
                <div>
                  <div className="text-[11px] font-medium text-slate-500">Expired</div>
                  <div
                    className={`text-xl font-semibold font-mono tabular-nums ${
                      summary.expired > 0 ? 'text-rose-700' : 'text-slate-900'
                    }`}
                  >
                    {summary.expired}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-medium text-slate-500">Expiring &le; 30d</div>
                  <div
                    className={`text-xl font-semibold font-mono tabular-nums ${
                      summary.expiringSoon > 0 ? 'text-amber-700' : 'text-slate-900'
                    }`}
                  >
                    {summary.expiringSoon}
                  </div>
                </div>
              </>
            )}
            <div>
              <div className="text-[11px] font-medium text-slate-500">
                {category.isEquipment ? 'Needs Maintenance / PPM' : 'Below Par Stock'}
              </div>
              <div
                className={`text-xl font-semibold font-mono tabular-nums ${
                  summary.lowStockOrFault > 0 ? 'text-amber-700' : 'text-emerald-700'
                }`}
              >
                {summary.lowStockOrFault}
              </div>
            </div>
            {isEquipmentModule && (
              <div>
                <div className="text-[11px] font-medium text-slate-500">
                  Active Repair Logs
                </div>
                <div
                  className={`text-xl font-semibold font-mono tabular-nums ${
                    equipmentMaintenanceLogs.filter((l) => l.status !== 'Repaired / Returned')
                      .length > 0
                      ? 'text-rose-700'
                      : 'text-emerald-700'
                  }`}
                >
                  {
                    equipmentMaintenanceLogs.filter((l) => l.status !== 'Repaired / Returned')
                      .length
                  }
                </div>
              </div>
            )}
          </div>
        </div>

        {!isTransferBag && !isStore && onUpdateSectionMeta && (
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 max-w-2xl gap-3 flex-1">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Ward Number
                  </label>
                  <input
                    type="text"
                    value={sectionMeta?.wardNumber || ''}
                    onChange={(e) => onUpdateSectionMeta({ wardNumber: e.target.value })}
                    placeholder={wardName || 'e.g., 208 / CCU'}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Month</label>
                  <input
                    type="text"
                    value={sectionMeta?.month || ''}
                    onChange={(e) => onUpdateSectionMeta({ month: e.target.value })}
                    placeholder="e.g., November"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Year</label>
                  <input
                    type="text"
                    value={sectionMeta?.year || ''}
                    onChange={(e) => onUpdateSectionMeta({ year: e.target.value })}
                    placeholder="2026"
                    className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
              </div>

              {(isProcedureTrolley || isPrepRoom || isBloodTrolley || isEquipmentModule) && (
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {(isPrepRoom || isBloodTrolley) && (
                    <div
                      className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg"
                      title="Choose which unit checklist to include in printout"
                    >
                      {(
                        [
                          { id: 'both', label: 'Both (CCU + SD)' },
                          { id: 'CCU', label: 'CCU Only' },
                          { id: 'SD', label: 'SD Only' },
                        ] as const
                      ).map((opt) => {
                        const activeScope = isPrepRoom
                          ? prepRoomPrintScope
                          : bloodTrolleyPrintScope;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() =>
                              isPrepRoom
                                ? setPrepRoomPrintScope(opt.id)
                                : setBloodTrolleyPrintScope(opt.id)
                            }
                            className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                              activeScope === opt.id
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {isEquipmentModule ? (
                    equipmentPrintScope === 'maintenance-only' ||
                    equipmentSectionTab === 'maintenance' ? (
                      <div
                        className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg"
                        title="Filter Maintenance, Repair Log & Follow-Up printout entries"
                      >
                        {(
                          [
                            { id: 'all', label: 'All Logs' },
                            { id: 'active', label: 'Active Only' },
                            { id: 'repaired', label: 'Repaired Only' },
                          ] as const
                        ).map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setEquipmentMaintenancePrintFilter(opt.id)}
                            className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                              equipmentMaintenancePrintFilter === opt.id
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div
                        className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg"
                        title="Choose Medical Equipment printout pagination"
                      >
                        <button
                          type="button"
                          onClick={() => setEquipmentPrintLayout('grouped')}
                          className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                            equipmentPrintLayout === 'grouped'
                              ? 'bg-white text-slate-900 shadow-sm'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Grouped (Official)
                        </button>
                        <button
                          type="button"
                          onClick={() => setEquipmentPrintLayout('one-per-sheet')}
                          className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                            equipmentPrintLayout === 'one-per-sheet'
                              ? 'bg-white text-slate-900 shadow-sm'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          1 Table / Page
                        </button>
                      </div>
                    )
                  ) : (
                    <div
                      className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg"
                      title="Choose printout layout"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          isPrepRoom
                            ? setPrepRoomPrintLayout('two-per-sheet')
                            : isBloodTrolley
                              ? setBloodTrolleyPrintLayout('two-per-sheet')
                              : setTrolleyPrintLayout('two-per-sheet')
                        }
                        className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                          (isPrepRoom
                            ? prepRoomPrintLayout
                            : isBloodTrolley
                              ? bloodTrolleyPrintLayout
                              : trolleyPrintLayout) === 'two-per-sheet'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {isBloodTrolley ? '2 Tables / Page' : '2 Tables / Sheet'}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          isPrepRoom
                            ? setPrepRoomPrintLayout('one-per-sheet')
                            : isBloodTrolley
                              ? setBloodTrolleyPrintLayout('one-per-sheet')
                              : setTrolleyPrintLayout('one-per-sheet')
                        }
                        className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                          (isPrepRoom
                            ? prepRoomPrintLayout
                            : isBloodTrolley
                              ? bloodTrolleyPrintLayout
                              : trolleyPrintLayout) === 'one-per-sheet'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {isBloodTrolley ? '1 Table / Page' : '1 Table / Sheet'}
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setViewMode('editor')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                        viewMode === 'editor'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <FileEdit className="w-3.5 h-3.5" />
                      Edit List
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('print-preview')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                        viewMode === 'print-preview'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Print Preview
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    {isEquipmentModule
                      ? equipmentPrintScope === 'maintenance-only' ||
                        equipmentSectionTab === 'maintenance'
                        ? 'Print Repair Report (A4)'
                        : 'Print Inventory (A4)'
                      : 'Print Checklist (A4)'}
                  </button>
                </div>
              )}
            </div>

            {isPrepRoom && (
              <div className="max-w-3xl">
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  CCU Checklist Comments (printed at bottom of CCU form)
                </label>
                <input
                  type="text"
                  value={sectionMeta?.comments ?? ''}
                  onChange={(e) => onUpdateSectionMeta({ comments: e.target.value })}
                  placeholder="Expired items were sent to CSSD Department."
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>
            )}
          </div>
        )}

        {isStore && onUpdateSectionMeta && (
          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-end justify-between gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 flex-1 max-w-2xl">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Ward Number
                </label>
                <input
                  type="text"
                  value={sectionMeta?.wardNumber || ''}
                  onChange={(e) => onUpdateSectionMeta({ wardNumber: e.target.value })}
                  placeholder={wardName || 'e.g., 208 / CCU'}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Month</label>
                <input
                  type="text"
                  value={sectionMeta?.month || ''}
                  onChange={(e) => onUpdateSectionMeta({ month: e.target.value })}
                  placeholder="e.g., November"
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Year</label>
                <input
                  type="text"
                  value={sectionMeta?.year || ''}
                  onChange={(e) => onUpdateSectionMeta({ year: e.target.value })}
                  placeholder="2026"
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div
                className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg"
                title="Choose which Store items to print"
              >
                <button
                  type="button"
                  onClick={() => setStorePrintScope('all')}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    storePrintScope === 'all'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All Items
                </button>
                <button
                  type="button"
                  onClick={() => setStorePrintScope('near-expiry')}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    storePrintScope === 'near-expiry'
                      ? 'bg-amber-50 text-amber-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Near Expiry ({storeNearExpiryCount})
                </button>
              </div>

              <div
                className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg"
                title="Choose Store printout layout"
              >
                <button
                  type="button"
                  onClick={() => setStorePrintLayout('two-per-sheet')}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    storePrintLayout === 'two-per-sheet'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  2 Tables / Sheet
                </button>
                <button
                  type="button"
                  onClick={() => setStorePrintLayout('one-per-sheet')}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    storePrintLayout === 'one-per-sheet'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  1 Table / Sheet
                </button>
              </div>

              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setViewMode('editor')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    viewMode === 'editor'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileEdit className="w-3.5 h-3.5" />
                  Edit List
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('print-preview')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    viewMode === 'print-preview'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  Print Preview
                </button>
              </div>

              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Checklist (A4)
              </button>
            </div>
          </div>
        )}

        {isTransferBag && (
          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 flex-1 min-w-[320px]">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Ward Number
                </label>
                <input
                  type="text"
                  value={transferBagMeta?.wardNumber || ''}
                  onChange={(e) => onUpdateTransferBagMeta?.({ wardNumber: e.target.value })}
                  placeholder="e.g., 208 / CCU"
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Month</label>
                <input
                  type="text"
                  value={transferBagMeta?.month || ''}
                  onChange={(e) => onUpdateTransferBagMeta?.({ month: e.target.value })}
                  placeholder="e.g., November"
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Year</label>
                <input
                  type="text"
                  value={transferBagMeta?.year || ''}
                  onChange={(e) => onUpdateTransferBagMeta?.({ year: e.target.value })}
                  placeholder="2026"
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Checked By
                </label>
                <input
                  type="text"
                  value={transferBagMeta?.checkedBy || ''}
                  onChange={(e) => onUpdateTransferBagMeta?.({ checkedBy: e.target.value })}
                  placeholder={defaultInspector}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Date</label>
                <input
                  type="text"
                  value={transferBagMeta?.date || ''}
                  onChange={(e) => onUpdateTransferBagMeta?.({ date: e.target.value })}
                  placeholder="DD/MM/YYYY"
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setViewMode('editor')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    viewMode === 'editor'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileEdit className="w-3.5 h-3.5" />
                  Edit List
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('print-preview')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    viewMode === 'print-preview'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  Print Preview
                </button>
              </div>

              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Checklist (A4)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Assigned Staff Card for Store, Procedure Trolley, Prep Room, Blood Trolley & Medical Equipment */}
      {(isStore || isProcedureTrolley || isPrepRoom || isBloodTrolley || isEquipmentModule) &&
        viewMode === 'editor' && (
          <div className="no-print bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-700" />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">
                      {isProcedureTrolley
                        ? 'Assigned Staff (Procedure Trolley Checklist)'
                        : isPrepRoom
                          ? 'Assigned Staff (Preparation Room Checklists)'
                          : isBloodTrolley
                            ? 'Assigned Staff (Blood Collection Trolley Checklist)'
                            : isEquipmentModule
                              ? 'Assigned Staff (Medical Equipment Monthly Inventory)'
                              : 'Assigned Staff (Monthly Store Checklist)'}
                    </h3>
                    <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                      {sectionStaffAssignments.filter((s) => s.staffName.trim()).length} /{' '}
                      {sectionStaffAssignments.length} Assigned
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isProcedureTrolley
                      ? 'Assign one or more ward staff members to check Procedure Trolley items. All assigned staff appear on the printed checklist sign-off block.'
                      : isPrepRoom
                        ? 'Assign one or more ward staff members to check CCU and SD Preparation Room items. All assigned staff appear on the printed checklist sign-off block.'
                        : isBloodTrolley
                          ? 'Assign one or more ward staff members to check Blood Collection Trolley drawers. All assigned staff appear on the printed checklist sign-off block.'
                          : isEquipmentModule
                            ? 'Assign one or more ward staff members to check Medical Equipment Tables (1–9). All assigned staff appear on the printed inventory sign-off block.'
                            : 'Assign one or more ward staff members to check Store categories. All assigned staff appear on the printed GH/NUR/2025-19 sign-off block.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={addSectionStaffRow}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-md transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Staff Member
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-md">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-medium text-slate-600">
                    <th className="py-2 px-2.5 w-10 text-center">#</th>
                    <th className="py-2 px-2.5 min-w-[170px]">Staff Name</th>
                    <th className="py-2 px-2.5 min-w-[140px]">Role</th>
                    <th className="py-2 px-2.5 min-w-[210px]">
                      {isProcedureTrolley
                        ? 'Assigned Rows / Scope'
                        : isPrepRoom
                          ? 'Assigned Room / Scope'
                          : isBloodTrolley
                            ? 'Assigned Drawers / Scope'
                            : isEquipmentModule
                              ? 'Assigned Tables / Scope'
                              : 'Assigned Categories'}
                    </th>
                    <th className="py-2 px-2.5 w-32 text-center">Date Checked</th>
                    <th className="py-2 px-2.5 w-36 text-center">Signature</th>
                    <th className="py-2 px-2 w-10 text-center">
                      <span className="sr-only">Remove</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {sectionStaffAssignments.map((st, idx) => (
                    <tr key={st.id} className="hover:bg-slate-50/70">
                      <td className="p-1.5 text-center font-mono text-slate-500">{idx + 1}</td>
                      <td className="p-1.5">
                        <input
                          type="text"
                          value={st.staffName}
                          onChange={(e) => updateSectionStaffField(idx, 'staffName', e.target.value)}
                          placeholder={`Staff ${idx + 1} full name`}
                          className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-700"
                        />
                      </td>
                      <td className="p-1.5">
                        <input
                          type="text"
                          value={st.role}
                          onChange={(e) => updateSectionStaffField(idx, 'role', e.target.value)}
                          placeholder={
                            isProcedureTrolley || isBloodTrolley
                              ? 'e.g., Staff Nurse / Trolley Lead'
                              : isPrepRoom
                                ? 'e.g., Staff Nurse / CCU or SD Lead'
                                : isEquipmentModule
                                  ? 'e.g., Staff Nurse / Equipment Lead'
                                  : 'e.g., Staff Nurse / Storekeeper'
                          }
                          className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-700"
                        />
                      </td>
                      <td className="p-1.5">
                        <input
                          type="text"
                          value={st.assignedSections}
                          onChange={(e) =>
                            updateSectionStaffField(idx, 'assignedSections', e.target.value)
                          }
                          placeholder={
                            isProcedureTrolley
                              ? 'e.g., All Items (No. 1–42)'
                              : isPrepRoom
                                ? 'e.g., CCU Prep Room (No. 1–38) / SD Prep Room'
                                : isBloodTrolley
                                  ? 'e.g., CCU / SD — All Drawers (1st – 4th Drawer)'
                                  : isEquipmentModule
                                    ? 'e.g., Tables 1–5 (Beds, Monitors, Central)'
                                    : 'e.g., Surgical Disposable & Dressing'
                          }
                          className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-700"
                        />
                    </td>
                    <td className="p-1.5">
                      <input
                        type="text"
                        value={st.checkedDate}
                        onChange={(e) =>
                          updateSectionStaffField(idx, 'checkedDate', e.target.value)
                        }
                        placeholder="DD/MM/YYYY"
                        className="w-full px-2 py-1 text-xs font-mono text-center border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-700"
                      />
                    </td>
                    <td className="p-1.5">
                      <input
                        type="text"
                        value={st.signature}
                        onChange={(e) => updateSectionStaffField(idx, 'signature', e.target.value)}
                        placeholder="Sign / Initials"
                        className="w-full px-2 py-1 text-xs text-center border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-700"
                      />
                    </td>
                    <td className="p-1.5 text-center">
                      <button
                        type="button"
                        onClick={() => removeSectionStaffRow(idx)}
                        disabled={sectionStaffAssignments.length <= 1}
                        title={
                          sectionStaffAssignments.length <= 1
                            ? 'At least 1 assigned staff required'
                            : 'Remove staff member'
                        }
                        className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30 disabled:pointer-events-none rounded cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Filter & Inventory Grid */}
      {isStore ? (
        <div
          className={`no-print space-y-4 ${
            viewMode === 'print-preview' ? 'hidden' : ''
          }`}
        >
          {/* Categorized Store Filter Bar */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setStoreSectionFilter('All')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  storeSectionFilter === 'All'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Categories ({categoryItems.length})
              </button>
              {storeSections.map((sec) => (
                <button
                  key={sec.name}
                  type="button"
                  onClick={() => setStoreSectionFilter(sec.name)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    storeSectionFilter === sec.name
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {sec.name} ({sec.count})
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setStoreEditorNearExpiryOnly(false)}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                      !storeEditorNearExpiryOnly
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Show All
                  </button>
                  <button
                    type="button"
                    onClick={() => setStoreEditorNearExpiryOnly(true)}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                      storeEditorNearExpiryOnly
                        ? 'bg-white text-amber-800 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Near Expiry ({storeNearExpiryCount})
                  </button>
                </div>

                {storeEditorNearExpiryOnly && (
                  <select
                    value={storeNearExpiryMonths}
                    onChange={(e) => setStoreNearExpiryMonths(Number(e.target.value) as 1 | 3 | 6)}
                    aria-label="Near expiry window"
                    className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  >
                    <option value={1}>Within 1 Month</option>
                    <option value={3}>Within 3 Months</option>
                    <option value={6}>Within 6 Months</option>
                  </select>
                )}

                {storeSectionFilter === 'All' && groupedStoreSections.length > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setAllStoreSectionsCollapsed(false)}
                      className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                    >
                      Expand All
                    </button>
                    <button
                      type="button"
                      onClick={() => setAllStoreSectionsCollapsed(true)}
                      className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                    >
                      Collapse All
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search description or item code..."
                    className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-md w-64 focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => openAdd()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Item
                </button>
              </div>
            </div>
          </div>

          {/* Categorized Store Section Cards */}
          {groupedStoreSections.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
              <h3 className="text-sm font-semibold text-slate-900">
                No items match current filter
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Add an item to this category or clear your search/status filters.
              </p>
              <button
                type="button"
                onClick={() => openAdd()}
                className="mt-4 px-3.5 py-1.5 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors cursor-pointer"
              >
                Add Entry
              </button>
            </div>
          ) : (
            groupedStoreSections.map((section) => {
              const isCollapsed =
                storeSectionFilter === 'All' &&
                !search.trim() &&
                Boolean(collapsedStoreSections[section.name]);

              return (
                <div
                  key={section.name}
                  className="bg-white border border-slate-200 rounded-lg overflow-hidden"
                >
                  <div className="px-4 py-2.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => toggleStoreSection(section.name)}
                      className="flex items-center gap-2 text-left cursor-pointer"
                    >
                      {isCollapsed ? (
                        <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-300 shrink-0" />
                      )}
                      <h3 className="text-sm font-semibold tracking-wide">
                        {section.name}
                      </h3>
                      <span className="font-mono text-xs text-slate-300 tabular-nums">
                        ({section.items.length})
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openAdd(section.name)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-teal-100 bg-teal-800/80 hover:bg-teal-700 rounded transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add to {section.name}
                    </button>
                  </div>

                  {!isCollapsed && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-medium text-slate-500">
                            <th className="py-2.5 px-3 w-12 text-center">#</th>
                            <th className="py-2.5 px-3">Stock No.</th>
                            <th className="py-2.5 px-3">Item description</th>
                            <th className="py-2.5 px-3">Quantity available</th>
                            <th className="py-2.5 px-3">Expiry Date 1</th>
                            <th className="py-2.5 px-3">Expiry Date 2</th>
                            <th className="py-2.5 px-3">Last Verified</th>
                            <th className="py-2.5 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-sm">
                          {section.items.map((item, idx) => {
                            const exp = getExpiryStatus(item.expiryDate, today);
                            const exp2 = getExpiryStatus(item.secondExpiryDate || null, today);
                            const isLowStock = item.quantity < item.parLevel;
                            return (
                              <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-2.5 px-3 text-center font-mono text-xs text-slate-400">
                                  {idx + 1}
                                </td>

                                <td className="py-2.5 px-3 whitespace-nowrap font-mono text-xs text-slate-700">
                                  <div>{item.batchOrSerial}</div>
                                  {item.otherCode && (
                                    <div className="text-[11px] text-slate-400">
                                      Other: {item.otherCode}
                                    </div>
                                  )}
                                </td>

                                <td className="py-2.5 px-3 max-w-md">
                                  <div className="font-medium text-slate-900">{item.name}</div>
                                  {item.notes && (
                                    <div
                                      className="mt-0.5 text-xs text-slate-500 truncate max-w-sm"
                                      title={item.notes}
                                    >
                                      {item.notes}
                                    </div>
                                  )}
                                </td>

                                <td className="py-2.5 px-3 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      aria-label="Decrease quantity"
                                      onClick={() =>
                                        onUpdateItem(item.id, {
                                          quantity: Math.max(0, item.quantity - 1),
                                        })
                                      }
                                      className="p-1 text-slate-500 hover:text-slate-900 border border-slate-200 rounded hover:bg-slate-100 cursor-pointer"
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <span
                                      className={`font-mono tabular-nums text-xs font-semibold min-w-[68px] text-center ${
                                        isLowStock ? 'text-amber-700' : 'text-slate-900'
                                      }`}
                                    >
                                      {item.quantity} / {item.parLevel} {item.unitOfMeasure}
                                    </span>
                                    <button
                                      type="button"
                                      aria-label="Increase quantity"
                                      onClick={() =>
                                        onUpdateItem(item.id, { quantity: item.quantity + 1 })
                                      }
                                      className="p-1 text-slate-500 hover:text-slate-900 border border-slate-200 rounded hover:bg-slate-100 cursor-pointer"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>
                                </td>

                                <td className="py-2.5 px-3 whitespace-nowrap text-xs">
                                  <div className="font-mono tabular-nums text-slate-900">
                                    {formatShortDate(item.expiryDate)}
                                  </div>
                                  <div
                                    className={`text-[11px] font-medium inline-flex items-center gap-1 ${
                                      exp.state === 'expired'
                                        ? 'text-rose-700'
                                        : exp.state === 'expiring-soon'
                                          ? 'text-amber-700'
                                          : exp.state === 'valid'
                                            ? 'text-emerald-700'
                                            : 'text-slate-500'
                                    }`}
                                  >
                                    {exp.state === 'expired' && <XCircle className="w-3 h-3" />}
                                    {exp.state === 'expiring-soon' && (
                                      <AlertTriangle className="w-3 h-3" />
                                    )}
                                    {exp.state === 'valid' && <CheckCircle2 className="w-3 h-3" />}
                                    <span className="tabular-nums">{exp.label}</span>
                                  </div>
                                </td>

                                <td className="py-2.5 px-3 whitespace-nowrap text-xs">
                                  <div className="font-mono tabular-nums text-slate-900">
                                    {formatShortDate(item.secondExpiryDate || null)}
                                  </div>
                                  {item.secondExpiryDate && (
                                    <div
                                      className={`text-[11px] font-medium inline-flex items-center gap-1 ${
                                        exp2.state === 'expired'
                                          ? 'text-rose-700'
                                          : exp2.state === 'expiring-soon'
                                            ? 'text-amber-700'
                                            : exp2.state === 'valid'
                                              ? 'text-emerald-700'
                                              : 'text-slate-500'
                                      }`}
                                    >
                                      {exp2.state === 'expired' && <XCircle className="w-3 h-3" />}
                                      {exp2.state === 'expiring-soon' && (
                                        <AlertTriangle className="w-3 h-3" />
                                      )}
                                      {exp2.state === 'valid' && (
                                        <CheckCircle2 className="w-3 h-3" />
                                      )}
                                      <span className="tabular-nums">{exp2.label}</span>
                                    </div>
                                  )}
                                </td>

                                <td className="py-2.5 px-3 whitespace-nowrap text-xs text-slate-600">
                                  <div className="font-mono tabular-nums">
                                    {formatShortDate(item.lastCheckedDate)}
                                  </div>
                                  <div className="text-[11px] text-slate-400 truncate max-w-[130px]">
                                    {item.lastCheckedBy}
                                  </div>
                                </td>

                                <td className="py-2.5 px-4 whitespace-nowrap text-right">
                                  <div className="inline-flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => onVerifyItem(item.id, defaultInspector)}
                                      className="px-2.5 py-1 text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 rounded transition-colors cursor-pointer"
                                    >
                                      Verify
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => openEdit(item)}
                                      title="Edit item"
                                      className="p-1.5 text-slate-400 hover:text-slate-800 rounded transition-colors cursor-pointer"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onDeleteItem(item.id)}
                                      title="Delete item"
                                      className="p-1.5 text-slate-400 hover:text-rose-700 rounded transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : isEquipmentModule ? (
        <div
          className={`no-print space-y-4 ${viewMode === 'print-preview' ? 'hidden' : ''}`}
        >
          {/* Medical Equipment Part Switcher: Inventory Tables vs Maintenance, Repair Log & Follow-Up */}
          <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => {
                  setEquipmentSectionTab('inventory');
                  setEquipmentPrintScope('all');
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  equipmentSectionTab === 'inventory'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Inventory Tables ({equipmentUnitTotal})
              </button>
              <button
                type="button"
                onClick={() => {
                  setEquipmentSectionTab('maintenance');
                  setEquipmentPrintScope('maintenance-only');
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  equipmentSectionTab === 'maintenance'
                    ? 'bg-white text-amber-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                Maintenance, Repair Log &amp; Follow-Up ({equipmentMaintenanceLogs.length})
              </button>
            </div>
          </div>

          {/* Part 1: Medical Equipment Maintenance, Repair Log & Follow-Up */}
          {equipmentSectionTab === 'maintenance' &&
            onAddEquipmentMaintenanceLog &&
            onUpdateEquipmentMaintenanceLog &&
            onDeleteEquipmentMaintenanceLog && (
              <EquipmentMaintenanceLogSection
                logs={equipmentMaintenanceLogs}
                equipmentItems={categoryItems}
                defaultInspector={defaultInspector}
                preselectedItemForNewLog={preselectedItemForRepair}
                onClearPreselectedItem={() => setPreselectedItemForRepair(null)}
                onAddLog={onAddEquipmentMaintenanceLog}
                onUpdateLog={onUpdateEquipmentMaintenanceLog}
                onDeleteLog={onDeleteEquipmentMaintenanceLog}
                onPrintReport={(filter, unit, autoPrint) => {
                  setEquipmentPrintScope('maintenance-only');
                  setEquipmentMaintenancePrintFilter(filter);
                  setEquipmentMaintenanceUnitFilter(unit);
                  setViewMode('print-preview');
                  if (autoPrint) {
                    window.setTimeout(() => window.print(), 80);
                  }
                }}
              />
            )}

          {equipmentSectionTab === 'inventory' && (
            <>
              {/* Categorized Medical Equipment Tables Filter Bar */}
              <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setEquipmentTableFilter('All')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  equipmentTableFilter === 'All'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Tables ({equipmentUnitTotal})
              </button>
              {equipmentTablesSummary.map((tbl) => (
                <button
                  key={tbl.name}
                  type="button"
                  onClick={() => setEquipmentTableFilter(tbl.name)}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    equipmentTableFilter === tbl.name
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tbl.name} ({tbl.count})
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {category.supportsUnitSplit && (
                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                    {(['All', 'CCU', 'SD', 'General Ward'] as const).map((unit) => (
                      <button
                        key={unit}
                        type="button"
                        onClick={() => setUnitFilter(unit)}
                        className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                          unitFilter === unit
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {unit === 'All' ? 'All Units' : unit}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                      statusFilter === 'all'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Show All
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('attention')}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                      statusFilter === 'attention'
                        ? 'bg-white text-rose-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Alerts Only
                  </button>
                </div>

                {equipmentTableFilter === 'All' && groupedEquipmentTables.length > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setAllEquipmentTablesCollapsed(false)}
                      className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                    >
                      Expand All
                    </button>
                    <button
                      type="button"
                      onClick={() => setAllEquipmentTablesCollapsed(true)}
                      className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                    >
                      Collapse All
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search device, MOH no., bed or note..."
                    className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-md w-64 focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => openAdd()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Equipment
                </button>
              </div>
            </div>
          </div>

          {/* 10 Organized Equipment Table Cards */}
          {groupedEquipmentTables.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
              <h3 className="text-sm font-semibold text-slate-900">
                No equipment matches current filter
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Add equipment to this table or clear your unit, table, or search filters.
              </p>
              <button
                type="button"
                onClick={() => openAdd()}
                className="mt-4 px-3.5 py-1.5 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors cursor-pointer"
              >
                Add Equipment
              </button>
            </div>
          ) : (
            groupedEquipmentTables.map((tableGroup) => {
              const isCollapsed =
                equipmentTableFilter === 'All' &&
                !search.trim() &&
                Boolean(collapsedEquipmentTables[tableGroup.name]);
              const extraCols = getEquipmentTableExtraCols(tableGroup.name);
              const isCrashCartTable = tableGroup.name === 'Table 4 – Crash Cart Trolleys';

              return (
                <div
                  key={tableGroup.name}
                  className="bg-white border border-slate-200 rounded-lg overflow-hidden"
                >
                  <div className="px-4 py-2.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => toggleEquipmentTable(tableGroup.name)}
                      className="flex items-center gap-2 text-left cursor-pointer"
                    >
                      {isCollapsed ? (
                        <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-300 shrink-0" />
                      )}
                      <h3 className="text-sm font-semibold tracking-wide">{tableGroup.name}</h3>
                      <span className="font-mono text-xs text-slate-300 tabular-nums">
                        ({tableGroup.items.length})
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openAdd(tableGroup.name)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-teal-100 bg-teal-800/80 hover:bg-teal-700 rounded transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add to Table
                    </button>
                  </div>

                  {!isCollapsed && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-medium text-slate-500">
                            <th className="py-2.5 px-3 w-16 text-center">No./Bed</th>
                            <th className="py-2.5 px-3 min-w-[180px]">
                              {isCrashCartTable
                                ? 'Defibrillator (Brand + MOH)'
                                : 'Device / Description'}
                            </th>
                            <th className="py-2.5 px-3 min-w-[115px]">
                              {isCrashCartTable ? 'Trolley MOH No.' : 'MOH Number'}
                            </th>
                            {extraCols.map((col) => (
                              <th
                                key={col.key}
                                className={`py-2.5 px-2 ${
                                  isTickableEquipmentTable(tableGroup.name)
                                    ? 'text-center min-w-[78px]'
                                    : 'min-w-[95px]'
                                }`}
                              >
                                {col.shortLabel}
                              </th>
                            ))}
                            <th className="py-2.5 px-3 min-w-[155px]">Status &amp; PPM</th>
                            <th className="py-2.5 px-3 min-w-[150px]">Comments</th>
                            <th className="py-2.5 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-xs">
                          {tableGroup.items.map((item, idx) => {
                            const pmDays = item.nextPmDate
                              ? daysBetween(today, item.nextPmDate)
                              : null;
                            const rowCode = item.otherCode?.trim() || String(idx + 1);
                            const ex = item.extraColumns || {};
                            const isTable5 =
                              tableGroup.name === 'Table 5 – Suction and Oxygenation Items';
                            const isStoreRow = isTable5 && rowCode === 'Store';
                            const isTotalRow = isTable5 && rowCode === 'Total';
                            const isTickRow =
                              isTickableEquipmentTable(tableGroup.name) &&
                              !isStoreRow &&
                              !isTotalRow;

                            return (
                              <tr
                                key={item.id}
                                className={`${
                                  isTotalRow
                                    ? 'bg-slate-50/90 font-semibold'
                                    : 'hover:bg-slate-50/80'
                                } transition-colors`}
                              >
                                <td className="py-2 px-3 text-center font-mono font-semibold text-slate-700">
                                  {rowCode}
                                </td>

                                <td className="py-2 px-3">
                                  <div className="font-medium text-slate-900">
                                    {isCrashCartTable ? ex.defibrillator || item.name : item.name}
                                  </div>
                                  <div className="text-[11px] text-slate-400 mt-0.5">
                                    {item.unit}
                                  </div>
                                </td>

                                <td className="py-2 px-3 font-mono text-slate-800 whitespace-pre-line tabular-nums">
                                  {item.batchOrSerial}
                                </td>

                                {extraCols.map((col) => (
                                  <td
                                    key={col.key}
                                    className={`py-1.5 px-2 ${
                                      isTickableEquipmentTable(tableGroup.name) ? 'text-center' : ''
                                    }`}
                                  >
                                    {isTickRow ? (
                                      <label className="inline-flex items-center justify-center p-1 rounded hover:bg-slate-100 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={isEquipmentAccessoryTicked(ex[col.key])}
                                          aria-label={`${col.label} for ${rowCode}`}
                                          onChange={(e) =>
                                            onUpdateItem(item.id, {
                                              extraColumns: {
                                                ...(item.extraColumns || {}),
                                                [col.key]: e.target.checked ? '✓' : '',
                                              },
                                            })
                                          }
                                          className="w-4 h-4 rounded border-slate-300 text-teal-700 accent-teal-700 cursor-pointer"
                                        />
                                      </label>
                                    ) : isStoreRow ? (
                                      <input
                                        type="number"
                                        min={0}
                                        value={ex[col.key] || ''}
                                        aria-label={`Store count for ${col.label}`}
                                        onChange={(e) =>
                                          onUpdateItem(item.id, {
                                            extraColumns: {
                                              ...(item.extraColumns || {}),
                                              [col.key]: e.target.value,
                                            },
                                          })
                                        }
                                        placeholder="0"
                                        className="w-20 mx-auto px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-700 bg-white text-center font-mono font-semibold tabular-nums"
                                      />
                                    ) : isTotalRow ? (
                                      <div
                                        title={`Auto-count across beds + Store for ${col.label}`}
                                        className="w-20 mx-auto px-2 py-1 text-xs border border-slate-200 rounded bg-slate-100 text-slate-900 text-center font-mono font-bold tabular-nums select-none"
                                      >
                                        {table5ColumnTotals[col.key] ?? 0}
                                      </div>
                                    ) : (
                                      <input
                                        type="text"
                                        value={ex[col.key] || ''}
                                        onChange={(e) =>
                                          onUpdateItem(item.id, {
                                            extraColumns: {
                                              ...(item.extraColumns || {}),
                                              [col.key]: e.target.value,
                                            },
                                          })
                                        }
                                        placeholder="—"
                                        className="w-full min-w-[70px] px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-700 bg-white"
                                      />
                                    )}
                                  </td>
                                ))}

                                <td className="py-2 px-3 whitespace-nowrap">
                                  <select
                                    value={item.equipmentStatus || 'Operational'}
                                    onChange={(e) =>
                                      onUpdateItem(item.id, {
                                        equipmentStatus: e.target.value as EquipmentStatus,
                                      })
                                    }
                                    className={`px-2 py-1 text-[11px] font-medium border rounded focus:outline-none focus:ring-1 focus:ring-teal-700 ${
                                      item.equipmentStatus === 'Out of Service' ||
                                      item.equipmentStatus === 'Under Maintenance'
                                        ? 'border-rose-300 bg-rose-50 text-rose-800'
                                        : item.equipmentStatus === 'Needs Calibration'
                                          ? 'border-amber-300 bg-amber-50 text-amber-800'
                                          : 'border-slate-200 bg-white text-emerald-800'
                                    }`}
                                  >
                                    <option value="Operational">Operational</option>
                                    <option value="Needs Calibration">Needs Calibration</option>
                                    <option value="Under Maintenance">Under Maintenance</option>
                                    <option value="Out of Service">Out of Service</option>
                                  </select>
                                  {pmDays !== null && (
                                    <div
                                      className={`mt-0.5 text-[10px] font-mono tabular-nums ${
                                        pmDays < 0
                                          ? 'text-rose-700 font-semibold'
                                          : pmDays <= 14
                                            ? 'text-amber-700 font-semibold'
                                            : 'text-slate-400'
                                      }`}
                                    >
                                      PPM: {formatShortDate(item.nextPmDate || null)}
                                    </div>
                                  )}
                                </td>

                                <td className="py-1.5 px-3">
                                  <input
                                    type="text"
                                    value={item.notes}
                                    onChange={(e) =>
                                      onUpdateItem(item.id, { notes: e.target.value })
                                    }
                                    placeholder="Add comment..."
                                    className="w-full min-w-[130px] px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-700 bg-white"
                                  />
                                </td>

                                <td className="py-2 px-4 whitespace-nowrap text-right">
                                  <div className="inline-flex items-center gap-1.5">
                                    {!isStoreRow && !isTotalRow && onAddEquipmentMaintenanceLog && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setPreselectedItemForRepair(item);
                                          setEquipmentSectionTab('maintenance');
                                          setEquipmentPrintScope('maintenance-only');
                                        }}
                                        title="Log Maintenance / Repair Follow-Up"
                                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 rounded transition-colors cursor-pointer"
                                      >
                                        <Wrench className="w-3 h-3" />
                                        Repair
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => onVerifyItem(item.id, defaultInspector)}
                                      className="px-2.5 py-1 text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 rounded transition-colors cursor-pointer"
                                    >
                                      Verify
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => openEdit(item)}
                                      title="Edit equipment"
                                      className="p-1.5 text-slate-400 hover:text-slate-800 rounded transition-colors cursor-pointer"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onDeleteItem(item.id)}
                                      title="Delete equipment"
                                      className="p-1.5 text-slate-400 hover:text-rose-700 rounded transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })
          )}
            </>
          )}
        </div>
      ) : (
        <div
          className={`no-print bg-white border border-slate-200 rounded-lg ${
            (isTransferBag || isProcedureTrolley || isPrepRoom || isBloodTrolley) &&
            viewMode === 'print-preview'
              ? 'hidden'
              : ''
          }`}
        >
          <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {category.supportsUnitSplit && (
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                  {(isPrepRoom || isBloodTrolley
                    ? (['All', 'CCU', 'SD'] as const)
                    : (['All', 'CCU', 'SD', 'General Ward'] as const)
                  ).map((unit) => (
                    <button
                      key={unit}
                      type="button"
                      onClick={() => setUnitFilter(unit)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        unitFilter === unit
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {unit === 'All' ? 'All Units' : unit}
                    </button>
                  ))}
                </div>
              )}

              {isBloodTrolley && (
                <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setBloodTrolleyDrawerFilter('All')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      bloodTrolleyDrawerFilter === 'All'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All Drawers ({bloodTrolleyUnitTotal})
                  </button>
                  {bloodTrolleyDrawers.map((dr) => (
                    <button
                      key={dr.name}
                      type="button"
                      onClick={() => setBloodTrolleyDrawerFilter(dr.name)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        bloodTrolleyDrawerFilter === dr.name
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {dr.name} ({dr.count})
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Show All
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('attention')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    statusFilter === 'attention'
                      ? 'bg-white text-rose-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Alerts Only
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search item, lot or serial..."
                  className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-md w-56 focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <button
                type="button"
                onClick={() => openAdd()}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add {category.isEquipment ? 'Equipment' : 'Item'}
              </button>
            </div>
          </div>

          {filteredItems.length === 0 ? (
            <div className="p-12 text-center">
              <h3 className="text-sm font-semibold text-slate-900">No items match current filter</h3>
              <p className="mt-1 text-xs text-slate-500">
                Add an item to this section or clear your unit/status filters.
              </p>
              <button
                type="button"
                onClick={() => openAdd()}
                className="mt-4 px-3.5 py-1.5 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors cursor-pointer"
              >
                Add First Entry
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-medium text-slate-500">
                    <th className="py-2.5 px-4">Item &amp; Location</th>
                    <th className="py-2.5 px-3">Unit</th>
                    <th className="py-2.5 px-3">
                      {category.isEquipment ? 'Serial / Asset ID' : 'Lot / Batch'}
                    </th>
                    <th className="py-2.5 px-3">
                      {category.isEquipment ? 'Status' : 'Stock / Par'}
                    </th>
                    <th className="py-2.5 px-3">
                      {category.isEquipment
                        ? 'Next PPM Due'
                        : isProcedureTrolley
                          ? 'Expiry Date 1'
                          : 'Expiry Date & State'}
                    </th>
                    {isProcedureTrolley && <th className="py-2.5 px-3">Expiry Date 2</th>}
                    <th className="py-2.5 px-3">Last Verified</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {filteredItems.map((item) => {
                    const exp = getExpiryStatus(item.expiryDate, today);
                    const isLowStock = !category.isEquipment && item.quantity < item.parLevel;
                    const pmDays =
                      category.isEquipment && item.nextPmDate
                        ? daysBetween(today, item.nextPmDate)
                        : null;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 max-w-md">
                        <div className="font-medium text-slate-900">{item.name}</div>
                        <div className="mt-0.5 text-xs text-slate-500 flex flex-wrap items-center gap-1.5">
                          <span>{item.locationDetail}</span>
                          {item.notes && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="truncate max-w-xs" title={item.notes}>
                                {item.notes}
                              </span>
                            </>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap text-xs font-medium text-slate-700">
                        {item.unit}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap font-mono text-xs text-slate-600">
                        {item.batchOrSerial}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        {category.isEquipment ? (
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                              item.equipmentStatus === 'Operational'
                                ? 'text-emerald-700'
                                : item.equipmentStatus === 'Needs Calibration'
                                  ? 'text-amber-700'
                                  : 'text-rose-700'
                            }`}
                          >
                            {item.equipmentStatus === 'Operational' ? (
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            ) : item.equipmentStatus === 'Needs Calibration' ? (
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5 shrink-0" />
                            )}
                            {item.equipmentStatus || 'Operational'}
                          </span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              aria-label="Decrease quantity"
                              onClick={() =>
                                onUpdateItem(item.id, { quantity: Math.max(0, item.quantity - 1) })
                              }
                              className="p-1 text-slate-500 hover:text-slate-900 border border-slate-200 rounded hover:bg-slate-100 cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span
                              className={`font-mono tabular-nums text-xs font-semibold min-w-[68px] text-center ${
                                isLowStock ? 'text-amber-700' : 'text-slate-900'
                              }`}
                            >
                              {item.quantity} / {item.parLevel} {item.unitOfMeasure}
                            </span>
                            <button
                              type="button"
                              aria-label="Increase quantity"
                              onClick={() => onUpdateItem(item.id, { quantity: item.quantity + 1 })}
                              className="p-1 text-slate-500 hover:text-slate-900 border border-slate-200 rounded hover:bg-slate-100 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap text-xs">
                        {category.isEquipment ? (
                          <div>
                            <div className="font-mono tabular-nums text-slate-900">
                              {formatShortDate(item.nextPmDate || null)}
                            </div>
                            {pmDays !== null && (
                              <div
                                className={`text-[11px] font-medium tabular-nums ${
                                  pmDays < 0
                                    ? 'text-rose-700'
                                    : pmDays <= 14
                                      ? 'text-amber-700'
                                      : 'text-slate-500'
                                }`}
                              >
                                {pmDays < 0
                                  ? `PPM Overdue ${Math.abs(pmDays)}d`
                                  : `PPM in ${pmDays}d`}
                              </div>
                            )}
                          </div>
                        ) : isPrepRoom || isBloodTrolley ? (
                          <div>
                            <div className="font-mono tabular-nums text-slate-900 max-w-[210px] whitespace-normal">
                              {item.expiryDisplay?.trim()
                                ? item.expiryDisplay
                                : item.expiryDate
                                  ? formatShortDate(item.expiryDate)
                                  : '—'}
                            </div>
                            {exp.state !== 'none' && (
                              <div
                                className={`text-[11px] font-medium inline-flex items-center gap-1 ${
                                  exp.state === 'expired'
                                    ? 'text-rose-700'
                                    : exp.state === 'expiring-soon'
                                      ? 'text-amber-700'
                                      : 'text-emerald-700'
                                }`}
                              >
                                {exp.state === 'expired' && <XCircle className="w-3 h-3" />}
                                {exp.state === 'expiring-soon' && (
                                  <AlertTriangle className="w-3 h-3" />
                                )}
                                {exp.state === 'valid' && <CheckCircle2 className="w-3 h-3" />}
                                <span className="tabular-nums">{exp.label}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <div className="font-mono tabular-nums text-slate-900">
                              {formatShortDate(item.expiryDate)}
                            </div>
                            <div
                              className={`text-[11px] font-medium inline-flex items-center gap-1 ${
                                exp.state === 'expired'
                                  ? 'text-rose-700'
                                  : exp.state === 'expiring-soon'
                                    ? 'text-amber-700'
                                    : exp.state === 'valid'
                                      ? 'text-emerald-700'
                                      : 'text-slate-500'
                              }`}
                            >
                              {exp.state === 'expired' && <XCircle className="w-3 h-3" />}
                              {exp.state === 'expiring-soon' && (
                                <AlertTriangle className="w-3 h-3" />
                              )}
                              {exp.state === 'valid' && <CheckCircle2 className="w-3 h-3" />}
                              <span className="tabular-nums">{exp.label}</span>
                            </div>
                          </div>
                        )}
                      </td>

                      {isProcedureTrolley && (
                        <td className="py-3 px-3 whitespace-nowrap text-xs">
                          <div className="font-mono tabular-nums text-slate-900">
                            {formatShortDate(item.secondExpiryDate || null)}
                          </div>
                        </td>
                      )}

                      <td className="py-3 px-3 whitespace-nowrap text-xs text-slate-600">
                        <div className="font-mono tabular-nums">
                          {formatShortDate(item.lastCheckedDate)}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[130px]">
                          {item.lastCheckedBy}
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onVerifyItem(item.id, defaultInspector)}
                            className="px-2.5 py-1 text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 rounded transition-colors cursor-pointer"
                          >
                            Verify
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(item)}
                            title="Edit item"
                            className="p-1.5 text-slate-400 hover:text-slate-800 rounded transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteItem(item.id)}
                            title="Delete item"
                            className="p-1.5 text-slate-400 hover:text-rose-700 rounded transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Official Emergency Bag Checklist Printable Form */}
      {isTransferBag && (
        <div
          className={
            viewMode === 'print-preview'
              ? 'block overflow-x-auto pb-4'
              : 'hidden print-only-block'
          }
        >
          <EmergencyBagPrintView
            items={categoryItems}
            meta={transferBagMeta}
            defaultInspector={defaultInspector}
          />
        </div>
      )}

      {/* Official Procedure Trolley Checklist Printable Form */}
      {isProcedureTrolley && (
        <div
          className={
            viewMode === 'print-preview'
              ? 'block overflow-x-auto pb-4'
              : 'hidden print-only-block'
          }
        >
          <ProcedureTrolleyPrintView
            items={categoryItems}
            meta={sectionMeta}
            wardName={wardName}
            defaultInspector={defaultInspector}
            layoutMode={trolleyPrintLayout}
          />
        </div>
      )}

      {/* Official Preparation Room Expiry Checklists Printable Forms (CCU & SD) */}
      {isPrepRoom && (
        <div
          className={
            viewMode === 'print-preview'
              ? 'block overflow-x-auto pb-4'
              : 'hidden print-only-block'
          }
        >
          <PrepRoomPrintView
            items={categoryItems}
            meta={sectionMeta}
            wardName={wardName}
            defaultInspector={defaultInspector}
            printScope={prepRoomPrintScope}
            layoutMode={prepRoomPrintLayout}
          />
        </div>
      )}

      {/* Official Ward Blood Collection Trolley Expiry Checklist Printable Form */}
      {isBloodTrolley && (
        <div
          className={
            viewMode === 'print-preview'
              ? 'block overflow-x-auto pb-4'
              : 'hidden print-only-block'
          }
        >
          <BloodTrolleyPrintView
            items={categoryItems}
            meta={sectionMeta}
            wardName={wardName}
            defaultInspector={defaultInspector}
            printScope={bloodTrolleyPrintScope}
            layoutMode={bloodTrolleyPrintLayout}
          />
        </div>
      )}

      {/* Official Monthly Store Checklist Printable Form (GH/NUR/2025-19) */}
      {isStore && (
        <div
          className={
            viewMode === 'print-preview'
              ? 'block overflow-x-auto pb-4'
              : 'hidden print-only-block'
          }
        >
          <div className="no-print mb-3 flex flex-wrap items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-xs text-slate-600">
            <div>
              Showing printable{' '}
              <span className="font-semibold text-slate-800">
                {storePrintScope === 'near-expiry'
                  ? `Near Expiry Store Items (≤ ${storeNearExpiryMonths} ${
                      storeNearExpiryMonths === 1 ? 'Month' : 'Months'
                    })`
                  : 'Monthly Store checklist (GH/NUR/2025-19)'}
              </span>{' '}
              —{' '}
              <span className="font-mono font-semibold text-slate-900">
                {printableStoreItems.length}
              </span>{' '}
              items
              {storeSectionFilter !== 'All' ? ` (${storeSectionFilter})` : ' across sections'}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-slate-500">Print Scope:</span>
                <select
                  value={storePrintScope}
                  onChange={(e) => setStorePrintScope(e.target.value as StorePrintScope)}
                  className="px-2.5 py-1 text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                >
                  <option value="all">All Store Items</option>
                  <option value="near-expiry">
                    Near Expiry &amp; Expired Only ({storeNearExpiryCount})
                  </option>
                </select>
              </div>
              {storePrintScope === 'near-expiry' && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-slate-500">Window:</span>
                  <select
                    value={storeNearExpiryMonths}
                    onChange={(e) => setStoreNearExpiryMonths(Number(e.target.value) as 1 | 3 | 6)}
                    className="px-2.5 py-1 text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  >
                    <option value={1}>≤ 1 Month</option>
                    <option value={3}>≤ 3 Months</option>
                    <option value={6}>≤ 6 Months</option>
                  </select>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-slate-500">Section to Print:</span>
                <select
                  value={storeSectionFilter}
                  onChange={(e) => setStoreSectionFilter(e.target.value)}
                  className="px-2.5 py-1 text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                >
                  <option value="All">All Sections ({categoryItems.length})</option>
                  {storeSections.map((sec) => (
                    <option key={sec.name} value={sec.name}>
                      {sec.name} ({sec.count})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <StoreChecklistPrintView
            items={printableStoreItems}
            meta={sectionMeta}
            wardName={wardName}
            defaultInspector={defaultInspector}
            layoutMode={storePrintLayout}
            printScope={storePrintScope}
            nearExpiryMonths={storeNearExpiryMonths}
          />
        </div>
      )}

      {/* Official Medical Equipment Monthly Inventory Printable Form */}
      {isEquipmentModule && (
        <div
          className={
            viewMode === 'print-preview'
              ? 'block overflow-x-auto pb-4'
              : 'hidden print-only-block'
          }
        >
          <div className="no-print mb-3 flex flex-wrap items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-xs text-slate-600">
            <div>
              Showing printable{' '}
              <span className="font-semibold text-slate-800">
                {equipmentPrintScope === 'maintenance-only'
                  ? 'Medical Equipment Maintenance, Repair Log & Follow-Up'
                  : 'Medical Equipment Monthly Inventory'}
              </span>{' '}
              —{' '}
              <span className="font-mono font-semibold text-slate-900">
                {equipmentPrintScope === 'maintenance-only'
                  ? equipmentMaintenanceLogs.filter((entry) => {
                      if (
                        equipmentMaintenancePrintFilter === 'active' &&
                        entry.status === 'Repaired / Returned'
                      ) {
                        return false;
                      }
                      if (
                        equipmentMaintenancePrintFilter === 'repaired' &&
                        entry.status !== 'Repaired / Returned'
                      ) {
                        return false;
                      }
                      if (
                        equipmentMaintenanceUnitFilter !== 'All' &&
                        entry.unit !== equipmentMaintenanceUnitFilter
                      ) {
                        return false;
                      }
                      return true;
                    }).length
                  : equipmentTableFilter === 'All'
                    ? categoryItems.length
                    : categoryItems.filter((it) => it.locationDetail === equipmentTableFilter)
                        .length}
              </span>{' '}
              {equipmentPrintScope === 'maintenance-only' ? 'repair entries' : 'items'}
              {equipmentPrintScope !== 'maintenance-only' &&
                (equipmentTableFilter !== 'All'
                  ? ` (${equipmentTableFilter})`
                  : ` across all ${EQUIPMENT_TABLES.length} tables`)}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-slate-500">Print Scope:</span>
                <select
                  value={equipmentPrintScope}
                  onChange={(e) => setEquipmentPrintScope(e.target.value as EquipmentPrintScope)}
                  className="px-2.5 py-1 text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                >
                  <option value="all">Full Inventory (+ Repair Log)</option>
                  <option value="maintenance-only">
                    Maintenance &amp; Repair Log Only ({equipmentMaintenanceLogs.length})
                  </option>
                </select>
              </div>
              {equipmentPrintScope === 'maintenance-only' && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-slate-500">Status Filter:</span>
                    <select
                      value={equipmentMaintenancePrintFilter}
                      onChange={(e) =>
                        setEquipmentMaintenancePrintFilter(
                          e.target.value as EquipmentMaintenancePrintFilter
                        )
                      }
                      className="px-2.5 py-1 text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                    >
                      <option value="all">All Entries ({equipmentMaintenanceLogs.length})</option>
                      <option value="active">
                        Active / Open Only (
                        {
                          equipmentMaintenanceLogs.filter(
                            (l) => l.status !== 'Repaired / Returned'
                          ).length
                        }
                        )
                      </option>
                      <option value="repaired">
                        Repaired / Closed Only (
                        {
                          equipmentMaintenanceLogs.filter(
                            (l) => l.status === 'Repaired / Returned'
                          ).length
                        }
                        )
                      </option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-slate-500">Unit:</span>
                    <select
                      value={equipmentMaintenanceUnitFilter}
                      onChange={(e) =>
                        setEquipmentMaintenanceUnitFilter(
                          e.target.value as 'All' | 'CCU' | 'SD' | 'General Ward'
                        )
                      }
                      className="px-2.5 py-1 text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                    >
                      <option value="All">All Units</option>
                      <option value="CCU">CCU</option>
                      <option value="SD">SD</option>
                      <option value="General Ward">General Ward</option>
                    </select>
                  </div>
                </>
              )}
              {equipmentPrintScope === 'all' && equipmentTableFilter === 'All' && (
                <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeEquipmentMaintenanceLog}
                    onChange={(e) => setIncludeEquipmentMaintenanceLog(e.target.checked)}
                    className="rounded border-slate-300 text-teal-700 accent-teal-700 cursor-pointer"
                  />
                  Include Repair Log Sheet
                </label>
              )}
              {equipmentPrintScope === 'all' && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-slate-500">Table to Print:</span>
                  <select
                    value={equipmentTableFilter}
                    onChange={(e) => setEquipmentTableFilter(e.target.value)}
                    className="px-2.5 py-1 text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  >
                    <option value="All">All Tables ({categoryItems.length})</option>
                    {EQUIPMENT_TABLES.map((tbl) => (
                      <option key={tbl} value={tbl}>
                        {tbl} ({categoryItems.filter((it) => it.locationDetail === tbl).length})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
          <EquipmentPrintView
            items={categoryItems}
            meta={sectionMeta}
            wardName={wardName}
            defaultInspector={defaultInspector}
            layoutMode={equipmentPrintLayout}
            selectedTable={equipmentTableFilter}
            maintenanceLogs={equipmentMaintenanceLogs}
            includeMaintenanceLog={includeEquipmentMaintenanceLog}
            printScope={equipmentPrintScope}
            maintenancePrintFilter={equipmentMaintenancePrintFilter}
            maintenanceUnitFilter={equipmentMaintenanceUnitFilter}
          />
        </div>
      )}

      {/* Add / Edit Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-lg w-full max-w-lg shadow-lg">
            <div className="px-5 py-4 border-b border-slate-200">
              <h3 className="text-base font-semibold text-slate-900">
                {editingItem ? 'Edit Entry' : `Add ${category.shortLabel} Entry`}
              </h3>
            </div>
            <form onSubmit={handleSaveForm} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {category.isEquipment
                    ? 'Equipment Name & Model'
                    : isStore
                      ? 'Item description'
                      : 'Item / Medication Name'}
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              {isEquipmentModule ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Ward Unit
                    </label>
                    <select
                      value={formUnit}
                      onChange={(e) =>
                        setFormUnit(e.target.value as 'CCU' | 'SD' | 'General Ward')
                      }
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                    >
                      <option value="CCU">CCU</option>
                      <option value="SD">SD</option>
                      <option value="General Ward">General Ward</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Equipment Table
                    </label>
                    <select
                      value={formLocation}
                      onChange={(e) => setFormLocation(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                    >
                      {EQUIPMENT_TABLES.map((tbl) => (
                        <option key={tbl} value={tbl}>
                          {tbl}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Row No. / Bed / Count
                    </label>
                    <input
                      type="text"
                      value={formOtherCode}
                      onChange={(e) => setFormOtherCode(e.target.value)}
                      placeholder="e.g., 1, Bed 11, A, or 10"
                      className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                    />
                  </div>
                </div>
              ) : category.supportsUnitSplit ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Ward Unit</label>
                    <select
                      value={formUnit}
                      onChange={(e) =>
                        setFormUnit(e.target.value as 'CCU' | 'SD' | 'General Ward')
                      }
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                    >
                      <option value="CCU">CCU</option>
                      <option value="SD">SD</option>
                      {!(isPrepRoom || isBloodTrolley) && (
                        <option value="General Ward">General Ward</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      {isBloodTrolley ? 'Drawer (1st – 4th Drawer)' : 'Specific Location / Drawer'}
                    </label>
                    <input
                      type="text"
                      list={isBloodTrolley ? 'blood-trolley-drawer-options' : undefined}
                      value={formLocation}
                      onChange={(e) => setFormLocation(e.target.value)}
                      placeholder={isBloodTrolley ? 'e.g., 1st Drawer' : 'e.g., Drawer 2 / Shelf A'}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                    />
                    {isBloodTrolley && (
                      <datalist id="blood-trolley-drawer-options">
                        {BLOOD_TROLLEY_DRAWERS.map((dr) => (
                          <option key={dr} value={dr} />
                        ))}
                      </datalist>
                    )}
                  </div>
                </div>
              ) : isStore ? (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Store Section
                  </label>
                  <input
                    type="text"
                    list="store-section-options"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="e.g., SURGICAL DISPOSABLE"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                  <datalist id="store-section-options">
                    {STORE_SECTIONS.map((sec) => (
                      <option key={sec} value={sec} />
                    ))}
                  </datalist>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {isProcedureTrolley
                      ? 'Checklist Row No. (e.g., No. 17 or No. 43)'
                      : isBloodTrolley
                        ? 'Drawer (1st – 4th Drawer)'
                        : 'Specific Location / Drawer'}
                  </label>
                  <input
                    type="text"
                    list={isBloodTrolley ? 'blood-trolley-drawer-options' : undefined}
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder={
                      isProcedureTrolley
                        ? 'e.g., No. 17'
                        : isBloodTrolley
                          ? 'e.g., 1st Drawer'
                          : 'e.g., Front Pocket / Main Compartment'
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                  {isBloodTrolley && (
                    <datalist id="blood-trolley-drawer-options">
                      {BLOOD_TROLLEY_DRAWERS.map((dr) => (
                        <option key={dr} value={dr} />
                      ))}
                    </datalist>
                  )}
                </div>
              )}

              {category.isEquipment ? (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        {isEquipmentModule ? 'MOH Number' : 'Serial / Asset ID'}
                      </label>
                      <input
                        type="text"
                        value={formBatch}
                        onChange={(e) => setFormBatch(e.target.value)}
                        placeholder={isEquipmentModule ? 'e.g., 75041 or NIL' : ''}
                        className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
                      <select
                        value={formEqStatus}
                        onChange={(e) => setFormEqStatus(e.target.value as EquipmentStatus)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                      >
                        <option value="Operational">Operational</option>
                        <option value="Needs Calibration">Needs Calibration</option>
                        <option value="Under Maintenance">Under Maintenance</option>
                        <option value="Out of Service">Out of Service</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Next PPM Date
                      </label>
                      <input
                        type="date"
                        value={formNextPm}
                        onChange={(e) => setFormNextPm(e.target.value)}
                        className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                      />
                    </div>
                  </div>

                  {isEquipmentModule &&
                    (getEquipmentTableExtraCols(formLocation).length > 0 ||
                      formLocation === 'Table 4 – Crash Cart Trolleys') && (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-2.5">
                        <div className="text-[11px] font-semibold text-slate-700">
                          Table-Specific Accessories &amp; Columns
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                          {formLocation === 'Table 4 – Crash Cart Trolleys' && (
                            <div className="col-span-2 sm:col-span-3">
                              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                                Defibrillator (Brand + MOH Number)
                              </label>
                              <input
                                type="text"
                                value={formExtraCols.defibrillator ?? formName}
                                onChange={(e) =>
                                  setFormExtraCols((prev) => ({
                                    ...prev,
                                    defibrillator: e.target.value,
                                  }))
                                }
                                placeholder="e.g., Life Pak 003978"
                                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-teal-700"
                              />
                            </div>
                          )}
                          {getEquipmentTableExtraCols(formLocation).map((col) => {
                            const isTable5Modal =
                              formLocation === 'Table 5 – Suction and Oxygenation Items';
                            const isStoreModalRow =
                              isTable5Modal && formOtherCode.trim() === 'Store';
                            const isTotalModalRow =
                              isTable5Modal && formOtherCode.trim() === 'Total';
                            const isModalTickable =
                              isTickableEquipmentTable(formLocation) &&
                              !isStoreModalRow &&
                              !isTotalModalRow;

                            if (isModalTickable) {
                              return (
                                <label
                                  key={col.key}
                                  className="flex items-center gap-2 px-2.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded cursor-pointer hover:bg-slate-50"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isEquipmentAccessoryTicked(formExtraCols[col.key])}
                                    onChange={(e) =>
                                      setFormExtraCols((prev) => ({
                                        ...prev,
                                        [col.key]: e.target.checked ? '✓' : '',
                                      }))
                                    }
                                    className="w-4 h-4 rounded border-slate-300 text-teal-700 accent-teal-700 cursor-pointer"
                                  />
                                  <span>{col.label}</span>
                                </label>
                              );
                            }

                            if (isStoreModalRow) {
                              return (
                                <div key={col.key}>
                                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                                    {col.label} (Store Qty)
                                  </label>
                                  <input
                                    type="number"
                                    min={0}
                                    value={formExtraCols[col.key] || ''}
                                    onChange={(e) =>
                                      setFormExtraCols((prev) => ({
                                        ...prev,
                                        [col.key]: e.target.value,
                                      }))
                                    }
                                    placeholder="0"
                                    className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-teal-700"
                                  />
                                </div>
                              );
                            }

                            if (isTotalModalRow) {
                              return (
                                <div key={col.key}>
                                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                                    {col.label} (Auto Total)
                                  </label>
                                  <input
                                    type="text"
                                    readOnly
                                    value={table5ColumnTotals[col.key] ?? 0}
                                    className="w-full px-2.5 py-1.5 text-xs font-mono font-semibold border border-slate-200 rounded bg-slate-100 text-slate-700"
                                  />
                                </div>
                              );
                            }

                            return (
                              <div key={col.key}>
                                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                                  {col.label}
                                </label>
                                <input
                                  type="text"
                                  value={formExtraCols[col.key] || ''}
                                  onChange={(e) =>
                                    setFormExtraCols((prev) => ({
                                      ...prev,
                                      [col.key]: e.target.value,
                                    }))
                                  }
                                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-teal-700"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                </>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={formQty}
                        onChange={(e) => setFormQty(Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Par Level
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={formPar}
                        onChange={(e) => setFormPar(Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Unit</label>
                      <input
                        type="text"
                        value={formUom}
                        onChange={(e) => setFormUom(e.target.value)}
                        placeholder="pcs / vials / packs"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                      />
                    </div>
                  </div>
                  <div className={`grid ${isStore ? 'grid-cols-2' : 'grid-cols-2'} gap-3`}>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        {isStore ? 'Stock No. (Item Code)' : 'Lot / Batch / Seal #'}
                      </label>
                      <input
                        type="text"
                        value={formBatch}
                        onChange={(e) => setFormBatch(e.target.value)}
                        placeholder={isStore ? 'e.g., 22J55-60-07011' : ''}
                        className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                      />
                    </div>
                    {isStore && (
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Other Code (Optional)
                        </label>
                        <input
                          type="text"
                          value={formOtherCode}
                          onChange={(e) => setFormOtherCode(e.target.value)}
                          placeholder="e.g., 22J55-70-01185"
                          className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        {isStore || isProcedureTrolley
                          ? 'Expiry Date 1'
                          : isPrepRoom || isBloodTrolley
                            ? 'Expiry Date (Text / Multi-Date)'
                            : 'Expiry Date'}
                      </label>
                      {isPrepRoom || isBloodTrolley ? (
                        <input
                          type="text"
                          value={formExpiryDisplay}
                          onChange={(e) => setFormExpiryDisplay(e.target.value)}
                          placeholder="e.g., 9/2030, 10/29 or 16/8/2030 or NIL"
                          className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                        />
                      ) : (
                        <input
                          type="date"
                          value={formExpiry}
                          onChange={(e) => setFormExpiry(e.target.value)}
                          className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                        />
                      )}
                    </div>
                    {(isStore || isProcedureTrolley) && (
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Expiry Date 2
                        </label>
                        <input
                          type="date"
                          value={formSecondExpiry}
                          onChange={(e) => setFormSecondExpiry(e.target.value)}
                          className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                        />
                      </div>
                    )}
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors cursor-pointer"
                >
                  {editingItem ? 'Save Changes' : 'Add Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
