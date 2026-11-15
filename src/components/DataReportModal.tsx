import { Download, Printer, RotateCcw, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';
import type { CategoryMeta, WardStoreData } from '../types/ward';
import {
  downloadTextFile,
  escapeCsvCell,
  getExpiryStatus,
  getTodayIso,
} from '../utils/dateUtils';

interface DataReportModalProps {
  open: boolean;
  onClose: () => void;
  data: WardStoreData;
  categories: CategoryMeta[];
  onSetWardName: (name: string) => void;
  onSetDefaultInspector: (name: string) => void;
  onImportBackup: (imported: WardStoreData) => void;
  onMarkBackupDone: () => void;
  onResetData: () => void;
}

export function DataReportModal({
  open,
  onClose,
  data,
  categories,
  onSetWardName,
  onSetDefaultInspector,
  onImportBackup,
  onMarkBackupDone,
  onResetData,
}: DataReportModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [wardNameInput, setWardNameInput] = useState(data.wardName);
  const [inspectorInput, setInspectorInput] = useState(data.defaultInspector);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  if (!open) return null;

  const handleSaveWardProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (wardNameInput.trim()) onSetWardName(wardNameInput.trim());
    if (inspectorInput.trim()) onSetDefaultInspector(inspectorInput.trim());
    setFeedback('Ward profile & default inspector updated.');
  };

  const handleExportInventoryCsv = () => {
    const today = getTodayIso();
    const catMap = Object.fromEntries(categories.map((c) => [c.id, c.label]));
    const headers = [
      'Category',
      'Unit',
      'Item Name',
      'Location',
      'Lot / Serial',
      'Quantity',
      'Par Level',
      'UOM',
      'Expiry Date',
      'Expiry Status',
      'Equipment Status',
      'Next PM Date',
      'Last Verified',
      'Verified By',
      'Notes',
    ];
    const rows = data.inventory.map((it) => {
      const exp = getExpiryStatus(it.expiryDate, today);
      return [
        catMap[it.categoryId] || it.categoryId,
        it.unit,
        it.name,
        it.locationDetail,
        it.batchOrSerial,
        it.quantity,
        it.parLevel,
        it.unitOfMeasure,
        it.expiryDate || '',
        exp.label,
        it.equipmentStatus || '',
        it.nextPmDate || '',
        it.lastCheckedDate,
        it.lastCheckedBy,
        it.notes,
      ]
        .map(escapeCsvCell)
        .join(',');
    });
    const csv = [headers.map(escapeCsvCell).join(','), ...rows].join('\n');
    downloadTextFile(`ward-inventory-expiry-${today}.csv`, csv, 'text/csv;charset=utf-8');
    setFeedback('Exported Inventory & Expiry CSV report.');
  };

  const handleExportJsonBackup = () => {
    const today = getTodayIso();
    downloadTextFile(
      `wardcare-backup-${today}.json`,
      JSON.stringify(data, null, 2),
      'application/json'
    );
    onMarkBackupDone();
    setFeedback('Downloaded full JSON backup file.');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as WardStoreData;
        if (!parsed || !Array.isArray(parsed.tasks) || !Array.isArray(parsed.inventory)) {
          setFeedback('Invalid backup file format.');
          return;
        }
        onImportBackup(parsed);
        setFeedback('Restored ward schedule & inventory from backup.');
      } catch {
        setFeedback('Could not parse JSON backup file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-lg w-full max-w-xl shadow-lg">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Ward Settings, Reports &amp; PC Backup
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Print audit sheets, export Excel-ready CSVs, or back up local PC storage
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {feedback && (
            <div className="px-3.5 py-2 bg-teal-50 border border-teal-200 rounded-md text-xs text-teal-900">
              {feedback}
            </div>
          )}

          {/* Ward Profile */}
          <form onSubmit={handleSaveWardProfile} className="space-y-3">
            <div className="text-xs font-semibold text-slate-900">Ward &amp; Inspector Profile</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-600 mb-1">Ward / Unit Name</label>
                <input
                  type="text"
                  value={wardNameInput}
                  onChange={(e) => setWardNameInput(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">
                  Current Nurse / Inspector
                </label>
                <input
                  type="text"
                  value={inspectorInput}
                  onChange={(e) => setInspectorInput(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>
            </div>
            <button
              type="submit"
              className="px-3.5 py-1.5 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors cursor-pointer"
            >
              Update Ward Profile
            </button>
          </form>

          <hr className="border-slate-200" />

          {/* Export & Print */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-900">
              Inspection Reports &amp; PC Backups
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  setTimeout(() => window.print(), 150);
                }}
                className="flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-slate-800 border border-slate-200 hover:bg-slate-50 rounded-md transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                Print Current Ward View
              </button>

              <button
                type="button"
                onClick={handleExportInventoryCsv}
                className="flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-slate-800 border border-slate-200 hover:bg-slate-50 rounded-md transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4 text-slate-600" />
                Export Inventory &amp; Expiry CSV
              </button>

              <button
                type="button"
                onClick={handleExportJsonBackup}
                className="flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-slate-800 border border-slate-200 hover:bg-slate-50 rounded-md transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4 text-teal-700" />
                Save Full PC Backup (JSON)
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-slate-800 border border-slate-200 hover:bg-slate-50 rounded-md transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4 text-teal-700" />
                Restore From JSON Backup
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleImportFile}
                className="hidden"
              />
            </div>
          </div>

          <hr className="border-slate-200" />

          {/* Reset */}
          <div className="flex items-center justify-between gap-4">
            <div className="text-xs text-slate-500">
              Reset all local ward records to the initial sample schedule
            </div>
            {!confirmReset ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-700 border border-rose-200 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Data
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-md cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onResetData();
                    setConfirmReset(false);
                    setFeedback('Ward data reset to baseline template.');
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-rose-700 hover:bg-rose-800 rounded-md cursor-pointer"
                >
                  Confirm Reset
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
