"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Facility } from "@/lib/types";
import MaterialForm from "@/components/materials/MaterialForm";

export default function NewMaterialPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Facility[]>("/api/v1/facilities/")
      .then(setFacilities)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Create Material Passport</h1>
        <p className="text-slate-500">List a new waste material for exchange with AI purity scoring</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading facilities...</div>
      ) : facilities.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-slate-600 font-medium">You need to register a facility first.</p>
          <p className="text-sm text-slate-400 mt-1">Go to Facilities page to add your factory or processing plant.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <MaterialForm facilities={facilities.map((f) => ({ id: f.id, name: f.name }))} />
        </div>
      )}
    </div>
  );
}
