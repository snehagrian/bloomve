import Link from "next/link";

export default function Home() {
  return (
    <main className="mesh-bg fx-stage flex min-h-screen items-center justify-center px-4 py-16">
      <section className="w-full max-w-5xl">
        {/* Hero Card */}
        <div className="card hero-3d soft-glow p-10 sm:p-16">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-rose-200/60 bg-gradient-to-r from-rose-50 to-pink-50 px-4 py-1.5">
            <span className="text-[11px] font-bold leading-none text-rose-500">✿</span>
            <span className="text-xs font-semibold uppercase tracking-widest text-rose-500">BloomVe</span>
          </div>

          {/* Headline */}
          <h1 className="mt-7 text-5xl font-bold leading-[1.05] tracking-tight text-slate-900 sm:text-6xl">
            Opportunities bloom via people.
          </h1>

          <p className="mt-3 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl">
            <span className="bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-500 bg-clip-text text-transparent">
              BloomVe
            </span>
          </p>

          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-rose-400">
            Opportunities bloom via people.
          </p>

          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-400">
            BloomVe means <span className="font-semibold text-rose-500">opportunities bloom via people</span>.
            Build trusted rooms, share quality openings, and help your community grow faster together.
          </p>

          {/* CTAs */}
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/signup" className="btn-primary text-center">
              Get started free →
            </Link>
            <Link href="/login" className="btn-ghost text-center">
              Log in
            </Link>
          </div>

          <div className="mt-9 grid gap-3 sm:grid-cols-3">
            <div className="glass-panel card-3d p-3.5 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-400">Discovery</p>
              <p className="mt-1 text-lg font-bold text-slate-800">People-powered rooms</p>
            </div>
            <div className="glass-panel card-3d p-3.5 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-fuchsia-400">Collab</p>
              <p className="mt-1 text-lg font-bold text-slate-800">Invite + uplift</p>
            </div>
            <div className="glass-panel card-3d p-3.5 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-pink-400">Speed</p>
              <p className="mt-1 text-lg font-bold text-slate-800">One-click opportunity sharing</p>
            </div>
          </div>

          {/* Divider */}
          <div className="my-12 h-px bg-gradient-to-r from-transparent via-pink-200 to-transparent" />

          {/* Feature cards */}
          <div className="grid gap-5 sm:grid-cols-3">
            <article className="group card-3d rounded-2xl border border-rose-100/80 bg-gradient-to-br from-white to-rose-50/60 p-6 hover:border-rose-200 transition-all">
              <div className="icon-chip mb-4 text-rose-600">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="9" cy="8" r="2.5" />
                  <path d="M4 18c0-2.5 2.2-4 5-4s5 1.5 5 4" />
                  <circle cx="17" cy="9" r="2" />
                  <path d="M14.5 18c.2-1.8 1.6-3.2 3.5-3.6" />
                </svg>
              </div>
              <h2 className="font-semibold text-slate-800">Collaborative Discovery</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">Share openings from LinkedIn, Greenhouse, Lever, and more with your network.</p>
            </article>

            <article className="group card-3d rounded-2xl border border-fuchsia-100/80 bg-gradient-to-br from-white to-fuchsia-50/60 p-6 hover:border-fuchsia-200 transition-all">
              <div className="icon-chip mb-4 text-fuchsia-600">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 4H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2v4l4-4h10a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Z" />
                </svg>
              </div>
              <h2 className="font-semibold text-slate-800">Chat + Channel Modes</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">Two-way discussion or one-way broadcast — your room, your rules.</p>
            </article>

            <article className="group card-3d rounded-2xl border border-pink-100/80 bg-gradient-to-br from-white to-pink-50/60 p-6 hover:border-pink-200 transition-all">
              <div className="icon-chip mb-4 text-pink-600">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M7 12h10" />
                  <path d="m13 8 4 4-4 4" />
                  <rect x="3" y="5" width="18" height="14" rx="3" />
                </svg>
              </div>
              <h2 className="font-semibold text-slate-800">Browser Extension</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">Share the active tab to any room in one click — no copy-paste needed.</p>
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}
