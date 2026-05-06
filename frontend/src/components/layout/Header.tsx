"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { User, Bell } from "lucide-react";

export default function Header() {
  const [user, setUser] = useState<{ org_name: string; role: string } | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const auth = getAuth();
    if (auth.user) setUser(auth.user);
  }, []);

  const breadcrumb = pathname
    .replace("/dashboard", "")
    .split("/")
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1).replace(/[-_]/g, " "));

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm">
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium text-slate-900">Dashboard</span>
        {breadcrumb.map((crumb, i) => (
          <React.Fragment key={i}>
            <span className="text-slate-300">/</span>
            <span className="text-slate-600">{crumb}</span>
          </React.Fragment>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button className="relative flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition">
          <Bell className="h-4 w-4" />
        </button>
        {user && (
          <div className="flex items-center gap-3 border-l border-slate-200 pl-3">
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-900">{user.org_name}</p>
              <p className="text-[11px] text-slate-500 capitalize">{user.role}</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white">
              <User className="h-3.5 w-3.5" />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
