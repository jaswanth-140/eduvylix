import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, 
  Trophy, 
  LineChart as ChartIcon, 
  Settings, 
  LogOut, 
  Bell, 
  Sun, 
  Moon, 
  ChevronRight, 
  ChevronLeft,
  FileText,
  User,
  Activity,
  Award,
  Zap,
  Clock,
  Mail,
  Phone,
  BarChart3
} from "lucide-react";
import { jsPDF } from "jspdf";
import {
  Cell,
  Line,
  LineChart as RechartsLineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
  AreaChart,
  CartesianGrid
} from "recharts";

import api from "../services/api";
import { useAuth } from "../hooks/useAuth";

// Utility functions
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const formatNumber = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
};

export default function StudentDashboardPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { logout, isAuthenticated } = useAuth();
  
  const [student, setStudent] = useState(null);
  const [trends, setTrends] = useState([]);
  const [history, setHistory] = useState([]);
  const [activityHistory, setActivityHistory] = useState([]);
  const [weeklyReport, setWeeklyReport] = useState(null);
  const [monthlyReport, setMonthlyReport] = useState(null);
  const [groupRank, setGroupRank] = useState(null);
  const [collegeTop, setCollegeTop] = useState([]);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [theme, setTheme] = useState("dark");
  const [reloadKey, setReloadKey] = useState(0);
  const [activeTab, setActiveTab] = useState("dashboard");

  // Discipline Update State (Admin Only)
  const [updateError, setUpdateError] = useState("");
  const [updateMessage, setUpdateMessage] = useState("");
  const [isSubmittingUpdate, setIsSubmittingUpdate] = useState(false);
  const [disciplineForm, setDisciplineForm] = useState({ behavior: 0, category: "", reason: "", details: "" });
  const [isRequestingFollowup, setIsRequestingFollowup] = useState(false);

  // Profile Edit State
  const [profileForm, setProfileForm] = useState({ contact_email: "", photo_url: "", bio: "" });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: studentData } = await api.get(`/students/${id}`);
        const item = studentData.item;
        setStudent(item);
        
        setProfileForm({
          contact_email: item.contact_email || "",
          photo_url: item.photo_url || "",
          bio: item.bio || "",
        });

        // Parallel fetching
        await Promise.allSettled([
          api.get(`/analytics/student-report/${id}`, { params: { period: "weekly" } }).then(res => setWeeklyReport(res.data)),
          api.get(`/analytics/student-report/${id}`, { params: { period: "monthly" } }).then(res => setMonthlyReport(res.data)),
          api.get(`/students/${id}/discipline-history`).then(res => setHistory(res.data.items || [])),
          api.get(`/analytics/trends/${id}`).then(res => {
            setTrends((res.data.trends || []).map(t => ({
              ...t,
              label: new Date(t.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" })
            })));
          }),
          api.get(`/leaderboard/college/${item.college_id}`).then(res => setCollegeTop((res.data.items || []).slice(0, 5)))
        ]);
      } catch (err) {
        console.error("Failed to fetch student profile", err);
      }
    };
    fetchProfile();
  }, [id, reloadKey]);

  useEffect(() => {
    if (!student) return;
    setDisciplineForm(prev => ({ ...prev, behavior: Number(student.behavior ?? 0) }));
  }, [student]);

  const score = Number(student?.discipline_score ?? 0);
  const attendance = Number(student?.attendance ?? 0);
  const behavior = Number(student?.behavior ?? 0);
  const participation = Number(student?.participation ?? 0);
  const weeklyDelta = Number(weeklyReport?.change?.delta?.discipline_score ?? 0);
  
  const initials = useMemo(() => {
    const parts = (student?.name || "S").split(/\s+/).filter(Boolean);
    return (parts[0]?.[0] || "S") + (parts[1]?.[0] || "");
  }, [student?.name]);

  const activityDays = useMemo(() => {
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    const start = new Date(end);
    start.setDate(end.getDate() - 118); // 17 weeks

    const counts = new Map();
    (history || []).forEach(item => {
      const d = new Date(item.applied_at || item.created_at);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString().slice(0, 10);
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    return Array.from({ length: 119 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      return { key, count: counts.get(key) || 0 };
    });
  }, [history]);

  const chartData = useMemo(() => {
    if (trends.length > 0) return trends.slice(-14);
    return Array.from({ length: 14 }, (_, i) => ({
      label: `Day ${i + 1}`,
      discipline_score: clamp(score + (i - 7) * 2, 0, 100)
    }));
  }, [score, trends]);

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        
        // Target max dimensions for an avatar
        const MAX_SIZE = 250;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        // Convert back to base64, compressing to low-quality JPEG to keep payload extremely small
        const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
        setProfileForm(prev => ({ ...prev, photo_url: compressedBase64 }));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };


  const submitProfileUpdate = async () => {
    setIsUpdatingProfile(true);
    setProfileMessage("");
    try {
      await api.put("/students/me", { student_id: id, ...profileForm });
      setProfileMessage("Profile updated successfully!");
      setReloadKey(k => k + 1);
    } catch {
      setProfileMessage("Update failed. Try again.");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const submitDisciplineUpdate = async () => {
    setUpdateError("");
    setUpdateMessage("");
    setIsSubmittingUpdate(true);
    try {
      await api.post(`/students/${id}/discipline-updates`, {
        behavior: Number(disciplineForm.behavior),
        justification: {
          category: disciplineForm.category,
          reason: disciplineForm.reason,
          details: disciplineForm.details,
        }
      });
      setUpdateMessage("Discipline updated successfully.");
      setReloadKey(k => k + 1);
    } catch (error) {
      setUpdateError(error?.response?.data?.message || "Unable to update discipline.");
    } finally {
      setIsSubmittingUpdate(false);
    }
  };

  const submitFollowupRequest = async () => {
    setIsRequestingFollowup(true);
    setProfileMessage("");
    try {
      // Mock follow-up request via a notification or specific endpoint if it exists
      await api.post(`/notifications`, {
        student_id: id,
        title: "Student Follow-up Request",
        message: `Student ${student.name} requested a follow-up/correction on their discipline score.`,
        event_type: "follow_up_request"
      });
      setProfileMessage("Follow-up request sent to administration.");
    } catch {
      setProfileMessage("Failed to send request.");
    } finally {
      setIsRequestingFollowup(false);
    }
  };

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
    { id: "performance", label: "Analytics", icon: <ChartIcon size={20} /> },
    { id: "leaderboard", label: "Leaderboard", icon: <Trophy size={20} />, href: "/leaderboard" },
    { id: "settings", label: "Settings", icon: <Settings size={20} /> },
  ];

  if (!student) return <div className="flex h-screen items-center justify-center bg-slate-950 font-black text-cyan-400 text-3xl animate-pulse">EDUVYLIX...</div>;

  return (
    <div className={`min-h-screen w-full flex ${theme === "dark" ? "bg-[#02040a] text-slate-100" : "bg-slate-50 text-slate-900"} selection:bg-cyan-500/30 selection:text-cyan-200 overflow-x-hidden transition-colors duration-700`}>
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute -top-1/4 -left-1/4 w-1/2 h-1/2 ${theme === "dark" ? "bg-blue-600/10" : "bg-blue-400/5"} blur-[160px] rounded-full animate-pulse`} />
        <div className={`absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 ${theme === "dark" ? "bg-purple-600/10" : "bg-purple-400/5"} blur-[160px] rounded-full`} />
        {theme === "light" && <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(203,213,225,0.15)_100%)]" />}
      </div>

      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 260 : 80 }}
        className={`relative z-40 h-screen border-r ${theme === "dark" ? "border-slate-800/50 bg-[#04060f]/80" : "border-slate-200 bg-white/90"} backdrop-blur-xl flex flex-col transition-all duration-300`}
      >
        <div className="p-6 flex items-center justify-between">
          {isSidebarOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg overflow-hidden shadow-lg shadow-cyan-500/20 shrink-0 border border-slate-500/20">
                <img src="/eduuu.jpg" alt="Eduvylix Logo" className="w-full h-full object-cover" />
              </div>
              <span className={`text-xl font-black tracking-tighter bg-clip-text text-transparent ${theme === "dark" ? "bg-gradient-to-r from-white to-slate-400" : "bg-gradient-to-r from-slate-900 to-slate-600"}`}>EVX</span>
            </motion.div>
          )}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`p-2 rounded-lg transition-colors ${theme === "dark" ? "text-slate-400 hover:bg-slate-800/50 hover:text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"}`}>
            {isSidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.href) {
                  navigate(item.href);
                } else {
                  setActiveTab(item.id);
                }
              }}
              className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all duration-300 group
                ${activeTab === item.id 
                  ? (theme === "dark" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" : "bg-cyan-50 text-cyan-600 border border-cyan-100 shadow-sm")
                  : (theme === "dark" ? "text-slate-400 hover:bg-slate-800/30 hover:text-slate-100" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900")}
              `}
            >
              <span className={`${activeTab === item.id ? (theme === "dark" ? "text-cyan-400" : "text-cyan-600") : "group-hover:text-cyan-500 transition-colors text-slate-400"}`}>
                {item.icon}
              </span>
              {isSidebarOpen && <span className="font-bold text-sm tracking-wide">{item.label}</span>}
              {activeTab === item.id && isSidebarOpen && (
                <motion.div layoutId="activePill" className={`ml-auto w-1.5 h-1.5 rounded-full ${theme === "dark" ? "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" : "bg-cyan-600"}`} />
              )}
            </button>
          ))}
        </nav>

        <div className={`p-4 border-t ${theme === "dark" ? "border-slate-800/50" : "border-slate-100"}`}>
          <button 
            onClick={() => { logout(); navigate("/"); }} 
            className="w-full flex items-center gap-4 p-3 rounded-xl text-rose-500 hover:bg-rose-500/5 transition-colors group"
          >
            <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
            {isSidebarOpen && <span className="font-bold text-[10px] uppercase tracking-[0.2em]">Terminate Session</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 h-screen overflow-y-auto overflow-x-hidden flex flex-col relative z-10 w-full">
        {/* Top Navbar */}
        <header className={`h-20 border-b ${theme === "dark" ? "border-slate-800/50 bg-[#04060f]/60" : "border-slate-100 bg-white/70"} backdrop-blur-xl px-8 flex items-center justify-between sticky top-0 z-50 w-full`}>
          <div className="flex items-center gap-4">
            <h2 className={`text-[10px] font-black uppercase tracking-[0.3em] ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>System Node: Student</h2>
            <div className={`h-4 w-px ${theme === "dark" ? "bg-slate-800" : "bg-slate-200"}`} />
            <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${theme === "dark" ? "text-cyan-400" : "text-cyan-600"}`}>{activeTab}</span>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className={`p-2.5 rounded-xl border transition-all ${theme === "dark" ? "border-slate-800 bg-slate-900/50 text-slate-400 hover:text-white" : "border-slate-200 bg-white text-slate-600 hover:text-cyan-600 shadow-sm"}`}
              >
                {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button className={`p-2.5 rounded-xl border transition-all relative ${theme === "dark" ? "border-slate-800 bg-slate-900/50 text-slate-400" : "border-slate-200 bg-white text-slate-600 shadow-sm"}`}>
                <Bell size={18} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-slate-900" />
              </button>
            </div>
            
            <div className={`flex items-center gap-4 pl-6 border-l ${theme === "dark" ? "border-slate-800" : "border-slate-100"}`}>
              <div className="text-right hidden sm:block">
                <p className={`text-sm font-black ${theme === "dark" ? "text-white" : "text-slate-900"}`}>{student.name}</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">Profile #EVX{student.roll_number?.slice(-4)}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 p-[px] shadow-lg shadow-cyan-500/20 overflow-hidden">
                <div className={`h-full w-full flex items-center justify-center font-black ${theme === "dark" ? "bg-slate-950 text-white" : "bg-white text-slate-900"}`}>
                  {student.photo_url ? <img src={student.photo_url} className="w-full h-full object-cover" /> : initials}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <div className="p-8 space-y-10 w-full max-w-full">
          <section className={`relative w-full rounded-[40px] border ${theme === "dark" ? "border-white/5 bg-gradient-to-br from-slate-900/80 via-slate-900 to-slate-950" : "border-slate-200 bg-gradient-to-br from-white via-slate-50 to-blue-50/30"} p-12 md:p-16 overflow-hidden shadow-2xl transition-all duration-500 group`}>
            <div className="relative z-10">
              <motion.span 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs font-black uppercase tracking-[0.4em] text-cyan-400 block mb-4"
              >
                Performance Report 2026
              </motion.span>
              <motion.h1 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`text-5xl md:text-6xl font-black tracking-tighter ${theme === "dark" ? "text-white" : "text-slate-900"}`}
              >
                Premium <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600">Performance</span> Overview
              </motion.h1>
              <motion.div 
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="h-1.5 w-40 bg-gradient-to-r from-cyan-400 to-transparent mt-4 origin-left"
              />
              <p className={`mt-6 ${theme === "dark" ? "text-slate-400" : "text-slate-900"} text-lg max-w-2xl leading-relaxed font-bold tracking-tight`}>
                Experience next-generation academic analytics. Track your behavior, participation, and attendance with neural precision and real-time insights.
              </p>
            </div>
            {/* Abstract Background Element */}
            <div className="absolute top-0 right-0 w-1/2 h-full pointer-events-none opacity-20">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,#0ea5e9,transparent_70%)]" />
              <div className="absolute inset-0 bg-[linear-gradient(220deg,#6366f1,transparent_50%)]" />
            </div>
          </section>

          {/* Grid Layout (Dashboard & Analytics) */}
          {(activeTab === "dashboard" || activeTab === "performance") && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 xl:grid-cols-12 gap-8 w-full max-w-full"
            >
              {/* Left Column: Stats & Profile (Dashboard Only) */}
              {(activeTab === "dashboard") && (
                <div className="xl:col-span-4 space-y-8">
                  {/* Profile Card */}
                  <div className={`group relative rounded-3xl border ${theme === "dark" ? "border-white/5 bg-slate-950/40" : "border-slate-100 bg-white shadow-xl shadow-slate-200/40"} p-8 hover:bg-opacity-100 transition-all duration-500`}>
                    <div className="flex items-center gap-6">
                      <div className="relative">
                        <div className={`absolute -inset-2 rounded-2xl bg-gradient-to-br from-cyan-500 to-indigo-500 blur-md ${theme === "dark" ? "opacity-40" : "opacity-20"} group-hover:opacity-70 transition-opacity`} />
                        <div className={`relative h-20 w-20 rounded-2xl ${theme === "dark" ? "bg-slate-900 border-white/10" : "bg-slate-50 border-slate-100"} border overflow-hidden flex items-center justify-center`}>
                          {student.photo_url ? (
                            <img src={student.photo_url} className="w-full h-full object-cover" />
                          ) : (
                            <div className={`font-black text-2xl ${theme === "dark" ? "text-white" : "text-slate-900"}`}>{initials}</div>
                          )}
                        </div>
                      </div>
                      <div>
                        <h3 className={`text-2xl font-black ${theme === "dark" ? "text-white" : "text-slate-900"}`}>{student.name}</h3>
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-1">{student.roll_number}</p>
                        <div className={`mt-3 inline-flex px-3 py-1 rounded-full border ${theme === "dark" ? "border-cyan-500/20 bg-cyan-500/10 text-cyan-400" : "border-cyan-100 bg-cyan-50 text-cyan-600"} text-[10px] font-black uppercase tracking-widest`}>
                          {student.academic_status || "Needs Improvement"}
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 space-y-6">
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-black uppercase tracking-widest text-slate-400">
                          <span>Goal Tracker</span>
                          <span className={`${theme === "dark" ? "text-cyan-400" : "text-cyan-600"}`}>95% Target</span>
                        </div>
                        <div className={`h-2 w-full ${theme === "dark" ? "bg-slate-800" : "bg-slate-100"} rounded-full overflow-hidden`}>
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${clamp((score/95)*100, 0, 100)}%` }}
                            className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 shadow-[0_0_12px_rgba(34,211,238,0.4)]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className={`p-4 rounded-2xl border ${theme === "dark" ? "bg-slate-900/50 border-white/5" : "bg-slate-50 border-slate-100"} text-center`}>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Weak Area</p>
                          <p className="mt-1 text-sm font-bold text-amber-500">Attendance</p>
                        </div>
                        <div className={`p-4 rounded-2xl border ${theme === "dark" ? "bg-slate-900/50 border-white/5" : "bg-slate-50 border-slate-100"} text-center`}>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Top Merit</p>
                          <p className="mt-1 text-sm font-bold text-emerald-500">Behavior</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button 
                      onClick={() => setActiveTab("performance")}
                      className={`flex items-center justify-center gap-3 p-5 rounded-2xl border transition-all group ${theme === "dark" ? "border-white/5 bg-slate-950/40 hover:bg-cyan-500" : "border-slate-100 bg-white hover:bg-cyan-50 text-slate-700 hover:text-cyan-600 shadow-sm"}`}
                    >
                      <BarChart3 size={18} className="group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">Analytics</span>
                    </button>
                    <button 
                      onClick={() => setActiveTab("settings")}
                      className={`flex items-center justify-center gap-3 p-5 rounded-2xl border transition-all group ${theme === "dark" ? "border-cyan-500/20 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500 hover:text-white" : "border-cyan-100 bg-cyan-50 text-cyan-600 hover:bg-cyan-600 hover:text-white shadow-sm"}`}
                    >
                      <Settings size={18} />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">Configure</span>
                    </button>
                  </div>
                </div>
              )}

              {/* KPI & Analytics */}
              <div className={`${activeTab === "dashboard" ? "xl:col-span-8" : "xl:col-span-12"} space-y-8`}>
                {/* KPI Row */}
                <div className={`grid grid-cols-2 ${activeTab === "dashboard" ? "lg:grid-cols-4" : "lg:grid-cols-5"} gap-4`}>
                  {[
                    { label: "Discipline Score", value: formatNumber(score), delta: weeklyDelta, icon: <Zap size={20} />, color: "cyan", onClick: () => setIsHistoryModalOpen(true) },
                    { label: "Attendance", value: `${formatNumber(attendance)}%`, delta: 2, icon: <Clock size={20} />, color: "indigo" },
                    { label: "Behavior Index", value: formatNumber(behavior), delta: -1, icon: <Activity size={20} />, color: "violet" },
                    { label: "Total Logs", value: history.length, delta: 5, icon: <FileText size={20} />, color: "purple" },
                    ...(activeTab === "performance" ? [{ label: "Rank Global", value: `#${student.rank_global ?? "-"}`, delta: 0, icon: <Award size={20} />, color: "amber" }] : []),
                  ].map((stat, i) => (
                    <motion.button
                      key={stat.label}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={stat.onClick}
                      className={`relative p-5 rounded-2xl border transition-all overflow-hidden ${theme === "dark" ? "border-white/5 bg-slate-950/40 hover:border-cyan-500/50" : "border-slate-100 bg-white hover:border-cyan-200 shadow-md shadow-slate-200/30"} text-left group ${stat.onClick ? "cursor-pointer active:scale-95" : "cursor-default"}`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className={`p-2 rounded-lg ${theme === "dark" ? `bg-${stat.color}-500/10 text-${stat.color}-400` : `bg-${stat.color}-50 text-${stat.color}-600`}`}>{stat.icon}</div>
                        {stat.delta !== 0 && (
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${stat.delta > 0 ? (theme === "dark" ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600") : (theme === "dark" ? "bg-rose-500/10 text-rose-400" : "bg-rose-50 text-rose-600")}`}>
                            {stat.delta > 0 ? "+" : ""}
                            {stat.delta}
                          </span>
                        )}
                      </div>
                      <p className={`text-2xl font-black ${theme === "dark" ? "text-white" : "text-slate-900"}`}>{stat.value}</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{stat.label}</p>
                      {stat.onClick && (
                        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ChevronRight size={14} className={`${theme === "dark" ? "text-cyan-400" : "text-cyan-600"}`} />
                        </div>
                      )}
                      <div className={`absolute bottom-0 left-0 h-[2px] bg-${stat.color}-500 w-0 group-hover:w-full transition-all duration-500`} />
                    </motion.button>
                  ))}
                </div>

                {/* Analytics Section (Only on Analytics Tab or Dashboard Insight) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Chart */}
                  <div className={`p-8 rounded-3xl border ${theme === "dark" ? "border-white/5 bg-slate-950/40" : "border-slate-100 bg-white shadow-xl shadow-slate-200/40"} backdrop-blur`}>
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h4 className={`text-lg font-black ${theme === "dark" ? "text-white" : "text-slate-900"}`}>Discipline Momentum</h4>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Movement Over Recent Activity</p>
                      </div>
                    </div>
                    <div className="h-64 mt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="colorGlow" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", fontSize: "12px", fontWeight: "900", color: "#fff" }}
                            cursor={{ stroke: "#0ea5e9", strokeWidth: 2 }}
                          />
                          <Area type="monotone" dataKey="discipline_score" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorGlow)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Heatmap */}
                  <div className={`p-8 rounded-3xl border ${theme === "dark" ? "border-white/5 bg-slate-950/40" : "border-slate-100 bg-white shadow-xl shadow-slate-200/40"} backdrop-blur`}>
                     <div className="flex items-center justify-between mb-8">
                      <div>
                        <h4 className={`text-lg font-black ${theme === "dark" ? "text-white" : "text-slate-900"}`}>Engagement matrix</h4>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Frequency of Score Adjustments</p>
                      </div>
                    </div>
                    <div 
                      className="grid gap-2 overflow-x-auto pb-4"
                      style={{ gridTemplateColumns: "repeat(17, minmax(0, 1fr))" }}
                    >
                      {Array.from({ length: 17 }).map((_, colIndex) => (
                        <div key={colIndex} className="space-y-2">
                          {activityDays.slice(colIndex * 7, colIndex * 7 + 7).map((day, i) => (
                            <motion.div
                              key={`${colIndex}-${i}`}
                              whileHover={{ scale: 1.2 }}
                              className={`h-3 w-3 rounded-[3px] transition-colors duration-500
                                ${day.count === 0 ? "bg-slate-800/40" : 
                                  day.count === 1 ? "bg-cyan-900/60" :
                                  day.count === 2 ? "bg-cyan-600/70" :
                                  "bg-cyan-400"}
                              `}
                              title={`${day.key}: ${day.count} items`}
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-end gap-2 mt-4">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Less</span>
                      {[0, 1, 2, 3].map(lvl => (
                        <div key={lvl} className={`w-2.5 h-2.5 rounded-[2px] ${lvl === 0 ? "bg-slate-800/40" : lvl === 1 ? "bg-cyan-900/60" : lvl === 2 ? "bg-cyan-600/70" : "bg-cyan-400"}`} />
                      ))}
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">More</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
      
              {/* Leaderboard Insight */}
              {activeTab === "dashboard" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className={`lg:col-span-12 rounded-3xl border ${theme === "dark" ? "border-white/5 bg-slate-950/40" : "border-slate-100 bg-white shadow-xl shadow-slate-200/40"} p-8`}>
                     <div className="flex items-center justify-between mb-6">
                        <h4 className={`text-xl font-black ${theme === "dark" ? "text-white" : "text-slate-900"}`}>Top Peers in {student.college_name || "College"}</h4>
                        <Link to="/leaderboard" className={`text-[10px] font-black uppercase tracking-widest ${theme === "dark" ? "text-cyan-400 hover:text-white" : "text-cyan-600 hover:text-cyan-400"} transition-colors`}>See all →</Link>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                       {collegeTop.map((peer, i) => (
                         <div key={peer._id} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${theme === "dark" ? "bg-slate-900/60 border-white/5 hover:border-cyan-500/30" : "bg-slate-50 border-slate-100 hover:border-cyan-200 hover:shadow-lg"}`}>
                            <div className={`h-10 w-10 flex items-center justify-center font-black rounded-xl border ${i===0 ? (theme === "dark" ? "bg-amber-400/20 text-amber-400 border-amber-400/30" : "bg-amber-50 text-amber-600 border-amber-200") : (theme === "dark" ? "bg-slate-800 text-slate-400 border-white/10" : "bg-white text-slate-400 border-slate-200")}`}>
                              {i + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                               <p className={`truncate text-sm font-black ${theme === "dark" ? "text-white" : "text-slate-900"}`}>{peer.name}</p>
                               <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{peer.roll_number}</p>
                            </div>
                            <div className="text-right">
                               <p className={`text-lg font-black ${theme === "dark" ? "text-cyan-400" : "text-cyan-600"}`}>{peer.discipline_score}</p>
                            </div>
                         </div>
                       ))}
                     </div>
                  </div>
                </div>
              )}


          {/* Settings Tab Content */}
          <AnimatePresence mode="wait">
            {activeTab === "settings" && (
              <motion.section 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`w-full rounded-3xl border ${theme === "dark" ? "border-cyan-500/20 bg-slate-950/80" : "border-slate-200 bg-white shadow-2xl"} p-10 overflow-hidden backdrop-blur-xl relative`}
              >
                <div className="absolute top-0 right-0 p-8 pointer-events-none opacity-40">
                    <Settings className={`w-64 h-64 ${theme === "dark" ? "text-cyan-500" : "text-cyan-100"} animate-[spin_20s_linear_infinite]`} />
                </div>

                <div className="relative z-10 grid gap-10 lg:grid-cols-2">
                  <div className="space-y-8">
                    <div>
                      <h3 className={`text-3xl font-black ${theme === "dark" ? "text-white" : "text-slate-900"}`}>Profile Configuration</h3>
                      <p className={`mt-2 ${theme === "dark" ? "text-slate-400" : "text-slate-700"} font-bold`}>Configure your presence on the Eduvylix leaderboard and update your contact metadata.</p>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Contact Email Interface</label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                          <input 
                            value={profileForm.contact_email}
                            onChange={(e) => setProfileForm({ ...profileForm, contact_email: e.target.value })}
                            className={`w-full rounded-2xl border ${theme === "dark" ? "border-slate-800 bg-slate-900/50 text-white focus:border-cyan-500" : "border-slate-200 bg-slate-50 text-slate-900 focus:border-cyan-400"} p-4 pl-12 text-sm outline-none transition-all focus:shadow-[0_0_20px_rgba(34,211,238,0.1)]`}
                            placeholder="email@example.com"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Resource Photo</label>
                        <div className="flex items-center gap-4">
                           <div className={`h-16 w-16 rounded-2xl border ${theme === "dark" ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-slate-100"} overflow-hidden flex items-center justify-center shrink-0`}>
                             {profileForm.photo_url ? (
                               <img src={profileForm.photo_url} alt="Profile" className="w-full h-full object-cover" />
                             ) : (
                               <User size={24} className="text-slate-500" />
                             )}
                           </div>
                           <label className={`cursor-pointer px-6 py-3 rounded-xl border ${theme === "dark" ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500 hover:text-white" : "border-cyan-200 bg-cyan-50 text-cyan-600 hover:bg-cyan-600 hover:text-white"} transition-all text-xs font-black uppercase tracking-widest`}>
                              Upload Image
                              <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={handlePhotoUpload} 
                              />
                           </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Biography & Mission Statement</label>
                      <textarea 
                        value={profileForm.bio}
                        onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                        className={`w-full rounded-2xl border ${theme === "dark" ? "border-slate-800 bg-slate-900/50 text-white focus:border-cyan-500" : "border-slate-200 bg-slate-50 text-slate-900 focus:border-cyan-400"} p-6 text-sm outline-none transition-all h-[240px] resize-none focus:shadow-[0_0_20px_rgba(34,211,238,0.1)]`}
                        placeholder="Define your academic persona and goals..."
                      />
                    </div>
                    
                    <div className="flex items-center justify-between gap-6">
                      <p className={`text-[10px] font-black tracking-widest uppercase ${profileMessage.includes("success") ? "text-emerald-500" : "text-rose-500"}`}>
                        {profileMessage}
                      </p>
                      <button 
                        onClick={submitProfileUpdate}
                        disabled={isUpdatingProfile}
                        className="relative group transition-transform hover:scale-105 active:scale-95"
                      >
                        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 to-blue-600 rounded-2xl blur-md opacity-60 group-hover:opacity-100 transition duration-500" />
                        <div className={`relative px-10 py-4 ${theme === "dark" ? "bg-slate-950" : "bg-white"} rounded-xl border border-white/5 flex items-center gap-3`}>
                           <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${theme === "dark" ? "text-white" : "text-slate-900"}`}>{isUpdatingProfile ? "Encrypting..." : "Sync Profile"}</span>
                           <Zap size={16} className="text-cyan-400" />
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.section>
            )}


          </AnimatePresence>
        </div>
        {/* Footer */}
        <footer className={`mt-auto p-12 border-t ${theme === "dark" ? "border-slate-800/50" : "border-slate-200"} flex flex-wrap items-center justify-between gap-8 transition-colors`}>
           <div>
              <p className={`text-2xl font-black ${theme === "dark" ? "text-white" : "text-slate-900"} tracking-tighter`}>EDUVYLIX <span className="text-slate-500 text-[10px] tracking-[0.3em] uppercase ml-4 font-bold">Analytics Engine v2.4</span></p>
              <p className={`text-[10px] font-black ${theme === "dark" ? "text-slate-500" : "text-slate-600"} uppercase tracking-widest mt-2`}>© 2026 Eduvylix Intelligence Systems. All rights reserved.</p>
           </div>
           <div className={`flex items-center gap-4 px-6 py-3 rounded-2xl border ${theme === "dark" ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-200 shadow-sm"}`}>
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
              <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${theme === "dark" ? "text-slate-400" : "text-slate-700"}`}>Mainframe Status: Operational</span>
           </div>
        </footer>
      </main>

      {/* Discipline History Modal */}
      <AnimatePresence>
        {isHistoryModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-10">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsHistoryModalOpen(false)}
              className={`absolute inset-0 ${theme === "dark" ? "bg-slate-950/80" : "bg-slate-900/40"} backdrop-blur-md`}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={`relative w-full max-w-2xl ${theme === "dark" ? "bg-slate-900 border-white/10" : "bg-white border-slate-200"} border rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[85vh]`}
            >
              <div className={`p-8 border-b ${theme === "dark" ? "border-white/5" : "border-slate-100"} flex items-center justify-between shrink-0`}>
                <div>
                  <h3 className={`text-2xl font-black ${theme === "dark" ? "text-white" : "text-slate-900"}`}>Discipline Timeline</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Full score audit history</p>
                </div>
                <button 
                  onClick={() => setIsHistoryModalOpen(false)}
                  className={`p-3 rounded-2xl ${theme === "dark" ? "bg-white/5 text-slate-400 hover:text-white" : "bg-slate-50 text-slate-500 hover:text-slate-900"} transition-all`}
                >
                  <ChevronRight size={24} className="rotate-180" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-hide">
                {history.length === 0 ? (
                  <div className="py-20 text-center">
                    <Activity size={48} className="mx-auto text-slate-800 mb-4" />
                    <p className="text-slate-500 font-bold">No history available for this profile.</p>
                  </div>
                ) : (
                  history.sort((a,b) => new Date(b.created_at || b.timestamp) - new Date(a.created_at || a.timestamp)).map((item, i) => (
                    <div key={i} className="group flex gap-6 relative">
                      {i < history.length - 1 && (
                        <div className="absolute left-[23.5px] top-12 bottom-0 w-0.5 bg-slate-800 group-last:hidden" />
                      )}
                      <div className={`mt-1 h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                        (item.delta?.discipline_score || 0) >= 0 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      }`}>
                        <span className="text-sm font-black">
                          {(item.delta?.discipline_score || 0) >= 0 ? "+" : ""}
                          {item.delta?.discipline_score || 0}
                        </span>
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className={`text-base font-black ${theme === "dark" ? "text-white" : "text-slate-900"}`}>{item.reason || "Automatic adjustment"}</p>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            {new Date(item.created_at || item.timestamp).toLocaleDateString()} • {new Date(item.created_at || item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"} leading-relaxed font-medium`}>{item.details || "No additional metadata provided for this record."}</p>
                        <div className="flex items-center gap-4 pt-1">
                          <div className="flex items-center gap-2">
                            <User size={12} className={`${theme === "dark" ? "text-cyan-400" : "text-cyan-600"}`} />
                            <span className={`text-[10px] font-bold ${theme === "dark" ? "text-cyan-400/80" : "text-cyan-600/80"} uppercase tracking-widest`}>
                              {item.actor?.name || "System"}
                            </span>
                          </div>
                          <div className={`h-3 w-px ${theme === "dark" ? "bg-white/10" : "bg-slate-200"}`} />
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{item.category || "General"}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              <div className={`p-8 border-t ${theme === "dark" ? "border-white/5 bg-slate-900/50" : "border-slate-100 bg-slate-50"} shrink-0`}>
                <button 
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="w-full py-4 rounded-xl bg-cyan-600 text-white font-black uppercase tracking-widest text-xs hover:bg-cyan-700 transition-colors shadow-lg shadow-cyan-900/20 active:scale-[0.98]"
                >
                  Close Audit View
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}