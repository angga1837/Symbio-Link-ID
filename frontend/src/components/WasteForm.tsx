"use client";

import React, { useState } from "react";
import { z } from "zod";

const formSchema = z.object({
  sender_factory_id: z.string().min(1, "Factory ID is required"),
  material_type: z.string().min(1, "Material Type is required"),
  volume_kg: z.number().min(0.1, "Volume must be greater than 0"),
  ph_level: z.number().min(0).max(14, "pH must be between 0 and 14").optional(),
  water_content_percentage: z.number().min(0).max(100).optional(),
});

interface OptimizationResult {
  sender_factory_id: string;
  material_type: string;
  volume_kg: number;
  system_outputs?: {
    ml_purity_score?: number;
    optimization_status?: string;
    blockchain_tx_hash?: string;
  };
}

export default function WasteForm({ onResult }: { onResult: (data: OptimizationResult) => void }) {
  const [formData, setFormData] = useState({
    sender_factory_id: "",
    material_type: "",
    volume_kg: "",
    ph_level: "",
    water_content_percentage: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const parsedData = formSchema.parse({
        ...formData,
        volume_kg: parseFloat(formData.volume_kg),
        ph_level: formData.ph_level ? parseFloat(formData.ph_level) : undefined,
        water_content_percentage: formData.water_content_percentage ? parseFloat(formData.water_content_percentage) : undefined,
      });

      const response = await fetch("http://localhost:8000/api/v1/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsedData),
      });

      const result: OptimizationResultType = await response.json();
      
      onResult(result as OptimizationResult);
      
    } catch (err: unknown) {
        if (err instanceof Error) {
            setError(err.message);
        } else {
            setError("An unexpected error occurred or validation failed");
        }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 shadow-md rounded-lg">
      <h2 className="text-xl font-bold mb-4 text-blue-900">Exchange Material</h2>
      {error && <div className="text-red-500 mb-4 text-sm">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Factory ID</label>
          <input
            type="text"
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
            value={formData.sender_factory_id}
            onChange={(e) => setFormData({ ...formData, sender_factory_id: e.target.value })}
            placeholder="e.g. FACT-001"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Material Type</label>
          <input
            type="text"
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
            value={formData.material_type}
            onChange={(e) => setFormData({ ...formData, material_type: e.target.value })}
            placeholder="e.g. SLAG"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Volume (kg)</label>
          <input
            type="number"
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
            value={formData.volume_kg}
            onChange={(e) => setFormData({ ...formData, volume_kg: e.target.value })}
            placeholder="e.g. 500"
            required
            min="0.1"
            step="0.1"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-700 transition"
          disabled={loading}
        >
          {loading ? "Processing..." : "Find Symbiosis Match"}
        </button>
      </form>
    </div>
  );
}
type OptimizationResultType = OptimizationResult;
