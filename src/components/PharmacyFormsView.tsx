import { Eye, FileEdit, Printer, RotateCcw, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { createInitialPharmacyForms } from '../data/pharmacyFormsSeed';
import type {
  CadChecklistForm,
  InventoryItem,
  MonthlyStoreChecklistForm,
  PharmacyFormsState,
  WeeklyStockChecklistForm,
  WeeklyStockFormId,
} from '../types/ward';
import { getCrashCartSlotExpirySeverity, getExpiryStatus, getTodayIso } from '../utils/dateUtils';
import {
  CadPrintPage,
  MonthlyStorePrintPage,
  WeeklyStockPrintPage,
} from './PharmacyFormsPrintView';

type ActivePharmacyFormId = 'cad' | WeeklyStockFormId | 'monthly-store';

interface PharmacyFormsViewProps {
  forms: PharmacyFormsState;
  inventory: InventoryItem[];
  wardName: string;
  defaultInspector: string;
  onUpdateCad: (patch: Partial<CadChecklistForm>) => void;
  onUpdateWeeklyForm: (
    formId: WeeklyStockFormId,
    patch: Partial<WeeklyStockChecklistForm>
  ) => void;
  onUpdateMonthlyStore: (patch: Partial<MonthlyStoreChecklistForm>) => void;
}

const FORM_TABS: { id: ActivePharmacyFormId; label: string; orientation: 'Landscape' | 'Portrait'; code: string }[] = [
  { id: 'cad', label: 'CAD Checklist', orientation: 'Landscape', code: 'GH/NUR/2025-15' },
  { id: 'high-alert', label: 'High-Alert Meds', orientation: 'Landscape', code: 'GH/NUR/2025-16' },
  { id: 'near-expiry', label: 'Near Expiry', orientation: 'Landscape', code: 'GH/NUR/2025-18' },
  { id: 'refrigerator', label: 'Refrigerator Stock', orientation: 'Landscape', code: 'GH/NUR/2025-17' },
  { id: 'stock-meds', label: 'Medication Stock', orientation: 'Landscape', code: 'GH/NUR/2025-18' },
  { id: 'monthly-store', label: 'Monthly Store', orientation: 'Portrait', code: 'GH/NUR/2025-19' },
];

export function PharmacyFormsView({
  forms,
  inventory,
  wardName,
  defaultInspector,
  onUpdateCad,
  onUpdateWeeklyForm,
  onUpdateMonthlyStore,
}: PharmacyFormsViewProps) {
  const [activeForm, setActiveForm] = useState<ActivePharmacyFormId>('cad');
  const [viewMode, setViewMode] = useState<'editor' | 'print-preview'>('editor');

  const today = getTodayIso();
  const activeTabMeta = FORM_TABS.find((t) => t.id === activeForm)!;
  const isLandscape = activeTabMeta.orientation === 'Landscape';

  const handleAutoPopulateFromInventory = () => {
    const monthStr = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const slashToday = (() => {
      const [y, m, d] = today.split('-');
      return `${d}/${m}/${y}`;
    })();

    if (activeForm === 'monthly-store') {
      const storeItems = inventory.filter((i) => i.categoryId === 'store').slice(0, 17);
      const nextRows = forms.monthlyStore.rows.map((r, idx) => {
        const src = storeItems[idx];
        if (!src) return r;
        const expStr = src.expiryDate
          ? src.expiryDate.split('-').reverse().join('/')
          : '';
        return {
          ...r,
          stockNo: src.batchOrSerial || `${idx + 1}`,
          description: src.name,
          qtyAvailable: `${src.quantity} ${src.unitOfMeasure}`,
          expiryDate1: expStr,
        };
      });
      onUpdateMonthlyStore({
        ward: forms.monthlyStore.ward || wardName,
        monthYear: forms.monthlyStore.monthYear || monthStr,
        staffName: forms.monthlyStore.staffName || defaultInspector,
        date: forms.monthlyStore.date || slashToday,
        rows: nextRows,
      });
      return;
    }

    if (activeForm === 'cad') {
      onUpdateCad({
        unit: forms.cad.unit || wardName,
        month: forms.cad.month || monthStr,
      });
      return;
    }

    // Weekly Stock forms
    const wf = forms.weeklyForms[activeForm];
    let sourceItems: InventoryItem[] = [];
    if (activeForm === 'near-expiry') {
      sourceItems = inventory.filter((it) => {
        const st = getExpiryStatus(it.expiryDate, today);
        return st.state === 'expired' || st.state === 'expiring-soon';
      });
    } else if (activeForm === 'high-alert') {
      sourceItems = inventory.filter(
        (it) =>
          it.categoryId === 'iv-meds' ||
          it.notes.toLowerCase().includes('high-alert') ||
          it.name.toLowerCase().includes('epinephrine') ||
          it.name.toLowerCase().includes('amiodarone')
      );
    } else if (activeForm === 'refrigerator') {
      sourceItems = inventory.filter(
        (it) =>
          it.locationDetail.toLowerCase().includes('fridge') ||
          it.name.toLowerCase().includes('succinyl') ||
          it.name.toLowerCase().includes('vasopressin') ||
          it.categoryId === 'prep-room'
      );
    } else {
      sourceItems = inventory.filter((it) => it.categoryId === 'iv-meds');
    }

    const picked = sourceItems.slice(0, 12);
    const nextRows = wf.rows.map((r, idx) => {
      const src = picked[idx];
      if (!src) return r;
      const expStr = src.expiryDate ? src.expiryDate.split('-').reverse().join('/') : '';
      const nextChecks = [...r.checks];
      nextChecks[0] = { qty: String(src.quantity), expDate: expStr };
      return {
        ...r,
        slNo: String(idx + 1),
        medicationName: src.name,
        wardQuantity: `${src.parLevel} ${src.unitOfMeasure}`,
        checks: nextChecks,
      };
    });

    const nextDates = [...wf.weekDates];
    if (!nextDates[0]) nextDates[0] = slashToday;

    onUpdateWeeklyForm(activeForm, {
      location: wf.location || wardName,
      month: wf.month || monthStr,
      weekDates: nextDates,
      rows: nextRows,
    });
  };

  const handleClearCurrentForm = () => {
    const fresh = createInitialPharmacyForms();
    if (activeForm === 'cad') {
      onUpdateCad(fresh.cad);
    } else if (activeForm === 'monthly-store') {
      onUpdateMonthlyStore(fresh.monthlyStore);
    } else {
      onUpdateWeeklyForm(activeForm, fresh.weeklyForms[activeForm]);
    }
  };

  return (
    <div className="space-y-5">
      {/* Dynamic @page orientation override so Landscape forms print Landscape and Portrait forms print Portrait */}
      <style>{`@media print { @page { size: ${isLandscape ? 'A4 landscape' : 'A4 portrait'}; margin: 6mm 7mm; } }`}</style>

      {/* Top Toolbar (hidden when printing) */}
      <div className="no-print bg-white border border-slate-200 rounded-lg p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {FORM_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveForm(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeForm === tab.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
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
                Edit Form
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
                Print Preview
              </button>
            </div>

            <button
              type="button"
              onClick={handleAutoPopulateFromInventory}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Fill From Ward Stock
            </button>

            <button
              type="button"
              onClick={handleClearCurrentForm}
              title="Reset form to blank template"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Clear
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Form ({activeTabMeta.orientation})
            </button>
          </div>
        </div>

        <div className="text-xs text-slate-500 flex items-center gap-2">
          <span className="font-mono">{activeTabMeta.code}</span>
          <span aria-hidden="true">·</span>
          <span>A4 {activeTabMeta.orientation} Official Format</span>
          <span aria-hidden="true">·</span>
          <span>Auto-saved locally</span>
        </div>
      </div>

      {/* ==================== INTERACTIVE EDITOR ==================== */}
      {viewMode === 'editor' && (
        <div className="no-print">
          {activeForm === 'cad' && (
            <CadEditor form={forms.cad} onChange={onUpdateCad} today={today} />
          )}

          {activeForm === 'monthly-store' && (
            <MonthlyStoreEditor
              form={forms.monthlyStore}
              onChange={onUpdateMonthlyStore}
              today={today}
            />
          )}

          {activeForm !== 'cad' && activeForm !== 'monthly-store' && (
            <WeeklyStockEditor
              form={forms.weeklyForms[activeForm]}
              onChange={(patch) => onUpdateWeeklyForm(activeForm, patch)}
              today={today}
            />
          )}
        </div>
      )}

      {/* ==================== OFFICIAL PRINT VIEW ==================== */}
      <div
        className={`${viewMode === 'print-preview' ? 'block overflow-x-auto pb-4' : 'hidden print-only-block'}`}
      >
        {activeForm === 'cad' && <CadPrintPage form={forms.cad} />}
        {activeForm === 'monthly-store' && <MonthlyStorePrintPage form={forms.monthlyStore} />}
        {activeForm !== 'cad' && activeForm !== 'monthly-store' && (
          <WeeklyStockPrintPage form={forms.weeklyForms[activeForm]} />
        )}
      </div>
    </div>
  );
}

/* ---------- CAD CHECKLIST INTERACTIVE EDITOR ---------- */
function CadEditor({
  form,
  onChange,
  today,
}: {
  form: CadChecklistForm;
  onChange: (patch: Partial<CadChecklistForm>) => void;
  today: string;
}) {
  const updateDayDate = (dayIdx: number, val: string) => {
    const next = [...form.dayDates];
    next[dayIdx] = val;
    onChange({ dayDates: next });
  };

  const updateRowField = (
    rowIdx: number,
    field: 'drugName' | 'expiryDate',
    val: string
  ) => {
    const next = form.rows.map((r, i) => (i === rowIdx ? { ...r, [field]: val } : r));
    onChange({ rows: next });
  };

  const updateShiftCell = (rowIdx: number, shiftIdx: number, val: string) => {
    const next = form.rows.map((r, i) => {
      if (i !== rowIdx) return r;
      const shifts = [...r.shifts];
      shifts[shiftIdx] = val;
      return { ...r, shifts };
    });
    onChange({ rows: next });
  };

  const updateTlCell = (
    which: 'currentShiftTl' | 'previousShiftTl',
    idx: number,
    val: string
  ) => {
    const next = [...form[which]];
    next[idx] = val;
    onChange({ [which]: next });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Unit</label>
          <input
            type="text"
            value={form.unit}
            onChange={(e) => onChange({ unit: e.target.value })}
            placeholder="e.g., CCU / SD"
            className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Month</label>
          <input
            type="text"
            value={form.month}
            onChange={(e) => onChange({ month: e.target.value })}
            placeholder="e.g., November 2026"
            className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
          />
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-md">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th rowSpan={2} className="p-2 border-r border-slate-200 min-w-[175px] font-semibold">
                Drug
              </th>
              <th className="p-1.5 border-r border-slate-200 min-w-[100px] text-center font-semibold">
                Date
              </th>
              {form.dayDates.map((d, dIdx) => (
                <th
                  key={`ed-day-${dIdx}`}
                  colSpan={3}
                  className="p-1 border-r border-slate-300 text-center"
                >
                  <input
                    type="text"
                    value={d}
                    onChange={(e) => updateDayDate(dIdx, e.target.value)}
                    placeholder={`Day ${dIdx + 1}`}
                    className="w-full px-1.5 py-0.5 text-[11px] font-mono text-center bg-white border border-slate-200 rounded"
                  />
                </th>
              ))}
            </tr>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-600">
              <th className="p-1.5 border-r border-slate-200 text-center font-semibold">
                Expiry date
              </th>
              {Array.from({ length: 7 }).map((_, dIdx) => (
                <th
                  key={`sh-h-${dIdx}`}
                  colSpan={3}
                  className="p-0 border-r border-slate-300"
                >
                  <div className="grid grid-cols-3 divide-x divide-slate-200 text-center font-semibold py-1">
                    <span>M</span>
                    <span>E</span>
                    <span>N</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {form.rows.map((row, rIdx) => {
              const sev = getCrashCartSlotExpirySeverity(row.expiryDate, today);
              const expClass =
                sev === 'expired'
                  ? 'bg-rose-100 border-rose-400 text-rose-900 font-semibold'
                  : sev === 'near-3m'
                    ? 'bg-amber-100 border-amber-400 text-amber-950 font-semibold'
                    : 'bg-white border-slate-200';

              return (
                <tr key={row.id} className="hover:bg-slate-50/70">
                  <td className="p-1 border-r border-slate-200">
                    <input
                      type="text"
                      value={row.drugName}
                      onChange={(e) => updateRowField(rIdx, 'drugName', e.target.value)}
                      placeholder="Custom medication..."
                      className="w-full px-2 py-1 text-xs font-medium border border-transparent hover:border-slate-200 focus:border-teal-700 rounded focus:outline-none"
                    />
                  </td>
                  <td className="p-1 border-r border-slate-200">
                    <input
                      type="text"
                      value={row.expiryDate}
                      onChange={(e) => updateRowField(rIdx, 'expiryDate', e.target.value)}
                      placeholder="DD/MM/YYYY"
                      className={`w-full px-1.5 py-1 text-[11px] font-mono text-center border rounded focus:outline-none focus:ring-1 focus:ring-teal-700 ${expClass}`}
                    />
                  </td>
                  {row.shifts.map((val, sIdx) => (
                    <td
                      key={`${row.id}-ed-${sIdx}`}
                      className={`p-0.5 border-r ${
                        (sIdx + 1) % 3 === 0 ? 'border-slate-300' : 'border-slate-200'
                      }`}
                    >
                      <input
                        type="text"
                        value={val}
                        onChange={(e) => updateShiftCell(rIdx, sIdx, e.target.value)}
                        className="w-10 px-1 py-1 text-[11px] font-mono text-center border border-transparent hover:border-slate-200 focus:border-teal-700 rounded focus:outline-none"
                      />
                    </td>
                  ))}
                </tr>
              );
            })}

            {/* Current Shift TL */}
            <tr className="bg-slate-50/70 font-medium">
              <td className="p-2 border-r border-slate-200 text-xs">
                Title &amp; Sign of current shift TL
              </td>
              <td className="p-1 border-r border-slate-200" />
              {form.currentShiftTl.map((val, idx) => (
                <td
                  key={`ctl-ed-${idx}`}
                  className={`p-0.5 border-r ${
                    (idx + 1) % 3 === 0 ? 'border-slate-300' : 'border-slate-200'
                  }`}
                >
                  <input
                    type="text"
                    value={val}
                    onChange={(e) => updateTlCell('currentShiftTl', idx, e.target.value)}
                    className="w-10 px-1 py-1 text-[10px] text-center bg-white border border-slate-200 rounded"
                  />
                </td>
              ))}
            </tr>

            {/* Previous Shift TL */}
            <tr className="bg-slate-50/70 font-medium">
              <td className="p-2 border-r border-slate-200 text-xs">
                Title &amp; Sign of previous shift TL
              </td>
              <td className="p-1 border-r border-slate-200" />
              {form.previousShiftTl.map((val, idx) => (
                <td
                  key={`ptl-ed-${idx}`}
                  className={`p-0.5 border-r ${
                    (idx + 1) % 3 === 0 ? 'border-slate-300' : 'border-slate-200'
                  }`}
                >
                  <input
                    type="text"
                    value={val}
                    onChange={(e) => updateTlCell('previousShiftTl', idx, e.target.value)}
                    className="w-10 px-1 py-1 text-[10px] text-center bg-white border border-slate-200 rounded"
                  />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- WEEKLY STOCK FORMS INTERACTIVE EDITOR ---------- */
function WeeklyStockEditor({
  form,
  onChange,
  today,
}: {
  form: WeeklyStockChecklistForm;
  onChange: (patch: Partial<WeeklyStockChecklistForm>) => void;
  today: string;
}) {
  const updateWeekDate = (wIdx: number, val: string) => {
    const next = [...form.weekDates];
    next[wIdx] = val;
    onChange({ weekDates: next });
  };

  const updateRowBase = (
    rIdx: number,
    field: 'slNo' | 'medicationName' | 'wardQuantity',
    val: string
  ) => {
    const next = form.rows.map((r, i) => (i === rIdx ? { ...r, [field]: val } : r));
    onChange({ rows: next });
  };

  const updateRowCheck = (
    rIdx: number,
    wIdx: number,
    field: 'qty' | 'expDate',
    val: string
  ) => {
    const next = form.rows.map((r, i) => {
      if (i !== rIdx) return r;
      const checks = r.checks.map((c, ci) => (ci === wIdx ? { ...c, [field]: val } : c));
      return { ...r, checks };
    });
    onChange({ rows: next });
  };

  const updateSig = (wIdx: number, val: string) => {
    const next = [...form.staffSignatures];
    next[wIdx] = val;
    onChange({ staffSignatures: next });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Location</label>
          <input
            type="text"
            value={form.location}
            onChange={(e) => onChange({ location: e.target.value })}
            placeholder="e.g., CCU / SD Medication Room"
            className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Month</label>
          <input
            type="text"
            value={form.month}
            onChange={(e) => onChange({ month: e.target.value })}
            placeholder="e.g., November 2026"
            className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
          />
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-md">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th rowSpan={2} className="p-2 border-r border-slate-200 w-14 text-center">
                SL No.
              </th>
              <th rowSpan={2} className="p-2 border-r border-slate-200 min-w-[200px]">
                Medication Name
              </th>
              <th rowSpan={2} className="p-2 border-r border-slate-200 w-24 text-center">
                Ward Qty
              </th>
              {form.weekDates.map((wd, idx) => (
                <th
                  key={`wed-${idx}`}
                  colSpan={2}
                  className="p-1.5 border-r border-slate-300 bg-slate-50"
                >
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-medium text-slate-500">Date:</span>
                    <input
                      type="text"
                      value={wd}
                      onChange={(e) => updateWeekDate(idx, e.target.value)}
                      placeholder={`Wk ${idx + 1}`}
                      className="w-full px-1.5 py-0.5 text-[11px] font-mono bg-white border border-slate-200 rounded"
                    />
                  </div>
                </th>
              ))}
            </tr>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-600">
              {Array.from({ length: 5 }).map((_, idx) => (
                <th
                  key={`wsub-${idx}`}
                  colSpan={2}
                  className="p-0 border-r border-slate-300"
                >
                  <div className="grid grid-cols-2 divide-x divide-slate-200 text-center py-1 font-medium">
                    <span>Qty</span>
                    <span>Exp Date</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {form.rows.map((row, rIdx) => (
              <tr key={row.id} className="hover:bg-slate-50/70">
                <td className="p-1 border-r border-slate-200">
                  <input
                    type="text"
                    value={row.slNo}
                    onChange={(e) => updateRowBase(rIdx, 'slNo', e.target.value)}
                    placeholder={String(rIdx + 1)}
                    className="w-full px-1 py-1 text-xs font-mono text-center border border-transparent hover:border-slate-200 focus:border-teal-700 rounded focus:outline-none"
                  />
                </td>
                <td className="p-1 border-r border-slate-200">
                  <input
                    type="text"
                    value={row.medicationName}
                    onChange={(e) => updateRowBase(rIdx, 'medicationName', e.target.value)}
                    placeholder="Medication name..."
                    className="w-full px-2 py-1 text-xs border border-transparent hover:border-slate-200 focus:border-teal-700 rounded focus:outline-none"
                  />
                </td>
                <td className="p-1 border-r border-slate-200">
                  <input
                    type="text"
                    value={row.wardQuantity}
                    onChange={(e) => updateRowBase(rIdx, 'wardQuantity', e.target.value)}
                    placeholder="Par"
                    className="w-full px-1.5 py-1 text-xs font-mono text-center border border-transparent hover:border-slate-200 focus:border-teal-700 rounded focus:outline-none"
                  />
                </td>
                {row.checks.map((chk, wIdx) => {
                  const sev = getCrashCartSlotExpirySeverity(chk.expDate, today);
                  const expClass =
                    sev === 'expired'
                      ? 'bg-rose-100 border-rose-400 text-rose-900 font-semibold'
                      : sev === 'near-3m'
                        ? 'bg-amber-100 border-amber-400 text-amber-950 font-semibold'
                        : 'bg-white border-slate-200';
                  return (
                    <td
                      key={`${row.id}-w-${wIdx}`}
                      colSpan={2}
                      className="p-1 border-r border-slate-300"
                    >
                      <div className="grid grid-cols-2 gap-1">
                        <input
                          type="text"
                          value={chk.qty}
                          onChange={(e) => updateRowCheck(rIdx, wIdx, 'qty', e.target.value)}
                          placeholder="Qty"
                          className="w-full px-1 py-1 text-[11px] font-mono text-center border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-700"
                        />
                        <input
                          type="text"
                          value={chk.expDate}
                          onChange={(e) => updateRowCheck(rIdx, wIdx, 'expDate', e.target.value)}
                          placeholder="Exp"
                          className={`w-full px-1 py-1 text-[11px] font-mono text-center border rounded focus:outline-none focus:ring-1 focus:ring-teal-700 ${expClass}`}
                        />
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}

            {/* Staff Signatures */}
            <tr className="bg-slate-50/70">
              <td colSpan={3} className="p-2 border-r border-slate-200 font-semibold text-xs">
                Staff Signature
              </td>
              {form.staffSignatures.map((sig, idx) => (
                <td key={`wsig-${idx}`} colSpan={2} className="p-1 border-r border-slate-300">
                  <input
                    type="text"
                    value={sig}
                    onChange={(e) => updateSig(idx, e.target.value)}
                    placeholder="RN Sign"
                    className="w-full px-2 py-1 text-xs text-center bg-white border border-slate-200 rounded"
                  />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- MONTHLY STORE CHECKLIST INTERACTIVE EDITOR ---------- */
function MonthlyStoreEditor({
  form,
  onChange,
  today,
}: {
  form: MonthlyStoreChecklistForm;
  onChange: (patch: Partial<MonthlyStoreChecklistForm>) => void;
  today: string;
}) {
  const updateRow = (
    rIdx: number,
    field: 'stockNo' | 'description' | 'qtyAvailable' | 'expiryDate1' | 'expiryDate2',
    val: string
  ) => {
    const next = form.rows.map((r, i) => (i === rIdx ? { ...r, [field]: val } : r));
    onChange({ rows: next });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Ward</label>
          <input
            type="text"
            value={form.ward}
            onChange={(e) => onChange({ ward: e.target.value })}
            placeholder="e.g., CCU & SD Ward"
            className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Month &amp; Year
          </label>
          <input
            type="text"
            value={form.monthYear}
            onChange={(e) => onChange({ monthYear: e.target.value })}
            placeholder="e.g., November 2026"
            className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
          />
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-md">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
              <th className="p-2 border-r border-slate-200 w-28">Stock No.</th>
              <th className="p-2 border-r border-slate-200 min-w-[240px]">Item description</th>
              <th className="p-2 border-r border-slate-200 w-36">Quantity available</th>
              <th className="p-2 border-r border-slate-200 w-36">Expiry Date 1</th>
              <th className="p-2 w-36">Expiry Date 2</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {form.rows.map((row, rIdx) => {
              const sev1 = getCrashCartSlotExpirySeverity(row.expiryDate1, today);
              const sev2 = getCrashCartSlotExpirySeverity(row.expiryDate2, today);
              const cls = (sev: string) =>
                sev === 'expired'
                  ? 'bg-rose-100 border-rose-400 text-rose-900 font-semibold'
                  : sev === 'near-3m'
                    ? 'bg-amber-100 border-amber-400 text-amber-950 font-semibold'
                    : 'bg-white border-slate-200';

              return (
                <tr key={row.id} className="hover:bg-slate-50/70">
                  <td className="p-1 border-r border-slate-200">
                    <input
                      type="text"
                      value={row.stockNo}
                      onChange={(e) => updateRow(rIdx, 'stockNo', e.target.value)}
                      placeholder="Stock #"
                      className="w-full px-2 py-1 text-xs font-mono border border-transparent hover:border-slate-200 focus:border-teal-700 rounded focus:outline-none"
                    />
                  </td>
                  <td className="p-1 border-r border-slate-200">
                    <input
                      type="text"
                      value={row.description}
                      onChange={(e) => updateRow(rIdx, 'description', e.target.value)}
                      placeholder="Store item description..."
                      className="w-full px-2 py-1 text-xs border border-transparent hover:border-slate-200 focus:border-teal-700 rounded focus:outline-none"
                    />
                  </td>
                  <td className="p-1 border-r border-slate-200">
                    <input
                      type="text"
                      value={row.qtyAvailable}
                      onChange={(e) => updateRow(rIdx, 'qtyAvailable', e.target.value)}
                      placeholder="Qty"
                      className="w-full px-2 py-1 text-xs font-mono text-center border border-transparent hover:border-slate-200 focus:border-teal-700 rounded focus:outline-none"
                    />
                  </td>
                  <td className="p-1 border-r border-slate-200">
                    <input
                      type="text"
                      value={row.expiryDate1}
                      onChange={(e) => updateRow(rIdx, 'expiryDate1', e.target.value)}
                      placeholder="DD/MM/YYYY"
                      className={`w-full px-2 py-1 text-xs font-mono text-center border rounded focus:outline-none focus:ring-1 focus:ring-teal-700 ${cls(sev1)}`}
                    />
                  </td>
                  <td className="p-1">
                    <input
                      type="text"
                      value={row.expiryDate2}
                      onChange={(e) => updateRow(rIdx, 'expiryDate2', e.target.value)}
                      placeholder="DD/MM/YYYY"
                      className={`w-full px-2 py-1 text-xs font-mono text-center border rounded focus:outline-none focus:ring-1 focus:ring-teal-700 ${cls(sev2)}`}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Sign-off Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl pt-1">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Staff name</label>
          <input
            type="text"
            value={form.staffName}
            onChange={(e) => onChange({ staffName: e.target.value })}
            className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Signature</label>
          <input
            type="text"
            value={form.signature}
            onChange={(e) => onChange({ signature: e.target.value })}
            className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Date</label>
          <input
            type="text"
            value={form.date}
            onChange={(e) => onChange({ date: e.target.value })}
            placeholder="DD/MM/YYYY"
            className="w-full px-3 py-1.5 text-sm font-mono border border-slate-200 rounded-md"
          />
        </div>
      </div>
    </div>
  );
}
