"use client";

import React, { useState, useRef } from "react";
import { toast } from "@/components/ui/toaster";
import { z } from "zod";
import { getApiBase } from "@/lib/api";

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
  const [identifying, setIdentifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
    const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIdentifying(true);
    setError(null);

    const formDataImage = new FormData();
    formDataImage.append("file", file);

    try {
      const response = await fetch(`${getApiBase()}/classify`, {
        method: "POST",
        body: formDataImage,
      });

      if (!response.ok) {
        throw new Error("Gagal mengidentifikasi gambar");
      }

      const data = await response.json();
      setFormData((prev) => ({ ...prev, material_type: data.predicted_material }));
      
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
        toast({ title: "Image detection failed", description: err.message, variant: "destructive" });
      } else {
        setError("Gagal menghubungi server ML");
        toast({ title: "Image detection failed", description: "Gagal menghubungi server ML", variant: "destructive" });
      }
    } finally {
      setIdentifying(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

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

      const response = await fetch(`${getApiBase()}/optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsedData),
      });

      const result = await response.json();
      if (response.ok) {
        onResult(result as OptimizationResult);
        toast({ title: "Success", description: "Optimization completed and recorded.", variant: "success" });
      } else {
        const msg = result?.reason || result?.detail || "Optimization failed";
        setError(msg);
        toast({ title: "Optimization Error", description: msg, variant: "destructive" });
      }
      
    } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
          toast({ title: "Error", description: err.message, variant: "destructive" });
        } else {
          setError("An unexpected error occurred or validation failed");
          toast({ title: "Error", description: "An unexpected error occurred or validation failed", variant: "destructive" });
        }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 shadow-md rounded-lg border border-slate-200">
      <h2 className="text-xl font-bold mb-4 text-slate-800">Exchange Material</h2>
      {error && <div className="text-red-500 mb-4 text-sm bg-red-50 p-3 rounded">{error}</div>}
      
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
          <div className="mt-1 flex gap-2">
            <input
              type="text"
              className="block w-full p-2 border border-gray-300 rounded-md bg-slate-50"
              value={formData.material_type}
              onChange={(e) => setFormData({ ...formData, material_type: e.target.value })}
              placeholder="Ketik nama atau deteksi gambar..."
              required
            />
            
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleImageUpload}
            />
            
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={identifying}
              className="whitespace-nowrap bg-slate-100 text-slate-700 font-semibold px-3 py-2 border border-slate-300 rounded-md hover:bg-slate-200 transition"
            >
              {identifying ? "Deteksi..." : "Auto-Detect"}
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-1">Tidak tahu namanya? Klik Auto-Detect dan upload foto material.</p>
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
          disabled={loading || identifying}
        >
          {loading ? "Processing..." : "Find Symbiosis Match"}
        </button>
      </form>
    </div>
  );
}