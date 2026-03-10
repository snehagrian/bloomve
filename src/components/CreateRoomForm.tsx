"use client";

import { useState } from "react";
import type { RoomPrivacy, RoomType } from "@/lib/firestore";

type CreateRoomFormProps = {
  onCreateRoom: (input: {
    name: string;
    type: RoomType;
    privacy: RoomPrivacy;
    friendIds: string[];
  }) => Promise<{ roomId: string; inviteToken: string }>;
};

export default function CreateRoomForm({ onCreateRoom }: CreateRoomFormProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<RoomType>("chat");
  const [privacy, setPrivacy] = useState<RoomPrivacy>("public");
  const [friendIdsInput, setFriendIdsInput] = useState("");
  const [enableInviteLink, setEnableInviteLink] = useState(true);
  const [inviteLink, setInviteLink] = useState("");
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
      const friendIds = friendIdsInput
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

      const created = await onCreateRoom({ name: name.trim(), type, privacy, friendIds });

      if (enableInviteLink && typeof window !== "undefined") {
        setInviteLink(`${window.location.origin}/rooms/${created.roomId}?invite=${created.inviteToken}`);
      } else {
        setInviteLink("");
      }

      setName("");
      setType("chat");
      setPrivacy("public");
      setFriendIdsInput("");
    } catch {
      setError("Could not create room. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="card card-3d p-6">
      <div className="mb-5 flex items-center gap-2.5">
        <div className="icon-chip h-8 w-8 text-rose-600">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
        </div>
        <div>
          <h2 className="font-bold text-slate-900">Create a room</h2>
          <p className="text-xs text-slate-400">Start a people-powered space for sharing opportunities.</p>
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

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">Add friends (optional)</label>
          <input
            value={friendIdsInput}
            onChange={(e) => setFriendIdsInput(e.target.value)}
            placeholder="Paste user IDs, separated by commas"
            className="input-field"
          />
          <p className="mt-1 text-xs text-slate-400">These users will be added immediately as members.</p>
        </div>

        <div className="glass-panel rounded-xl p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Invite options</p>
          <label className="mt-2 inline-flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={enableInviteLink}
              onChange={(e) => setEnableInviteLink(e.target.checked)}
              className="h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-300"
            />
            Enable invite by link
          </label>
          <p className="mt-1 text-xs text-slate-400">After creating the room, a shareable invite link will appear below.</p>
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

      {inviteLink && (
        <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Invite link</p>
          <p className="mt-1 break-all text-xs text-slate-500">{inviteLink}</p>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(inviteLink)}
            className="mt-3 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 transition-colors"
          >
            Copy link
          </button>
        </div>
      )}
    </form>
  );
}
