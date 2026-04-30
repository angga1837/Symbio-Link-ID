"use client";

import React, { useState } from "react";
import { z } from "zod";
import axios from "axios";

const wasteSchema = z.object({
  sender_factory_id: z.string().min(1, "Sender Factory ID is required"),
  material_type: z.string().min(1, "Material Type is required"),
  volume_kg: z.number().min(0.1, "Volume must be greater than 0"),
  ph_level: z.number().min(0).max(14, "pH must be between 0 and 14").optional(),
});

type WasteFormValues = z.infer<typeof wasteSchema>;

export default function WasteForm({ onResult }: { onResult: (data: any) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const formData = new FormData(e.currentTarget);
    const data = {
      sender_factory_id: formData.get("sender_factory_id") as string,
      material_type: formData.get("material_type") as string,
      volume_kg: parseFloat(formData.get("volume_kg") as string),
      ph_level: formData.get("ph_level") ? parseFloat(formData.get("ph_level") as string) : undefined,
    };

    try {
      wasteSchema.parse(data);
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/optimize`, data);
      onResult(res.data);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        setError(err.errors.map(e => e.message).join(", "));
      } else {
        setError("API Error: Failed to process waste data.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6 bg-white shadow-md rounded-lg">
      <h2 className="text-xl font-bold mb-4">Industrial Symbiosis: New Material</h2>
      {error && <div className="text-red-500 font-medium p-2 bg-red-50 rounded">{error}</div>}
      
      <div>
        <label className="block text-sm font-medium mb-1">Sender Factory ID</label>
        <input name="sender_factory_id" type="text" required className="w-full border p-2 rounded" placeholder="e.g., FACTORY-001" />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">Material Type</label>
        <input name="material_type" type="text" required className="w-full border p-2 rounded" placeholder="e.g., Copper Sludge" />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">Volume (kg)</label>
        <input name="volume_kg" type="number" step="0.1" required className="w-full border p-2 rounded" placeholder="e.g., 500" />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">pH Level</label>
        <input name="ph_level" type="number" step="0.1" className="w-full border p-2 rounded" placeholder="e.g., 6.5" />
      </div>

      <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white p-2 rounded font-bold hover:bg-blue-700 disabled:opacity-50">
        {loading ? "Processing via MILP/ML..." : "Optimize & Record to Blockchain"}
      </button>
    </form>
  );
}
