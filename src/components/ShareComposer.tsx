"use client";

import { useState } from "react";

type ShareComposerProps = {
  canPost: boolean;
  postModeLabel: string;
  onShare: (input: { title: string; text: string; jobUrl: string }) => Promise<void>;
};

export default function ShareComposer({ canPost, postModeLabel, onShare }: ShareComposerProps) {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!canPost) return;

    if (!jobUrl.trim()) {
      setError("Job URL is required.");
      return;
    }

    try {
      new URL(jobUrl.trim());
    } catch {
      setError("Please enter a valid URL.");
      return;
    }

    setLoading(true);
    try {
      await onShare({ title, text, jobUrl: jobUrl.trim() });
      setTitle("");
      setText("");
      setJobUrl("");
    } catch {
      setError("Could not share right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Share a job</h2>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">{postModeLabel}</span>
      </div>

      {!canPost && (
        <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          This channel is read-only for non-owners.
        </p>
      )}

      <div className="space-y-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={!canPost || loading}
          placeholder="Title (optional)"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring disabled:bg-slate-100"
        />

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={!canPost || loading}
          placeholder="Add a quick note (optional)"
          rows={3}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring disabled:bg-slate-100"
        />

        <input
          value={jobUrl}
          onChange={(e) => setJobUrl(e.target.value)}
          disabled={!canPost || loading}
          placeholder="https://company.com/careers/job-123"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring disabled:bg-slate-100"
        />
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={!canPost || loading}
        className="mt-4 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
      >
        {loading ? "Sharing..." : "Share job link"}
      </button>
    </form>
  );
}
