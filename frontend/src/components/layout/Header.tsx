"use client";

import React, { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import { getAuth, clearAuth, saveAuth } from "@/lib/auth";
import { User, Bell, ChevronDown, LogOut, Users } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/components/ui/toaster";

const MOCK_USERS = [
  { name: "PT Jawa Steel Industries", email: "admin@jawasteel.com", password: "symbio2026" },
  { name: "Semen Nusantara", email: "admin@semennusantara.com", password: "symbio2026" },
  { name: "EcoBricks Plant", email: "admin@ecobricks.com", password: "symbio2026" },
];

export default function Header() {
  const [user, setUser] = useState<{ org_name: string; role: string, email?: string } | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const pathname = usePathname();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const auth = getAuth();
    if (auth.user) setUser(auth.user);

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    clearAuth();
    window.location.href = "/login";
  };

  const handleSwitch = async (targetUser: typeof MOCK_USERS[0]) => {
    try {
      const response: any = await api.post("/api/v1/auth/login", {
        email: targetUser.email,
        password: targetUser.password,
      });
      clearAuth();
      saveAuth(response);
      toast({ title: "Account Switched", description: `Logged in as ${targetUser.name}`, variant: "success" });
      window.location.reload();
    } catch (err) {
      toast({ title: "Switch Failed", description: "Could not switch account", variant: "destructive" });
    }
  };

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
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-3 border-l border-slate-200 pl-3 hover:opacity-80 transition cursor-pointer"
            >
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-900">{user.org_name}</p>
                <p className="text-[11px] text-slate-500 capitalize">{user.role}</p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white">
                <User className="h-3.5 w-3.5" />
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white shadow-lg py-2 z-50">
                <div className="px-4 py-2 border-b border-slate-100 flex items-center gap-2">
                  <Users className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Switch Account</span>
                </div>
                <div className="py-1 border-b border-slate-100">
                  {MOCK_USERS.map((u) => (
                    <button
                      key={u.email}
                      onClick={() => handleSwitch(u)}
                      className="w-full px-4 py-2 text-left hover:bg-slate-50 transition flex flex-col"
                    >
                      <span className="text-sm font-semibold text-slate-800">{u.name}</span>
                      <span className="text-[10px] text-slate-500">{u.email}</span>
                    </button>
                  ))}
                </div>
                <div className="pt-1">
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50 transition flex items-center gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
