export interface Location {
  latitude: number | string; // NocoDB returns string
  longitude: number | string; // NocoDB returns string
  timestamp: string;
  user_id: number | string; // NocoDB returns string "0" for MQTT devices
  first_name: string;
  last_name: string;
  username: string;
  marker_label: string;
  display_time: string;
  chat_id: number | string; // Also string in API response
  battery?: number;
  speed?: number;
}

export interface LocationResponse {
  success: boolean;
  current: Location;
  history: Location[];
  total_points: number;
  last_updated: string;
}

export interface Device {
  id: string;
  name: string;
  color: string;
}
