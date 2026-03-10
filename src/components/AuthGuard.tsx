"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { User } from "firebase/auth";
import { subscribeToAuthState } from "@/lib/auth";

type AuthGuardProps = {
  children: React.ReactNode;
};

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToAuthState((nextUser) => {
      setUser(nextUser);
      setLoading(false);

      if (!nextUser) {
        const queryString = searchParams?.toString();
        const destination = `${pathname}${queryString ? `?${queryString}` : ""}`;
        router.replace(`/login?next=${encodeURIComponent(destination)}`);
      }
    });

    return unsubscribe;
  }, [pathname, router, searchParams]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-rose-200 border-t-rose-500"></div>
          <p className="text-sm text-slate-400">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
