"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import PurityIndicator from "./PurityIndicator";
import { toast } from "@/components/ui/toaster";
import type { PurityCheckResult } from "@/lib/types";
import { Upload, Camera, Loader2, CheckCircle2, ImageIcon } from "lucide-react";

interface ClassifyResult {
  predicted_material: string;
}

export default function MaterialForm({ facilities }: { facilities: { id: string; name: string }[] }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [purity, setPurity] = useState<PurityCheckResult | null>(null);
  const [purityLoading, setPurityLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [classifying, setClassifying] = useState(false);
  const [classifiedAs, setClassifiedAs] = useState<string | null>(null);
  const [form, setForm] = useState({
    facility_id: "",
    material_type: "",
    description: "",
    volume_kg: "",
    supply_mode: "batch",
    frequency_days: "",
    ph_level: "",
    moisture_pct: "",
    carbon_pct: "",
    hydrogen_pct: "",
    ash_pct: "",
    toxicity_class: "non_toxic",
    chemical_composition: "",
  });

  const updateField = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setClassifiedAs(null);

    // Auto-classify via ML
    setClassifying(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await api.upload<ClassifyResult>("/api/v1/materials/classify-image", formData);
      setClassifiedAs(result.predicted_material);
      updateField("material_type", result.predicted_material);
      toast({
        title: "Material Identified",
        description: `AI detected: ${result.predicted_material}`,
        variant: "success",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal klasifikasi gambar";
      toast({
        title: "Classification Error",
        description: msg,
        variant: "destructive",
      }); finally {
      setClassifying(false);
    }
  };

  // Debounced live purity check (v2 — includes chemical composition)
  useEffect(() => {
    const ph = parseFloat(form.ph_level);
    const moisture = parseFloat(form.moisture_pct);
    const volume = parseFloat(form.volume_kg);
    if (isNaN(ph) || isNaN(moisture) || isNaN(volume) || volume <= 0) {
      setPurity(null);
      return;
    }
    const timer = setTimeout(async () => {
      setPurityLoading(true);
      try {
        const payload: Record<string, number> = { ph_level: ph, moisture_pct: moisture, volume_kg: volume };
        if (form.carbon_pct) payload.carbon_pct = parseFloat(form.carbon_pct);
        if (form.hydrogen_pct) payload.hydrogen_pct = parseFloat(form.hydrogen_pct);
        if (form.ash_pct) payload.ash_pct = parseFloat(form.ash_pct);
        const result = await api.post<PurityCheckResult>("/api/v1/materials/purity-check", payload);
        setPurity(result);
      } catch {
        setPurity(null);
      } finally {
        setPurityLoading(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [form.ph_level, form.moisture_pct, form.volume_kg, form.carbon_pct, form.hydrogen_pct, form.ash_pct]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        facility_id: form.facility_id,
        material_type: form.material_type,
        description: form.description || undefined,
        volume_kg: parseFloat(form.volume_kg),
        supply_mode: form.supply_mode,
        frequency_days: form.frequency_days ? parseInt(form.frequency_days) : undefined,
        ph_level: form.ph_level ? parseFloat(form.ph_level) : undefined,
        moisture_pct: form.moisture_pct ? parseFloat(form.moisture_pct) : undefined,
        carbon_pct: form.carbon_pct ? parseFloat(form.carbon_pct) : undefined,
        hydrogen_pct: form.hydrogen_pct ? parseFloat(form.hydrogen_pct) : undefined,
        ash_pct: form.ash_pct ? parseFloat(form.ash_pct) : undefined,
        toxicity_class: form.toxicity_class,
        chemical_composition: form.chemical_composition
          ? (() => { try { return JSON.parse(form.chemical_composition); } catch { return undefined; } })()
          : undefined,
      };
      await api.post("/api/v1/materials/", payload);
      toast({ title: "Material Listed", description: "Digital Material Passport created.", variant: "success" });
      router.push("/dashboard/materials");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Validation failed";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {/* Image Upload + ML Classification */}
      <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 bg-slate-50/50">
        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <Camera className="h-4 w-4" /> AI Material Detection (Optional)
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Upload a photo of the waste material and our vision model will automatically classify it as
          <span className="font-semibold"> Fly Ash</span>,
          <span className="font-semibold"> Silica Fume</span>, or
          <span className="font-semibold"> Steel Slag</span>.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
        />

        <div className="flex items-start gap-4">
          {imagePreview ? (
            <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-slate-200 flex-shrink-0">
              <img src={imagePreview} alt="Material" className="w-full h-full object-cover" />
              {classifying && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                </div>
              )}
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-32 h-32 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 transition"
            >
              <ImageIcon className="h-8 w-8 text-slate-300" />
              <span className="text-[10px] text-slate-400 mt-1">Click to upload</span>
            </div>
          )}

          <div className="flex-1 space-y-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={classifying}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
            >
              {classifying ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing...</>
              ) : (
                <><Upload className="h-4 w-4" /> {imageFile ? "Change Image" : "Upload Image"}</>
              )}
            </button>

            {classifiedAs && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-emerald-700">AI Detected:</p>
                  <p className="text-sm font-bold text-emerald-800">{classifiedAs}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Facility</label>
        <select className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white"
          value={form.facility_id} onChange={(e) => updateField("facility_id", e.target.value)} required>
          <option value="">Select facility...</option>
          {facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Material Type</label>
        <input type="text" className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white placeholder:text-slate-400"
          value={form.material_type} onChange={(e) => updateField("material_type", e.target.value)}
          placeholder="e.g., Copper Sludge, Fly Ash, Steel Slag" required />
        {classifiedAs && form.material_type === classifiedAs && (
          <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Auto-filled by AI vision model
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
        <textarea className="w-full p-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white placeholder:text-slate-400" rows={2}
          value={form.description} onChange={(e) => updateField("description", e.target.value)}
          placeholder="Detailed description of waste material..." />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Volume (kg)</label>
          <input type="number" className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white placeholder:text-slate-400"
            value={form.volume_kg} onChange={(e) => updateField("volume_kg", e.target.value)}
            placeholder="500" min="0.1" step="0.1" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Supply Mode</label>
          <select className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white"
            value={form.supply_mode} onChange={(e) => updateField("supply_mode", e.target.value)}>
            <option value="batch">Batch</option>
            <option value="continuous">Continuous</option>
          </select>
        </div>
      </div>

      <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
        <h3 className="text-sm font-semibold text-slate-700 mb-1">Chemical Specifications</h3>
        <p className="text-xs text-slate-400 mb-3">More fields = more accurate AI purity score</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">pH Level (0–14)</label>
            <input type="number" className="w-full p-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white placeholder:text-slate-400"
              value={form.ph_level} onChange={(e) => updateField("ph_level", e.target.value)}
              placeholder="7.0" min="0" max="14" step="0.1" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Moisture (%)</label>
            <input type="number" className="w-full p-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white placeholder:text-slate-400"
              value={form.moisture_pct} onChange={(e) => updateField("moisture_pct", e.target.value)}
              placeholder="10" min="0" max="100" step="0.1" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Toxicity Class</label>
            <select className="w-full p-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white"
              value={form.toxicity_class} onChange={(e) => updateField("toxicity_class", e.target.value)}>
              <option value="non_toxic">Non-toxic</option>
              <option value="low">Low</option>
              <option value="moderate">Moderate</option>
              <option value="high">High</option>
              <option value="hazardous">Hazardous</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Carbon (%)</label>
            <input type="number" className="w-full p-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white placeholder:text-slate-400"
              value={form.carbon_pct} onChange={(e) => updateField("carbon_pct", e.target.value)}
              placeholder="35.0" min="0" max="100" step="0.1" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Hydrogen (%)</label>
            <input type="number" className="w-full p-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white placeholder:text-slate-400"
              value={form.hydrogen_pct} onChange={(e) => updateField("hydrogen_pct", e.target.value)}
              placeholder="5.0" min="0" max="100" step="0.1" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Ash Content (%)</label>
            <input type="number" className="w-full p-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white placeholder:text-slate-400"
              value={form.ash_pct} onChange={(e) => updateField("ash_pct", e.target.value)}
              placeholder="15.0" min="0" max="100" step="0.1" />
          </div>
        </div>
        <div className="mt-3">
          <label className="block text-xs font-medium text-slate-600 mb-1">Additional Composition (JSON — optional)</label>
          <input type="text" className="w-full p-2 border border-slate-300 rounded-lg text-sm font-mono text-slate-900 bg-white placeholder:text-slate-400"
            value={form.chemical_composition} onChange={(e) => updateField("chemical_composition", e.target.value)}
            placeholder='{"Cu": 34.2, "Fe": 12.1, "SiO2": 8.5}' />
        </div>
      </div>

      <PurityIndicator purity={purity} loading={purityLoading} />

      <button type="submit" disabled={loading || (purity !== null && !purity.meets_threshold)}
        className="w-full bg-emerald-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
        {loading ? "Creating Passport..." : "Create Digital Material Passport"}
      </button>
    </form>
  );
}
