import { AlertTriangle, CheckCircle2, Clock, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import type {
  MaintenanceTicket,
  TicketPriority,
  TicketStatus,
  WardUnit,
} from '../types/ward';
import { addDaysIso, formatShortDate, getTodayIso } from '../utils/dateUtils';

interface MaintenanceFollowUpViewProps {
  tickets: MaintenanceTicket[];
  defaultInspector: string;
  onAddTicket: (ticket: Omit<MaintenanceTicket, 'id'>) => void;
  onUpdateStatus: (ticketId: string, status: TicketStatus, notes?: string) => void;
  onDeleteTicket: (ticketId: string) => void;
}

export function MaintenanceFollowUpView({
  tickets,
  defaultInspector,
  onAddTicket,
  onUpdateStatus,
  onDeleteTicket,
}: MaintenanceFollowUpViewProps) {
  const today = getTodayIso();
  const [statusFilter, setStatusFilter] = useState<'active' | 'resolved' | 'all'>('active');
  const [showAddModal, setShowAddModal] = useState(false);

  const [newTitle, setNewTitle] = useState('');
  const [newArea, setNewArea] = useState('Medical Equipment');
  const [newUnit, setNewUnit] = useState<WardUnit>('CCU');
  const [newDept, setNewDept] =
    useState<MaintenanceTicket['department']>('Biomedical Engineering');
  const [newPriority, setNewPriority] = useState<TicketPriority>('Urgent');
  const [newTargetDate, setNewTargetDate] = useState(addDaysIso(today, 2));
  const [newNotes, setNewNotes] = useState('');

  const filteredTickets = useMemo(() => {
    return tickets.filter((tk) => {
      if (statusFilter === 'active' && tk.status === 'Resolved') return false;
      if (statusFilter === 'resolved' && tk.status !== 'Resolved') return false;
      return true;
    });
  }, [tickets, statusFilter]);

  const counts = useMemo(() => {
    const open = tickets.filter((t) => t.status === 'Open').length;
    const inProgress = tickets.filter((t) => t.status === 'In Progress').length;
    const resolved = tickets.filter((t) => t.status === 'Resolved').length;
    return { open, inProgress, resolved };
  }, [tickets]);

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onAddTicket({
      title: newTitle.trim(),
      sourceArea: newArea,
      unit: newUnit,
      department: newDept,
      priority: newPriority,
      status: 'Open',
      reportedDate: today,
      reportedBy: defaultInspector,
      targetDate: newTargetDate || addDaysIso(today, 3),
      resolvedDate: null,
      notes: newNotes.trim(),
    });
    setNewTitle('');
    setNewNotes('');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Maintenance Follow-Up &amp; Work Order Log
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Track all needed repairs, biomedical calibrations, fire-safety fixes, and HVAC or
              facility follow-ups reported during weekly and monthly ward inspections.
            </p>
          </div>
          <div className="flex items-center gap-6 text-right">
            <div>
              <div className="text-[11px] font-medium text-slate-500">Open</div>
              <div
                className={`text-xl font-semibold font-mono tabular-nums ${
                  counts.open > 0 ? 'text-rose-700' : 'text-slate-900'
                }`}
              >
                {counts.open}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-500">In Progress</div>
              <div className="text-xl font-semibold font-mono tabular-nums text-amber-700">
                {counts.inProgress}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-500">Resolved</div>
              <div className="text-xl font-semibold font-mono tabular-nums text-emerald-700">
                {counts.resolved}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <section className="bg-white border border-slate-200 rounded-lg">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(
              [
                { id: 'active', label: 'Active Follow-Ups' },
                { id: 'resolved', label: 'Resolved' },
                { id: 'all', label: 'All Tickets' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Log Maintenance Request
          </button>
        </div>

        {filteredTickets.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <h3 className="mt-3 text-sm font-semibold text-slate-900">
              No maintenance tickets in this view
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              All ward maintenance requests for the selected filter are cleared.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-medium text-slate-500">
                  <th className="py-2.5 px-4">Issue &amp; Source</th>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3">Priority</th>
                  <th className="py-2.5 px-3">Reported</th>
                  <th className="py-2.5 px-3">Target / Resolved</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-4 text-right">Workflow</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredTickets.map((tk) => (
                  <tr key={tk.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 max-w-md">
                      <div className="font-medium text-slate-900">{tk.title}</div>
                      <div className="mt-0.5 text-xs text-slate-500 flex flex-wrap items-center gap-1.5">
                        <span>{tk.sourceArea}</span>
                        <span aria-hidden="true">·</span>
                        <span>{tk.unit}</span>
                        {tk.notes && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="truncate max-w-xs" title={tk.notes}>
                              {tk.notes}
                            </span>
                          </>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap text-xs text-slate-700">
                      {tk.department}
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap text-xs">
                      <span
                        className={`font-medium ${
                          tk.priority === 'Urgent' ? 'text-rose-700' : 'text-slate-700'
                        }`}
                      >
                        {tk.priority}
                      </span>
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap text-xs text-slate-600">
                      <div className="font-mono tabular-nums">
                        {formatShortDate(tk.reportedDate)}
                      </div>
                      <div className="text-[11px] text-slate-400">{tk.reportedBy}</div>
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap font-mono tabular-nums text-xs text-slate-700">
                      {tk.resolvedDate
                        ? `Resolved ${formatShortDate(tk.resolvedDate)}`
                        : formatShortDate(tk.targetDate)}
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap text-xs">
                      {tk.status === 'Open' && (
                        <span className="inline-flex items-center gap-1.5 font-medium text-rose-700">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Open
                        </span>
                      )}
                      {tk.status === 'In Progress' && (
                        <span className="inline-flex items-center gap-1.5 font-medium text-amber-700">
                          <Clock className="w-3.5 h-3.5" />
                          In Progress
                        </span>
                      )}
                      {tk.status === 'Resolved' && (
                        <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Resolved
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {tk.status === 'Open' && (
                          <button
                            type="button"
                            onClick={() => onUpdateStatus(tk.id, 'In Progress')}
                            className="px-2.5 py-1 text-xs font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 rounded transition-colors cursor-pointer"
                          >
                            Start Follow-Up
                          </button>
                        )}
                        {tk.status !== 'Resolved' ? (
                          <button
                            type="button"
                            onClick={() => onUpdateStatus(tk.id, 'Resolved')}
                            className="px-2.5 py-1 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded transition-colors cursor-pointer"
                          >
                            Mark Resolved
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onUpdateStatus(tk.id, 'Open')}
                            className="px-2.5 py-1 text-xs font-medium text-slate-700 border border-slate-200 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                          >
                            Reopen
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onDeleteTicket(tk.id)}
                          title="Delete ticket"
                          className="p-1.5 text-slate-400 hover:text-rose-700 rounded transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Add Ticket Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-lg w-full max-w-lg shadow-lg">
            <div className="px-5 py-4 border-b border-slate-200">
              <h3 className="text-base font-semibold text-slate-900">Log Maintenance Follow-Up</h3>
            </div>
            <form onSubmit={handleCreateTicket} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Issue Description
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Suction regulator gauge cracked at CCU Bed 02"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Assigned Department
                  </label>
                  <select
                    value={newDept}
                    onChange={(e) =>
                      setNewDept(e.target.value as MaintenanceTicket['department'])
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  >
                    <option value="Biomedical Engineering">Biomedical Engineering</option>
                    <option value="Facilities & HVAC">Facilities &amp; HVAC</option>
                    <option value="Fire Safety">Fire Safety</option>
                    <option value="Pharmacy & Supply">Pharmacy &amp; Supply</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Ward Unit</label>
                  <select
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value as WardUnit)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  >
                    <option value="CCU">CCU</option>
                    <option value="SD">SD</option>
                    <option value="General Ward">General Ward</option>
                    <option value="All Units">All Units</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Source Area
                  </label>
                  <input
                    type="text"
                    value={newArea}
                    onChange={(e) => setNewArea(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as TicketPriority)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  >
                    <option value="Urgent">Urgent</option>
                    <option value="Routine">Routine</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Target Date
                  </label>
                  <input
                    type="date"
                    value={newTargetDate}
                    onChange={(e) => setNewTargetDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
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
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
