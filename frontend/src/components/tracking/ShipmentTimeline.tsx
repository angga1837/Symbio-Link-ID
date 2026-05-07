"use client";

import React from "react";

interface StatusEvent {
  status: string;
  timestamp: string;
  tx_id?: string | null;
}

interface ShipmentTimelineProps {
  shipment_id: string;
  agreement_id: string;
  current_status: string;
  status_history: StatusEvent[];
  distance_km?: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  listed:     { label: "Listed",     color: "bg-slate-400" },
  matched:    { label: "Matched",    color: "bg-blue-500" },
  scheduled:  { label: "Scheduled",  color: "bg-indigo-500" },
  picked_up:  { label: "Picked Up",  color: "bg-amber-500" },
  in_transit: { label: "In Transit", color: "bg-orange-500" },
  delivered:  { label: "Delivered",  color: "bg-teal-500" },
  processed:  { label: "Processed",  color: "bg-emerald-500" },
  verified:   { label: "Verified",   color: "bg-green-600" },
};

export default function ShipmentTimeline({ shipment_id, current_status, status_history, distance_km }: ShipmentTimelineProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold text-slate-800">Shipment {shipment_id.slice(0, 8)}</h3>
          {distance_km !== undefined && <p className="text-xs text-slate-600">{distance_km} km route</p>}
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${STATUS_CONFIG[current_status]?.color || "bg-slate-400"}`}>
          {STATUS_CONFIG[current_status]?.label || current_status}
        </span>
      </div>

      <div className="relative">
        {status_history.map((event, idx) => {
          const config = STATUS_CONFIG[event.status] || { label: event.status, color: "bg-slate-400" };
          const isLast = idx === status_history.length - 1;
          return (
            <div key={idx} className="flex gap-4 pb-6">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full ${config.color} flex items-center justify-center text-white text-xs font-bold`}>
                  {idx + 1}
                </div>
                {!isLast && <div className="w-0.5 flex-1 bg-slate-200 mt-1" />}
              </div>
              <div className="flex-1 pt-1">
                <p className="font-medium text-sm text-slate-800">{config.label}</p>
                <p className="text-xs text-slate-600">
                  {new Date(event.timestamp).toLocaleString("id-ID")}
                </p>
                {event.tx_id && (
                  <p className="text-xs text-blue-600 font-mono mt-0.5">
                    tx: {event.tx_id.slice(0, 16)}...
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
