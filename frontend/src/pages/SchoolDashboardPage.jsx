import { useEffect, useMemo, useState } from "react";

import api from "../services/api";

function SchoolDashboardPage() {
  const [colleges, setColleges] = useState([]);
  const [students, setStudents] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: collegesData }, { data: studentsData }] = await Promise.all([
        api.get("/colleges"),
        api.get("/leaderboard/global"),
      ]);
      setColleges(collegesData.items || []);
      setStudents(studentsData.items || []);
    };

    fetchData();
  }, []);

  const summary = useMemo(() => {
    const collegeMap = {};
    colleges.forEach((college) => {
      collegeMap[college._id] = {
        college,
        students: [],
      };
    });

    students.forEach((student) => {
      if (!collegeMap[student.college_id]) {
        collegeMap[student.college_id] = {
          college: { _id: student.college_id, name: student.college_id, location: "-" },
          students: [],
        };
      }
      collegeMap[student.college_id].students.push(student);
    });

    return Object.values(collegeMap).map((item) => {
      const sorted = [...item.students].sort((a, b) => b.discipline_score - a.discipline_score);
      const average =
        item.students.length > 0
          ? (item.students.reduce((sum, s) => sum + (s.discipline_score || 0), 0) / item.students.length).toFixed(2)
          : "0.00";
      return {
        ...item,
        top: sorted.slice(0, 3),
        average,
      };
    });
  }, [colleges, students]);

  return (
    <div className="edv-page min-h-[70vh] space-y-6">
      <div className="edv-glass-card p-7 md:p-10">
        <h2 className="edv-title-gradient text-4xl font-extrabold tracking-tight md:text-5xl">School Dashboard</h2>
        <p className="mt-2 text-base text-slate-300 md:text-lg">
          College-wise overview of discipline performance and top students.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {summary.map(({ college, top, average, students: collegeStudents }) => (
          <div key={college._id} className="edv-stat-card rounded-3xl p-7 md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-extrabold tracking-tight text-white">{college.name}</h3>
                <p className="mt-1 text-sm font-semibold text-slate-400">{college.location}</p>
                <p className="mt-3 text-sm font-semibold text-slate-300">Students: {collegeStudents.length}</p>
              </div>
              <div className="shrink-0 rounded-2xl border border-cyan-300/20 bg-slate-950/45 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Average Score</p>
                <p className="mt-1 text-2xl font-extrabold tracking-tight text-cyan-200">{average}</p>
              </div>
            </div>

            <div className="mt-6">
              <p className="text-sm font-extrabold uppercase tracking-wide text-slate-400">Top Students</p>
              <div className="mt-3 space-y-3">
                {top.map((student) => (
                  <div
                    key={student._id}
                    className="flex items-center justify-between rounded-2xl border border-slate-700/70 bg-slate-950/45 px-5 py-4 transition hover:-translate-y-0.5 hover:border-cyan-300/30 hover:bg-slate-900/60"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-white">{student.name}</p>
                      <p className="mt-0.5 text-sm text-slate-400">Roll: {student.roll_number || "-"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Score</p>
                      <p className="mt-1 text-2xl font-extrabold tracking-tight text-cyan-200">{student.discipline_score}</p>
                    </div>
                  </div>
                ))}
                {top.length === 0 && <p className="text-base text-slate-400">No student records yet.</p>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SchoolDashboardPage;
