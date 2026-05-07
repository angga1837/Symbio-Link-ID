"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "@/components/ui/toaster";
import { Shield, Upload } from "lucide-react";

interface ComplianceDoc {
  id: string;
  doc_type: string;
  file_url: string;
  status: string;
  issued_date: string | null;
  expiry_date: string | null;
  uploaded_at: string;
}

export default function CompliancePage() {
  const [docs, setDocs] = useState<ComplianceDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ doc_type: "iso_14001", file_url: "", issued_date: "", expiry_date: "" });

  const fetchDocs = () => {
    api.get<ComplianceDoc[]>("/api/v1/organizations/me/compliance")
      .then(setDocs)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchDocs(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/api/v1/organizations/me/compliance", {
        doc_type: form.doc_type,
        file_url: form.file_url,
        issued_date: form.issued_date || undefined,
        expiry_date: form.expiry_date || undefined,
      });
      toast({ title: "Document Uploaded", variant: "success" });
      setShowForm(false);
      setForm({ doc_type: "iso_14001", file_url: "", issued_date: "", expiry_date: "" });
      fetchDocs();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed", variant: "destructive" });
    }
  };

  const docTypeLabels: Record<string, string> = {
    iso_14001: "ISO 14001",
    iso_9001: "ISO 9001",
    environmental_permit: "Environmental Permit",
    business_license: "Business License",
    hazmat_cert: "Hazmat Certificate",
  };

  const statusColor: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    approved: "bg-emerald-100 text-emerald-700",
    expired: "bg-red-100 text-red-600",
    rejected: "bg-red-100 text-red-600",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Compliance & KYC</h1>
          <p className="text-slate-600">Upload ISO certificates, environmental permits, and corporate verification</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition">
          <Upload className="h-4 w-4" /> Upload Document
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Document Type</label>
              <select className="mt-1 block w-full rounded-lg border border-slate-300 p-2.5 text-sm bg-white"
                value={form.doc_type} onChange={(e) => setForm({ ...form, doc_type: e.target.value })}>
                {Object.entries(docTypeLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">File URL</label>
              <input type="url" required className="mt-1 block w-full rounded-lg border border-slate-300 p-2.5 text-sm"
                value={form.file_url} onChange={(e) => setForm({ ...form, file_url: e.target.value })} placeholder="https://storage.example.com/cert.pdf" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Issued Date</label>
              <input type="date" className="mt-1 block w-full rounded-lg border border-slate-300 p-2.5 text-sm"
                value={form.issued_date} onChange={(e) => setForm({ ...form, issued_date: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Expiry Date</label>
              <input type="date" className="mt-1 block w-full rounded-lg border border-slate-300 p-2.5 text-sm"
                value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} />
            </div>
          </div>
          <button type="submit" className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition">
            Submit Document
          </button>
        </form>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading documents...</div>
      ) : docs.length === 0 && !showForm ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <Shield className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-4 text-lg font-semibold text-slate-700">No compliance documents</h3>
          <p className="mt-1 text-sm text-slate-500">Upload your ISO certificates and permits for verification.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {docs.map((d) => (
            <div key={d.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-800">{docTypeLabels[d.doc_type] || d.doc_type}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Uploaded: {new Date(d.uploaded_at).toLocaleDateString()}
                  {d.expiry_date && ` | Expires: ${new Date(d.expiry_date).toLocaleDateString()}`}
                </p>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColor[d.status] || "bg-slate-100 text-slate-500"}`}>
                {d.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
