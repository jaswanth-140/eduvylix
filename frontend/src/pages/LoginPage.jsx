import React, { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Mail, KeyRound, ShieldCheck } from "lucide-react";

import { useAuth } from "../hooks/useAuth";
import api from "../services/api";

function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", form);
      login({ token: data.access_token, admin: data.admin });
      navigate("/admin");
    } catch (err) {
      setError(err?.response?.data?.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#030612] flex items-center justify-center overflow-hidden font-sans text-slate-100 selection:bg-cyan-500/30">
      
      {/* Subtle Dark 3D Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Core dark gradient mesh */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#09142b_0%,#030612_100%)]" />

        {/* Sphere 1 - Deep Blue Controlled Glow */}
        <motion.div
          animate={{ y: [0, -20, 0], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle_at_center,rgba(14,42,94,0.4)_0%,transparent_70%)] blur-[80px]"
        />

        {/* Sphere 2 - Cyan Sharp Highlight */}
        <motion.div
          animate={{ y: [0, 30, 0], opacity: [0.1, 0.3, 0.1] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] rounded-full bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.15)_0%,transparent_60%)] blur-[100px]"
        />
        
        {/* Strict Grid Overlay for Professional Tech Feel */}
        <div className="absolute inset-0 opacity-[0.02] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+CjxwYXRoIGQ9Ik0wIDIwIEg0MCBNMjAgMCBWMDAiIHN0cm9rZT0iI2ZmZmZmZiIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIiAvPgo8L3N2Zz4=')] [background-size:40px_40px]" />
      </div>

      {/* Main Glass Admin Card - Secure Circular Portal */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, rotate: 5 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 flex items-center justify-center p-4 w-full"
      >
        <div className="relative overflow-hidden w-[95vw] max-w-[750px] aspect-square rounded-full bg-[#050B1A]/80 backdrop-blur-3xl border-[2px] border-cyan-800/30 shadow-[0_30px_100px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(6,182,212,0.1)] p-12 sm:p-20 md:p-28 group transition-all duration-700 hover:shadow-[0_0_150px_rgba(6,182,212,0.15)] flex flex-col items-center justify-center">
          
          {/* Circular Security Rings */}
          <div className="absolute inset-2 md:inset-4 rounded-full border-[1px] border-slate-700/30 pointer-events-none" />
          <div className="absolute inset-4 md:inset-8 rounded-full border-t-[3px] border-r-[3px] border-transparent border-t-cyan-500/20 border-r-blue-600/20 animate-[spin_25s_linear_infinite] pointer-events-none" />
          <div className="absolute inset-[30px] md:inset-[50px] rounded-full border-b-[2px] border-transparent border-b-cyan-400/10 animate-[spin_15s_linear_infinite_reverse] pointer-events-none" />

          {/* Secure Internal Gloss */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-black/60 pointer-events-none rounded-full" />
          
          <div className="relative z-10 flex flex-col items-center w-full max-w-[360px] sm:max-w-[400px]">
            
            {/* Strict Security Icon */}
            <div className="relative flex items-center justify-center mb-8">
              <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full" />
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-b from-[#0e1c36] to-[#050b1a] border border-cyan-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.2)]">
                <ShieldCheck className="w-8 h-8 text-cyan-400" />
              </div>
            </div>

            {/* Glowing Sharp Title */}
            <h1 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 tracking-tight text-center mb-1 drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">
              ADMIN LOGIN
            </h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-10 text-center">
              Secure College Management System
            </p>

            <form onSubmit={handleSubmit} className="w-full space-y-6">
              
              {/* Input 1: Admin ID / Email */}
              <div className="space-y-1">
                <div className="relative group/input">
                  <div className="absolute inset-0 rounded-xl bg-cyan-500/20 blur opacity-0 group-focus-within/input:opacity-100 transition-opacity duration-300" />
                  <div className="relative bg-[#02040A] border border-slate-800 rounded-xl flex items-center px-4 transition-colors duration-300 group-focus-within/input:border-cyan-500/50 shadow-inner overflow-hidden">
                    <Mail className="text-slate-600 group-focus-within/input:text-cyan-400 transition-colors w-5 h-5 flex-shrink-0" />
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="Admin ID / Email"
                      className="w-full bg-transparent border-none outline-none text-slate-200 placeholder:text-slate-600 font-semibold px-4 py-4 text-sm"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Input 2: Password */}
              <div className="space-y-1">
                <div className="relative group/input">
                  <div className="absolute inset-0 rounded-xl bg-cyan-500/20 blur opacity-0 group-focus-within/input:opacity-100 transition-opacity duration-300" />
                  <div className="relative bg-[#02040A] border border-slate-800 rounded-xl flex items-center px-4 transition-colors duration-300 group-focus-within/input:border-cyan-500/50 shadow-inner overflow-hidden">
                    <KeyRound className="text-slate-600 group-focus-within/input:text-cyan-400 transition-colors w-5 h-5 flex-shrink-0" />
                    <input
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                      placeholder="Password"
                      className="w-full bg-transparent border-none outline-none text-slate-200 placeholder:text-slate-600 font-semibold px-4 py-4 text-sm"
                      required
                    />
                  </div>
                </div>
                {/* Forgot Password */}
                <div className="flex justify-end pt-2">
                  <button type="button" className="text-[11px] font-semibold text-slate-500 hover:text-cyan-400 transition-colors">
                    Forgot Password?
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <p className="text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 text-center">
                  {error}
                </p>
              )}

              {/* Login Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="relative w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 p-[1px] transition-all duration-300 hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] active:scale-[0.98] disabled:opacity-70 disabled:hover:shadow-none"
                >
                  <div className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 rounded-[11px] py-4 flex items-center justify-center gap-2">
                    <Lock size={16} className="text-white drop-shadow-md" />
                    <span className="text-sm font-black text-white uppercase tracking-widest drop-shadow-md">
                      {loading ? "Authenticating..." : "Login"}
                    </span>
                  </div>
                </button>
              </div>
            </form>

            {/* Structured Quotation */}
            <div className="mt-12 mb-2 w-full border-t border-slate-800/60 pt-6">
              <p className="text-slate-400 text-xs font-bold tracking-[0.15em] text-center uppercase">
                "Control, Secure, Manage"
              </p>
            </div>

          </div>
        </div>
      </motion.div>

    </div>
  );
}

export default LoginPage;
