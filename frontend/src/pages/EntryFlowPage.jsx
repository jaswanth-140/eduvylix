import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import Hero3DScene from "../components/Hero3DScene";
import { useAuth } from "../hooks/useAuth";

function useHasSeenSplash() {
  const [seen] = useState(false);
  const markSeen = () => {};
  return { seen, markSeen };
}

function EntryFlowPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { seen, markSeen } = useHasSeenSplash();

  const [stage, setStage] = useState(seen ? "select" : "splash");
  const [transitioning, setTransitioning] = useState(false);
  const [logoTilt, setLogoTilt] = useState({ x: 0, y: 0 });
  const [studentTilt, setStudentTilt] = useState({ x: 0, y: 0 });
  const [adminTilt, setAdminTilt] = useState({ x: 0, y: 0 });

  const tagline = useMemo(() => "Discipline. Growth. Excellence.", []);
  const particles = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        id: i,
        left: `${((i * 37) % 100).toFixed(2)}%`,
        top: `${((i * 19 + 13) % 100).toFixed(2)}%`,
        size: 2 + (i % 4),
        duration: 8 + (i % 7),
        delay: (i % 9) * 0.55,
        opacity: 0.18 + ((i % 4) * 0.12),
      })),
    []
  );

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/admin", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const toSelect = async () => {
    if (transitioning) return;
    setTransitioning(true);
    markSeen();

    // Small exit animation
    await new Promise((r) => setTimeout(r, 260));
    setStage("select");
    await new Promise((r) => setTimeout(r, 30));
    setTransitioning(false);
  };

  const calcTilt = (event, setter, max = 10) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    const y = (px - 0.5) * max * 2;
    const x = (0.5 - py) * max * 2;
    setter({ x, y });
  };

  return (
    <div className="edv-landing relative min-h-screen overflow-hidden text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="edv-gradient-depth absolute inset-0" />
        <div className="edv-light-streak edv-light-streak-a" />
        <div className="edv-light-streak edv-light-streak-b" />
        <div className="edv-light-streak edv-light-streak-c" />
        <div className="edv-grid-overlay absolute inset-0" />
        <div className="edv-vignette absolute inset-0" />
        <div className="edv-noise absolute inset-0" />
        {particles.map((p) => (
          <span
            key={p.id}
            className="edv-particle"
            style={{
              left: p.left,
              top: p.top,
              width: `${p.size}px`,
              height: `${p.size}px`,
              opacity: p.opacity,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>

      {stage === "splash" ? (
        <button
          type="button"
          onClick={toSelect}
          onMouseMove={(event) => calcTilt(event, setLogoTilt, 7)}
          onMouseLeave={() => setLogoTilt({ x: 0, y: 0 })}
          className={
            "relative grid min-h-screen w-full place-items-start overflow-y-auto px-6 py-10 text-left outline-none transition duration-500 md:place-items-center " +
            (transitioning ? "opacity-0 scale-[0.99]" : "opacity-100")
          }
          aria-label="Enter Eduvylix"
        >
          <div className="mx-auto w-full max-w-5xl">
            <div className="mx-auto grid w-full place-items-center">
              <div className="edv-logo-wrap">
                <div className="edv-logo-halo" />
                <div
                  className="edv-logo-shell"
                  style={{
                    transform: `perspective(1100px) rotateX(${logoTilt.x.toFixed(2)}deg) rotateY(${logoTilt.y.toFixed(2)}deg)`,
                  }}
                >
                  <div className="edv-logo-reflection" />
                  <div className="edv-logo-rim" />
                  <div className="edv-logo-core">
                    <Hero3DScene />
                  </div>
                </div>
              </div>

              <h1 className="mt-9 text-center text-4xl font-black tracking-tight text-white sm:text-6xl">
                <span className="edv-text-gradient">LEARN BEYOND LIMITS</span>
              </h1>
              <p className="edv-text-glow mt-4 text-center text-sm font-semibold text-slate-300 sm:text-base">{tagline}</p>

              <div className="mt-8 flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-300" />
                <span className="text-xs font-semibold text-slate-300">Click anywhere to enter</span>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <span className="edv-pill">Premium • Auditable • Transparent</span>
                <span className="edv-pill">AI-ready • Role-based • Real-time</span>
                <span className="edv-pill">Leaderboards • Profiles • History</span>
              </div>

              <div className="mt-8">
                <span className="edv-enter-chip">Tap To Launch Experience</span>
              </div>

              {seen ? (
                <div className="mt-7 flex items-center justify-center">
                  <span className="rounded-2xl border border-cyan-400/20 bg-slate-900/30 px-4 py-2 text-xs font-semibold text-cyan-100/90">
                    Splash is remembered for your next visit
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </button>
      ) : (
        <div className="relative mx-auto flex min-h-screen max-w-6xl items-center px-6 py-10">
          <div className="w-full">
            <div className="mx-auto max-w-4xl text-center">
              <div className="edv-logo-wrap mx-auto max-w-[420px]">
                <div className="edv-logo-halo" />
                <div className="edv-logo-shell edv-logo-shell-sm">
                  <div className="edv-logo-reflection" />
                  <div className="edv-logo-rim" />
                  <div className="edv-logo-core">
                    <Hero3DScene />
                  </div>
                </div>
              </div>

              <h2 className="mt-6 text-3xl font-black tracking-tight text-white sm:text-5xl">
                <span className="edv-text-gradient">Choose Your Portal</span>
              </h2>
              <p className="edv-text-glow mt-3 text-sm text-slate-300 sm:text-base">
                Enter as a student to view your discipline profile, or sign in as an admin to manage governance and analytics.
              </p>
            </div>

            <div className="mx-auto mt-10 grid max-w-5xl gap-5 md:grid-cols-2">
              <div
                className="edv-login-card"
                onMouseMove={(event) => calcTilt(event, setStudentTilt, 11)}
                onMouseLeave={() => setStudentTilt({ x: 0, y: 0 })}
                style={{
                  transform: `perspective(950px) rotateX(${studentTilt.x.toFixed(2)}deg) rotateY(${studentTilt.y.toFixed(2)}deg) translateZ(0px)`,
                }}
              >
                <div className="edv-card-edge" />
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-200/80">Student Access</p>
                <p className="mt-2 text-2xl font-black tracking-tight text-white">Student Login</p>
                <p className="mt-3 text-sm text-slate-300">
                  Enter your roll number to open your profile dashboard and analyze historical score movement.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link to="/student-login" className="edv-btn-primary">
                    Continue
                  </Link>
                  <Link to="/leaderboard" className="edv-btn-ghost">
                    View Leaderboard
                  </Link>
                </div>
              </div>

              <div
                className="edv-login-card"
                onMouseMove={(event) => calcTilt(event, setAdminTilt, 11)}
                onMouseLeave={() => setAdminTilt({ x: 0, y: 0 })}
                style={{
                  transform: `perspective(950px) rotateX(${adminTilt.x.toFixed(2)}deg) rotateY(${adminTilt.y.toFixed(2)}deg) translateZ(0px)`,
                }}
              >
                <div className="edv-card-edge" />
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-200/80">Admin Access</p>
                <p className="mt-2 text-2xl font-black tracking-tight text-white">Admin Login</p>
                <p className="mt-3 text-sm text-slate-300">
                  Secure console for college admins and super admins to manage approvals, policies, and insight dashboards.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link to="/login" className="edv-btn-primary">
                    Sign In
                  </Link>
                  <Link to="/home" className="edv-btn-ghost">
                    Learn More
                  </Link>
                </div>
              </div>
            </div>

            <div className="mx-auto mt-10 flex max-w-5xl flex-wrap items-center justify-between gap-3 rounded-[24px] border border-cyan-200/10 bg-slate-900/35 px-6 py-4 text-sm text-slate-200 backdrop-blur-xl">
              <p className="font-semibold">
                Returning user? <span className="text-slate-300">Splash memory is enabled automatically.</span>
              </p>
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem("eduvylix_seen_splash");
                  } catch {
                    // ignore
                  }
                  setStage("splash");
                }}
                className="edv-btn-ghost"
              >
                Show splash next time
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EntryFlowPage;
