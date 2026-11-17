import { Eye } from 'lucide-react';
import type { ReactNode } from 'react';
import type { PermissionLevel } from '../types/auth';

interface ReadOnlyBannerProps {
  permission: PermissionLevel;
  sectionLabel?: string;
}

export function ReadOnlyBanner({ permission, sectionLabel }: ReadOnlyBannerProps) {
  if (permission !== 'view') return null;
  return (
    <div className="no-print flex items-center justify-between gap-3 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
      <div className="flex items-center gap-2">
        <Eye className="w-4 h-4 text-amber-700 shrink-0" />
        <span>
          <strong>View-Only Access{sectionLabel ? ` (${sectionLabel})` : ''}:</strong> You can
          browse records and print A4 reports, but editing and deleting are restricted by Admin.
        </span>
      </div>
    </div>
  );
}

interface ReadOnlySurfaceProps {
  readOnly: boolean;
  children: ReactNode;
}

export function ReadOnlySurface({ readOnly, children }: ReadOnlySurfaceProps) {
  if (!readOnly) return <>{children}</>;
  return (
    <div
      className="rbac-view-only"
      onChangeCapture={(e) => e.stopPropagation()}
      onInputCapture={(e) => e.stopPropagation()}
      onSubmitCapture={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {children}
    </div>
  );
}
