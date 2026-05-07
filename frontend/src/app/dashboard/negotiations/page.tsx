"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Negotiation, SymbiosisMatch } from "@/lib/types";
import { MessageSquare, GitMerge, Plus, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/toaster";

export default function NegotiationsPage() {
  const [negotiations, setNegotiations] = useState<Negotiation[]>([]);
  const [acceptedMatches, setAcceptedMatches] = useState<SymbiosisMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingFor, setOpeningFor] = useState<string | null>(null);

  const fetchData = () => {
    Promise.all([
      api.get<Negotiation[]>("/api/v1/negotiations/my"),
      api.get<SymbiosisMatch[]>("/api/v1/matches/my"),
    ])
      .then(([negs, matches]) => {
        setNegotiations(negs);
        // Show accepted matches that don't have a negotiation yet
        const negotiatedMatchIds = new Set(negs.map((n) => n.match_id));
        setAcceptedMatches(
          matches.filter((m) => m.status === "accepted" && !negotiatedMatchIds.has(m.id))
        );
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleOpenNegotiation = async (match: SymbiosisMatch) => {
    setOpeningFor(match.id);
    try {
      await api.post("/api/v1/negotiations/", {
        match_id: match.id,
        proposed_price_per_kg: 0.10,
        payment_terms: "net_30",
        notes: `Negotiation for ${match.matched_volume_kg.toLocaleString()} kg`,
      });
      toast({
        title: "Negotiation Opened",
        description: "You can now discuss terms with your partner.",
        variant: "success",
      });
      fetchData();
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to open negotiation",
        variant: "destructive",
      });
    } finally {
      setOpeningFor(null);
    }
  };

  const statusColor: Record<string, string> = {
    open: "bg-blue-100 text-blue-700",
    counter_offered: "bg-amber-100 text-amber-700",
    accepted: "bg-emerald-100 text-emerald-700",
    rejected: "bg-red-100 text-red-600",
    expired: "bg-slate-100 text-slate-500",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Negotiation Room</h1>
        <p className="text-slate-600">Manage B2B terms, pricing, and pickup schedules</p>
      </div>

      {/* Accepted matches ready for negotiation */}
      {!loading && acceptedMatches.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Accepted Matches — Ready to Negotiate</h3>
          <div className="space-y-2">
            {acceptedMatches.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-lg bg-emerald-50 border border-emerald-100 p-3">
                <div className="flex items-center gap-3">
                  <GitMerge className="h-5 w-5 text-emerald-500" />
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {m.matched_volume_kg.toLocaleString()} kg — {m.transport_distance_km?.toFixed(0)} km
                    </p>
                    <p className="text-xs text-slate-500">CO2 saved: {m.co2_saved_kg?.toFixed(1)} kg</p>
                  </div>
                </div>
                <button
                  onClick={() => handleOpenNegotiation(m)}
                  disabled={openingFor === m.id}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  {openingFor === m.id ? (
                    <><Loader2 className="h-3 w-3 animate-spin" /> Opening...</>
                  ) : (
                    <><Plus className="h-3 w-3" /> Open Negotiation</>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading negotiations...</div>
      ) : negotiations.length === 0 && acceptedMatches.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <MessageSquare className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-4 text-lg font-semibold text-slate-700">No active negotiations</h3>
          <p className="mt-1 text-sm text-slate-500">Accept a match to start negotiating terms.</p>
        </div>
      ) : negotiations.length > 0 ? (
        <div className="space-y-3">
          {negotiations.map((n) => (
            <Link
              key={n.id}
              href={`/dashboard/negotiations/${n.id}`}
              className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-800">
                    ${n.proposed_price_per_kg?.toFixed(2)}/kg
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Payment: {n.payment_terms || "TBD"} | {n.notes ? n.notes.slice(0, 60) + "..." : "No notes"}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColor[n.status]}`}>
                  {n.status.replace("_", " ")}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
