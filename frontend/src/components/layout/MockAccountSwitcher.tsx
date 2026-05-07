"use client";

import React, { useState } from "react";
import { api } from "@/lib/api";
import { Users, ChevronDown, Check } from "lucide-react";
import { toast } from "@/components/ui/toaster";

const MOCK_USERS = [
  { name: "Jawa Steel (Generator)", email: "admin@jawasteel.com", password: "symbio2026" },
  { name: "Semen Nusantara (Consumer)", email: "admin@semennusantara.com", password: "symbio2026" },
  { name: "EcoBricks (Consumer)", email: "admin@ecobricks.com", password: "symbio2026" },
];

export default function MockAccountSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  const handleSwitch = async (user: typeof MOCK_USERS[0]) => {
    setLoading(user.email);
    try {
      const response: any = await api.post("/api/v1/auth/login", {
        email: user.email,
        password: user.password,
      });
      
      // Store token (assuming api.post handles it or we do it manually based on implementation)
      localStorage.setItem("token", response.access_token);
      localStorage.setItem("user", JSON.stringify(response));
      
      toast({ title: "Account Switched", description: `Logged in as ${user.name}`, variant: "success" });
      
      // Reload to apply changes
      window.location.reload();
    } catch (err) {
      toast({ title: "Switch Failed", description: "Could not switch to mock account", variant: "destructive" });
    } finally {
      setLoading(null);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative border-b border-slate-700/50 pb-2 mb-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-lg bg-slate-800/50 px-3 py-2 text-[12px] font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition"
      >
        <div className="flex items-center gap-2">
          <Users className="h-3.5 w-3.5 text-emerald-500" />
          <span>Quick Switch (Demo)</span>
        </div>
        <ChevronDown className={`h-3 w-3 text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-full rounded-lg border border-slate-700 bg-slate-800 p-1 shadow-2xl z-50">
          {MOCK_USERS.map((user) => (
            <button
              key={user.email}
              onClick={() => handleSwitch(user)}
              disabled={!!loading}
              className="flex w-full items-center justify-between rounded-md px-3 py-2 text-[11px] text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-400 transition disabled:opacity-50"
            >
              <div className="flex flex-col items-start text-left">
                <span className="font-semibold">{user.name}</span>
                <span className="text-[9px] text-slate-500">{user.email}</span>
              </div>
              {loading === user.email && <div className="h-3 w-3 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
