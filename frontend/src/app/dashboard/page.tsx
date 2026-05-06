"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getAuth } from "@/lib/auth";
import type { DashboardData } from "@/lib/types";
import {
  BarChart, Bar, AreaChart, Area, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { TrendingUp, Recycle, DollarSign, Award } from "lucide-react";

function MetricCard({ title, value, unit, target, icon: Icon, color }: {
  title: string; value: number; unit: string; target?: string;
  icon: React.ElementType; color: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide font-semibold text-slate-600">{title}</p>
        <div className={`rounded-lg p-2 ${color}`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
      </div>
      <p className="mt-2 text-3xl font-extrabold text-slate-900">
        {value.toLocaleString()} <span className="text-base font-normal text-slate-500">{unit}</span>
      </p>
      {target && <p className="text-xs text-slate-500 mt-1">Target: {target}</p>}
    </div>
  );
}

export default function ExecutiveDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    if (auth.org_id) {
      api.get<DashboardData>(`/api/v1/dashboard/${auth.org_id}`)
        .then(setData)
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-96 text-slate-400">Loading executive dashboard...</div>;
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Executive Impact Dashboard</h1>
          <p className="text-slate-600">Complete your first material exchange to see analytics here.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="CO2 Offset" value={0} unit="kg" icon={TrendingUp} color="bg-emerald-500" />
          <MetricCard title="Material Reused" value={0} unit="kg" target="40% diversion rate" icon={Recycle} color="bg-blue-500" />
          <MetricCard title="Cost Savings" value={0} unit="%" target="20% operational savings" icon={DollarSign} color="bg-violet-500" />
          <MetricCard title="Green Certificates" value={0} unit="issued" icon={Award} color="bg-amber-500" />
        </div>
      </div>
    );
  }

  const netZeroData = data.monthly_co2_trend.map((m, i) => ({
    ...m,
    cumulative: data.monthly_co2_trend.slice(0, i + 1).reduce((s, x) => s + x.co2_offset_kg, 0),
    target_line: (i + 1) * (data.total_co2_saved_kg / Math.max(data.monthly_co2_trend.length, 1)) * 1.5,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Executive Impact Dashboard</h1>
        <p className="text-slate-600">Real-time sustainability performance metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="CO2 Offset" value={data.total_co2_saved_kg} unit="kg" icon={TrendingUp} color="bg-emerald-500" />
        <MetricCard title="Material Reused" value={data.total_material_reused_kg} unit="kg" target="40% diversion rate" icon={Recycle} color="bg-blue-500" />
        <MetricCard title="Cost Savings" value={data.cost_savings_pct} unit="%" target="20% operational savings" icon={DollarSign} color="bg-violet-500" />
        <MetricCard title="Green Certificates" value={data.green_certificates_issued} unit="issued" icon={Award} color="bg-amber-500" />
      </div>

      {data.monthly_co2_trend.length > 0 && (
        <>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Monthly CO2 Offset Trend</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthly_co2_trend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" fontSize={11} tickFormatter={(v) => { try { return new Date(v).toLocaleDateString("id-ID", { month: "short" }); } catch { return v; } }} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="co2_offset_kg" fill="#10b981" radius={[4, 4, 0, 0]} name="CO2 Saved (kg)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">Net Zero 2060 Trajectory</h2>
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">
                Indonesia Target: {data.net_zero_target_year}
              </span>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={netZeroData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" fontSize={11} tickFormatter={(v) => { try { return new Date(v).toLocaleDateString("id-ID", { month: "short" }); } catch { return v; } }} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="cumulative" stroke="#10b981" fill="#d1fae5" name="Actual Offset" />
                  <Area type="monotone" dataKey="target_line" stroke="#6366f1" fill="none" strokeDasharray="5 5" name="Target Trajectory" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
