"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FirebaseError } from "firebase/app";
import type { User } from "firebase/auth";
import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";
import {
  deleteCurrentUserAccount,
  logout,
  subscribeToAuthState,
  updateCurrentUserProfile,
} from "@/lib/auth";
import {
  getUserProfilesByIds,
  subscribeOwnedRooms,
  type Room,
  unblockRoomParticipant,
} from "@/lib/firestore";

function getDeleteAccountErrorMessage(error: unknown) {
  const firebaseError = error as FirebaseError | undefined;
  if (firebaseError?.code === "auth/requires-recent-login") {
    return "For security, log in again and then try deleting your account.";
  }

  return "Could not delete account right now. Please try again.";
}

function getProfileSaveErrorMessage(error: unknown) {
  const firebaseError = error as FirebaseError | undefined;
  const code = firebaseError?.code || "";
  const genericCode = error instanceof Error ? error.message : "";

  if (genericCode.includes("app/username-already-in-use")) {
    return "This username already exists. Please choose another one.";
  }

  if (code.includes("auth/email-already-in-use")) {
    return "This email already exists. Please use another email.";
  }

  if (code.includes("auth/requires-recent-login")) {
    return "For security, log in again and then update your email.";
  }

  return "Could not update profile. Please try again.";
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [ownedRooms, setOwnedRooms] = useState<Room[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [blockedNames, setBlockedNames] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    const unsubscribe = subscribeToAuthState((nextUser) => {
      setUser(nextUser);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    getUserProfilesByIds([user.uid])
      .then((profiles) => {
        if (cancelled) return;
        const profileUsername = profiles.get(user.uid)?.username?.trim();
        const fallbackUsername = user.displayName?.trim() || user.email?.split("@")[0]?.trim() || "";
        setUsername(profileUsername || fallbackUsername);
        setEmail(user.email || "");
      })
      .catch(() => {
        if (cancelled) return;
        setUsername(user.displayName?.trim() || user.email?.split("@")[0]?.trim() || "");
        setEmail(user.email || "");
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return subscribeOwnedRooms(user.uid, setOwnedRooms);
  }, [user]);

  const blockedEntries = ownedRooms.flatMap((room) =>
    (room.blockedUserIds ?? []).map((blockedUserId) => ({
      roomId: room.id,
      roomName: room.name,
      blockedUserId,
    }))
  );

  useEffect(() => {
    const blockedIds = Array.from(new Set(blockedEntries.map((entry) => entry.blockedUserId)));
    if (blockedIds.length === 0) {
      setBlockedNames(new Map());
      return;
    }

    let cancelled = false;

    getUserProfilesByIds(blockedIds)
      .then((profiles) => {
        if (cancelled) return;

        const nameMap = new Map<string, string>();
        blockedIds.forEach((blockedId) => {
          nameMap.set(blockedId, profiles.get(blockedId)?.username || "Unknown user");
        });
        setBlockedNames(nameMap);
      })
      .catch(() => {
        if (cancelled) return;
        setBlockedNames(new Map());
      });

    return () => {
      cancelled = true;
    };
  }, [blockedEntries]);

  const handleUnblockInSettings = async (roomId: string, blockedUserId: string) => {
    setError("");
    setMessage("");
    try {
      await unblockRoomParticipant(roomId, blockedUserId);
      setMessage("Participant unblocked.");
    } catch {
      setError("Could not unblock participant. Please try again.");
    }
  };

  const handleSaveProfile = async () => {
    const trimmed = username.trim();
    const trimmedEmail = email.trim();
    if (!trimmed) {
      setError("Username cannot be empty.");
      return;
    }

    if (!trimmedEmail) {
      setError("Email cannot be empty.");
      return;
    }

    setError("");
    setMessage("");
    setSavingProfile(true);
    try {
      await updateCurrentUserProfile({
        username: trimmed,
        email: trimmedEmail,
      });
      setMessage("Profile updated.");
    } catch (saveError) {
      setError(getProfileSaveErrorMessage(saveError));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm("Delete your account? This action cannot be undone.");
    if (!confirmed) return;

    setError("");
    setMessage("");
    setDeletingAccount(true);
    try {
      await deleteCurrentUserAccount();
      router.push("/signup");
    } catch (deleteError) {
      setError(getDeleteAccountErrorMessage(deleteError));
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <AuthGuard>
      <div className="mesh-bg min-h-screen">
        <Navbar username={user?.displayName} />

        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-semibold text-rose-400 hover:text-rose-500 transition-colors">
            ← Dashboard
          </Link>

          <section className="card mt-4 p-6">
            <h1 className="text-xl font-bold text-slate-900">Settings</h1>
            <p className="mt-1 text-sm text-slate-400">Manage your profile and keep your BloomVe identity up to date.</p>
          </section>

          <section className="card mt-4 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Personal information</h2>

            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">Username</label>
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="Your username"
                  className="input-field"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="input-field"
                />
              </div>
            </div>

            <button type="button" onClick={handleSaveProfile} disabled={savingProfile} className="btn-primary mt-4">
              {savingProfile ? "Saving..." : "Save profile"}
            </button>
          </section>

          <section className="card mt-4 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Help center</h2>
            <p className="mt-3 text-sm text-slate-500">
              Need help? Contact <a href="mailto:support@bloomve.app" className="font-semibold text-rose-500 hover:text-rose-600">support@bloomve.app</a>
            </p>
          </section>

          <section className="card mt-4 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Blocked participants</h2>

            {blockedEntries.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No blocked participants in your owned chats/channels.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {blockedEntries.map((entry) => (
                  <li key={`${entry.roomId}-${entry.blockedUserId}`} className="flex items-center justify-between rounded-lg border border-rose-100 bg-white px-3 py-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{blockedNames.get(entry.blockedUserId) || "Unknown user"}</p>
                      <p className="text-xs text-slate-500">In {entry.roomName}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUnblockInSettings(entry.roomId, entry.blockedUserId)}
                      className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600 hover:bg-emerald-100"
                    >
                      Unblock
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card mt-4 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Account actions</h2>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button type="button" onClick={handleLogout} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                Log out
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors disabled:opacity-60"
              >
                {deletingAccount ? "Deleting..." : "Delete account"}
              </button>
            </div>
          </section>

          {error && (
            <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-500">
              {error}
            </div>
          )}

          {message && (
            <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {message}
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
