"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { DEVICES } from "@/lib/devices";

const MapView = dynamic(() => import("@/components/map/MapView"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center">
      Loading map...
    </div>
  ),
});

const TIME_FILTERS = [
  { label: "1 Hour", value: 1 },
  { label: "3 Hours", value: 3 },
  { label: "6 Hours", value: 6 },
  { label: "12 Hours", value: 12 },
  { label: "24 Hours", value: 24 },
  { label: "All", value: 0 },
];

export default function Home() {
  const [selectedDevice, setSelectedDevice] = useState<string>("all");
  const [timeFilter, setTimeFilter] = useState<number>(1); // Default 1 hour

  return (
    <div className="h-screen flex flex-col">
      {/* Header with controls */}
      <div className="bg-white shadow-md p-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Location Tracker</h1>

        <div className="flex gap-4">
          {/* Device Filter */}
          <div>
            <label className="text-sm font-medium mr-2">Device:</label>
            <select
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Devices</option>
              {Object.values(DEVICES).map((device) => (
                <option key={device.id} value={device.id}>
                  {device.name}
                </option>
              ))}
            </select>
          </div>

          {/* Time Filter */}
          <div>
            <label className="text-sm font-medium mr-2">Time:</label>
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(Number(e.target.value))}
              className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {TIME_FILTERS.map((filter) => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
          </div>

          {/* Admin Link */}
          <a
            href="/admin"
            className="px-4 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Admin Panel
          </a>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1">
        <MapView selectedDevice={selectedDevice} timeFilter={timeFilter} />
      </div>
    </div>
  );
}
