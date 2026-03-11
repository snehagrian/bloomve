"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import type { User } from "firebase/auth";
import type { FirestoreError } from "firebase/firestore";
import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";
import ShareComposer from "@/components/ShareComposer";
import { subscribeToAuthState } from "@/lib/auth";
import {
  addRoomParticipant,
  addRoomPost,
  blockRoomParticipant,
  deleteRoom,
  findUserIdByUsername,
  getUserProfilesByIds,
  joinRoomWithInvite,
  removeRoomParticipant,
  renameRoom,
  updateRoomSettings,
  uploadRoomAvatar,
  subscribeToRoom,
  subscribeToRoomPosts,
  type Post,
  type RoomPrivacy,
  type Room,
  type UserProfile,
} from "@/lib/firestore";

function prettyDate(ms?: number) {
  if (!ms) return "Just now";
  return new Date(ms).toLocaleString();
}

export default function RoomPage() {
  const params = useParams<{ roomId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomId = params?.roomId;
  const inviteToken = searchParams.get("invite")?.trim() || "";

  const [user, setUser] = useState<User | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [inviteStatus, setInviteStatus] = useState<"idle" | "joined" | "failed">("idle");
  const [accessDenied, setAccessDenied] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [showNameEditor, setShowNameEditor] = useState(false);
  const [draftRoomName, setDraftRoomName] = useState("");
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState("");
  const [draftRoomPrivacy, setDraftRoomPrivacy] = useState<RoomPrivacy>("public");
  const [draftMaxMembers, setDraftMaxMembers] = useState("500");
  const [participantInput, setParticipantInput] = useState("");
  const [activeParticipantMenuId, setActiveParticipantMenuId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [profilesById, setProfilesById] = useState<Map<string, UserProfile>>(new Map());
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const unsubscribeAuth = subscribeToAuthState((nextUser) => setUser(nextUser));
    return unsubscribeAuth;
  }, []);

  useEffect(() => {
    if (!roomId || !user || !inviteToken) return;

    joinRoomWithInvite(roomId, user.uid, inviteToken)
      .then(() => setInviteStatus("joined"))
      .catch(() => setInviteStatus("failed"));
  }, [inviteToken, roomId, user]);

  useEffect(() => {
    if (!roomId) return;
    const unsubscribeRoom = subscribeToRoom(
      roomId,
      (nextRoom) => {
        setRoom(nextRoom);
        if (nextRoom) {
          setAccessDenied(false);
        }
      },
      (error: FirestoreError) => {
        if (error.code === "permission-denied") {
          setAccessDenied(true);
        }
      }
    );
    return unsubscribeRoom;
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;
    const unsubscribePosts = subscribeToRoomPosts(
      roomId,
      setPosts,
      (error: FirestoreError) => {
        if (error.code === "permission-denied") {
          setAccessDenied(true);
        }
      }
    );
    return unsubscribePosts;
  }, [roomId]);

  const canPost = useMemo(() => {
    if (!room || !user) return false;
    if (room.type === "chat") return true;
    return room.ownerId === user.uid;
  }, [room, user]);

  const isOwner = !!room && !!user && room.ownerId === user.uid;

  const participants = useMemo(() => {
    if (!room) return [];
    return Array.from(new Set([room.ownerId, ...(room.memberIds ?? [])]));
  }, [room]);

  const profileLookupIds = useMemo(() => Array.from(new Set(participants)), [participants]);

  useEffect(() => {
    let cancelled = false;

    Promise.resolve()
      .then(async () => {
        if (profileLookupIds.length === 0) {
          return new Map();
        }

        return getUserProfilesByIds(profileLookupIds);
      })
      .then((profiles) => {
        if (!cancelled) {
          setProfilesById(profiles);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProfilesById(new Map());
        }
      });

    return () => {
      cancelled = true;
    };
  }, [profileLookupIds]);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);

  const inviteLink = useMemo(() => {
    if (!room?.inviteToken || typeof window === "undefined") return "";
    return `${window.location.origin}/rooms/${room.id}?invite=${room.inviteToken}`;
  }, [room]);

  const getParticipantLabel = (participantId: string) => {
    const profileName = profilesById.get(participantId)?.username?.trim();
    if (profileName) return profileName;

    if (user?.uid === participantId) {
      const displayName = user.displayName?.trim();
      if (displayName) return displayName;
      const emailPrefix = user.email?.split("@")[0]?.trim();
      if (emailPrefix) return emailPrefix;
      return "You";
    }

    return "Unknown user";
  };

  const roomAvatarElement = (
    <div className="icon-chip flex h-9 w-9 items-center justify-center overflow-hidden text-base">
      {avatarPreviewUrl ? (
        <Image src={avatarPreviewUrl} alt={`${room?.name ?? "room"} avatar preview`} width={36} height={36} className="h-full w-full object-cover" unoptimized />
      ) : room?.avatarUrl ? (
        <Image src={room.avatarUrl} alt={`${room.name} avatar`} width={36} height={36} className="h-full w-full object-cover" unoptimized />
      ) : (
        <span className="text-rose-600">
          {room?.type === "chat" ? (
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
  );

  const handleAvatarFilePicked = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setActionError("Please choose an image file.");
      return;
    }

    if (avatarPreviewUrl) {
      URL.revokeObjectURL(avatarPreviewUrl);
    }

    setSelectedAvatarFile(file);
    setAvatarPreviewUrl(URL.createObjectURL(file));
    setShowAvatarPicker(false);
    setActionError("");
    setActionMessage("");
  };

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

  const handleRenameRoom = async () => {
    if (!room || !draftRoomName.trim()) return;
    setActionError("");
    setActionMessage("");
    try {
      await renameRoom(room.id, draftRoomName);
      setActionMessage("Room name updated.");
    } catch {
      setActionError("Could not update room name.");
    }
  };

  const handleAddParticipant = async () => {
    if (!room || !participantInput.trim()) return;
    const typedUsername = participantInput.trim();
    setActionError("");
    setActionMessage("");
    try {
      const targetUserId = await findUserIdByUsername(typedUsername);
      if (!targetUserId) {
        setActionError("No user found with that username.");
        return;
      }

      await addRoomParticipant(room.id, targetUserId);
      setParticipantInput("");
      setActionMessage("Participant added.");
    } catch (addError) {
      const code = addError instanceof Error ? addError.message : "";
      if (code.includes("room-members-limit-reached")) {
        setActionError("Room member limit reached. Increase the limit to add more participants.");
        return;
      }

      setActionError("Could not add participant.");
    }
  };

  const handleSaveRoomSettings = async () => {
    if (!room) return;

    const parsedLimit = Number.parseInt(draftMaxMembers, 10);
    if (!Number.isFinite(parsedLimit) || parsedLimit < 1 || parsedLimit > 500) {
      setActionError("Max users must be between 1 and 500.");
      return;
    }

    setActionError("");
    setActionMessage("");
    try {
      const uploadedAvatarUrl = selectedAvatarFile
        ? await uploadRoomAvatar(room.id, selectedAvatarFile)
        : room.avatarUrl;

      await updateRoomSettings({
        roomId: room.id,
        privacy: draftRoomPrivacy,
        maxMembers: parsedLimit,
        avatarUrl: uploadedAvatarUrl,
      });
      setSelectedAvatarFile(null);
      setActionMessage("Room settings updated.");
    } catch {
      setActionError("Could not update room settings.");
    }
  };

  const handleRemoveParticipant = async (targetUserId: string) => {
    if (!room || targetUserId === room.ownerId) return;
    setActionError("");
    setActionMessage("");
    try {
      await removeRoomParticipant(room.id, targetUserId);
      setActionMessage("Participant removed.");
    } catch {
      setActionError("Could not remove participant.");
    }
  };

  const handleBlockParticipant = async (targetUserId: string) => {
    if (!room || targetUserId === room.ownerId) return;
    setActionError("");
    setActionMessage("");
    try {
      await blockRoomParticipant(room.id, targetUserId);
      setActionMessage("Participant blocked.");
      setActiveParticipantMenuId(null);
    } catch {
      setActionError("Could not block participant.");
    }
  };

  const handleMessageParticipant = (targetUserId: string) => {
    const email = profilesById.get(targetUserId)?.email?.trim();
    if (!email) {
      setActionMessage("Direct message is not available for this participant yet.");
      setActiveParticipantMenuId(null);
      return;
    }

    window.open(`mailto:${email}`, "_self");
    setActiveParticipantMenuId(null);
  };

  const handleDeleteRoom = async () => {
    if (!room) return;
    const confirmed = window.confirm("Delete this room? This cannot be undone.");
    if (!confirmed) return;

    setActionError("");
    setActionMessage("");
    try {
      await deleteRoom(room.id);
      router.push("/dashboard");
    } catch {
      setActionError("Could not delete room.");
    }
  };

  return (
    <AuthGuard>
      <div className="mesh-bg fx-stage min-h-screen">
        <Navbar username={user?.displayName} />

        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-semibold text-rose-400 hover:text-rose-500 transition-colors">
            ← Dashboard
          </Link>

          {inviteStatus === "failed" && (
            <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
              Invite link is invalid or expired.
            </div>
          )}

          {accessDenied ? (
            <div className="card mt-4 p-8 text-center">
              <p className="text-sm font-semibold text-red-500">You don&apos;t have access to this room.</p>
              <p className="mt-1 text-xs text-slate-400">Use a valid invite link or ask the room owner to add you.</p>
            </div>
          ) : !room ? (
            <div className="card mt-4 p-8 text-center">
              <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-rose-200 border-t-rose-500"></div>
              <p className="mt-3 text-sm text-slate-400">Loading room...</p>
            </div>
          ) : (
            <>
              <section className="card card-3d mt-4 p-5">
                <div className="flex flex-wrap items-center gap-2.5">
                  {roomAvatarElement}
                  <h1 className="text-xl font-bold text-slate-900">{room.name}</h1>
                  <span className="rounded-full border border-rose-200/70 bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-500">
                    {room.type}
                  </span>
                  <span className="rounded-full border border-fuchsia-200/70 bg-fuchsia-50 px-2.5 py-0.5 text-xs font-semibold text-fuchsia-500">
                    {room.privacy}
                  </span>
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => {
                        const next = !showManage;
                        setShowManage(next);
                        if (next) {
                          setDraftRoomName(room.name);
                          setShowAvatarPicker(false);
                          setShowNameEditor(false);
                          setSelectedAvatarFile(null);
                          if (avatarPreviewUrl) {
                            URL.revokeObjectURL(avatarPreviewUrl);
                            setAvatarPreviewUrl("");
                          }
                          setDraftRoomPrivacy(room.privacy);
                          setDraftMaxMembers(String(room.maxMembers ?? 500));
                        }
                      }}
                      className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition-colors"
                    >
                      {showManage ? "Hide settings" : "Room settings"}
                    </button>
                  )}
                </div>
                <p className="mt-2 text-sm text-slate-400">
                  {room.type === "chat" ? "Chat room — opportunities bloom via everyone sharing." : "Channel — the owner curates opportunities for the community."}
                </p>

                {!isOwner && (
                  <p className="mt-2 text-xs text-slate-400">Only the room owner can change privacy and member limits.</p>
                )}

                {isOwner && showManage && (
                  <div className="mt-4 rounded-xl border border-rose-100/80 bg-rose-50/40 p-4">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Manage room</h2>

                    {inviteLink && (
                      <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50/50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Invite link</p>
                        <p className="mt-1 break-all text-xs text-slate-500">{inviteLink}</p>
                        <button
                          type="button"
                          onClick={() => navigator.clipboard.writeText(inviteLink)}
                          className="mt-2 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 transition-colors"
                        >
                          Copy link
                        </button>
                      </div>
                    )}

                    <div className="mt-4 rounded-lg border border-rose-100 bg-white/70 p-3">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="icon-chip flex h-14 w-14 items-center justify-center overflow-hidden text-xl">
                            {avatarPreviewUrl ? (
                              <Image src={avatarPreviewUrl} alt={`${room.name} avatar preview`} width={56} height={56} className="h-full w-full object-cover" unoptimized />
                            ) : room.avatarUrl ? (
                              <Image src={room.avatarUrl} alt={`${room.name} avatar`} width={56} height={56} className="h-full w-full object-cover" unoptimized />
                            ) : (
                              <span className="text-rose-600">
                                {room.type === "chat" ? (
                                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <path d="M20 4H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2v4l4-4h10a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Z" />
                                  </svg>
                                ) : (
                                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <path d="M4 6h16" />
                                    <path d="M4 12h16" />
                                    <path d="M4 18h10" />
                                  </svg>
                                )}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowAvatarPicker((previous) => !previous)}
                            className="absolute -right-1 -bottom-1 rounded-full border border-rose-200 bg-white p-1 text-xs text-rose-600 shadow-sm hover:bg-rose-50"
                          >
                            ✎
                          </button>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-semibold text-slate-800">{room.name}</p>
                            <button
                              type="button"
                              onClick={() => setShowNameEditor((previous) => !previous)}
                              className="rounded-md border border-rose-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-50"
                            >
                              ✎
                            </button>
                          </div>

                          {showNameEditor && (
                            <div className="mt-2 flex items-center gap-2">
                              <input value={draftRoomName} onChange={(event) => setDraftRoomName(event.target.value)} className="input-field" />
                              <button type="button" onClick={handleRenameRoom} className="btn-primary whitespace-nowrap">
                                Save
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {showAvatarPicker && (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => galleryInputRef.current?.click()}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                          >
                            Upload photo
                          </button>
                          <button
                            type="button"
                            onClick={() => cameraInputRef.current?.click()}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                          >
                            Use camera
                          </button>
                          <input
                            ref={galleryInputRef}
                            type="file"
                            accept="image/*"
                            onChange={(event) => handleAvatarFilePicked(event.target.files?.[0] ?? null)}
                            className="hidden"
                          />
                          <input
                            ref={cameraInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={(event) => handleAvatarFilePicked(event.target.files?.[0] ?? null)}
                            className="hidden"
                          />
                        </div>
                      )}
                    </div>

                    <div className="mt-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Participants</p>
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          value={participantInput}
                          onChange={(event) => setParticipantInput(event.target.value)}
                          placeholder="Enter username"
                          className="input-field"
                        />
                        <button type="button" onClick={handleAddParticipant} className="btn-primary whitespace-nowrap">
                          Add
                        </button>
                      </div>
                    </div>

                    <div className="mt-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Participants</p>
                      <ul className="mt-2 space-y-2">
                        {participants.map((participantId) => (
                          <li key={participantId} className="relative flex items-center justify-between rounded-lg border border-rose-100 bg-white px-3 py-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-slate-700">{getParticipantLabel(participantId)}</span>
                              {participantId === room.ownerId && (
                                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-500">Owner</span>
                              )}
                            </div>

                            {participantId !== room.ownerId && (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setActiveParticipantMenuId((previous) =>
                                      previous === participantId ? null : participantId
                                    )
                                  }
                                  className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-100"
                                >
                                  ⋮
                                </button>

                                {activeParticipantMenuId === participantId && (
                                  <div className="absolute right-3 top-10 z-10 w-40 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                                    <button
                                      type="button"
                                      onClick={() => handleMessageParticipant(participantId)}
                                      className="w-full rounded-md px-2 py-1.5 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50"
                                    >
                                      Message
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        handleRemoveParticipant(participantId);
                                        setActiveParticipantMenuId(null);
                                      }}
                                      className="w-full rounded-md px-2 py-1.5 text-left text-xs font-semibold text-amber-600 hover:bg-amber-50"
                                    >
                                      Remove from group
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleBlockParticipant(participantId)}
                                      className="w-full rounded-md px-2 py-1.5 text-left text-xs font-semibold text-red-600 hover:bg-red-50"
                                    >
                                      Block
                                    </button>
                                  </div>
                                )}
                              </>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-4 space-y-3">
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">Room privacy</label>
                        <select
                          value={draftRoomPrivacy}
                          onChange={(event) => setDraftRoomPrivacy(event.target.value as RoomPrivacy)}
                          className="input-field"
                        >
                          <option value="public">Public</option>
                          <option value="private">Private</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">Maximum users</label>
                        <input
                          type="number"
                          min={1}
                          max={500}
                          value={draftMaxMembers}
                          onChange={(event) => setDraftMaxMembers(event.target.value)}
                          className="input-field"
                        />
                        <p className="mt-1 text-xs text-slate-400">Current: {participants.length}/{room.maxMembers ?? 500}</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleSaveRoomSettings}
                        className="btn-primary"
                      >
                        Save room settings
                      </button>
                    </div>

                    {actionError && <div className="mt-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">{actionError}</div>}
                    {actionMessage && (
                      <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{actionMessage}</div>
                    )}

                    <div className="mt-4 border-t border-rose-100 pt-4">
                      <button
                        type="button"
                        onClick={handleDeleteRoom}
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors"
                      >
                        Delete room
                      </button>
                    </div>
                  </div>
                )}
              </section>

              <div className="mt-6 grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-1">
                  <div className="card-3d">
                    <ShareComposer canPost={canPost} postModeLabel={room.type === "chat" ? "Two-way chat" : "One-way channel"} onShare={handleShare} />
                  </div>
                </div>

                <section className="space-y-3 lg:col-span-2">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Room feed</h2>

                  {posts.length === 0 ? (
                    <div className="card py-14 text-center">
                      <p className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-100 to-pink-100 text-xs font-bold tracking-wider text-rose-600">BLOOM</p>
                      <p className="mt-3 font-medium text-slate-400">No posts yet</p>
                      <p className="mt-1 text-xs text-slate-300">Share the first opportunity and help this room bloom.</p>
                    </div>
                  ) : (
                    posts.map((post) => (
                      <article key={post.id} className="card card-3d group p-5 transition-all">
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
