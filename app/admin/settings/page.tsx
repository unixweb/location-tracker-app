"use client";

import { useEffect, useState } from "react";
import { SMTPConfig, SMTPConfigResponse } from "@/lib/types/smtp";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'smtp'>('smtp');
  const [config, setConfig] = useState<SMTPConfig>({
    host: '',
    port: 587,
    secure: false,
    auth: { user: '', pass: '' },
    from: { email: '', name: 'Location Tracker' },
    replyTo: '',
    timeout: 10000,
  });
  const [source, setSource] = useState<'database' | 'env'>('env');
  const [hasPassword, setHasPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [showTestModal, setShowTestModal] = useState(false);

  // Fetch current config
  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/admin/settings/smtp');
      if (!response.ok) throw new Error('Failed to fetch config');

      const data: SMTPConfigResponse = await response.json();

      if (data.config) {
        setConfig(data.config);
        setHasPassword(data.config.auth.pass === '***');
      }
      setSource(data.source);
    } catch (error) {
      console.error('Failed to fetch SMTP config:', error);
      setMessage({ type: 'error', text: 'Failed to load SMTP configuration' });
    } finally {
      setLoading(false);
    }
  };

  // Save config
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/settings/smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save');
      }

      setMessage({ type: 'success', text: 'SMTP settings saved successfully' });
      setHasPassword(true);
      setSource('database');

      // Clear password field for security
      setConfig({ ...config, auth: { ...config.auth, pass: '' } });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  // Reset to defaults
  const handleReset = async () => {
    if (!confirm('Reset to environment defaults? This will delete database configuration.')) {
      return;
    }

    try {
      const response = await fetch('/api/admin/settings/smtp', {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to reset');

      setMessage({ type: 'success', text: 'Reset to environment defaults' });
      await fetchConfig();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to reset settings' });
    }
  };

  // Test connection
  const handleTest = async () => {
    if (!testEmail) {
      alert('Please enter a test email address');
      return;
    }

    setTesting(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/settings/smtp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: hasPassword ? undefined : config,
          testEmail,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Test failed');
      }

      setMessage({ type: 'success', text: data.message });
      setShowTestModal(false);
      setTestEmail('');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Connection test failed' });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-600">Loading settings...</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-900 mb-6">Settings</h2>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('smtp')}
            className={`px-4 py-2 border-b-2 font-medium ${
              activeTab === 'smtp'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            SMTP Settings
          </button>
        </nav>
      </div>

      {/* Status Message */}
      {message && (
        <div
          className={`mb-6 p-4 rounded ${
            message.type === 'success'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Config Source Info */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
        <p className="text-sm text-blue-900">
          <strong>Current source:</strong> {source === 'database' ? 'Database (Custom)' : 'Environment (.env)'}
        </p>
      </div>

      {/* SMTP Form */}
      <form onSubmit={handleSave} className="bg-white rounded-lg shadow p-6">
        <div className="space-y-4">
          {/* Host */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SMTP Host *
            </label>
            <input
              type="text"
              required
              value={config.host}
              onChange={(e) => setConfig({ ...config, host: e.target.value })}
              placeholder="smtp.gmail.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Port and Secure */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Port *
              </label>
              <input
                type="number"
                required
                min="1"
                max="65535"
                value={config.port}
                onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.secure}
                  onChange={(e) => setConfig({ ...config, secure: e.target.checked })}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm text-gray-700">Use TLS/SSL</span>
              </label>
            </div>
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username *
            </label>
            <input
              type="text"
              required
              value={config.auth.user}
              onChange={(e) => setConfig({ ...config, auth: { ...config.auth, user: e.target.value } })}
              placeholder="your-email@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password {hasPassword && '(leave empty to keep current)'}
            </label>
            <input
              type="password"
              required={!hasPassword}
              value={config.auth.pass}
              onChange={(e) => setConfig({ ...config, auth: { ...config.auth, pass: e.target.value } })}
              placeholder={hasPassword ? '••••••••' : 'your-password'}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* From Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Email *
            </label>
            <input
              type="email"
              required
              value={config.from.email}
              onChange={(e) => setConfig({ ...config, from: { ...config.from, email: e.target.value } })}
              placeholder="noreply@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* From Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Name *
            </label>
            <input
              type="text"
              required
              value={config.from.name}
              onChange={(e) => setConfig({ ...config, from: { ...config.from, name: e.target.value } })}
              placeholder="Location Tracker"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Reply-To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reply-To (optional)
            </label>
            <input
              type="email"
              value={config.replyTo || ''}
              onChange={(e) => setConfig({ ...config, replyTo: e.target.value })}
              placeholder="support@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Timeout */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Timeout (ms)
            </label>
            <input
              type="number"
              min="1000"
              value={config.timeout}
              onChange={(e) => setConfig({ ...config, timeout: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          <button
            type="button"
            onClick={() => setShowTestModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Test Connection
          </button>
          {source === 'database' && (
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100"
            >
              Reset to Defaults
            </button>
          )}
        </div>
      </form>

      {/* Test Email Modal */}
      {showTestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Test SMTP Connection</h3>
            <p className="text-sm text-gray-600 mb-4">
              Enter your email address to receive a test email.
            </p>
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="your-email@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowTestModal(false);
                  setTestEmail('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleTest}
                disabled={testing || !testEmail}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
              >
                {testing ? 'Sending...' : 'Send Test Email'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
