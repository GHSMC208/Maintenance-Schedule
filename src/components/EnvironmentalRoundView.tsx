import { AlertTriangle, CheckCircle2, Flame, Plus, ShieldAlert } from 'lucide-react';
import { useMemo, useState } from 'react';
import type {
  EnvironmentalCheckItem,
  EnvironmentalSection,
  RoundCheckResult,
  TaskFrequency,
} from '../types/ward';
import { formatShortDate } from '../utils/dateUtils';

interface EnvironmentalRoundViewProps {
  checks: EnvironmentalCheckItem[];
  defaultInspector: string;
  onUpdateCheck: (
    checkId: string,
    result: RoundCheckResult,
    inspector: string,
    measuredValue?: string,
    notes?: string,
    createTicket?: boolean
  ) => void;
  onAddCheck: (check: Omit<EnvironmentalCheckItem, 'id'>) => void;
}

const SECTIONS: EnvironmentalSection[] = [
  'Fire-Extinguishing & Life Safety',
  'Ward Environment & Cold Chain',
  'Clinical Utilities & Waste',
];

export function EnvironmentalRoundView({
  checks,
  defaultInspector,
  onUpdateCheck,
  onAddCheck,
}: EnvironmentalRoundViewProps) {
  const [sectionFilter, setSectionFilter] = useState<'all' | EnvironmentalSection>('all');
  const [inspectingItem, setInspectingItem] = useState<EnvironmentalCheckItem | null>(null);
  const [resultChoice, setResultChoice] = useState<RoundCheckResult>('pass');
  const [measuredVal, setMeasuredVal] = useState('');
  const [notes, setNotes] = useState('');
  const [inspector, setInspector] = useState(defaultInspector);
  const [autoRaiseTicket, setAutoRaiseTicket] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSection, setNewSection] = useState<EnvironmentalSection>(
    'Fire-Extinguishing & Life Safety'
  );
  const [newLocation, setNewLocation] = useState('');
  const [newFreq, setNewFreq] = useState<TaskFrequency>('weekly');

  const stats = useMemo(() => {
    const pass = checks.filter((c) => c.result === 'pass').length;
    const actionNeeded = checks.filter((c) => c.result === 'action-needed').length;
    const pending = checks.filter((c) => c.result === 'pending').length;
    return { total: checks.length, pass, actionNeeded, pending };
  }, [checks]);

  const visibleSections = useMemo(() => {
    return sectionFilter === 'all' ? SECTIONS : SECTIONS.filter((s) => s === sectionFilter);
  }, [sectionFilter]);

  const openInspect = (item: EnvironmentalCheckItem) => {
    setInspectingItem(item);
    setResultChoice(item.result === 'pending' ? 'pass' : item.result);
    setMeasuredVal(item.measuredValue || '');
    setNotes(item.notes || '');
    setInspector(defaultInspector);
    setAutoRaiseTicket(true);
  };

  const handleSaveInspection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectingItem) return;
    onUpdateCheck(
      inspectingItem.id,
      resultChoice,
      inspector.trim() || defaultInspector,
      measuredVal.trim(),
      notes.trim(),
      resultChoice === 'action-needed' && autoRaiseTicket
    );
    setInspectingItem(null);
  };

  const handleAddChecklistItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onAddCheck({
      section: newSection,
      title: newTitle.trim(),
      location: newLocation.trim() || 'Ward General',
      frequency: newFreq,
      result: 'pending',
      measuredValue: '',
      lastCheckedDate: null,
      inspector: null,
      notes: '',
    });
    setNewTitle('');
    setNewLocation('');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-5">
      {/* Header Summary */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Environmental Round &amp; Fire-Extinguishing Safety Checklist
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Weekly and monthly ward safety inspections covering fire extinguishers, fire hose reels,
              cold-chain refrigeration, HVAC ambient conditions, medical gas outlets, and waste safety.
            </p>
          </div>
          <div className="flex items-center gap-6 text-right">
            <div>
              <div className="text-[11px] font-medium text-slate-500">Compliant</div>
              <div className="text-xl font-semibold font-mono tabular-nums text-emerald-700">
                {stats.pass} / {stats.total}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-500">Action Needed</div>
              <div
                className={`text-xl font-semibold font-mono tabular-nums ${
                  stats.actionNeeded > 0 ? 'text-amber-700' : 'text-slate-900'
                }`}
              >
                {stats.actionNeeded}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg overflow-x-auto">
          <button
            type="button"
            onClick={() => setSectionFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              sectionFilter === 'all'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Sections
          </button>
          {SECTIONS.map((sec) => (
            <button
              key={sec}
              type="button"
              onClick={() => setSectionFilter(sec)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                sectionFilter === sec
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {sec}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Round Point
        </button>
      </div>

      {/* Checklist Sections */}
      <div className="space-y-4">
        {visibleSections.map((section) => {
          const sectionItems = checks.filter((c) => c.section === section);
          return (
            <section key={section} className="bg-white border border-slate-200 rounded-lg">
              <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {section.includes('Fire') && <Flame className="w-4 h-4 text-amber-700" />}
                  <h3 className="text-sm font-semibold text-slate-900">{section}</h3>
                </div>
                <span className="text-xs text-slate-500 font-mono tabular-nums">
                  {sectionItems.filter((i) => i.result === 'pass').length} / {sectionItems.length} passed
                </span>
              </div>

              <div className="divide-y divide-slate-200">
                {sectionItems.map((item) => (
                  <div
                    key={item.id}
                    className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm text-slate-900">{item.title}</div>
                      <div className="mt-1 text-xs text-slate-500 flex flex-wrap items-center gap-2">
                        <span>{item.location}</span>
                        <span aria-hidden="true">·</span>
                        <span className="capitalize">{item.frequency}</span>
                        {item.measuredValue && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono text-slate-700">{item.measuredValue}</span>
                          </>
                        )}
                        {item.notes && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-slate-600">{item.notes}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-5 shrink-0">
                      <div className="text-right text-xs">
                        {item.result === 'pass' ? (
                          <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Passed
                          </span>
                        ) : item.result === 'action-needed' ? (
                          <span className="inline-flex items-center gap-1.5 font-medium text-amber-700">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Action Needed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 font-medium text-slate-500">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            Pending
                          </span>
                        )}
                        <div className="text-[11px] text-slate-400 font-mono tabular-nums mt-0.5">
                          {item.lastCheckedDate
                            ? `${formatShortDate(item.lastCheckedDate)} · ${item.inspector || '—'}`
                            : 'Not inspected'}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateCheck(
                              item.id,
                              'pass',
                              defaultInspector,
                              item.measuredValue,
                              item.notes,
                              false
                            )
                          }
                          className="px-2.5 py-1 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded transition-colors cursor-pointer"
                        >
                          Quick Pass
                        </button>
                        <button
                          type="button"
                          onClick={() => openInspect(item)}
                          className="px-2.5 py-1 text-xs font-medium text-slate-700 border border-slate-200 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                        >
                          Record Details
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* Detailed Round Check Modal */}
      {inspectingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-lg w-full max-w-lg shadow-lg">
            <div className="px-5 py-4 border-b border-slate-200">
              <h3 className="text-base font-semibold text-slate-900">Record Round Observation</h3>
              <p className="text-xs text-slate-500 mt-0.5">{inspectingItem.title}</p>
            </div>
            <form onSubmit={handleSaveInspection} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setResultChoice('pass')}
                  className={`px-3 py-2 text-xs font-medium rounded-md border text-left transition-colors cursor-pointer ${
                    resultChoice === 'pass'
                      ? 'border-emerald-700 bg-emerald-50 text-emerald-900'
                      : 'border-slate-200 text-slate-700'
                  }`}
                >
                  <div>Pass / Compliant</div>
                  <div className="text-[11px] font-normal text-slate-500 mt-0.5">
                    Safe &amp; within target limits
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setResultChoice('action-needed')}
                  className={`px-3 py-2 text-xs font-medium rounded-md border text-left transition-colors cursor-pointer ${
                    resultChoice === 'action-needed'
                      ? 'border-amber-600 bg-amber-50 text-amber-900'
                      : 'border-slate-200 text-slate-700'
                  }`}
                >
                  <div>Action / Maintenance Needed</div>
                  <div className="text-[11px] font-normal text-slate-500 mt-0.5">
                    Flag deficiency for follow-up
                  </div>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Reading / Seal / Gauge State
                  </label>
                  <input
                    type="text"
                    value={measuredVal}
                    onChange={(e) => setMeasuredVal(e.target.value)}
                    placeholder="e.g., 4.1°C or Green Zone"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Inspector Name
                  </label>
                  <input
                    type="text"
                    required
                    value={inspector}
                    onChange={(e) => setInspector(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              {resultChoice === 'action-needed' && (
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoRaiseTicket}
                    onChange={(e) => setAutoRaiseTicket(e.target.checked)}
                    className="rounded border-slate-300 text-teal-700 focus:ring-teal-700"
                  />
                  Automatically create a Maintenance Follow-Up ticket
                </label>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setInspectingItem(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors cursor-pointer"
                >
                  Save Round Check
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Round Point Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-lg w-full max-w-md shadow-lg">
            <div className="px-5 py-4 border-b border-slate-200">
              <h3 className="text-base font-semibold text-slate-900">Add Environmental Round Point</h3>
            </div>
            <form onSubmit={handleAddChecklistItem} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Inspection Requirement
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Eye Wash Station Weekly Flush Check"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Section</label>
                <select
                  value={newSection}
                  onChange={(e) => setNewSection(e.target.value as EnvironmentalSection)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                >
                  {SECTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="e.g., Dirty Utility Room"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Cadence</label>
                  <select
                    value={newFreq}
                    onChange={(e) => setNewFreq(e.target.value as TaskFrequency)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
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
                  Add Point
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
