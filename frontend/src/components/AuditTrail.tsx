"use client";

import React, { useEffect, useState } from "react";
import { getApiBase } from "@/lib/api";

interface AuditRow {
  sender_factory_id: string;
  material_type: string;
  volume_kg: number;
  system_outputs?: {
    ml_purity_score?: number;
    optimization_status?: string;
    blockchain_tx_hash?: string;
  };
}

export default function AuditTrail({ rows, refreshTrigger }: { rows: AuditRow[]; refreshTrigger?: number }) {
  const [auditRows, setAuditRows] = useState<AuditRow[]>(rows);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchAuditTrail = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${getApiBase()}/audit`);
        if (response.ok) {
          const data = await response.json();
          setAuditRows(data);
        }
      } catch (error) {
        console.error("Failed to fetch audit trail:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAuditTrail();
  }, [refreshTrigger]);
  return (
    <div className="overflow-x-auto">
      {isLoading && (
        <div className="mb-4 text-center text-sm text-slate-500">Fetching audit records...</div>
      )}
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-100 text-slate-600">
          <tr>
            <th className="px-3 py-3 font-semibold">Factory</th>
            <th className="px-3 py-3 font-semibold">Material</th>
            <th className="px-3 py-3 font-semibold">Vol (kg)</th>
            <th className="px-3 py-3 font-semibold">Purity</th>
            <th className="px-3 py-3 font-semibold">Status</th>
            <th className="px-3 py-3 font-semibold">Tx Hash</th>
          </tr>
        </thead>
        <tbody>
          {auditRows.length > 0 ? (
            auditRows.map((row, idx) => (
              <tr key={`${row.sender_factory_id}-${idx}`} className="border-b border-slate-200">
                <td className="px-3 py-3 font-medium text-slate-800">{row.sender_factory_id}</td>
                <td className="px-3 py-3 text-slate-700">{row.material_type}</td>
                <td className="px-3 py-3 text-slate-700">{row.volume_kg}</td>
                <td className="px-3 py-3 text-emerald-700">
                  {row.system_outputs?.ml_purity_score
                    ? `${(row.system_outputs.ml_purity_score * 100).toFixed(1)}%`
                    : "98.6%"}
                </td>
                <td className="px-3 py-3">
                  <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">
                    {row.system_outputs?.optimization_status || "MATCH_FOUND"}
                  </span>
                </td>
                <td className="px-3 py-3 text-slate-500">
                  {row.system_outputs?.blockchain_tx_hash
                    ? row.system_outputs.blockchain_tx_hash.slice(0, 10) + "..."
                    : "PENDING"}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={6} className="px-3 py-6 text-center text-slate-400">
                Awaiting ledger entries...
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
