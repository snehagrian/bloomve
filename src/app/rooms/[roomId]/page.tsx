"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { User } from "firebase/auth";
import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";
import ShareComposer from "@/components/ShareComposer";
import { subscribeToAuthState } from "@/lib/auth";
import { addRoomPost, subscribeToRoom, subscribeToRoomPosts, type Post, type Room } from "@/lib/firestore";

function prettyDate(ms?: number) {
  if (!ms) return "Just now";
  return new Date(ms).toLocaleString();
}

export default function RoomPage() {
  const params = useParams<{ roomId: string }>();
  const roomId = params?.roomId;

  const [user, setUser] = useState<User | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    const unsubscribeAuth = subscribeToAuthState((nextUser) => setUser(nextUser));
    return unsubscribeAuth;
  }, []);

  useEffect(() => {
    if (!roomId) return;
    const unsubscribeRoom = subscribeToRoom(roomId, setRoom);
    return unsubscribeRoom;
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;
    const unsubscribePosts = subscribeToRoomPosts(roomId, setPosts);
    return unsubscribePosts;
  }, [roomId]);

  const canPost = useMemo(() => {
    if (!room || !user) return false;
    if (room.type === "chat") return true;
    return room.ownerId === user.uid;
  }, [room, user]);

  const handleShare = async (input: { title: string; text: string; jobUrl: string }) => {
    if (!roomId || !user) return;

    await addRoomPost({
      roomId,
      userId: user.uid,
      title: input.title,
      text: input.text,
      jobUrl: input.jobUrl,
    });
  };

  return (
    <AuthGuard>
      <div className="mesh-bg min-h-screen">
        <Navbar userEmail={user?.email} />

        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-semibold text-rose-400 hover:text-rose-500 transition-colors">
            ← Dashboard
          </Link>

          {!room ? (
            <div className="card mt-4 p-8 text-center">
              <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-rose-200 border-t-rose-500"></div>
              <p className="mt-3 text-sm text-slate-400">Loading room...</p>
            </div>
          ) : (
            <>
              {/* Room header */}
              <section className="card mt-4 p-5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-rose-100 to-fuchsia-100 text-base">
                    {room.type === "chat" ? "💬" : "📢"}
                  </div>
                  <h1 className="text-xl font-bold text-slate-900">{room.name}</h1>
                  <span className="rounded-full border border-rose-200/70 bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-500">
                    {room.type}
                  </span>
                  <span className="rounded-full border border-fuchsia-200/70 bg-fuchsia-50 px-2.5 py-0.5 text-xs font-semibold text-fuchsia-500">
                    {room.privacy}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-400">
                  {room.type === "chat"
                    ? "Chat room — everyone can post."
                    : "Channel — only the owner can post."}
                </p>
              </section>

              <div className="mt-6 grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-1">
                  <ShareComposer
                    canPost={canPost}
                    postModeLabel={room.type === "chat" ? "Two-way chat" : "One-way channel"}
                    onShare={handleShare}
                  />
                </div>

                <section className="space-y-3 lg:col-span-2">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Room feed</h2>

                  {posts.length === 0 ? (
                    <div className="card py-14 text-center">
                      <p className="text-3xl">🌸</p>
                      <p className="mt-3 font-medium text-slate-400">No posts yet</p>
                      <p className="mt-1 text-xs text-slate-300">Share a job link to get things started.</p>
                    </div>
                  ) : (
                    posts.map((post) => (
                      <article key={post.id} className="card group p-5 hover:shadow-md hover:shadow-rose-50 transition-all">
                        <div className="flex items-start justify-between gap-4">
                          <h3 className="font-semibold text-slate-900 leading-snug">{post.title || "Shared job link"}</h3>
                          <span className="shrink-0 text-xs text-slate-300">{prettyDate(post.createdAt?.toMillis())}</span>
                        </div>

                        {post.text && <p className="mt-2 text-sm leading-relaxed text-slate-500">{post.text}</p>}

                        <a
                          href={post.jobUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-rose-500 hover:text-rose-600 transition-colors"
                        >
                          View posting <span className="group-hover:translate-x-0.5 transition-transform inline-block">→</span>
                        </a>
                      </article>
                    ))
                  )}
                </section>
              </div>
            </>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
