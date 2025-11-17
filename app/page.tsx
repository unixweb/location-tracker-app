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
  const [isPaused, setIsPaused] = useState(false);

  // Custom range state
  const [filterMode, setFilterMode] = useState<"quick" | "custom">("quick");
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");

  return (
    <div className="h-screen flex flex-col">
      {/* Header with controls */}
      <div className="bg-white shadow-md p-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Location Tracker</h1>

        <div className="flex gap-4 items-center">
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
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Time:</label>
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
            <button
              onClick={() => setFilterMode(filterMode === "quick" ? "custom" : "quick")}
              className="px-3 py-1 text-sm font-medium bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              title="Toggle Custom Range"
            >
              📅 {filterMode === "quick" ? "Custom" : "Quick"}
            </button>
          </div>

          {/* Custom Range (only visible when active) */}
          {filterMode === "custom" && (
            <div className="flex items-center gap-2 border border-blue-300 bg-blue-50 rounded-md p-2">
              <div className="flex items-center gap-1">
                <label className="text-xs font-medium">From:</label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>
              <div className="flex items-center gap-1">
                <label className="text-xs font-medium">To:</label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>
            </div>
          )}

          {/* Pause/Resume Button */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`px-4 py-1 rounded-md font-semibold transition-colors ${
              isPaused
                ? "bg-green-500 hover:bg-green-600 text-white"
                : "bg-red-500 hover:bg-red-600 text-white"
            }`}
          >
            {isPaused ? "▶ Resume" : "⏸ Pause"}
          </button>

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
