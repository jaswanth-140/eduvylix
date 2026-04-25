import { Link, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";

const links = [
  { to: "/home", label: "Home" },
  { to: "/leaderboard", label: "Leaderboard" },
  { to: "/school-dashboard", label: "School Dashboard" },
  { to: "/admin", label: "Admin" },
];

function Layout() {
  const location = useLocation();
  const { admin, isAuthenticated, logout } = useAuth();

  const isLanding = location.pathname === "/home";

  const scrollToSection = (id) => {
    if (typeof window === "undefined") return;
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const isFullWidthDashboard =
    isLanding ||
    location.pathname.startsWith("/students/") ||
    location.pathname === "/school-dashboard" ||
    location.pathname === "/admin";
  const mainClassName = isFullWidthDashboard
    ? "w-full px-4 py-6 md:px-10 md:py-8"
    : "mx-auto max-w-7xl px-4 py-8 md:px-8";

  const navLinks = isLanding
    ? [
        { type: "scroll", id: "top", label: "Home" },
        { type: "route", to: "/leaderboard", label: "Global Leaderboard" },
        { type: "scroll", id: "about", label: "About" },
        { type: "scroll", id: "contact", label: "Contact" },
      ]
    : links.map((link) => ({ type: "route", to: link.to, label: link.label }));

  const handleNavAction = (item) => {
    if (item.type !== "scroll") return;
    if (item.id === "top") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    scrollToSection(item.id);
  };

  const avatarInitial = (admin?.name || admin?.username || "U").charAt(0).toUpperCase();

  return (
    <div className="edv-dashboard-shell min-h-screen pb-8">
      <div className="edv-dashboard-noise" aria-hidden="true" />
      <div className="edv-dashboard-particles" aria-hidden="true" />
      <header className="sticky top-0 z-30 px-3 pt-3 md:px-6">
        <div className="edv-navbar-glass mx-auto max-w-[1400px] rounded-2xl px-4 py-3 text-slate-100 md:px-5">
          <div className="flex flex-wrap items-center gap-4 md:gap-6">
            <div className="flex min-w-0 items-center gap-3">
              <Link to="/home" className="shrink-0">
                <img
                  src="/eduuu.jpg"
                  alt="Eduvylix logo"
                  className="h-11 w-24 rounded-xl border border-slate-700/80 bg-slate-900/70 object-cover"
                />
              </Link>
              <p className="truncate text-xl font-extrabold tracking-tight text-white">Eduvylix</p>
            </div>

            <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto pr-1 md:gap-2">
              {navLinks.map((item) => {
                const isActive = item.type === "route" && location.pathname === item.to;
                const commonClass =
                  "edv-nav-link whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold transition md:px-4 " +
                  (isActive ? "edv-nav-link-active text-white" : "text-slate-300 hover:text-white");

                if (item.type === "route") {
                  return (
                    <Link key={item.to} to={item.to} className={commonClass}>
                      {item.label}
                    </Link>
                  );
                }

                return (
                  <button key={item.id} type="button" onClick={() => handleNavAction(item)} className={commonClass}>
                    {item.label}
                  </button>
                );
              })}
            </nav>

            <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
              <label className="relative min-w-[180px] sm:min-w-[220px]">
                <select className="edv-input w-full appearance-none rounded-xl px-4 py-2.5 pr-10 text-sm font-semibold text-slate-100 outline-none transition">
                  <option>Select batch...</option>
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">v</span>
              </label>

              {isAuthenticated ? (
                <div className="flex items-center gap-2">
                  <div className="grid h-10 w-10 place-items-center rounded-full border border-cyan-300/30 bg-slate-900/70 text-sm font-extrabold text-slate-100 shadow-[0_0_20px_rgba(34,211,238,0.18)]">
                    {avatarInitial}
                  </div>
                  <button
                    onClick={logout}
                    className="edv-btn-ghost rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wide"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="edv-btn-primary rounded-xl px-4 py-2 text-sm font-extrabold"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>
      <main className={mainClassName}>
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
