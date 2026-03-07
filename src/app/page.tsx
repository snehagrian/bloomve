import Link from "next/link";

export default function Home() {
  return (
    <main className="mesh-bg flex min-h-screen items-center justify-center px-4 py-16">
      <section className="w-full max-w-5xl">
        {/* Hero Card */}
        <div className="card p-10 sm:p-16">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-rose-200/60 bg-gradient-to-r from-rose-50 to-pink-50 px-4 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400"></span>
            <span className="text-xs font-semibold uppercase tracking-widest text-rose-500">BloomVe</span>
          </div>

          {/* Headline */}
          <h1 className="mt-7 text-5xl font-bold leading-[1.1] tracking-tight text-slate-900 sm:text-6xl">
            Opportunities bloom<br />
            <span className="bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-500 bg-clip-text text-transparent">
              via people.
            </span>
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-400">
            A collaborative job-sharing platform where communities create rooms and channels
            to discover and share opportunities — together.
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

          {/* Divider */}
          <div className="my-12 h-px bg-gradient-to-r from-transparent via-pink-200 to-transparent" />

          {/* Feature cards */}
          <div className="grid gap-5 sm:grid-cols-3">
            <article className="group rounded-2xl border border-rose-100/80 bg-gradient-to-br from-white to-rose-50/60 p-6 hover:border-rose-200 hover:shadow-md hover:shadow-rose-50 transition-all">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-100 to-pink-100 text-lg">
                🤝
              </div>
              <h2 className="font-semibold text-slate-800">Collaborative Discovery</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">Share openings from LinkedIn, Greenhouse, Lever, and more with your network.</p>
            </article>

            <article className="group rounded-2xl border border-fuchsia-100/80 bg-gradient-to-br from-white to-fuchsia-50/60 p-6 hover:border-fuchsia-200 hover:shadow-md hover:shadow-fuchsia-50 transition-all">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-100 to-pink-100 text-lg">
                💬
              </div>
              <h2 className="font-semibold text-slate-800">Chat + Channel Modes</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">Two-way discussion or one-way broadcast — your room, your rules.</p>
            </article>

            <article className="group rounded-2xl border border-pink-100/80 bg-gradient-to-br from-white to-pink-50/60 p-6 hover:border-pink-200 hover:shadow-md hover:shadow-pink-50 transition-all">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-pink-100 to-rose-100 text-lg">
                🔗
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
