"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "@/components/ui/toaster";
import type { Agreement } from "@/lib/types";
import { FileCheck, CheckCircle } from "lucide-react";

export default function AgreementsPage() {
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAgreements = () => {
    api.get<Agreement[]>("/api/v1/agreements/my")
      .then(setAgreements)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAgreements(); }, []);

  const handleFulfill = async (id: string) => {
    try {
      const res = await api.patch<{ certificate_number: string; co2_saved_kg: number }>(`/api/v1/agreements/${id}/fulfill`, {});
      toast({ title: "Agreement Fulfilled!", description: `Green Certificate ${res.certificate_number} issued. CO2 saved: ${res.co2_saved_kg}kg`, variant: "success" });
      fetchAgreements();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed", variant: "destructive" });
    }
  };

  const statusColor: Record<string, string> = {
    active: "bg-blue-100 text-blue-700",
    fulfilled: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-red-100 text-red-600",
    disputed: "bg-amber-100 text-amber-700",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-extrabold text-slate-900">Smart Agreements</h1>
        <p className="text-sm text-slate-600">Auto-executing digital contracts with blockchain proof</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading agreements...</div>
      ) : agreements.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <FileCheck className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-4 text-lg font-semibold text-slate-700">No agreements yet</h3>
          <p className="mt-1 text-sm text-slate-500">Accept negotiation terms to auto-generate an agreement.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Mobile Card View */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {agreements.map((a) => (
              <div key={a.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-slate-500">ID: {a.id.slice(0, 8)}...</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusColor[a.status]}`}>{a.status}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><p className="text-xs text-slate-500">Volume</p><p className="font-bold text-slate-800">{a.agreed_volume_kg.toLocaleString()} kg</p></div>
                  <div><p className="text-xs text-slate-500">Price/kg</p><p className="font-bold text-slate-800">${a.agreed_price_per_kg.toFixed(2)}</p></div>
                  <div><p className="text-xs text-slate-500">Payment</p><p className="font-medium text-slate-800 capitalize">{a.payment_terms?.replace("_", " ") || "-"}</p></div>
                  <div><p className="text-xs text-slate-500">Escrow</p><p className="font-medium text-slate-800 capitalize">{a.escrow_status}</p></div>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="font-mono text-[10px] text-blue-600 truncate max-w-[150px]">TX: {a.blockchain_tx_hash?.slice(0, 16)}...</div>
                  {a.status === "active" && (
                    <button
                      onClick={() => handleFulfill(a.id)}
                      className="flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-600 hover:bg-emerald-100 transition"
                    >
                      <CheckCircle className="h-3.5 w-3.5" /> Fulfill
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-4 py-3 font-semibold">Agreement ID</th>
                  <th className="px-4 py-3 font-semibold">Volume (kg)</th>
                  <th className="px-4 py-3 font-semibold">Price/kg</th>
                  <th className="px-4 py-3 font-semibold">Payment</th>
                  <th className="px-4 py-3 font-semibold">Escrow</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Blockchain</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="text-slate-700">
                {agreements.map((a) => (
                  <tr key={a.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{a.id.slice(0, 8)}...</td>
                    <td className="px-4 py-3 font-medium">{a.agreed_volume_kg.toLocaleString()}</td>
                    <td className="px-4 py-3">${a.agreed_price_per_kg.toFixed(2)}</td>
                    <td className="px-4 py-3 capitalize">{a.payment_terms?.replace("_", " ") || "-"}</td>
                    <td className="px-4 py-3 capitalize">{a.escrow_status}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusColor[a.status]}`}>{a.status}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-blue-600">{a.blockchain_tx_hash?.slice(0, 12)}...</td>
                    <td className="px-4 py-3">
                      {a.status === "active" && (
                        <button
                          onClick={() => handleFulfill(a.id)}
                          className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                        >
                          <CheckCircle className="h-3.5 w-3.5" /> Fulfill
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
