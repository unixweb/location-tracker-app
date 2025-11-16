"use client";

import { useEffect, useState } from "react";

interface Device {
  id: string;
  name: string;
  color: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  owner?: {
    id: string;
    username: string;
  };
  latestLocation?: {
    latitude: string | number;
    longitude: string | number;
    timestamp: string;
    battery?: number;
    speed?: number;
  };
  _count?: {
    locations: number;
  };
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    color: "#3498db",
    description: "",
  });

  useEffect(() => {
    fetchDevices();

    // Auto-refresh every 10 seconds to update online/offline status
    const interval = setInterval(fetchDevices, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchDevices = async () => {
    try {
      const response = await fetch("/api/devices");
      if (!response.ok) throw new Error("Failed to fetch devices");
      const data = await response.json();
      setDevices(data.devices || []);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch devices", err);
      setError("Failed to load devices");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create device");
      }

      await fetchDevices();
      setShowAddModal(false);
      setFormData({ id: "", name: "", color: "#3498db", description: "" });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDevice) return;

    try {
      // If ID changed, we need to delete old and create new device
      if (formData.id !== selectedDevice.id) {
        // Delete old device
        const deleteResponse = await fetch(`/api/devices/${selectedDevice.id}`, {
          method: "DELETE",
        });
        if (!deleteResponse.ok) {
          throw new Error("Failed to delete old device");
        }

        // Create new device with new ID
        const createResponse = await fetch("/api/devices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (!createResponse.ok) {
          const error = await createResponse.json();
          throw new Error(error.error || "Failed to create device with new ID");
        }
      } else {
        // Just update existing device
        const response = await fetch(`/api/devices/${selectedDevice.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            color: formData.color,
            description: formData.description,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to update device");
        }
      }

      await fetchDevices();
      setShowEditModal(false);
      setSelectedDevice(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async () => {
    if (!selectedDevice) return;

    try {
      const response = await fetch(`/api/devices/${selectedDevice.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete device");
      }

      await fetchDevices();
      setShowDeleteModal(false);
      setSelectedDevice(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const openEditModal = (device: Device) => {
    setSelectedDevice(device);
    setFormData({
      id: device.id,
      name: device.name,
      color: device.color,
      description: device.description || "",
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (device: Device) => {
    setSelectedDevice(device);
    setShowDeleteModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading devices...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-900">Device Management</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
        >
          + Add Device
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Device Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {devices.map((device) => {
          const lastSeen = device.latestLocation
            ? new Date(device.latestLocation.timestamp)
            : null;
          const isRecent = lastSeen
            ? Date.now() - lastSeen.getTime() < 10 * 60 * 1000
            : false;

          return (
            <div
              key={device.id}
              className="bg-white rounded-lg shadow-md p-6 space-y-4 border-2"
              style={{ borderColor: device.isActive ? device.color : "#ccc" }}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-full border-2 border-white shadow-md flex items-center justify-center"
                    style={{ backgroundColor: device.color }}
                  >
                    <span className="text-white text-2xl">📱</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {device.name}
                    </h3>
                    <p className="text-sm text-gray-500">ID: {device.id}</p>
                  </div>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    isRecent
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {isRecent ? "Online" : "Offline"}
                </span>
              </div>

              {device.description && (
                <p className="text-sm text-gray-600">{device.description}</p>
              )}

              {device.latestLocation && (
                <div className="border-t border-gray-200 pt-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 flex items-center gap-2">
                      <span className="text-lg">🕒</span>
                      Last Seen:
                    </span>
                    <span className="font-medium text-gray-900">
                      {new Date(device.latestLocation.timestamp).toLocaleString()}
                    </span>
                  </div>

                  {device.latestLocation.battery !== undefined && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 flex items-center gap-2">
                        <span className="text-lg">🔋</span>
                        Battery:
                      </span>
                      <span className={`font-medium ${
                        device.latestLocation.battery > 20 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {device.latestLocation.battery}%
                      </span>
                    </div>
                  )}

                  {device.latestLocation.speed !== undefined && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 flex items-center gap-2">
                        <span className="text-lg">🚗</span>
                        Speed:
                      </span>
                      <span className="font-medium text-gray-900">
                        {(Number(device.latestLocation.speed) * 3.6).toFixed(1)} km/h
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 flex items-center gap-2">
                      <span className="text-lg">📍</span>
                      Location:
                    </span>
                    <span className="font-medium text-gray-900">
                      {Number(device.latestLocation.latitude).toFixed(5)},{" "}
                      {Number(device.latestLocation.longitude).toFixed(5)}
                    </span>
                  </div>
                </div>
              )}

              {device._count && (
                <div className="text-sm text-gray-600">
                  {device._count.locations} location points
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => openEditModal(device)}
                  className="flex-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 text-sm font-medium"
                >
                  Edit
                </button>
                <button
                  onClick={() => openDeleteModal(device)}
                  className="flex-1 px-3 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-sm font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {devices.length === 0 && (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          No devices found. Add a device to get started.
        </div>
      )}

      {/* Add Device Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4">
            <h3 className="text-xl font-bold text-gray-900">Add New Device</h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Device ID *
                </label>
                <input
                  type="text"
                  required
                  value={formData.id}
                  onChange={(e) =>
                    setFormData({ ...formData, id: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 12, 13"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Must match OwnTracks tracker ID (tid)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Device Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., iPhone 13"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                    className="h-10 w-20 rounded border border-gray-300"
                  />
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="#3498db"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Additional notes about this device"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setFormData({
                      id: "",
                      name: "",
                      color: "#3498db",
                      description: "",
                    });
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                >
                  Add Device
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Device Modal */}
      {showEditModal && selectedDevice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4">
            <h3 className="text-xl font-bold text-gray-900">
              Edit Device
            </h3>
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Device ID *
                </label>
                <input
                  type="text"
                  required
                  value={formData.id}
                  onChange={(e) =>
                    setFormData({ ...formData, id: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-amber-600 mt-1">
                  ⚠️ Changing ID will create a new device (location history stays with old ID)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Device Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                    className="h-10 w-20 rounded border border-gray-300"
                  />
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedDevice(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedDevice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4">
            <h3 className="text-xl font-bold text-gray-900">Delete Device</h3>
            <p className="text-gray-600">
              Are you sure you want to delete <strong>{selectedDevice.name}</strong>{" "}
              (ID: {selectedDevice.id})?
            </p>
            <p className="text-sm text-red-600">
              This will also delete all location history for this device. This action
              cannot be undone.
            </p>

            <div className="flex gap-2 pt-4">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedDevice(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium"
              >
                Delete Device
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
