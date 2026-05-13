// Printer Types
export interface Printer {
  id: string;
  name: string;
  model?: string;
  online: boolean;
  last_seen?: string | null;
}

export interface PrinterStatus {
  printer_id: string;
  online: boolean;
  mqtt_connected: boolean;
  model?: string;
  current_print?: {
    file_name: string | null;
    progress: number | null;
    state: string;
    layer_num?: number;
    total_layer_num?: number;
    mc_remaining_time?: number;
  } | null;
}

// AMS Types
export interface AmsUnit {
  id: number;
  model: string;
  humidity?: number | null;
  temperature?: number | null;
  trays: Tray[];
}

export interface AmsData {
  printer_id: string;
  external_tray?: Tray | null;
  ams_units: AmsUnit[];
}

export interface Tray {
  index: number;
  ams_id: number;
  spool_id?: number | null;
  spool_name?: string | null;
  material: string;
  color: string;
  tray_color: string;
  spool_color: string;
  color_mismatch: boolean;
  color_mismatch_message?: string;
  spool_vendor?: string | null;
  remaining_g?: number | null;
  active: boolean;
  is_loaded: boolean;
  issue: boolean;
  issue_type?: string | null;
  unmapped_bambu_tag?: string | null;
  non_bambu_spool?: boolean;
}

// Spool Types
export interface Spool {
  id: string;
  name: string;
  material: string;
  vendor?: string | null;
  color: string | string[];
  diameter_mm?: number;
  weight_g?: number | null;
  remaining_g?: number | null;
  remaining_length_mm?: number | null;
  tag?: string | null;
  location?: string | null;
  ams_id?: number | null;
  tray_index?: number | null;
  last_used?: string | null;
  registered?: string | null;
  filament_extra?: Record<string, unknown>;
}

export interface SpoolListResponse {
  spools: Spool[];
  total: number;
  offset: number;
  limit?: number | null;
}

// Print Types
export interface FilamentUsage {
  ams_slot: number;
  spool_id?: number | null;
  spool?: Spool | null;
  filament_type: string;
  color: string;
  grams_used: number;
  estimated_grams?: number | null;
  length_used?: number | null;
  estimated_length?: number | null;
  cost?: number | null;
}

export interface LayerTracking {
  status: "RUNNING" | "COMPLETED" | "ABORTED" | "FAILED" | "UNKNOWN";
  total_layers?: number | null;
  layers_printed: number;
  filament_grams_billed?: number | null;
  filament_grams_total?: number | null;
  progress_percent?: number | null;
  predicted_end_time?: string | null;
  actual_end_time?: string | null;
}

export interface Print {
  id: number;
  print_date: string;
  file_name: string;
  print_type: string;
  image_url?: string | null;
  total_cost: number;
  total_filament_g: number;
  filaments: FilamentUsage[];
  layer_tracking?: LayerTracking | null;
}

export interface PrintListResponse {
  prints: Print[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

// Settings Types
export interface HaMqttSettings {
  enabled: boolean;
  connected: boolean;
  host: string;
  port: number;
  tls: boolean;
  discovery_prefix: string;
  base_topic: string;
}

export interface Settings {
  printer_id: string;
  printer_name?: string;
  base_url?: string;
  spoolman_url?: string;
  spoolman_api_url?: string;
  auto_spend: boolean;
  read_only_mode: boolean;
  external_spool_ams_id: number;
  external_spool_id: number;
  ha_mqtt?: HaMqttSettings;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
  };
}

// Real-time Event Types
export interface RealtimeEvent {
  type: "ams_update" | "printer_status" | "tray_change" | "connected" | "test";
  data: unknown;
  timestamp: number;
}
