"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";

/**
 * Root page — immediately redirects to /dashboard (if logged in) or /login.
 * This replaces the legacy WasteForm homepage.
 */
export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated()) {
      router.replace("/dashboard");
    } else {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-emerald-950">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-emerald-500 flex items-center justify-center animate-pulse">
          <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <p className="text-slate-400 text-sm">Loading Symbio-Link ID...</p>
      </div>
    </div>
  );
}
