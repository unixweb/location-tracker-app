"use client";

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { DEMO_DEVICES, DEMO_MAP_CENTER, DEMO_MAP_ZOOM, DemoDevice } from '@/lib/demo-data';

// Dynamically import Leaflet components (client-side only)
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);
const Polyline = dynamic(
  () => import('react-leaflet').then((mod) => mod.Polyline),
  { ssr: false }
);

export default function DemoMap() {
  const [devicePositions, setDevicePositions] = useState<Map<string, number>>(new Map());
  const [isClient, setIsClient] = useState(false);
  const iconCache = useRef<Map<string, any>>(new Map());

  // Initialize on client side
  useEffect(() => {
    setIsClient(true);
    // Initialize all devices at position 0
    const initialPositions = new Map();
    DEMO_DEVICES.forEach(device => {
      initialPositions.set(device.id, 0);
    });
    setDevicePositions(initialPositions);
  }, []);

  // Animate device movements
  useEffect(() => {
    if (!isClient) return;

    const interval = setInterval(() => {
      setDevicePositions(prev => {
        const next = new Map(prev);
        DEMO_DEVICES.forEach(device => {
          const currentPos = next.get(device.id) || 0;
          const nextPos = (currentPos + 1) % device.route.length;
          next.set(device.id, nextPos);
        });
        return next;
      });
    }, 3000); // Move every 3 seconds

    return () => clearInterval(interval);
  }, [isClient]);

  // Create custom marker icons
  const getDeviceIcon = (color: string) => {
    if (typeof window === 'undefined') return null;

    if (iconCache.current.has(color)) {
      return iconCache.current.get(color);
    }

    const L = require('leaflet');
    const icon = L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          background-color: ${color};
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        "></div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    iconCache.current.set(color, icon);
    return icon;
  };

  if (!isClient) {
    return (
      <div className="w-full h-full bg-gray-200 rounded-lg flex items-center justify-center">
        <p className="text-gray-600">Loading demo map...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full rounded-lg overflow-hidden shadow-lg">
      <MapContainer
        center={DEMO_MAP_CENTER}
        zoom={DEMO_MAP_ZOOM}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {DEMO_DEVICES.map(device => {
          const currentPosIdx = devicePositions.get(device.id) || 0;
          const currentPos = device.route[currentPosIdx];
          const pathSoFar = device.route.slice(0, currentPosIdx + 1);

          return (
            <div key={device.id}>
              {/* Movement trail */}
              {pathSoFar.length > 1 && (
                <Polyline
                  positions={pathSoFar.map(loc => [loc.lat, loc.lng])}
                  color={device.color}
                  weight={3}
                  opacity={0.6}
                />
              )}

              {/* Current position marker */}
              <Marker
                position={[currentPos.lat, currentPos.lng]}
                icon={getDeviceIcon(device.color)}
              >
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold">{device.name}</p>
                    <p className="text-xs text-gray-600">
                      Position: {currentPosIdx + 1}/{device.route.length}
                    </p>
                    <p className="text-xs text-gray-600">
                      Lat: {currentPos.lat.toFixed(4)}
                    </p>
                    <p className="text-xs text-gray-600">
                      Lng: {currentPos.lng.toFixed(4)}
                    </p>
                  </div>
                </Popup>
              </Marker>
            </div>
          );
        })}
      </MapContainer>
    </div>
  );
}
