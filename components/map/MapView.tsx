"use client";

import { useEffect, useState } from "react";
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
} from "react-leaflet";

interface MapViewProps {
  selectedDevice: string;
  timeFilter: number; // in hours, 0 = all
}

interface DeviceInfo {
  id: string;
  name: string;
  color: string;
}

export default function MapView({ selectedDevice, timeFilter }: MapViewProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [devices, setDevices] = useState<Record<string, DeviceInfo>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      try {
        // Fetch directly from n8n (client-side) instead of Next.js API route
        const response = await fetch("https://n8n.unixweb.home64.de/webhook/location");
        if (!response.ok) throw new Error("Failed to fetch locations");

        const data: LocationResponse = await response.json();
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
    const interval = setInterval(fetchLocations, 5000); // Refresh every 5s

    return () => clearInterval(interval);
  }, []);

  // Filter locations
  const filteredLocations = locations.filter((loc) => {
    // Filter MQTT-only devices (user_id == 0, can be string or number)
    if (loc.user_id != 0) return false;

    // Filter by selected device
    if (selectedDevice !== "all" && loc.username !== selectedDevice) {
      return false;
    }

    // Filter by time
    if (timeFilter > 0) {
      const locTime = new Date(loc.timestamp).getTime();
      const cutoff = Date.now() - timeFilter * 60 * 60 * 1000;
      if (locTime < cutoff) return false;
    }

    return true;
  });

  // Group by device
  const deviceGroups = filteredLocations.reduce((acc, loc) => {
    const deviceId = loc.username;
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
          const sortedLocs = [...locs].sort(
            (a, b) =>
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );

          return (
            <div key={deviceId}>
              {/* Polyline for path */}
              <Polyline
                positions={sortedLocs.map((loc) => [
                  Number(loc.latitude),
                  Number(loc.longitude),
                ])}
                color={device.color}
                weight={2}
                opacity={0.6}
              />

              {/* Markers */}
              {sortedLocs.map((loc, idx) => (
                <Marker
                  key={`${deviceId}-${idx}`}
                  position={[Number(loc.latitude), Number(loc.longitude)]}
                  icon={createCustomIcon(
                    device.color,
                    idx === sortedLocs.length - 1
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
                      {loc.battery !== undefined && (
                        <p className="flex items-center gap-1">
                          <span>🔋</span> Battery: {loc.battery}%
                        </p>
                      )}
                      {loc.speed !== undefined && (
                        <p className="flex items-center gap-1">
                          <span>🚗</span> Speed: {(loc.speed * 3.6).toFixed(1)} km/h
                        </p>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </div>
          );
        })}
      </MapContainer>
    </div>
  );
}

// Helper to create custom icon (similar to original)
function createCustomIcon(color: string, isLatest: boolean) {
  const size = isLatest ? 32 : 16;

  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="14" fill="${color}" stroke="white" stroke-width="2"/>
      <line x1="16" y1="16" x2="16" y2="6" stroke="white" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `;

  return L.divIcon({
    html: svg,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    className: "custom-marker-icon",
  });
}
