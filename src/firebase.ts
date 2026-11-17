import { getApps, initializeApp } from 'firebase/app';
import { GoogleAuthProvider, getAuth } from 'firebase/auth';
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import {
  type PermissionLevel,
  type WardUserAccess,
  emailToAccessId,
  normalizeEmail,
} from './types/auth';

const app = initializeApp(firebaseConfig);
const secondaryApp =
  getApps().find((a) => a.name === 'wardcare-user-provisioner') ||
  initializeApp(firebaseConfig, 'wardcare-user-provisioner');

export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const secondaryAuth = getAuth(secondaryApp);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const BLUEPRINT_LIMITS = {
  ID_PATTERN: /^[a-zA-Z0-9_-]+$/,
  EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  HOSPITAL_EMAIL_PATTERN: /^[^\s@]+@hospitals\.gov\.bh$/,
  ALLOWED_WARD_EMAIL_PATTERN: /^([^\s@]+@hospitals\.gov\.bh|ghsmc208@gmail\.com)$/,
  MODULE_ID_PATTERN: /^[a-zA-Z0-9_-]+$/,
  MAX_ID_LEN: 128,
  MAX_EMAIL_LEN: 160,
  MAX_DISPLAY_NAME_LEN: 120,
  MAX_MODULE_ID_LEN: 64,
  MAX_TASK_PERMS: 20,
  MAX_INV_PERMS: 40,
  MAX_ALLOWED_TASK_IDS: 60,
} as const;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

void testConnection();

export function sanitizeDisplayName(name: string, fallback = 'Ward User'): string {
  const cleaned = name.trim().slice(0, BLUEPRINT_LIMITS.MAX_DISPLAY_NAME_LEN);
  return cleaned.length > 0 ? cleaned : fallback;
}

export function sanitizeEmailForBlueprint(
  email: string,
  options?: { allowOwnerBootstrap?: boolean }
): string {
  const normalized = normalizeEmail(email).slice(0, BLUEPRINT_LIMITS.MAX_EMAIL_LEN);
  if (options?.allowOwnerBootstrap) {
    if (!BLUEPRINT_LIMITS.ALLOWED_WARD_EMAIL_PATTERN.test(normalized)) {
      throw new Error('Email must end with @hospitals.gov.bh.');
    }
    return normalized;
  }
  if (!BLUEPRINT_LIMITS.HOSPITAL_EMAIL_PATTERN.test(normalized)) {
    throw new Error('All users must have a hospital email ending with @hospitals.gov.bh.');
  }
  return normalized;
}

const VALID_PERM_LEVELS: PermissionLevel[] = ['none', 'view', 'edit', 'full'];

function sanitizePermissionMap(
  input: Record<string, PermissionLevel>,
  maxKeys: number
): Record<string, PermissionLevel> {
  const out: Record<string, PermissionLevel> = {};
  const entries = Object.entries(input || {}).slice(0, maxKeys);
  for (const [k, v] of entries) {
    if (BLUEPRINT_LIMITS.ID_PATTERN.test(k) && VALID_PERM_LEVELS.includes(v)) {
      out[k] = v;
    }
  }
  return out;
}

export function sanitizeWardUserFields(
  input: Omit<WardUserAccess, 'id' | 'createdAt' | 'updatedAt'>,
  options?: { allowOwnerBootstrap?: boolean }
): Omit<WardUserAccess, 'createdAt' | 'updatedAt'> {
  const cleanEmail = sanitizeEmailForBlueprint(input.email, options);
  const accessId = emailToAccessId(cleanEmail);
  if (!BLUEPRINT_LIMITS.ID_PATTERN.test(accessId) || accessId.length > BLUEPRINT_LIMITS.MAX_ID_LEN) {
    throw new Error('Derived user access ID contains invalid characters or exceeds limit.');
  }
  const createdByUid = input.createdByUid.trim().slice(0, BLUEPRINT_LIMITS.MAX_ID_LEN);
  if (!BLUEPRINT_LIMITS.ID_PATTERN.test(createdByUid)) {
    throw new Error('Invalid creator UID.');
  }
  return {
    id: accessId,
    email: cleanEmail,
    displayName: sanitizeDisplayName(input.displayName, cleanEmail.split('@')[0]),
    role: input.role === 'admin' ? 'admin' : 'staff',
    status: input.status === 'suspended' ? 'suspended' : 'active',
    taskPermissions: sanitizePermissionMap(input.taskPermissions, BLUEPRINT_LIMITS.MAX_TASK_PERMS),
    taskScopeMode: input.taskScopeMode === 'selected' ? 'selected' : 'all',
    allowedTaskIds: Array.from(new Set(input.allowedTaskIds || []))
      .filter((id) => typeof id === 'string' && id.trim().length > 0)
      .slice(0, BLUEPRINT_LIMITS.MAX_ALLOWED_TASK_IDS),
    inventoryPermissions: sanitizePermissionMap(
      input.inventoryPermissions,
      BLUEPRINT_LIMITS.MAX_INV_PERMS
    ),
    canExportBackup: Boolean(input.canExportBackup),
    canAddCustomInventory: Boolean(input.canAddCustomInventory),
    uid: (input.uid || '').trim().slice(0, BLUEPRINT_LIMITS.MAX_ID_LEN),
    createdByUid,
  };
}

export function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined)
      .map((item) => stripUndefinedDeep(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) {
        out[k] = stripUndefinedDeep(v);
      }
    }
    return out as T;
  }
  return value;
}

export { firebaseConfig };
