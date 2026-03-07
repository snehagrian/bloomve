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
      <div className="min-h-screen bg-slate-50">
        <Navbar userEmail={user?.email} />

        <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-3 lg:px-8">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-1">
            <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
            <p className="mt-1 text-sm text-slate-500">Manage rooms and collaborate on job opportunities.</p>

            <div className="mt-5 grid grid-cols-2 gap-3 text-center">
              <div className="rounded-lg bg-indigo-50 p-3">
                <p className="text-2xl font-semibold text-indigo-700">{roomSummary.chats}</p>
                <p className="text-xs font-medium text-indigo-600">Chats</p>
              </div>
              <div className="rounded-lg bg-violet-50 p-3">
                <p className="text-2xl font-semibold text-violet-700">{roomSummary.channels}</p>
                <p className="text-xs font-medium text-violet-600">Channels</p>
              </div>
            </div>
          </section>

          <div className="space-y-6 lg:col-span-2">
            <CreateRoomForm onCreateRoom={handleCreateRoom} />
            <RoomList rooms={rooms} currentUserId={user?.uid} />
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
