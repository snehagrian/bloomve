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
    <form onSubmit={onSubmit} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Create a room</h2>
      <p className="mt-1 text-sm text-slate-500">Set room type and privacy, then start sharing jobs.</p>

      <div className="mt-4 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Room name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Frontend referrals"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as RoomType)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring"
            >
              <option value="chat">Chat (two-way)</option>
              <option value="channel">Channel (one-way)</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Privacy</label>
            <select
              value={privacy}
              onChange={(e) => setPrivacy(e.target.value as RoomPrivacy)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring"
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </div>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="mt-5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
      >
        {loading ? "Creating..." : "Create room"}
      </button>
    </form>
  );
}
