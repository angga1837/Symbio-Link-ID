"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "@/components/ui/toaster";
import type { Facility } from "@/lib/types";
import { MapPin, Plus } from "lucide-react";

export default function FacilitiesPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "", address: "", latitude: "", longitude: "",
    facility_type: "factory", capacity_kg: "",
  });

  const fetchFacilities = () => {
    api.get<Facility[]>("/api/v1/facilities/")
      .then(setFacilities)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchFacilities(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Client-side validation to catch React state issues before hitting the API
    if (!form.name.trim()) {
      toast({ title: "Validation Error", description: "Facility name is required.", variant: "destructive" });
      return;
    }
    const lat = parseFloat(form.latitude);
    const lng = parseFloat(form.longitude);
    if (isNaN(lat) || isNaN(lng)) {
      toast({ title: "Validation Error", description: "Valid latitude and longitude are required.", variant: "destructive" });
      return;
    }
    try {
      await api.post("/api/v1/facilities/", {
        name: form.name.trim(),
        address: form.address || undefined,
        latitude: lat,
        longitude: lng,
        facility_type: form.facility_type,
        capacity_kg: form.capacity_kg ? parseFloat(form.capacity_kg) : 0,
      });
      toast({ title: "Facility Registered", variant: "success" });
      setShowForm(false);
      setForm({ name: "", address: "", latitude: "", longitude: "", facility_type: "factory", capacity_kg: "" });
      fetchFacilities();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed", variant: "destructive" });
    }
  };

  const typeLabel: Record<string, string> = {
    factory: "Factory",
    warehouse: "Warehouse",
    processing_plant: "Processing Plant",
    port: "Port",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-900">Facility Management</h1>
          <p className="text-sm text-slate-600">Geolocate your factories to feed the MILP logistics engine</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition w-full sm:w-auto"
        >
          <Plus className="h-4 w-4" /> Add Facility
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700">Name</label>
              <input type="text" required className="mt-1 block w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 bg-white placeholder:text-slate-400"
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Pabrik Utama" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700">Address</label>
              <input type="text" className="mt-1 block w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 bg-white placeholder:text-slate-400"
                value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Jl. Industri No. 1, Surabaya" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Latitude</label>
              <input type="number" step="any" required className="mt-1 block w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 bg-white placeholder:text-slate-400"
                value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} placeholder="-7.2575" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Longitude</label>
              <input type="number" step="any" required className="mt-1 block w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 bg-white placeholder:text-slate-400"
                value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} placeholder="112.7521" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Type</label>
              <select className="mt-1 block w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 bg-white"
                value={form.facility_type} onChange={(e) => setForm({ ...form, facility_type: e.target.value })}>
                <option value="factory">Factory</option>
                <option value="warehouse">Warehouse</option>
                <option value="processing_plant">Processing Plant</option>
                <option value="port">Port</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Capacity (kg)</label>
              <input type="number" className="mt-1 block w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 bg-white placeholder:text-slate-400"
                value={form.capacity_kg} onChange={(e) => setForm({ ...form, capacity_kg: e.target.value })} placeholder="10000" />
            </div>
          </div>
          <button type="submit" className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition">
            Register Facility
          </button>
        </form>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading facilities...</div>
      ) : facilities.length === 0 && !showForm ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <MapPin className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-4 text-lg font-semibold text-slate-700">No facilities registered</h3>
          <p className="mt-1 text-sm text-slate-500">Add your first factory to enable MILP-powered matchmaking.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {facilities.map((f) => (
            <div key={f.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                  <MapPin className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">{f.name}</h3>
                  <p className="text-xs text-slate-500">{typeLabel[f.facility_type || ""] || f.facility_type}</p>
                </div>
              </div>
              <div className="mt-3 text-xs text-slate-600 space-y-1">
                {f.address && <p>{f.address}</p>}
                <p>Coords: {f.latitude.toFixed(4)}, {f.longitude.toFixed(4)}</p>
                {f.capacity_kg > 0 && <p>Capacity: {f.capacity_kg.toLocaleString()} kg</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
