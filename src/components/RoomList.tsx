"use client";

import Link from "next/link";
import type { Room } from "@/lib/firestore";

type RoomListProps = {
  rooms: Room[];
  currentUserId?: string;
};

function badgeClass(value: string) {
  if (value === "chat") return "bg-rose-50 text-rose-600 border-rose-200/80";
  if (value === "channel") return "bg-fuchsia-50 text-fuchsia-600 border-fuchsia-200/80";
  if (value === "public") return "bg-emerald-50 text-emerald-600 border-emerald-200/80";
  return "bg-amber-50 text-amber-600 border-amber-200/80";
}

export default function RoomList({ rooms, currentUserId }: RoomListProps) {
  return (
    <section className="card p-6">
      <div className="mb-5 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-fuchsia-100 to-pink-100 text-base">
          🚪
        </div>
        <div>
          <h2 className="font-bold text-slate-900">Your rooms</h2>
          <p className="text-xs text-slate-400">Tap a room to open its feed.</p>
        </div>
      </div>

      {rooms.length === 0 ? (
        <div className="rounded-xl border border-dashed border-rose-200 bg-rose-50/40 py-10 text-center">
          <p className="text-sm font-medium text-rose-300">No rooms yet</p>
          <p className="mt-1 text-xs text-slate-400">Create your first room above to get started.</p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {rooms.map((room) => {
            const isOwner = room.ownerId === currentUserId;
            return (
              <li key={room.id}>
                <Link
                  href={`/rooms/${room.id}`}
                  className="group flex items-center justify-between rounded-xl border border-rose-100/60 bg-white/60 px-4 py-3.5 hover:border-rose-200 hover:bg-white hover:shadow-sm hover:shadow-rose-50 transition-all"
                >
                  <div className="flex flex-wrap items-center gap-2">
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
  );
}
