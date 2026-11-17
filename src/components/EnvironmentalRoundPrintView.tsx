import {
  ENVIRONMENTAL_GH0030_GROUPS,
  type EnvironmentalGroupDef,
} from '../data/environmentalRoundSeed';
import type {
  EnvironmentalCheckItem,
  EnvironmentalResponse,
  EnvironmentalRoundMeta,
} from '../types/ward';

interface EnvironmentalRoundPrintViewProps {
  checks: EnvironmentalCheckItem[];
  meta: EnvironmentalRoundMeta;
}

function getEffectiveResponse(item: EnvironmentalCheckItem): EnvironmentalResponse | undefined {
  if (item.response) return item.response;
  if (item.result === 'action-needed') return 'no';
  if (item.result === 'pass') return 'yes';
  return undefined;
}

export function EnvironmentalRoundPrintView({
  checks,
  meta,
}: EnvironmentalRoundPrintViewProps) {
  const checkById = new Map(checks.map((c) => [c.id, c]));
  const customChecks = checks.filter((c) => !c.groupId || !c.groupId.startsWith('gh-'));

  const assignedNames = meta.staffAssignments
    .map((s) => s.staffName.trim())
    .filter(Boolean);
  const surveyedByText = assignedNames.length > 0 ? assignedNames.join(', ') : '—';

  const pagesGroups: EnvironmentalGroupDef[][] = [1, 2, 3, 4, 5, 6].map((pg) =>
    ENVIRONMENTAL_GH0030_GROUPS.filter((g) => g.pageGroup === pg)
  );

  // Follow-up rows (minimum 1 blank row if empty so printable table stays structured)
  const followUpRows = meta.followUpRows;
  const ROWS_PER_FOLLOWUP_PAGE = 14;
  const followUpChunks: typeof followUpRows[] = [];
  if (followUpRows.length === 0) {
    followUpChunks.push([]);
  } else {
    for (let i = 0; i < followUpRows.length; i += ROWS_PER_FOLLOWUP_PAGE) {
      followUpChunks.push(followUpRows.slice(i, i + ROWS_PER_FOLLOWUP_PAGE));
    }
  }

  const totalPages = pagesGroups.length + followUpChunks.length;

  const renderGroupBlock = (grp: EnvironmentalGroupDef, compact: boolean) => {
    const commentText = meta.groupComments?.[grp.id] ?? '';
    return (
      <div key={grp.id} className={compact ? 'mb-1.5' : 'mb-2.5'}>
        {grp.domainHeading && (
          <div className="text-center font-bold text-[11px] text-black tracking-wide mb-0.5 uppercase">
            {grp.domainHeading}
          </div>
        )}

        <table className="w-full border-collapse table-fixed appendix2-sans">
          <colgroup>
            <col />
            <col className="w-[46px]" />
            <col className="w-[46px]" />
            <col className="w-[46px]" />
          </colgroup>
          <thead>
            <tr className="bg-[#b1a0c7] text-black">
              <th className="text-center font-bold text-[10.5px] py-[2px] px-2 border-y border-l border-black">
                {grp.title}
              </th>
              <th className="text-center font-bold text-[10.5px] py-[2px] border border-black">
                No
              </th>
              <th className="text-center font-bold text-[10.5px] py-[2px] border border-black">
                N/A
              </th>
              <th className="text-center font-bold text-[10.5px] py-[2px] border border-black">
                Yes
              </th>
            </tr>
          </thead>
          <tbody>
            {grp.questions.map((q) => {
              const item = checkById.get(q.id);
              const resp = item ? getEffectiveResponse(item) : q.defaultResponse;
              const isNo = resp === 'no';
              const isNa = resp === 'na';
              const isYes = resp === 'yes';

              return (
                <tr key={q.id} className="align-bottom">
                  <td className="pr-2 py-[1.5px] text-[10px] leading-[1.28] text-black">
                    <div className="flex items-end gap-1.5 w-full">
                      <span className="shrink-0">
                        <span className="font-medium mr-1">{q.code})</span>
                        <span>{item?.title || q.text}</span>
                      </span>
                      <span className="flex-1 border-b border-dotted border-slate-600 mb-[2px] min-w-[16px]" />
                    </div>
                  </td>
                  <td
                    className={`border border-black text-center align-middle text-[11px] font-bold py-[1.5px] ${
                      isNo ? 'bg-rose-50 text-rose-800' : 'text-black'
                    }`}
                  >
                    {isNo ? '✓' : ''}
                  </td>
                  <td className="border border-black text-center align-middle text-[11px] font-bold py-[1.5px] text-black">
                    {isNa ? '✓' : ''}
                  </td>
                  <td className="border border-black text-center align-middle text-[11px] font-bold py-[1.5px] text-black">
                    {isYes ? '✓' : ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="mt-0.5 flex items-baseline gap-2 text-[10px] text-black appendix2-sans">
          <span className="font-bold shrink-0">Comments:</span>
          <span className="border-b border-slate-300 flex-1 min-h-[13px] text-[9.5px] text-slate-900">
            {commentText}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div>
      <style>{`@media print { @page { size: A4 landscape; margin: 6mm 9mm; } }`}</style>

      <div className="no-print mb-2 flex items-center justify-between text-[11px] text-slate-600 px-1">
        <span>
          Official SMC Hospital Environmental of Care Checklist (Form GH0030 &middot; A4 Landscape)
          &mdash;{' '}
          <strong className="text-slate-900">
            {totalPages} {totalPages === 1 ? 'page' : 'pages'}
          </strong>{' '}
          ({checks.length} inspection points · {followUpRows.length} follow-up rows)
        </span>
        <span className="text-slate-500">
          Surveyed by: {meta.staffAssignments.filter((s) => s.staffName.trim()).length} assigned
          staff
        </span>
      </div>

      <div className="space-y-5 print:space-y-0">
        {pagesGroups.map((groupsOnPage, idx) => {
          const pageNum = idx + 1;
          const isPage1 = pageNum === 1;
          const isPage2 = pageNum === 2;
          const isPage6 = pageNum === 6;

          return (
            <div
              key={`gh-page-${pageNum}`}
              className="pharmacy-page-landscape bg-white border border-slate-300 shadow-sm mx-auto w-[297mm] min-h-[202mm] p-[6mm_9mm] flex flex-col justify-between text-black appendix2-sheet"
            >
              <div className="flex-1 flex flex-col">
                {isPage1 && (
                  <div className="mb-2.5 shrink-0">
                    <h1 className="text-center text-[13px] font-bold text-black mb-2">
                      Salmaniya Medical Complex Hospital Environmental of Care Checklist
                    </h1>

                    <table className="w-full border-collapse border border-black mb-2 text-[10.5px] appendix2-sans">
                      <colgroup>
                        <col className="w-[155px]" />
                        <col />
                      </colgroup>
                      <tbody>
                        <tr>
                          <td className="border border-black bg-[#d9d9d9] font-bold px-2 py-1">
                            Department/Unit Inspected:
                          </td>
                          <td className="border border-black px-2.5 py-1 font-semibold text-black">
                            {meta.departmentInspected || '—'}
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-black bg-[#d9d9d9] font-bold px-2 py-1">
                            Date and month of Inspection:
                          </td>
                          <td className="border border-black px-2.5 py-1 font-semibold text-black">
                            {meta.inspectionDateMonth || '—'}
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    <table className="w-full border-collapse border border-black text-[10.5px] appendix2-sans">
                      <colgroup>
                        <col className="w-[155px]" />
                        <col className="w-[30%]" />
                        <col className="w-[165px]" />
                        <col />
                      </colgroup>
                      <tbody>
                        <tr>
                          <td className="border border-black bg-[#d9d9d9] font-bold px-2 py-1">
                            Manager/Dept. Head
                          </td>
                          <td className="border border-black px-2.5 py-1 font-medium text-black">
                            {meta.managerHead || '—'}
                          </td>
                          <td className="border border-black bg-[#d9d9d9] font-bold px-2 py-1">
                            Surveyed by (team members names):
                          </td>
                          <td className="border border-black px-2.5 py-1 font-medium text-black">
                            {surveyedByText}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                <div>
                  {groupsOnPage.map((grp) => renderGroupBlock(grp, isPage2))}

                  {isPage6 && customChecks.length > 0 && (
                    <div className="mb-2">
                      <div className="text-center font-bold text-[11px] text-black tracking-wide mb-0.5 uppercase">
                        Additional Ward Safety Checks
                      </div>
                      <table className="w-full border-collapse table-fixed appendix2-sans">
                        <colgroup>
                          <col />
                          <col className="w-[46px]" />
                          <col className="w-[46px]" />
                          <col className="w-[46px]" />
                        </colgroup>
                        <thead>
                          <tr className="bg-[#b1a0c7] text-black">
                            <th className="text-center font-bold text-[10.5px] py-[2px] px-2 border-y border-l border-black">
                              Custom Inspection Items
                            </th>
                            <th className="text-center font-bold text-[10.5px] py-[2px] border border-black">
                              No
                            </th>
                            <th className="text-center font-bold text-[10.5px] py-[2px] border border-black">
                              N/A
                            </th>
                            <th className="text-center font-bold text-[10.5px] py-[2px] border border-black">
                              Yes
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {customChecks.map((item, cIdx) => {
                            const resp = getEffectiveResponse(item);
                            return (
                              <tr key={item.id}>
                                <td className="pr-2 py-[1.5px] text-[10px] text-black">
                                  <div className="flex items-end gap-1.5">
                                    <span className="shrink-0">
                                      <span className="font-medium mr-1">{cIdx + 1})</span>
                                      {item.title}
                                      {item.location ? ` (${item.location})` : ''}
                                    </span>
                                    <span className="flex-1 border-b border-dotted border-slate-600 mb-[2px]" />
                                  </div>
                                </td>
                                <td className="border border-black text-center font-bold text-[11px]">
                                  {resp === 'no' ? '✓' : ''}
                                </td>
                                <td className="border border-black text-center font-bold text-[11px]">
                                  {resp === 'na' ? '✓' : ''}
                                </td>
                                <td className="border border-black text-center font-bold text-[11px]">
                                  {resp === 'yes' ? '✓' : ''}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-1.5 flex items-center justify-between text-[9.5px] text-slate-800 shrink-0">
                <span className="font-semibold">GH0030</span>
                <span className="appendix2-sans text-slate-600">
                  Page {pageNum} of {totalPages}
                </span>
              </div>
            </div>
          );
        })}

        {/* Work Order Follow-Up Action Table & Assigned Team Sign-Off Pages */}
        {followUpChunks.map((chunk, chunkIdx) => {
          const pageNum = pagesGroups.length + chunkIdx + 1;
          const isLastFollowUpPage = chunkIdx === followUpChunks.length - 1;

          return (
            <div
              key={`gh-followup-${chunkIdx}`}
              className="pharmacy-page-landscape bg-white border border-slate-300 shadow-sm mx-auto w-[297mm] min-h-[202mm] p-[6mm_9mm] flex flex-col justify-between text-black appendix2-sheet"
            >
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5 appendix2-sans">
                    <div className="text-[11px] font-bold text-black">
                      Deficiencies / Work Order Follow-Up Log ({meta.departmentInspected || 'Ward'})
                    </div>
                    <div className="text-[10px] text-slate-700">
                      Inspection Period: {meta.inspectionDateMonth || '—'}
                    </div>
                  </div>

                  <table className="w-full border-collapse border border-[#4f81bd] text-[10.5px] appendix2-sans">
                    <colgroup>
                      <col className="w-[34%]" />
                      <col className="w-[12%]" />
                      <col className="w-[24%]" />
                      <col className="w-[14%]" />
                      <col className="w-[16%]" />
                    </colgroup>
                    <thead>
                      <tr className="bg-slate-50 text-black font-bold text-center">
                        <th className="border border-[#4f81bd] px-2 py-1.5">
                          {meta.followUpTableHeader || 'Issue / Defect Noted'}
                        </th>
                        <th className="border border-[#4f81bd] px-2 py-1.5">DATE</th>
                        <th className="border border-[#4f81bd] px-2 py-1.5">
                          RESPONSIBLE DEPARTMENT/PERSON
                        </th>
                        <th className="border border-[#4f81bd] px-2 py-1.5">
                          WORK ORDER SUBMITTED
                        </th>
                        <th className="border border-[#4f81bd] px-2 py-1.5">DATE COMPLETED</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chunk.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="border border-[#4f81bd] px-3 py-4 text-center text-slate-500"
                          >
                            No pending deficiencies or maintenance work orders recorded.
                          </td>
                        </tr>
                      ) : (
                        chunk.map((row) => (
                          <tr key={row.id}>
                            <td
                              className={`border border-[#4f81bd] px-2 py-1.5 font-medium ${
                                row.highlightRed ? 'text-red-600' : 'text-black'
                              }`}
                            >
                              {row.issue}
                            </td>
                            <td className="border border-[#4f81bd] px-2 py-1.5 font-mono text-black">
                              {row.date}
                            </td>
                            <td className="border border-[#4f81bd] px-2 py-1.5 text-black">
                              {row.responsibleDept}
                            </td>
                            <td className="border border-[#4f81bd] px-2 py-1.5 text-center font-bold text-[12px] text-black">
                              {row.workOrderSubmitted ? '✓' : ''}
                            </td>
                            <td className="border border-[#4f81bd] px-2 py-1.5 text-black">
                              {row.dateCompleted}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>

                  {isLastFollowUpPage && meta.followUpFooterNote.trim() && (
                    <div className="mt-4 text-[11px] font-bold text-red-600">
                      {meta.followUpFooterNote}
                    </div>
                  )}
                </div>

                {/* Multi-Staff Survey Team Sign-Off Table */}
                {isLastFollowUpPage && (
                  <div className="mt-4 pt-2 border-t border-slate-300 appendix2-sans">
                    <div className="text-[10px] font-bold text-slate-900 uppercase mb-1">
                      Survey Team &amp; Assigned Staff Sign-Off ({meta.staffAssignments.length}{' '}
                      Assigned)
                    </div>
                    <table className="w-full border-collapse border border-black text-[9.5px]">
                      <thead>
                        <tr className="bg-[#d9d9d9] text-black font-bold text-left">
                          <th className="border border-black px-2 py-1 w-[4%]">#</th>
                          <th className="border border-black px-2 py-1 w-[24%]">Staff Name</th>
                          <th className="border border-black px-2 py-1 w-[22%]">Role / Designation</th>
                          <th className="border border-black px-2 py-1 w-[26%]">
                            Assigned Round Sections
                          </th>
                          <th className="border border-black px-2 py-1 w-[11%]">Date</th>
                          <th className="border border-black px-2 py-1 w-[13%]">Signature</th>
                        </tr>
                      </thead>
                      <tbody>
                        {meta.staffAssignments.map((st, sIdx) => (
                          <tr key={st.id}>
                            <td className="border border-black px-2 py-1 text-center font-mono">
                              {sIdx + 1}
                            </td>
                            <td className="border border-black px-2 py-1 font-semibold">
                              {st.staffName || '—'}
                            </td>
                            <td className="border border-black px-2 py-1">{st.role || '—'}</td>
                            <td className="border border-black px-2 py-1">
                              {st.assignedSections || 'All Round Sections'}
                            </td>
                            <td className="border border-black px-2 py-1 font-mono">
                              {st.checkedDate || '—'}
                            </td>
                            <td className="border border-black px-2 py-1">{st.signature || ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="pt-1.5 flex items-center justify-between text-[9.5px] text-slate-800 shrink-0">
                <span className="font-semibold">GH0030</span>
                <span className="appendix2-sans text-slate-600">
                  Page {pageNum} of {totalPages}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
