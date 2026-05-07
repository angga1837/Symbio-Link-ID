"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getAuth } from "@/lib/auth";
import type { ESGRecord, GreenCertificate } from "@/lib/types";
import { Leaf, Shield, Award, TrendingUp, Target, ExternalLink, Loader2 } from "lucide-react";

interface Scope3Response {
  org_id: string;
  total_co2_offset_kg: number;
  record_count: number;
  records: ESGRecord[];
}

interface RegulatoryAuditRecord {
  record_type: string;
  blockchain_tx_hash: string;
  committed_at: string;
  mode: string;
  [key: string]: unknown;
}

interface RegulatoryAudit {
  total: number;
  records: RegulatoryAuditRecord[];
  generated_at: string;
}

// Indonesia baseline metrics (documented research data)
const BASELINE = {
  material_reuse_pct: 4,       // current national average
  target_reuse_pct: 40,        // Symbio-Link target
  emission_reduction_target: 68.91, // % efficiency potential in industrial zones
  baseline_emission_kg_per_ton: 850, // kg CO2 per ton of unrecycled industrial waste
};

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
      <div
        className={`h-3 rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function ESGLedgerPage() {
  const [data, setData] = useState<Scope3Response | null>(null);
  const [certs, setCerts] = useState<GreenCertificate[]>([]);
  const [audit, setAudit] = useState<RegulatoryAudit | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    if (!auth.org_id) { setLoading(false); return; }

    Promise.all([
      api.get<Scope3Response>(`/api/v1/esg/scope3/${auth.org_id}`),
      api.get<GreenCertificate[]>(`/api/v1/esg/certificates/${auth.org_id}`),
      api.get<RegulatoryAudit>("/api/v1/esg/regulatory-audit"),
    ])
      .then(([scope3, certsData, auditData]) => {
        setData(scope3);
        setCerts(certsData);
        setAudit(auditData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const emissionReductionActual = data
    ? Math.min((data.total_co2_offset_kg / (BASELINE.baseline_emission_kg_per_ton * 100)) * 100, BASELINE.emission_reduction_target)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading ESG data...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl md:text-2xl font-extrabold text-slate-900">Executive ESG Reporting Suite</h1>
        <p className="text-sm text-slate-600">Scope 3 emissions ledger, green certificates & blockchain audit trail</p>
      </div>

      {/* ── Baseline vs Optimised Comparison ─────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-800 mb-5 flex items-center gap-2">
          <Target className="h-5 w-5 text-emerald-500" /> Baseline vs. Optimised Performance
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Material Reuse Rate */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">Material Reuse Rate</span>
              <span className="text-xs font-bold text-emerald-600">Target: {BASELINE.target_reuse_pct}%</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Baseline (national avg)</span>
                <span>{BASELINE.material_reuse_pct}%</span>
              </div>
              <ProgressBar value={BASELINE.material_reuse_pct} max={100} color="bg-slate-300" />
              <div className="flex justify-between text-xs text-slate-500">
                <span>Symbio-Link target</span>
                <span>{BASELINE.target_reuse_pct}%</span>
              </div>
              <ProgressBar value={BASELINE.target_reuse_pct} max={100} color="bg-blue-400" />
            </div>
            <p className="text-xs text-slate-400">
              Indonesia currently recycles only <strong className="text-slate-600">4%</strong> of industrial waste.
              Symbio-Link ID targets <strong className="text-emerald-600">40%</strong> — a 10× improvement.
            </p>
          </div>

          {/* Emission Reduction */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">Industrial Zone Emission Reduction</span>
              <span className="text-xs font-bold text-emerald-600">Target: {BASELINE.emission_reduction_target}%</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Actual achieved (your org)</span>
                <span>{emissionReductionActual.toFixed(2)}%</span>
              </div>
              <ProgressBar value={emissionReductionActual} max={BASELINE.emission_reduction_target} color="bg-emerald-500" />
              <div className="flex justify-between text-xs text-slate-500">
                <span>Full potential</span>
                <span>{BASELINE.emission_reduction_target}%</span>
              </div>
              <ProgressBar value={BASELINE.emission_reduction_target} max={100} color="bg-emerald-200" />
            </div>
            <p className="text-xs text-slate-400">
              Research shows industrial symbiosis can reduce zone emissions by up to{" "}
              <strong className="text-emerald-600">68.91%</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-wide font-semibold text-slate-500">Total CO₂ Offset</p>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl md:text-3xl font-extrabold text-emerald-600">
            {(data?.total_co2_offset_kg ?? 0).toLocaleString()}
            <span className="text-base font-normal text-slate-500 ml-1">kg</span>
          </p>
          <p className="text-xs text-slate-400 mt-1">= {((data?.total_co2_offset_kg ?? 0) / 1000).toFixed(2)} tonnes CO₂e</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-wide font-semibold text-slate-500">ESG Records</p>
            <Leaf className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-2xl md:text-3xl font-extrabold text-blue-600">
            {data?.record_count ?? 0}
          </p>
          <p className="text-xs text-slate-400 mt-1">Blockchain-verified events</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-wide font-semibold text-slate-500">Green Certificates</p>
            <Award className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl md:text-3xl font-extrabold text-amber-600">{certs.length}</p>
          <p className="text-xs text-slate-400 mt-1">Immutable compliance documents</p>
        </div>
      </div>

      {/* ── Green Certificates ────────────────────────────────────────── */}
      {certs.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <Award className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-slate-700">Green Certificates</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {certs.map((cert) => (
              <div key={cert.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50 transition">
                <div>
                  <p className="font-semibold text-slate-800 font-mono text-sm">{cert.certificate_number}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    CO₂ saved: <strong className="text-emerald-600">{cert.co2_saved_kg.toFixed(1)} kg</strong> ·
                    Material reused: <strong>{cert.material_reused_kg.toLocaleString()} kg</strong>
                  </p>
                </div>
                <div className="text-left sm:text-right flex flex-row sm:flex-col justify-between sm:justify-end items-center sm:items-end gap-2 sm:gap-0">
                  <p className="text-[10px] sm:text-xs font-mono text-blue-600">{cert.blockchain_tx_hash.slice(0, 16)}...</p>
                  <p className="text-[10px] sm:text-xs text-slate-400">{new Date(cert.issued_at).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Scope 3 Ledger ────────────────────────────────────────────── */}
      {data && data.records.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-500" />
              <h2 className="text-sm font-semibold text-slate-700">Scope 3 Emissions Ledger</h2>
            </div>
            <span className="text-xs bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full">
              Blockchain Verified
            </span>
          </div>
          {/* Mobile Scope 3 Card View */}
          <div className="grid grid-cols-1 gap-4 md:hidden p-4">
            {data.records.map((r) => (
              <div key={r.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 capitalize">{r.record_type.replace(/_/g, " ")}</span>
                  {r.verified ? (
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                      <Shield className="h-3 w-3" /> VERIFIED
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400">PENDING</span>
                  )}
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <span className="text-lg font-extrabold text-slate-900">{r.value.toLocaleString()}</span>
                    <span className="text-xs text-slate-500 ml-1">{r.unit}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-mono text-blue-600">{r.blockchain_tx_hash?.slice(0, 12)}...</p>
                    <p className="text-[10px] text-slate-400">{new Date(r.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Value</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3">Verified</th>
                  <th className="px-4 py-3">Blockchain TX</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="text-slate-700">
                {data.records.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 capitalize">{r.record_type.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3 font-semibold">{r.value.toLocaleString()}</td>
                    <td className="px-4 py-3 text-slate-500">{r.unit}</td>
                    <td className="px-4 py-3">
                      {r.verified ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                          <Shield className="h-3 w-3" /> Verified
                        </span>
                      ) : (
                        <span className="text-slate-400">Pending</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-blue-600">{r.blockchain_tx_hash?.slice(0, 16)}...</td>
                    <td className="px-4 py-3 text-slate-500">{new Date(r.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Blockchain Regulatory Audit Trail ─────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ExternalLink className="h-4 w-4 text-blue-500" />
            <h2 className="text-sm font-semibold text-slate-700">Live Blockchain Audit Trail</h2>
          </div>
          {audit && (
            <span className="text-xs text-slate-400">
              {audit.total} records · updated {audit.generated_at ? new Date(audit.generated_at).toLocaleTimeString() : ""}
            </span>
          )}
        </div>
        {!audit || audit.total === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            No blockchain transactions yet. Complete your first material exchange.
          </div>
        ) : (
          <>
            {/* Mobile Audit Card View */}
            <div className="grid grid-cols-1 gap-3 md:hidden p-4">
              {audit.records.slice(0, 10).map((rec, i) => (
                <div key={i} className="rounded-lg border border-slate-100 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 capitalize">{rec.record_type?.replace(/_/g, " ") ?? "—"}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${rec.mode === "fabric_peer_commit" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                      {rec.mode === "fabric_peer_commit" ? "ON-CHAIN" : "SAFEGUARD"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-[10px] font-mono text-blue-600 truncate">{rec.blockchain_tx_hash}</p>
                    <p className="text-[10px] text-slate-400">{new Date(rec.committed_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Audit Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">TX Hash</th>
                    <th className="px-4 py-3">Mode</th>
                    <th className="px-4 py-3">Committed At</th>
                  </tr>
                </thead>
                <tbody className="text-slate-700">
                  {audit.records.slice(0, 20).map((rec, i) => (
                    <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 capitalize font-medium">{rec.record_type?.replace(/_/g, " ") ?? "—"}</td>
                      <td className="px-4 py-3 font-mono text-blue-600">{rec.blockchain_tx_hash?.slice(0, 20)}...</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 font-semibold ${rec.mode === "fabric_peer_commit" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                          {rec.mode === "fabric_peer_commit" ? "On-Chain" : "Safeguard"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{new Date(rec.committed_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
