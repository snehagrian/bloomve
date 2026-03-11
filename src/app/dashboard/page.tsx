"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";
import CreateRoomForm from "@/components/CreateRoomForm";
import RoomList from "@/components/RoomList";
import NotesTab from "@/components/NotesTab";
import { subscribeToAuthState } from "@/lib/auth";
import {
  createRoom,
  joinPublicChannel,
  subscribePublicChannelSuggestions,
  subscribeRoomsForUser,
  type Room,
  type RoomPrivacy,
  type RoomType,
} from "@/lib/firestore";

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [suggestions, setSuggestions] = useState<Room[]>([]);
  const [activeTab, setActiveTab] = useState<"chat" | "channels" | "notes">("chat");

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

  useEffect(() => {
    if (!user) return;
    const unsubscribeSuggestions = subscribePublicChannelSuggestions(user.uid, setSuggestions);
    return unsubscribeSuggestions;
  }, [user]);

  const roomSummary = useMemo(() => {
    const chats = rooms.filter((room) => room.type === "chat").length;
    const channels = rooms.filter((room) => room.type === "channel").length;
    return { chats, channels };
  }, [rooms]);

  const handleCreateRoom = async (input: {
    name: string;
    type: RoomType;
    privacy: RoomPrivacy;
    friendIds: string[];
  }) => {
    if (!user) return;

    return createRoom({
      ...input,
      ownerId: user.uid,
    });
  };

  const handleJoinSuggestion = async (roomId: string) => {
    if (!user) return;
    await joinPublicChannel(roomId, user.uid);
  };

  return (
    <AuthGuard>
      <div className="mesh-bg fx-stage min-h-screen">
        <Navbar username={user?.displayName} />

        <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-3 lg:px-8">
          {/* Sidebar */}
          <div className="space-y-6 lg:col-span-1">
            <section className="card card-3d p-6">
              <div className="flex items-center gap-2.5">
                <div className="icon-chip h-9 w-9 text-rose-600">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="3" width="8" height="8" rx="2" />
                    <rect x="13" y="3" width="8" height="5" rx="2" />
                    <rect x="13" y="10" width="8" height="11" rx="2" />
                    <rect x="3" y="13" width="8" height="8" rx="2" />
                  </svg>
                </div>
                <div>
                  <h1 className="font-bold text-slate-900">Dashboard</h1>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-400">Opportunities bloom via people.</p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="glass-panel card-3d rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-rose-500">{roomSummary.chats}</p>
                  <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-rose-400">Chats</p>
                </div>
                <div className="glass-panel card-3d rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-fuchsia-500">{roomSummary.channels}</p>
                  <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-fuchsia-400">Channels</p>
                </div>
              </div>

              <div className="mt-5 glass-panel rounded-xl p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-rose-400">Bloom Tip</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">Create a room, invite people you trust, and share opportunities faster with the extension.</p>
              </div>
            </section>

            <RoomList
              rooms={rooms}
              suggestions={suggestions}
              currentUserId={user?.uid}
              onJoinSuggestion={handleJoinSuggestion}
            />
          </div>

          {/* Main content */}
          <div className="space-y-6 lg:col-span-2">
            <section className="card p-3">
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("chat")}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                    activeTab === "chat"
                      ? "bg-rose-500 text-white"
                      : "border border-rose-200 bg-white text-rose-500 hover:bg-rose-50"
                  }`}
                >
                  Chat
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("channels")}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                    activeTab === "channels"
                      ? "bg-fuchsia-500 text-white"
                      : "border border-fuchsia-200 bg-white text-fuchsia-500 hover:bg-fuchsia-50"
                  }`}
                >
                  Channels
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("notes")}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                    activeTab === "notes"
                      ? "bg-pink-500 text-white"
                      : "border border-pink-200 bg-white text-pink-500 hover:bg-pink-50"
                  }`}
                >
                  Notes
                </button>
              </div>
            </section>

            {activeTab === "notes" ? (
              <NotesTab />
            ) : (
              <CreateRoomForm onCreateRoom={handleCreateRoom} />
            )}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
