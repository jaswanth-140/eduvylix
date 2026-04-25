import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { jsPDF } from "jspdf";

import api from "../services/api";
import { useAuth } from "../hooks/useAuth";

function StudentProfilePage() {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();
  const canManageDiscipline = isAuthenticated;
  const [student, setStudent] = useState(null);
  const [trends, setTrends] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyFilters, setHistoryFilters] = useState({ category: "", direction: "", start: "", end: "" });
  const [weeklyReport, setWeeklyReport] = useState(null);
  const [monthlyReport, setMonthlyReport] = useState(null);
  const [activityHistory, setActivityHistory] = useState([]);
  const [collegeTop, setCollegeTop] = useState([]);
  const [groupRank, setGroupRank] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [updateError, setUpdateError] = useState("");
  const [updateMessage, setUpdateMessage] = useState("");
  const [isSubmittingUpdate, setIsSubmittingUpdate] = useState(false);
  const [disciplineForm, setDisciplineForm] = useState({
    behavior: 0,
    category: "",
    reason: "",
    details: "",
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: studentData } = await api.get(`/students/${id}`);
        setStudent(studentData.item);

        try {
          const [{ data: weekly }, { data: monthly }] = await Promise.all([
            api.get(`/analytics/student-report/${id}`, { params: { period: "weekly" } }),
            api.get(`/analytics/student-report/${id}`, { params: { period: "monthly" } }),
          ]);
          setWeeklyReport(weekly);
          setMonthlyReport(monthly);
        } catch {
          setWeeklyReport(null);
          setMonthlyReport(null);
        }

        try {
          const { data: historyData } = await api.get(`/students/${id}/discipline-history`, {
            params: {
              category: historyFilters.category || undefined,
              direction: historyFilters.direction || undefined,
              start: historyFilters.start || undefined,
              end: historyFilters.end || undefined,
            },
          });
          setHistory(historyData.items || []);
        } catch {
          setHistory([]);
        }

        if (localStorage.getItem("token")) {
          try {
            const [{ data: trendData }, { data: suggestionData }] = await Promise.all([
              api.get(`/analytics/trends/${id}`),
              api.get(`/analytics/ai-suggestions/${id}`),
            ]);
            setTrends(
              (trendData.trends || []).map((item) => ({
                ...item,
                label: new Date(item.timestamp).toLocaleDateString(),
              }))
            );
            setSuggestions(suggestionData.suggestions || []);
          } catch {
            setTrends([]);
            setSuggestions([]);
          }
        }

        // Extra dashboard widgets (safe for public use)
        try {
          const end = new Date();
          const start = new Date();
          start.setDate(end.getDate() - 83);
          const { data: activityData } = await api.get(`/students/${id}/discipline-history`, {
            params: { start: start.toISOString(), end: end.toISOString() },
          });
          setActivityHistory(activityData.items || []);
        } catch {
          setActivityHistory([]);
        }

        try {
          const item = studentData.item;
          if (item?.college_id) {
            const { data: topData } = await api.get(`/leaderboard/college/${item.college_id}`);
            setCollegeTop((topData.items || []).slice(0, 5));
          } else {
            setCollegeTop([]);
          }
        } catch {
          setCollegeTop([]);
        }

        try {
          const item = studentData.item;
          if (item?.college_id && item?.department && item?.year != null) {
            const { data: groupData } = await api.get("/leaderboard/global", {
              params: {
                college_id: item.college_id,
                department: item.department,
                year: item.year,
              },
            });
            const groupItems = groupData.items || [];
            const index = groupItems.findIndex((s) => String(s._id) === String(item._id));
            if (index >= 0) {
              setGroupRank({ rank: index + 1, total: groupItems.length });
            } else {
              setGroupRank(null);
            }
          } else {
            setGroupRank(null);
          }
        } catch {
          setGroupRank(null);
        }
      } catch {
        setStudent(null);
      }
    };

    fetchProfile();
  }, [id, historyFilters.category, historyFilters.direction, historyFilters.start, historyFilters.end, reloadKey]);

  useEffect(() => {
    if (!student) return;
    setDisciplineForm((prev) => ({
      ...prev,
      behavior: Number(student.behavior ?? 0),
    }));
  }, [student]);

  const initials = useMemo(() => {
    const name = (student?.name || "").trim();
    if (!name) return "S";
    const parts = name.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] || "S";
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
    return (first + last).toUpperCase();
  }, [student?.name]);

  const lastUpdated = useMemo(() => {
    const latest = (activityHistory && activityHistory.length > 0 ? activityHistory[0] : history[0]) || null;
    const ts = latest?.applied_at || latest?.created_at || student?.updated_at || null;
    if (!ts) return "-";
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return "-";
    }
  }, [activityHistory, history, student?.updated_at]);

  const weeklyDelta = useMemo(() => weeklyReport?.change?.delta || null, [weeklyReport]);

  const nextScorePreview = useMemo(() => {
    const behavior = Number(disciplineForm.behavior || 0);
    return behavior.toFixed(2);
  }, [disciplineForm.behavior]);

  const submitDisciplineUpdate = async () => {
    setUpdateError("");
    setUpdateMessage("");
    setIsSubmittingUpdate(true);
    try {
      const response = await api.post(`/students/${id}/discipline-updates`, {
        behavior: Number(disciplineForm.behavior),
        justification: {
          category: disciplineForm.category,
          reason: disciplineForm.reason,
          details: disciplineForm.details,
        },
      });

      if (response.status === 202) {
        setUpdateMessage("Update submitted for approval.");
      } else {
        setUpdateMessage("Discipline score updated successfully.");
      }

      setDisciplineForm((prev) => ({
        ...prev,
        category: "",
        reason: "",
        details: "",
      }));
      setReloadKey((k) => k + 1);
    } catch (error) {
      setUpdateError(error?.response?.data?.message || "Unable to update discipline score.");
    } finally {
      setIsSubmittingUpdate(false);
    }
  };

  const activityDays = useMemo(() => {
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    const start = new Date(end);
    start.setDate(end.getDate() - 83);

    const counts = new Map();
    (activityHistory || []).forEach((item) => {
      const ts = item.applied_at || item.created_at;
      if (!ts) return;
      const d = new Date(ts);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString().slice(0, 10);
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    const days = [];
    for (let i = 0; i < 84; i += 1) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      days.push({
        key,
        date: new Date(d),
        count: counts.get(key) || 0,
      });
    }
    return days;
  }, [activityHistory]);

  const downloadPdfReport = () => {
    if (!student) {
      return;
    }
    const doc = new jsPDF();
    const lines = [];

    lines.push(`Student Report`);
    lines.push(`Name: ${student.name}`);
    lines.push(`Roll No: ${student.roll_number || "-"}`);
    lines.push(`College/School: ${student.college_name || student.college_id || "-"}`);
    lines.push(`Department: ${student.department || "-"} | Year: ${student.year || "-"}`);
    if (student.bio) {
      lines.push(`Bio: ${student.bio}`);
    }
    lines.push("");
    lines.push(`Current Discipline Score: ${student.discipline_score}`);
    lines.push(`Ranks: Global #${student.rank_global ?? "-"} | College #${student.rank_college ?? "-"}`);
    lines.push(`Breakdown: Behavior ${student.behavior}`);

    if (weeklyReport?.change?.delta) {
      lines.push("");
      lines.push(`Weekly: ΔScore ${weeklyReport.change.delta.discipline_score} (${weeklyReport.summary?.trend || "-"}), Updates ${weeklyReport.summary?.updates_count ?? 0}`);
    }
    if (monthlyReport?.change?.delta) {
      lines.push(`Monthly: ΔScore ${monthlyReport.change.delta.discipline_score} (${monthlyReport.summary?.trend || "-"}), Updates ${monthlyReport.summary?.updates_count ?? 0}`);
    }

    if (history.length > 0) {
      lines.push("");
      lines.push("Recent Changes:");
      history.slice(0, 8).forEach((h) => {
        const ts = new Date(h.applied_at || h.created_at).toLocaleString();
        const from = h.previous?.discipline_score;
        const to = h.new?.discipline_score;
        lines.push(`- ${ts}: ${from} → ${to} (${h.category}) ${h.reason}`);
      });
    }

    const wrapped = doc.splitTextToSize(lines.join("\n"), 180);
    doc.text(wrapped, 15, 20);
    const safeName = (student.name || "student").replace(/[^a-z0-9_-]+/gi, "_");
    doc.save(`${safeName}_report.pdf`);
  };

  if (!student) {
    return (
      <div className="min-h-[60vh] rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
        <p className="text-base font-semibold text-slate-700">
          Student data unavailable. Login as admin to view profile details.
        </p>
      </div>
    );
  }

  return (
    <div className="fade-in-up rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 text-slate-100 md:p-6">
      <div className="grid gap-6 lg:grid-cols-12">
        <aside className="lg:col-span-4">
          <div className="sticky top-24 space-y-6">
            <div className="rounded-3xl border border-slate-800/70 bg-slate-900/40 p-6 shadow-soft backdrop-blur transition hover:border-slate-700 md:p-7">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-4">
                  <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-teal-600 to-ocean text-xl font-extrabold text-white">
                    {initials}
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Student</p>
                    <p className="mt-1 text-2xl font-extrabold tracking-tight text-white">{student.name}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-300">Roll No: <span className="text-white">{student.roll_number || "-"}</span></p>
                  </div>
                </div>
              </div>

              <div className="mt-5 space-y-2">
                <p className="text-sm text-slate-300">
                  <span className="font-semibold text-slate-200">{student.college_name || student.college_id || "-"}</span>
                </p>
                <p className="text-sm text-slate-300">
                  {student.department || "-"} • Year {student.year ?? "-"}
                </p>
                <p className="text-xs font-semibold text-slate-400">Last updated: {lastUpdated}</p>
              </div>

              <div className="mt-5">
                <p className="text-sm font-extrabold text-white">Bio</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{student.bio || "No bio added yet."}</p>
                {(student.contact_email || student.contact_phone) && (
                  <p className="mt-3 text-xs text-slate-400">
                    {student.contact_email ? `Email: ${student.contact_email}` : ""}
                    {student.contact_email && student.contact_phone ? " • " : ""}
                    {student.contact_phone ? `Phone: ${student.contact_phone}` : ""}
                  </p>
                )}
              </div>

              <div className="mt-6 grid gap-3">
                <button
                  onClick={downloadPdfReport}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-slate-600 hover:bg-slate-900"
                >
                  Download Report (PDF)
                </button>
                {isAuthenticated && (
                  <Link
                    to={`/admin?editStudentId=${student._id}`}
                    className="w-full rounded-2xl bg-teal-700 px-4 py-2.5 text-center text-sm font-extrabold text-white transition hover:bg-teal-800"
                  >
                    Edit Profile
                  </Link>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800/70 bg-slate-900/40 p-6 shadow-soft backdrop-blur transition hover:border-slate-700 md:p-7">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Batch / Group Rank</p>
                  <p className="mt-2 text-2xl font-extrabold tracking-tight text-white">
                    {groupRank ? `#${groupRank.rank}` : "-"}
                    {groupRank ? <span className="ml-2 text-sm font-semibold text-slate-300">/ {groupRank.total}</span> : null}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">Within same college, department, and year.</p>
                </div>
                <Link
                  to="/leaderboard"
                  className="rounded-2xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-900"
                >
                  View leaderboard
                </Link>
              </div>

              <div className="mt-6">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Top Performers (College)</p>
                <div className="mt-3 space-y-2">
                  {collegeTop.map((s, idx) => (
                    <div
                      key={s._id}
                      className={`flex items-center justify-between rounded-2xl border px-4 py-3 transition ${
                        String(s._id) === String(student._id)
                          ? "border-teal-600/70 bg-teal-900/20"
                          : "border-slate-800/70 bg-slate-900/30 hover:border-slate-700"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-100">#{idx + 1} {s.name}</p>
                        <p className="mt-0.5 text-xs text-slate-400">Roll: {s.roll_number || "-"}</p>
                      </div>
                      <p className="text-lg font-extrabold text-ocean">{s.discipline_score}</p>
                    </div>
                  ))}
                  {collegeTop.length === 0 && <p className="text-sm text-slate-400">No leaderboard data available.</p>}
                </div>
              </div>
            </div>
          </div>
        </aside>

        <section className="lg:col-span-8">
          <div className="rounded-3xl border border-slate-800/70 bg-slate-900/40 p-6 shadow-soft backdrop-blur md:p-8">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Discipline Score</p>
                  <p className="mt-2 text-6xl font-extrabold tracking-tight text-white md:text-7xl">{student.discipline_score}</p>
                  <p className="mt-2 text-sm font-semibold text-slate-300">
                    Global Rank <span className="text-white">#{student.rank_global ?? "-"}</span> • College Rank <span className="text-white">#{student.rank_college ?? "-"}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1 text-xs font-semibold text-slate-200">
                    Weekly Δ {weeklyDelta?.discipline_score ?? 0}
                  </span>
                  <span className="rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1 text-xs font-semibold text-slate-200">
                    Monthly Δ {monthlyReport?.change?.delta?.discipline_score ?? 0}
                  </span>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {[
                  { label: "Discipline Score", value: student.discipline_score, delta: weeklyDelta?.discipline_score },
                  { label: "Behavior Score", value: student.behavior, delta: weeklyDelta?.behavior },
                  { label: "Global Rank", value: `#${student.rank_global ?? "-"}`, delta: null },
                  { label: "College Rank", value: `#${student.rank_college ?? "-"}`, delta: null },
                ].map((card) => {
                  const delta = Number(card.delta ?? 0);
                  const deltaTag =
                    card.delta == null
                      ? "border-slate-700 bg-slate-900/40 text-slate-300"
                      : delta > 0
                        ? "border-emerald-700/60 bg-emerald-900/20 text-emerald-200"
                        : delta < 0
                          ? "border-rose-700/60 bg-rose-900/20 text-rose-200"
                          : "border-slate-700 bg-slate-900/40 text-slate-300";

                  return (
                    <div
                      key={card.label}
                      className="rounded-3xl border border-slate-800/70 bg-slate-950/20 p-6 transition hover:border-slate-700 hover:bg-slate-950/30"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{card.label}</p>
                          <p className="mt-2 text-3xl font-extrabold tracking-tight text-white md:text-4xl">{card.value}</p>
                          <p className="mt-2 text-xs font-semibold text-slate-400">Last updated: {lastUpdated}</p>
                        </div>
                        <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold ${deltaTag}`}>
                          {card.delta == null ? "—" : `Δ ${delta}`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <div className="rounded-3xl border border-slate-800/70 bg-slate-900/40 p-6 shadow-soft backdrop-blur transition hover:border-slate-700 md:p-7 xl:col-span-2">
              <h3 className="text-xl font-extrabold tracking-tight text-white">Discipline Update</h3>
              <p className="mt-1 text-sm text-slate-400">Update discipline metrics with a mandatory reason from this profile page.</p>

              {canManageDiscipline ? (
                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-1">
                    <input
                      type="number"
                      min="-100"
                      max="100"
                      value={disciplineForm.behavior}
                      onChange={(e) => setDisciplineForm((prev) => ({ ...prev, behavior: e.target.value }))}
                      className="rounded-2xl border border-slate-700 bg-slate-950/30 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-900/40"
                      placeholder="Behavior"
                    />
                  </div>

                  <div className="space-y-3">
                    <select
                      value={disciplineForm.category}
                      onChange={(e) => setDisciplineForm((prev) => ({ ...prev, category: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950/30 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-900/40"
                    >
                      <option value="">Select category</option>
                      <option value="Behavior Issue">Behavior Issue</option>
                      <option value="Good Performance">Good Performance</option>
                      <option value="Other">Other</option>
                    </select>
                    <input
                      value={disciplineForm.reason}
                      onChange={(e) => setDisciplineForm((prev) => ({ ...prev, reason: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950/30 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-900/40"
                      placeholder="Reason (required)"
                    />
                    <textarea
                      value={disciplineForm.details}
                      onChange={(e) => setDisciplineForm((prev) => ({ ...prev, details: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950/30 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-900/40"
                      placeholder="Additional details (optional)"
                      rows={3}
                    />
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-200">New score preview: <span className="text-white">{nextScorePreview}</span></p>
                      <button
                        type="button"
                        onClick={submitDisciplineUpdate}
                        disabled={
                          isSubmittingUpdate ||
                          !disciplineForm.category ||
                          !disciplineForm.reason.trim()
                        }
                        className="rounded-2xl bg-teal-700 px-4 py-2 text-sm font-extrabold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isSubmittingUpdate ? "Updating..." : "Update Score"}
                      </button>
                    </div>
                    {updateError ? <p className="text-sm font-semibold text-rose-300">{updateError}</p> : null}
                    {updateMessage ? <p className="text-sm font-semibold text-emerald-300">{updateMessage}</p> : null}
                  </div>
                </div>
              ) : (
                <p className="mt-5 text-sm text-slate-400">Login as admin to update discipline score and reasons.</p>
              )}
            </div>

            <div className="rounded-3xl border border-slate-800/70 bg-slate-900/40 p-6 shadow-soft backdrop-blur transition hover:border-slate-700 md:p-7">
              <h3 className="text-xl font-extrabold tracking-tight text-white">Reports & Analytics</h3>
              <p className="mt-1 text-sm text-slate-400">Weekly + monthly summaries with metric breakdown.</p>

              <div className="mt-5 grid gap-4">
                {[{ label: "Weekly", data: weeklyReport }, { label: "Monthly", data: monthlyReport }].map(({ label, data }) => {
                  const delta = data?.change?.delta?.discipline_score;
                  const trend = data?.summary?.trend;
                  const updatesCount = data?.summary?.updates_count ?? 0;
                  const start = data?.change?.start;
                  const end = data?.change?.end;
                  const d = data?.change?.delta;
                  const deltaClass =
                    delta > 0
                      ? "border-emerald-700/60 bg-emerald-900/20 text-emerald-200"
                      : delta < 0
                        ? "border-rose-700/60 bg-rose-900/20 text-rose-200"
                        : "border-slate-700 bg-slate-950/20 text-slate-300";

                  return (
                    <div key={label} className="rounded-3xl border border-slate-800/70 bg-slate-950/20 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-extrabold text-white">{label} Summary</p>
                          <p className="mt-1 text-xs text-slate-400">Updates: {updatesCount} • Trend: <span className="font-semibold text-slate-200">{trend || "-"}</span></p>
                        </div>
                        <span className={`rounded-full border px-3 py-1 text-xs font-bold ${deltaClass}`}>Δ {delta ?? 0}</span>
                      </div>

                      {start && end && d && (
                        <div className="mt-4 grid gap-3 sm:grid-cols-1">
                          <div className="rounded-2xl border border-slate-800/70 bg-slate-900/30 p-4">
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Behavior</p>
                            <p className="mt-2 text-sm font-semibold text-slate-200">
                              {start.behavior} → {end.behavior} <span className="text-slate-400">(Δ {d.behavior})</span>
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800/70 bg-slate-900/40 p-6 shadow-soft backdrop-blur transition hover:border-slate-700 md:p-7">
              <h3 className="text-xl font-extrabold tracking-tight text-white">Trend Graph</h3>
              <p className="mt-1 text-sm text-slate-400">Improving vs declining discipline score.</p>
              {trends.length > 0 ? (
                <div className="mt-5 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trends}>
                      <XAxis dataKey="label" stroke="#94a3b8" />
                      <YAxis domain={[-100, 100]} stroke="#94a3b8" />
                      <Tooltip />
                      <Line type="monotone" dataKey="discipline_score" stroke="#0ea5e9" strokeWidth={3} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="mt-5 text-sm text-slate-400">Trend chart is available for authenticated admins.</p>
              )}

              <div className="mt-6">
                <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-400">Activity Heatmap</h3>
                <p className="mt-1 text-xs text-slate-400">Last 12 weeks of score update activity.</p>
                <div className="mt-3 grid grid-cols-12 gap-2">
                  {Array.from({ length: 12 }).map((_, col) => (
                    <div key={`col-${col}`} className="grid grid-rows-7 gap-2">
                      {activityDays.slice(col * 7, col * 7 + 7).map((day) => {
                        const level = day.count >= 4 ? 4 : day.count;
                        const cls =
                          level === 0
                            ? "bg-slate-800/30 border-slate-800/60"
                            : level === 1
                              ? "bg-teal-900/30 border-teal-800/50"
                              : level === 2
                                ? "bg-teal-800/40 border-teal-700/60"
                                : level === 3
                                  ? "bg-teal-700/50 border-teal-600/70"
                                  : "bg-teal-600/70 border-teal-500/80";
                        return (
                          <div
                            key={day.key}
                            title={`${day.key}: ${day.count} update(s)`}
                            className={`h-3 w-3 rounded border transition hover:scale-110 ${cls}`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-slate-800/70 bg-slate-900/40 p-6 shadow-soft backdrop-blur transition hover:border-slate-700 md:p-7">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h3 className="text-2xl font-extrabold tracking-tight text-white">Score History</h3>
                <p className="mt-1 text-sm text-slate-400">Full accountability timeline for every discipline change.</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <select
                  value={historyFilters.category}
                  onChange={(e) => setHistoryFilters((prev) => ({ ...prev, category: e.target.value }))}
                  className="rounded-2xl border border-slate-700 bg-slate-950/30 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-900/40"
                >
                  <option value="">All categories</option>
                  <option value="Behavior Issue">Behavior Issue</option>
                  <option value="Good Performance">Good Performance</option>
                  <option value="Other">Other</option>
                </select>
                <select
                  value={historyFilters.direction}
                  onChange={(e) => setHistoryFilters((prev) => ({ ...prev, direction: e.target.value }))}
                  className="rounded-2xl border border-slate-700 bg-slate-950/30 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-900/40"
                >
                  <option value="">All changes</option>
                  <option value="positive">Positive</option>
                  <option value="negative">Negative</option>
                </select>
                <input
                  type="date"
                  value={historyFilters.start}
                  onChange={(e) => setHistoryFilters((prev) => ({ ...prev, start: e.target.value }))}
                  className="rounded-2xl border border-slate-700 bg-slate-950/30 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-900/40"
                />
                <input
                  type="date"
                  value={historyFilters.end}
                  onChange={(e) => setHistoryFilters((prev) => ({ ...prev, end: e.target.value }))}
                  className="rounded-2xl border border-slate-700 bg-slate-950/30 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-900/40"
                />
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {history.map((item) => {
                const delta = Number(item?.delta?.discipline_score ?? 0);
                const positive = delta > 0;
                const negative = delta < 0;
                const border = positive ? "border-emerald-800/50" : negative ? "border-rose-800/50" : "border-slate-800/70";
                const bg = positive ? "bg-emerald-950/15" : negative ? "bg-rose-950/15" : "bg-slate-950/20";
                const tag =
                  positive
                    ? "border-emerald-700/60 bg-emerald-900/20 text-emerald-200"
                    : negative
                      ? "border-rose-700/60 bg-rose-900/20 text-rose-200"
                      : "border-slate-700 bg-slate-900/40 text-slate-200";

                return (
                  <div key={item._id} className={`rounded-3xl border p-6 transition hover:border-slate-700 ${border} ${bg}`}>
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-lg font-extrabold tracking-tight text-white">
                          {item.category}{" "}
                          <span className={`ml-2 rounded-full border px-3 py-1 text-xs font-bold ${tag}`}>Δ {delta}</span>
                          {item.suspicious && (
                            <span className="ml-2 rounded-full border border-orange-700/60 bg-orange-900/20 px-3 py-1 text-xs font-bold text-orange-200">Flagged</span>
                          )}
                        </p>
                        <p className="mt-1 text-sm text-slate-400">
                          {new Date(item.applied_at || item.created_at).toLocaleString()} • By {item.actor?.name || "Admin"} ({item.actor?.role || "admin"})
                        </p>
                      </div>
                      <div className="text-sm text-slate-400">
                        {item.status && <span className="rounded-full border border-slate-700 bg-slate-900/40 px-3 py-1 font-semibold text-slate-200">{item.status}</span>}
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl border border-slate-800/70 bg-slate-900/30 p-5">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Old → New</p>
                        <p className="mt-3 text-base text-slate-200">
                          Score: <span className="font-semibold">{item.previous?.discipline_score}</span> →{" "}
                          <span className="font-semibold">{item.new?.discipline_score}</span>
                        </p>
                        <p className="text-sm text-slate-300">Behavior: {item.previous?.behavior} → {item.new?.behavior}</p>
                      </div>

                      <div className="rounded-2xl border border-slate-800/70 bg-slate-900/30 p-5">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Reason</p>
                        <p className="mt-3 text-base font-semibold text-white">{item.reason}</p>
                        {item.details && <p className="mt-2 text-sm text-slate-300">{item.details}</p>}
                        {item.reviewer && (
                          <p className="mt-3 text-sm text-slate-400">
                            Reviewed by {item.reviewer.name} ({item.reviewer.role})
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {history.length === 0 && <p className="text-sm text-slate-400">No discipline change history yet.</p>}
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-slate-800/70 bg-slate-900/40 p-6 shadow-soft backdrop-blur transition hover:border-slate-700 md:p-7">
            <h3 className="text-xl font-extrabold tracking-tight text-white">Platform Overview</h3>
            <p className="mt-1 text-sm text-slate-400">Behavior and score breakdown at a glance.</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-slate-800/70 bg-slate-950/20 p-6">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Behavior Overview</p>
                <p className="mt-2 text-3xl font-extrabold text-white">{student.behavior}</p>
                <p className="mt-2 text-sm text-slate-300">Weekly change: <span className="font-semibold text-slate-100">{weeklyDelta?.behavior ?? 0}</span></p>
                <p className="mt-1 text-xs text-slate-400">Last updated: {lastUpdated}</p>
              </div>
              <div className="rounded-3xl border border-slate-800/70 bg-slate-950/20 p-6">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Discipline Breakdown</p>
                <p className="mt-2 text-3xl font-extrabold text-white">{student.discipline_score}</p>
                <p className="mt-2 text-sm text-slate-300">
                  Behavior {student.behavior}
                </p>
                <p className="mt-1 text-xs text-slate-400">Last updated: {lastUpdated}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-slate-800/70 bg-slate-900/40 p-6 shadow-soft backdrop-blur transition hover:border-slate-700 md:p-7">
            <h3 className="text-xl font-extrabold tracking-tight text-white">AI Suggestions</h3>
            <p className="mt-1 text-sm text-slate-400">Recommendations based on recent activity.</p>
            {suggestions.length > 0 ? (
              <ul className="mt-5 space-y-3">
                {suggestions.map((suggestion, index) => (
                  <li key={`${suggestion}-${index}`} className="rounded-3xl border border-slate-800/70 bg-slate-950/20 px-5 py-4 text-sm text-slate-200 transition hover:border-slate-700">
                    {suggestion}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-5 text-sm text-slate-400">AI suggestions are available for authenticated admins.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default StudentProfilePage;
