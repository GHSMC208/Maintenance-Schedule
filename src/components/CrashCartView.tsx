import { CheckCircle2, Eye, FileEdit, Lock, Plus, Printer, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { CrashCartChecklist, CrashCartItemRow } from '../types/ward';
import {
  addDaysIso,
  getCrashCartSlotExpirySeverity,
  getTodayIso,
  parseCrashCartReferenceDate,
} from '../utils/dateUtils';
import { CrashCartPrintView } from './CrashCartPrintView';

interface CrashCartViewProps {
  carts: CrashCartChecklist[];
  defaultInspector: string;
  onUpdateCart: (cartId: string, patch: Partial<CrashCartChecklist>) => void;
  onUpdateSlot: (cartId: string, itemId: string, slotIdx: number, value: string) => void;
  onAddCart: (defibLabel: string) => string;
}

const SECTION_META: { id: CrashCartItemRow['sectionId'] | 'all' | 'signoffs'; label: string }[] = [
  { id: 'all', label: 'All Sections' },
  { id: 'top-shelf', label: 'Top Shelf (Defib)' },
  { id: 'drawer-1', label: '1st Drawer (Core)' },
  { id: 'drawer-2', label: '2nd Drawer (Addtl)' },
  { id: 'cad-cupboard', label: 'CAD Cupboard' },
  { id: 'fridge', label: 'In Fridge' },
  { id: 'drawer-3', label: '3rd Drawer (Airway)' },
  { id: 'drawer-4-p1', label: '4th Drawer (1–19)' },
  { id: 'drawer-4-p2', label: '4th Drawer (20–29)' },
  { id: 'treatment-room', label: 'Treatment Room' },
  { id: 'emergency-c', label: 'Emergency C-Sec' },
  { id: 'side-cart', label: 'Side of Cart' },
  { id: 'signoffs', label: 'Comments & Sign-Offs' },
];

function formatSlashDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d} / ${m} / ${y}`;
}

export function CrashCartView({
  carts,
  defaultInspector,
  onUpdateCart,
  onUpdateSlot,
  onAddCart,
}: CrashCartViewProps) {
  const [selectedCartId, setSelectedCartId] = useState<string>(carts[0]?.id || '');
  const [viewMode, setViewMode] = useState<'editor' | 'print-preview'>('editor');
  const [sectionFilter, setSectionFilter] = useState<string>('all');
  const [onlyNearExpiry, setOnlyNearExpiry] = useState(false);
  const [search, setSearch] = useState('');
  const [showAddCartModal, setShowAddCartModal] = useState(false);
  const [newDefibLabel, setNewDefibLabel] = useState('');

  const activeCart = useMemo(
    () => carts.find((c) => c.id === selectedCartId) || carts[0],
    [carts, selectedCartId]
  );

  const refDate = useMemo(
    () => (activeCart ? parseCrashCartReferenceDate(activeCart.checkDate) : getTodayIso()),
    [activeCart]
  );

  const expiryStats = useMemo(() => {
    if (!activeCart) return { near3m: 0, expired: 0 };
    let near3m = 0;
    let expired = 0;
    for (const item of activeCart.items) {
      for (const slot of item.slots) {
        const sev = getCrashCartSlotExpirySeverity(slot, refDate);
        if (sev === 'expired') expired += 1;
        else if (sev === 'near-3m') near3m += 1;
      }
    }
    return { near3m, expired };
  }, [activeCart, refDate]);

  if (!activeCart) return null;

  const handleCompleteWeeklyNow = () => {
    const todayIso = getTodayIso();
    const nextIso = addDaysIso(todayIso, 7);
    onUpdateCart(activeCart.id, {
      checkDate: formatSlashDate(todayIso),
      nextDueDate: formatSlashDate(nextIso),
      weeklyCheck: true,
      followingUse: false,
      staffNurseName: activeCart.staffNurseName || defaultInspector,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCreateCart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDefibLabel.trim()) return;
    const id = onAddCart(newDefibLabel.trim());
    setSelectedCartId(id);
    setNewDefibLabel('');
    setShowAddCartModal(false);
  };

  const visibleSections = SECTION_META.filter((s) => {
    if (s.id === 'all' || s.id === 'signoffs') return false;
    if (sectionFilter !== 'all' && sectionFilter !== s.id) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Top Toolbar (hidden on print) */}
      <div className="no-print bg-white border border-slate-200 rounded-lg p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {carts.map((cart) => (
                <button
                  key={cart.id}
                  type="button"
                  onClick={() => setSelectedCartId(cart.id)}
                  className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    activeCart.id === cart.id
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {cart.cartTitle} (Defib {cart.defibLabel})
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowAddCartModal(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Cart
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setViewMode('editor')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  viewMode === 'editor'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileEdit className="w-3.5 h-3.5" />
                Edit Weekly Check
              </button>
              <button
                type="button"
                onClick={() => setViewMode('print-preview')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  viewMode === 'print-preview'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Official 4-Page Preview
              </button>
            </div>

            <button
              type="button"
              onClick={handleCompleteWeeklyNow}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Stamp Today (+7d)
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Official Form (4 Pages)
            </button>
          </div>
        </div>

        {/* Cart Metadata Bar */}
        <div className="pt-3 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Check Date (DD / MM / YYYY)
            </label>
            <input
              type="text"
              value={activeCart.checkDate}
              onChange={(e) => onUpdateCart(activeCart.id, { checkDate: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Next Due (DD / MM / YYYY)
            </label>
            <input
              type="text"
              value={activeCart.nextDueDate}
              onChange={(e) => onUpdateCart(activeCart.id, { nextDueDate: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Defib Label
            </label>
            <input
              type="text"
              value={activeCart.defibLabel}
              onChange={(e) => onUpdateCart(activeCart.id, { defibLabel: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              <span className="inline-flex items-center gap-1">
                <Lock className="w-3 h-3" /> Lock Number
              </span>
            </label>
            <input
              type="text"
              value={activeCart.lockNumber}
              onChange={(e) => onUpdateCart(activeCart.id, { lockNumber: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 pb-1 text-xs">
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={activeCart.weeklyCheck}
                onChange={(e) => onUpdateCart(activeCart.id, { weeklyCheck: e.target.checked })}
                className="rounded border-slate-300 text-teal-700 focus:ring-teal-700"
              />
              <span>Weekly Check</span>
            </label>
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={activeCart.followingUse}
                onChange={(e) => onUpdateCart(activeCart.id, { followingUse: e.target.checked })}
                className="rounded border-slate-300 text-teal-700 focus:ring-teal-700"
              />
              <span>Following Use</span>
            </label>
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={activeCart.lockNotIntact}
                onChange={(e) => onUpdateCart(activeCart.id, { lockNotIntact: e.target.checked })}
                className="rounded border-slate-300 text-rose-700 focus:ring-rose-700"
              />
              <span className={activeCart.lockNotIntact ? 'text-rose-700 font-medium' : ''}>
                Lock Not Intact
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Interactive Editor View */}
      {viewMode === 'editor' && (
        <div className="no-print space-y-5">
          {/* Section Tabs & Search */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
              {SECTION_META.map((sec) => (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setSectionFilter(sec.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    sectionFilter === sec.id
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {sec.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setOnlyNearExpiry((v) => !v)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  onlyNearExpiry
                    ? 'bg-amber-100 border-amber-400 text-amber-950'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Near Expiry &le; 3m ({expiryStats.near3m + expiryStats.expired})
              </button>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search cart items or expiry..."
                  className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md w-56 focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>
            </div>
          </div>

          {/* Item Sections */}
          {sectionFilter !== 'signoffs' &&
            visibleSections.map((sec) => {
              const secItems = activeCart.items.filter((it) => {
                if (it.sectionId !== sec.id) return false;
                if (onlyNearExpiry) {
                  const hasAlert = it.slots.some(
                    (s) => getCrashCartSlotExpirySeverity(s, refDate) !== 'ok'
                  );
                  if (!hasAlert) return false;
                }
                if (search.trim()) {
                  const q = search.toLowerCase();
                  const hay = `${it.name} ${it.quantity} ${it.slots.join(' ')}`.toLowerCase();
                  if (!hay.includes(q)) return false;
                }
                return true;
              });
              if (secItems.length === 0) return null;

              return (
                <section key={sec.id} className="bg-white border border-slate-200 rounded-lg">
                  <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900">{sec.label}</h3>
                    <span className="text-xs text-slate-500 font-mono tabular-nums">
                      {secItems.length} items
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-medium text-slate-500">
                          <th className="py-2 px-3 w-12">No</th>
                          <th className="py-2 px-3">Item / Medication Name</th>
                          <th className="py-2 px-3 w-32">Quantity</th>
                          <th className="py-2 px-3 min-w-[340px]">Expiry Date Slots (Editable)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-xs">
                        {secItems.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/60">
                            <td className="py-2.5 px-3 font-mono text-slate-500 align-top">
                              {item.no}
                            </td>
                            <td className="py-2.5 px-3 text-slate-900 font-medium align-top">
                              {item.name}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-700 align-top whitespace-nowrap">
                              {item.quantity || '—'}
                            </td>
                            <td className="py-2 px-3 align-top">
                              <div
                                className={`grid gap-1.5 ${
                                  item.slots.length === 1
                                    ? 'grid-cols-1 max-w-xs'
                                    : item.slots.length === 2
                                      ? 'grid-cols-2'
                                      : item.slots.length === 4
                                        ? 'grid-cols-2'
                                        : 'grid-cols-3'
                                }`}
                              >
                                {item.slots.map((val, idx) => {
                                  const sev = getCrashCartSlotExpirySeverity(val, refDate);
                                  const slotClass =
                                    sev === 'expired'
                                      ? 'bg-rose-100 border-rose-400 text-rose-900 font-semibold'
                                      : sev === 'near-3m'
                                        ? 'bg-amber-100 border-amber-400 text-amber-950 font-semibold'
                                        : 'bg-white border-slate-200';
                                  return (
                                    <input
                                      key={`${item.id}-${idx}`}
                                      type="text"
                                      value={val}
                                      onChange={(e) =>
                                        onUpdateSlot(activeCart.id, item.id, idx, e.target.value)
                                      }
                                      placeholder={`Slot ${idx + 1}`}
                                      className={`px-2 py-1 text-xs font-mono border rounded focus:outline-none focus:ring-2 focus:ring-teal-700 ${slotClass}`}
                                    />
                                  );
                                })}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              );
            })}

          {/* Comments & Sign-Offs Editor (Page 3 & Page 4 fields) */}
          {(sectionFilter === 'all' || sectionFilter === 'signoffs') && (
            <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Ward Sign-Offs, Comments &amp; Periodic Reviews (Pages 3 &amp; 4)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  All comments and names print directly into the official Appendix 2 sign-off tables.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Staff Nurse Comments
                  </label>
                  <textarea
                    rows={3}
                    value={activeCart.staffNurseComment}
                    onChange={(e) =>
                      onUpdateCart(activeCart.id, { staffNurseComment: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Staff Nurse Name &amp; Signature
                  </label>
                  <input
                    type="text"
                    value={activeCart.staffNurseName}
                    onChange={(e) =>
                      onUpdateCart(activeCart.id, { staffNurseName: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>

                <div className="lg:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Nurse Supervisor Comments
                  </label>
                  <textarea
                    rows={2}
                    value={activeCart.supervisorComment}
                    onChange={(e) =>
                      onUpdateCart(activeCart.id, { supervisorComment: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Nurse Supervisor Name &amp; Signature
                  </label>
                  <input
                    type="text"
                    value={activeCart.supervisorName}
                    onChange={(e) =>
                      onUpdateCart(activeCart.id, { supervisorName: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>

                <div className="lg:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Head Nurse Comments
                  </label>
                  <textarea
                    rows={2}
                    value={activeCart.headNurseComment}
                    onChange={(e) =>
                      onUpdateCart(activeCart.id, { headNurseComment: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Head Nurse Name &amp; Signature
                  </label>
                  <input
                    type="text"
                    value={activeCart.headNurseName}
                    onChange={(e) =>
                      onUpdateCart(activeCart.id, { headNurseName: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Staff Comments Continued (Bottom of Page 3)
                </label>
                <textarea
                  rows={2}
                  value={activeCart.staffCommentsContinued}
                  onChange={(e) =>
                    onUpdateCart(activeCart.id, { staffCommentsContinued: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <hr className="border-slate-200" />

              {/* Page 4 Sign-offs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-800">
                    Pharmacist (Monthly Check)
                  </div>
                  <input
                    type="text"
                    placeholder="Pharmacist name"
                    value={activeCart.pharmacistName}
                    onChange={(e) =>
                      onUpdateCart(activeCart.id, { pharmacistName: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md"
                  />
                  <input
                    type="text"
                    placeholder="Signature"
                    value={activeCart.pharmacistSignature}
                    onChange={(e) =>
                      onUpdateCart(activeCart.id, { pharmacistSignature: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md"
                  />
                  <input
                    type="text"
                    placeholder="Date (DD / MM / YYYY)"
                    value={activeCart.pharmacistDate}
                    onChange={(e) =>
                      onUpdateCart(activeCart.id, { pharmacistDate: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-200 rounded-md"
                  />
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-800">
                    Medical Equipment Staff (Twice/yr)
                  </div>
                  <input
                    type="text"
                    placeholder="Staff name"
                    value={activeCart.biomedName}
                    onChange={(e) => onUpdateCart(activeCart.id, { biomedName: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md"
                  />
                  <input
                    type="text"
                    placeholder="Signature"
                    value={activeCart.biomedSignature}
                    onChange={(e) =>
                      onUpdateCart(activeCart.id, { biomedSignature: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md"
                  />
                  <input
                    type="text"
                    placeholder="Date (DD / MM / YYYY)"
                    value={activeCart.biomedDate}
                    onChange={(e) => onUpdateCart(activeCart.id, { biomedDate: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-200 rounded-md"
                  />
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-800">
                    Quality Mgmt Nursing (Twice/yr)
                  </div>
                  <input
                    type="text"
                    placeholder="Staff name"
                    value={activeCart.qualityNurseName}
                    onChange={(e) =>
                      onUpdateCart(activeCart.id, { qualityNurseName: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md"
                  />
                  <input
                    type="text"
                    placeholder="Signature"
                    value={activeCart.qualityNurseSignature}
                    onChange={(e) =>
                      onUpdateCart(activeCart.id, { qualityNurseSignature: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md"
                  />
                  <input
                    type="text"
                    placeholder="Date (DD / MM / YYYY)"
                    value={activeCart.qualityNurseDate}
                    onChange={(e) =>
                      onUpdateCart(activeCart.id, { qualityNurseDate: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-200 rounded-md"
                  />
                </div>
              </div>
            </section>
          )}
        </div>
      )}

      {/* Official 4-Page Print Preview (and always active when printing via print-only-block) */}
      <div className={viewMode === 'print-preview' ? 'block' : 'hidden print-only-block'}>
        <CrashCartPrintView cart={activeCart} />
      </div>

      {/* Add Crash Cart Modal */}
      {showAddCartModal && (
        <div className="no-print fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-lg w-full max-w-sm shadow-lg">
            <div className="px-5 py-4 border-b border-slate-200">
              <h3 className="text-base font-semibold text-slate-900">Add New Crash Cart</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Creates a blank Appendix 2 checklist for an additional defibrillator cart
              </p>
            </div>
            <form onSubmit={handleCreateCart} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Defib / Cart Identifier
                </label>
                <input
                  type="text"
                  required
                  value={newDefibLabel}
                  onChange={(e) => setNewDefibLabel(e.target.value)}
                  placeholder="e.g., D or CCU-2"
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddCartModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-md cursor-pointer"
                >
                  Create Cart
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
