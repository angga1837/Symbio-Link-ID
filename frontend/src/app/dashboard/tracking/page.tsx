"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "@/components/ui/toaster";
import type { Shipment } from "@/lib/types";
import ShipmentTimeline from "@/components/tracking/ShipmentTimeline";
import { Truck } from "lucide-react";

export default function TrackingPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchShipments = () => {
    api.get<Shipment[]>("/api/v1/shipments/my")
      .then(setShipments)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchShipments(); }, []);

  const handleStatusUpdate = async (shipmentId: string, newStatus: string) => {
    try {
      await api.patch(`/api/v1/shipments/${shipmentId}/status`, { status: newStatus });
      toast({ title: "Status Updated", description: `Shipment moved to: ${newStatus}`, variant: "success" });
      fetchShipments();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed", variant: "destructive" });
    }
  };

  const nextStatus: Record<string, string> = {
    scheduled: "picked_up",
    picked_up: "in_transit",
    in_transit: "delivered",
    delivered: "processed",
    processed: "verified",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Shipment Tracking</h1>
        <p className="text-slate-600">End-to-end traceability with blockchain-verified status updates</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading shipments...</div>
      ) : shipments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <Truck className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-4 text-lg font-semibold text-slate-700">No shipments yet</h3>
          <p className="mt-1 text-sm text-slate-500">Create a shipment from an active agreement to start tracking.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {shipments.map((s) => (
            <div key={s.id} className="space-y-3">
              <ShipmentTimeline
                shipment_id={s.id}
                agreement_id={s.agreement_id}
                current_status={s.status}
                status_history={s.status_history || []}
                distance_km={s.distance_km ?? undefined}
              />
              {nextStatus[s.status] && (
                <button
                  onClick={() => handleStatusUpdate(s.id, nextStatus[s.status])}
                  className="ml-12 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
                >
                  Advance to: {nextStatus[s.status].replace("_", " ")}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
