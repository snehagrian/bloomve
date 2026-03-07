"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FirebaseError } from "firebase/app";
import { signUpWithEmail } from "@/lib/auth";

function getAuthErrorMessage(error: unknown) {
  const firebaseError = error as FirebaseError | undefined;
  const code = firebaseError?.code || "";

  if (code.includes("auth/configuration-not-found")) {
    return "Firebase Auth is not fully enabled yet. Open Firebase Console → Authentication → Get started, then enable Email/Password.";
  }

  if (code.includes("auth/email-already-in-use")) {
    return "This email is already registered. Please log in instead.";
  }

  if (code.includes("auth/weak-password")) {
    return "Password is too weak. Use at least 6 characters.";
  }

  if (code.includes("auth/invalid-api-key")) {
    return "Firebase API key is invalid. Recheck NEXT_PUBLIC_FIREBASE_API_KEY in .env.local.";
  }

  return "Could not create account. Please verify Firebase Auth settings and try again.";
}

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signUpWithEmail(email.trim(), password);
      router.push("/dashboard");
    } catch (error) {
      setError(getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mesh-bg flex min-h-screen items-center justify-center px-4 py-12">
      <div className="card w-full max-w-md p-8 sm:p-10">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-400 to-fuchsia-500 shadow-lg shadow-rose-200">
            <span className="text-xl">🌸</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Create your account</h1>
          <p className="mt-1.5 text-sm text-slate-400">Join BloomVe and start sharing opportunities.</p>
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
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Min. 6 characters"
              className="input-field"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-500">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Creating account..." : "Create account →"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-400">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-rose-500 hover:text-rose-600">
            Log in
          </Link>
        </div>
      </div>
    </main>
  );
}
