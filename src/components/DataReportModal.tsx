import { Download, Lock, Printer, RotateCcw, Upload, X } from 'lucide-react';
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
  isAdmin: boolean;
  canEditWardProfile: boolean;
  canExportBackup: boolean;
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
  isAdmin,
  canEditWardProfile,
  canExportBackup,
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
    if (!canEditWardProfile) return;
    if (wardNameInput.trim()) onSetWardName(wardNameInput.trim());
    if (inspectorInput.trim()) onSetDefaultInspector(inspectorInput.trim());
    setFeedback('Ward profile & default inspector updated.');
  };

  const handleExportInventoryCsv = () => {
    if (!canExportBackup) return;
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
      'Next PPM Date',
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
    if (!canExportBackup) return;
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
    if (!isAdmin) return;
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
        setFeedback('Restored ward schedule & inventory to cloud database.');
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
              Ward Settings, Reports &amp; Backup
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Print audit sheets, export Excel-ready CSVs, or manage cloud ward backups
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
                  disabled={!canEditWardProfile}
                  value={wardNameInput}
                  onChange={(e) => setWardNameInput(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700 disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">
                  Default Nurse / Inspector
                </label>
                <input
                  type="text"
                  disabled={!canEditWardProfile}
                  value={inspectorInput}
                  onChange={(e) => setInspectorInput(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700 disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>
            </div>
            {canEditWardProfile ? (
              <button
                type="submit"
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors cursor-pointer"
              >
                Update Ward Profile
              </button>
            ) : (
              <div className="text-[11px] text-slate-500 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Only Admin or authorized leads can modify ward-wide profile settings.
              </div>
            )}
          </form>

          <hr className="border-slate-200" />

          {/* Export & Print */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-900">
              Inspection Reports &amp; Backups
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

              {canExportBackup && (
                <>
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
                    Save Full Backup (JSON)
                  </button>
                </>
              )}

              {isAdmin && (
                <>
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
                </>
              )}
            </div>
          </div>

          {isAdmin && (
            <>
              <hr className="border-slate-200" />

              {/* Reset (Admin Only) */}
              <div className="flex items-center justify-between gap-4">
                <div className="text-xs text-slate-500">
                  Reset all ward records to the initial sample schedule
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
