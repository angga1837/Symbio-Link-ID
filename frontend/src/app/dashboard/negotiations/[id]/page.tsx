"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getAuth } from "@/lib/auth";
import type { Negotiation, NegotiationMessage, SymbiosisMatch } from "@/lib/types";
import { toast } from "@/components/ui/toaster";
import {
  ArrowLeft, Send, CheckCircle, XCircle, RefreshCw,
  DollarSign, Calendar, FileText, Loader2, Shield,
} from "lucide-react";

export default function NegotiationRoomPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const auth = getAuth();
  const bottomRef = useRef<HTMLDivElement>(null);

  const [neg, setNeg] = useState<Negotiation | null>(null);
  const [match, setMatch] = useState<SymbiosisMatch | null>(null);
  const [messages, setMessages] = useState<NegotiationMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  // Counter-offer form state
  const [counterPrice, setCounterPrice] = useState("");
  const [counterTerms, setCounterTerms] = useState("net_30");
  const [counterNotes, setCounterNotes] = useState("");
  const [messageText, setMessageText] = useState("");

  const fetchAll = async () => {
    try {
      const [negData, msgData] = await Promise.all([
        api.get<Negotiation>(`/api/v1/negotiations/${id}`),
        api.get<NegotiationMessage[]>(`/api/v1/negotiations/${id}/messages`),
      ]);
      setNeg(negData);
      setMessages(msgData);
      if (negData.match_id) {
        const matchData = await api.get<SymbiosisMatch>(`/api/v1/matches/${negData.match_id}`);
        setMatch(matchData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [id]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleCounterOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    setActing(true);
    try {
      await api.post(`/api/v1/negotiations/${id}/counter`, {
        proposed_price_per_kg: parseFloat(counterPrice),
        payment_terms: counterTerms,
        notes: counterNotes || undefined,
      });
      toast({ title: "Counter-offer sent", variant: "success" });
      await fetchAll();
      setCounterPrice("");
      setCounterNotes("");
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed", variant: "destructive" });
    } finally {
      setActing(false);
    }
  };

  const handleAccept = async () => {
    setActing(true);
    try {
      const result = await api.post<{
        agreement_id: string;
        blockchain_tx_hash: string;
        status: string;
      }>(`/api/v1/negotiations/${id}/accept`, {});
      toast({
        title: "🎉 Agreement Signed!",
        description: `Blockchain TX: ${result.blockchain_tx_hash.slice(0, 16)}...`,
        variant: "success",
      });
      await fetchAll();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed", variant: "destructive" });
    } finally {
      setActing(false);
    }
  };

  const handleReject = async () => {
    setActing(true);
    try {
      await api.post(`/api/v1/negotiations/${id}/reject`, {});
      toast({ title: "Negotiation rejected", variant: "destructive" });
      router.push("/dashboard/negotiations");
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed", variant: "destructive" });
    } finally {
      setActing(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    try {
      await api.post(`/api/v1/negotiations/${id}/messages`, { message: messageText });
      setMessageText("");
      await fetchAll();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed", variant: "destructive" });
    }
  };

  const statusColors: Record<string, string> = {
    open: "bg-blue-100 text-blue-700 border-blue-200",
    counter_offered: "bg-amber-100 text-amber-700 border-amber-200",
    accepted: "bg-emerald-100 text-emerald-700 border-emerald-200",
    rejected: "bg-red-100 text-red-600 border-red-200",
    expired: "bg-slate-100 text-slate-500 border-slate-200",
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96 text-slate-400"><Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading Negotiation Room...</div>;
  }

  if (!neg) {
    return <div className="text-center py-12 text-slate-500">Negotiation not found.</div>;
  }

  const isResolved = neg.status === "accepted" || neg.status === "rejected" || neg.status === "expired";

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition">
          <ArrowLeft className="h-4 w-4 text-slate-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-extrabold text-slate-900">Negotiation Room</h1>
          <p className="text-sm text-slate-500">Secure B2B terms negotiation</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusColors[neg.status] || "bg-slate-100 text-slate-600"}`}>
          {neg.status.replace("_", " ").toUpperCase()}
        </span>
      </div>

      {/* Match Summary */}
      {match && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Symbiosis Match Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><p className="text-xs text-slate-500">Volume</p><p className="font-bold text-slate-800">{match.matched_volume_kg.toLocaleString()} kg</p></div>
            <div><p className="text-xs text-slate-500">Distance</p><p className="font-bold text-slate-800">{match.transport_distance_km?.toFixed(0)} km</p></div>
            <div><p className="text-xs text-slate-500">CO₂ Saved</p><p className="font-bold text-emerald-600">{match.co2_saved_kg?.toFixed(1)} kg</p></div>
            <div><p className="text-xs text-slate-500">Match Score</p><p className="font-bold text-blue-600">{match.match_score?.toFixed(3)}</p></div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Terms */}
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Current Terms</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50"><DollarSign className="h-4 w-4 text-emerald-600" /></div>
                <div>
                  <p className="text-xs text-slate-500">Price per kg</p>
                  <p className="font-bold text-slate-800">${neg.proposed_price_per_kg?.toFixed(4) ?? "TBD"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50"><FileText className="h-4 w-4 text-blue-600" /></div>
                <div>
                  <p className="text-xs text-slate-500">Payment Terms</p>
                  <p className="font-bold text-slate-800">{neg.payment_terms?.replace("_", " ") ?? "TBD"}</p>
                </div>
              </div>
              {neg.proposed_pickup_date && (
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50"><Calendar className="h-4 w-4 text-amber-600" /></div>
                  <div>
                    <p className="text-xs text-slate-500">Pickup Date</p>
                    <p className="font-bold text-slate-800">{new Date(neg.proposed_pickup_date).toLocaleDateString()}</p>
                  </div>
                </div>
              )}
            </div>

            {neg.notes && (
              <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600 border border-slate-100">
                <p className="text-xs font-semibold text-slate-500 mb-1">Notes</p>
                {neg.notes}
              </div>
            )}
          </div>

          {/* Actions */}
          {!isResolved && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
              <h2 className="text-sm font-semibold text-slate-700">Actions</h2>
              <button
                onClick={handleAccept}
                disabled={acting}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition disabled:opacity-50"
              >
                {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                Accept & Sign Agreement
              </button>
              <button
                onClick={handleReject}
                disabled={acting}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 py-2.5 text-sm font-medium text-red-600 hover:bg-red-100 transition disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" /> Reject
              </button>
            </div>
          )}

          {neg.status === "accepted" && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-5 w-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-emerald-800">Agreement Signed</h3>
              </div>
              <p className="text-xs text-emerald-700">This agreement is now committed to the Hyperledger blockchain and is legally immutable.</p>
            </div>
          )}
        </div>

        {/* Message Thread + Counter Offer */}
        <div className="lg:col-span-2 space-y-4">
          {/* Counter-offer Form */}
          {!isResolved && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-amber-500" /> Submit Counter-Offer
              </h2>
              <form onSubmit={handleCounterOffer} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Price per kg (USD)</label>
                    <input
                      type="number"
                      step="0.0001"
                      min="0.0001"
                      className="w-full rounded-lg border border-slate-300 p-2 text-sm"
                      placeholder="0.0500"
                      value={counterPrice}
                      onChange={(e) => setCounterPrice(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Payment Terms</label>
                    <select className="w-full rounded-lg border border-slate-300 p-2 text-sm bg-white" value={counterTerms} onChange={(e) => setCounterTerms(e.target.value)}>
                      <option value="prepaid">Prepaid</option>
                      <option value="net_15">Net 15</option>
                      <option value="net_30">Net 30</option>
                      <option value="escrow">Escrow</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Notes (optional)</label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm"
                    placeholder="Add any counter-offer notes..."
                    value={counterNotes}
                    onChange={(e) => setCounterNotes(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  disabled={acting || !counterPrice}
                  className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-white hover:bg-amber-600 transition disabled:opacity-50"
                >
                  {acting ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                  Send Counter-Offer
                </button>
              </form>
            </div>
          )}

          {/* Message Thread */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col" style={{ minHeight: "320px" }}>
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-700">Secure Message Thread</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3" style={{ maxHeight: "320px" }}>
              {messages.length === 0 ? (
                <p className="text-center text-sm text-slate-400 py-8">No messages yet. Start the conversation.</p>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender_org_id === auth.org_id;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-xs rounded-2xl px-4 py-2.5 text-sm ${isMe ? "bg-emerald-600 text-white rounded-tr-sm" : "bg-slate-100 text-slate-800 rounded-tl-sm"}`}>
                        <p>{msg.message}</p>
                        <p className={`text-[10px] mt-1 ${isMe ? "text-emerald-200" : "text-slate-400"}`}>
                          {new Date(msg.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>
            {!isResolved && (
              <form onSubmit={handleSendMessage} className="flex gap-2 p-4 border-t border-slate-100">
                <input
                  type="text"
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                  placeholder="Type a secure message..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                />
                <button type="submit" disabled={!messageText.trim()} className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition disabled:opacity-50">
                  <Send className="h-4 w-4" />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
