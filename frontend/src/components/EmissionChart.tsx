"use client";

import React from "react";
import {
  BarChart,
  Bar,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function EmissionChart({ auditData }: { auditData?: any[] }) {
  const chartData = (auditData ?? []).map((log, index) => ({
    name: `TX-${index + 1}`,
    co2_saved: (log.volume_kg ?? log.volume ?? 0) * 0.45,
    material: log.material_type || log.material || "-",
  }));

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400">Menunggu data transaksi...</div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip
            cursor={{ fill: '#f1f5f9' }}
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
          />
          <Bar dataKey="co2_saved" fill="#10b981" radius={[4, 4, 0, 0]} name="CO2 Saved (Kg)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
