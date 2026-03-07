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
    <form onSubmit={onSubmit} className="card p-6">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-pink-100 to-rose-100 text-base">
            📤
          </div>
          <h2 className="font-bold text-slate-900">Share a job</h2>
        </div>
        <span className="rounded-full border border-rose-200/60 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-400">
          {postModeLabel}
        </span>
      </div>

      {!canPost && (
        <div className="mb-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-600">
          This channel is read-only for non-owners.
        </div>
      )}

      <div className="space-y-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={!canPost || loading}
          placeholder="Title (optional)"
          className="input-field"
        />

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={!canPost || loading}
          placeholder="Add a quick note (optional)"
          rows={3}
          className="input-field resize-none"
        />

        <input
          value={jobUrl}
          onChange={(e) => setJobUrl(e.target.value)}
          disabled={!canPost || loading}
          placeholder="https://company.com/careers/job-123"
          className="input-field"
        />
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-500">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!canPost || loading}
        className="btn-primary mt-5 w-full"
      >
        {loading ? "Sharing..." : "Share job link"}
      </button>
    </form>
  );
}
