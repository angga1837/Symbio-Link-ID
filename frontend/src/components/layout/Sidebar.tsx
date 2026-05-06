"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  GitMerge,
  MessageSquare,
  FileCheck,
  Truck,
  Leaf,
  Award,
  Building2,
  MapPin,
  Shield,
  Map,
} from "lucide-react";
const navSections = [
  {
    label: "Overview",
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Marketplace",
    items: [
      { href: "/dashboard/materials", label: "Material Passports", icon: Package },
      { href: "/dashboard/matches", label: "Matchmaking", icon: GitMerge },
      { href: "/dashboard/negotiations", label: "Negotiations", icon: MessageSquare },
      { href: "/dashboard/agreements", label: "Agreements", icon: FileCheck },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/dashboard/tracking", label: "Shipment Tracking", icon: Truck },
      { href: "/dashboard/facilities", label: "Facilities", icon: MapPin },
      { href: "/dashboard/map", label: "Symbiosis Map", icon: Map },
    ],
  },
  {
    label: "Sustainability",
    items: [
      { href: "/dashboard/esg", label: "ESG Ledger", icon: Leaf },
      { href: "/dashboard/esg/certificates", label: "Green Certificates", icon: Award },
      { href: "/dashboard/settings/compliance", label: "Compliance & KYC", icon: Shield },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col bg-slate-900">
      {/* Brand */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-700/50 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500">
          <Building2 className="h-4 w-4 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight text-white">Symbio-Link ID</h1>
          <p className="text-[10px] uppercase tracking-widest text-slate-400">Enterprise</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto no-scrollbar px-3 py-4 space-y-6">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {section.label}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all ${
                        isActive
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "text-slate-300 hover:bg-slate-800 hover:text-white"
                      }`}
                    >
                      <item.icon
                        className={`h-4 w-4 flex-shrink-0 ${isActive ? "text-emerald-400" : "text-slate-500"}`}
                      />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
