import {
  AlertTriangle,
  CheckCircle2,
  Edit3,
  Eye,
  FileEdit,
  Minus,
  Plus,
  Printer,
  Search,
  Trash2,
  XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type {
  CategoryMeta,
  EquipmentStatus,
  InventoryItem,
  TransferBagChecklistMeta,
} from '../types/ward';
import {
  daysBetween,
  formatShortDate,
  getExpiryStatus,
  getTodayIso,
  isItemAttentionNeeded,
} from '../utils/dateUtils';
import { EmergencyBagPrintView } from './EmergencyBagPrintView';

interface InventoryModuleViewProps {
  category: CategoryMeta;
  items: InventoryItem[];
  defaultInspector: string;
  transferBagMeta?: TransferBagChecklistMeta;
  onUpdateTransferBagMeta?: (patch: Partial<TransferBagChecklistMeta>) => void;
  onAddItem: (item: Omit<InventoryItem, 'id'>) => void;
  onUpdateItem: (itemId: string, patch: Partial<InventoryItem>) => void;
  onDeleteItem: (itemId: string) => void;
  onVerifyItem: (itemId: string, inspector: string) => void;
}

export function InventoryModuleView({
  category,
  items,
  defaultInspector,
  transferBagMeta,
  onUpdateTransferBagMeta,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onVerifyItem,
}: InventoryModuleViewProps) {
  const today = getTodayIso();
  const isTransferBag = category.id === 'transfer-bag';
  const [viewMode, setViewMode] = useState<'editor' | 'print-preview'>('editor');
  const [unitFilter, setUnitFilter] = useState<'All' | 'CCU' | 'SD' | 'General Ward'>('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'attention'>('all');
  const [search, setSearch] = useState('');

  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state for add / edit
  const [formName, setFormName] = useState('');
  const [formUnit, setFormUnit] = useState<'CCU' | 'SD' | 'General Ward'>('CCU');
  const [formLocation, setFormLocation] = useState('');
  const [formQty, setFormQty] = useState(1);
  const [formPar, setFormPar] = useState(1);
  const [formUom, setFormUom] = useState(category.isEquipment ? 'unit' : 'pcs');
  const [formBatch, setFormBatch] = useState('');
  const [formExpiry, setFormExpiry] = useState('');
  const [formEqStatus, setFormEqStatus] = useState<EquipmentStatus>('Operational');
  const [formNextPm, setFormNextPm] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const categoryItems = useMemo(
    () => items.filter((it) => it.categoryId === category.id),
    [items, category.id]
  );

  const summary = useMemo(() => {
    let expired = 0;
    let expiringSoon = 0;
    let lowStockOrFault = 0;

    for (const it of categoryItems) {
      const exp = getExpiryStatus(it.expiryDate, today);
      if (exp.state === 'expired') expired += 1;
      else if (exp.state === 'expiring-soon') expiringSoon += 1;

      if (category.isEquipment) {
        if (it.equipmentStatus && it.equipmentStatus !== 'Operational') lowStockOrFault += 1;
        else if (it.nextPmDate && daysBetween(today, it.nextPmDate) <= 14) lowStockOrFault += 1;
      } else if (it.quantity < it.parLevel) {
        lowStockOrFault += 1;
      }
    }
    return {
      total: categoryItems.length,
      expired,
      expiringSoon,
      lowStockOrFault,
    };
  }, [categoryItems, category.isEquipment, today]);

  const filteredItems = useMemo(() => {
    return categoryItems.filter((it) => {
      if (unitFilter !== 'All' && it.unit !== unitFilter) return false;
      if (statusFilter === 'attention' && !isItemAttentionNeeded(it, today)) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = `${it.name} ${it.locationDetail} ${it.batchOrSerial} ${it.notes}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [categoryItems, unitFilter, statusFilter, search, today]);

  const openAdd = () => {
    setEditingItem(null);
    setFormName('');
    setFormUnit('CCU');
    setFormLocation('');
    setFormQty(category.isEquipment ? 1 : 10);
    setFormPar(category.isEquipment ? 1 : 10);
    setFormUom(category.isEquipment ? 'unit' : 'pcs');
    setFormBatch('');
    setFormExpiry('');
    setFormEqStatus('Operational');
    setFormNextPm('');
    setFormNotes('');
    setShowAddModal(true);
  };

  const openEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormUnit(item.unit);
    setFormLocation(item.locationDetail);
    setFormQty(item.quantity);
    setFormPar(item.parLevel);
    setFormUom(item.unitOfMeasure);
    setFormBatch(item.batchOrSerial);
    setFormExpiry(item.expiryDate || '');
    setFormEqStatus(item.equipmentStatus || 'Operational');
    setFormNextPm(item.nextPmDate || '');
    setFormNotes(item.notes);
    setShowAddModal(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const payload: Omit<InventoryItem, 'id'> = {
      categoryId: category.id,
      name: formName.trim(),
      unit: formUnit,
      locationDetail: formLocation.trim() || category.shortLabel,
      quantity: Math.max(0, Number(formQty) || 0),
      parLevel: Math.max(0, Number(formPar) || 0),
      unitOfMeasure: formUom.trim() || 'pcs',
      batchOrSerial: formBatch.trim() || '—',
      expiryDate: formExpiry ? formExpiry : null,
      equipmentStatus: category.isEquipment ? formEqStatus : undefined,
      nextPmDate: category.isEquipment ? formNextPm || null : undefined,
      lastCheckedDate: today,
      lastCheckedBy: defaultInspector,
      notes: formNotes.trim(),
    };

    if (editingItem) {
      onUpdateItem(editingItem.id, payload);
    } else {
      onAddItem(payload);
    }
    setShowAddModal(false);
  };

  return (
    <div className="space-y-5">
      {/* Section Header & Summary Strip */}
      <div className="no-print bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{category.label}</h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">{category.description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-right">
            <div>
              <div className="text-[11px] font-medium text-slate-500">Tracked Items</div>
              <div className="text-xl font-semibold font-mono tabular-nums text-slate-900">
                {summary.total}
              </div>
            </div>
            {!category.isEquipment && (
              <>
                <div>
                  <div className="text-[11px] font-medium text-slate-500">Expired</div>
                  <div
                    className={`text-xl font-semibold font-mono tabular-nums ${
                      summary.expired > 0 ? 'text-rose-700' : 'text-slate-900'
                    }`}
                  >
                    {summary.expired}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-medium text-slate-500">Expiring &le; 30d</div>
                  <div
                    className={`text-xl font-semibold font-mono tabular-nums ${
                      summary.expiringSoon > 0 ? 'text-amber-700' : 'text-slate-900'
                    }`}
                  >
                    {summary.expiringSoon}
                  </div>
                </div>
              </>
            )}
            <div>
              <div className="text-[11px] font-medium text-slate-500">
                {category.isEquipment ? 'Needs Maintenance / PM' : 'Below Par Stock'}
              </div>
              <div
                className={`text-xl font-semibold font-mono tabular-nums ${
                  summary.lowStockOrFault > 0 ? 'text-amber-700' : 'text-emerald-700'
                }`}
              >
                {summary.lowStockOrFault}
              </div>
            </div>
          </div>
        </div>

        {isTransferBag && (
          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 flex-1 min-w-[320px]">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Ward Number
                </label>
                <input
                  type="text"
                  value={transferBagMeta?.wardNumber || ''}
                  onChange={(e) => onUpdateTransferBagMeta?.({ wardNumber: e.target.value })}
                  placeholder="e.g., 208 / CCU"
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Month</label>
                <input
                  type="text"
                  value={transferBagMeta?.month || ''}
                  onChange={(e) => onUpdateTransferBagMeta?.({ month: e.target.value })}
                  placeholder="e.g., November"
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Year</label>
                <input
                  type="text"
                  value={transferBagMeta?.year || ''}
                  onChange={(e) => onUpdateTransferBagMeta?.({ year: e.target.value })}
                  placeholder="2026"
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Checked By
                </label>
                <input
                  type="text"
                  value={transferBagMeta?.checkedBy || ''}
                  onChange={(e) => onUpdateTransferBagMeta?.({ checkedBy: e.target.value })}
                  placeholder={defaultInspector}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Date</label>
                <input
                  type="text"
                  value={transferBagMeta?.date || ''}
                  onChange={(e) => onUpdateTransferBagMeta?.({ date: e.target.value })}
                  placeholder="DD/MM/YYYY"
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setViewMode('editor')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    viewMode === 'editor'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileEdit className="w-3.5 h-3.5" />
                  Edit List
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('print-preview')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    viewMode === 'print-preview'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  Print Preview
                </button>
              </div>

              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Checklist (A4)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Filter & Inventory Grid */}
      <div
        className={`no-print bg-white border border-slate-200 rounded-lg ${
          isTransferBag && viewMode === 'print-preview' ? 'hidden' : ''
        }`}
      >
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {category.supportsUnitSplit && (
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                {(['All', 'CCU', 'SD', 'General Ward'] as const).map((unit) => (
                  <button
                    key={unit}
                    type="button"
                    onClick={() => setUnitFilter(unit)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      unitFilter === unit
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {unit === 'All' ? 'All Units' : unit}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Show All
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('attention')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  statusFilter === 'attention'
                    ? 'bg-white text-rose-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Alerts Only
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search item, lot or serial..."
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-md w-56 focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            </div>

            <button
              type="button"
              onClick={openAdd}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add {category.isEquipment ? 'Equipment' : 'Item'}
            </button>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="p-12 text-center">
            <h3 className="text-sm font-semibold text-slate-900">No items match current filter</h3>
            <p className="mt-1 text-xs text-slate-500">
              Add an item to this section or clear your unit/status filters.
            </p>
            <button
              type="button"
              onClick={openAdd}
              className="mt-4 px-3.5 py-1.5 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors cursor-pointer"
            >
              Add First Entry
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-medium text-slate-500">
                  <th className="py-2.5 px-4">Item &amp; Location</th>
                  <th className="py-2.5 px-3">Unit</th>
                  <th className="py-2.5 px-3">
                    {category.isEquipment ? 'Serial / Asset ID' : 'Lot / Batch'}
                  </th>
                  <th className="py-2.5 px-3">
                    {category.isEquipment ? 'Status' : 'Stock / Par'}
                  </th>
                  <th className="py-2.5 px-3">
                    {category.isEquipment ? 'Next PM Due' : 'Expiry Date & State'}
                  </th>
                  <th className="py-2.5 px-3">Last Verified</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredItems.map((item) => {
                  const exp = getExpiryStatus(item.expiryDate, today);
                  const isLowStock = !category.isEquipment && item.quantity < item.parLevel;
                  const pmDays =
                    category.isEquipment && item.nextPmDate
                      ? daysBetween(today, item.nextPmDate)
                      : null;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 max-w-md">
                        <div className="font-medium text-slate-900">{item.name}</div>
                        <div className="mt-0.5 text-xs text-slate-500 flex flex-wrap items-center gap-1.5">
                          <span>{item.locationDetail}</span>
                          {item.notes && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="truncate max-w-xs" title={item.notes}>
                                {item.notes}
                              </span>
                            </>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap text-xs font-medium text-slate-700">
                        {item.unit}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap font-mono text-xs text-slate-600">
                        {item.batchOrSerial}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        {category.isEquipment ? (
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                              item.equipmentStatus === 'Operational'
                                ? 'text-emerald-700'
                                : item.equipmentStatus === 'Needs Calibration'
                                  ? 'text-amber-700'
                                  : 'text-rose-700'
                            }`}
                          >
                            {item.equipmentStatus === 'Operational' ? (
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            ) : item.equipmentStatus === 'Needs Calibration' ? (
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5 shrink-0" />
                            )}
                            {item.equipmentStatus || 'Operational'}
                          </span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              aria-label="Decrease quantity"
                              onClick={() =>
                                onUpdateItem(item.id, { quantity: Math.max(0, item.quantity - 1) })
                              }
                              className="p-1 text-slate-500 hover:text-slate-900 border border-slate-200 rounded hover:bg-slate-100 cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span
                              className={`font-mono tabular-nums text-xs font-semibold min-w-[68px] text-center ${
                                isLowStock ? 'text-amber-700' : 'text-slate-900'
                              }`}
                            >
                              {item.quantity} / {item.parLevel} {item.unitOfMeasure}
                            </span>
                            <button
                              type="button"
                              aria-label="Increase quantity"
                              onClick={() => onUpdateItem(item.id, { quantity: item.quantity + 1 })}
                              className="p-1 text-slate-500 hover:text-slate-900 border border-slate-200 rounded hover:bg-slate-100 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap text-xs">
                        {category.isEquipment ? (
                          <div>
                            <div className="font-mono tabular-nums text-slate-900">
                              {formatShortDate(item.nextPmDate || null)}
                            </div>
                            {pmDays !== null && (
                              <div
                                className={`text-[11px] font-medium tabular-nums ${
                                  pmDays < 0
                                    ? 'text-rose-700'
                                    : pmDays <= 14
                                      ? 'text-amber-700'
                                      : 'text-slate-500'
                                }`}
                              >
                                {pmDays < 0
                                  ? `PM Overdue ${Math.abs(pmDays)}d`
                                  : `PM in ${pmDays}d`}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <div className="font-mono tabular-nums text-slate-900">
                              {formatShortDate(item.expiryDate)}
                            </div>
                            <div
                              className={`text-[11px] font-medium inline-flex items-center gap-1 ${
                                exp.state === 'expired'
                                  ? 'text-rose-700'
                                  : exp.state === 'expiring-soon'
                                    ? 'text-amber-700'
                                    : exp.state === 'valid'
                                      ? 'text-emerald-700'
                                      : 'text-slate-500'
                              }`}
                            >
                              {exp.state === 'expired' && <XCircle className="w-3 h-3" />}
                              {exp.state === 'expiring-soon' && (
                                <AlertTriangle className="w-3 h-3" />
                              )}
                              {exp.state === 'valid' && <CheckCircle2 className="w-3 h-3" />}
                              <span className="tabular-nums">{exp.label}</span>
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap text-xs text-slate-600">
                        <div className="font-mono tabular-nums">
                          {formatShortDate(item.lastCheckedDate)}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[130px]">
                          {item.lastCheckedBy}
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onVerifyItem(item.id, defaultInspector)}
                            className="px-2.5 py-1 text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 rounded transition-colors cursor-pointer"
                          >
                            Verify
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(item)}
                            title="Edit item"
                            className="p-1.5 text-slate-400 hover:text-slate-800 rounded transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteItem(item.id)}
                            title="Delete item"
                            className="p-1.5 text-slate-400 hover:text-rose-700 rounded transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Official Emergency Bag Checklist Printable Form */}
      {isTransferBag && (
        <div
          className={
            viewMode === 'print-preview'
              ? 'block overflow-x-auto pb-4'
              : 'hidden print-only-block'
          }
        >
          <EmergencyBagPrintView
            items={categoryItems}
            meta={transferBagMeta}
            defaultInspector={defaultInspector}
          />
        </div>
      )}

      {/* Add / Edit Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-lg w-full max-w-lg shadow-lg">
            <div className="px-5 py-4 border-b border-slate-200">
              <h3 className="text-base font-semibold text-slate-900">
                {editingItem ? 'Edit Entry' : `Add ${category.shortLabel} Entry`}
              </h3>
            </div>
            <form onSubmit={handleSaveForm} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {category.isEquipment ? 'Equipment Name & Model' : 'Item / Medication Name'}
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Ward Unit</label>
                  <select
                    value={formUnit}
                    onChange={(e) =>
                      setFormUnit(e.target.value as 'CCU' | 'SD' | 'General Ward')
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  >
                    <option value="CCU">CCU</option>
                    <option value="SD">SD</option>
                    <option value="General Ward">General Ward</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Specific Location / Drawer
                  </label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="e.g., Drawer 2 / Shelf A"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
              </div>

              {category.isEquipment ? (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Serial / Asset ID
                    </label>
                    <input
                      type="text"
                      value={formBatch}
                      onChange={(e) => setFormBatch(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
                    <select
                      value={formEqStatus}
                      onChange={(e) => setFormEqStatus(e.target.value as EquipmentStatus)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                    >
                      <option value="Operational">Operational</option>
                      <option value="Needs Calibration">Needs Calibration</option>
                      <option value="Under Maintenance">Under Maintenance</option>
                      <option value="Out of Service">Out of Service</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Next PM Date
                    </label>
                    <input
                      type="date"
                      value={formNextPm}
                      onChange={(e) => setFormNextPm(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={formQty}
                        onChange={(e) => setFormQty(Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Par Level
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={formPar}
                        onChange={(e) => setFormPar(Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Unit</label>
                      <input
                        type="text"
                        value={formUom}
                        onChange={(e) => setFormUom(e.target.value)}
                        placeholder="pcs / vials / packs"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Lot / Batch / Seal #
                      </label>
                      <input
                        type="text"
                        value={formBatch}
                        onChange={(e) => setFormBatch(e.target.value)}
                        className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Expiry Date
                      </label>
                      <input
                        type="date"
                        value={formExpiry}
                        onChange={(e) => setFormExpiry(e.target.value)}
                        className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors cursor-pointer"
                >
                  {editingItem ? 'Save Changes' : 'Add Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
