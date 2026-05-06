"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { MaterialListing, SymbiosisMatch } from "@/lib/types";
import { toast } from "@/components/ui/toaster";
import {
  ArrowLeft,
  GitMerge,
  Package,
  Beaker,
  Droplets,
  Scale,
  Truck,
  Loader2,
} from "lucide-react";
import Link from "next/link";

export default function MaterialDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [listing, setListing] = useState<MaterialListing | null>(null);
  const [matches, setMatches] = useState<SymbiosisMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [finding, setFinding] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<MaterialListing>(`/api/v1/materials/${id}`),
      api.get<SymbiosisMatch[]>("/api/v1/matches/my"),
    ])
      .then(([mat, allMatches]) => {
        setListing(mat);
        setMatches(allMatches.filter((m) => m.listing_id === id));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleFindMatches = async () => {
    setFinding(true);
    try {
      const result = await api.post<SymbiosisMatch[]>(`/api/v1/matches/${id}/find`, {});
      setMatches(result);
      setListing((prev) => (prev ? { ...prev, status: "matched" } : prev));
      toast({
        title: "Matches Found!",
        description: `${result.length} optimal symbiosis partner(s) identified.`,
        variant: "success",
      });
    } catch (err: unknown) {
      toast({
        title: "No Matches",
        description: err instanceof Error ? err.message : "Could not find matches",
        variant: "destructive",
      });
    } finally {
      setFinding(false);
    }
  };

  const statusColor: Record<string, string> = {
    draft: "bg-slate-100 text-slate-600",
    listed: "bg-blue-100 text-blue-700",
    matched: "bg-emerald-100 text-emerald-700",
    in_transit: "bg-amber-100 text-amber-700",
    processed: "bg-green-100 text-green-700",
    archived: "bg-slate-100 text-slate-500",
  };

  if (loading) {
    return <div className="text-center py-12 text-slate-400">Loading material details...</div>;
  }

  if (!listing) {
    return <div className="text-center py-12 text-slate-500">Material not found.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition"
        >
          <ArrowLeft className="h-4 w-4 text-slate-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-extrabold text-slate-900">{listing.material_type}</h1>
          <p className="text-sm text-slate-500">Digital Material Passport</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColor[listing.status]}`}>
          {listing.status}
        </span>
      </div>

      {/* Material Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <Scale className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-500">Volume</span>
          </div>
          <p className="text-xl font-bold text-slate-900">{listing.volume_kg.toLocaleString()} kg</p>
          <p className="text-xs text-slate-500 mt-0.5">{listing.supply_mode} supply</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <Beaker className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-500">pH Level</span>
          </div>
          <p className="text-xl font-bold text-slate-900">{listing.ph_level ?? "N/A"}</p>
          <p className="text-xs text-slate-500 mt-0.5">Toxicity: {listing.toxicity_class ?? "N/A"}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <Droplets className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-500">Moisture</span>
          </div>
          <p className="text-xl font-bold text-slate-900">{listing.moisture_pct ?? "N/A"}%</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-500">AI Purity Score</span>
          </div>
          <p className={`text-xl font-bold ${
            listing.ml_purity_score && listing.ml_purity_score >= 0.6
              ? "text-emerald-600"
              : "text-amber-600"
          }`}>
            {listing.ml_purity_score ? `${(listing.ml_purity_score * 100).toFixed(1)}%` : "N/A"}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">{listing.ml_model_version ?? ""}</p>
        </div>
      </div>

      {/* Description */}
      {listing.description && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Description</h3>
          <p className="text-sm text-slate-600">{listing.description}</p>
        </div>
      )}

      {/* Chemical Composition */}
      {listing.chemical_composition && Object.keys(listing.chemical_composition).length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Chemical Composition</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(listing.chemical_composition).map(([element, pct]) => (
              <span key={element} className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700">
                {element}: <span className="font-bold">{pct}%</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Find Matches Section */}
      {listing.status === "listed" && matches.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/50 p-8 text-center">
          <GitMerge className="mx-auto h-10 w-10 text-emerald-400" />
          <h3 className="mt-3 text-lg font-semibold text-slate-800">Ready for Matchmaking</h3>
          <p className="mt-1 text-sm text-slate-500">Run the MILP optimizer to find optimal symbiosis partners.</p>
          <button
            onClick={handleFindMatches}
            disabled={finding}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition disabled:opacity-50"
          >
            {finding ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Running MILP Solver...
              </>
            ) : (
              <>
                <GitMerge className="h-4 w-4" /> Find Optimal Matches
              </>
            )}
          </button>
        </div>
      )}

      {/* Matches */}
      {matches.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-slate-800">Matched Partners ({matches.length})</h3>
          {matches.map((m) => {
            const mStatusColor: Record<string, string> = {
              proposed: "bg-blue-100 text-blue-700",
              accepted: "bg-emerald-100 text-emerald-700",
              negotiating: "bg-amber-100 text-amber-700",
              contracted: "bg-green-100 text-green-700",
              rejected: "bg-red-100 text-red-600",
            };
            return (
              <div key={m.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                      <Truck className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">
                        {m.matched_volume_kg.toLocaleString()} kg
                      </p>
                      <p className="text-xs text-slate-500">
                        {m.transport_distance_km?.toFixed(1)} km | Cost: ${m.transport_cost?.toFixed(2)} | CO2 saved: {m.co2_saved_kg?.toFixed(1)} kg
                      </p>
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${mStatusColor[m.status] || "bg-slate-100 text-slate-600"}`}>
                    {m.status}
                  </span>
                </div>
                {m.match_score !== null && (
                  <div className="mt-2 text-xs text-slate-500">
                    Match score: <span className="font-semibold text-slate-800">{m.match_score}</span> (CO2/$ efficiency)
                  </div>
                )}
              </div>
            );
          })}
          <Link
            href="/dashboard/matches"
            className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700"
          >
            View all matches →
          </Link>
        </div>
      )}
    </div>
  );
}
