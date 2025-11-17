"use client";

import { useEffect, useState, useRef } from "react";
import { Location, LocationResponse } from "@/types/location";
import { getDevice, DEFAULT_DEVICE } from "@/lib/devices";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  LayersControl,
  useMap,
} from "react-leaflet";

interface MapViewProps {
  selectedDevice: string;
  timeFilter: number; // in hours, 0 = all
  isPaused: boolean;
}

interface DeviceInfo {
  id: string;
  name: string;
  color: string;
}

// Component to auto-center map to latest position and track zoom
function SetViewOnChange({
  center,
  zoom,
  onZoomChange
}: {
  center: [number, number] | null;
  zoom: number;
  onZoomChange: (zoom: number) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.setView(center, zoom, { animate: true });
    }
  }, [center, zoom, map]);

  useEffect(() => {
    const handleZoom = () => {
      onZoomChange(map.getZoom());
    };

    // Initial zoom
    onZoomChange(map.getZoom());

    // Listen to zoom changes
    map.on('zoomend', handleZoom);

    return () => {
      map.off('zoomend', handleZoom);
    };
  }, [map, onZoomChange]);

  return null;
}

export default function MapView({ selectedDevice, timeFilter, isPaused }: MapViewProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [devices, setDevices] = useState<Record<string, DeviceInfo>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [currentZoom, setCurrentZoom] = useState(12);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Add animation styles for latest marker
  useEffect(() => {
    // Inject CSS animation for marker pulse effect
    if (typeof document !== 'undefined') {
      const styleId = 'marker-animation-styles';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          @keyframes marker-pulse {
            0% {
              transform: scale(1);
              opacity: 1;
            }
            50% {
              transform: scale(1.15);
              opacity: 0.8;
            }
            100% {
              transform: scale(1);
              opacity: 1;
            }
          }

          .latest-marker {
            animation: marker-pulse 2s ease-in-out infinite;
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, []);

  // Fetch devices from API
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const response = await fetch("/api/devices/public");
        if (response.ok) {
          const data = await response.json();
          const devicesMap = data.devices.reduce((acc: Record<string, DeviceInfo>, dev: DeviceInfo) => {
            acc[dev.id] = dev;
            return acc;
          }, {});
          setDevices(devicesMap);
        }
      } catch (err) {
        console.error("Failed to fetch devices:", err);
        // Fallback to hardcoded devices if API fails
      }
    };

    fetchDevices();
    // Refresh devices every 30 seconds (in case of updates)
    const interval = setInterval(fetchDevices, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch locations
  useEffect(() => {
    const fetchLocations = async () => {
      if (isPaused) return; // Skip fetching when paused

      try {
        // Build query params
        const params = new URLSearchParams();
        if (selectedDevice !== "all") {
          params.set("username", selectedDevice);
        }
        if (timeFilter > 0) {
          params.set("timeRangeHours", timeFilter.toString());
        }
        params.set("limit", "5000"); // Fetch more data for better history

        // Fetch from local SQLite API (with auto-sync from n8n)
        const response = await fetch(`/api/locations?${params.toString()}`);
        if (!response.ok) throw new Error("Failed to fetch locations");

        const data: LocationResponse = await response.json();

        // Debug: Log last 3 locations to see speed/battery values
        if (data.history && data.history.length > 0) {
          console.log('[MapView Debug] Last 3 locations:', data.history.slice(0, 3).map(loc => ({
            username: loc.username,
            timestamp: loc.timestamp,
            speed: loc.speed,
            speed_type: typeof loc.speed,
            speed_is_null: loc.speed === null,
            speed_is_undefined: loc.speed === undefined,
            battery: loc.battery,
          })));

          // Auto-center to latest location
          const latest = data.history[0];
          if (latest && latest.latitude && latest.longitude) {
            setMapCenter([Number(latest.latitude), Number(latest.longitude)]);
          }
        }

        setLocations(data.history || []);
        setError(null);
      } catch (err) {
        setError("Failed to load locations");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchLocations();

    // Store interval reference for pause/resume control
    if (!isPaused) {
      intervalRef.current = setInterval(fetchLocations, 5000); // Refresh every 5s
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [selectedDevice, timeFilter, isPaused]);

  // No client-side filtering needed - API already filters by username and timeRangeHours
  // Filter out locations without username (should not happen, but TypeScript safety)
  const filteredLocations = locations.filter(loc => loc.username != null);

  // Group by device
  const deviceGroups = filteredLocations.reduce((acc, loc) => {
    const deviceId = loc.username!; // Safe to use ! here because we filtered null above
    if (!acc[deviceId]) acc[deviceId] = [];
    acc[deviceId].push(loc);
    return acc;
  }, {} as Record<string, Location[]>);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100">
        <p>Loading map...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-red-50">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <MapContainer
        center={[48.1351, 11.582]}
        zoom={12}
        style={{ height: "100%", width: "100%" }}
      >
        {/* Auto-center to latest position and track zoom */}
        <SetViewOnChange
          center={mapCenter}
          zoom={14}
          onZoomChange={setCurrentZoom}
        />

        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Standard">
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
          </LayersControl.BaseLayer>

          <LayersControl.BaseLayer name="Satellite">
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution="Esri"
            />
          </LayersControl.BaseLayer>

          <LayersControl.BaseLayer name="Dark">
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
            />
          </LayersControl.BaseLayer>
        </LayersControl>

        {Object.entries(deviceGroups).map(([deviceId, locs]) => {
          // Use device from API if available, fallback to hardcoded
          const device = devices[deviceId] || getDevice(deviceId);
          // Sort DESC (newest first) - same as API
          const sortedLocs = [...locs].sort(
            (a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );

          return (
            <div key={deviceId}>
              {/* Polyline for path - reverse for chronological drawing (oldest to newest) */}
              <Polyline
                positions={[...sortedLocs].reverse().map((loc) => [
                  Number(loc.latitude),
                  Number(loc.longitude),
                ])}
                color={device.color}
                weight={2}
                opacity={0.6}
              />

              {/* Markers - reverse for rendering (oldest first = back, newest last = front/top) */}
              {[...sortedLocs].reverse().map((loc, idx, arr) => {
                const isLatest = idx === arr.length - 1; // Last in reversed = newest (on top)

                // Debug: Log for latest location only
                if (isLatest) {
                  console.log('[Popup Debug] Latest location for', device.name, {
                    speed: loc.speed,
                    speed_type: typeof loc.speed,
                    speed_is_null: loc.speed === null,
                    speed_is_undefined: loc.speed === undefined,
                    condition_result: loc.speed != null,
                    display_time: loc.display_time
                  });
                }

                return (
                  <Marker
                    key={`${deviceId}-${loc.timestamp}-${idx}`}
                    position={[Number(loc.latitude), Number(loc.longitude)]}
                    icon={createCustomIcon(
                      device.color,
                      isLatest,
                      currentZoom
                    )}
                  >
                    <Popup>
                      <div className="text-sm space-y-1">
                        <p className="font-bold text-base flex items-center gap-2">
                          <span className="text-lg">📱</span>
                          {device.name}
                        </p>
                        <p className="flex items-center gap-1">
                          <span>🕒</span> {loc.display_time}
                        </p>
                        {loc.battery != null && Number(loc.battery) > 0 && (
                          <p className="flex items-center gap-1">
                            <span>🔋</span> Battery: {loc.battery}%
                          </p>
                        )}
                        {loc.speed != null && (
                          <p className="flex items-center gap-1">
                            <span>🚗</span> Speed: {Number(loc.speed).toFixed(1)} km/h
                          </p>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </div>
          );
        })}
      </MapContainer>
    </div>
  );
}

// Helper to create custom icon (similar to original)
function createCustomIcon(color: string, isLatest: boolean, zoom: number) {
  // Base size - much bigger than before
  const baseSize = isLatest ? 64 : 32;

  // Zoom-based scaling: smaller at zoom 10, larger at zoom 18+
  // zoom 10 = 0.6x, zoom 12 = 1.0x, zoom 15 = 1.45x, zoom 18 = 1.9x
  const zoomScale = 0.6 + ((zoom - 10) * 0.15);
  const clampedScale = Math.max(0.5, Math.min(2.5, zoomScale)); // Clamp between 0.5x and 2.5x

  const size = Math.round(baseSize * clampedScale);

  // Standard Location Pin Icon (wie Google Maps/Standard Marker)
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 24 36" xmlns="http://www.w3.org/2000/svg">
      <!-- Outer pin shape -->
      <path d="M12 0C5.4 0 0 5.4 0 12c0 7 12 24 12 24s12-17 12-24c0-6.6-5.4-12-12-12z"
            fill="${color}"
            stroke="white"
            stroke-width="1.5"/>
      <!-- Inner white circle -->
      <circle cx="12" cy="12" r="5" fill="white" opacity="0.9"/>
      <!-- Center dot -->
      <circle cx="12" cy="12" r="2.5" fill="${color}"/>
    </svg>
  `;

  return L.divIcon({
    html: svg,
    iconSize: [size, size * 1.5], // Height 1.5x width for pin shape
    iconAnchor: [size / 2, size * 1.5], // Bottom center point
    popupAnchor: [0, -size * 1.2], // Popup above the pin
    className: isLatest ? "custom-marker-icon latest-marker" : "custom-marker-icon",
  });
}
