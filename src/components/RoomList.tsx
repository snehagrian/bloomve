"use client";

import Link from "next/link";
import type { Room } from "@/lib/firestore";

type RoomListProps = {
  rooms: Room[];
  suggestions: Room[];
  currentUserId?: string;
  onJoinSuggestion: (roomId: string) => Promise<void>;
};

function badgeClass(value: string) {
  if (value === "chat") return "bg-rose-50 text-rose-600 border-rose-200/80";
  if (value === "channel") return "bg-fuchsia-50 text-fuchsia-600 border-fuchsia-200/80";
  if (value === "public") return "bg-emerald-50 text-emerald-600 border-emerald-200/80";
  return "bg-amber-50 text-amber-600 border-amber-200/80";
}

export default function RoomList({ rooms, suggestions, currentUserId, onJoinSuggestion }: RoomListProps) {
  return (
    <div className="space-y-6">
      <section className="card card-3d p-6">
        <div className="mb-5 flex items-center gap-2.5">
          <div className="icon-chip h-8 w-8 text-fuchsia-600">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 11.5 12 4l9 7.5" />
              <path d="M6 10.5V20h12v-9.5" />
            </svg>
          </div>
          <div>
            <h2 className="font-bold text-slate-900">Your rooms</h2>
            <p className="text-xs text-slate-400">Communities where your opportunities bloom.</p>
          </div>
        </div>
        {rooms.length === 0 ? (
          <div className="rounded-xl border border-dashed border-rose-200 bg-rose-50/40 py-10 text-center">
            <p className="text-sm font-medium text-rose-300">No joined rooms yet</p>
            <p className="mt-1 text-xs text-slate-400">Create one or join from public channel suggestions below.</p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {rooms.map((room) => {
              const isOwner = room.ownerId === currentUserId;
              return (
                <li key={room.id}>
                  <Link
                    href={`/rooms/${room.id}`}
                    className="group card-3d flex items-center justify-between rounded-xl border border-rose-100/60 bg-white/60 px-4 py-3.5 hover:border-rose-200 hover:bg-white transition-all"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-rose-100 to-fuchsia-100 text-sm">
                        {room.avatarUrl ? (
                          <img src={room.avatarUrl} alt={`${room.name} avatar`} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-rose-600">
                            {room.type === "chat" ? (
                              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M20 4H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2v4l4-4h10a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Z" />
                              </svg>
                            ) : (
                              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M4 6h16" />
                                <path d="M4 12h16" />
                                <path d="M4 18h10" />
                              </svg>
                            )}
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-slate-800 group-hover:text-rose-600 transition-colors">{room.name}</h3>
                      {isOwner && (
                        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-500">
                          Owner
                        </span>
                      )}
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${badgeClass(room.type)}`}>
                        {room.type}
                      </span>
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${badgeClass(room.privacy)}`}>
                        {room.privacy}
                      </span>
                    </div>
                    <span className="text-slate-300 group-hover:text-rose-400 transition-colors">→</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="card card-3d p-6">
        <div className="mb-5 flex items-center gap-2.5">
          <div className="icon-chip h-8 w-8 text-emerald-600">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </div>
          <div>
            <h2 className="font-bold text-slate-900">Public channel suggestions</h2>
            <p className="text-xs text-slate-400">Find new people-first channels to grow your reach.</p>
          </div>
        </div>

        {suggestions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/40 py-10 text-center">
            <p className="text-sm font-medium text-emerald-400">No public suggestions right now</p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {suggestions.map((room) => (
              <li key={room.id} className="card-3d flex items-center justify-between rounded-xl border border-emerald-100/70 bg-white/60 px-4 py-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-emerald-100 to-teal-100 text-sm">
                    {room.avatarUrl ? (
                      <img src={room.avatarUrl} alt={`${room.name} avatar`} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-emerald-600">
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M4 6h16" />
                          <path d="M4 12h16" />
                          <path d="M4 18h10" />
                        </svg>
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-slate-800">{room.name}</h3>
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${badgeClass(room.type)}`}>
                    {room.type}
                  </span>
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${badgeClass(room.privacy)}`}>
                    {room.privacy}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onJoinSuggestion(room.id)}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-100 transition-colors"
                >
                  Join
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
