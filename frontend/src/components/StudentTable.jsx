import { Link } from "react-router-dom";

function StudentTable({ rows, compact = false }) {
  const rankClass = (rank) => {
    if (rank === 1) return "edv-rank-gold";
    if (rank === 2) return "edv-rank-silver";
    if (rank === 3) return "edv-rank-bronze";
    return "edv-rank-default";
  };

  if (!rows.length) {
    return (
      <div className="edv-table-wrap rounded-2xl border border-dashed p-8 text-center shadow-soft">
        <p className="text-sm font-semibold text-slate-200">No students to display yet.</p>
        <p className="mt-1 text-xs text-slate-400">Add records from Admin Dashboard or adjust filters.</p>
      </div>
    );
  }

  return (
    <div className="edv-table-wrap overflow-x-auto rounded-2xl shadow-soft">
      <table className="min-w-full text-left text-sm">
        <thead className="sticky top-0 bg-slate-900/85 backdrop-blur">
          <tr>
            <th className="px-4 py-3 font-bold uppercase tracking-wide text-slate-300">Rank</th>
            <th className="px-4 py-3 font-bold uppercase tracking-wide text-slate-300">Name</th>
            <th className="px-4 py-3 font-bold uppercase tracking-wide text-slate-300">Roll No.</th>
            <th className="px-4 py-3 font-bold uppercase tracking-wide text-slate-300">College</th>
            {!compact && <th className="px-4 py-3 font-bold uppercase tracking-wide text-slate-300">Department</th>}
            {!compact && <th className="px-4 py-3 font-bold uppercase tracking-wide text-slate-300">Year</th>}
            <th className="px-4 py-3 font-bold uppercase tracking-wide text-slate-300">Discipline Score</th>
            {!compact && <th className="px-4 py-3 font-bold uppercase tracking-wide text-slate-300">Behavior</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((student, index) => (
            <tr
              key={student._id || `${student.name}-${index}`}
              className="border-t border-slate-800/70 transition odd:bg-slate-900/25 even:bg-slate-900/10 hover:-translate-y-[1px] hover:bg-cyan-500/8"
            >
              <td className="px-4 py-3">
                <span className={`inline-flex min-w-8 items-center justify-center rounded-full px-2 py-1 text-xs font-bold ${rankClass(index + 1)}`}>
                  {student.rank_global || student.rank_college || index + 1}
                </span>
              </td>
              <td className="px-4 py-3">
                <Link to={`/students/${student._id}`} className="font-semibold text-cyan-300 hover:text-cyan-200 hover:underline">
                  {student.name}
                </Link>
              </td>
              <td className="px-4 py-3 text-slate-300">{student.roll_number || "-"}</td>
              <td className="px-4 py-3 text-slate-300">{student.college_name || student.college_id}</td>
              {!compact && <td className="px-4 py-3 text-slate-300">{student.department}</td>}
              {!compact && <td className="px-4 py-3 text-slate-300">{student.year ?? "-"}</td>}
              <td className="px-4 py-3">
                <span className="inline-flex rounded-full border border-cyan-300/30 bg-cyan-400/10 px-2.5 py-1 text-xs font-bold text-cyan-200 shadow-[0_0_16px_rgba(34,211,238,0.2)]">
                  {student.discipline_score?.toFixed?.(2) ?? student.discipline_score}
                </span>
              </td>
              {!compact && <td className="px-4 py-3 text-slate-300">{student.behavior}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default StudentTable;
