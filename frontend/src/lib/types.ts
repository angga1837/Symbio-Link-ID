// ============================================================
// Symbio-Link ID — Shared TypeScript Interfaces
// ============================================================

// --- Auth ---
export interface TokenResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  org_id: string;
  org_name: string;
  role: string;
}

export interface UserProfile {
  id: string;
  org_id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

// --- Organization ---
export interface Organization {
  id: string;
  name: string;
  org_type: "maker" | "recycler" | "transporter" | "regulator";
  tax_id: string | null;
  verified: boolean;
  kyc_status: "pending" | "submitted" | "verified" | "rejected";
  created_at: string;
  updated_at: string;
}

// --- Facility ---
export interface Facility {
  id: string;
  org_id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  facility_type: "factory" | "warehouse" | "processing_plant" | "port" | null;
  capacity_kg: number;
  is_active: boolean;
  created_at: string;
}

// --- Material Listing (Digital Material Passport) ---
export interface MaterialListing {
  id: string;
  org_id: string;
  facility_id: string;
  material_type: string;
  description: string | null;
  volume_kg: number;
  supply_mode: "continuous" | "batch";
  frequency_days: number | null;
  ph_level: number | null;
  moisture_pct: number | null;
  toxicity_class: "non_toxic" | "low" | "moderate" | "high" | "hazardous" | null;
  chemical_composition: Record<string, number> | null;
  ml_purity_score: number | null;
  ml_model_version: string | null;
  requires_remediation: boolean;
  status: "draft" | "listed" | "matched" | "in_transit" | "processed" | "archived";
  listed_at: string;
  expires_at: string | null;
  image_urls: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface PurityCheckResult {
  ml_purity_score: number;
  meets_threshold: boolean;
  requires_remediation: boolean;
  threshold: number;
  ceiling: number;
  recommendation: string;
}

// --- Matchmaking ---
export interface SymbiosisMatch {
  id: string;
  listing_id: string;
  sender_org_id: string;
  receiver_org_id: string;
  sender_facility: string;
  receiver_facility: string;
  matched_volume_kg: number;
  transport_cost: number | null;
  transport_distance_km: number | null;
  co2_saved_kg: number | null;
  milp_objective_value: number | null;
  match_score: number | null;
  status: "proposed" | "accepted" | "negotiating" | "contracted" | "rejected" | "expired";
  proposed_at: string;
  expires_at: string;
}

// --- Negotiation ---
export interface Negotiation {
  id: string;
  match_id: string;
  initiated_by: string;
  status: "open" | "counter_offered" | "accepted" | "rejected" | "expired";
  proposed_price_per_kg: number | null;
  proposed_pickup_date: string | null;
  proposed_delivery_date: string | null;
  payment_terms: "prepaid" | "net_15" | "net_30" | "escrow" | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface NegotiationMessage {
  id: string;
  negotiation_id: string;
  sender_org_id: string;
  sender_user_id: string;
  message: string;
  attachments: string[] | null;
  created_at: string;
}

// --- Agreement ---
export interface Agreement {
  id: string;
  negotiation_id: string | null;
  match_id: string;
  sender_org_id: string;
  receiver_org_id: string;
  agreed_price_per_kg: number;
  agreed_volume_kg: number;
  pickup_date: string | null;
  delivery_date: string | null;
  payment_terms: string | null;
  escrow_status: "pending" | "funded" | "released" | "disputed" | "refunded";
  blockchain_tx_hash: string | null;
  status: "active" | "fulfilled" | "cancelled" | "disputed";
  signed_at: string;
}

// --- Shipment ---
export interface ShipmentStatusEvent {
  status: string;
  timestamp: string;
  tx_id: string | null;
}

export interface Shipment {
  id: string;
  agreement_id: string;
  transporter_org: string | null;
  status: "scheduled" | "picked_up" | "in_transit" | "delivered" | "processed" | "verified";
  pickup_lat: number | null;
  pickup_lng: number | null;
  delivery_lat: number | null;
  delivery_lng: number | null;
  distance_km: number | null;
  vehicle_id: string | null;
  status_history: ShipmentStatusEvent[];
  blockchain_hashes: string[] | null;
  created_at: string;
  updated_at: string;
}

// --- ESG ---
export interface ESGRecord {
  id: string;
  org_id: string;
  agreement_id: string | null;
  record_type: "co2_offset" | "material_reuse" | "waste_diversion" | "scope3_emission";
  value: number;
  unit: string;
  blockchain_tx_hash: string | null;
  verified: boolean;
  created_at: string;
}

export interface GreenCertificate {
  id: string;
  org_id: string;
  agreement_id: string;
  certificate_number: string;
  co2_saved_kg: number;
  material_reused_kg: number;
  blockchain_tx_hash: string;
  issued_at: string;
  pdf_url: string | null;
}

export interface DashboardData {
  total_co2_saved_kg: number;
  total_material_reused_kg: number;
  cost_savings_pct: number;
  material_reuse_pct: number;
  green_certificates_issued: number;
  monthly_co2_trend: { month: string; co2_offset_kg: number }[];
  net_zero_target_year: number;
}

// --- Legacy MVP (backward compat) ---
export interface LegacyTransactionResult {
  sender_factory_id: string;
  material_type: string;
  volume_kg: number;
  system_outputs?: {
    ml_purity_score?: number;
    optimization_status?: string;
    blockchain_tx_hash?: string;
    co2_saved_kg?: number;
  };
}
