"use client";

import React from "react";
import type { PurityCheckResult } from "@/lib/types";

export default function PurityIndicator({ purity, loading }: { purity: PurityCheckResult | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
        <span className="text-sm text-blue-700">AI analyzing material specs...</span>
      </div>
    );
  }

  if (!purity) return null;

  const pctScore = (purity.ml_purity_score * 100).toFixed(1);
  const barWidth = Math.min(purity.ml_purity_score * 100, 100);

  return (
    <div className={`p-4 rounded-lg border ${
      purity.meets_threshold
        ? "bg-emerald-50 border-emerald-200"
        : "bg-amber-50 border-amber-200"
    }`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-slate-700">AI Trust Score</span>
        <span className={`text-lg font-bold ${
          purity.meets_threshold ? "text-emerald-700" : "text-amber-700"
        }`}>
          {pctScore}%
        </span>
      </div>

      <div className="w-full bg-slate-200 rounded-full h-2.5 mb-2">
        <div
          className={`h-2.5 rounded-full transition-all duration-500 ${
            purity.meets_threshold ? "bg-emerald-500" : "bg-amber-500"
          }`}
          style={{ width: `${barWidth}%` }}
        />
      </div>

      <p className={`text-xs font-medium ${
        purity.meets_threshold ? "text-emerald-700" : "text-amber-700"
      }`}>
        {purity.recommendation}
      </p>

      {purity.requires_remediation && (
        <div className="mt-2 flex items-center gap-1 text-xs text-amber-700 font-medium">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" />
          </svg>
          Remediation required before listing
        </div>
      )}
    </div>
  );
}
