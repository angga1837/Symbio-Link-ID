"use client";

import React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface EmissionPoint {
  name: string;
  co2_saved_kg: number;
  ml_purity: number;
}

export default function EmissionChart({ data }: { data: EmissionPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 w-full items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400">
        No emission data yet. Submit a material exchange to generate projections.
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis dataKey="name" tick={{ fill: "#475569", fontSize: 12 }} />
          <YAxis tick={{ fill: "#475569", fontSize: 12 }} />
          <Tooltip
            cursor={{ stroke: "#94A3B8" }}
            contentStyle={{ background: "#0F172A", borderRadius: 8, border: "none" }}
            labelStyle={{ color: "#E2E8F0" }}
            itemStyle={{ color: "#F8FAFC" }}
          />
          <Area
            type="monotone"
            dataKey="co2_saved_kg"
            stroke="#0F766E"
            fill="#0F766E"
            fillOpacity={0.2}
            name="CO2 Saved (kg)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
