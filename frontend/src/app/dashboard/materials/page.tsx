"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { MaterialListing } from "@/lib/types";
import { Plus, Package, AlertTriangle } from "lucide-react";

export default function MaterialsPage() {
  const [listings, setListings] = useState<MaterialListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<MaterialListing[]>("/api/v1/materials/my")
      .then(setListings)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const statusColor: Record<string, string> = {
    draft: "bg-slate-100 text-slate-600",
    listed: "bg-blue-100 text-blue-700",
    matched: "bg-emerald-100 text-emerald-700",
    in_transit: "bg-amber-100 text-amber-700",
    processed: "bg-green-100 text-green-700",
    archived: "bg-slate-100 text-slate-500",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-900">My Material Passports</h1>
          <p className="text-sm text-slate-600">Manage your organization's digital material pipelines for exchange</p>
        </div>
        <Link
          href="/dashboard/materials/new"
          className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition w-full sm:w-auto"
        >
          <Plus className="h-4 w-4" /> New Listing
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading materials...</div>
      ) : listings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <Package className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-4 text-lg font-semibold text-slate-700">No materials listed yet</h3>
          <p className="mt-1 text-sm text-slate-500">Create your first Digital Material Passport to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((m) => (
            <Link
              key={m.id}
              href={`/dashboard/materials/${m.id}`}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-800">{m.material_type}</h3>
                  <p className="text-sm text-slate-600 mt-0.5">{m.volume_kg.toLocaleString()} kg</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColor[m.status] || "bg-slate-100 text-slate-600"}`}>
                  {m.status}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                <span>pH: {m.ph_level ?? "N/A"}</span>
                <span>Moisture: {m.moisture_pct ?? "N/A"}%</span>
                <span>{m.supply_mode}</span>
              </div>
              {m.ml_purity_score !== null && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">AI Purity Score</span>
                    <span className={`font-bold ${m.ml_purity_score >= 0.6 ? "text-emerald-600" : "text-amber-600"}`}>
                      {(m.ml_purity_score * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="mt-1 w-full bg-slate-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${m.ml_purity_score >= 0.6 ? "bg-emerald-500" : "bg-amber-500"}`}
                      style={{ width: `${Math.min(m.ml_purity_score * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}
              {m.requires_remediation && (
                <div className="mt-2 flex items-center gap-1 text-xs text-amber-600">
                  <AlertTriangle className="h-3 w-3" /> Remediation required
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
