import type { MaintenanceTicket, TicketPriority, WardUnit } from '../types/ward';
import { formatShortDate, getTodayIso } from '../utils/dateUtils';

export type MaintenancePrintStatusFilter =
  | 'active'
  | 'equipment'
  | 'gh0030'
  | 'resolved'
  | 'all';

interface MaintenanceFollowUpPrintViewProps {
  tickets: MaintenanceTicket[];
  wardName?: string;
  defaultInspector: string;
  statusFilter: MaintenancePrintStatusFilter;
  unitFilter?: 'All' | WardUnit;
  departmentFilter?: 'All' | MaintenanceTicket['department'];
  priorityFilter?: 'All' | TicketPriority;
}

const STATUS_FILTER_LABELS: Record<MaintenancePrintStatusFilter, string> = {
  active: 'Active Follow-Ups (Open & In Progress)',
  equipment: 'Medical Equipment Maintenance & Repair Log',
  gh0030: 'GH0030 Environmental Round Follow-Ups',
  resolved: 'Resolved / Completed Tickets',
  all: 'All Maintenance & Work Order Tickets',
};

export function MaintenanceFollowUpPrintView({
  tickets,
  wardName,
  defaultInspector,
  statusFilter,
  unitFilter = 'All',
  departmentFilter = 'All',
  priorityFilter = 'All',
}: MaintenanceFollowUpPrintViewProps) {
  const today = getTodayIso();
  const [y, m, d] = today.split('-');
  const displayDate = `${d}/${m}/${y}`;
  const displayMonthYear = new Date(
    Number(y),
    Math.max(0, Number(m) - 1),
    Number(d)
  ).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const displayWard = wardName?.trim() || 'Ward 208 (CCU & SD)';

  const filteredTickets = tickets.filter((tk) => {
    if (statusFilter === 'active' && tk.status === 'Resolved') return false;
    if (
      statusFilter === 'equipment' &&
      !tk.linkedEquipmentLogId &&
      !tk.sourceArea.toLowerCase().includes('equipment') &&
      tk.department !== 'Biomedical Engineering'
    ) {
      return false;
    }
    if (
      statusFilter === 'gh0030' &&
      !tk.linkedFollowUpId &&
      !tk.sourceArea.toLowerCase().includes('gh0030') &&
      !tk.sourceArea.toLowerCase().includes('environmental')
    ) {
      return false;
    }
    if (statusFilter === 'resolved' && tk.status !== 'Resolved') return false;
    if (unitFilter !== 'All' && tk.unit !== unitFilter) return false;
    if (departmentFilter !== 'All' && tk.department !== departmentFilter) return false;
    if (priorityFilter !== 'All' && tk.priority !== priorityFilter) return false;
    return true;
  });

  const openCount = filteredTickets.filter((t) => t.status === 'Open').length;
  const inProgressCount = filteredTickets.filter((t) => t.status === 'In Progress').length;
  const resolvedCount = filteredTickets.filter((t) => t.status === 'Resolved').length;
  const urgentCount = filteredTickets.filter(
    (t) => t.priority === 'Urgent' && t.status !== 'Resolved'
  ).length;

  const ROWS_PER_PAGE = 12;
  const pages: MaintenanceTicket[][] = [];
  if (filteredTickets.length === 0) {
    pages.push([]);
  } else {
    for (let i = 0; i < filteredTickets.length; i += ROWS_PER_PAGE) {
      pages.push(filteredTickets.slice(i, i + ROWS_PER_PAGE));
    }
  }

  const totalPages = pages.length;

  const scopeParts = [
    STATUS_FILTER_LABELS[statusFilter],
    unitFilter !== 'All' ? `Unit: ${unitFilter}` : null,
    departmentFilter !== 'All' ? `Dept: ${departmentFilter}` : null,
    priorityFilter !== 'All' ? `Priority: ${priorityFilter}` : null,
  ].filter(Boolean);

  return (
    <div>
      <style>{`@media print { @page { size: A4 portrait; margin: 6mm 8mm; } }`}</style>

      <div className="no-print mb-2 flex items-center justify-between text-[11px] text-slate-600 px-1">
        <span>
          Maintenance Follow-Up &amp; Work Order Report (A4 Portrait) &mdash;{' '}
          <strong className="text-slate-900">
            {totalPages} {totalPages === 1 ? 'page' : 'pages'}
          </strong>{' '}
          ({filteredTickets.length} {filteredTickets.length === 1 ? 'ticket' : 'tickets'})
        </span>
        <span className="text-slate-500">{scopeParts.join(' · ')}</span>
      </div>

      <div className="space-y-5 print:space-y-0">
        {pages.map((chunk, pageIdx) => {
          const isFirstPage = pageIdx === 0;
          const isLastPage = pageIdx === totalPages - 1;
          const startNo = pageIdx * ROWS_PER_PAGE;

          return (
            <div
              key={`mnt-print-pg-${pageIdx}`}
              className="pharmacy-page-portrait bg-white border border-slate-300 shadow-sm mx-auto w-[210mm] min-h-[297mm] p-[7mm_9mm] flex flex-col justify-between text-black appendix2-sans"
            >
              <div className="flex-1 flex flex-col">
                {/* Official Hospital Header */}
                {isFirstPage ? (
                  <div className="mb-2 shrink-0">
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                      <div className="w-[120px] text-[8.5px] text-slate-700">
                        <div>
                          <span className="font-bold">Ward:</span> {displayWard}
                        </div>
                        <div>
                          <span className="font-bold">Date:</span> {displayDate}
                        </div>
                      </div>
                      <img
                        src="/assets/gov_hospitals_header.png"
                        alt="Kingdom of Bahrain Government Hospitals"
                        className="h-[38px] w-auto object-contain mx-auto"
                      />
                      <div className="w-[120px] text-right text-[8.5px] text-slate-700">
                        <div>Page {pageIdx + 1} / {totalPages}</div>
                        <div>{displayMonthYear}</div>
                      </div>
                    </div>

                    <table className="w-full border-collapse border border-black text-[9.5px]">
                      <tbody>
                        <tr>
                          <td
                            colSpan={4}
                            className="border border-black px-2 py-[4px] text-center font-bold text-[11px] tracking-wide uppercase bg-[#0f3d56] text-white"
                          >
                            MAINTENANCE FOLLOW-UP &amp; WORK ORDER REPORT
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-black px-2 py-[2.5px] font-bold bg-[#f8fafc] w-[16%]">
                            Ward / Unit
                          </td>
                          <td className="border border-black px-2 py-[2.5px] w-[34%]">
                            {displayWard}
                            {unitFilter !== 'All' ? ` (${unitFilter})` : ''}
                          </td>
                          <td className="border border-black px-2 py-[2.5px] font-bold bg-[#f8fafc] w-[16%]">
                            Report Date
                          </td>
                          <td className="border border-black px-2 py-[2.5px] w-[34%] tabular-nums">
                            {displayDate}
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-black px-2 py-[2.5px] font-bold bg-[#f8fafc]">
                            Report Scope
                          </td>
                          <td colSpan={3} className="border border-black px-2 py-[2.5px] font-medium">
                            {scopeParts.join(' · ')}
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Summary Metrics Strip */}
                    <table className="w-full border-collapse border border-black border-t-0 text-[8.5px]">
                      <tbody>
                        <tr className="text-center bg-[#f8fafc]">
                          <td className="border-r border-black px-2 py-1 w-[20%]">
                            <div className="text-[7.5px] uppercase text-slate-600 font-bold">
                              Total Shown
                            </div>
                            <div className="text-[11px] font-bold font-mono tabular-nums">
                              {filteredTickets.length}
                            </div>
                          </td>
                          <td className="border-r border-black px-2 py-1 w-[20%] bg-[#fef2f2]">
                            <div className="text-[7.5px] uppercase text-[#991b1b] font-bold">
                              Open
                            </div>
                            <div className="text-[11px] font-bold font-mono tabular-nums text-[#7f1d1d]">
                              {openCount}
                            </div>
                          </td>
                          <td className="border-r border-black px-2 py-1 w-[20%] bg-[#fffbeb]">
                            <div className="text-[7.5px] uppercase text-[#92400e] font-bold">
                              In Progress
                            </div>
                            <div className="text-[11px] font-bold font-mono tabular-nums text-[#78350f]">
                              {inProgressCount}
                            </div>
                          </td>
                          <td className="border-r border-black px-2 py-1 w-[20%] bg-[#ecfdf5]">
                            <div className="text-[7.5px] uppercase text-[#065f46] font-bold">
                              Resolved
                            </div>
                            <div className="text-[11px] font-bold font-mono tabular-nums text-[#065f46]">
                              {resolvedCount}
                            </div>
                          </td>
                          <td className="px-2 py-1 w-[20%]">
                            <div className="text-[7.5px] uppercase text-slate-600 font-bold">
                              Active Urgent
                            </div>
                            <div className="text-[11px] font-bold font-mono tabular-nums text-[#991b1b]">
                              {urgentCount}
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="border border-black mb-2 px-2.5 py-1 bg-[#f8fafc] flex items-center justify-between gap-3 shrink-0">
                    <img
                      src="/assets/gov_hospitals_header.png"
                      alt="Government Hospitals"
                      className="h-[22px] w-auto object-contain shrink-0"
                    />
                    <div className="text-[10px] font-bold uppercase tracking-wide text-center flex-1">
                      MAINTENANCE FOLLOW-UP &amp; WORK ORDER REPORT &mdash; {displayDate}
                    </div>
                    <div className="text-[8.5px] text-slate-700 shrink-0">
                      {displayWard} &middot; Page {pageIdx + 1}/{totalPages}
                    </div>
                  </div>
                )}

                {/* Maintenance Follow-Up Table */}
                <div className="border-[1.5px] border-black">
                  <div className="bg-[#0f3d56] text-white px-2.5 py-[3px] text-[9px] font-bold uppercase tracking-wide flex items-center justify-between">
                    <span>Maintenance Tickets &amp; Work Order Follow-Up</span>
                    <span className="font-normal normal-case text-[8px] text-slate-200">
                      {openCount + inProgressCount} Active &middot; {resolvedCount} Resolved
                    </span>
                  </div>
                  <table className="w-full border-collapse table-fixed text-[8.4px] leading-[1.22]">
                    <thead>
                      <tr className="bg-[#e8eff5] text-black font-bold text-center">
                        <th className="border-t border-r border-black px-1 py-[3.5px] w-[4%]">#</th>
                        <th className="border-t border-r border-black px-1.5 py-[3.5px] w-[28%] text-left">
                          Issue Description &amp; Follow-Up Notes
                        </th>
                        <th className="border-t border-r border-black px-1.5 py-[3.5px] w-[15%] text-left">
                          Source Area / Unit
                        </th>
                        <th className="border-t border-r border-black px-1 py-[3.5px] w-[13%]">
                          Department
                        </th>
                        <th className="border-t border-r border-black px-1 py-[3.5px] w-[8%]">
                          Priority
                        </th>
                        <th className="border-t border-r border-black px-1 py-[3.5px] w-[11%]">
                          Reported
                        </th>
                        <th className="border-t border-r border-black px-1 py-[3.5px] w-[11%]">
                          Target / Resolved
                        </th>
                        <th className="border-t border-black px-1 py-[3.5px] w-[10%]">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chunk.length === 0 ? (
                        <tr className="bg-white">
                          <td
                            colSpan={8}
                            className="border-t border-black px-3 py-6 text-center text-slate-500 text-[9px]"
                          >
                            No maintenance follow-up tickets match the selected report filter.
                          </td>
                        </tr>
                      ) : (
                        chunk.map((tk, idx) => {
                          const isOpen = tk.status === 'Open';
                          const isInProgress = tk.status === 'In Progress';
                          const isUrgent = tk.priority === 'Urgent';
                          return (
                            <tr key={tk.id} className="bg-white align-top">
                              <td className="border-t border-r border-black px-1 py-[3.5px] text-center font-mono">
                                {startNo + idx + 1}
                              </td>
                              <td className="border-t border-r border-black px-1.5 py-[3.5px] break-words">
                                <div className="font-bold text-black">
                                  {tk.title}
                                  {tk.linkedEquipmentLogId && (
                                    <span className="ml-1 inline-block px-1 py-[0.5px] text-[7px] font-bold bg-[#fffbeb] border border-[#b45309] text-[#92400e] rounded-sm">
                                      EQUIPMENT
                                    </span>
                                  )}
                                  {tk.linkedFollowUpId && (
                                    <span className="ml-1 inline-block px-1 py-[0.5px] text-[7px] font-bold bg-[#f0fdfa] border border-[#0f766e] text-[#115e59] rounded-sm">
                                      GH0030
                                    </span>
                                  )}
                                </div>
                                {tk.notes && (
                                  <div className="text-[7.7px] text-slate-700 mt-[1.5px] break-words">
                                    {tk.notes}
                                  </div>
                                )}
                              </td>
                              <td className="border-t border-r border-black px-1.5 py-[3.5px] break-words">
                                <div className="font-medium">{tk.sourceArea}</div>
                                <div className="text-[7.6px] text-slate-600">{tk.unit}</div>
                              </td>
                              <td className="border-t border-r border-black px-1 py-[3.5px] text-center break-words">
                                {tk.department}
                              </td>
                              <td
                                className={`border-t border-r border-black px-1 py-[3.5px] text-center font-bold ${
                                  isUrgent ? 'text-[#991b1b] bg-[#fef2f2]' : 'text-slate-700'
                                }`}
                              >
                                {tk.priority}
                              </td>
                              <td className="border-t border-r border-black px-1 py-[3.5px] text-center">
                                <div className="font-mono tabular-nums">
                                  {formatShortDate(tk.reportedDate)}
                                </div>
                                <div className="text-[7.5px] text-slate-600 break-words">
                                  {tk.reportedBy}
                                </div>
                              </td>
                              <td className="border-t border-r border-black px-1 py-[3.5px] text-center font-mono tabular-nums">
                                {tk.resolvedDate
                                  ? formatShortDate(tk.resolvedDate)
                                  : formatShortDate(tk.targetDate)}
                              </td>
                              <td
                                className={`border-t border-black px-1 py-[3.5px] text-center font-bold ${
                                  isOpen
                                    ? 'bg-[#fee2e2] text-[#7f1d1d]'
                                    : isInProgress
                                      ? 'bg-[#fef3c7] text-[#78350f]'
                                      : 'bg-[#ecfdf5] text-[#065f46]'
                                }`}
                              >
                                {tk.status}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Sign-Off Footer on Final Page */}
                {isLastPage && (
                  <div className="mt-3 border-[1.5px] border-black shrink-0">
                    <div className="bg-[#0f3d56] text-white px-2.5 py-[2.5px] text-[8.5px] font-bold uppercase tracking-wide flex items-center justify-between">
                      <span>Report Verification &amp; Ward Sign-Off</span>
                      <span className="font-normal normal-case text-[8px] text-slate-200">
                        Maintenance Follow-Up &amp; Work Order Review
                      </span>
                    </div>
                    <table className="w-full border-collapse text-[8.5px]">
                      <thead>
                        <tr className="bg-[#e8eff5] font-bold text-black">
                          <th className="border-t border-r border-black px-2 py-[2.5px] text-left w-[28%]">
                            Role
                          </th>
                          <th className="border-t border-r border-black px-2 py-[2.5px] text-left w-[34%]">
                            Name
                          </th>
                          <th className="border-t border-r border-black px-2 py-[2.5px] text-center w-[16%]">
                            Date
                          </th>
                          <th className="border-t border-black px-2 py-[2.5px] text-center w-[22%]">
                            Signature
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="bg-white">
                          <td className="border-t border-r border-black px-2 py-[4px] font-semibold">
                            Prepared / Checked By
                          </td>
                          <td className="border-t border-r border-black px-2 py-[4px]">
                            {defaultInspector}
                          </td>
                          <td className="border-t border-r border-black px-2 py-[4px] text-center tabular-nums">
                            {displayDate}
                          </td>
                          <td className="border-t border-black px-2 py-[4px]" />
                        </tr>
                        <tr className="bg-white">
                          <td className="border-t border-r border-black px-2 py-[4px] font-semibold">
                            Reviewed By (Head Nurse / In-Charge)
                          </td>
                          <td className="border-t border-r border-black px-2 py-[4px]" />
                          <td className="border-t border-r border-black px-2 py-[4px]" />
                          <td className="border-t border-black px-2 py-[4px]" />
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Page Footer */}
              <div className="mt-2 pt-1 border-t border-slate-300 flex items-center justify-between text-[8px] text-slate-600 shrink-0">
                <span>
                  Maintenance Follow-Up &amp; Work Order Report &middot; {displayWard} &middot;{' '}
                  {displayDate}
                </span>
                <span>
                  Page {pageIdx + 1} of {totalPages}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
