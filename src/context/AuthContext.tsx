import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  OperationType,
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  sanitizeDisplayName,
} from '../firebase';
import {
  BOOTSTRAP_ADMIN_EMAIL,
  type PermissionLevel,
  TOP_ADMIN_DEFAULT_PASSWORD,
  TOP_ADMIN_EMAIL,
  type TaskModuleKey,
  type WardUserAccess,
  buildPresetPermissions,
  emailToAccessId,
  isBootstrapAdminEmail,
  isHospitalEmail,
  isPermissionAtLeast,
  normalizeEmail,
  resolveHospitalLoginEmail,
} from '../types/auth';

export type AccessStatus =
  | 'loading'
  | 'signed-out'
  | 'pending-approval'
  | 'suspended'
  | 'authorized';

interface AuthContextValue {
  firebaseUser: User | null;
  authReady: boolean;
  accessStatus: AccessStatus;
  userAccess: WardUserAccess | null;
  isAdmin: boolean;
  authError: string | null;
  needsEmailPasswordSetup: boolean;
  signingIn: boolean;
  signInWithCredentials: (usernameOrEmail: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  refreshAccess: () => Promise<void>;
  getTaskAccess: (moduleKey: TaskModuleKey) => PermissionLevel;
  getInventoryAccess: (categoryId: string) => PermissionLevel;
  canViewTaskModule: (moduleKey: TaskModuleKey) => boolean;
  canEditTaskModule: (moduleKey: TaskModuleKey) => boolean;
  canFullTaskModule: (moduleKey: TaskModuleKey) => boolean;
  canViewInventory: (categoryId: string) => boolean;
  canEditInventory: (categoryId: string) => boolean;
  canFullInventory: (categoryId: string) => boolean;
  isScheduleTaskAllowed: (taskId: string) => boolean;
  canExportBackup: boolean;
  canAddCustomInventory: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function isAuthorizedEmailIdentity(user: User): boolean {
  const email = normalizeEmail(user.email || '');
  if (!email) return false;
  if (email === BOOTSTRAP_ADMIN_EMAIL) {
    return Boolean(user.emailVerified);
  }
  if (!isHospitalEmail(email)) {
    return false;
  }
  const hasPasswordProvider = user.providerData?.some((p) => p.providerId === 'password');
  return Boolean(user.emailVerified || hasPasswordProvider);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [accessStatus, setAccessStatus] = useState<AccessStatus>('loading');
  const [userAccess, setUserAccess] = useState<WardUserAccess | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [needsEmailPasswordSetup, setNeedsEmailPasswordSetup] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  const ensureAdminMarker = useCallback(async (user: User, displayName: string, email: string) => {
    const adminPath = `admins/${user.uid}`;
    const adminRef = doc(db, 'admins', user.uid);
    try {
      const snap = await getDoc(adminRef);
      if (!snap.exists()) {
        try {
          await setDoc(adminRef, {
            uid: user.uid,
            email,
            displayName: sanitizeDisplayName(displayName, email.split('@')[0]),
            createdAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, adminPath);
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, adminPath);
    }
  }, []);

  const ensureBootstrapAdminDocs = useCallback(
    async (user: User) => {
      const email = normalizeEmail(user.email || '');
      const accessId = emailToAccessId(email);
      const defaultName =
        email === TOP_ADMIN_EMAIL ? 'Top Admin' : user.displayName || 'Ward Administrator';
      const displayName = sanitizeDisplayName(defaultName);

      await ensureAdminMarker(user, displayName, email);

      const userPath = `wardUsers/${accessId}`;
      const userRef = doc(db, 'wardUsers', accessId);
      try {
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          const preset = buildPresetPermissions('full-admin');
          try {
            await setDoc(userRef, {
              id: accessId,
              email,
              displayName,
              ...preset,
              status: 'active',
              uid: user.uid,
              createdByUid: user.uid,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, userPath);
          }
        } else {
          const existing = snap.data() as WardUserAccess;
          if (existing.uid !== user.uid || existing.role !== 'admin' || existing.status !== 'active') {
            try {
              await updateDoc(userRef, {
                uid: user.uid,
                role: 'admin',
                status: 'active',
                updatedAt: serverTimestamp(),
              });
            } catch (err) {
              handleFirestoreError(err, OperationType.UPDATE, userPath);
            }
          }
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, userPath);
      }
    },
    [ensureAdminMarker]
  );

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      setFirebaseUser(user);
      setAuthError(null);

      if (!user) {
        setUserAccess(null);
        setAccessStatus('signed-out');
        setAuthReady(true);
        return;
      }

      const email = normalizeEmail(user.email || '');
      if (!email || !isAuthorizedEmailIdentity(user)) {
        setUserAccess(null);
        setAccessStatus('pending-approval');
        setAuthError(
          'Only authorized @hospitals.gov.bh hospital accounts (or the primary Ward Admin) can access WardCare Schedule.'
        );
        setAuthReady(true);
        return;
      }

      setAccessStatus('loading');
      const accessId = emailToAccessId(email);
      const isBootstrap = isBootstrapAdminEmail(email);

      try {
        if (isBootstrap) {
          await ensureBootstrapAdminDocs(user);
        }

        const profilePath = `wardUsers/${accessId}`;
        const profileRef = doc(db, 'wardUsers', accessId);

        unsubscribeProfile = onSnapshot(
          profileRef,
          async (snap) => {
            if (!snap.exists()) {
              setUserAccess(null);
              setAccessStatus(isBootstrap ? 'loading' : 'pending-approval');
              setAuthReady(true);
              return;
            }

            const profile = snap.data() as WardUserAccess;

            if (profile.uid && profile.uid !== user.uid && !isBootstrap) {
              setUserAccess(null);
              setAccessStatus('pending-approval');
              setAuthError('This hospital account is linked to a different login credential.');
              setAuthReady(true);
              return;
            }

            if (profile.uid === '' && profile.email === email) {
              try {
                await updateDoc(profileRef, {
                  uid: user.uid,
                  updatedAt: serverTimestamp(),
                });
              } catch (err) {
                if (!auth.currentUser || auth.currentUser.uid !== user.uid) return;
                handleFirestoreError(err, OperationType.UPDATE, profilePath);
              }
            }

            if ((profile.role === 'admin' && profile.status === 'active') || isBootstrap) {
              await ensureAdminMarker(
                user,
                profile.displayName || user.displayName || email,
                email
              );
            }

            if (profile.status === 'suspended' && !isBootstrap) {
              setUserAccess(profile);
              setAccessStatus('suspended');
              setAuthReady(true);
              return;
            }

            setUserAccess(profile);
            setAccessStatus('authorized');
            setAuthReady(true);
          },
          (error) => {
            setAuthReady(true);
            if (!auth.currentUser || auth.currentUser.uid !== user.uid) return;
            handleFirestoreError(error, OperationType.GET, profilePath);
          }
        );
      } catch (err) {
        setAuthError(err instanceof Error ? err.message : 'Unable to verify ward access.');
        setAuthReady(true);
      }
    });

    return () => {
      if (unsubscribeProfile) unsubscribeProfile();
      unsubscribeAuth();
    };
  }, [ensureAdminMarker, ensureBootstrapAdminDocs]);

  const signInWithCredentials = useCallback(async (usernameOrEmail: string, password: string) => {
    setSigningIn(true);
    setAuthError(null);
    setNeedsEmailPasswordSetup(false);

    const resolvedEmail = resolveHospitalLoginEmail(usernameOrEmail);
    if (!resolvedEmail || !isHospitalEmail(resolvedEmail)) {
      setAuthError('Please enter a valid @hospitals.gov.bh login email or username (e.g., admin).');
      setSigningIn(false);
      return;
    }
    if (!password) {
      setAuthError('Please enter your password.');
      setSigningIn(false);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, resolvedEmail, password);
    } catch (err) {
      const code = (err as { code?: string })?.code || '';

      if (
        resolvedEmail === TOP_ADMIN_EMAIL &&
        password === TOP_ADMIN_DEFAULT_PASSWORD &&
        (code === 'auth/user-not-found' || code === 'auth/invalid-credential')
      ) {
        try {
          await createUserWithEmailAndPassword(auth, TOP_ADMIN_EMAIL, TOP_ADMIN_DEFAULT_PASSWORD);
          setSigningIn(false);
          return;
        } catch (createErr) {
          const createCode = (createErr as { code?: string })?.code || '';
          if (createCode === 'auth/operation-not-allowed' || createCode === 'auth/admin-restricted-operation') {
            setNeedsEmailPasswordSetup(true);
            setAuthError(
              'Email/Password sign-in must be enabled in Firebase Console → Authentication → Sign-in method.'
            );
          } else if (createCode === 'auth/email-already-in-use') {
            setAuthError('Invalid Top Admin password.');
          } else {
            setAuthError(createErr instanceof Error ? createErr.message : 'Unable to sign in.');
          }
          setSigningIn(false);
          return;
        }
      }

      if (code === 'auth/operation-not-allowed' || code === 'auth/admin-restricted-operation') {
        setNeedsEmailPasswordSetup(true);
        setAuthError(
          'Email/Password sign-in must be enabled in Firebase Console → Authentication → Sign-in method.'
        );
      } else if (
        code === 'auth/invalid-credential' ||
        code === 'auth/wrong-password' ||
        code === 'auth/user-not-found'
      ) {
        setAuthError('Invalid hospital username/email or password.');
      } else if (code === 'auth/too-many-requests') {
        setAuthError('Too many failed sign-in attempts. Please wait a moment and try again.');
      } else {
        setAuthError(err instanceof Error ? err.message : 'Sign-in failed.');
      }
    } finally {
      setSigningIn(false);
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setSigningIn(true);
    setAuthError(null);
    setNeedsEmailPasswordSetup(false);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Google sign-in was cancelled or failed.';
      if (!message.includes('popup-closed-by-user')) {
        setAuthError(message);
      }
    } finally {
      setSigningIn(false);
    }
  }, []);

  const signOutUser = useCallback(async () => {
    setAuthError(null);
    setNeedsEmailPasswordSetup(false);
    await signOut(auth);
  }, []);

  const refreshAccess = useCallback(async () => {
    if (!firebaseUser?.email) return;
    const email = normalizeEmail(firebaseUser.email);
    if (!isAuthorizedEmailIdentity(firebaseUser)) {
      setUserAccess(null);
      setAccessStatus('pending-approval');
      return;
    }
    const accessId = emailToAccessId(email);
    const profilePath = `wardUsers/${accessId}`;
    try {
      const snap = await getDoc(doc(db, 'wardUsers', accessId));
      if (!snap.exists()) {
        setUserAccess(null);
        setAccessStatus('pending-approval');
        return;
      }
      const profile = snap.data() as WardUserAccess;
      if (profile.status === 'suspended' && !isBootstrapAdminEmail(email)) {
        setUserAccess(profile);
        setAccessStatus('suspended');
        return;
      }
      setUserAccess(profile);
      setAccessStatus('authorized');
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, profilePath);
    }
  }, [firebaseUser]);

  const isAdmin = useMemo(() => {
    if (accessStatus !== 'authorized' || !firebaseUser?.email) return false;
    if (isBootstrapAdminEmail(firebaseUser.email)) return true;
    return userAccess?.role === 'admin' && userAccess?.status === 'active';
  }, [accessStatus, firebaseUser, userAccess]);

  const getTaskAccess = useCallback(
    (moduleKey: TaskModuleKey): PermissionLevel => {
      if (accessStatus !== 'authorized') return 'none';
      if (isAdmin) return 'full';
      return userAccess?.taskPermissions?.[moduleKey] || 'none';
    },
    [accessStatus, isAdmin, userAccess]
  );

  const getInventoryAccess = useCallback(
    (categoryId: string): PermissionLevel => {
      if (accessStatus !== 'authorized') return 'none';
      if (isAdmin) return 'full';
      return userAccess?.inventoryPermissions?.[categoryId] || 'none';
    },
    [accessStatus, isAdmin, userAccess]
  );

  const canViewTaskModule = useCallback(
    (moduleKey: TaskModuleKey) => isPermissionAtLeast(getTaskAccess(moduleKey), 'view'),
    [getTaskAccess]
  );
  const canEditTaskModule = useCallback(
    (moduleKey: TaskModuleKey) => isPermissionAtLeast(getTaskAccess(moduleKey), 'edit'),
    [getTaskAccess]
  );
  const canFullTaskModule = useCallback(
    (moduleKey: TaskModuleKey) => isPermissionAtLeast(getTaskAccess(moduleKey), 'full'),
    [getTaskAccess]
  );

  const canViewInventory = useCallback(
    (categoryId: string) => isPermissionAtLeast(getInventoryAccess(categoryId), 'view'),
    [getInventoryAccess]
  );
  const canEditInventory = useCallback(
    (categoryId: string) => isPermissionAtLeast(getInventoryAccess(categoryId), 'edit'),
    [getInventoryAccess]
  );
  const canFullInventory = useCallback(
    (categoryId: string) => isPermissionAtLeast(getInventoryAccess(categoryId), 'full'),
    [getInventoryAccess]
  );

  const isScheduleTaskAllowed = useCallback(
    (taskId: string) => {
      if (accessStatus !== 'authorized') return false;
      if (isAdmin) return true;
      if (!canViewTaskModule('schedule')) return false;
      if (userAccess?.taskScopeMode !== 'selected') return true;
      return Array.isArray(userAccess.allowedTaskIds) && userAccess.allowedTaskIds.includes(taskId);
    },
    [accessStatus, canViewTaskModule, isAdmin, userAccess]
  );

  const canExportBackup =
    accessStatus === 'authorized' && (isAdmin || Boolean(userAccess?.canExportBackup));
  const canAddCustomInventory =
    accessStatus === 'authorized' && (isAdmin || Boolean(userAccess?.canAddCustomInventory));

  const value = useMemo<AuthContextValue>(
    () => ({
      firebaseUser,
      authReady,
      accessStatus,
      userAccess,
      isAdmin,
      authError,
      needsEmailPasswordSetup,
      signingIn,
      signInWithCredentials,
      signInWithGoogle,
      signOutUser,
      refreshAccess,
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
    }),
    [
      firebaseUser,
      authReady,
      accessStatus,
      userAccess,
      isAdmin,
      authError,
      needsEmailPasswordSetup,
      signingIn,
      signInWithCredentials,
      signInWithGoogle,
      signOutUser,
      refreshAccess,
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
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside an AuthProvider.');
  }
  return ctx;
}
