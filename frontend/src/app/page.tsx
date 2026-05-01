"use client";

import React, { useState } from "react";
import WasteForm from "../components/WasteForm";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

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

  const handleResult = (newResult: TransactionResult) => {
    setResults((prev) => [newResult, ...prev]);
  };

  const chartData = results.map((r, idx) => ({
    name: "Tx " + (idx + 1).toString(),
    ml_purity: r.system_outputs?.ml_purity_score || 0.986,
    co2_saved_kg: Math.round(r.volume_kg * 1.5), 
  })).reverse();

  return (
    <div className="min-h-screen bg-gray-50 p-8 text-gray-900">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold text-blue-900 tracking-tight">Symbio-Link ID Dashboard</h1>
          <p className="text-gray-600 mt-2">B2B Industrial Symbiosis Marketplace MVP</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <WasteForm onResult={handleResult} />
          </div>

          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white p-6 shadow-md rounded-lg h-80">
              <h2 className="text-xl font-bold mb-4">CO2 Emission Reductions (kg)</h2>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip cursor={{ fill: 'transparent' }} />
                    <Legend />
                    <Bar dataKey="co2_saved_kg" fill="#10B981" name="CO2 Saved (kg)" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  No data yet. Submit a material exchange to see predictions.
                </div>
              )}
            </div>

            <div className="bg-white p-6 shadow-md rounded-lg overflow-x-auto">
              <h2 className="text-xl font-bold mb-4">Recent Blockchain Transactions</h2>
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-3 border">Factory ID</th>
                    <th className="p-3 border">Material</th>
                    <th className="p-3 border">Vol (kg)</th>
                    <th className="p-3 border">Purity (ML)</th>
                    <th className="p-3 border">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {results.length > 0 ? results.map((r, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="p-3 border font-medium">{r.sender_factory_id}</td>
                      <td className="p-3 border">{r.material_type}</td>
                      <td className="p-3 border">{r.volume_kg}</td>
                      <td className="p-3 border text-green-600 font-bold">
                        {r.system_outputs?.ml_purity_score 
                          ? (r.system_outputs.ml_purity_score * 100).toFixed(1) + "%"
                          : '98.6%'}
                      </td>
                      <td className="p-3 border">
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-bold">
                          {r.system_outputs?.optimization_status || 'MATCH_FOUND'}
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-gray-500">
                        Awaiting new entries...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
