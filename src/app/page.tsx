import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-16">
      <section className="w-full max-w-5xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12">
        <div className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-700">
          BloomVe
        </div>

        <h1 className="mt-5 text-4xl font-bold leading-tight text-slate-900 sm:text-5xl">
          Opportunities bloom via people.
        </h1>

        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
          BloomVe is a collaborative job-sharing platform where communities create chat rooms and channels
          to discover and share opportunities faster.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="rounded-md bg-indigo-600 px-5 py-2.5 text-center text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Sign up
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-slate-300 bg-white px-5 py-2.5 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Log in
          </Link>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h2 className="font-semibold text-slate-900">Collaborative Discovery</h2>
            <p className="mt-1 text-sm text-slate-600">Share openings from LinkedIn, Greenhouse, Lever, and more.</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h2 className="font-semibold text-slate-900">Chat + Channel Modes</h2>
            <p className="mt-1 text-sm text-slate-600">Choose two-way discussion or one-way updates per room.</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h2 className="font-semibold text-slate-900">Browser Extension</h2>
            <p className="mt-1 text-sm text-slate-600">Post the active tab URL into BloomVe rooms instantly.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
