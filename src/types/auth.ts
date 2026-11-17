import { CORE_CATEGORIES } from '../data/initialWardData';
import type { CategoryMeta } from './ward';

export const HOSPITAL_EMAIL_DOMAIN = '@hospitals.gov.bh';
export const TOP_ADMIN_USERNAME = 'admin';
export const TOP_ADMIN_EMAIL = 'admin@hospitals.gov.bh';
export const TOP_ADMIN_DEFAULT_PASSWORD = 'admin123';
export const BOOTSTRAP_ADMIN_EMAIL = 'ghsmc208@gmail.com';

export type PermissionLevel = 'none' | 'view' | 'edit' | 'full';
export type UserRole = 'admin' | 'staff';
export type UserStatus = 'active' | 'suspended';
export type TaskScopeMode = 'all' | 'selected';

export type TaskModuleKey =
  | 'schedule'
  | 'crash-cart'
  | 'pharmacy-forms'
  | 'environmental'
  | 'oxygen'
  | 'maintenance';

export interface TaskModuleDefinition {
  id: TaskModuleKey;
  label: string;
  description: string;
}

export const TASK_MODULE_DEFINITIONS: TaskModuleDefinition[] = [
  {
    id: 'schedule',
    label: 'Weekly & Monthly Tasks',
    description: 'Recurring ward schedule tasks, check logging, and task assignments.',
  },
  {
    id: 'crash-cart',
    label: 'Crash Cart Weekly Check',
    description: 'Appendix 2 weekly defibrillator, lock, drug & airway slot checklists.',
  },
  {
    id: 'pharmacy-forms',
    label: 'Pharmacy & Store Forms',
    description: 'CAD, High-Alert, Refrigerator, Near Expiry, Monthly Store & Material Request forms.',
  },
  {
    id: 'environmental',
    label: 'Environmental & Fire Safety',
    description: 'GH0030 ward environmental & fire safety round checklist and follow-up table.',
  },
  {
    id: 'oxygen',
    label: 'Oxygen Cylinders Tool',
    description: 'Weekly medical oxygen cylinder pressure, valve & rack inspections.',
  },
  {
    id: 'maintenance',
    label: 'Maintenance Follow-Up',
    description: 'Biomedical, Fire Safety, Facilities/HVAC tickets and repair synchronization.',
  },
];

export const PERMISSION_LEVEL_META: Record<
  PermissionLevel,
  { label: string; shortLabel: string; description: string }
> = {
  none: {
    label: 'No Access',
    shortLabel: 'None',
    description: 'Hidden from navigation; reading and editing blocked.',
  },
  view: {
    label: 'View Only',
    shortLabel: 'View',
    description: 'Read records and print A4 reports only; editing disabled.',
  },
  edit: {
    label: 'Edit / Log',
    shortLabel: 'Edit',
    description: 'Perform inspections, log checks, and update counts/statuses.',
  },
  full: {
    label: 'Full Control',
    shortLabel: 'Full',
    description: 'Edit, add new items/entries, and delete records.',
  },
};

export interface AdminRecord {
  uid: string;
  email: string;
  displayName: string;
  createdAt?: unknown;
}

export interface WardUserAccess {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  taskPermissions: Record<string, PermissionLevel>;
  taskScopeMode: TaskScopeMode;
  allowedTaskIds: string[];
  inventoryPermissions: Record<string, PermissionLevel>;
  canExportBackup: boolean;
  canAddCustomInventory: boolean;
  uid: string;
  createdByUid: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isHospitalEmail(email: string): boolean {
  return /^[^\s@]+@hospitals\.gov\.bh$/.test(normalizeEmail(email));
}

export function isBootstrapAdminEmail(email: string): boolean {
  const normalized = normalizeEmail(email);
  return normalized === TOP_ADMIN_EMAIL || normalized === BOOTSTRAP_ADMIN_EMAIL;
}

export function resolveHospitalLoginEmail(usernameOrEmail: string): string {
  const cleaned = normalizeEmail(usernameOrEmail);
  if (!cleaned) return '';
  if (cleaned.includes('@')) return cleaned;
  return `${cleaned}${HOSPITAL_EMAIL_DOMAIN}`;
}

/**
 * Matches emailToAccessId(email) in firestore.rules:
 * email.lower().replace('[^a-z0-9_\\-]', '_')
 */
export function emailToAccessId(email: string): string {
  return normalizeEmail(email).replace(/[^a-z0-9_-]/g, '_').slice(0, 128);
}

export function buildPermissionMap(
  keys: string[],
  level: PermissionLevel
): Record<string, PermissionLevel> {
  const result: Record<string, PermissionLevel> = {};
  for (const key of keys) {
    result[key] = level;
  }
  return result;
}

export function getAllInventoryCategoryKeys(customCategories: CategoryMeta[] = []): string[] {
  const ids = [...CORE_CATEGORIES.map((c) => c.id), ...customCategories.map((c) => c.id)];
  return Array.from(new Set(ids)).slice(0, 40);
}

export function buildPresetPermissions(
  preset: 'full-admin' | 'standard-staff' | 'view-only' | 'clear-all',
  customCategories: CategoryMeta[] = []
): Pick<
  WardUserAccess,
  | 'role'
  | 'taskPermissions'
  | 'taskScopeMode'
  | 'allowedTaskIds'
  | 'inventoryPermissions'
  | 'canExportBackup'
  | 'canAddCustomInventory'
> {
  const taskKeys = TASK_MODULE_DEFINITIONS.map((m) => m.id);
  const invKeys = getAllInventoryCategoryKeys(customCategories);

  if (preset === 'full-admin') {
    return {
      role: 'admin',
      taskPermissions: buildPermissionMap(taskKeys, 'full'),
      taskScopeMode: 'all',
      allowedTaskIds: [],
      inventoryPermissions: buildPermissionMap(invKeys, 'full'),
      canExportBackup: true,
      canAddCustomInventory: true,
    };
  }

  if (preset === 'standard-staff') {
    return {
      role: 'staff',
      taskPermissions: buildPermissionMap(taskKeys, 'edit'),
      taskScopeMode: 'all',
      allowedTaskIds: [],
      inventoryPermissions: buildPermissionMap(invKeys, 'edit'),
      canExportBackup: false,
      canAddCustomInventory: false,
    };
  }

  if (preset === 'view-only') {
    return {
      role: 'staff',
      taskPermissions: buildPermissionMap(taskKeys, 'view'),
      taskScopeMode: 'all',
      allowedTaskIds: [],
      inventoryPermissions: buildPermissionMap(invKeys, 'view'),
      canExportBackup: false,
      canAddCustomInventory: false,
    };
  }

  return {
    role: 'staff',
    taskPermissions: buildPermissionMap(taskKeys, 'none'),
    taskScopeMode: 'selected',
    allowedTaskIds: [],
    inventoryPermissions: buildPermissionMap(invKeys, 'none'),
    canExportBackup: false,
    canAddCustomInventory: false,
  };
}

export function isPermissionAtLeast(
  actual: PermissionLevel,
  required: 'view' | 'edit' | 'full'
): boolean {
  if (actual === 'full') return true;
  if (required === 'full') return false;
  if (actual === 'edit') return true;
  if (required === 'edit') return false;
  return actual === 'view';
}
