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
      <div className="min-h-screen bg-slate-50">
        <Navbar userEmail={user?.email} />

        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
            ← Back to dashboard
          </Link>

          {!room ? (
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
              Loading room...
            </div>
          ) : (
            <>
              <section className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-semibold text-slate-900">{room.name}</h1>
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                    {room.type}
                  </span>
                  <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                    {room.privacy}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  {room.type === "chat"
                    ? "Chat: everyone in this room can post."
                    : "Channel: only owner/admin can post."}
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
                  <h2 className="text-lg font-semibold text-slate-900">Room feed</h2>

                  {posts.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
                      No shared links yet. Add one now.
                    </div>
                  ) : (
                    posts.map((post) => (
                      <article key={post.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between gap-4">
                          <h3 className="font-semibold text-slate-900">{post.title || "Shared job link"}</h3>
                          <span className="text-xs text-slate-500">{prettyDate(post.createdAt?.toMillis())}</span>
                        </div>

                        {post.text && <p className="mt-2 text-sm text-slate-700">{post.text}</p>}

                        <a
                          href={post.jobUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-500"
                        >
                          Open job posting
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
