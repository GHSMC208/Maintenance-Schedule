import { AlertTriangle, LogOut, RefreshCw } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { firebaseConfig } from '../firebase';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
  isQuotaError: boolean;
  upgradeUrl: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    message: '',
    isQuotaError: false,
    upgradeUrl: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    let message = error.message || 'An unexpected application error occurred.';
    let isQuotaError = false;
    let upgradeUrl: string | null = null;

    try {
      const parsed = JSON.parse(message) as { error?: string; operationType?: string; path?: string };
      if (parsed && parsed.error) {
        message = parsed.error;
        if (parsed.path) {
          message += ` (${parsed.operationType || 'operation'} on ${parsed.path})`;
        }
      }
    } catch {
      // Plain error message
    }

    if (message.includes('Quota exceeded')) {
      isQuotaError = true;
      if (message.includes('Free daily read units per project')) {
        upgradeUrl = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/databases/${firebaseConfig.firestoreDatabaseId}/data?openUpgradeDialog=true`;
      }
    }

    return {
      hasError: true,
      message,
      isQuotaError,
      upgradeUrl,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('WardCare ErrorBoundary caught:', error, errorInfo);
  }

  public render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {this.state.isQuotaError
                  ? 'Daily Database Quota Reached'
                  : 'Access or Data Sync Error'}
              </h2>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {this.state.isQuotaError
                  ? 'The free daily Firestore quota has been exceeded. Quota resets tomorrow, or your project administrator can upgrade the database plan.'
                  : 'WardCare Schedule encountered a database permission or synchronization error.'}
              </p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-md p-3 text-xs font-mono text-slate-700 break-words">
            {this.state.message}
          </div>

          {this.state.upgradeUrl && (
            <a
              href={this.state.upgradeUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-xs font-medium text-teal-700 underline"
            >
              Open Firestore Quota &amp; Upgrade Console
            </a>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-md cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reload Application
            </button>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, message: '' });
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-md cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Dismiss
            </button>
          </div>
        </div>
      </div>
    );
  }
}
