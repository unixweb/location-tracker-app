export interface Location {
  id?: number;
  latitude: number | string; // NocoDB returns string
  longitude: number | string; // NocoDB returns string
  timestamp: string;
  user_id: number | string; // NocoDB returns string "0" for MQTT devices
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  marker_label: string | null;
  display_time: string | null;
  chat_id: number | string; // Also string in API response
  battery?: number | null;
  speed?: number | null;
  created_at?: string;
}

export interface LocationResponse {
  success: boolean;
  current: Location | null;
  history: Location[];
  total_points: number;
  last_updated: string;
}

export interface Device {
  id: string;
  name: string;
  color: string;
}
