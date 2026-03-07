"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";
import CreateRoomForm from "@/components/CreateRoomForm";
import RoomList from "@/components/RoomList";
import { subscribeToAuthState } from "@/lib/auth";
import { createRoom, subscribeRoomsForUser, type Room, type RoomPrivacy, type RoomType } from "@/lib/firestore";

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);

  useEffect(() => {
    const unsubscribeAuth = subscribeToAuthState((nextUser) => {
      setUser(nextUser);
    });
    return unsubscribeAuth;
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubscribeRooms = subscribeRoomsForUser(user.uid, setRooms);
    return unsubscribeRooms;
  }, [user]);

  const roomSummary = useMemo(() => {
    const chats = rooms.filter((room) => room.type === "chat").length;
    const channels = rooms.filter((room) => room.type === "channel").length;
    return { chats, channels };
  }, [rooms]);

  const handleCreateRoom = async (input: { name: string; type: RoomType; privacy: RoomPrivacy }) => {
    if (!user) return;

    await createRoom({
      ...input,
      ownerId: user.uid,
    });
  };

  return (
    <AuthGuard>
      <div className="mesh-bg min-h-screen">
        <Navbar userEmail={user?.email} />

        <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-3 lg:px-8">
          {/* Sidebar */}
          <section className="card p-6 lg:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-rose-400 to-fuchsia-500 shadow-sm shadow-rose-200">
                <span>🏠</span>
              </div>
              <div>
                <h1 className="font-bold text-slate-900">Dashboard</h1>
                <p className="text-xs text-slate-400">Your rooms &amp; activity</p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-rose-100 bg-gradient-to-br from-rose-50 to-pink-50/50 p-4 text-center">
                <p className="text-3xl font-bold text-rose-500">{roomSummary.chats}</p>
                <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-rose-400">Chats</p>
              </div>
              <div className="rounded-xl border border-fuchsia-100 bg-gradient-to-br from-fuchsia-50 to-pink-50/50 p-4 text-center">
                <p className="text-3xl font-bold text-fuchsia-500">{roomSummary.channels}</p>
                <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-fuchsia-400">Channels</p>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-rose-100/60 bg-rose-50/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-rose-400">Tip</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">Create a public chat room and install the browser extension to share job links in one click.</p>
            </div>
          </section>

          {/* Main content */}
          <div className="space-y-6 lg:col-span-2">
            <CreateRoomForm onCreateRoom={handleCreateRoom} />
            <RoomList rooms={rooms} currentUserId={user?.uid} />
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
