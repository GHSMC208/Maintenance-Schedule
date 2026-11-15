import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ScheduleTask, TaskFrequency, WardUnit } from '../types/ward';
import { formatShortDate, getTaskDueState, getTodayIso } from '../utils/dateUtils';
import type { NavSectionId } from './Sidebar';

interface OverviewScheduleViewProps {
  tasks: ScheduleTask[];
  defaultInspector: string;
  expiringCount: number;
  expiredCount: number;
  openTicketsCount: number;
  criticalOxygenCount: number;
  onCompleteTask: (
    taskId: string,
    inspector: string,
    outcome: 'completed' | 'follow-up',
    notes?: string
  ) => void;
  onReopenTask: (taskId: string) => void;
  onAddTask: (task: Omit<ScheduleTask, 'id'>) => void;
  onDeleteTask: (taskId: string) => void;
  onNavigate: (nav: NavSectionId) => void;
}

export function OverviewScheduleView({
  tasks,
  defaultInspector,
  expiringCount,
  expiredCount,
  openTicketsCount,
  criticalOxygenCount,
  onCompleteTask,
  onReopenTask,
  onAddTask,
  onDeleteTask,
  onNavigate,
}: OverviewScheduleViewProps) {
  const today = getTodayIso();
  const [freqFilter, setFreqFilter] = useState<'all' | 'weekly' | 'monthly' | 'attention'>('all');
  const [unitFilter, setUnitFilter] = useState<'All' | WardUnit>('All');
  const [search, setSearch] = useState('');

  const [completingTask, setCompletingTask] = useState<ScheduleTask | null>(null);
  const [inspectorName, setInspectorName] = useState(defaultInspector);
  const [completionNotes, setCompletionNotes] = useState('');
  const [outcomeChoice, setOutcomeChoice] = useState<'completed' | 'follow-up'>('completed');

  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Medical Equipment');
  const [newUnit, setNewUnit] = useState<WardUnit>('All Units');
  const [newFrequency, setNewFrequency] = useState<TaskFrequency>('weekly');
  const [newDueDate, setNewDueDate] = useState(today);
  const [newRole, setNewRole] = useState('Charge Nurse');
  const [newNotes, setNewNotes] = useState('');

  const dueOrOverdueCount = useMemo(() => {
    return tasks.filter((t) => {
      const due = getTaskDueState(t, today);
      return (due.state === 'overdue' || due.state === 'follow-up') && t.status !== 'completed';
    }).length;
  }, [tasks, today]);

  const filteredTasks = useMemo(() => {
    return tasks
      .filter((t) => {
        if (freqFilter === 'weekly' && t.frequency !== 'weekly') return false;
        if (freqFilter === 'monthly' && t.frequency !== 'monthly') return false;
        if (freqFilter === 'attention') {
          const due = getTaskDueState(t, today);
          if (due.state !== 'overdue' && due.state !== 'due-soon' && due.state !== 'follow-up') {
            return false;
          }
        }
        if (unitFilter !== 'All' && t.unit !== unitFilter) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          const hay = `${t.title} ${t.category} ${t.assignedRole} ${t.notes}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [tasks, freqFilter, unitFilter, search, today]);

  const openCompleteModal = (task: ScheduleTask) => {
    setCompletingTask(task);
    setInspectorName(defaultInspector);
    setCompletionNotes(task.notes);
    setOutcomeChoice('completed');
  };

  const handleConfirmComplete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingTask) return;
    onCompleteTask(completingTask.id, inspectorName.trim() || defaultInspector, outcomeChoice, completionNotes);
    setCompletingTask(null);
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onAddTask({
      title: newTitle.trim(),
      category: newCategory,
      unit: newUnit,
      frequency: newFrequency,
      dueDate: newDueDate || today,
      lastCompletedDate: null,
      lastInspector: null,
      status: 'pending',
      assignedRole: newRole.trim() || 'Ward Nurse',
      notes: newNotes.trim(),
    });
    setNewTitle('');
    setNewNotes('');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Top 4-Metric Ward Readiness Strip */}
      <section
        aria-label="Ward Maintenance Summary"
        className="bg-white border border-slate-200 rounded-lg grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200"
      >
        <button
          type="button"
          onClick={() => setFreqFilter('attention')}
          className="p-5 text-left hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <div className="text-xs font-medium text-slate-500">Overdue &amp; Follow-Up Tasks</div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span
              className={`text-2xl font-semibold font-mono tabular-nums ${
                dueOrOverdueCount > 0 ? 'text-rose-700' : 'text-slate-900'
              }`}
            >
              {dueOrOverdueCount}
            </span>
            <span className="text-xs text-slate-500 tabular-nums">
              of {tasks.length} total
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-600">
            Weekly &amp; monthly schedule items
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('inv:blood-trolley')}
          className="p-5 text-left hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <div className="text-xs font-medium text-slate-500">Expired / Expiring &le; 30d</div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span
              className={`text-2xl font-semibold font-mono tabular-nums ${
                expiredCount > 0 ? 'text-rose-700' : expiringCount > 0 ? 'text-amber-700' : 'text-emerald-700'
              }`}
            >
              {expiredCount + expiringCount}
            </span>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              {expiredCount} expired · {expiringCount} soon
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-600">
            Stores, trolleys, IV meds &amp; transfer bag
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('oxygen')}
          className="p-5 text-left hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <div className="text-xs font-medium text-slate-500">Oxygen Cylinder Alerts</div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span
              className={`text-2xl font-semibold font-mono tabular-nums ${
                criticalOxygenCount > 0 ? 'text-rose-700' : 'text-emerald-700'
              }`}
            >
              {criticalOxygenCount}
            </span>
            <span className="text-xs text-slate-500">
              {criticalOxygenCount > 0 ? 'Below 500 PSI' : 'All cylinders ready'}
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-600">
            Weekly cylinder pressure &amp; valve tool
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('maintenance')}
          className="p-5 text-left hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <div className="text-xs font-medium text-slate-500">Open Maintenance Tickets</div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span
              className={`text-2xl font-semibold font-mono tabular-nums ${
                openTicketsCount > 0 ? 'text-amber-700' : 'text-slate-900'
              }`}
            >
              {openTicketsCount}
            </span>
            <span className="text-xs text-slate-500">Biomed, Fire &amp; HVAC</span>
          </div>
          <div className="mt-1 text-xs text-slate-600">
            Equipment &amp; environmental follow-ups
          </div>
        </button>
      </section>

      {/* Main Maintenance Schedule Workspace */}
      <section className="bg-white border border-slate-200 rounded-lg">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Frequency Segmented Filter */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(
                [
                  { id: 'all', label: 'All Tasks' },
                  { id: 'weekly', label: 'Weekly' },
                  { id: 'monthly', label: 'Monthly' },
                  { id: 'attention', label: 'Due / Overdue' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFreqFilter(tab.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    freqFilter === tab.id
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Ward Unit Filter */}
            <select
              aria-label="Filter by ward unit"
              value={unitFilter}
              onChange={(e) => setUnitFilter(e.target.value as 'All' | WardUnit)}
              className="text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-700"
            >
              <option value="All">All Ward Units</option>
              <option value="CCU">CCU</option>
              <option value="SD">Step-Down (SD)</option>
              <option value="General Ward">General Ward</option>
              <option value="All Units">Ward-Wide</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tasks or area..."
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-md w-56 focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Schedule Task
            </button>
          </div>
        </div>

        {/* Data Table */}
        {filteredTasks.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
            <h3 className="mt-3 text-sm font-semibold text-slate-900">No matching maintenance tasks</h3>
            <p className="mt-1 text-xs text-slate-500">
              Adjust your frequency or ward unit filter, or add a new recurring task.
            </p>
            <button
              type="button"
              onClick={() => {
                setFreqFilter('all');
                setUnitFilter('All');
                setSearch('');
              }}
              className="mt-4 px-3.5 py-1.5 text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-md transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-medium text-slate-500">
                  <th className="py-2.5 px-4">Task &amp; Area</th>
                  <th className="py-2.5 px-3">Cadence</th>
                  <th className="py-2.5 px-3">Unit</th>
                  <th className="py-2.5 px-3">Next Due</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Last Completed</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredTasks.map((task) => {
                  const due = getTaskDueState(task, today);
                  const isCompletedRecently = task.status === 'completed' && due.daysLeft > 3;

                  return (
                    <tr key={task.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 max-w-md">
                        <div className="font-medium text-slate-900 leading-snug">{task.title}</div>
                        <div className="mt-0.5 text-xs text-slate-500 flex flex-wrap items-center gap-1.5">
                          <span>{task.category}</span>
                          <span aria-hidden="true">·</span>
                          <span>{task.assignedRole}</span>
                          {task.notes && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="truncate max-w-xs" title={task.notes}>
                                {task.notes}
                              </span>
                            </>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap text-xs text-slate-700 font-medium capitalize">
                        {task.frequency}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap text-xs text-slate-700">
                        {task.unit}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap font-mono tabular-nums text-xs text-slate-900">
                        {formatShortDate(task.dueDate)}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap text-xs">
                        {task.status === 'follow-up' ? (
                          <span className="inline-flex items-center gap-1.5 font-medium text-amber-700">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            Follow-Up Needed
                          </span>
                        ) : due.state === 'overdue' ? (
                          <span className="inline-flex items-center gap-1.5 font-medium text-rose-700">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span className="tabular-nums">{due.label}</span>
                          </span>
                        ) : isCompletedRecently ? (
                          <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                            <Clock className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                            <span className="tabular-nums">{due.label}</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap text-xs text-slate-600">
                        {task.lastCompletedDate ? (
                          <div>
                            <div className="font-mono tabular-nums">
                              {formatShortDate(task.lastCompletedDate)}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate max-w-[140px]">
                              {task.lastInspector || '—'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">Not logged yet</span>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openCompleteModal(task)}
                            className="px-2.5 py-1 text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 rounded transition-colors cursor-pointer"
                          >
                            Log Check
                          </button>
                          {task.status === 'completed' && (
                            <button
                              type="button"
                              onClick={() => onReopenTask(task.id)}
                              title="Reopen as pending"
                              className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onDeleteTask(task.id)}
                            title="Delete task"
                            className="p-1 text-slate-400 hover:text-rose-700 rounded transition-colors cursor-pointer"
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
      </section>

      {/* Complete / Log Task Check Modal */}
      {completingTask && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-lg w-full max-w-lg shadow-lg">
            <div className="px-5 py-4 border-b border-slate-200">
              <h3 className="text-base font-semibold text-slate-900">Log Maintenance Check</h3>
              <p className="text-xs text-slate-500 mt-0.5">{completingTask.title}</p>
            </div>
            <form onSubmit={handleConfirmComplete} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Inspector Name / Initials
                </label>
                <input
                  type="text"
                  required
                  value={inspectorName}
                  onChange={(e) => setInspectorName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Inspection Outcome
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setOutcomeChoice('completed')}
                    className={`px-3 py-2 text-xs font-medium rounded-md border text-left transition-colors cursor-pointer ${
                      outcomeChoice === 'completed'
                        ? 'border-teal-700 bg-teal-50 text-teal-900'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div>Completed &amp; Passed</div>
                    <div className="text-[11px] font-normal text-slate-500 mt-0.5">
                      Advances next {completingTask.frequency} due date
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOutcomeChoice('follow-up')}
                    className={`px-3 py-2 text-xs font-medium rounded-md border text-left transition-colors cursor-pointer ${
                      outcomeChoice === 'follow-up'
                        ? 'border-amber-600 bg-amber-50 text-amber-900'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div>Needs Follow-Up</div>
                    <div className="text-[11px] font-normal text-slate-500 mt-0.5">
                      Keeps task flagged for action
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Inspection Findings / Notes
                </label>
                <textarea
                  rows={3}
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  placeholder="Record deficiencies, replacement orders, or confirmation..."
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCompletingTask(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors cursor-pointer"
                >
                  Save Check Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Schedule Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-lg w-full max-w-lg shadow-lg">
            <div className="px-5 py-4 border-b border-slate-200">
              <h3 className="text-base font-semibold text-slate-900">New Scheduled Maintenance Task</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Add a recurring weekly or monthly ward checklist task
              </p>
            </div>
            <form onSubmit={handleCreateTask} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Crash Cart Defibrillator Weekly Test & Pad Expiry"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Ward Area</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  >
                    <option>Medical Equipment</option>
                    <option>Store Items</option>
                    <option>Preparation Room</option>
                    <option>Blood Collection Trolley</option>
                    <option>Procedure Trolley</option>
                    <option>Stock IV Fluids &amp; Meds</option>
                    <option>Emergency Transfer Bag</option>
                    <option>Environmental Round</option>
                    <option>Oxygen Cylinders</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Ward Unit</label>
                  <select
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value as WardUnit)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  >
                    <option value="All Units">All Units</option>
                    <option value="CCU">CCU</option>
                    <option value="SD">SD</option>
                    <option value="General Ward">General Ward</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Frequency</label>
                  <select
                    value={newFrequency}
                    onChange={(e) => setNewFrequency(e.target.value as TaskFrequency)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">First Due Date</label>
                  <input
                    type="date"
                    required
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Assigned Role</label>
                  <input
                    type="text"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Protocol Notes</label>
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
                  Add Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
