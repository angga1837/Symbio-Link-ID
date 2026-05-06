"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getAuth } from "@/lib/auth";
import type { GreenCertificate } from "@/lib/types";
import { Award, ExternalLink } from "lucide-react";

export default function CertificatesPage() {
  const [certs, setCerts] = useState<GreenCertificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    if (auth.org_id) {
      api.get<GreenCertificate[]>(`/api/v1/esg/certificates/${auth.org_id}`)
        .then(setCerts)
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Green Certificates</h1>
        <p className="text-slate-600">Auto-generated certificates with verifiable blockchain transaction hashes</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading certificates...</div>
      ) : certs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <Award className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-4 text-lg font-semibold text-slate-700">No certificates issued yet</h3>
          <p className="mt-1 text-sm text-slate-500">Fulfill an agreement to auto-generate a Green Certificate.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {certs.map((c) => (
            <div key={c.id} className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                    <Award className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{c.certificate_number}</p>
                    <p className="text-xs text-slate-500">Issued: {new Date(c.issued_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 font-medium">CO2 Saved</p>
                  <p className="text-lg font-bold text-emerald-600">{c.co2_saved_kg.toLocaleString()} kg</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Material Reused</p>
                  <p className="text-lg font-bold text-blue-600">{c.material_reused_kg.toLocaleString()} kg</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs text-blue-600 font-mono">
                <ExternalLink className="h-3 w-3" />
                {c.blockchain_tx_hash.slice(0, 24)}...
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
