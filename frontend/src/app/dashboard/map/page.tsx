"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { MapPin, Zap, Loader2, Info } from "lucide-react";

interface FacilityGeo {
  id: string;
  org_id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  facility_type: string | null;
  capacity_kg: number;
  is_my_facility: boolean;
}

interface SymbiosisRoute {
  match_id: string;
  status: string;
  is_my_route: boolean;
  sender: { facility_id: string; name: string; latitude: number; longitude: number };
  receiver: { facility_id: string; name: string; latitude: number; longitude: number };
  matched_volume_kg: number;
  co2_saved_kg: number | null;
  transport_distance_km: number | null;
  transport_cost: number | null;
  match_score: number | null;
}

interface MapData {
  facilities: FacilityGeo[];
  routes: { routes: SymbiosisRoute[]; total_routes: number };
}

// Simple SVG-based map visualizer (no external library needed)
function ScalableMap({ facilities, routes }: { facilities: FacilityGeo[]; routes: SymbiosisRoute[] }) {
  const [hovered, setHovered] = useState<string | null>(null);

  if (facilities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
        <MapPin className="h-10 w-10 text-slate-300" />
        <p className="text-sm">No facilities to display. Register facilities to see the map.</p>
      </div>
    );
  }

  // Calculate bounds
  const lats = facilities.map((f) => f.latitude);
  const lngs = facilities.map((f) => f.longitude);
  const minLat = Math.min(...lats) - 0.5;
  const maxLat = Math.max(...lats) + 0.5;
  const minLng = Math.min(...lngs) - 0.5;
  const maxLng = Math.max(...lngs) + 0.5;

  const W = 800;
  const H = 500;

  const project = (lat: number, lng: number) => ({
    x: ((lng - minLng) / (maxLng - minLng)) * (W - 80) + 40,
    y: H - ((lat - minLat) / (maxLat - minLat)) * (H - 80) - 40,
  });

  const typeColors: Record<string, string> = {
    factory: "#3b82f6",
    processing_plant: "#10b981",
    warehouse: "#f59e0b",
    port: "#8b5cf6",
  };

  const routeColor = (r: SymbiosisRoute) =>
    r.is_my_route ? "#10b981" : "#94a3b8";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" style={{ background: "transparent" }}>
      <defs>
        <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="3" refY="2" orient="auto">
          <polygon points="0 0, 6 2, 0 4" fill="#10b981" />
        </marker>
        <marker id="arrowhead-gray" markerWidth="6" markerHeight="4" refX="3" refY="2" orient="auto">
          <polygon points="0 0, 6 2, 0 4" fill="#94a3b8" />
        </marker>
      </defs>

      {/* Route lines */}
      {routes.map((route) => {
        const s = project(route.sender.latitude, route.sender.longitude);
        const r = project(route.receiver.latitude, route.receiver.longitude);
        const isActive = hovered === route.match_id;
        return (
          <g key={route.match_id}>
            <line
              x1={s.x} y1={s.y} x2={r.x} y2={r.y}
              stroke={routeColor(route)}
              strokeWidth={isActive ? 3 : route.is_my_route ? 2 : 1.5}
              strokeDasharray={route.is_my_route ? "none" : "6 3"}
              opacity={isActive ? 1 : 0.7}
              markerEnd={route.is_my_route ? "url(#arrowhead)" : "url(#arrowhead-gray)"}
              onMouseEnter={() => setHovered(route.match_id)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: "pointer" }}
            />
            {isActive && (
              <g>
                <rect
                  x={(s.x + r.x) / 2 - 70}
                  y={(s.y + r.y) / 2 - 30}
                  width="140" height="56" rx="6"
                  fill="white" stroke="#e2e8f0" strokeWidth="1"
                  filter="drop-shadow(0 2px 4px rgba(0,0,0,0.1))"
                />
                <text x={(s.x + r.x) / 2} y={(s.y + r.y) / 2 - 14} textAnchor="middle" fontSize="10" fill="#374151" fontWeight="600">
                  {route.matched_volume_kg.toLocaleString()} kg
                </text>
                <text x={(s.x + r.x) / 2} y={(s.y + r.y) / 2} textAnchor="middle" fontSize="9" fill="#10b981">
                  CO₂ saved: {route.co2_saved_kg?.toFixed(1)} kg
                </text>
                <text x={(s.x + r.x) / 2} y={(s.y + r.y) / 2 + 14} textAnchor="middle" fontSize="9" fill="#6b7280">
                  {route.transport_distance_km?.toFixed(0)} km | {route.status}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* Facility nodes */}
      {facilities.map((fac) => {
        const { x, y } = project(fac.latitude, fac.longitude);
        const color = typeColors[fac.facility_type || "factory"] || "#64748b";
        const isMe = fac.is_my_facility;
        return (
          <g key={fac.id} onMouseEnter={() => setHovered(fac.id)} onMouseLeave={() => setHovered(null)} style={{ cursor: "pointer" }}>
            {isMe && (
              <circle cx={x} cy={y} r="16" fill={color} opacity="0.15" />
            )}
            <circle
              cx={x} cy={y} r={isMe ? 10 : 7}
              fill={color}
              stroke="white"
              strokeWidth={isMe ? 2.5 : 1.5}
            />
            {isMe && (
              <text x={x} y={y + 0.5} textAnchor="middle" dominantBaseline="middle" fontSize="8" fill="white" fontWeight="bold">
                ★
              </text>
            )}
            <text x={x} y={y - (isMe ? 16 : 13)} textAnchor="middle" fontSize="9" fill="#374151" fontWeight={isMe ? "700" : "400"}>
              {fac.name.slice(0, 20)}
            </text>
            {hovered === fac.id && (
              <g>
                <rect x={x + 12} y={y - 20} width="130" height="46" rx="6" fill="white" stroke="#e2e8f0" strokeWidth="1" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.1))" />
                <text x={x + 77} y={y - 6} textAnchor="middle" fontSize="10" fill="#374151" fontWeight="600">{fac.name}</text>
                <text x={x + 77} y={y + 8} textAnchor="middle" fontSize="9" fill="#6b7280">{fac.facility_type?.replace("_", " ")} · {fac.capacity_kg.toLocaleString()} kg cap</text>
                <text x={x + 77} y={y + 20} textAnchor="middle" fontSize="8" fill={isMe ? "#10b981" : "#94a3b8"}>{isMe ? "● My Facility" : "● Partner Facility"}</text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default function GeospatialMapPage() {
  const [data, setData] = useState<MapData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<FacilityGeo[]>("/api/v1/map/facilities"),
      api.get<{ routes: SymbiosisRoute[]; total_routes: number }>("/api/v1/map/routes"),
    ])
      .then(([facilities, routes]) => setData({ facilities, routes }))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const typeColors: Record<string, string> = {
    factory: "bg-blue-500",
    processing_plant: "bg-emerald-500",
    warehouse: "bg-amber-500",
    port: "bg-violet-500",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Symbiosis Ecosystem Map</h1>
          <p className="text-slate-600">Real-time geospatial view of industrial symbiosis routes</p>
        </div>
        {data && (
          <div className="flex items-center gap-4 text-sm text-slate-600">
            <span><strong>{data.facilities.length}</strong> facilities</span>
            <span><strong>{data.routes.total_routes}</strong> active routes</span>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
        {Object.entries(typeColors).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className={`h-3 w-3 rounded-full ${color}`} />
            {type.replace("_", " ")}
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="h-0.5 w-6 bg-emerald-500" />
          My routes
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-0.5 w-6 bg-slate-300" style={{ borderTop: "2px dashed #94a3b8" }} />
          Other routes
        </div>
        <div className="flex items-center gap-1.5 text-slate-400">
          <Info className="h-3 w-3" /> Hover for details
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-96 rounded-xl border border-slate-200 bg-white">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400 mr-2" />
          <span className="text-slate-400">Loading ecosystem data...</span>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden" style={{ height: "520px" }}>
          <div className="h-full p-4">
            <ScalableMap
              facilities={data?.facilities ?? []}
              routes={data?.routes.routes ?? []}
            />
          </div>
        </div>
      )}

      {/* Route Details Table */}
      {data && data.routes.routes.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Zap className="h-4 w-4 text-emerald-500" /> MILP-Optimized Routes
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Sender → Receiver</th>
                  <th className="px-4 py-3">Volume (kg)</th>
                  <th className="px-4 py-3">Distance</th>
                  <th className="px-4 py-3">CO₂ Saved</th>
                  <th className="px-4 py-3">Cost (USD)</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.routes.routes.map((route) => (
                  <tr key={route.match_id} className={`border-t border-slate-100 hover:bg-slate-50 transition ${route.is_my_route ? "bg-emerald-50/30" : ""}`}>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      <span className="text-slate-600">{route.sender.name}</span>
                      <span className="mx-2 text-slate-300">→</span>
                      <span>{route.receiver.name}</span>
                    </td>
                    <td className="px-4 py-3">{route.matched_volume_kg.toLocaleString()}</td>
                    <td className="px-4 py-3">{route.transport_distance_km?.toFixed(0)} km</td>
                    <td className="px-4 py-3 font-semibold text-emerald-600">{route.co2_saved_kg?.toFixed(1)} kg</td>
                    <td className="px-4 py-3">${route.transport_cost?.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${route.status === "contracted" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                        {route.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
