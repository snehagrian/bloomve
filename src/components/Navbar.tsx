"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/auth";

type NavbarProps = {
  username?: string | null;
};

export default function Navbar({ username }: NavbarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-rose-100/60 bg-white/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="icon-chip soft-glow h-8 w-8 text-rose-600">
            <span className="text-sm font-bold leading-none">✿</span>
          </div>
          <div className="leading-tight">
            <span className="block text-base font-bold tracking-tight">
              <span className="bg-gradient-to-r from-rose-500 to-fuchsia-500 bg-clip-text text-transparent">BloomVe</span>
            </span>
                <span className="block text-[9px] font-semibold uppercase tracking-[0.14em] text-rose-400 sm:text-[10px] sm:tracking-[0.16em]">Opportunities bloom via people.</span>
          </div>
        </Link>
        <div className="flex items-center gap-4">
          {username && (
            <span className="hidden rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-400 sm:inline">
              @{username}
            </span>
          )}
          <Link href="/settings" className="btn-ghost py-1.5 text-xs">
            Settings
          </Link>
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
