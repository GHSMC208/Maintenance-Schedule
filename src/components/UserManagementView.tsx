import {
  Check,
  Edit3,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Plus,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserX,
  Users,
  X,
} from 'lucide-react';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  OperationType,
  db,
  firebaseConfig,
  handleFirestoreError,
  sanitizeDisplayName,
  sanitizeWardUserFields,
  secondaryAuth,
} from '../firebase';
import {
  HOSPITAL_EMAIL_DOMAIN,
  PERMISSION_LEVEL_META,
  type PermissionLevel,
  TASK_MODULE_DEFINITIONS,
  TOP_ADMIN_EMAIL,
  type TaskScopeMode,
  type UserRole,
  type UserStatus,
  type WardUserAccess,
  buildPresetPermissions,
  isBootstrapAdminEmail,
  isHospitalEmail,
  normalizeEmail,
  resolveHospitalLoginEmail,
} from '../types/auth';
import type { CategoryMeta, ScheduleTask } from '../types/ward';

interface UserManagementViewProps {
  categories: CategoryMeta[];
  tasks: ScheduleTask[];
}

const LEVELS: PermissionLevel[] = ['none', 'view', 'edit', 'full'];

function PermissionSegmentedControl({
  value,
  disabled,
  onChange,
}: {
  value: PermissionLevel;
  disabled?: boolean;
  onChange: (level: PermissionLevel) => void;
}) {
  return (
    <div className="inline-flex items-center gap-0.5 p-0.5 bg-slate-100 rounded-md border border-slate-200">
      {LEVELS.map((lvl) => {
        const active = value === lvl;
        const meta = PERMISSION_LEVEL_META[lvl];
        const activeClass =
          lvl === 'none'
            ? 'bg-white text-slate-700 shadow-sm'
            : lvl === 'view'
              ? 'bg-amber-600 text-white shadow-sm'
              : lvl === 'edit'
                ? 'bg-teal-700 text-white shadow-sm'
                : 'bg-slate-900 text-white shadow-sm';

        return (
          <button
            key={lvl}
            type="button"
            disabled={disabled}
            title={meta.description}
            onClick={() => onChange(lvl)}
            className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              active ? activeClass : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {meta.shortLabel}
          </button>
        );
      })}
    </div>
  );
}

export function UserManagementView({ categories, tasks }: UserManagementViewProps) {
  const { firebaseUser, isAdmin } = useAuth();
  const [users, setUsers] = useState<WardUserAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | UserStatus>('all');
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<WardUserAccess | null>(null);
  const [saving, setSaving] = useState(false);

  const [formEmail, setFormEmail] = useState('');
  const [formName, setFormName] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [formUseGoogleOnly, setFormUseGoogleOnly] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [formRole, setFormRole] = useState<UserRole>('staff');
  const [formStatus, setFormStatus] = useState<UserStatus>('active');
  const [formTaskPerms, setFormTaskPerms] = useState<Record<string, PermissionLevel>>({});
  const [formTaskScope, setFormTaskScope] = useState<TaskScopeMode>('all');
  const [formAllowedTaskIds, setFormAllowedTaskIds] = useState<string[]>([]);
  const [formInvPerms, setFormInvPerms] = useState<Record<string, PermissionLevel>>({});
  const [formCanExportBackup, setFormCanExportBackup] = useState(false);
  const [formCanAddCustomInv, setFormCanAddCustomInv] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const customCats = useMemo(
    () => categories.filter((c) => c.id.startsWith('custom-')),
    [categories]
  );

  useEffect(() => {
    if (!isAdmin) return;
    const path = 'wardUsers';
    const q = query(collection(db, path), orderBy('email'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as WardUserAccess);
        setUsers(list);
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
    return () => unsub();
  }, [isAdmin]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (statusFilter !== 'all' && u.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !u.displayName.toLowerCase().includes(q) &&
          !u.email.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [users, roleFilter, statusFilter, search]);

  const applyPreset = (
    preset: 'full-admin' | 'standard-staff' | 'view-only' | 'clear-all'
  ) => {
    const p = buildPresetPermissions(preset, customCats);
    setFormRole(p.role);
    setFormTaskPerms(p.taskPermissions);
    setFormTaskScope(p.taskScopeMode);
    setFormAllowedTaskIds(p.allowedTaskIds);
    setFormInvPerms(p.inventoryPermissions);
    setFormCanExportBackup(p.canExportBackup);
    setFormCanAddCustomInv(p.canAddCustomInventory);
  };

  const openAddModal = () => {
    setEditingUser(null);
    setFormEmail('');
    setFormName('');
    setFormPassword('');
    setShowFormPassword(false);
    setFormUseGoogleOnly(false);
    setModalError(null);
    setFormStatus('active');
    applyPreset('standard-staff');
    setFeedback(null);
    setShowModal(true);
  };

  const openEditModal = (u: WardUserAccess) => {
    setEditingUser(u);
    setFormEmail(u.email);
    setFormName(u.displayName);
    setFormPassword('');
    setShowFormPassword(false);
    setFormUseGoogleOnly(false);
    setModalError(null);
    setFormRole(u.role);
    setFormStatus(u.status);

    const taskPerms: Record<string, PermissionLevel> = {};
    for (const def of TASK_MODULE_DEFINITIONS) {
      taskPerms[def.id] = u.taskPermissions?.[def.id] || 'none';
    }
    const invPerms: Record<string, PermissionLevel> = {};
    for (const cat of categories) {
      invPerms[cat.id] = u.inventoryPermissions?.[cat.id] || 'none';
    }
    setFormTaskPerms(taskPerms);
    setFormTaskScope(u.taskScopeMode || 'all');
    setFormAllowedTaskIds(Array.isArray(u.allowedTaskIds) ? u.allowedTaskIds : []);
    setFormInvPerms(invPerms);
    setFormCanExportBackup(Boolean(u.canExportBackup));
    setFormCanAddCustomInv(Boolean(u.canAddCustomInventory));
    setFeedback(null);
    setShowModal(true);
  };

  const handleToggleAllowedTask = (taskId: string) => {
    setFormAllowedTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    setSaving(true);
    setFeedback(null);
    setModalError(null);

    try {
      const normalizedEmail = editingUser
        ? normalizeEmail(formEmail)
        : resolveHospitalLoginEmail(formEmail);
      const isBootstrapTarget = isBootstrapAdminEmail(normalizedEmail);

      if (!editingUser && !isHospitalEmail(normalizedEmail)) {
        setModalError(
          `All users must have a hospital email ending with ${HOSPITAL_EMAIL_DOMAIN}.`
        );
        setSaving(false);
        return;
      }

      let provisionedUid = editingUser ? editingUser.uid : '';
      let authNote = '';

      if (!editingUser && !formUseGoogleOnly) {
        if (formPassword.length < 6) {
          setModalError('Initial password must be at least 6 characters.');
          setSaving(false);
          return;
        }
        try {
          const cred = await createUserWithEmailAndPassword(
            secondaryAuth,
            normalizedEmail,
            formPassword
          );
          provisionedUid = cred.user.uid;
          await signOut(secondaryAuth);
        } catch (authErr) {
          const code = (authErr as { code?: string })?.code || '';
          if (code === 'auth/email-already-in-use') {
            provisionedUid = '';
            authNote = ' (Linked to existing Firebase login account)';
          } else if (
            code === 'auth/operation-not-allowed' ||
            code === 'auth/admin-restricted-operation'
          ) {
            setModalError(
              `Enable Email/Password in Firebase Console (${firebaseConfig.projectId} → Authentication → Sign-in method) before creating password users, or select Google Sign-In only.`
            );
            setSaving(false);
            return;
          } else {
            setModalError(
              authErr instanceof Error
                ? authErr.message
                : 'Could not provision user login credentials.'
            );
            setSaving(false);
            return;
          }
        }
      }

      const sanitized = sanitizeWardUserFields(
        {
          email: normalizedEmail,
          displayName: formName,
          role: isBootstrapTarget ? 'admin' : formRole,
          status: isBootstrapTarget ? 'active' : formStatus,
          taskPermissions:
            formRole === 'admin' || isBootstrapTarget
              ? buildPresetPermissions('full-admin', customCats).taskPermissions
              : formTaskPerms,
          taskScopeMode:
            formRole === 'admin' || isBootstrapTarget ? 'all' : formTaskScope,
          allowedTaskIds:
            formRole === 'admin' || isBootstrapTarget ? [] : formAllowedTaskIds,
          inventoryPermissions:
            formRole === 'admin' || isBootstrapTarget
              ? buildPresetPermissions('full-admin', customCats).inventoryPermissions
              : formInvPerms,
          canExportBackup:
            formRole === 'admin' || isBootstrapTarget ? true : formCanExportBackup,
          canAddCustomInventory:
            formRole === 'admin' || isBootstrapTarget ? true : formCanAddCustomInv,
          uid: provisionedUid,
          createdByUid: editingUser ? editingUser.createdByUid : firebaseUser.uid,
        },
        { allowOwnerBootstrap: Boolean(editingUser && isBootstrapTarget) }
      );

      const docPath = `wardUsers/${sanitized.id}`;
      const userRef = doc(db, 'wardUsers', sanitized.id);

      if (editingUser) {
        try {
          const batch = writeBatch(db);
          batch.update(userRef, {
            displayName: sanitized.displayName,
            role: sanitized.role,
            status: sanitized.status,
            taskPermissions: sanitized.taskPermissions,
            taskScopeMode: sanitized.taskScopeMode,
            allowedTaskIds: sanitized.allowedTaskIds,
            inventoryPermissions: sanitized.inventoryPermissions,
            canExportBackup: sanitized.canExportBackup,
            canAddCustomInventory: sanitized.canAddCustomInventory,
            updatedAt: serverTimestamp(),
          });

          if (sanitized.uid) {
            const adminRef = doc(db, 'admins', sanitized.uid);
            if (sanitized.role === 'admin' && sanitized.status === 'active') {
              batch.set(adminRef, {
                uid: sanitized.uid,
                email: sanitized.email,
                displayName: sanitizeDisplayName(sanitized.displayName),
                createdAt: serverTimestamp(),
              });
            } else if (!isBootstrapTarget) {
              batch.delete(adminRef);
            }
          }

          await batch.commit();
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, docPath);
        }
        setFeedback({
          type: 'ok',
          text: `Updated access control for ${sanitized.displayName} (${sanitized.email}).`,
        });
      } else {
        if (users.some((u) => u.id === sanitized.id || u.email === sanitized.email)) {
          setModalError(
            `An account for ${sanitized.email} already exists. Edit it from the directory.`
          );
          setSaving(false);
          return;
        }
        try {
          await setDoc(userRef, {
            ...sanitized,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, docPath);
        }
        setFeedback({
          type: 'ok',
          text: `Added ${sanitized.displayName} (${sanitized.email})${authNote}.`,
        });
      }

      setShowModal(false);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Could not save user permissions.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (u: WardUserAccess) => {
    if (isBootstrapAdminEmail(u.email)) return;
    const nextStatus: UserStatus = u.status === 'active' ? 'suspended' : 'active';
    const docPath = `wardUsers/${u.id}`;
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'wardUsers', u.id), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
      if (u.uid) {
        if (nextStatus === 'suspended') {
          batch.delete(doc(db, 'admins', u.uid));
        } else if (u.role === 'admin') {
          batch.set(doc(db, 'admins', u.uid), {
            uid: u.uid,
            email: u.email,
            displayName: sanitizeDisplayName(u.displayName),
            createdAt: serverTimestamp(),
          });
        }
      }
      await batch.commit();
      setFeedback({
        type: 'ok',
        text: `${u.displayName} is now ${nextStatus}.`,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, docPath);
    }
  };

  const handleDeleteUser = async (u: WardUserAccess) => {
    if (isBootstrapAdminEmail(u.email)) return;
    const docPath = `wardUsers/${u.id}`;
    try {
      if (u.uid) {
        try {
          await deleteDoc(doc(db, 'admins', u.uid));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `admins/${u.uid}`);
        }
      }
      await deleteDoc(doc(db, 'wardUsers', u.id));
      setDeletingId(null);
      setFeedback({
        type: 'ok',
        text: `Removed access profile for ${u.email}.`,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, docPath);
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
        <Lock className="w-8 h-8 text-slate-300 mx-auto" />
        <h2 className="mt-3 text-sm font-semibold text-slate-900">Administrator Access Only</h2>
        <p className="mt-1 text-xs text-slate-500">
          Only Admin users can manage ward accounts and selective permissions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Summary Strip */}
      <section className="bg-white border border-slate-200 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-700 border border-teal-100 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Admin Access Control &amp; Staff Permissions
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Add hospital staff accounts (<span className="font-mono">{HOSPITAL_EMAIL_DOMAIN}</span>)
              and configure selective authority for each task module, scheduled task, and inventory
              section.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Add User &amp; Assign Permissions
        </button>
      </section>

      {feedback && (
        <div
          className={`px-4 py-2.5 rounded-lg border text-xs flex items-center justify-between gap-3 ${
            feedback.type === 'ok'
              ? 'bg-teal-50 border-teal-200 text-teal-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* User Directory */}
      <section className="bg-white border border-slate-200 rounded-lg">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name or email..."
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-md w-60 focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            </div>

            <select
              aria-label="Filter by role"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as 'all' | UserRole)}
              className="text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-700"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin Only</option>
              <option value="staff">Staff Only</option>
            </select>

            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | UserStatus)}
              className="text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-700"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          <div className="text-xs text-slate-500 font-mono tabular-nums">
            {filteredUsers.length} account{filteredUsers.length === 1 ? '' : 's'}
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-xs text-slate-500">
            Loading ward users and permission profiles...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-10 text-center">
            <Users className="w-8 h-8 text-slate-300 mx-auto" />
            <div className="mt-2 text-sm font-medium text-slate-900">No matching users</div>
            <p className="text-xs text-slate-500 mt-1">
              Add staff Google accounts to grant them selective access.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-medium text-slate-500">
                  <th className="py-2.5 px-4">Staff / Admin User</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Task Authority</th>
                  <th className="py-2.5 px-3">Inventory Authority</th>
                  <th className="py-2.5 px-3">Sign-In Link</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {filteredUsers.map((u) => {
                  const isBootstrap = isBootstrapAdminEmail(u.email);
                  const isTopAdmin = u.email === TOP_ADMIN_EMAIL;
                  const grantedTasks = TASK_MODULE_DEFINITIONS.filter(
                    (d) => (u.taskPermissions?.[d.id] || 'none') !== 'none'
                  ).length;
                  const grantedInvs = categories.filter(
                    (c) => (u.inventoryPermissions?.[c.id] || 'none') !== 'none'
                  ).length;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900 flex items-center gap-1.5">
                          <span>{u.displayName}</span>
                          {isBootstrap && (
                            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-teal-50 text-teal-800 border border-teal-200 rounded">
                              {isTopAdmin ? 'Top Admin (admin)' : 'Owner Admin'}
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-[11px] text-slate-500 mt-0.5">
                          {u.email}
                        </div>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        {u.role === 'admin' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 text-white font-medium text-[11px]">
                            <Shield className="w-3 h-3" />
                            Admin (Full)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[11px]">
                            Staff
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        {u.status === 'active' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                            <UserCheck className="w-3.5 h-3.5" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-700 font-medium">
                            <UserX className="w-3.5 h-3.5" />
                            Suspended
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap text-slate-700">
                        {u.role === 'admin' ? (
                          <span className="font-medium text-teal-800">All Tasks (Full)</span>
                        ) : (
                          <div>
                            <span className="font-mono tabular-nums font-medium">
                              {grantedTasks}/{TASK_MODULE_DEFINITIONS.length}
                            </span>{' '}
                            modules
                            {u.taskScopeMode === 'selected' && (
                              <span className="text-[11px] text-slate-500 ml-1">
                                ({u.allowedTaskIds?.length || 0} tasks)
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap text-slate-700">
                        {u.role === 'admin' ? (
                          <span className="font-medium text-teal-800">All Inventories (Full)</span>
                        ) : (
                          <div>
                            <span className="font-mono tabular-nums font-medium">
                              {grantedInvs}/{categories.length}
                            </span>{' '}
                            areas
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        {u.uid ? (
                          <span className="inline-flex items-center gap-1 text-teal-800 font-medium">
                            <KeyRound className="w-3 h-3" />
                            Verified
                          </span>
                        ) : (
                          <span className="text-slate-400">Awaiting first login</span>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(u)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 rounded transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" />
                            Permissions
                          </button>

                          {!isBootstrap && (
                            <>
                              <button
                                type="button"
                                onClick={() => void handleToggleStatus(u)}
                                className={`px-2 py-1 text-xs font-medium rounded border transition-colors cursor-pointer ${
                                  u.status === 'active'
                                    ? 'border-amber-200 text-amber-800 hover:bg-amber-50'
                                    : 'border-emerald-200 text-emerald-800 hover:bg-emerald-50'
                                }`}
                              >
                                {u.status === 'active' ? 'Suspend' : 'Activate'}
                              </button>

                              {deletingId === u.id ? (
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => void handleDeleteUser(u)}
                                    className="px-2 py-1 text-xs font-medium text-white bg-rose-700 hover:bg-rose-800 rounded cursor-pointer"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeletingId(null)}
                                    className="px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  title="Delete user"
                                  onClick={() => setDeletingId(u.id)}
                                  className="p-1 text-slate-400 hover:text-rose-700 rounded transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Add / Edit Permissions Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-xl">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  {editingUser
                    ? `Edit User & Permissions — ${editingUser.displayName}`
                    : 'Add Ward User & Assign Selective Permissions'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  All user logins must end with <span className="font-mono">{HOSPITAL_EMAIL_DOMAIN}</span>.
                  Admin controls exact view, edit, or full authority per module.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="flex-1 overflow-y-auto p-6 space-y-6">
              {modalError && (
                <div className="px-4 py-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
                  {modalError}
                </div>
              )}

              {/* Account Identity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Login Name / Hospital Email ({HOSPITAL_EMAIL_DOMAIN})
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={160}
                    disabled={Boolean(editingUser)}
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder={`nurse.name or nurse.name${HOSPITAL_EMAIL_DOMAIN}`}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700 disabled:bg-slate-50 disabled:text-slate-500"
                  />
                  {!editingUser && formEmail.trim().length > 0 && (
                    <p
                      className={`mt-1 text-[11px] font-mono ${
                        isHospitalEmail(resolveHospitalLoginEmail(formEmail))
                          ? 'text-teal-700'
                          : 'text-rose-700'
                      }`}
                    >
                      {isHospitalEmail(resolveHospitalLoginEmail(formEmail))
                        ? `Login email: ${resolveHospitalLoginEmail(formEmail)}`
                        : `Must end with ${HOSPITAL_EMAIL_DOMAIN}`}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={120}
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g., RN Sara Al-Mansoor"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Account Role
                  </label>
                  <select
                    value={formRole}
                    disabled={isBootstrapAdminEmail(
                      editingUser ? formEmail : resolveHospitalLoginEmail(formEmail)
                    )}
                    onChange={(e) => {
                      const nextRole = e.target.value as UserRole;
                      setFormRole(nextRole);
                      if (nextRole === 'admin') {
                        applyPreset('full-admin');
                      }
                    }}
                    className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700 disabled:bg-slate-50"
                  >
                    <option value="staff">Staff (Selective Control)</option>
                    <option value="admin">Admin (Full Authority)</option>
                  </select>
                </div>
              </div>

              {!editingUser && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end bg-slate-50 border border-slate-200 rounded-lg p-3.5">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Initial Login Password (min 6 characters)
                    </label>
                    <div className="relative">
                      <input
                        type={showFormPassword ? 'text' : 'password'}
                        required={!formUseGoogleOnly}
                        disabled={formUseGoogleOnly}
                        minLength={6}
                        value={formPassword}
                        onChange={(e) => setFormPassword(e.target.value)}
                        placeholder={
                          formUseGoogleOnly ? 'Google SSO only' : 'Set login password'
                        }
                        className="w-full pl-3 pr-9 py-2 text-xs border border-slate-200 bg-white rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700 disabled:bg-slate-100"
                      />
                      <button
                        type="button"
                        aria-label={showFormPassword ? 'Hide password' : 'Show password'}
                        disabled={formUseGoogleOnly}
                        onClick={() => setShowFormPassword((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer disabled:opacity-40"
                      >
                        {showFormPassword ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-slate-700 pb-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formUseGoogleOnly}
                      onChange={(e) => setFormUseGoogleOnly(e.target.checked)}
                      className="accent-teal-700"
                    />
                    <span>Google SSO only (user signs in with {HOSPITAL_EMAIL_DOMAIN} Google)</span>
                  </label>
                </div>
              )}

              {formRole === 'admin' ? (
                <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg flex items-start gap-3 text-xs text-teal-900">
                  <ShieldAlert className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                  <div>
                    <strong>Administrator Role Selected:</strong> Admins hold full authority across
                    all Tasks, all Inventories, Backup/Reset controls, and User Management.
                  </div>
                </div>
              ) : (
                <>
                  {/* Quick Presets */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3.5">
                    <div className="text-xs font-medium text-slate-700">
                      Quick Permission Templates:
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => applyPreset('standard-staff')}
                        className="px-2.5 py-1 text-xs font-medium bg-white border border-slate-200 hover:bg-slate-100 rounded text-slate-700 cursor-pointer"
                      >
                        Standard Nurse (Edit All)
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPreset('view-only')}
                        className="px-2.5 py-1 text-xs font-medium bg-white border border-slate-200 hover:bg-slate-100 rounded text-slate-700 cursor-pointer"
                      >
                        View Only (Auditor)
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPreset('clear-all')}
                        className="px-2.5 py-1 text-xs font-medium bg-white border border-rose-200 hover:bg-rose-50 rounded text-rose-700 cursor-pointer"
                      >
                        Clear All (Custom Pick)
                      </button>
                    </div>
                  </div>

                  {/* Selective Task Modules Control */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                        1. Task Modules Authority
                      </h4>
                      <span className="text-[11px] text-slate-500">
                        None = Hidden · View = Print/Read · Edit = Check/Log · Full = Add/Delete
                      </span>
                    </div>

                    <div className="border border-slate-200 rounded-lg divide-y divide-slate-200">
                      {TASK_MODULE_DEFINITIONS.map((mod) => {
                        const lvl = formTaskPerms[mod.id] || 'none';
                        return (
                          <div
                            key={mod.id}
                            className="p-3.5 flex flex-wrap items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-slate-900">
                                {mod.label}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                {mod.description}
                              </div>
                            </div>
                            <PermissionSegmentedControl
                              value={lvl}
                              onChange={(nextLvl) =>
                                setFormTaskPerms((prev) => ({ ...prev, [mod.id]: nextLvl }))
                              }
                            />
                          </div>
                        );
                      })}
                    </div>

                    {/* Individual Task Scope inside Weekly & Monthly Tasks */}
                    {(formTaskPerms['schedule'] || 'none') !== 'none' && (
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="text-xs font-semibold text-slate-900">
                              Individual Scheduled Tasks Visibility &amp; Control
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Choose whether this user sees all scheduled tasks or only specific
                              assigned tasks.
                            </div>
                          </div>

                          <div className="inline-flex items-center gap-1 p-0.5 bg-white border border-slate-200 rounded-md">
                            <button
                              type="button"
                              onClick={() => setFormTaskScope('all')}
                              className={`px-2.5 py-1 text-xs font-medium rounded cursor-pointer ${
                                formTaskScope === 'all'
                                  ? 'bg-teal-700 text-white'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              All Tasks ({tasks.length})
                            </button>
                            <button
                              type="button"
                              onClick={() => setFormTaskScope('selected')}
                              className={`px-2.5 py-1 text-xs font-medium rounded cursor-pointer ${
                                formTaskScope === 'selected'
                                  ? 'bg-teal-700 text-white'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              Selected Tasks ({formAllowedTaskIds.length})
                            </button>
                          </div>
                        </div>

                        {formTaskScope === 'selected' && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-[11px] text-slate-500">
                              <span>
                                Select up to 60 scheduled tasks this user can access (
                                {formAllowedTaskIds.length} selected):
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setFormAllowedTaskIds(tasks.slice(0, 60).map((t) => t.id))
                                  }
                                  className="text-teal-700 hover:underline cursor-pointer"
                                >
                                  Select All
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setFormAllowedTaskIds([])}
                                  className="text-slate-600 hover:underline cursor-pointer"
                                >
                                  Clear
                                </button>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                              {tasks.map((t) => {
                                const checked = formAllowedTaskIds.includes(t.id);
                                return (
                                  <label
                                    key={t.id}
                                    className={`flex items-start gap-2 p-2 rounded border text-xs cursor-pointer transition-colors ${
                                      checked
                                        ? 'bg-white border-teal-600 text-slate-900'
                                        : 'bg-white/60 border-slate-200 text-slate-600'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => handleToggleAllowedTask(t.id)}
                                      className="mt-0.5 accent-teal-700"
                                    />
                                    <div className="min-w-0">
                                      <div className="font-medium leading-snug truncate">
                                        {t.title}
                                      </div>
                                      <div className="text-[10px] text-slate-500">
                                        {t.category} · {t.unit} · {t.frequency}
                                      </div>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Selective Inventory Areas Control */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                      2. Inventory &amp; Expiry Sections Authority
                    </h4>
                    <div className="border border-slate-200 rounded-lg divide-y divide-slate-200">
                      {categories.map((cat) => {
                        const lvl = formInvPerms[cat.id] || 'none';
                        return (
                          <div
                            key={cat.id}
                            className="p-3.5 flex flex-wrap items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-slate-900">
                                {cat.label}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5 truncate max-w-md">
                                {cat.description}
                              </div>
                            </div>
                            <PermissionSegmentedControl
                              value={lvl}
                              onChange={(nextLvl) =>
                                setFormInvPerms((prev) => ({ ...prev, [cat.id]: nextLvl }))
                              }
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* System Capabilities */}
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                      3. Additional Ward Capabilities
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="flex items-start gap-2.5 p-3 border border-slate-200 rounded-lg text-xs cursor-pointer hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={formCanExportBackup}
                          onChange={(e) => setFormCanExportBackup(e.target.checked)}
                          className="mt-0.5 accent-teal-700"
                        />
                        <div>
                          <div className="font-medium text-slate-900">
                            Export CSV &amp; JSON Backups
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Allow opening Reports &amp; Backup to download CSV/JSON exports (restore
                            &amp; reset remain Admin-only).
                          </div>
                        </div>
                      </label>

                      <label className="flex items-start gap-2.5 p-3 border border-slate-200 rounded-lg text-xs cursor-pointer hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={formCanAddCustomInv}
                          onChange={(e) => setFormCanAddCustomInv(e.target.checked)}
                          className="mt-0.5 accent-teal-700"
                        />
                        <div>
                          <div className="font-medium text-slate-900">
                            Create Custom Inventory Areas &amp; Ward Settings
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Allow adding new custom inventory tabs and updating ward inspector
                            metadata.
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>
                </>
              )}

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50 rounded-md cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  {saving ? 'Saving...' : editingUser ? 'Save Permissions' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
