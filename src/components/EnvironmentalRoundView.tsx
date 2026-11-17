import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  Eye,
  Flame,
  Link2,
  Pencil,
  Plus,
  Printer,
  Search,
  Trash2,
  UserPlus,
  Users,
  Wrench,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  createInitialEnvironmentalRoundMeta,
  ENVIRONMENTAL_DOMAIN_FILTERS,
  ENVIRONMENTAL_GH0030_GROUPS,
} from '../data/environmentalRoundSeed';
import type {
  EnvironmentalCheckItem,
  EnvironmentalFollowUpRow,
  EnvironmentalResponse,
  EnvironmentalRoundMeta,
  MaintenanceTicket,
  RoundCheckResult,
  StoreStaffAssignment,
  TaskFrequency,
} from '../types/ward';
import { getTodayIso } from '../utils/dateUtils';
import { EnvironmentalRoundPrintView } from './EnvironmentalRoundPrintView';

interface EnvironmentalRoundViewProps {
  checks: EnvironmentalCheckItem[];
  maintenanceTickets?: MaintenanceTicket[];
  defaultInspector: string;
  roundMeta?: EnvironmentalRoundMeta;
  onUpdateRoundMeta: (patch: Partial<EnvironmentalRoundMeta>) => void;
  onSetResponse: (
    checkId: string,
    response: EnvironmentalResponse,
    inspector?: string,
    notes?: string
  ) => void;
  onSetGroupResponse: (groupId: string, response: EnvironmentalResponse) => void;
  onUpdateCheck: (
    checkId: string,
    result: RoundCheckResult,
    inspector: string,
    measuredValue?: string,
    notes?: string,
    createTicket?: boolean
  ) => void;
  onAddCheck: (check: Omit<EnvironmentalCheckItem, 'id'>) => void;
  onDeleteCheck: (checkId: string) => void;
  onOpenMaintenance?: () => void;
}

function getEffectiveResponse(item: EnvironmentalCheckItem): EnvironmentalResponse | undefined {
  if (item.response) return item.response;
  if (item.result === 'action-needed') return 'no';
  if (item.result === 'pass') return 'yes';
  return undefined;
}

export function EnvironmentalRoundView({
  checks,
  maintenanceTickets = [],
  defaultInspector,
  roundMeta,
  onUpdateRoundMeta,
  onSetResponse,
  onSetGroupResponse,
  onUpdateCheck,
  onAddCheck,
  onDeleteCheck,
  onOpenMaintenance,
}: EnvironmentalRoundViewProps) {
  const today = getTodayIso();
  const meta = useMemo(
    () => roundMeta || createInitialEnvironmentalRoundMeta(today),
    [roundMeta, today]
  );

  const [viewMode, setViewMode] = useState<'edit' | 'print'>('edit');
  const [domainFilter, setDomainFilter] = useState<string>('all');
  const [responseFilter, setResponseFilter] = useState<'all' | EnvironmentalResponse>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDomain, setNewDomain] = useState<string>('Patient Safety');
  const [newLocation, setNewLocation] = useState('Ward 208 (CCU & SD)');
  const [newFreq, setNewFreq] = useState<TaskFrequency>('monthly');
  const [ticketRaisedIds, setTicketRaisedIds] = useState<Record<string, boolean>>({});

  const checkById = useMemo(() => new Map(checks.map((c) => [c.id, c])), [checks]);
  const customChecks = useMemo(
    () => checks.filter((c) => !c.groupId || !c.groupId.startsWith('gh-')),
    [checks]
  );

  const stats = useMemo(() => {
    let yes = 0;
    let na = 0;
    let no = 0;
    for (const c of checks) {
      const resp = getEffectiveResponse(c);
      if (resp === 'yes') yes += 1;
      else if (resp === 'na') na += 1;
      else if (resp === 'no') no += 1;
    }
    const pendingFollowUps = meta.followUpRows.filter(
      (r) => !r.dateCompleted.trim() || r.dateCompleted.toLowerCase().includes('pending')
    ).length;
    return { total: checks.length, yes, na, no, pendingFollowUps };
  }, [checks, meta.followUpRows]);

  const activeStaffNames = useMemo(
    () => meta.staffAssignments.map((s) => s.staffName.trim()).filter(Boolean),
    [meta.staffAssignments]
  );

  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return ENVIRONMENTAL_GH0030_GROUPS.map((grp) => {
      if (domainFilter !== 'all' && grp.filterDomain !== domainFilter) {
        return null;
      }
      const matchingQuestions = grp.questions.filter((subQ) => {
        const item = checkById.get(subQ.id);
        const resp = item ? getEffectiveResponse(item) : subQ.defaultResponse;
        if (responseFilter !== 'all' && resp !== responseFilter) {
          return false;
        }
        if (q) {
          const textMatch =
            (item?.title || subQ.text).toLowerCase().includes(q) ||
            grp.title.toLowerCase().includes(q) ||
            grp.filterDomain.toLowerCase().includes(q);
          if (!textMatch) return false;
        }
        return true;
      });
      if (matchingQuestions.length === 0) return null;
      return { grp, questions: matchingQuestions };
    }).filter(Boolean) as {
      grp: (typeof ENVIRONMENTAL_GH0030_GROUPS)[number];
      questions: (typeof ENVIRONMENTAL_GH0030_GROUPS)[number]['questions'];
    }[];
  }, [domainFilter, responseFilter, searchQuery, checkById]);

  const filteredCustomChecks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return customChecks.filter((c) => {
      if (domainFilter !== 'all' && domainFilter !== 'Custom' && c.section !== domainFilter) {
        return false;
      }
      const resp = getEffectiveResponse(c);
      if (responseFilter !== 'all' && resp !== responseFilter) {
        return false;
      }
      if (q) {
        return (
          c.title.toLowerCase().includes(q) ||
          c.location.toLowerCase().includes(q) ||
          c.section.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [customChecks, domainFilter, responseFilter, searchQuery]);

  // --- Staff Assignment Handlers ---
  const handleAddStaff = () => {
    const [y, m, d] = today.split('-');
    const slashDate = y && m && d ? `${d}/${m}/${y}` : '';
    const next: StoreStaffAssignment = {
      id: `env-staff-${Date.now().toString(36)}`,
      staffName: '',
      role: 'Staff Nurse / Surveyor',
      assignedSections: 'Environmental & Fire Safety Round',
      checkedDate: slashDate,
      signature: '',
    };
    onUpdateRoundMeta({ staffAssignments: [...meta.staffAssignments, next] });
  };

  const handleUpdateStaff = (id: string, patch: Partial<StoreStaffAssignment>) => {
    onUpdateRoundMeta({
      staffAssignments: meta.staffAssignments.map((st) =>
        st.id === id ? { ...st, ...patch } : st
      ),
    });
  };

  const handleRemoveStaff = (id: string) => {
    if (meta.staffAssignments.length <= 1) return;
    onUpdateRoundMeta({
      staffAssignments: meta.staffAssignments.filter((st) => st.id !== id),
    });
  };

  // --- Work Order Follow-Up Handlers ---
  const handleAddFollowUpRow = (prefillIssue = '') => {
    const [y, m, d] = today.split('-');
    const slashDate = y && m && d ? `${d}/${m}/${y}` : '';
    const newRow: EnvironmentalFollowUpRow = {
      id: `env-fu-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      issue: prefillIssue,
      date: slashDate,
      responsibleDept: 'MAINTENANCE INFORMED',
      workOrderSubmitted: false,
      dateCompleted: 'PENDING',
    };
    onUpdateRoundMeta({
      followUpRows: [...meta.followUpRows, newRow],
    });
  };

  const handleUpdateFollowUpRow = (id: string, patch: Partial<EnvironmentalFollowUpRow>) => {
    onUpdateRoundMeta({
      followUpRows: meta.followUpRows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    });
  };

  const handleDeleteFollowUpRow = (id: string) => {
    onUpdateRoundMeta({
      followUpRows: meta.followUpRows.filter((r) => r.id !== id),
    });
  };

  const handleSyncNoItemsToFollowUp = () => {
    const existingIssues = new Set(
      meta.followUpRows.map((r) => r.issue.trim().toLowerCase())
    );
    const [y, m, d] = today.split('-');
    const slashDate = y && m && d ? `${d}/${m}/${y}` : '';
    const additions: EnvironmentalFollowUpRow[] = [];

    for (const grp of ENVIRONMENTAL_GH0030_GROUPS) {
      for (const q of grp.questions) {
        const item = checkById.get(q.id);
        const resp = item ? getEffectiveResponse(item) : q.defaultResponse;
        if (resp === 'no') {
          const label = `${grp.title.replace(/[?:]+$/, '')} — ${q.code}) ${item?.title || q.text}`;
          if (!existingIssues.has(label.toLowerCase())) {
            additions.push({
              id: `env-fu-${q.id}-${Date.now().toString(36)}`,
              issue: label,
              date: slashDate,
              responsibleDept: 'MAINTENANCE INFORMED',
              workOrderSubmitted: false,
              dateCompleted: 'PENDING',
            });
          }
        }
      }
    }

    if (additions.length > 0) {
      onUpdateRoundMeta({ followUpRows: [...meta.followUpRows, ...additions] });
    }
  };

  const handleAddCustomPoint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onAddCheck({
      section: newDomain,
      title: newTitle.trim(),
      location: newLocation.trim() || 'Ward 208',
      frequency: newFreq,
      result: 'pass',
      response: 'yes',
      measuredValue: 'YES',
      lastCheckedDate: today,
      inspector: activeStaffNames[0] || defaultInspector,
      notes: '',
      isCustom: true,
    });
    setNewTitle('');
    setShowAddModal(false);
  };

  const handleRaiseTicket = (item: EnvironmentalCheckItem) => {
    onUpdateCheck(
      item.id,
      'action-needed',
      activeStaffNames[0] || defaultInspector,
      'NO',
      item.notes || `GH0030 Round deficiency: ${item.groupTitle || item.section}`,
      true
    );
    setTicketRaisedIds((prev) => ({ ...prev, [item.id]: true }));
  };

  return (
    <div className="space-y-5">
      {/* Top Action & Official Metadata Card (Hidden on Print) */}
      <div className="no-print bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-mono font-semibold bg-purple-50 text-purple-800 border border-purple-200 rounded">
                Form GH0030
              </span>
              <h2 className="text-lg font-semibold text-slate-900">
                Environmental of Care &amp; Fire Safety Checklist
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Salmaniya Medical Complex Hospital Environmental of Care Checklist across Patient
              Safety, Fire Safety, Safe Environment, Infection Control, HazMat &amp; Waste, Medical
              Equipment, Utility Systems, Security, and Maintenance Work Order Follow-Up.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Mode Switch */}
            <div className="inline-flex items-center p-0.5 bg-slate-100 border border-slate-200 rounded-md">
              <button
                type="button"
                onClick={() => setViewMode('edit')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
                  viewMode === 'edit'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit Checklist
              </button>
              <button
                type="button"
                onClick={() => setViewMode('print')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
                  viewMode === 'print'
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
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Checklist (A4 Landscape)
            </button>
          </div>
        </div>

        {/* Summary Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-md px-3.5 py-2">
            <div className="text-[11px] font-medium text-emerald-800">Yes (Compliant)</div>
            <div className="text-lg font-semibold font-mono tabular-nums text-emerald-900">
              {stats.yes} <span className="text-xs font-normal text-emerald-700">/ {stats.total}</span>
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2">
            <div className="text-[11px] font-medium text-slate-600">N/A</div>
            <div className="text-lg font-semibold font-mono tabular-nums text-slate-800">
              {stats.na}
            </div>
          </div>
          <div
            className={`border rounded-md px-3.5 py-2 ${
              stats.no > 0 ? 'bg-rose-50/70 border-rose-200' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div
              className={`text-[11px] font-medium ${
                stats.no > 0 ? 'text-rose-800' : 'text-slate-600'
              }`}
            >
              No (Action Needed)
            </div>
            <div
              className={`text-lg font-semibold font-mono tabular-nums ${
                stats.no > 0 ? 'text-rose-900' : 'text-slate-800'
              }`}
            >
              {stats.no}
            </div>
          </div>
          <div className="bg-amber-50/60 border border-amber-200 rounded-md px-3.5 py-2">
            <div className="text-[11px] font-medium text-amber-800">Pending Work Orders</div>
            <div className="text-lg font-semibold font-mono tabular-nums text-amber-900">
              {stats.pendingFollowUps}
            </div>
          </div>
        </div>

        {/* GH0030 Header Box Fields */}
        <div className="pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Department / Unit Inspected
            </label>
            <input
              type="text"
              value={meta.departmentInspected}
              onChange={(e) => onUpdateRoundMeta({ departmentInspected: e.target.value })}
              placeholder="e.g., Ward 208 (CCU & Step-Down)"
              className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Date and Month of Inspection
            </label>
            <input
              type="text"
              value={meta.inspectionDateMonth}
              onChange={(e) => onUpdateRoundMeta({ inspectionDateMonth: e.target.value })}
              placeholder="e.g., November 2026"
              className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Manager / Dept. Head
            </label>
            <input
              type="text"
              value={meta.managerHead}
              onChange={(e) => onUpdateRoundMeta({ managerHead: e.target.value })}
              placeholder="e.g., Head Nurse / Ward 208 Manager"
              className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Surveyed By ({activeStaffNames.length} Assigned Staff)
            </label>
            <div className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-700 truncate">
              {activeStaffNames.length > 0 ? activeStaffNames.join(', ') : 'No staff assigned'}
            </div>
          </div>
        </div>
      </div>

      {/* Print Sheet (Shown in Print Preview AND always active during @media print) */}
      <div className={viewMode === 'print' ? 'block' : 'hidden print:block'}>
        <EnvironmentalRoundPrintView checks={checks} meta={meta} />
      </div>

      {/* Interactive Editor Workspace */}
      {viewMode === 'edit' && (
        <div className="no-print space-y-5">
          {/* Assigned Survey Team Card (Multi-Staff Support) */}
          <section className="bg-white border border-slate-200 rounded-lg p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-700" />
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Assigned Survey Team (More Than One Staff Supported)
                  </h3>
                  <p className="text-xs text-slate-500">
                    All assigned team members appear on &ldquo;Surveyed by (team members names)&rdquo;
                    and in the official sign-off table on the printout.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddStaff}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-md transition-colors cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Add Assigned Staff
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-md">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-left text-slate-600">
                    <th className="py-2 px-3 w-10">#</th>
                    <th className="py-2 px-3">Staff Name</th>
                    <th className="py-2 px-3">Role / Designation</th>
                    <th className="py-2 px-3">Assigned Round Sections</th>
                    <th className="py-2 px-3 w-32">Date Checked</th>
                    <th className="py-2 px-3 w-36">Signature</th>
                    <th className="py-2 px-2 w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {meta.staffAssignments.map((st, idx) => (
                    <tr key={st.id} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 font-mono text-slate-500">{idx + 1}</td>
                      <td className="py-1.5 px-2">
                        <input
                          type="text"
                          value={st.staffName}
                          onChange={(e) =>
                            handleUpdateStaff(st.id, { staffName: e.target.value })
                          }
                          placeholder="Full name"
                          className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-700"
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <input
                          type="text"
                          value={st.role}
                          onChange={(e) => handleUpdateStaff(st.id, { role: e.target.value })}
                          placeholder="Role / Title"
                          className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-700"
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <input
                          type="text"
                          value={st.assignedSections}
                          onChange={(e) =>
                            handleUpdateStaff(st.id, { assignedSections: e.target.value })
                          }
                          placeholder="e.g., Fire Safety, Patient Safety..."
                          className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-700"
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <input
                          type="text"
                          value={st.checkedDate}
                          onChange={(e) =>
                            handleUpdateStaff(st.id, { checkedDate: e.target.value })
                          }
                          placeholder="DD/MM/YYYY"
                          className="w-full px-2 py-1 text-xs font-mono border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-700"
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <input
                          type="text"
                          value={st.signature}
                          onChange={(e) =>
                            handleUpdateStaff(st.id, { signature: e.target.value })
                          }
                          placeholder="Signature / Initials"
                          className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-700"
                        />
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        <button
                          type="button"
                          disabled={meta.staffAssignments.length <= 1}
                          onClick={() => handleRemoveStaff(st.id)}
                          title="Remove staff member"
                          className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Filter & Search Toolbar */}
          <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[220px] max-w-md">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search GH0030 checklist questions..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center p-0.5 bg-slate-100 border border-slate-200 rounded-md">
                  {(
                    [
                      ['all', 'All'],
                      ['yes', 'Yes'],
                      ['na', 'N/A'],
                      ['no', 'No (Action)'],
                    ] as const
                  ).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setResponseFilter(val)}
                      className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                        responseFilter === val
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Custom Point
                </button>
              </div>
            </div>

            {/* Domain Filter Strip */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              <button
                type="button"
                onClick={() => setDomainFilter('all')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  domainFilter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Domains
              </button>
              {ENVIRONMENTAL_DOMAIN_FILTERS.map((dom) => (
                <button
                  key={dom}
                  type="button"
                  onClick={() => setDomainFilter(dom)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    domainFilter === dom
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {dom}
                </button>
              ))}
            </div>
          </div>

          {/* GH0030 Question Sub-Tables */}
          <div className="space-y-4">
            {filteredGroups.map(({ grp, questions }) => {
              const allItemsInGroup = grp.questions.map((q) => checkById.get(q.id));
              const noCount = allItemsInGroup.filter(
                (it) => it && getEffectiveResponse(it) === 'no'
              ).length;
              const yesCount = allItemsInGroup.filter(
                (it) => it && getEffectiveResponse(it) === 'yes'
              ).length;

              return (
                <section
                  key={grp.id}
                  className="bg-white border border-slate-200 rounded-lg overflow-hidden"
                >
                  {grp.domainHeading && (
                    <div className="px-4 py-1.5 bg-slate-900 text-white text-[11px] font-semibold tracking-wider uppercase flex items-center gap-2">
                      {grp.filterDomain === 'FIRE SAFETY' && (
                        <Flame className="w-3.5 h-3.5 text-amber-400" />
                      )}
                      {grp.domainHeading}
                    </div>
                  )}

                  {/* Lavender Sub-table Header matching GH0030 */}
                  <div className="px-4 py-2.5 bg-[#e6dfee] border-b border-slate-300 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-white/80 text-slate-700 border border-slate-300">
                        {grp.filterDomain}
                      </span>
                      <h3 className="text-sm font-semibold text-slate-900">{grp.title}</h3>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono tabular-nums text-slate-700">
                        {yesCount}/{grp.questions.length} Yes
                        {noCount > 0 && (
                          <span className="ml-2 text-rose-700 font-semibold">
                            · {noCount} No
                          </span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => onSetGroupResponse(grp.id, 'yes')}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-white hover:bg-emerald-50 text-emerald-800 border border-slate-300 rounded cursor-pointer transition-colors"
                      >
                        <Check className="w-3 h-3" />
                        Mark All Yes
                      </button>
                    </div>
                  </div>

                  {/* Question Rows */}
                  <div className="divide-y divide-slate-200">
                    {questions.map((q) => {
                      const item = checkById.get(q.id);
                      const resp = item ? getEffectiveResponse(item) : q.defaultResponse;

                      return (
                        <div
                          key={q.id}
                          className={`px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 transition-colors ${
                            resp === 'no' ? 'bg-rose-50/40' : 'hover:bg-slate-50/70'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-xs sm:text-sm text-slate-900">
                              <span className="font-mono font-semibold text-slate-600 mr-1.5">
                                {q.code})
                              </span>
                              <span>{item?.title || q.text}</span>
                            </div>
                            {resp === 'no' && item && (
                              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-700">
                                  <AlertTriangle className="w-3 h-3" />
                                  Deficiency / Action Needed
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleAddFollowUpRow(
                                      `${grp.title.replace(/[?:]+$/, '')} — ${q.code}) ${item.title}`
                                    )
                                  }
                                  className="px-2 py-0.5 text-[11px] font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded cursor-pointer"
                                >
                                  + Add to Work Order Log
                                </button>
                                <button
                                  type="button"
                                  disabled={ticketRaisedIds[item.id]}
                                  onClick={() => handleRaiseTicket(item)}
                                  className="px-2 py-0.5 text-[11px] font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded cursor-pointer disabled:opacity-60"
                                >
                                  {ticketRaisedIds[item.id]
                                    ? 'Ticket Sent to Maintenance'
                                    : 'Create Maintenance Ticket'}
                                </button>
                              </div>
                            )}
                          </div>

                          {/* 3-way Segmented Response Control: No | N/A | Yes */}
                          <div className="inline-flex items-center border border-slate-300 rounded-md overflow-hidden shrink-0 bg-white">
                            <button
                              type="button"
                              onClick={() =>
                                onSetResponse(
                                  q.id,
                                  'no',
                                  activeStaffNames[0] || defaultInspector
                                )
                              }
                              className={`px-3 py-1.5 text-xs font-semibold border-r border-slate-300 transition-colors cursor-pointer ${
                                resp === 'no'
                                  ? 'bg-rose-600 text-white'
                                  : 'text-slate-700 hover:bg-rose-50'
                              }`}
                            >
                              No {resp === 'no' ? '✓' : ''}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                onSetResponse(
                                  q.id,
                                  'na',
                                  activeStaffNames[0] || defaultInspector
                                )
                              }
                              className={`px-3 py-1.5 text-xs font-semibold border-r border-slate-300 transition-colors cursor-pointer ${
                                resp === 'na'
                                  ? 'bg-slate-700 text-white'
                                  : 'text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              N/A {resp === 'na' ? '✓' : ''}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                onSetResponse(
                                  q.id,
                                  'yes',
                                  activeStaffNames[0] || defaultInspector
                                )
                              }
                              className={`px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                                resp === 'yes'
                                  ? 'bg-emerald-700 text-white'
                                  : 'text-slate-700 hover:bg-emerald-50'
                              }`}
                            >
                              Yes {resp === 'yes' ? '✓' : ''}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Per-group Comments Box */}
                  <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center gap-2">
                    <label className="text-xs font-semibold text-slate-700 shrink-0">
                      Comments:
                    </label>
                    <input
                      type="text"
                      value={meta.groupComments?.[grp.id] ?? ''}
                      onChange={(e) =>
                        onUpdateRoundMeta({
                          groupComments: { [grp.id]: e.target.value },
                        })
                      }
                      placeholder="Optional group observation or comment..."
                      className="flex-1 px-2.5 py-1 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-700"
                    />
                  </div>
                </section>
              );
            })}

            {/* Custom Added Questions Section (if any) */}
            {filteredCustomChecks.length > 0 && (
              <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Additional Ward Safety Checks ({filteredCustomChecks.length})
                  </h3>
                </div>
                <div className="divide-y divide-slate-200">
                  {filteredCustomChecks.map((item) => {
                    const resp = getEffectiveResponse(item);
                    return (
                      <div
                        key={item.id}
                        className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-sm text-slate-900 font-medium">{item.title}</div>
                          <div className="text-xs text-slate-500">
                            {item.section} · {item.location}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="inline-flex items-center border border-slate-300 rounded-md overflow-hidden bg-white">
                            {(['no', 'na', 'yes'] as const).map((choice, cIdx) => (
                              <button
                                key={choice}
                                type="button"
                                onClick={() =>
                                  onSetResponse(
                                    item.id,
                                    choice,
                                    activeStaffNames[0] || defaultInspector
                                  )
                                }
                                className={`px-3 py-1.5 text-xs font-semibold uppercase cursor-pointer ${
                                  cIdx < 2 ? 'border-r border-slate-300' : ''
                                } ${
                                  resp === choice
                                    ? choice === 'no'
                                      ? 'bg-rose-600 text-white'
                                      : choice === 'na'
                                        ? 'bg-slate-700 text-white'
                                        : 'bg-emerald-700 text-white'
                                    : 'text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                {choice === 'na' ? 'N/A' : choice}
                              </button>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => onDeleteCheck(item.id)}
                            title="Delete custom question"
                            className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {filteredGroups.length === 0 && filteredCustomChecks.length === 0 && (
              <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-sm text-slate-500">
                No checklist questions match your current domain, status, or search filter.
              </div>
            )}
          </div>

          {/* Bottom Work Order Follow-Up Action Table (Matches Pages 6–7 of GH0030) */}
          <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-teal-700" />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Deficiencies &amp; Maintenance Work Order Follow-Up Log
                    </h3>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium bg-teal-50 text-teal-800 border border-teal-200 rounded">
                      <Link2 className="w-3 h-3" />
                      Synced with Maintenance Follow-Up
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Every row here stays live-synced with Maintenance Follow-Up tickets &amp; prints at the end of Form GH0030.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {onOpenMaintenance && (
                  <button
                    type="button"
                    onClick={onOpenMaintenance}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-md cursor-pointer"
                  >
                    Open Maintenance Follow-Up
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                )}
                {stats.no > 0 && (
                  <button
                    type="button"
                    onClick={handleSyncNoItemsToFollowUp}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md cursor-pointer"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Import &ldquo;No&rdquo; Items ({stats.no})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleAddFollowUpRow('')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-md cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Work Order Row
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 max-w-sm">
              <label className="text-xs font-medium text-slate-600 shrink-0">
                Issue Column Header:
              </label>
              <input
                type="text"
                value={meta.followUpTableHeader}
                onChange={(e) => onUpdateRoundMeta({ followUpTableHeader: e.target.value })}
                placeholder="e.g., 30/07/ or Issue / Defect Noted"
                className="flex-1 px-2.5 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-700"
              />
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-md">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-left text-slate-700 font-semibold">
                    <th className="py-2 px-3 min-w-[240px]">
                      {meta.followUpTableHeader || 'Issue / Defect Noted'}
                    </th>
                    <th className="py-2 px-3 w-28">DATE</th>
                    <th className="py-2 px-3 w-44">RESPONSIBLE DEPT / PERSON</th>
                    <th className="py-2 px-3 w-24 text-center">WORK ORDER SUBMITTED</th>
                    <th className="py-2 px-3 w-32">DATE COMPLETED</th>
                    <th className="py-2 px-3 w-32">MAINTENANCE STATUS</th>
                    <th className="py-2 px-2 w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {meta.followUpRows.map((row) => {
                    const linkedTicket = maintenanceTickets.find(
                      (tk) => tk.id === row.linkedTicketId || tk.linkedFollowUpId === row.id
                    );
                    return (
                      <tr key={row.id} className="hover:bg-slate-50/50">
                        <td className="py-1.5 px-2">
                          <input
                            type="text"
                            value={row.issue}
                            onChange={(e) =>
                              handleUpdateFollowUpRow(row.id, { issue: e.target.value })
                            }
                            placeholder="Describe defect / repair needed..."
                            className={`w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-700 ${
                              row.highlightRed ? 'text-rose-700 font-medium' : 'text-slate-900'
                            }`}
                          />
                        </td>
                        <td className="py-1.5 px-2">
                          <input
                            type="text"
                            value={row.date}
                            onChange={(e) =>
                              handleUpdateFollowUpRow(row.id, { date: e.target.value })
                            }
                            placeholder="DD/MM/YYYY"
                            className="w-full px-2 py-1 text-xs font-mono border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-700"
                          />
                        </td>
                        <td className="py-1.5 px-2">
                          <input
                            type="text"
                            value={row.responsibleDept}
                            onChange={(e) =>
                              handleUpdateFollowUpRow(row.id, { responsibleDept: e.target.value })
                            }
                            placeholder="MAINTENANCE INFORMED"
                            className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-700"
                          />
                        </td>
                        <td className="py-1.5 px-2 text-center">
                          <input
                            type="checkbox"
                            checked={row.workOrderSubmitted}
                            onChange={(e) =>
                              handleUpdateFollowUpRow(row.id, {
                                workOrderSubmitted: e.target.checked,
                              })
                            }
                            className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-700 cursor-pointer"
                          />
                        </td>
                        <td className="py-1.5 px-2">
                          <input
                            type="text"
                            value={row.dateCompleted}
                            onChange={(e) =>
                              handleUpdateFollowUpRow(row.id, { dateCompleted: e.target.value })
                            }
                            placeholder="PENDING or date"
                            className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-700"
                          />
                        </td>
                        <td className="py-1.5 px-2">
                          {linkedTicket ? (
                            <button
                              type="button"
                              onClick={onOpenMaintenance}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded border cursor-pointer ${
                                linkedTicket.status === 'Resolved'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : linkedTicket.status === 'In Progress'
                                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                                    : 'bg-rose-50 text-rose-800 border-rose-200'
                              }`}
                            >
                              {linkedTicket.status}
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400">Syncing…</span>
                          )}
                        </td>
                        <td className="py-1.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteFollowUpRow(row.id)}
                            title="Delete follow-up row"
                            className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {meta.followUpRows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-4 text-center text-xs text-slate-500">
                        No work order follow-up items added yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-rose-700 mb-1">
                Footer Note (Printed in Red Bold)
              </label>
              <input
                type="text"
                value={meta.followUpFooterNote}
                onChange={(e) => onUpdateRoundMeta({ followUpFooterNote: e.target.value })}
                className="w-full px-3 py-1.5 text-xs font-semibold text-rose-700 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            </div>
          </section>
        </div>
      )}

      {/* Add Custom Question Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-lg w-full max-w-md shadow-lg">
            <div className="px-5 py-4 border-b border-slate-200">
              <h3 className="text-base font-semibold text-slate-900">
                Add Custom Environmental Check Point
              </h3>
            </div>
            <form onSubmit={handleAddCustomPoint} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Inspection Question / Requirement
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Eye wash station checked weekly and clear?"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Domain</label>
                <select
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                >
                  {ENVIRONMENTAL_DOMAIN_FILTERS.map((d) => (
                    <option key={d} value={d}>
                      {d}
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
                    placeholder="e.g., CCU / SD"
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
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
              </div>
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-md cursor-pointer"
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
