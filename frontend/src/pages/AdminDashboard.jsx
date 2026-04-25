import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Line, LineChart, Legend } from "recharts";

import CollegeForm from "../components/CollegeForm";
import Modal from "../components/Modal";
import StudentForm from "../components/StudentForm";
import StudentTable from "../components/StudentTable";
import { useAuth } from "../hooks/useAuth";
import api from "../services/api";

function clamp01(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function ringStyle(progress) {
  const pct = Math.round(clamp01(progress) * 100);
  const deg = Math.round((pct / 100) * 360);
  return {
    "--deg": `${deg}deg`,
  };
}

function TrendTag({ value, label = "vs last week" }) {
  const n = Number(value ?? 0);
  const cls =
    n > 0
      ? "border-emerald-700/60 bg-emerald-900/20 text-emerald-200"
      : n < 0
        ? "border-rose-700/60 bg-rose-900/20 text-rose-200"
        : "border-slate-700 bg-slate-900/40 text-slate-200";
  const sign = n > 0 ? "+" : "";
  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-bold ${cls}`}>
      {sign}
      {n} <span className="ml-1 text-[10px] font-semibold text-slate-300">{label}</span>
    </span>
  );
}

function KpiCard({ title, value, subtitle, progress = 0, trend }) {
  const style = ringStyle(progress);
  return (
    <div className="edv-stat-card rounded-3xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{title}</p>
          <p className="mt-2 text-3xl font-extrabold tracking-tight text-white md:text-4xl">{value}</p>
          {subtitle ? <p className="mt-2 text-xs font-semibold text-slate-400">{subtitle}</p> : null}
        </div>
        <div className="flex flex-col items-end gap-3">
          <div
            style={style}
            className="relative grid h-12 w-12 place-items-center rounded-full border border-slate-800/70 text-ocean [background:conic-gradient(currentColor_var(--deg),rgba(148,163,184,0.14)_0)]"
          >
            <div className="h-8 w-8 rounded-full bg-slate-950/80" />
          </div>
          {trend !== undefined ? <TrendTag value={trend} /> : null}
        </div>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const { admin } = useAuth();
  const isSuperAdmin = admin?.role === "super_admin";
  const [searchParams, setSearchParams] = useSearchParams();
  const editStudentId = searchParams.get("editStudentId");
  const [handledEditParam, setHandledEditParam] = useState(false);
  const [students, setStudents] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [weeklyReport, setWeeklyReport] = useState([]);
  const [badges, setBadges] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [dashboard, setDashboard] = useState(null);
  const [leaderboardTop, setLeaderboardTop] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [activeNav, setActiveNav] = useState("dashboard");
  const [editingStudent, setEditingStudent] = useState(null);
  const [editingCollege, setEditingCollege] = useState(null);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showCollegeModal, setShowCollegeModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetJustification, setResetJustification] = useState({
    category: "",
    reason: "",
    details: "",
    college_id: "",
    roll_number: "",
  });
  const [resetError, setResetError] = useState("");
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [pendingUpdates, setPendingUpdates] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [actionError, setActionError] = useState("");
  const [adminForm, setAdminForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "college_admin",
    college_id: "",
  });
  const [adminMessage, setAdminMessage] = useState("");
  const [filters, setFilters] = useState({ college_id: "", department: "", year: "", search: "" });

  const adminInitials = useMemo(() => {
    const name = (admin?.name || "").trim();
    if (!name) return "AD";
    const parts = name.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] || "A";
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
    return (first + last).toUpperCase();
  }, [admin?.name]);

  const superAdminNavItems = [
    { id: "dashboard", label: "Dashboard" },
    { id: "colleges", label: "Colleges" },
    { id: "discipline-updates", label: "Discipline Update" },
    { id: "follow-up", label: "Follow Up" },
    { id: "leaderboard", label: "Leaderboard" },
    { id: "notifications", label: "Notifications" },
    { id: "settings", label: "Settings" },
  ];

  const collegeAdminNavItems = [
    { id: "dashboard", label: "Dashboard" },
    { id: "discipline-updates", label: "Discipline Update" },
    { id: "follow-up", label: "Follow Up" },
    { id: "students", label: "Students" },
    { id: "notifications", label: "Notifications" },
  ];

  const navItems = isSuperAdmin ? superAdminNavItems : collegeAdminNavItems;

  const scrollToSection = (id) => {
    setActiveNav(id);
    if (typeof window === "undefined") return;
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const loadData = async () => {
    const results = await Promise.allSettled([
      api.get("/students", { params: filters }),
      api.get("/colleges"),
      api.get("/analytics/weekly-report"),
      api.get("/analytics/badges"),
      api.get("/notifications"),
      api.get("/discipline-updates/pending"),
      api.get("/analytics/dashboard", { params: filters }),
      api.get("/leaderboard/global", { params: { ...filters, sort_by: "discipline_score" } }),
      api.get("/analytics/recent-activity", { params: filters }),
    ]);

    const [
      studentsRes,
      collegesRes,
      reportRes,
      badgesRes,
      notificationsRes,
      pendingRes,
      dashboardRes,
      leaderboardRes,
      activityRes,
    ] = results;

    const studentsItems = studentsRes.status === "fulfilled" ? studentsRes.value.data.items || [] : [];
    const collegesItems = collegesRes.status === "fulfilled" ? collegesRes.value.data.items || [] : [];

    setStudents(studentsItems);
    setColleges(collegesItems);
    setWeeklyReport(reportRes.status === "fulfilled" ? reportRes.value.data.items || [] : []);
    setBadges(badgesRes.status === "fulfilled" ? badgesRes.value.data || null : null);
    setNotifications(notificationsRes.status === "fulfilled" ? notificationsRes.value.data.items || [] : []);
    setUnreadCount(notificationsRes.status === "fulfilled" ? notificationsRes.value.data.unread_count || 0 : 0);
    setPendingCount(pendingRes.status === "fulfilled" ? (pendingRes.value.data.items || []).length : 0);
    setDashboard(dashboardRes.status === "fulfilled" ? dashboardRes.value.data || null : null);
    setLeaderboardTop(
      leaderboardRes.status === "fulfilled" ? (leaderboardRes.value.data.items || []).slice(0, 5) : []
    );
    setRecentActivity(activityRes.status === "fulfilled" ? activityRes.value.data.items || [] : []);

    if (isSuperAdmin) {
      try {
        const adminsRes = await api.get("/admins");
        setAdmins(adminsRes.data.items || []);
      } catch {
        setAdmins([]);
      }
    } else {
      setAdmins([]);
    }
  };

  useEffect(() => {
    loadData();
  }, [filters.college_id, filters.department, filters.year, filters.search, isSuperAdmin]);

  useEffect(() => {
    if (handledEditParam || !editStudentId || students.length === 0) {
      return;
    }
    const match = students.find((s) => String(s._id) === String(editStudentId));
    if (match) {
      setEditingStudent(match);
      setShowStudentModal(true);
    }
    setHandledEditParam(true);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("editStudentId");
      return next;
    });
  }, [handledEditParam, editStudentId, students, setSearchParams]);

  const collegeMap = useMemo(() => {
    const map = {};
    colleges.forEach((college) => {
      map[college._id] = college.name;
    });
    return map;
  }, [colleges]);

  const rows = useMemo(
    () =>
      students.map((student) => ({
        ...student,
        college_name: collegeMap[student.college_id] || student.college_id,
      })),
    [students, collegeMap]
  );

  const dashboardDaily = dashboard?.daily || [];
  const monthlyBehavior = dashboard?.monthly_behavior || [];
  const weeklyTrends = dashboard?.trends?.weekly || {};
  const kpisAvg = dashboard?.kpis?.avg || {};
  const kpisBest = dashboard?.kpis?.best || {};
  const kpisStudents = dashboard?.kpis?.students || 0;
  const performance = dashboard?.performance || {};

  const metricCompare = useMemo(
    () => [
      { metric: "Behavior", value: Number(kpisAvg.behavior ?? 0) },
    ],
    [kpisAvg.behavior]
  );

  const heatmapDays = useMemo(() => {
    const items = [...dashboardDaily];
    // Keep last 84 days (12x7 grid)
    const tail = items.slice(-84);
    while (tail.length < 84) {
      tail.unshift({ date: "", behavior: 0 });
    }
    const max = Math.max(1, ...tail.map((d) => Number(d.behavior ?? 0)));
    return tail.map((d) => {
      const v = Number(d.behavior ?? 0);
      const level = v <= 0 ? 0 : v / max;
      return { ...d, level };
    });
  }, [dashboardDaily]);

  const handleSaveStudent = async (payload, meta = {}) => {
    setActionError("");
    try {
      if (editingStudent) {
        const profilePayload = {
          name: payload.name,
          department: payload.department,
          year: payload.year,
          // Keep achievements untouched (not editable in this form)
        };

        const profileChanged =
          payload.name !== editingStudent.name ||
          payload.department !== editingStudent.department ||
          Number(payload.year) !== Number(editingStudent.year);

        if (profileChanged) {
          await api.put(`/students/${editingStudent._id}`, profilePayload);
        }

        if (meta.metricsChanged) {
          const res = await api.post(`/students/${editingStudent._id}/discipline-updates`, {
            behavior: payload.behavior,
            justification: meta.justification,
          });

          if (res.status === 202) {
            // Major changes require approval; keep UX minimal.
            setShowPendingModal(true);
          }
        }

        setEditingStudent(null);
      } else {
        await api.post("/students", payload);
      }
      setShowStudentModal(false);
      await loadData();
      scrollToSection("students");
    } catch (error) {
      setActionError(error?.response?.data?.message || "Unable to save student right now.");
    }
  };

  const handleDelete = async (studentId) => {
    await api.delete(`/students/${studentId}`);
    loadData();
  };

  const handleBulkUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    await api.post("/students/bulk-upload", formData);
    loadData();
  };

  const handleResetScores = async () => {
    setResetError("");
    setResetJustification({
      category: "",
      reason: "",
      details: "",
      college_id: "",
      roll_number: "",
    });
    setShowResetModal(true);
  };

  const submitResetScores = async () => {
    setResetError("");
    try {
      await api.post("/students/reset-scores", {
        college_id: resetJustification.college_id,
        roll_number: resetJustification.roll_number,
        justification: {
          category: resetJustification.category,
          reason: resetJustification.reason,
          details: resetJustification.details,
        },
      });
      setShowResetModal(false);
      await loadData();
      scrollToSection("students");
    } catch (error) {
      setResetError(error?.response?.data?.message || "Unable to reset score.");
    }
  };

  const loadPendingUpdates = async () => {
    const { data } = await api.get("/discipline-updates/pending");
    setPendingUpdates(data.items || []);
  };

  const openPendingModal = async () => {
    await loadPendingUpdates();
    setShowPendingModal(true);
  };

  const approvePending = async (updateId) => {
    await api.post(`/discipline-updates/${updateId}/approve`);
    await loadPendingUpdates();
    loadData();
  };

  const rejectPending = async (updateId) => {
    await api.post(`/discipline-updates/${updateId}/reject`);
    await loadPendingUpdates();
  };

  const handleApprove = async (studentId) => {
    await api.post(`/students/${studentId}/approve`);
    loadData();
  };

  const handleMarkAsRead = async (notificationId) => {
    await api.patch(`/notifications/${notificationId}/read`);
    loadData();
  };

  const handleCreateAdmin = async () => {
    setAdminMessage("");
    const payload = {
      name: adminForm.name.trim(),
      email: adminForm.email.trim().toLowerCase(),
      password: adminForm.password,
      role: adminForm.role,
      college_id: adminForm.role === "college_admin" ? adminForm.college_id || null : null,
    };

    if (!payload.name || !payload.email || !payload.password || !payload.role) {
      setAdminMessage("Please fill all required fields.");
      return;
    }

    if (payload.role === "college_admin" && !payload.college_id) {
      setAdminMessage("Select a college for college admin.");
      return;
    }

    try {
      await api.post("/admins", payload);
      setAdminForm({ name: "", email: "", password: "", role: "college_admin", college_id: "" });
      setAdminMessage("Admin account created successfully.");
      loadData();
    } catch (error) {
      setAdminMessage(error?.response?.data?.message || "Failed to create admin.");
    }
  };

  const handleDeleteAdmin = async (adminId) => {
    try {
      await api.delete(`/admins/${adminId}`);
      setAdminMessage("Admin deleted successfully.");
      loadData();
    } catch (error) {
      setAdminMessage(error?.response?.data?.message || "Failed to delete admin.");
    }
  };

  const handleSaveCollege = async (payload) => {
    setActionError("");
    try {
      if (editingCollege) {
        await api.put(`/colleges/${editingCollege._id}`, payload);
      } else {
        await api.post("/colleges", payload);
      }
      setShowCollegeModal(false);
      setEditingCollege(null);
      await loadData();
    } catch (error) {
      setActionError(error?.response?.data?.message || "Unable to save college.");
    }
  };

  const handleDeleteCollege = async (collegeId) => {
    if (!window.confirm("Are you sure? This may affect students associated with this college.")) return;
    try {
      await api.delete(`/colleges/${collegeId}`);
      await loadData();
    } catch (error) {
      setActionError(error?.response?.data?.message || "Unable to delete college.");
    }
  };

  const openCreateModal = () => {
    setActionError("");
    setEditingStudent(null);
    setShowStudentModal(true);
  };

  const openEditModal = (student) => {
    setActionError("");
    setEditingStudent(student);
    setShowStudentModal(true);
  };

  return (
    <div className="edv-page edv-admin-shell fade-in-up rounded-[28px] p-4 text-slate-100 md:p-6">
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <aside className="edv-glass-card rounded-3xl p-5 md:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-teal-600 to-ocean text-sm font-extrabold text-white">
                {adminInitials}
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Profile</p>
                <p className="text-sm font-extrabold text-white">{admin?.name}</p>
                <p className="text-xs text-slate-400">{admin?.role}</p>
              </div>
            </div>
            <button
              type="button"
              className="rounded-2xl border border-slate-700 bg-slate-950/30 px-3 py-2 text-sm font-bold text-slate-200 transition hover:border-slate-600 hover:bg-slate-950/50"
              onClick={() => scrollToSection("dashboard")}
              title="Dashboard"
            >
              ⋯
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-800/70 bg-slate-950/20 px-3 py-2 text-xs font-bold text-slate-200">
            Unread notifications: <span className="text-white">{unreadCount}</span>
          </div>

          <nav className="mt-6 space-y-1">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {isSuperAdmin ? "Super Admin Navigation" : "College Admin Navigation"}
            </p>
            {navItems.map((item) => {
              const active = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scrollToSection(item.id)}
                  className={
                    "flex w-full items-center justify-between rounded-2xl border px-3 py-2 text-sm font-semibold transition " +
                    (active
                      ? "border-teal-600/70 bg-teal-900/20 text-white"
                      : "border-slate-800/70 bg-slate-950/10 text-slate-200 hover:border-slate-700 hover:bg-slate-950/20")
                  }
                >
                  <span className="flex items-center gap-3">
                    <span className={
                      "grid h-8 w-8 place-items-center rounded-xl text-xs font-extrabold " +
                      (active ? "bg-teal-700 text-white" : "bg-slate-900/50 text-slate-200")
                    }>
                      {item.label.slice(0, 1)}
                    </span>
                    {item.label}
                  </span>
                  {item.id === "notifications" ? (
                    <span className="rounded-full border border-slate-700 bg-slate-950/30 px-2 py-0.5 text-xs font-bold text-slate-200">
                      {unreadCount}
                    </span>
                  ) : null}
                  {item.id === "follow-up" && pendingCount > 0 ? (
                    <span className="rounded-full border border-orange-700/60 bg-orange-900/20 px-2 py-0.5 text-xs font-bold text-orange-200">
                      {pendingCount}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>

          <div className="mt-6 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Scope Filters</p>
            <input
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              placeholder="Search name or roll"
              className="edv-input w-full"
            />
            <select
              value={filters.college_id}
              onChange={(e) => setFilters((prev) => ({ ...prev, college_id: e.target.value }))}
              className="edv-input w-full"
            >
              <option value="">All colleges</option>
              {colleges.map((college) => (
                <option key={college._id} value={college._id}>
                  {college.name}
                </option>
              ))}
            </select>
            <input
              value={filters.department}
              onChange={(e) => setFilters((prev) => ({ ...prev, department: e.target.value }))}
              placeholder="Department"
              className="edv-input w-full"
            />
            <input
              value={filters.year}
              onChange={(e) => setFilters((prev) => ({ ...prev, year: e.target.value }))}
              placeholder="Year (e.g. 1)"
              className="edv-input w-full"
            />
          </div>

          <div className="mt-6 space-y-2">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-400">Bulk CSV Upload</label>
            <input
              type="file"
              accept=".csv"
              onChange={handleBulkUpload}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950/30 px-3 py-2 text-sm text-slate-100"
            />
            <button onClick={openCreateModal} className="edv-btn-primary w-full rounded-2xl px-4 py-2.5 text-sm font-extrabold">
              Add Student
            </button>
            <button
              onClick={() => setShowNotificationsModal(true)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950/30 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-slate-600 hover:bg-slate-950/50"
            >
              Notifications
            </button>
            <button
              onClick={openPendingModal}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950/30 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-slate-600 hover:bg-slate-950/50"
            >
              Pending Approvals{pendingCount > 0 ? ` (${pendingCount})` : ""}
            </button>
            <button onClick={handleResetScores} className="w-full rounded-2xl bg-amber-500 px-4 py-2.5 text-sm font-extrabold text-slate-950 transition hover:bg-amber-400">
              Reset Scores
            </button>
          </div>
        </aside>

        <main className="space-y-6">
          <header id="dashboard" className="edv-glass-card rounded-3xl p-6 md:p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Discipline Analytics</p>
                <h2 className="edv-title-gradient mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">Dashboard</h2>
                <p className="mt-2 text-sm text-slate-400">High-level KPIs, trends, leaderboards, and accountability logs.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-slate-700 bg-slate-950/30 px-3 py-1 text-xs font-semibold text-slate-200">
                  Students in scope: <span className="font-extrabold text-white">{kpisStudents}</span>
                </span>
                <button
                  type="button"
                  className="rounded-2xl border border-slate-700 bg-slate-950/30 px-3 py-2 text-sm font-bold text-slate-200 transition hover:border-slate-600 hover:bg-slate-950/50"
                  title="Actions"
                >
                  ☰
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <KpiCard
                title="Discipline Score"
                value={kpisAvg.discipline_score ?? 0}
                subtitle="Average (current scope)"
                progress={Number(kpisAvg.discipline_score ?? 0) / 100}
                trend={weeklyTrends.discipline_score}
              />
              <KpiCard
                title="Global Rank"
                value={kpisBest.rank_global ? `#${kpisBest.rank_global}` : "-"}
                subtitle="Best (current scope)"
                progress={kpisBest.rank_global && kpisStudents ? 1 - (Number(kpisBest.rank_global) - 1) / Math.max(1, Number(kpisStudents)) : 0}
              />
              <KpiCard
                title="College Rank"
                value={kpisBest.rank_college ? `#${kpisBest.rank_college}` : "-"}
                subtitle="Best (current scope)"
                progress={kpisBest.rank_college && kpisStudents ? 1 - (Number(kpisBest.rank_college) - 1) / Math.max(1, Number(kpisStudents)) : 0}
              />
              <KpiCard
                title="Behavior Score"
                value={kpisAvg.behavior ?? 0}
                subtitle="Average (current scope)"
                progress={Number(kpisAvg.behavior ?? 0) / 100}
                trend={weeklyTrends.behavior}
              />
            </div>
          </header>

          <section className="grid gap-6 xl:grid-cols-12">
            <div className="edv-glass-card rounded-3xl p-6 transition md:p-7 xl:col-span-7">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h3 className="text-xl font-extrabold tracking-tight text-white">Discipline Score Over Time</h3>
                  <p className="mt-1 text-sm text-slate-400">Daily average from audit-log snapshots (last 12 weeks).</p>
                </div>
              </div>
              <div className="mt-5 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dashboardDaily}>
                    <XAxis dataKey="date" stroke="#94a3b8" hide />
                    <YAxis stroke="#94a3b8" domain={[-100, 100]} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="discipline_score" name="Discipline" stroke="#0EA5E9" strokeWidth={3} dot={false} />
                    <Line type="monotone" dataKey="behavior" name="Behavior" stroke="#0F766E" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="edv-glass-card rounded-3xl p-6 transition md:p-7 xl:col-span-5">
              <h3 className="text-xl font-extrabold tracking-tight text-white">Behavior Per Month</h3>
              <p className="mt-1 text-sm text-slate-400">Monthly average behavior from updates (last 12 months).</p>
              <div className="mt-5 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyBehavior}>
                    <XAxis dataKey="month" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" domain={[-100, 100]} />
                    <Tooltip />
                    <Bar dataKey="behavior" fill="#0EA5E9" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-12">
            <div className="edv-glass-card rounded-3xl p-6 transition md:p-7 xl:col-span-5">
              <h3 className="text-xl font-extrabold tracking-tight text-white">Activity Heatmap</h3>
              <p className="mt-1 text-sm text-slate-400">Daily behavior intensity (relative to peak).</p>

              <div className="mt-5 grid grid-cols-12 gap-2">
                {Array.from({ length: 12 }).map((_, col) => (
                  <div key={`col-${col}`} className="grid grid-rows-7 gap-2">
                    {heatmapDays.slice(col * 7, col * 7 + 7).map((day, idx) => {
                      const level = clamp01(day.level);
                      const cls =
                        level <= 0
                          ? "bg-slate-800/30 border-slate-800/60"
                          : level < 0.25
                            ? "bg-teal-900/30 border-teal-800/50"
                            : level < 0.5
                              ? "bg-teal-800/40 border-teal-700/60"
                              : level < 0.75
                                ? "bg-teal-700/50 border-teal-600/70"
                                : "bg-teal-600/70 border-teal-500/80";
                      const title = day.date ? `${day.date}: behavior ${day.behavior ?? 0}` : "";
                      return (
                        <div
                          key={`${day.date}-${idx}`}
                          title={title}
                          className={`h-3 w-3 rounded border transition hover:scale-110 ${cls}`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            <div className="edv-glass-card rounded-3xl p-6 transition md:p-7 xl:col-span-7">
              <h3 className="text-xl font-extrabold tracking-tight text-white">Metric Comparison</h3>
              <p className="mt-1 text-sm text-slate-400">Behavior comparison (current averages).</p>

              <div className="mt-5 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metricCompare} layout="vertical" margin={{ left: 24 }}>
                    <XAxis type="number" stroke="#94a3b8" domain={[-100, 100]} />
                    <YAxis type="category" dataKey="metric" stroke="#94a3b8" />
                    <Tooltip />
                    <Bar dataKey="value" fill="#FB7185" radius={[10, 10, 10, 10]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <section id="follow-up" className="grid gap-6 xl:grid-cols-12">
            <div id="leaderboard" className="edv-glass-card rounded-3xl p-6 transition md:p-7 xl:col-span-12">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h3 className="text-xl font-extrabold tracking-tight text-white">Leaderboard Preview</h3>
                  <p className="mt-1 text-sm text-slate-400">Top 5 students by discipline score (current filters).</p>
                </div>
                <Link
                  to="/leaderboard"
                  className="rounded-2xl border border-slate-700 bg-slate-950/30 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-950/50"
                >
                  View full leaderboard
                </Link>
              </div>

              <div className="mt-5 overflow-hidden rounded-3xl border border-slate-800/70">
                <div className="grid grid-cols-[64px_1fr_160px] gap-3 bg-slate-950/30 px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-400">
                  <span>Rank</span>
                  <span>Student</span>
                  <span className="text-right">Score</span>
                </div>
                <div className="divide-y divide-slate-800/70">
                  {leaderboardTop.map((s, idx) => (
                    <div key={s._id} className="grid grid-cols-[64px_1fr_160px] gap-3 px-5 py-4 transition hover:bg-slate-950/20">
                      <span className="text-sm font-extrabold text-slate-200">#{idx + 1}</span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{s.name}</p>
                        <p className="mt-0.5 text-xs text-slate-400">Roll: {s.roll_number || "-"}</p>
                      </div>
                      <p className="text-right text-xl font-extrabold text-ocean">{s.discipline_score}</p>
                    </div>
                  ))}
                  {leaderboardTop.length === 0 && (
                    <div className="px-5 py-4 text-sm text-slate-400">No leaderboard data available.</div>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section id="notifications" className="grid gap-6 xl:grid-cols-12">
            <div id="settings" className="edv-glass-card rounded-3xl p-6 transition md:p-7 xl:col-span-12">
              <h3 className="text-xl font-extrabold tracking-tight text-white">Settings</h3>
              <p className="mt-1 text-sm text-slate-400">Operational controls for admins (justification required).</p>

              <div className="mt-5 grid gap-3">
                <button
                  onClick={openPendingModal}
                  className="w-full rounded-3xl border border-slate-800/70 bg-slate-950/20 px-5 py-4 text-left text-sm font-semibold text-slate-100 transition hover:border-slate-700"
                >
                  Pending Approvals <span className="ml-2 text-xs font-bold text-slate-300">({pendingCount})</span>
                  <p className="mt-1 text-xs text-slate-400">Approve or reject major discipline changes.</p>
                </button>
                <button
                  onClick={handleResetScores}
                  className="w-full rounded-3xl border border-orange-700/60 bg-orange-900/20 px-5 py-4 text-left text-sm font-extrabold text-orange-100 transition hover:bg-orange-900/30"
                >
                  Reset Scores
                  <p className="mt-1 text-xs font-semibold text-orange-200/90">Requires a written justification for accountability.</p>
                </button>
              </div>

              <div className="mt-5 rounded-3xl border border-slate-800/70 bg-slate-950/20 p-4">
                <p className="text-sm font-extrabold text-white">Admin Management</p>
                {isSuperAdmin ? (
                  <>
                    <p className="mt-1 text-xs text-slate-400">Only super admin can create or remove admin accounts.</p>
                    <div className="mt-3 grid gap-2">
                      <input
                        value={adminForm.name}
                        onChange={(e) => setAdminForm((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="Admin name"
                        className="w-full rounded-xl border border-slate-700 bg-slate-950/30 px-3 py-2 text-sm text-slate-100 outline-none"
                      />
                      <input
                        value={adminForm.email}
                        onChange={(e) => setAdminForm((prev) => ({ ...prev, email: e.target.value }))}
                        placeholder="Admin email"
                        className="w-full rounded-xl border border-slate-700 bg-slate-950/30 px-3 py-2 text-sm text-slate-100 outline-none"
                      />
                      <input
                        type="password"
                        value={adminForm.password}
                        onChange={(e) => setAdminForm((prev) => ({ ...prev, password: e.target.value }))}
                        placeholder="Password"
                        className="w-full rounded-xl border border-slate-700 bg-slate-950/30 px-3 py-2 text-sm text-slate-100 outline-none"
                      />
                      <div className="rounded-xl border border-slate-700 bg-slate-950/30 px-3 py-2 text-sm font-semibold text-slate-200">
                        Role: College Admin
                      </div>
                      <select
                        value={adminForm.college_id}
                        onChange={(e) => setAdminForm((prev) => ({ ...prev, college_id: e.target.value }))}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950/30 px-3 py-2 text-sm text-slate-100 outline-none"
                      >
                        <option value="">Select college</option>
                        {colleges.map((college) => (
                          <option key={college._id} value={college._id}>
                            {college.name}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={handleCreateAdmin}
                        className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-extrabold text-white transition hover:bg-teal-800"
                      >
                        Create Admin
                      </button>
                    </div>

                    {adminMessage ? <p className="mt-2 text-xs font-semibold text-slate-300">{adminMessage}</p> : null}

                    <div className="mt-3 max-h-48 space-y-2 overflow-y-auto pr-1">
                      {admins
                        .filter((a) => String(a._id) !== String(admin?.id))
                        .map((a) => (
                          <div key={a._id} className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-950/30 px-3 py-2">
                            <div className="min-w-0">
                              <p className="truncate text-xs font-bold text-slate-100">{a.name}</p>
                              <p className="truncate text-[11px] text-slate-400">{a.email} • {a.role}</p>
                            </div>
                            <button
                              onClick={() => handleDeleteAdmin(a._id)}
                              className="rounded-lg bg-orange-600 px-2.5 py-1 text-[11px] font-bold text-white transition hover:bg-orange-700"
                            >
                              Delete
                            </button>
                          </div>
                        ))}
                      {admins.filter((a) => String(a._id) !== String(admin?.id)).length === 0 ? (
                        <p className="text-xs text-slate-400">No other admins available.</p>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <p className="mt-1 text-xs text-slate-400">Only super admin can create or delete admin accounts.</p>
                )}
              </div>
            </div>
          </section>
          {isSuperAdmin && (
            <>
              <div id="colleges" className="h-0" />
              <section className="edv-glass-card rounded-3xl p-6 md:p-7">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-extrabold tracking-tight text-white">Colleges & Schools</h3>
                    <p className="mt-1 text-sm text-slate-400">Manage institutional entities across the platform.</p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingCollege(null);
                      setShowCollegeModal(true);
                    }}
                    className="edv-btn-primary rounded-2xl px-4 py-2.5 text-sm font-extrabold"
                  >
                    Add College
                  </button>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {colleges.map((college) => (
                    <div key={college._id} className="rounded-3xl border border-slate-800/70 bg-slate-950/20 p-5 transition hover:border-slate-700">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-lg font-bold text-white">{college.name}</p>
                          <p className="text-xs text-slate-400">{college.location}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingCollege(college);
                              setShowCollegeModal(true);
                            }}
                            className="rounded-xl border border-slate-700 bg-slate-900/50 p-2 text-xs font-semibold text-slate-200 transition hover:border-slate-600"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteCollege(college._id)}
                            className="rounded-xl bg-orange-600/20 p-2 text-xs font-bold text-orange-400 transition hover:bg-orange-600/40"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {colleges.length === 0 && <p className="text-sm text-slate-400">No colleges registered yet.</p>}
                </div>
              </section>
            </>
          )}

          <div id="discipline-updates" className="h-0" />
          <section id="students" className="edv-glass-card rounded-3xl p-6 md:p-7">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h3 className="text-2xl font-extrabold tracking-tight text-white">Students</h3>
                <p className="mt-1 text-sm text-slate-400">Manage records. Discipline changes require justification and are fully auditable.</p>
                {actionError ? <p className="mt-2 text-sm font-semibold text-rose-300">{actionError}</p> : null}
              </div>
              <button onClick={openCreateModal} className="edv-btn-primary rounded-2xl px-4 py-2.5 text-sm font-extrabold">
                New Student
              </button>
            </div>

            <div className="mt-5 rounded-3xl border border-slate-800/70 bg-slate-950/20 p-3">
              <StudentTable rows={rows} />
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {rows.slice(0, 8).map((student) => (
                <div key={student._id} className="flex items-center gap-2 rounded-2xl border border-slate-800/70 bg-slate-950/20 px-4 py-3 text-sm">
                  <span className="font-semibold text-white">{student.name}</span>
                  <button
                    className="rounded-xl border border-slate-700 bg-slate-900/50 px-3 py-1 text-xs font-semibold text-slate-100 transition hover:border-slate-600"
                    onClick={() => openEditModal(student)}
                  >
                    Edit
                  </button>
                  {!student.approved && (
                    <button
                      className="rounded-xl bg-teal-700 px-3 py-1 text-xs font-extrabold text-white transition hover:bg-teal-800"
                      onClick={() => handleApprove(student._id)}
                    >
                      Approve
                    </button>
                  )}
                  <button
                    className="rounded-xl bg-orange-600 px-3 py-1 text-xs font-extrabold text-white transition hover:bg-orange-700"
                    onClick={() => handleDelete(student._id)}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="edv-glass-card rounded-3xl p-6 md:p-7">
            <h3 className="text-xl font-extrabold tracking-tight text-white">Weekly Report</h3>
            <p className="mt-1 text-sm text-slate-400">Updates count by college for the last 7 days.</p>
            <div className="mt-5 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyReport}>
                  <XAxis dataKey="college_id" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip />
                  <Bar dataKey="updates_count" fill="#0F766E" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </main>
      </div>

      <Modal
        open={showStudentModal}
        title={editingStudent ? "Edit Student Profile" : "Add Student Profile"}
        onClose={() => {
          setEditingStudent(null);
          setShowStudentModal(false);
        }}
        width="max-w-3xl"
      >
        <StudentForm
          colleges={colleges}
          selected={editingStudent}
          submitError={actionError}
          onSubmit={handleSaveStudent}
          onCancel={() => {
            setEditingStudent(null);
            setShowStudentModal(false);
          }}
        />
      </Modal>

      <Modal open={showNotificationsModal} title="Notifications" onClose={() => setShowNotificationsModal(false)} width="max-w-3xl">
        <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
          {notifications.slice(0, 20).map((notification) => (
            <div key={notification._id} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
              <div>
                <p className="text-sm font-semibold text-slate-900">{notification.message}</p>
                <p className="text-xs text-slate-500">{new Date(notification.created_at).toLocaleString()}</p>
              </div>
              {!notification.is_read && (
                <button onClick={() => handleMarkAsRead(notification._id)} className="btn-secondary text-xs">
                  Mark read
                </button>
              )}
            </div>
          ))}
          {notifications.length === 0 && <p className="text-sm text-slate-500">No notifications yet.</p>}
        </div>
      </Modal>

      <Modal open={showResetModal} title="Reset Scores (Justification Required)" onClose={() => setShowResetModal(false)} width="max-w-xl">
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Enter college and roll number. This will reset behavior and discipline score for that student.</p>
          <select
            value={resetJustification.college_id}
            onChange={(e) => setResetJustification((prev) => ({ ...prev, college_id: e.target.value }))}
            className="input-ui"
            required
          >
            <option value="">Select college</option>
            {colleges.map((college) => (
              <option key={college._id} value={college._id}>
                {college.name}
              </option>
            ))}
          </select>
          <input
            value={resetJustification.roll_number}
            onChange={(e) => setResetJustification((prev) => ({ ...prev, roll_number: e.target.value }))}
            placeholder="Student roll number (required)"
            className="input-ui"
            required
          />
          <select
            value={resetJustification.category}
            onChange={(e) => setResetJustification((prev) => ({ ...prev, category: e.target.value }))}
            className="input-ui"
            required
          >
            <option value="">Select category</option>
            <option value="Behavior Issue">Behavior Issue</option>
            <option value="Good Performance">Good Performance</option>
            <option value="Other">Other</option>
          </select>
          <input
            value={resetJustification.reason}
            onChange={(e) => setResetJustification((prev) => ({ ...prev, reason: e.target.value }))}
            placeholder="Written reason (required)"
            className="input-ui"
            required
          />
          <textarea
            value={resetJustification.details}
            onChange={(e) => setResetJustification((prev) => ({ ...prev, details: e.target.value }))}
            placeholder="Optional details"
            className="input-ui"
            rows={3}
          />
          {resetError ? <p className="text-sm font-semibold text-rose-600">{resetError}</p> : null}
          <div className="flex gap-2">
            <button
              className="btn-primary"
              onClick={submitResetScores}
              disabled={
                !resetJustification.college_id ||
                !resetJustification.roll_number.trim() ||
                !resetJustification.category ||
                !resetJustification.reason.trim()
              }
            >
              Confirm Reset
            </button>
            <button className="btn-secondary" onClick={() => setShowResetModal(false)}>
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={showPendingModal} title="Pending Discipline Changes" onClose={() => setShowPendingModal(false)} width="max-w-4xl">
        <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
          {pendingUpdates.map((item) => {
            const delta = item?.delta?.discipline_score ?? 0;
            const positive = Number(delta) > 0;
            const negative = Number(delta) < 0;
            return (
              <div key={item._id} className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-extrabold text-slate-900">
                      {item?.student?.name || "Student"} <span className="text-xs font-semibold text-slate-500">({item?.student?.roll_number || "-"})</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(item.created_at).toLocaleString()} • {item.category} • Δ {delta}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.suspicious && (
                      <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-bold text-orange-700">Flagged</span>
                    )}
                    <span
                      className={
                        "rounded-full px-2.5 py-1 text-xs font-bold " +
                        (positive ? "bg-emerald-100 text-emerald-700" : negative ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-700")
                      }
                    >
                      {positive ? "Positive" : negative ? "Negative" : "Neutral"}
                    </span>
                  </div>
                </div>

                <div className="mt-2 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                  <div className="rounded-lg bg-slate-50 p-2">
                    <p className="text-xs font-bold uppercase text-slate-500">From → To</p>
                    <p className="mt-1">
                      Score: {item.previous?.discipline_score} → {item.new?.discipline_score}
                    </p>
                    <p>
                      Behavior: {item.previous?.behavior} → {item.new?.behavior}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2">
                    <p className="text-xs font-bold uppercase text-slate-500">Justification</p>
                    <p className="mt-1 font-semibold">{item.reason}</p>
                    {item.details && <p className="mt-1 text-xs text-slate-600">{item.details}</p>}
                    <p className="mt-2 text-xs text-slate-500">Requested by: {item.created_by?.name || "Admin"}</p>
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  <button className="btn-primary" onClick={() => approvePending(item._id)}>
                    Approve
                  </button>
                  <button className="btn-secondary" onClick={() => rejectPending(item._id)}>
                    Reject
                  </button>
                </div>
              </div>
            );
          })}

          {pendingUpdates.length === 0 && <p className="text-sm text-slate-500">No pending discipline changes.</p>}
        </div>
      </Modal>

      <Modal
        open={showCollegeModal}
        title={editingCollege ? "Edit College" : "Register New College"}
        onClose={() => {
          setEditingCollege(null);
          setShowCollegeModal(false);
        }}
        width="max-w-xl"
      >
        <CollegeForm
          selected={editingCollege}
          submitError={actionError}
          onSubmit={handleSaveCollege}
          onCancel={() => {
            setEditingCollege(null);
            setShowCollegeModal(false);
          }}
        />
      </Modal>
    </div>
  );
}

export default AdminDashboard;
