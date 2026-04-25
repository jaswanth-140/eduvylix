import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, User, Lock, Activity, Sparkles } from "lucide-react";
import api from "../services/api";

function normalize(v) {
  return String(v || "").trim();
}

function StudentLoginPage() {
  const navigate = useNavigate();

  const [rollNumber, setRollNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState([]);

  useEffect(() => {
    // Clear previously stored student to ensure a fresh session
    localStorage.removeItem("eduvylix_student_id");
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResults([]);

    const q = normalize(rollNumber);
    if (!q) {
      setError("Identification required.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.get("/leaderboard/global", {
        params: {
          search: q,
          sort_by: "discipline_score",
        },
      });

      const items = res.data.items || [];
      const exact = items.filter((s) => normalize(s.roll_number).toLowerCase() === q.toLowerCase());
      
      if (exact.length === 1) {
        // Successful exact login
        localStorage.setItem("eduvylix_student_id", exact[0]._id);
        navigate(`/students/${exact[0]._id}`);
        return;
      }

      if (items.length > 0) {
        setResults(items.slice(0, 3));
      } else {
        setError("Invalid credentials or unregistered node.");
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Connection to mainframe failed.");
    } finally {
      setLoading(false);
    }
  };

  const pickStudent = (student) => {
    localStorage.setItem("eduvylix_student_id", student._id);
    navigate(`/students/${student._id}`);
  };

  return (
    <div className="relative min-h-screen w-full bg-[#02040a] text-slate-100 flex items-center justify-center overflow-hidden selection:bg-cyan-500/30 font-sans">
      
      {/* 3D Floating Background Spheres */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Deep background mesh */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(15,23,42,1)_0%,rgba(2,4,10,1)_100%)]" />

        {/* Sphere 1 - Purple Glow */}
        <motion.div
          animate={{
            y: [0, -40, 0],
            x: [0, 20, 0],
            rotate: [0, 90, 0]
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[10%] left-[15%] w-[400px] h-[400px] rounded-full bg-gradient-to-br from-purple-600/30 to-fuchsia-600/10 blur-[100px]"
        />

        {/* Sphere 2 - Cyan/Blue Glow */}
        <motion.div
          animate={{
            y: [0, 50, 0],
            x: [0, -30, 0],
            rotate: [0, -90, 0]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-[5%] right-[10%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-700/10 blur-[120px]"
        />

        {/* Sphere 3 - Small Neon Highlight */}
        <motion.div
          animate={{
            y: [0, -30, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute top-[40%] right-[30%] w-[200px] h-[200px] rounded-full bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.4)_0%,transparent_70%)] blur-[60px]"
        />
        
        {/* Subtle grid texture overlay */}
        <div className="absolute inset-0 opacity-[0.03] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+CjxwYXRoIGQ9Ik0wIDIwIEg0MCBNMjAgMCBWMDAiIHN0cm9rZT0iI2ZmZmZmZiIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIiAvPgo8L3N2Zz4=')] [background-size:60px_60px]" />
      </div>

      {/* Main Dominant Glass Login Card - Circular Ring Form */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, rotate: -5 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 flex items-center justify-center p-4 w-full"
      >
        <div className="relative overflow-hidden w-[95vw] max-w-[750px] aspect-square rounded-full bg-slate-900/40 backdrop-blur-3xl border-[2px] border-cyan-500/20 shadow-[0_0_100px_rgba(56,189,248,0.15)] p-12 sm:p-20 md:p-28 group transition-all duration-700 hover:shadow-[0_0_150px_rgba(56,189,248,0.25)] hover:border-cyan-400/50 flex flex-col items-center justify-center">
          
          {/* Circular Rings */}
          <div className="absolute inset-2 md:inset-4 rounded-full border-[1px] border-cyan-400/10 pointer-events-none" />
          <div className="absolute inset-4 md:inset-8 rounded-full border-t-2 border-r-2 border-transparent border-t-blue-500/30 border-r-cyan-400/30 animate-[spin_20s_linear_infinite] pointer-events-none" />

          {/* Card Internal Gloss Layer */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/40 pointer-events-none rounded-full" />

          <div className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] bg-[conic-gradient(from_0deg_at_50%_50%,rgba(56,189,248,0.1)_0deg,transparent_60deg,transparent_300deg,rgba(56,189,248,0.1)_360deg)] animate-[spin_10s_linear_infinite] opacity-50 pointer-events-none" />
          
          <div className="relative z-10 w-full flex flex-col items-center">
            
            {/* Logo / Icon */}
            <motion.div 
              whileHover={{ rotate: 180, scale: 1.1 }}
              transition={{ duration: 0.5 }}
              className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 p-[2px] mb-8 shadow-[0_0_30px_rgba(56,189,248,0.5)]"
            >
              <div className="w-full h-full bg-[#02040a] rounded-full flex items-center justify-center">
                 <Activity className="text-cyan-400 w-8 h-8" />
              </div>
            </motion.div>

            {/* Glowing Title */}
            <h1 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70 tracking-tighter mb-2 drop-shadow-[0_0_15px_rgba(255,255,255,0.4)] text-center w-full">
              STUDENT LOGIN
            </h1>
            <p className="text-[10px] font-bold text-cyan-400/80 uppercase tracking-[0.4em] mb-12 text-center">
              Secure Architecture
            </p>

            <form onSubmit={handleSubmit} className="w-full space-y-5">
              
              {/* Input 1: Roll Number */}
              <div className="relative group/input">
                <div className="absolute inset-0 rounded-[28px] bg-gradient-to-r from-cyan-500/50 to-blue-600/50 blur opacity-0 group-focus-within/input:opacity-100 transition-opacity duration-500" />
                <div className="relative bg-[#02040a]/60 backdrop-blur-xl border border-white/10 rounded-[28px] flex items-center px-6 transition-colors duration-300 group-focus-within/input:border-cyan-400/50">
                  <User className="text-slate-500 group-focus-within/input:text-cyan-400 transition-colors w-5 h-5 flex-shrink-0" />
                  <input
                    type="text"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    placeholder="Student Roll Number"
                    className="w-full bg-transparent border-none outline-none text-white placeholder:text-slate-600 font-bold px-4 py-5 text-sm"
                  />
                </div>
              </div>

              {/* Error Message */}
              <AnimatePresence>
                {error && (
                  <motion.p 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-xs font-black uppercase tracking-widest text-rose-400 text-center"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              {/* Results Fallback (If multiple matches found) */}
              {results.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 space-y-2">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest text-center">Select Profile Match</p>
                  {results.map((s) => (
                    <button
                      key={s._id}
                      type="button"
                      onClick={() => pickStudent(s)}
                      className="w-full flex items-center justify-between px-6 py-3 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-500/50 hover:bg-cyan-500/10 transition-all text-left"
                    >
                      <div>
                         <p className="text-sm font-black text-white truncate max-w-[150px]">{s.name}</p>
                         <p className="text-[10px] text-slate-400 uppercase tracking-widest">{s.roll_number}</p>
                      </div>
                      <ChevronRight size={16} className="text-cyan-400" />
                    </button>
                  ))}
                </motion.div>
              )}

              {/* Submit Button */}
              <div className="pt-6 relative">
                {/* Glow behind button */}
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-600 blur-xl opacity-30 mt-6 rounded-[30px]" />
                <button
                  type="submit"
                  disabled={loading}
                  className="relative w-full rounded-[30px] bg-gradient-to-r from-cyan-400 to-blue-600 p-[2px] transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
                >
                  <div className="w-full bg-[#02040a]/20 backdrop-blur-sm rounded-[28px] py-4 flex items-center justify-center gap-2">
                    <span className="text-sm font-black text-white uppercase tracking-[0.2em] drop-shadow-md">
                      {loading ? "Authenticating..." : "Sign In"}
                    </span>
                    {!loading && <ChevronRight size={18} className="text-white drop-shadow-md" />}
                  </div>
                </button>
              </div>
            </form>

            {/* Futuristic Quotation */}
            <div className="mt-14 mb-2 flex flex-col items-center justify-center space-y-3">
              <Sparkles className="text-cyan-400/50 animate-pulse w-5 h-5" />
              <p 
                className="text-transparent bg-clip-text bg-gradient-to-r from-slate-300 to-white text-base font-medium italic tracking-wide drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] text-center relative pointer-events-none"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                "Learn coding, For Future"
              </p>
            </div>

          </div>
        </div>
      </motion.div>

    </div>
  );
}

export default StudentLoginPage;
