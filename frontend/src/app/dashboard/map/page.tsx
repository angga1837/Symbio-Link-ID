"use client";

import React, { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { api } from "@/lib/api";
import { MapPin, Zap, Loader2, Info } from "lucide-react";

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), { ssr: false });
const Polyline = dynamic(() => import("react-leaflet").then((mod) => mod.Polyline), { ssr: false });

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

function LeafletMap({ facilities, routes }: { facilities: FacilityGeo[]; routes: SymbiosisRoute[] }) {
  const [L, setL] = useState<any>(null);

  useEffect(() => {
    import("leaflet").then((leaflet) => {
      setL(leaflet);
    });
  }, []);

  const center: [number, number] = [-7.3, 112.7]; // East Java area

  if (!L) return <div className="flex items-center justify-center h-full text-slate-400">Loading Map Engine...</div>;

  const createIcon = (color: string) => {
    return L.divIcon({
      className: "custom-div-icon",
      html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.3);"></div>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6],
    });
  };

  const typeColors: Record<string, string> = {
    factory: "#3b82f6",
    processing_plant: "#10b981",
    warehouse: "#f59e0b",
    port: "#8b5cf6",
  };

  return (
    <MapContainer center={center} zoom={9} style={{ height: "100%", width: "100%" }} scrollWheelZoom={true}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {facilities.map((fac) => (
        <Marker 
          key={fac.id} 
          position={[fac.latitude, fac.longitude]} 
          icon={createIcon(typeColors[fac.facility_type || "factory"] || "#64748b")}
        >
          <Popup>
            <div className="p-1">
              <p className="text-xs font-bold text-slate-900 mb-1">{fac.name}</p>
              <p className="text-[10px] text-slate-600 mb-1">{fac.facility_type?.replace("_", " ")}</p>
              <p className="text-[10px] font-semibold text-emerald-600">{fac.is_my_facility ? "Your Facility" : "Partner Facility"}</p>
            </div>
          </Popup>
        </Marker>
      ))}

      {routes.map((route) => (
        <Polyline
          key={route.match_id}
          positions={[
            [route.sender.latitude, route.sender.longitude],
            [route.receiver.latitude, route.receiver.longitude],
          ]}
          pathOptions={{
            color: route.is_my_route ? "#10b981" : "#94a3b8",
            weight: route.is_my_route ? 3 : 2,
            dashArray: route.is_my_route ? "0" : "5, 10",
            opacity: 0.7,
          }}
        >
          <Popup>
            <div className="p-1">
              <p className="text-xs font-bold text-slate-900 mb-1">Symbiosis Route</p>
              <p className="text-[10px] text-slate-600">{route.matched_volume_kg.toLocaleString()} kg material</p>
              <p className="text-[10px] text-emerald-600 font-semibold">CO₂ saved: {route.co2_saved_kg?.toFixed(1)} kg</p>
              <p className="text-[10px] text-slate-500">{route.transport_distance_km?.toFixed(0)} km distance</p>
            </div>
          </Popup>
        </Polyline>
      ))}
    </MapContainer>
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
          <Info className="h-3 w-3" /> Click markers/lines for details
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-[520px] rounded-xl border border-slate-200 bg-white">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400 mr-2" />
          <span className="text-slate-400">Loading ecosystem data...</span>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden" style={{ height: "520px" }}>
          <LeafletMap
            facilities={data?.facilities ?? []}
            routes={data?.routes.routes ?? []}
          />
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
