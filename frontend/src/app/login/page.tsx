"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { saveAuth } from "@/lib/auth";
import type { TokenResponse } from "@/lib/types";
import { Building2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await api.post<TokenResponse>("/api/v1/auth/login", { email, password });
      saveAuth(data);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-emerald-50">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-100">
            <Building2 className="h-7 w-7 text-emerald-600" />
          </div>
          <h1 className="mt-4 text-2xl font-extrabold text-slate-900">Symbio-Link ID</h1>
          <p className="mt-1 text-sm text-slate-600">B2B Industrial Symbiosis Marketplace</p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              required
              className="mt-1 block w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-emerald-500 focus:outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              required
              className="mt-1 block w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-emerald-500 focus:outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-600">
          No account?{" "}
          <Link href="/register" className="font-semibold text-emerald-600 hover:underline">
            Register your organization
          </Link>
        </p>
      </div>
    </div>
  );
}
