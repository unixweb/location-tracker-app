"use client";

import { useEffect, useState } from "react";
import { LocationResponse } from "@/types/location";

interface DeviceInfo {
  id: string;
  name: string;
  color: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalDevices: 0,
    totalPoints: 0,
    lastUpdated: "",
    onlineDevices: 0,
  });
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [cleanupStatus, setCleanupStatus] = useState<{
    loading: boolean;
    message: string;
    type: 'success' | 'error' | '';
  }>({
    loading: false,
    message: '',
    type: '',
  });
  const [syncStatus, setSyncStatus] = useState<{
    loading: boolean;
    message: string;
    type: 'success' | 'error' | '';
  }>({
    loading: false,
    message: '',
    type: '',
  });
  const [optimizeStatus, setOptimizeStatus] = useState<{
    loading: boolean;
    message: string;
    type: 'success' | 'error' | '';
  }>({
    loading: false,
    message: '',
    type: '',
  });
  const [dbStats, setDbStats] = useState<any>(null);

  // Fetch devices from API
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const response = await fetch("/api/devices/public");
        if (response.ok) {
          const data = await response.json();
          setDevices(data.devices);
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

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch from local API (reads from SQLite cache)
        const response = await fetch("/api/locations?sync=false"); // sync=false for faster response
        const data: LocationResponse = await response.json();

        const uniqueDevices = new Set(
          data.history
            .filter((loc) => loc.user_id == 0) // Loose equality (handles "0" or 0)
            .map((loc) => loc.username)
        );

        setStats({
          totalDevices: devices.length,
          totalPoints: data.total_points || data.history.length,
          lastUpdated: data.last_updated || new Date().toISOString(),
          onlineDevices: uniqueDevices.size,
        });
      } catch (err) {
        console.error("Failed to fetch stats", err);
      }
    };

    if (devices.length > 0) {
      fetchStats();
      const interval = setInterval(fetchStats, 10000);
      return () => clearInterval(interval);
    }
  }, [devices]);

  // Fetch detailed database statistics
  useEffect(() => {
    const fetchDbStats = async () => {
      try {
        const response = await fetch('/api/locations/stats');
        if (response.ok) {
          const data = await response.json();
          setDbStats(data);
        }
      } catch (err) {
        console.error('Failed to fetch DB stats:', err);
      }
    };

    fetchDbStats();
    // Refresh DB stats every 30 seconds
    const interval = setInterval(fetchDbStats, 30000);
    return () => clearInterval(interval);
  }, []);

  // Cleanup old locations
  const handleCleanup = async (retentionHours: number) => {
    if (!confirm(`Delete all locations older than ${Math.round(retentionHours / 24)} days?`)) {
      return;
    }

    setCleanupStatus({ loading: true, message: '', type: '' });

    try {
      const response = await fetch('/api/locations/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ retentionHours }),
      });

      const data = await response.json();

      if (response.ok) {
        setCleanupStatus({
          loading: false,
          message: `✓ Deleted ${data.deleted} records. Freed ${data.freedKB} KB.`,
          type: 'success',
        });
        // Refresh stats
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setCleanupStatus({
          loading: false,
          message: `Error: ${data.error}`,
          type: 'error',
        });
      }
    } catch (error) {
      setCleanupStatus({
        loading: false,
        message: 'Failed to cleanup locations',
        type: 'error',
      });
    }

    // Clear message after 5 seconds
    setTimeout(() => {
      setCleanupStatus({ loading: false, message: '', type: '' });
    }, 5000);
  };

  // Sync locations from n8n
  const handleSync = async () => {
    setSyncStatus({ loading: true, message: '', type: '' });

    try {
      const response = await fetch('/api/locations/sync', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        if (data.synced > 0) {
          setSyncStatus({
            loading: false,
            message: `✓ Synced ${data.synced} new locations from n8n. Total: ${data.after.total}`,
            type: 'success',
          });
          // Refresh stats
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } else {
          setSyncStatus({
            loading: false,
            message: `✓ Already up to date. No new locations found.`,
            type: 'success',
          });
        }
      } else {
        setSyncStatus({
          loading: false,
          message: `Error: ${data.error}`,
          type: 'error',
        });
      }
    } catch (error) {
      setSyncStatus({
        loading: false,
        message: 'Failed to sync locations. Is n8n reachable?',
        type: 'error',
      });
    }

    // Clear message after 5 seconds
    setTimeout(() => {
      setSyncStatus({ loading: false, message: '', type: '' });
    }, 5000);
  };

  // Optimize database
  const handleOptimize = async () => {
    if (!confirm('Optimize database? This may take a few seconds.')) {
      return;
    }

    setOptimizeStatus({ loading: true, message: '', type: '' });

    try {
      const response = await fetch('/api/locations/optimize', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        setOptimizeStatus({
          loading: false,
          message: `✓ Database optimized. Freed ${data.freedMB} MB. (${data.before.sizeMB} → ${data.after.sizeMB} MB)`,
          type: 'success',
        });
        // Refresh stats
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setOptimizeStatus({
          loading: false,
          message: `Error: ${data.error}`,
          type: 'error',
        });
      }
    } catch (error) {
      setOptimizeStatus({
        loading: false,
        message: 'Failed to optimize database',
        type: 'error',
      });
    }

    // Clear message after 5 seconds
    setTimeout(() => {
      setOptimizeStatus({ loading: false, message: '', type: '' });
    }, 5000);
  };

  const statCards = [
    {
      title: "Total Devices",
      value: stats.totalDevices,
      icon: "📱",
    },
    {
      title: "Online Devices",
      value: stats.onlineDevices,
      icon: "🟢",
    },
    {
      title: "Total Locations",
      value: stats.totalPoints,
      icon: "📍",
    },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((stat) => (
          <div
            key={stat.title}
            className="bg-white rounded-lg shadow p-6 flex items-center gap-4"
          >
            <div className="text-4xl">{stat.icon}</div>
            <div>
              <p className="text-sm font-medium text-gray-600">{stat.title}</p>
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Database Statistics */}
      {dbStats && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Database Statistics
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded">
                <p className="text-sm text-gray-600">Database Size</p>
                <p className="text-2xl font-bold text-gray-900">{dbStats.sizeMB} MB</p>
                <p className="text-xs text-gray-500 mt-1">WAL Mode: {dbStats.walMode}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded">
                <p className="text-sm text-gray-600">Time Range</p>
                <p className="text-sm font-semibold text-gray-900">
                  {dbStats.oldest ? new Date(dbStats.oldest).toLocaleDateString() : 'N/A'}
                </p>
                <p className="text-xs text-gray-500">to</p>
                <p className="text-sm font-semibold text-gray-900">
                  {dbStats.newest ? new Date(dbStats.newest).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded">
                <p className="text-sm text-gray-600">Average Per Day</p>
                <p className="text-2xl font-bold text-gray-900">{dbStats.avgPerDay}</p>
                <p className="text-xs text-gray-500 mt-1">locations (last 7 days)</p>
              </div>
            </div>

            {/* Locations per Device */}
            {dbStats.perDevice && dbStats.perDevice.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Locations per Device</h4>
                <div className="space-y-2">
                  {dbStats.perDevice.map((device: any) => (
                    <div key={device.username} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                      <span className="text-sm font-medium text-gray-700">Device {device.username}</span>
                      <span className="text-sm text-gray-900">{device.count.toLocaleString()} locations</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Device List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Configured Devices
          </h3>
        </div>
        <div className="p-6">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                  ID
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                  Name
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                  Color
                </th>
              </tr>
            </thead>
            <tbody>
              {devices.map((device) => (
                <tr
                  key={device.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="py-3 px-4 text-sm text-gray-900">
                    {device.id}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-900">
                    {device.name}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full border border-gray-300"
                        style={{ backgroundColor: device.color }}
                      />
                      <span className="text-sm text-gray-600">
                        {device.color}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Database Maintenance */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Database Maintenance
          </h3>
        </div>
        <div className="p-6 space-y-6">
          {/* Sync Section */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              Sync from n8n
            </h4>
            <p className="text-sm text-gray-600 mb-3">
              Manually fetch new location data from n8n webhook and update local cache.
            </p>

            {/* Sync Status Message */}
            {syncStatus.message && (
              <div
                className={`mb-3 p-3 rounded ${
                  syncStatus.type === 'success'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {syncStatus.message}
              </div>
            )}

            <button
              onClick={handleSync}
              disabled={syncStatus.loading}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span>{syncStatus.loading ? '🔄' : '🔄'}</span>
              {syncStatus.loading ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>

          {/* Cleanup Section */}
          <div className="border-t pt-6">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              Clean up old data
            </h4>
            <p className="text-sm text-gray-600 mb-3">
              Delete old location data to keep the database size manageable.
            </p>

            {/* Cleanup Status Message */}
            {cleanupStatus.message && (
              <div
                className={`mb-3 p-3 rounded ${
                  cleanupStatus.type === 'success'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {cleanupStatus.message}
              </div>
            )}

            {/* Cleanup Buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => handleCleanup(168)}
                disabled={cleanupStatus.loading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {cleanupStatus.loading ? 'Cleaning...' : 'Delete > 7 days'}
              </button>
              <button
                onClick={() => handleCleanup(360)}
                disabled={cleanupStatus.loading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {cleanupStatus.loading ? 'Cleaning...' : 'Delete > 15 days'}
              </button>
              <button
                onClick={() => handleCleanup(720)}
                disabled={cleanupStatus.loading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {cleanupStatus.loading ? 'Cleaning...' : 'Delete > 30 days'}
              </button>
              <button
                onClick={() => handleCleanup(2160)}
                disabled={cleanupStatus.loading}
                className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {cleanupStatus.loading ? 'Cleaning...' : 'Delete > 90 days'}
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-4">
              Current database size: {stats.totalPoints} locations
            </p>
          </div>

          {/* Optimize Section */}
          <div className="border-t pt-6">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              Optimize Database
            </h4>
            <p className="text-sm text-gray-600 mb-3">
              Run VACUUM and ANALYZE to reclaim disk space and improve query performance. Recommended after cleanup.
            </p>

            {/* Optimize Status Message */}
            {optimizeStatus.message && (
              <div
                className={`mb-3 p-3 rounded ${
                  optimizeStatus.type === 'success'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {optimizeStatus.message}
              </div>
            )}

            <button
              onClick={handleOptimize}
              disabled={optimizeStatus.loading}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span>{optimizeStatus.loading ? '⚙️' : '⚡'}</span>
              {optimizeStatus.loading ? 'Optimizing...' : 'Optimize Now'}
            </button>
          </div>
        </div>
      </div>

      {/* Last Updated */}
      <div className="text-sm text-gray-500 text-right">
        Last updated: {new Date(stats.lastUpdated).toLocaleString()}
      </div>
    </div>
  );
}
