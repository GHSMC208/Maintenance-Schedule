import {
  BriefcaseMedical,
  CalendarCheck,
  ClipboardList,
  Droplets,
  Flame,
  FlaskConical,
  HeartPulse,
  Package,
  Pill,
  Plus,
  ShieldCheck,
  Siren,
  Stethoscope,
  Wind,
  Wrench,
} from 'lucide-react';
import type { CategoryMeta } from '../types/ward';

export type NavSectionId =
  | 'schedule'
  | 'crash-cart'
  | 'pharmacy-forms'
  | 'environmental'
  | 'oxygen'
  | 'maintenance'
  | `inv:${string}`;

interface SidebarProps {
  activeNav: NavSectionId;
  onSelectNav: (nav: NavSectionId) => void;
  wardName: string;
  categories: CategoryMeta[];
  overdueTaskCount: number;
  crashCartCount: number;
  categoryAlertCounts: Record<string, number>;
  envAlertCount: number;
  oxygenAlertCount: number;
  openTicketCount: number;
  onOpenNewCategory: () => void;
}

function getCategoryIcon(id: string) {
  switch (id) {
    case 'equipment':
      return Stethoscope;
    case 'store':
      return Package;
    case 'prep-room':
      return FlaskConical;
    case 'blood-trolley':
      return Droplets;
    case 'procedure-trolley':
      return BriefcaseMedical;
    case 'iv-meds':
      return Pill;
    case 'transfer-bag':
      return Siren;
    default:
      return ShieldCheck;
  }
}

export function Sidebar({
  activeNav,
  onSelectNav,
  wardName,
  categories,
  overdueTaskCount,
  crashCartCount,
  categoryAlertCounts,
  envAlertCount,
  oxygenAlertCount,
  openTicketCount,
  onOpenNewCategory,
}: SidebarProps) {
  return (
    <aside className="w-[268px] shrink-0 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0 select-none">
      {/* Brand Header */}
      <div className="px-5 py-4 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-teal-700 text-white flex items-center justify-center shrink-0">
            <CalendarCheck className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-[15px] tracking-tight text-slate-900 whitespace-nowrap truncate">
              WardCare Schedule
            </div>
            <div className="text-xs text-slate-500 truncate">{wardName}</div>
          </div>
        </div>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6" aria-label="Ward Modules">
        {/* Core Schedule & Rounds */}
        <div>
          <div className="px-2.5 pb-1.5 text-[11px] font-medium tracking-wide text-slate-500">
            Ward Operations
          </div>
          <div className="space-y-0.5">
            <button
              type="button"
              onClick={() => onSelectNav('schedule')}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-sm transition-colors cursor-pointer ${
                activeNav === 'schedule'
                  ? 'bg-teal-50 text-teal-800 font-medium'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <CalendarCheck className="w-4 h-4 shrink-0" />
                <span className="truncate">Weekly &amp; Monthly Tasks</span>
              </span>
              {overdueTaskCount > 0 && (
                <span className="font-mono tabular-nums text-xs font-semibold text-rose-700 shrink-0 ml-2">
                  {overdueTaskCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => onSelectNav('crash-cart')}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-sm transition-colors cursor-pointer ${
                activeNav === 'crash-cart'
                  ? 'bg-teal-50 text-teal-800 font-medium'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <HeartPulse className="w-4 h-4 shrink-0" />
                <span className="truncate">Crash Cart Weekly</span>
              </span>
              <span className="font-mono tabular-nums text-xs text-slate-500 shrink-0 ml-2">
                {crashCartCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onSelectNav('pharmacy-forms')}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-sm transition-colors cursor-pointer ${
                activeNav === 'pharmacy-forms'
                  ? 'bg-teal-50 text-teal-800 font-medium'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <ClipboardList className="w-4 h-4 shrink-0" />
                <span className="truncate">Pharmacy Forms</span>
              </span>
              <span className="font-mono tabular-nums text-xs text-slate-500 shrink-0 ml-2">
                6
              </span>
            </button>

            <button
              type="button"
              onClick={() => onSelectNav('environmental')}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-sm transition-colors cursor-pointer ${
                activeNav === 'environmental'
                  ? 'bg-teal-50 text-teal-800 font-medium'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <Flame className="w-4 h-4 shrink-0" />
                <span className="truncate">Environmental &amp; Fire</span>
              </span>
              {envAlertCount > 0 && (
                <span className="font-mono tabular-nums text-xs font-semibold text-amber-700 shrink-0 ml-2">
                  {envAlertCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => onSelectNav('oxygen')}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-sm transition-colors cursor-pointer ${
                activeNav === 'oxygen'
                  ? 'bg-teal-50 text-teal-800 font-medium'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <Wind className="w-4 h-4 shrink-0" />
                <span className="truncate">Oxygen Cylinders</span>
              </span>
              {oxygenAlertCount > 0 && (
                <span className="font-mono tabular-nums text-xs font-semibold text-rose-700 shrink-0 ml-2">
                  {oxygenAlertCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => onSelectNav('maintenance')}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-sm transition-colors cursor-pointer ${
                activeNav === 'maintenance'
                  ? 'bg-teal-50 text-teal-800 font-medium'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <Wrench className="w-4 h-4 shrink-0" />
                <span className="truncate">Maintenance Follow-Up</span>
              </span>
              {openTicketCount > 0 && (
                <span className="font-mono tabular-nums text-xs font-semibold text-amber-700 shrink-0 ml-2">
                  {openTicketCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Inventory & Expiry Categories */}
        <div>
          <div className="px-2.5 pb-1.5 flex items-center justify-between">
            <span className="text-[11px] font-medium tracking-wide text-slate-500">
              Inventory &amp; Expiry
            </span>
            <button
              type="button"
              onClick={onOpenNewCategory}
              title="Add custom inventory area"
              className="text-slate-500 hover:text-teal-700 p-0.5 rounded transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-0.5">
            {categories.map((cat) => {
              const Icon = getCategoryIcon(cat.id);
              const navKey: NavSectionId = `inv:${cat.id}`;
              const alertCount = categoryAlertCounts[cat.id] || 0;
              const active = activeNav === navKey;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onSelectNav(navKey)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-sm transition-colors cursor-pointer ${
                    active
                      ? 'bg-teal-50 text-teal-800 font-medium'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{cat.shortLabel}</span>
                  </span>
                  {alertCount > 0 && (
                    <span className="font-mono tabular-nums text-xs font-semibold text-rose-700 shrink-0 ml-2">
                      {alertCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Quiet Inspector Footer */}
      <div className="px-4 py-3 border-t border-slate-200 text-xs text-slate-500">
        <div>Local PC Storage Active</div>
        <div className="text-slate-400 mt-0.5">Auto-saved on every check</div>
      </div>
    </aside>
  );
}
