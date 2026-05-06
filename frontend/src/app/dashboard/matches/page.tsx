"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getAuth } from "@/lib/auth";
import type { SymbiosisMatch, MaterialListing } from "@/lib/types";
import { toast } from "@/components/ui/toaster";
import { GitMerge, Check, X, Truck, Loader2, Package } from "lucide-react";
import Link from "next/link";

export default function MatchesPage() {
  const [matches, setMatches] = useState<SymbiosisMatch[]>([]);
  const [listedMaterials, setListedMaterials] = useState<MaterialListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [findingFor, setFindingFor] = useState<string | null>(null);

  const fetchData = () => {
    Promise.all([
      api.get<SymbiosisMatch[]>("/api/v1/matches/my"),
      api.get<MaterialListing[]>("/api/v1/materials/my"),
    ])
      .then(([m, mats]) => {
        setMatches(m);
        // Only show materials that are "listed" and have no matches yet
        const matchedListingIds = new Set(m.map((match) => match.listing_id));
        setListedMaterials(mats.filter((mat) => mat.status === "listed" && !matchedListingIds.has(mat.id)));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleFindMatches = async (listingId: string) => {
    setFindingFor(listingId);
    try {
      const result = await api.post<SymbiosisMatch[]>(`/api/v1/matches/${listingId}/find`, {});
      toast({
        title: "Matches Found!",
        description: `${result.length} optimal symbiosis partner(s) identified.`,
        variant: "success",
      });
      fetchData();
    } catch (err: unknown) {
      toast({
        title: "No Matches",
        description: err instanceof Error ? err.message : "Could not find matches",
        variant: "destructive",
      });
    } finally {
      setFindingFor(null);
    }
  };

  const handleAccept = async (matchId: string) => {
    try {
      await api.patch(`/api/v1/matches/${matchId}/accept`, {});
      toast({ title: "Match Accepted", description: "You can now open a negotiation.", variant: "success" });
      fetchData();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed", variant: "destructive" });
    }
  };

  const handleReject = async (matchId: string) => {
    try {
      await api.patch(`/api/v1/matches/${matchId}/reject`, {});
      toast({ title: "Match Rejected", variant: "default" });
      fetchData();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed", variant: "destructive" });
    }
  };

  const statusColor: Record<string, string> = {
    proposed: "bg-blue-100 text-blue-700",
    accepted: "bg-emerald-100 text-emerald-700",
    negotiating: "bg-amber-100 text-amber-700",
    contracted: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-600",
    expired: "bg-slate-100 text-slate-500",
  };

  const auth = getAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">MILP Matchmaking Results</h1>
        <p className="text-slate-600">Algorithmically optimized symbiosis pairings</p>
      </div>

      {/* Run Matchmaking on unmatched materials */}
      {!loading && listedMaterials.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Materials Ready for Matchmaking</h3>
          <div className="space-y-2">
            {listedMaterials.map((mat) => (
              <div key={mat.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-800">{mat.material_type}</p>
                    <p className="text-xs text-slate-500">{mat.volume_kg.toLocaleString()} kg</p>
                  </div>
                </div>
                <button
                  onClick={() => handleFindMatches(mat.id)}
                  disabled={findingFor === mat.id}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  {findingFor === mat.id ? (
                    <><Loader2 className="h-3 w-3 animate-spin" /> Running...</>
                  ) : (
                    <><GitMerge className="h-3 w-3" /> Find Matches</>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading matches...</div>
      ) : matches.length === 0 && listedMaterials.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <GitMerge className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-4 text-lg font-semibold text-slate-700">No matches yet</h3>
          <p className="mt-1 text-sm text-slate-500">List a material first, then run matchmaking to find optimal partners.</p>
          <Link
            href="/dashboard/materials/new"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 transition"
          >
            <Package className="h-4 w-4" /> Create Material Listing
          </Link>
        </div>
      ) : matches.length > 0 ? (
        <div className="space-y-3">
          {matches.map((m) => (
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
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColor[m.status]}`}>
                    {m.status}
                  </span>
                  {m.status === "proposed" && m.receiver_org_id === auth?.org_id && (
                    <div className="flex gap-1 ml-2">
                      <button onClick={() => handleAccept(m.id)} className="rounded-lg bg-emerald-50 p-2 text-emerald-600 hover:bg-emerald-100 transition">
                        <Check className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleReject(m.id)} className="rounded-lg bg-red-50 p-2 text-red-500 hover:bg-red-100 transition">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {m.match_score !== null && (
                <div className="mt-2 text-xs text-slate-500">
                  Match score: <span className="font-semibold text-slate-800">{m.match_score}</span> (CO2/$ efficiency)
                </div>
              )}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
