"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

interface Device {
  id: string;
  name: string;
  isActive: boolean;
}

interface MqttCredential {
  id: number;
  device_id: string;
  mqtt_username: string;
  mqtt_password_hash: string;
  enabled: number;
  created_at: string;
  updated_at: string;
  device_name: string;
  mqtt_password?: string; // Nur bei Erstellung/Regenerierung vorhanden
}

interface AclRule {
  id: number;
  device_id: string;
  topic_pattern: string;
  permission: 'read' | 'write' | 'readwrite';
  created_at: string;
}

interface SyncStatus {
  pending_changes: number;
  last_sync_at: string | null;
  last_sync_status: string;
}

export default function MqttPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role;
  const isAdmin = userRole === 'ADMIN';

  const [devices, setDevices] = useState<Device[]>([]);
  const [credentials, setCredentials] = useState<MqttCredential[]>([]);
  const [aclRules, setAclRules] = useState<Record<string, AclRule[]>>({});
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showAclModal, setShowAclModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [generatedPassword, setGeneratedPassword] = useState<string>("");

  // Form States
  const [addFormData, setAddFormData] = useState({
    device_id: "",
    auto_generate: true,
  });

  const [aclFormData, setAclFormData] = useState({
    device_id: "",
    topic_pattern: "",
    permission: "readwrite" as 'read' | 'write' | 'readwrite',
  });

  useEffect(() => {
    if (isAdmin) {
      fetchAll();
    }
  }, [isAdmin]);

  const fetchAll = async () => {
    try {
      await Promise.all([
        fetchDevices(),
        fetchCredentials(),
        fetchSyncStatus(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDevices = async () => {
    try {
      const response = await fetch("/api/devices");
      if (!response.ok) throw new Error("Failed to fetch devices");
      const data = await response.json();
      setDevices(data.devices || []);
    } catch (err) {
      console.error("Failed to fetch devices", err);
    }
  };

  const fetchCredentials = async () => {
    try {
      const response = await fetch("/api/mqtt/credentials");
      if (!response.ok) throw new Error("Failed to fetch credentials");
      const data = await response.json();
      setCredentials(data);

      // Lade ACL Regeln für alle Devices mit Credentials
      for (const cred of data) {
        await fetchAclRules(cred.device_id);
      }
    } catch (err) {
      console.error("Failed to fetch credentials", err);
    }
  };

  const fetchAclRules = async (deviceId: string) => {
    try {
      const response = await fetch(`/api/mqtt/acl?device_id=${deviceId}`);
      if (!response.ok) throw new Error("Failed to fetch ACL rules");
      const rules = await response.json();
      setAclRules(prev => ({ ...prev, [deviceId]: rules }));
    } catch (err) {
      console.error("Failed to fetch ACL rules", err);
    }
  };

  const fetchSyncStatus = async () => {
    try {
      const response = await fetch("/api/mqtt/sync");
      if (!response.ok) throw new Error("Failed to fetch sync status");
      const status = await response.json();
      setSyncStatus(status);
    } catch (err) {
      console.error("Failed to fetch sync status", err);
    }
  };

  const handleAddCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/mqtt/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addFormData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create credentials");
      }

      const newCred = await response.json();

      // Zeige generiertes Passwort an
      if (newCred.mqtt_password) {
        setGeneratedPassword(`Username: ${newCred.mqtt_username}\nPassword: ${newCred.mqtt_password}`);
        setSelectedDevice(addFormData.device_id);
        setShowPasswordModal(true);
      }

      await fetchCredentials();
      await fetchSyncStatus();
      setShowAddModal(false);
      setAddFormData({ device_id: "", auto_generate: true });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteCredentials = async (deviceId: string) => {
    if (!confirm("MQTT Credentials für dieses Device löschen?")) return;

    try {
      const response = await fetch(`/api/mqtt/credentials/${deviceId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete credentials");

      await fetchCredentials();
      await fetchSyncStatus();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRegeneratePassword = async (deviceId: string) => {
    if (!confirm("Passwort neu generieren? Das alte Passwort wird ungültig.")) return;

    try {
      const response = await fetch(`/api/mqtt/credentials/${deviceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerate_password: true }),
      });

      if (!response.ok) throw new Error("Failed to regenerate password");

      const updated = await response.json();
      if (updated.mqtt_password) {
        setGeneratedPassword(`Username: ${updated.mqtt_username}\nPassword: ${updated.mqtt_password}`);
        setSelectedDevice(deviceId);
        setShowPasswordModal(true);
      }

      await fetchCredentials();
      await fetchSyncStatus();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleEnabled = async (deviceId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/mqtt/credentials/${deviceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });

      if (!response.ok) throw new Error("Failed to update credentials");

      await fetchCredentials();
      await fetchSyncStatus();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddAclRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/mqtt/acl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(aclFormData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create ACL rule");
      }

      await fetchAclRules(aclFormData.device_id);
      await fetchSyncStatus();
      setShowAclModal(false);
      setAclFormData({ device_id: "", topic_pattern: "", permission: "readwrite" });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteAclRule = async (ruleId: number, deviceId: string) => {
    if (!confirm("ACL Regel löschen?")) return;

    try {
      const response = await fetch(`/api/mqtt/acl/${ruleId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete ACL rule");

      await fetchAclRules(deviceId);
      await fetchSyncStatus();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await fetch("/api/mqtt/sync", {
        method: "POST",
      });

      const result = await response.json();

      if (result.success) {
        alert(result.message);
      } else {
        alert(`Sync fehlgeschlagen: ${result.message}`);
      }

      await fetchSyncStatus();
    } catch (err: any) {
      alert("Sync fehlgeschlagen: " + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleSendCredentialsEmail = async () => {
    if (!selectedDevice) return;

    // Parse username and password from generatedPassword string
    const lines = generatedPassword.split('\n');
    const usernameLine = lines.find(l => l.startsWith('Username:'));
    const passwordLine = lines.find(l => l.startsWith('Password:'));

    if (!usernameLine || !passwordLine) {
      alert('Fehler beim Extrahieren der Credentials');
      return;
    }

    const mqttUsername = usernameLine.replace('Username:', '').trim();
    const mqttPassword = passwordLine.replace('Password:', '').trim();

    try {
      const response = await fetch('/api/mqtt/send-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: selectedDevice,
          mqttUsername,
          mqttPassword,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send email');
      }

      const result = await response.json();
      alert(result.message);
    } catch (err: any) {
      alert('Email senden fehlgeschlagen: ' + err.message);
    }
  };

  if (!isAdmin) {
    return <div className="p-8">Keine Berechtigung</div>;
  }

  if (loading) {
    return <div className="p-8">Lade...</div>;
  }

  const devicesWithoutCredentials = devices.filter(
    d => d.isActive && !credentials.find(c => c.device_id === d.id)
  );

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">MQTT Provisioning</h1>
        <div className="flex gap-4 items-center">
          {syncStatus && syncStatus.pending_changes > 0 && (
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-md text-sm">
              {syncStatus.pending_changes} ausstehende Änderungen
            </span>
          )}
          <button
            onClick={handleSync}
            disabled={syncing || !syncStatus || syncStatus.pending_changes === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncing ? "Synchronisiere..." : "MQTT Sync"}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Device Provisionieren
          </button>
        </div>
      </div>

      {syncStatus && (
        <div className="mb-6 p-4 bg-gray-100 rounded-md">
          <h3 className="font-semibold mb-2">Sync Status</h3>
          <div className="text-sm">
            <p>Status: <span className={syncStatus.last_sync_status === 'success' ? 'text-green-600' : 'text-red-600'}>{syncStatus.last_sync_status}</span></p>
            {syncStatus.last_sync_at && (
              <p>Letzter Sync: {new Date(syncStatus.last_sync_at).toLocaleString('de-DE')}</p>
            )}
          </div>
        </div>
      )}

      <div className="space-y-6">
        {credentials.map(cred => {
          const deviceRules = aclRules[cred.device_id] || [];

          return (
            <div key={cred.id} className="border rounded-lg p-6 bg-white shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold">{cred.device_name}</h3>
                  <p className="text-sm text-gray-500">Device ID: {cred.device_id}</p>
                  <p className="text-sm text-gray-600 mt-1">Username: <code className="bg-gray-100 px-2 py-1 rounded">{cred.mqtt_username}</code></p>
                  <p className="text-xs text-gray-500 mt-1">Erstellt: {new Date(cred.created_at).toLocaleString('de-DE')}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggleEnabled(cred.device_id, !cred.enabled)}
                    className={`px-3 py-1 rounded text-sm ${cred.enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                  >
                    {cred.enabled ? 'Aktiviert' : 'Deaktiviert'}
                  </button>
                  <button
                    onClick={() => handleRegeneratePassword(cred.device_id)}
                    className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded text-sm hover:bg-yellow-200"
                  >
                    Passwort Reset
                  </button>
                  <button
                    onClick={() => {
                      setAclFormData({
                        device_id: cred.device_id,
                        topic_pattern: `owntracks/owntrack/${cred.device_id}`,
                        permission: "readwrite"
                      });
                      setShowAclModal(true);
                    }}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm hover:bg-blue-200"
                  >
                    ACL Hinzufügen
                  </button>
                  <button
                    onClick={() => handleDeleteCredentials(cred.device_id)}
                    className="px-3 py-1 bg-red-100 text-red-800 rounded text-sm hover:bg-red-200"
                  >
                    Löschen
                  </button>
                </div>
              </div>

              <div className="mt-4">
                <h4 className="font-semibold mb-2 text-sm">ACL Regeln:</h4>
                {deviceRules.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left">Topic Pattern</th>
                        <th className="px-4 py-2 text-left">Berechtigung</th>
                        <th className="px-4 py-2 text-left">Erstellt</th>
                        <th className="px-4 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {deviceRules.map(rule => (
                        <tr key={rule.id} className="border-t">
                          <td className="px-4 py-2"><code className="bg-gray-100 px-2 py-1 rounded">{rule.topic_pattern}</code></td>
                          <td className="px-4 py-2"><span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">{rule.permission}</span></td>
                          <td className="px-4 py-2 text-gray-500">{new Date(rule.created_at).toLocaleString('de-DE')}</td>
                          <td className="px-4 py-2">
                            <button
                              onClick={() => handleDeleteAclRule(rule.id, cred.device_id)}
                              className="text-red-600 hover:text-red-800 text-xs"
                            >
                              Löschen
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-sm text-gray-500">Keine ACL Regeln definiert</p>
                )}
              </div>
            </div>
          );
        })}

        {credentials.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Noch keine Devices provisioniert
          </div>
        )}
      </div>

      {/* Add Credentials Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Device Provisionieren</h2>
            <form onSubmit={handleAddCredentials}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Device</label>
                <select
                  value={addFormData.device_id}
                  onChange={(e) => setAddFormData({ ...addFormData, device_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                >
                  <option value="">Device auswählen</option>
                  {devicesWithoutCredentials.map(d => (
                    <option key={d.id} value={d.id}>{d.name} (ID: {d.id})</option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={addFormData.auto_generate}
                    onChange={(e) => setAddFormData({ ...addFormData, auto_generate: e.target.checked })}
                  />
                  <span className="text-sm">Automatisch Username & Passwort generieren</span>
                </label>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  Erstellen
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400"
                >
                  Abbrechen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Display Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">MQTT Credentials</h2>
            <div className="mb-4 p-4 bg-gray-100 rounded-md">
              <pre className="text-sm whitespace-pre-wrap">{generatedPassword}</pre>
            </div>
            <p className="text-sm text-red-600 mb-4">
              ⚠️ Speichere diese Credentials! Das Passwort kann nicht nochmal angezeigt werden.
            </p>
            <button
              onClick={async () => {
                try {
                  // Moderne Clipboard API (bevorzugt)
                  if (navigator.clipboard && window.isSecureContext) {
                    await navigator.clipboard.writeText(generatedPassword);
                    alert("✓ In Zwischenablage kopiert!");
                  } else {
                    // Fallback für ältere Browser oder HTTP-Kontext
                    const textArea = document.createElement("textarea");
                    textArea.value = generatedPassword;
                    textArea.style.position = "fixed";
                    textArea.style.left = "-999999px";
                    textArea.style.top = "-999999px";
                    document.body.appendChild(textArea);
                    textArea.focus();
                    textArea.select();

                    try {
                      const successful = document.execCommand('copy');
                      if (successful) {
                        alert("✓ In Zwischenablage kopiert!");
                      } else {
                        throw new Error("Copy failed");
                      }
                    } finally {
                      document.body.removeChild(textArea);
                    }
                  }
                } catch (err) {
                  console.error("Clipboard error:", err);
                  alert("❌ Kopieren fehlgeschlagen. Bitte manuell kopieren:\n\n" + generatedPassword);
                }
              }}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 mb-2"
            >
              📋 In Zwischenablage kopieren
            </button>
            <button
              onClick={handleSendCredentialsEmail}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 mb-2"
            >
              Per Email senden
            </button>
            <button
              onClick={() => {
                setShowPasswordModal(false);
                setSelectedDevice(null);
              }}
              className="w-full px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400"
            >
              Schließen
            </button>
          </div>
        </div>
      )}

      {/* Add ACL Rule Modal */}
      {showAclModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">ACL Regel Hinzufügen</h2>
            <form onSubmit={handleAddAclRule}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Topic Pattern</label>
                <input
                  type="text"
                  value={aclFormData.topic_pattern}
                  onChange={(e) => setAclFormData({ ...aclFormData, topic_pattern: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder={`owntracks/owntrack/${aclFormData.device_id || '<DeviceID>'}`}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Format: owntracks/owntrack/&lt;DeviceID&gt; (z.B. owntracks/owntrack/10)
                </p>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Berechtigung</label>
                <select
                  value={aclFormData.permission}
                  onChange={(e) => setAclFormData({ ...aclFormData, permission: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="read">Read (Lesen)</option>
                  <option value="write">Write (Schreiben)</option>
                  <option value="readwrite">Read/Write (Lesen & Schreiben)</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  Hinzufügen
                </button>
                <button
                  type="button"
                  onClick={() => setShowAclModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400"
                >
                  Abbrechen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
