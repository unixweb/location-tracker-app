"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";

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

interface DeviceInfo {
  id: string;
  name: string;
  color: string;
}

export default function MapPage() {
  const [selectedDevice, setSelectedDevice] = useState<string>("all");
  const [timeFilter, setTimeFilter] = useState<number>(1); // Default 1 hour
  const [isPaused, setIsPaused] = useState(false);
  const [devices, setDevices] = useState<DeviceInfo[]>([]);

  // Custom range state
  const [filterMode, setFilterMode] = useState<"quick" | "custom">("quick");
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");

  // Fetch user's devices from API
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const response = await fetch("/api/devices/public");
        if (response.ok) {
          const data = await response.json();
          setDevices(data.devices || []);
        } else {
          console.error("Failed to fetch devices:", response.status);
        }
      } catch (err) {
        console.error("Failed to fetch devices:", err);
      }
    };

    fetchDevices();
    // Refresh devices every 30 seconds
    const interval = setInterval(fetchDevices, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-screen flex flex-col">
      {/* Header with controls */}
      <div className="bg-white shadow-md p-3 sm:p-4">
        <div className="flex flex-col gap-3">
          {/* Top row: Title and Admin link */}
          <div className="flex items-center justify-between">
            <h1 className="text-lg sm:text-xl font-bold text-black">Location Tracker</h1>
            <a
              href="/admin"
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              Admin
            </a>
          </div>

          {/* Controls row - responsive grid */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-stretch sm:items-center">
            {/* Device Filter */}
            <div className="flex items-center gap-2">
              <label className="text-xs sm:text-sm font-medium text-black whitespace-nowrap">Device:</label>
              <select
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
                className="flex-1 sm:flex-none px-2 sm:px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All My Devices</option>
                {devices.map((device) => (
                  <option key={device.id} value={device.id}>
                    {device.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Time Filter */}
            <div className="flex items-center gap-2">
              <label className="text-xs sm:text-sm font-medium text-black whitespace-nowrap">Time:</label>
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(Number(e.target.value))}
                className="flex-1 sm:flex-none px-2 sm:px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TIME_FILTERS.map((filter) => (
                  <option key={filter.value} value={filter.value}>
                    {filter.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setFilterMode(filterMode === "quick" ? "custom" : "quick")}
                className="px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors whitespace-nowrap"
                title="Toggle Custom Range"
              >
                📅 {filterMode === "quick" ? "Custom" : "Quick"}
              </button>
            </div>

            {/* Pause/Resume Button */}
            <button
              onClick={() => setIsPaused(!isPaused)}
              className={`px-3 sm:px-4 py-1 text-sm rounded-md font-semibold transition-colors whitespace-nowrap ${
                isPaused
                  ? "bg-green-500 hover:bg-green-600 text-white"
                  : "bg-red-500 hover:bg-red-600 text-white"
              }`}
            >
              {isPaused ? "▶ Resume" : "⏸ Pause"}
            </button>
          </div>

          {/* Custom Range (only visible when active) */}
          {filterMode === "custom" && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 border border-blue-300 bg-blue-50 rounded-md p-2">
              <div className="flex items-center gap-1">
                <label className="text-xs font-medium text-black whitespace-nowrap">From:</label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="flex-1 sm:flex-none px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>
              <div className="flex items-center gap-1">
                <label className="text-xs font-medium text-black whitespace-nowrap">To:</label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="flex-1 sm:flex-none px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1">
        <MapView
          selectedDevice={selectedDevice}
          timeFilter={timeFilter}
          isPaused={isPaused}
          filterMode={filterMode}
          startTime={startTime}
          endTime={endTime}
        />
      </div>
    </div>
  );
}
