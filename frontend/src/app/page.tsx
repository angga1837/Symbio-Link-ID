"use client";

import { useState } from "react";
import AuditTrail from "../components/AuditTrail";
import EmissionChart, { EmissionPoint } from "../components/EmissionChart";
import WasteForm from "../components/WasteForm";

interface TransactionResult {
  sender_factory_id: string;
  material_type: string;
  volume_kg: number;
  system_outputs?: {
    ml_purity_score?: number;
    optimization_status?: string;
    blockchain_tx_hash?: string;
  };
}

export default function Dashboard() {
  const [results, setResults] = useState<TransactionResult[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleResult = (newResult: TransactionResult) => {
    setResults((prev) => [newResult, ...prev]);
    // Trigger AuditTrail refresh by incrementing counter
    setRefreshTrigger((prev) => prev + 1);
  };

  // CO2 estimation formula as per Day 3: savings = volume * 0.4
  const chartData: EmissionPoint[] = results
    .map((r, idx) => ({
      name: `Tx ${(idx + 1).toString()}`,
      ml_purity: r.system_outputs?.ml_purity_score ?? 0.986,
      co2_saved_kg: Math.round(r.volume_kg * 0.4),
    }))
    .reverse();

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_55%,#e2e8f0_100%)] p-8 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 border-b border-slate-200 pb-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Day 4 Execution Console</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Symbio-Link ID Dashboard</h1>
          <p className="mt-2 text-slate-600">B2B Industrial Symbiosis Marketplace MVP</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <WasteForm onResult={handleResult} />
          </div>

          <div className="lg:col-span-2 space-y-8">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-slate-800">CO2 Emission Reductions (kg)</h2>
              <EmissionChart auditData={results} />
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-slate-800">ESG Audit Trail</h2>
              <AuditTrail rows={results} refreshTrigger={refreshTrigger} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
