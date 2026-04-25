import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import api from "../services/api";

function HomePage() {
  const [topStudents, setTopStudents] = useState([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await api.get("/leaderboard/global", { params: { sort_by: "discipline_score" } });
        const items = (res.data.items || []).slice(0, 5);
        if (alive) setTopStudents(items);
      } catch (e) {
        if (alive) setTopStudents([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="fade-in-up">
      <section className="eduvylix-hero relative -mx-4 overflow-hidden rounded-[28px] border border-slate-800/70 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-16 text-slate-100 shadow-soft md:-mx-10 md:px-10 md:py-20">
        <div className="pointer-events-none absolute inset-0">
          <div className="eduvylix-blob eduvylix-blob-a absolute -left-24 -top-28 h-72 w-72 rounded-full bg-ocean/35 blur-3xl" />
          <div className="eduvylix-blob eduvylix-blob-b absolute -right-28 top-10 h-80 w-80 rounded-full bg-coral/25 blur-3xl" />
          <div className="eduvylix-blob eduvylix-blob-c absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-500/15 blur-[70px]" />
          <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(rgba(148,163,184,0.2)_1px,transparent_1px)] [background-size:18px_18px]" />
        </div>

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-slate-800/70 bg-slate-950/20 px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-200">
              Student Discipline & Global Leaderboard
              <span className="h-1.5 w-1.5 rounded-full bg-ocean" />
            </p>

            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
              WELCOME TO{" "}
              <span className="bg-gradient-to-r from-ocean to-coral bg-clip-text text-transparent">DISCIPLINE LEADERBOARD</span>
            </h1>

            <p className="mt-4 text-lg font-semibold text-slate-200">Track. Improve. Lead with Discipline.</p>
            <p className="mt-4 max-w-xl text-sm text-slate-300 md:text-base">
              Eduvylix helps colleges and schools measure discipline fairly using transparent score history, auditable updates,
              and live rankings across colleges, departments, and batches.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/"
                className="rounded-2xl bg-gradient-to-r from-ocean to-coral px-6 py-3 text-sm font-extrabold text-white shadow-soft transition hover:opacity-95"
              >
                Get Started
              </Link>
              <Link
                to="/leaderboard"
                className="rounded-2xl border border-slate-700 bg-slate-950/20 px-6 py-3 text-sm font-semibold text-slate-100 transition hover:border-slate-600 hover:bg-slate-950/35"
              >
                View Leaderboard
              </Link>
              <Link to="/" className="text-sm font-semibold text-slate-300 transition hover:text-white">
                Enter Platform →
              </Link>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                { title: "Discipline Score", value: "40/30/30", sub: "Attendance • Behavior • Participation" },
                { title: "Audit Trail", value: "100%", sub: "Every update is recorded" },
                { title: "Live Rankings", value: "Global", sub: "College • Department • Batch" },
                { title: "Profiles", value: "Deep", sub: "History, ranks, performance" },
              ].map((item) => (
                <div key={item.title} className="rounded-3xl border border-slate-800/70 bg-slate-950/20 p-5 backdrop-blur">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{item.title}</p>
                  <p className="mt-2 text-2xl font-extrabold text-white">{item.value}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-400">{item.sub}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="rounded-[28px] border border-slate-800/70 bg-slate-950/25 p-6 shadow-soft backdrop-blur">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Leaderboard Preview</p>
                <span className="rounded-full border border-slate-800/70 bg-slate-950/30 px-3 py-1 text-xs font-semibold text-slate-200">
                  Top 5
                </span>
              </div>

              <div className="mt-5 overflow-hidden rounded-3xl border border-slate-800/70">
                <div className="grid grid-cols-[72px_1fr_120px] gap-3 bg-slate-950/40 px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  <span>Rank</span>
                  <span>Student</span>
                  <span className="text-right">Score</span>
                </div>
                <div className="divide-y divide-slate-800/70">
                  {(topStudents.length ? topStudents : Array.from({ length: 5 })).map((s, idx) => (
                    <div
                      key={s?._id || idx}
                      className="grid grid-cols-[72px_1fr_120px] gap-3 px-5 py-4 transition hover:bg-slate-950/25"
                    >
                      <span className="text-sm font-extrabold text-slate-200">#{idx + 1}</span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{s?.name || "Loading…"}</p>
                        <p className="mt-0.5 text-xs text-slate-400">{s?.college_name || " "}</p>
                      </div>
                      <p className="text-right text-lg font-extrabold text-ocean">{s?.discipline_score ?? "—"}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-400">Transparent rankings based on tracked performance signals.</p>
                <Link
                  to="/leaderboard"
                  className="rounded-2xl border border-slate-700 bg-slate-950/20 px-4 py-2 text-xs font-semibold text-slate-100 transition hover:border-slate-600"
                >
                  Open full leaderboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto mt-12 grid max-w-7xl gap-4 px-1 md:mt-16 md:grid-cols-2 lg:grid-cols-4">
        {[
          {
            title: "Discipline Score Tracking",
            desc: "Monitor attendance, behavior, and participation with consistent scoring rules.",
          },
          { title: "Global Leaderboard", desc: "Rank students across colleges, departments, and batches." },
          { title: "Detailed Student Profiles", desc: "See ranks, trends, and a complete snapshot of performance." },
          { title: "Transparent Score History", desc: "Every update is traceable with justification and audit logs." },
        ].map((f) => (
          <article key={f.title} className="rounded-3xl border border-slate-200 bg-white/75 p-6 shadow-soft backdrop-blur">
            <div className="mb-4 h-10 w-10 rounded-2xl bg-gradient-to-br from-ocean/20 to-coral/20" />
            <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-700">{f.title}</h3>
            <p className="mt-2 text-sm text-slate-700">{f.desc}</p>
          </article>
        ))}
      </section>

      <section id="about" className="mx-auto mt-12 max-w-7xl px-1 md:mt-16">
        <div className="rounded-3xl border border-slate-200 bg-white/75 p-8 shadow-soft backdrop-blur md:p-10">
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">How It Works</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
                A clear path from tracking to ranking
              </h2>
              <p className="mt-4 text-sm text-slate-700 md:text-base">
                Admins record discipline updates with justification. Students get transparent profiles and score history. Rankings
                update continuously so improvement is visible.
              </p>
            </div>
            <div className="grid gap-3">
              {[
                { step: "Step 1", title: "Register / Login", desc: "Enter the platform to view dashboards and tools." },
                { step: "Step 2", title: "Track performance", desc: "Capture attendance, behavior, and participation updates." },
                { step: "Step 3", title: "Improve discipline score", desc: "Use insights and history to drive consistent growth." },
                { step: "Step 4", title: "Climb leaderboard", desc: "Compete fairly with auditable, transparent scoring." },
              ].map((s) => (
                <div key={s.title} className="flex gap-4 rounded-3xl border border-slate-200 bg-white p-5">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-slate-900 text-xs font-extrabold text-white">
                    {s.step.replace("Step ", "")}
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{s.step}</p>
                    <p className="mt-1 text-sm font-extrabold text-slate-900">{s.title}</p>
                    <p className="mt-1 text-sm text-slate-700">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-12 max-w-7xl px-1 md:mt-16">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white/75 p-8 shadow-soft backdrop-blur lg:col-span-2 md:p-10">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Highlight</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">See top students instantly</h2>
            <p className="mt-4 text-sm text-slate-700 md:text-base">
              Preview the leaderboard, open profiles, and review score history. Every change is designed to be transparent and
              accountable.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/leaderboard" className="rounded-2xl bg-slate-900 px-6 py-3 text-sm font-extrabold text-white">
                View Leaderboard
              </Link>
              <Link
                to="/login"
                className="rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
              >
                Sign In
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white/75 p-8 shadow-soft backdrop-blur md:p-10">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Built For</p>
            <div className="mt-5 space-y-3">
              {["Students", "Parents", "College Admins", "Super Admins"].map((item) => (
                <div key={item} className="rounded-3xl border border-slate-200 bg-white p-5">
                  <p className="text-sm font-extrabold text-slate-900">{item}</p>
                  <p className="mt-1 text-sm text-slate-700">
                    {item === "Students"
                      ? "Profiles, ranks, progress, and transparent score history."
                      : item === "Parents"
                        ? "Linked child profiles, request tracking, notifications, and approval workflows."
                      : item === "College Admins"
                        ? "Approvals, scope filters, bulk CSV operations, and audits."
                        : "Global visibility, analytics dashboards, and governance controls."}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer id="contact" className="mx-auto mt-12 max-w-7xl px-1 pb-10 md:mt-16">
        <div className="rounded-3xl border border-slate-200 bg-white/75 p-8 shadow-soft backdrop-blur md:p-10">
          <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-lg font-extrabold tracking-tight text-slate-900">Eduvylix</p>
              <p className="mt-1 text-sm text-slate-700">Modern discipline tracking with transparent leaderboards.</p>
              <p className="mt-4 text-sm font-semibold text-slate-900">Contact</p>
              <p className="mt-1 text-sm text-slate-700">support@eduvylix.example</p>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-3 text-sm font-semibold">
                <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="text-slate-700 transition hover:text-slate-900">
                  Home
                </button>
                <button type="button" onClick={() => document.getElementById("about")?.scrollIntoView({ behavior: "smooth" })} className="text-slate-700 transition hover:text-slate-900">
                  About
                </button>
                <Link to="/leaderboard" className="text-slate-700 transition hover:text-slate-900">
                  Leaderboard
                </Link>
                <button type="button" onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })} className="text-slate-700 transition hover:text-slate-900">
                  Contact
                </button>
                <span className="text-slate-400">•</span>
                <span className="text-slate-600">Privacy</span>
              </div>

              <div className="flex items-center gap-3">
                <a
                  href="#"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
                  aria-label="Social"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M21 7.2c-.6.3-1.3.5-2 .6.7-.4 1.2-1 1.5-1.8-.7.4-1.4.7-2.2.9A3.5 3.5 0 0 0 12.4 8c0 .3 0 .6.1.9A10 10 0 0 1 3.5 4.6a3.5 3.5 0 0 0 1.1 4.7c-.5 0-1-.2-1.4-.4v.1a3.5 3.5 0 0 0 2.8 3.5c-.4.1-.9.1-1.3.1.3 1 1.3 1.8 2.4 1.8A7 7 0 0 1 3 16.5 10 10 0 0 0 8.3 18c6.4 0 9.9-5.3 9.9-9.9v-.5c.7-.4 1.3-1 1.8-1.6Z"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinejoin="round"
                    />
                  </svg>
                </a>
                <a
                  href="#"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
                  aria-label="Social"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M8 11v8M8 7v.1M12 19v-6a3 3 0 0 1 6 0v6"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M5 21h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2Z"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinejoin="round"
                    />
                  </svg>
                </a>
                <a
                  href="#"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
                  aria-label="Social"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M9 19c-4 1.5-4-2-6-2m12 4v-3.9c0-1 .1-2-.5-2.8 2.1-.2 4.3-1 4.3-4.6 0-1-.4-2-1.1-2.8.1-.3.5-1.4-.1-2.8 0 0-1-.3-3.1 1.1a10.5 10.5 0 0 0-5.5 0C6.9 2.7 5.9 3 5.9 3c-.6 1.4-.2 2.5-.1 2.8C5.1 6.6 4.7 7.6 4.7 8.6c0 3.6 2.2 4.4 4.3 4.6-.5.5-.6 1.1-.6 1.8V21"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-slate-200 pt-6 text-xs text-slate-500">
            © {new Date().getFullYear()} Eduvylix. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default HomePage;
