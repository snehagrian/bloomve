"use client";

import Link from "next/link";
import type { Room } from "@/lib/firestore";

type RoomListProps = {
  rooms: Room[];
  currentUserId?: string;
};

function badgeClass(value: string) {
  if (value === "chat") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (value === "channel") return "bg-violet-50 text-violet-700 border-violet-200";
  if (value === "public") return "bg-blue-50 text-blue-700 border-blue-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
}

export default function RoomList({ rooms, currentUserId }: RoomListProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Rooms</h2>
      <p className="mt-1 text-sm text-slate-500">Join a conversation or follow a channel for shared opportunities.</p>

      {rooms.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No rooms yet. Create your first room above.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rooms.map((room) => {
            const isOwner = room.ownerId === currentUserId;
            return (
              <li key={room.id}>
                <Link
                  href={`/rooms/${room.id}`}
                  className="block rounded-lg border border-slate-200 p-4 hover:border-indigo-300 hover:bg-indigo-50/30"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-slate-900">{room.name}</h3>
                    {isOwner && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
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
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
