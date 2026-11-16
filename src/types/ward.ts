export type WardUnit = 'CCU' | 'SD' | 'General Ward' | 'All Units';

export type TaskFrequency = 'weekly' | 'monthly';

export type TaskStatus = 'pending' | 'completed' | 'follow-up';

export type InventoryCategoryId =
  | 'equipment'
  | 'store'
  | 'prep-room'
  | 'blood-trolley'
  | 'procedure-trolley'
  | 'iv-meds'
  | 'transfer-bag';

export interface CategoryMeta {
  id: InventoryCategoryId | string;
  label: string;
  shortLabel: string;
  description: string;
  supportsUnitSplit: boolean;
  isEquipment?: boolean;
}

export interface ScheduleTask {
  id: string;
  title: string;
  category: string;
  unit: WardUnit;
  frequency: TaskFrequency;
  dueDate: string; // YYYY-MM-DD
  lastCompletedDate: string | null;
  lastInspector: string | null;
  status: TaskStatus;
  assignedRole: string;
  notes: string;
}

export type EquipmentStatus =
  | 'Operational'
  | 'Needs Calibration'
  | 'Under Maintenance'
  | 'Out of Service';

export interface InventoryItem {
  id: string;
  categoryId: string;
  name: string;
  unit: 'CCU' | 'SD' | 'General Ward';
  locationDetail: string;
  quantity: number;
  parLevel: number;
  unitOfMeasure: string;
  batchOrSerial: string;
  expiryDate: string | null; // YYYY-MM-DD (used for consumables/meds/sterile packs)
  equipmentStatus?: EquipmentStatus;
  nextPmDate?: string | null; // YYYY-MM-DD (used for medical equipment PPM)
  lastCheckedDate: string;
  lastCheckedBy: string;
  notes: string;
}

export type EnvironmentalSection =
  | 'Fire-Extinguishing & Life Safety'
  | 'Ward Environment & Cold Chain'
  | 'Clinical Utilities & Waste';

export type RoundCheckResult = 'pass' | 'action-needed' | 'pending';

export interface EnvironmentalCheckItem {
  id: string;
  section: EnvironmentalSection;
  title: string;
  location: string;
  frequency: TaskFrequency;
  result: RoundCheckResult;
  measuredValue?: string;
  lastCheckedDate: string | null;
  inspector: string | null;
  notes: string;
}

export type TicketPriority = 'Urgent' | 'Routine';
export type TicketStatus = 'Open' | 'In Progress' | 'Resolved';

export interface MaintenanceTicket {
  id: string;
  title: string;
  sourceArea: string;
  unit: WardUnit;
  department: 'Biomedical Engineering' | 'Facilities & HVAC' | 'Fire Safety' | 'Pharmacy & Supply';
  priority: TicketPriority;
  status: TicketStatus;
  reportedDate: string;
  reportedBy: string;
  targetDate: string;
  resolvedDate: string | null;
  notes: string;
}

export interface OxygenCylinder {
  id: string;
  cylinderCode: string;
  location: string;
  unit: 'CCU' | 'SD' | 'General Ward';
  size: 'E-Cylinder (Portable)' | 'D-Cylinder' | 'H/J-Cylinder (Backup)';
  pressurePsi: number; // 0 - 2200 PSI
  minThresholdPsi: number; // typically 500 PSI
  valveAndLeakCheck: boolean;
  securedInRack: boolean;
  hydrostaticExpiry: string; // YYYY-MM-DD
  lastCheckedDate: string;
  lastCheckedBy: string;
  notes: string;
}

export interface OxygenCheckLog {
  id: string;
  cylinderId: string;
  cylinderCode: string;
  checkedDate: string;
  inspector: string;
  pressurePsi: number;
  valvePass: boolean;
  securedPass: boolean;
  notes: string;
}

export interface CrashCartItemRow {
  id: string;
  sectionId:
    | 'top-shelf'
    | 'drawer-1'
    | 'drawer-2'
    | 'cad-cupboard'
    | 'fridge'
    | 'drawer-3'
    | 'drawer-4-p1'
    | 'drawer-4-p2'
    | 'treatment-room'
    | 'emergency-c'
    | 'side-cart';
  no: string;
  name: string;
  quantity: string;
  /**
   * Layout mode for the Expiry Date cell(s) matching the official Appendix 2 PDF grid:
   * - 'pair': 2 side-by-side cells (Page 1, Page 3 continuation/accessories)
   * - 'triple': 3 side-by-side cells (Page 2 single-row items)
   * - 'single': 1 full-width cell (items 14-18 in 3rd drawer)
   * - 'split-2x2': 2 rows x 2 columns (Ambo, ETT 3-5, CVC, Chest tubes)
   * - 'split-2x3': 2 rows x 3 columns (ETT 6-8, Laryngoscope, LMA, IV Cannula, Needles)
   */
  cellLayout: 'pair' | 'triple' | 'single' | 'split-2x2' | 'split-2x3';
  hasExpirySubRow?: boolean; // Renders "Expiry" label in col 2 on the second row
  slots: string[];
}

export interface CrashCartChecklist {
  id: string;
  defibLabel: string; // e.g., "A", "B", "C"
  cartTitle: string; // e.g., "Crash Cart A"
  checkDate: string; // DD / MM / YYYY or YYYY-MM-DD formatted
  nextDueDate: string;
  lockNumber: string;
  weeklyCheck: boolean;
  followingUse: boolean;
  lockNotIntact: boolean;
  items: CrashCartItemRow[];
  staffNurseComment: string;
  staffNurseName: string;
  supervisorComment: string;
  supervisorName: string;
  headNurseComment: string;
  headNurseName: string;
  staffCommentsContinued: string;
  pharmacistName: string;
  pharmacistSignature: string;
  pharmacistDate: string;
  biomedName: string;
  biomedSignature: string;
  biomedDate: string;
  qualityNurseName: string;
  qualityNurseSignature: string;
  qualityNurseDate: string;
}

export interface CadDrugRow {
  id: string;
  drugName: string;
  expiryDate: string;
  shifts: string[]; // length 21 (7 days x M, E, N)
}

export interface CadChecklistForm {
  unit: string;
  month: string;
  dayDates: string[]; // length 7
  rows: CadDrugRow[]; // 21 rows
  currentShiftTl: string[]; // length 21
  previousShiftTl: string[]; // length 21
}

export type WeeklyStockFormId = 'high-alert' | 'near-expiry' | 'refrigerator' | 'stock-meds';

export interface WeeklyStockRow {
  id: string;
  slNo: string;
  medicationName: string;
  wardQuantity: string;
  checks: { qty: string; expDate: string }[]; // length 5
}

export interface WeeklyStockChecklistForm {
  id: WeeklyStockFormId;
  title: string;
  formCode: string;
  location: string;
  month: string;
  weekDates: string[]; // length 5
  rows: WeeklyStockRow[]; // 12 rows
  staffSignatures: string[]; // length 5
}

export interface MonthlyStoreRow {
  id: string;
  stockNo: string;
  description: string;
  qtyAvailable: string;
  expiryDate1: string;
  expiryDate2: string;
}

export interface MonthlyStoreChecklistForm {
  formCode: string;
  ward: string;
  monthYear: string;
  rows: MonthlyStoreRow[]; // 17 rows
  staffName: string;
  signature: string;
  date: string;
}

export interface PharmacyRequestItemRow {
  id: string;
  itemCode: string;
  description: string;
  uom: string;
  reqQty: string;
  suppliedQty: string;
  lotNo: string;
  expiryDate: string;
}

export interface PharmacyRequestForm {
  requestDate: string;
  requesterLocation: string;
  requesterCostCenter: string;
  contactNo: string;
  requesterName: string;
  requesterCpr: string;
  requesterSignature: string;
  remarks: string;
  rows: PharmacyRequestItemRow[];
  preparedFromLocation: string;
  preparerCostCenter: string;
  preparationDate: string;
  preparedBy: string;
  preparerCpr: string;
  preparerSign: string;
  receivingDate: string;
  receiverLocation: string;
  receivedBy: string;
  receiverCpr: string;
  receiverSign: string;
}

export type RequestCatalogSource = 'iv-lotion' | 'pharmacy-stock';

export interface PharmacyCatalogItem {
  id: string;
  catalog: RequestCatalogSource;
  description: string;
  itemCode: string;
  defaultUom: string;
  isCustom?: boolean;
}

export interface PharmacyFormsState {
  autoSyncNearExpiry?: boolean;
  cad: CadChecklistForm;
  weeklyForms: Record<WeeklyStockFormId, WeeklyStockChecklistForm>;
  monthlyStore: MonthlyStoreChecklistForm;
  requestForm: PharmacyRequestForm;
  customRequestCatalogItems?: PharmacyCatalogItem[];
}

export interface TransferBagChecklistMeta {
  wardNumber?: string;
  month: string;
  year: string;
  checkedBy: string;
  date: string;
}

export interface WardStoreData {
  wardName: string;
  defaultInspector: string;
  customCategories: CategoryMeta[];
  tasks: ScheduleTask[];
  inventory: InventoryItem[];
  environmentalChecks: EnvironmentalCheckItem[];
  maintenanceTickets: MaintenanceTicket[];
  oxygenCylinders: OxygenCylinder[];
  oxygenLogs: OxygenCheckLog[];
  crashCarts: CrashCartChecklist[];
  pharmacyForms: PharmacyFormsState;
  transferBagMeta?: TransferBagChecklistMeta;
  lastBackupDate: string | null;
}
