"use client";

import { useState } from "react";
import type { RoomPrivacy, RoomType } from "@/lib/firestore";

type CreateRoomFormProps = {
  onCreateRoom: (input: { name: string; type: RoomType; privacy: RoomPrivacy }) => Promise<void>;
};

export default function CreateRoomForm({ onCreateRoom }: CreateRoomFormProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<RoomType>("chat");
  const [privacy, setPrivacy] = useState<RoomPrivacy>("public");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Room name is required.");
      return;
    }

    setLoading(true);
    try {
      await onCreateRoom({ name: name.trim(), type, privacy });
      setName("");
      setType("chat");
      setPrivacy("public");
    } catch {
      setError("Could not create room. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="card p-6">
      <div className="mb-5 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-rose-100 to-pink-100 text-base">
          ✨
        </div>
        <div>
          <h2 className="font-bold text-slate-900">Create a room</h2>
          <p className="text-xs text-slate-400">Set type and privacy, then start sharing.</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">Room name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Frontend referrals"
            className="input-field"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as RoomType)}
              className="input-field"
            >
              <option value="chat">Chat (two-way)</option>
              <option value="channel">Channel (one-way)</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">Privacy</label>
            <select
              value={privacy}
              onChange={(e) => setPrivacy(e.target.value as RoomPrivacy)}
              className="input-field"
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-500">
          {error}
        </div>
      )}

      <button type="submit" disabled={loading} className="btn-primary mt-5">
        {loading ? "Creating..." : "Create room"}
      </button>
    </form>
  );
}
