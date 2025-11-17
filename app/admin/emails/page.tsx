"use client";

import { useState } from "react";
import { EMAIL_TEMPLATES, EmailTemplate } from "@/lib/types/smtp";

export default function EmailsPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('welcome');
  const [testEmail, setTestEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showSendModal, setShowSendModal] = useState(false);

  const handleSendTest = async () => {
    if (!testEmail) {
      alert('Please enter a test email address');
      return;
    }

    setSending(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/emails/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: selectedTemplate,
          email: testEmail,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send');
      }

      setMessage({ type: 'success', text: data.message });
      setShowSendModal(false);
      setTestEmail('');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to send test email' });
    } finally {
      setSending(false);
    }
  };

  const previewUrl = `/api/admin/emails/preview?template=${selectedTemplate}`;

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-900 mb-6">Email Templates</h2>

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Templates</h3>
            </div>
            <div className="p-4">
              <div className="space-y-2">
                {EMAIL_TEMPLATES.map((template) => (
                  <button
                    key={template.name}
                    onClick={() => setSelectedTemplate(template.name)}
                    className={`w-full text-left px-4 py-3 rounded-md transition-colors ${
                      selectedTemplate === template.name
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="font-medium">{template.subject}</p>
                    <p className={`text-sm mt-1 ${
                      selectedTemplate === template.name
                        ? 'text-blue-100'
                        : 'text-gray-600'
                    }`}>
                      {template.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Send Test Button */}
          <button
            onClick={() => setShowSendModal(true)}
            className="w-full mt-4 px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
          >
            Send Test Email
          </button>
        </div>

        {/* Preview */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Preview</h3>
              <span className="text-sm text-gray-600">
                {EMAIL_TEMPLATES.find(t => t.name === selectedTemplate)?.subject}
              </span>
            </div>
            <div className="p-4">
              <iframe
                src={previewUrl}
                className="w-full border border-gray-300 rounded"
                style={{ height: '600px' }}
                title="Email Preview"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Send Test Email Modal */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Send Test Email</h3>
            <p className="text-sm text-gray-600 mb-2">
              Template: <strong>{EMAIL_TEMPLATES.find(t => t.name === selectedTemplate)?.subject}</strong>
            </p>
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
                  setShowSendModal(false);
                  setTestEmail('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSendTest}
                disabled={sending || !testEmail}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
              >
                {sending ? 'Sending...' : 'Send Test'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
