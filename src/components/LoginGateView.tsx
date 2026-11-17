import {
  CalendarCheck,
  Clock,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LogOut,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  User,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { firebaseConfig } from '../firebase';
import {
  HOSPITAL_EMAIL_DOMAIN,
  TOP_ADMIN_EMAIL,
  TOP_ADMIN_USERNAME,
  isHospitalEmail,
  resolveHospitalLoginEmail,
} from '../types/auth';

export function LoginGateView() {
  const {
    firebaseUser,
    authReady,
    accessStatus,
    authError,
    needsEmailPasswordSetup,
    signingIn,
    signInWithCredentials,
    signInWithGoogle,
    signOutUser,
    refreshAccess,
  } = useAuth();

  const [loginInput, setLoginInput] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const resolvedPreview = resolveHospitalLoginEmail(loginInput);
  const hasInvalidDomain =
    loginInput.includes('@') && resolvedPreview.length > 0 && !isHospitalEmail(resolvedPreview);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void signInWithCredentials(loginInput, password);
  };

  if (!authReady || accessStatus === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8 max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-teal-700 text-white flex items-center justify-center mx-auto">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">WardCare Schedule</h1>
            <p className="text-xs text-slate-500 mt-1">
              Verifying hospital credentials and ward access permissions...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (accessStatus === 'pending-approval') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8 max-w-md w-full space-y-5">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-900">
                Access Pending Admin Approval
              </h1>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                This account is not yet authorized in the ward directory, or does not use an
                approved <span className="font-mono">{HOSPITAL_EMAIL_DOMAIN}</span> hospital email.
              </p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-xs space-y-1">
            <div className="text-slate-500">Signed-in Account</div>
            <div className="font-mono font-medium text-slate-900 break-all">
              {firebaseUser?.email}
            </div>
          </div>

          <div className="text-xs text-slate-600 leading-relaxed bg-teal-50/60 border border-teal-100 rounded-lg px-4 py-3">
            Ask the Top Admin (<span className="font-mono">{TOP_ADMIN_USERNAME}</span> /{' '}
            <span className="font-mono">{TOP_ADMIN_EMAIL}</span>) to register your{' '}
            <span className="font-mono">{HOSPITAL_EMAIL_DOMAIN}</span> login under{' '}
            <strong>Users &amp; Access Control</strong>.
          </div>

          {authError && (
            <div className="px-3.5 py-2.5 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-800">
              {authError}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={() => void refreshAccess()}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Check Access Again
            </button>
            <button
              type="button"
              onClick={() => void signOutUser()}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (accessStatus === 'suspended') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8 max-w-md w-full space-y-5">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-900">Account Suspended</h1>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Access for this ward account has been suspended by an Administrator. Please contact
                the Ward Admin to restore permissions.
              </p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-xs space-y-1">
            <div className="text-slate-500">Hospital Account</div>
            <div className="font-mono font-medium text-slate-900 break-all">
              {firebaseUser?.email}
            </div>
          </div>

          <button
            type="button"
            onClick={() => void signOutUser()}
            className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out &amp; Switch Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8 max-w-md w-full space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-teal-700 text-white flex items-center justify-center shrink-0">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900 tracking-tight">
              WardCare Schedule
            </h1>
            <p className="text-xs text-slate-500">
              Hospital Ward Operations, Maintenance &amp; Inventory Control
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2.5 text-xs text-slate-600 leading-relaxed bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5">
          <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
          <div>
            Sign in with your hospital login (<span className="font-mono">{HOSPITAL_EMAIL_DOMAIN}</span>
            ) or Top Admin username (<span className="font-mono">{TOP_ADMIN_USERNAME}</span>).
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              User Name or Hospital Email
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                autoComplete="username"
                value={loginInput}
                onChange={(e) => setLoginInput(e.target.value)}
                placeholder={`admin or name${HOSPITAL_EMAIL_DOMAIN}`}
                className={`w-full pl-9 pr-3 py-2 text-xs font-mono border rounded-lg focus:outline-none focus:ring-2 ${
                  hasInvalidDomain
                    ? 'border-rose-300 focus:ring-rose-500'
                    : 'border-slate-200 focus:ring-teal-700'
                }`}
              />
            </div>
            {loginInput.trim().length > 0 && !loginInput.includes('@') && (
              <p className="mt-1 text-[11px] text-slate-500 font-mono">
                Login email: {resolvedPreview}
              </p>
            )}
            {hasInvalidDomain && (
              <p className="mt-1 text-[11px] text-rose-700">
                Hospital logins must end with {HOSPITAL_EMAIL_DOMAIN}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Password</label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full pl-9 pr-9 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {authError && (
            <div className="px-3.5 py-2.5 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-800 space-y-1.5">
              <div>{authError}</div>
              {needsEmailPasswordSetup && (
                <div className="text-[11px] text-rose-900 pt-1 border-t border-rose-200/80 leading-relaxed">
                  <strong>Admin Setup Step:</strong> Open Firebase Console for project{' '}
                  <span className="font-mono">{firebaseConfig.projectId}</span> &rarr;{' '}
                  <strong>Authentication &rarr; Sign-in method &rarr; Add new provider &rarr; Email/Password</strong>{' '}
                  and enable it, then click Sign In again.
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={signingIn || hasInvalidDomain}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-60 rounded-lg transition-colors cursor-pointer shadow-sm"
          >
            {signingIn ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="relative flex items-center py-1">
          <div className="flex-grow border-t border-slate-200" />
          <span className="shrink mx-3 text-[11px] text-slate-400 uppercase tracking-wider">
            Or Hospital Google SSO
          </span>
          <div className="flex-grow border-t border-slate-200" />
        </div>

        <button
          type="button"
          disabled={signingIn}
          onClick={() => void signInWithGoogle()}
          className="w-full inline-flex items-center justify-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
            />
          </svg>
          Continue with Google ({HOSPITAL_EMAIL_DOMAIN})
        </button>
      </div>
    </div>
  );
}
