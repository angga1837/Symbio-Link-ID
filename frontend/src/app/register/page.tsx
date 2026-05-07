"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { saveAuth } from "@/lib/auth";
import type { TokenResponse } from "@/lib/types";
import { Building2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    org_name: "",
    org_type: "maker",
    email: "",
    password: "",
    full_name: "",
    tax_id: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const payload = { ...form, tax_id: form.tax_id || undefined };
      const data = await api.post<TokenResponse>("/api/v1/auth/register", payload);
      saveAuth(data);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-emerald-50 py-12">
      <div className="w-full max-w-lg space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-100">
            <Building2 className="h-7 w-7 text-emerald-600" />
          </div>
          <h1 className="mt-4 text-2xl font-extrabold text-slate-900">Create Workspace</h1>
          <p className="mt-1 text-sm text-slate-600">Register your organization on Symbio-Link ID</p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700">Organization Name</label>
              <input
                type="text"
                required
                className="mt-1 block w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 placeholder:text-slate-400"
                value={form.org_name}
                onChange={(e) => update("org_name", e.target.value)}
                placeholder="PT Industri Hijau"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Organization Type</label>
              <select
                className="mt-1 block w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 bg-white"
                value={form.org_type}
                onChange={(e) => update("org_type", e.target.value)}
              >
                <option value="maker">Maker / Manufacturer</option>
                <option value="recycler">Recycler / Processor</option>
                <option value="transporter">Transporter / Logistics</option>
                <option value="regulator">Regulator / Auditor</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Tax ID (NPWP)</label>
              <input
                type="text"
                className="mt-1 block w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 placeholder:text-slate-400"
                value={form.tax_id}
                onChange={(e) => update("tax_id", e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700">Full Name</label>
              <input
                type="text"
                required
                className="mt-1 block w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 placeholder:text-slate-400"
                value={form.full_name}
                onChange={(e) => update("full_name", e.target.value)}
                placeholder="Your full name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                required
                className="mt-1 block w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 placeholder:text-slate-400"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Password</label>
              <input
                type="password"
                required
                minLength={8}
                className="mt-1 block w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 placeholder:text-slate-400"
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                placeholder="Min. 8 characters"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition disabled:opacity-50"
          >
            {loading ? "Creating workspace..." : "Create Workspace & Sign In"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-600">
          Already registered?{" "}
          <Link href="/login" className="font-semibold text-emerald-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
