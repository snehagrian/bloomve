"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { FirebaseError } from "firebase/app";
import { loginWithEmail, sendPasswordReset } from "@/lib/auth";

function getAuthErrorMessage(error: unknown) {
  const firebaseError = error as FirebaseError | undefined;
  const code = firebaseError?.code || "";

  if (code.includes("auth/configuration-not-found")) {
    return "Firebase Auth is not fully enabled yet. Open Firebase Console → Authentication → Get started, then enable Email/Password.";
  }

  if (code.includes("auth/invalid-credential") || code.includes("auth/user-not-found") || code.includes("auth/wrong-password")) {
    return "Invalid login details. Please check your email and password.";
  }

  if (code.includes("auth/invalid-api-key")) {
    return "Firebase API key is invalid. Recheck NEXT_PUBLIC_FIREBASE_API_KEY in .env.local.";
  }

  if (code.includes("auth/too-many-requests")) {
    return "Too many attempts. Please wait and try again.";
  }

  return "Could not log in. Please verify Firebase Auth settings and try again.";
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await loginWithEmail(email.trim(), password);
      router.push(nextUrl);
    } catch (error) {
      setError(getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError("");
    setResetMessage("");

    if (!email.trim()) {
      setError("Enter your email first, then click Forgot password.");
      return;
    }

    setResetLoading(true);
    try {
      await sendPasswordReset(email.trim());
      setResetMessage("Password reset email sent. Check your inbox.");
    } catch (resetError) {
      setError(getAuthErrorMessage(resetError));
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <main className="mesh-bg flex min-h-screen items-center justify-center px-4 py-12">
      <div className="card w-full max-w-md p-8 sm:p-10">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-400 to-fuchsia-500 shadow-lg shadow-rose-200">
            <span className="text-sm font-bold tracking-wider text-white">✿</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Welcome back</h1>
          <p className="mt-1.5 text-sm text-slate-400">Opportunities bloom via people.</p>
          <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
            <span className="bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-500 bg-clip-text text-transparent">
              BloomVe
            </span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="input-field"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Your password"
              className="input-field"
            />
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={resetLoading}
              className="mt-2 text-xs font-semibold text-rose-500 hover:text-rose-600"
            >
              {resetLoading ? "Sending reset email..." : "Forgot password?"}
            </button>
          </div>

          {error && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-500">
              {error}
            </div>
          )}

          {resetMessage && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {resetMessage}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Logging in..." : "Log in →"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-400">
          New here?{" "}
          <Link href="/signup" className="font-semibold text-rose-500 hover:text-rose-600">
            Create an account
          </Link>
        </div>
      </div>
    </main>
  );
}
