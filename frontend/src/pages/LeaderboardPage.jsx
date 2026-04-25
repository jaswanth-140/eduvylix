import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Trophy, 
  Globe, 
  School, 
  Search, 
  Flame, 
  TrendingUp, 
  Star,
  Activity,
  Infinity,
  User,
  ArrowLeft,
  ChevronRight,
  LogOut
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../hooks/useAuth";

const LeaderboardPage = () => {
  const [mode, setMode] = useState("school"); // Default to school view for security/relevance
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    const studentId = localStorage.getItem("eduvylix_student_id");
    const fetchCurrentStudent = async () => {
      if (studentId) {
        try {
          const { data } = await api.get(`/students/${studentId}`);
          setCurrentUser(data.item);
        } catch (error) {
          console.error("Current student fetch failed:", error);
        }
      }
    };
    fetchCurrentStudent();
  }, []);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setIsLoading(true);
      try {
        let endpoint = (mode === "school" && currentUser?.college_id)
          ? `/leaderboard/college/${currentUser.college_id}` 
          : "/leaderboard/global";
        
        const { data } = await api.get(endpoint);
        setStudents(data.items || []);
      } catch (error) {
        console.error("Leaderboard fetch failed:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const studentId = localStorage.getItem("eduvylix_student_id");
    if (studentId && !currentUser && mode === "school") {
      // Wait for student context to load so we fetch the right college data
      return;
    }
    fetchLeaderboard();
  }, [mode, currentUser]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => 
      s.name.toLowerCase().includes(search.toLowerCase()) || 
      (s.roll_number && s.roll_number.toLowerCase().includes(search.toLowerCase()))
    );
  }, [students, search]);

  const topThree = filteredStudents.slice(0, 3);
  const remainingStudents = filteredStudents.slice(3);

  const themes = {
    school: {
      primary: "cyan",
      gradient: "from-cyan-500 via-blue-600 to-indigo-600",
      glow: "shadow-cyan-500/20",
      accent: "text-cyan-400",
      bg: "bg-cyan-500/10",
      border: "border-cyan-500/20"
    },
    global: {
      primary: "amber",
      gradient: "from-amber-400 via-purple-600 to-indigo-700",
      glow: "shadow-amber-500/20",
      accent: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20"
    }
  };

  const currentTheme = themes[mode];

  return (
    <div className={`min-h-screen w-full bg-[#02040a] text-slate-100 overflow-x-hidden selection:bg-cyan-500/30`}>
      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-[100] w-full border-b border-white/5 bg-[#02040a]/80 backdrop-blur-3xl px-6 py-4">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-black text-white shadow-lg shadow-cyan-500/20 shrink-0">
                EVX
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-black text-white tracking-widest uppercase">Eduvylix</p>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.3em]">Matrix Leaderboard</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-4 px-5 py-2 rounded-2xl bg-white/5 border border-white/5 shadow-inner">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Neural Link: Stable</span>
            </div>
            
            {currentUser && (
               <div className="flex items-center gap-6 pl-6 border-l border-white/10">
                  <div className="text-right hidden sm:block">
                     <p className="text-[10px] font-black text-white uppercase tracking-widest">{currentUser.name}</p>
                     <p className={`text-[9px] font-bold ${currentTheme.accent} uppercase tracking-widest`}>#ID:{currentUser.roll_number?.slice(-8)}</p>
                  </div>
                  <div className={`h-11 w-11 rounded-2xl border border-white/10 bg-slate-900 shadow-2xl flex items-center justify-center font-black text-sm overflow-hidden`}>
                     {currentUser.photo_url ? <img src={currentUser.photo_url} className="w-full h-full object-cover" /> : currentUser.name?.charAt(0)}
                  </div>
                  <button 
                    onClick={() => { logout(); navigate("/"); }}
                    className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-xl shadow-rose-900/20 group"
                    title="Terminate Session"
                  >
                    <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
                  </button>
               </div>
            )}
          </div>
        </div>
      </nav>
      {/* Cinematic Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.05)_0%,transparent_50%)]`} />
        <div className={`absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_80%_80%,rgba(139,92,246,0.05)_0%,transparent_50%)]`} />
        
        {Array.from({ length: 15 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ x: Math.random() * 2000, y: Math.random() * 2000, opacity: 0.1 }}
            animate={{ y: [null, -500], opacity: [0.1, 0.3, 0.1] }}
            transition={{ duration: 15 + Math.random() * 15, repeat: Infinity, ease: "linear" }}
            className={`absolute w-1 h-1 rounded-full bg-${currentTheme.primary}-400/40 blur-[1px]`}
          />
        ))}

        <div className="absolute inset-0 flex items-center justify-center opacity-[0.02]">
          <motion.div animate={{ rotateZ: 360 }} transition={{ duration: 60, repeat: Infinity, ease: "linear" }}>
            <Infinity className={`w-[900px] h-[900px] text-${currentTheme.primary}-400`} strokeWidth={0.3} />
          </motion.div>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-[1600px] mx-auto px-6 py-12">
        {/* Navigation & Branding */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-16">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => navigate(-1)}
              className="p-4 rounded-2xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all active:scale-95 shadow-xl"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-white">
                Global <span className={`text-transparent bg-clip-text bg-gradient-to-r ${currentTheme.gradient}`}>Intelligence</span>
              </h1>
              <p className="text-slate-500 font-bold uppercase tracking-[0.4em] text-[10px] mt-2">Eduvylix Matrix Leaderboard v4.0</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 items-center">
            <div className="relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors" size={20} />
              <input 
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Locate intelligence..."
                className="bg-white/5 border border-white/10 rounded-[20px] px-14 py-4 text-sm font-bold w-72 focus:outline-none focus:border-white/20 transition-all placeholder:text-slate-600 outline-none shadow-inner"
              />
            </div>

            <div className="bg-[#0f172a]/80 p-2 rounded-[24px] border border-white/5 backdrop-blur-3xl flex items-center shadow-2xl">
              {["school", "global"].map((m) => (
                <button 
                  key={m}
                  onClick={() => setMode(m)}
                  className={`relative px-10 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-700 flex items-center gap-3
                    ${mode === m ? "text-white" : "text-slate-500 hover:text-slate-300"}
                  `}
                >
                  {mode === m && (
                    <motion.div 
                      layoutId="navToggle"
                      className={`absolute inset-0 bg-gradient-to-r ${themes[m].gradient} rounded-2xl shadow-xl shadow-${themes[m].primary}-900/40`}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    {m === "school" ? <School size={16} /> : <Globe size={16} />} 
                    {m === "school" ? "Institutional" : "International"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* YOUR POSITION - High Visibility Header */}
        {currentUser && (
          <motion.div 
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-16"
          >
            <div className={`relative overflow-hidden rounded-[40px] border border-white/10 bg-slate-900/40 backdrop-blur-3xl p-10 shadow-2xl group`}>
               <div className={`absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl ${currentTheme.gradient} opacity-5 rounded-full -mr-64 -mt-64 blur-[120px] group-hover:opacity-10 transition-opacity duration-1000`} />
               <div className="relative flex flex-col xl:flex-row items-center justify-between gap-12">
                  <div className="flex flex-col md:flex-row items-center gap-10 text-center md:text-left">
                     <div className={`h-24 w-24 rounded-[32px] p-1 bg-gradient-to-br ${currentTheme.gradient} shadow-2xl`}>
                        <div className="h-full w-full bg-[#02040a] rounded-[28px] overflow-hidden flex items-center justify-center">
                           {currentUser.photo_url ? <img src={currentUser.photo_url} className="w-full h-full object-cover" /> : <span className="text-4xl font-black text-white">{currentUser.name?.charAt(0)}</span>}
                        </div>
                     </div>
                     <div>
                        <div className="flex items-center gap-3 mb-2 justify-center md:justify-start">
                           <span className={`px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest ${currentTheme.accent}`}>
                              Authorized User Node
                           </span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter">{currentUser.name}</h2>
                        <div className="flex flex-wrap items-center gap-6 mt-3 justify-center md:justify-start">
                           <p className="text-xs font-bold text-slate-500 flex items-center gap-2 uppercase tracking-widest"><User size={14} className="text-slate-600" /> ID: {currentUser.roll_number}</p>
                           <div className="h-4 w-px bg-white/10 hidden sm:block" />
                           <p className="text-xs font-bold text-slate-500 flex items-center gap-2 uppercase tracking-widest"><School size={14} className={currentTheme.accent} /> {currentUser.college_name || "Regional Institution"}</p>
                        </div>
                     </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 w-full xl:w-auto">
                     <StatBox label="Internal Rank" value={`#${currentUser.rank_college || "--"}`} sub="School Context" accent={currentTheme.accent} />
                     <StatBox label="Global Matrix" value={`#${currentUser.rank_global || "--"}`} sub="Universal Context" accent={currentTheme.accent} />
                     <div className="col-span-2 sm:col-span-1 bg-white/5 border border-white/5 rounded-3xl p-6 text-center shadow-inner">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Vector Score</p>
                        <p className={`text-5xl font-black ${currentTheme.accent} drop-shadow-lg tracking-tighter`}>{currentUser.discipline_score}</p>
                     </div>
                  </div>
               </div>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-12 items-start">
          {/* Main Leaderboard Content */}
          <div className="xl:col-span-8 space-y-16">
            {/* Podium */}
            <AnimatePresence mode="wait">
               {filteredStudents.length > 0 && (
                 <motion.div 
                   key={mode}
                   initial={{ opacity: 0, scale: 0.98 }}
                   animate={{ opacity: 1, scale: 1 }}
                   className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end"
                 >
                   {topThree[1] ? <div className="order-2 md:order-1"><PodiumCard student={topThree[1]} rank={2} theme={currentTheme} isCurrentUser={topThree[1]?._id === currentUser?._id} /></div> : <div className="hidden md:block order-2 md:order-1" />}
                   {topThree[0] ? <div className="order-1 md:order-2"><PodiumCard student={topThree[0]} rank={1} theme={currentTheme} isCurrentUser={topThree[0]?._id === currentUser?._id} /></div> : <div className="hidden md:block order-1 md:order-2" />}
                   {topThree[2] ? <div className="order-3 md:order-3"><PodiumCard student={topThree[2]} rank={3} theme={currentTheme} isCurrentUser={topThree[2]?._id === currentUser?._id} /></div> : <div className="hidden md:block order-3 md:order-3" />}
                 </motion.div>
               )}
            </AnimatePresence>

            {/* List */}
            <div className="space-y-4">
               <div className="px-10 flex items-center text-[10px] font-black uppercase tracking-[0.4em] text-slate-600 mb-8">
                  <span className="w-20">Rank</span>
                  <span className="flex-1">Student Entity</span>
                  <span className="flex-1 hidden lg:block">Architecture (Institution)</span>
                  <span className="w-32 text-right">Momentum</span>
                  <span className="w-24 text-right">Potential</span>
               </div>

               <AnimatePresence>
                  {filteredStudents.map((s, i) => (
                    <motion.div
                      key={s._id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className={`group relative flex items-center px-10 py-6 rounded-[32px] border transition-all duration-500
                        ${s._id === currentUser?._id 
                          ? `bg-${currentTheme.primary}-500/10 border-${currentTheme.primary}-400/30 shadow-2xl` 
                          : "bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10 hover:translate-x-3"}
                      `}
                    >
                      <div className="w-20">
                         <span className={`text-2xl font-black ${s._id === currentUser?._id ? currentTheme.accent : "text-slate-600"}`}>
                            #{i + 1}
                         </span>
                      </div>
                      <div className="flex-1 flex items-center gap-6">
                         <div className={`h-14 w-14 rounded-2xl flex items-center justify-center font-black overflow-hidden border ${s._id === currentUser?._id ? `border-${currentTheme.primary}-400/50` : "border-white/10 bg-slate-950"}`}>
                            {s.photo_url ? <img src={s.photo_url} className="w-full h-full object-cover" /> : s.name.charAt(0)}
                         </div>
                         <div>
                            <p className={`text-base font-black tracking-tighter ${s._id === currentUser?._id ? "text-white" : "text-slate-200"}`}>{s.name}</p>
                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mt-1">Matrix ID: {s.roll_number?.slice(-8)}</p>
                         </div>
                      </div>
                      <div className="flex-1 hidden lg:block">
                         <p className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-3 ${s._id === currentUser?._id ? "text-slate-300" : "text-slate-500"}`}>
                            <School size={14} className={currentTheme.accent} /> {s.college_name || "Institution Node"}
                         </p>
                      </div>
                      <div className="w-32 flex justify-end">
                         <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/5 border border-emerald-500/10 text-emerald-400">
                            <TrendingUp size={12} />
                            <span className="text-[10px] font-black">+{Math.floor(Math.random() * 8) + 2}%</span>
                         </div>
                      </div>
                      <div className="w-24 text-right">
                         <p className={`text-2xl font-black ${currentTheme.accent} drop-shadow-sm`}>{s.discipline_score}</p>
                      </div>
                    </motion.div>
                  ))}
               </AnimatePresence>
            </div>
          </div>

          {/* Sidebar Analytics */}
          <div className="xl:col-span-4 sticky top-12 space-y-12">
            <ContextualAnalytics students={students} theme={currentTheme} mode={mode} />
            
            <div className={`p-10 rounded-[40px] bg-gradient-to-br ${currentTheme.gradient} text-white shadow-2xl relative overflow-hidden group`}>
               <div className="relative z-10">
                  <Flame size={48} className="mb-8 opacity-40 group-hover:scale-110 transition-transform duration-500" />
                  <h4 className="text-2xl font-black tracking-tighter mb-4 leading-none">Institutional Dominance</h4>
                  <p className="text-xs font-bold leading-relaxed opacity-80 mb-8">Maintain high professional standards to elevate your institution's standing in the Global Architecture Matrix.</p>
                  <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-black/20 hover:bg-black/30 px-6 py-3 rounded-xl transition-all">
                     View Protocols <ChevronRight size={14} />
                  </button>
               </div>
               <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-white/20 rounded-full blur-[60px]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatBox = ({ label, value, sub, accent }) => (
  <div className="text-center md:text-left">
     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
     <p className={`text-3xl font-black text-white tracking-tighter`}>{value}</p>
     <p className={`text-[9px] font-bold ${accent} uppercase tracking-widest mt-1 opacity-70`}>{sub}</p>
  </div>
);

const PodiumCard = ({ student, rank, theme, isCurrentUser }) => {
  const meta = {
    1: { label: "EXCELSIOR", color: "from-amber-300 to-amber-600", scale: 1.1, icon: <Trophy className="text-amber-400" size={32} /> },
    2: { label: "VALIANT", color: "from-slate-300 to-slate-500", scale: 1, icon: <Trophy className="text-slate-300" size={24} /> },
    3: { label: "PRODIGY", color: "from-orange-500 to-orange-800", scale: 0.95, icon: <Trophy className="text-orange-500" size={20} /> }
  }[rank];

  if (!student) return null;

  return (
    <motion.div 
      whileHover={{ y: -10, scale: meta.scale * 1.02 }}
      className={`relative w-full rounded-[40px] border ${isCurrentUser ? `border-${theme.primary}-500/50 shadow-2xl` : "border-white/5"} bg-slate-900/60 backdrop-blur-2xl p-10 flex flex-col items-center text-center overflow-hidden h-[400px] justify-center transition-all duration-500 group`}
    >
      <div className={`absolute top-0 right-0 px-8 py-3 rounded-bl-[28px] bg-gradient-to-r ${meta.color} font-black text-xs tracking-[0.2em] shadow-2xl z-30`}>
         #{rank}
      </div>
      <div className="relative mb-8">
        <div className={`h-32 w-32 rounded-[40px] p-1.5 bg-gradient-to-br ${meta.color} shadow-2xl group-hover:rotate-6 transition-transform duration-700`}>
           <div className="h-full w-full bg-[#02040a] rounded-[34px] overflow-hidden flex items-center justify-center text-4xl font-black">
              {student.photo_url ? <img src={student.photo_url} className="w-full h-full object-cover" /> : student.name.charAt(0)}
           </div>
        </div>
        <div className="absolute -bottom-4 -right-4 h-14 w-14 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-3xl flex items-center justify-center shadow-2xl z-20">
           {meta.icon}
        </div>
      </div>
      <div className="z-10 w-full px-2">
         <h3 className="text-2xl font-black text-white tracking-tighter truncate mb-1 drop-shadow-lg">{student.name}</h3>
         <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center justify-center gap-2 mb-8">
            <School size={12} className={theme.accent} /> {student.college_name || "Unknown Institution"}
         </p>
         <div className="inline-flex flex-col items-center bg-white/5 border border-white/5 rounded-3xl px-10 py-4 shadow-inner">
            <span className={`text-4xl font-black ${theme.accent} tracking-tighter`}>{student.discipline_score}</span>
            <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] mt-1">Vector Index</span>
         </div>
      </div>
    </motion.div>
  );
};

const ContextualAnalytics = ({ students, theme, mode }) => {
  const stats = useMemo(() => {
    const map = {};
    const groupKey = mode === "school" ? "department" : "college_name";
    
    students.forEach(s => {
      const val = s[groupKey] || (mode === "school" ? "General" : "Unknown Institution");
      map[val] = (map[val] || 0) + 1;
    });
    
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [students, mode]);

  return (
    <div className="bg-slate-900/60 border border-white/5 rounded-[40px] overflow-hidden backdrop-blur-3xl shadow-2xl">
      <div className="p-10 border-b border-white/5">
         <h4 className="text-sm font-black text-white uppercase tracking-[0.3em] mb-2 flex items-center gap-3">
            {mode === "school" ? "Department Matrix" : "Institution Matrix"} 
            <Activity size={16} className={theme.accent} />
         </h4>
         <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            {mode === "school" ? "Internal department distribution" : "Global Top 100 penetration"}
         </p>
      </div>
      <div className="p-6 space-y-2">
         {stats.map((s, i) => (
           <div key={i} className="flex items-center justify-between p-5 rounded-3xl hover:bg-white/5 transition-all group">
              <div className="flex items-center gap-5">
                 <span className="text-[10px] font-black text-slate-600 group-hover:text-cyan-400 transition-colors w-4">{i + 1}</span>
                 <span className="text-[11px] font-black text-slate-300 truncate max-w-[200px] uppercase tracking-tight">{s.name}</span>
              </div>
              <div className={`px-4 py-1.5 rounded-xl bg-white/5 border border-white/5 text-[10px] font-black ${theme.accent}`}>
                 {s.count} <span className="opacity-40 ml-1">{mode === "school" ? "ENTITY" : "E.I."}</span>
              </div>
           </div>
         ))}
         {stats.length === 0 && (
           <p className="p-10 text-center text-[10px] font-bold text-slate-600 uppercase tracking-widest">No data nodes indexed</p>
         )}
      </div>
    </div>
  );
};

export default LeaderboardPage;
