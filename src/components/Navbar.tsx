"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/auth";

type NavbarProps = {
  userEmail?: string | null;
};

export default function Navbar({ userEmail }: NavbarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-rose-100/60 bg-white/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-rose-400 to-fuchsia-500 shadow-sm shadow-rose-200">
            <span className="text-sm">🌸</span>
          </div>
          <span className="text-base font-bold tracking-tight">
            <span className="bg-gradient-to-r from-rose-500 to-fuchsia-500 bg-clip-text text-transparent">BloomVe</span>
          </span>
        </Link>
        <div className="flex items-center gap-4">
          {userEmail && (
            <span className="hidden rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-400 sm:inline">
              {userEmail}
            </span>
          )}
          <button
            onClick={handleLogout}
            className="btn-ghost py-1.5 text-xs"
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
