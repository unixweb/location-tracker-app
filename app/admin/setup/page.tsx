"use client";

import { useState } from "react";

export default function SetupGuidePage() {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    "1": true, // Installation section open by default
  });

  const toggleSection = (id: string) => {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          📱 OwnTracks App Setup Anleitung
        </h1>
        <p className="text-gray-600 mb-8">
          Diese Anleitung erklärt Schritt-für-Schritt, wie Sie die OwnTracks App
          auf Ihrem Smartphone installieren und mit dem Location Tracker System verbinden.
        </p>

        {/* Table of Contents */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-3">📋 Inhaltsverzeichnis</h2>
          <ul className="space-y-2 text-sm">
            <li><a href="#installation" className="text-blue-600 hover:underline">1. Installation</a></li>
            <li><a href="#credentials" className="text-blue-600 hover:underline">2. MQTT Credentials erhalten</a></li>
            <li><a href="#configuration" className="text-blue-600 hover:underline">3. App Konfiguration</a></li>
            <li><a href="#testing" className="text-blue-600 hover:underline">5. Verbindung testen</a></li>
            <li><a href="#ports" className="text-blue-600 hover:underline">6. Port 1883 vs. 9001</a></li>
            <li><a href="#troubleshooting" className="text-blue-600 hover:underline">7. Troubleshooting</a></li>
          </ul>
        </div>

        {/* Section 1: Installation */}
        <Section
          id="installation"
          title="1. Installation"
          icon="📥"
          isOpen={openSections["1"]}
          onToggle={() => toggleSection("1")}
        >
          <div className="grid md:grid-cols-2 gap-6">
            <div className="border rounded-lg p-4">
              <h4 className="font-bold text-lg mb-2">🍎 iOS (iPhone/iPad)</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Öffnen Sie den <strong>App Store</strong></li>
                <li>Suchen Sie nach <strong>"OwnTracks"</strong></li>
                <li>Laden Sie die App herunter</li>
              </ol>
              <a
                href="https://apps.apple.com/app/owntracks/id692424691"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-3 text-blue-600 hover:underline text-sm"
              >
                → App Store Link
              </a>
            </div>
            <div className="border rounded-lg p-4">
              <h4 className="font-bold text-lg mb-2">🤖 Android</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Öffnen Sie den <strong>Google Play Store</strong></li>
                <li>Suchen Sie nach <strong>"OwnTracks"</strong></li>
                <li>Laden Sie die App herunter</li>
              </ol>
              <a
                href="https://play.google.com/store/apps/details?id=org.owntracks.android"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-3 text-blue-600 hover:underline text-sm"
              >
                → Play Store Link
              </a>
            </div>
          </div>
        </Section>

        {/* Section 2: Credentials */}
        <Section
          id="credentials"
          title="2. MQTT Credentials erhalten"
          icon="🔑"
          isOpen={openSections["2"]}
          onToggle={() => toggleSection("2")}
        >
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-sm font-semibold">⚠️ Wichtig: Bevor Sie die App konfigurieren, benötigen Sie MQTT-Zugangsdaten!</p>
          </div>
          <ol className="list-decimal list-inside space-y-3 text-sm">
            <li>Navigieren Sie zu <a href="/admin/mqtt" className="text-blue-600 hover:underline font-semibold">MQTT Provisioning</a></li>
            <li>Klicken Sie auf <strong>"Device Provisionieren"</strong></li>
            <li>Wählen Sie Ihr Device aus der Liste</li>
            <li>Aktivieren Sie <strong>"Automatisch Username & Passwort generieren"</strong></li>
            <li>Klicken Sie auf <strong>"Erstellen"</strong></li>
            <li>
              <strong className="text-red-600">Speichern Sie die Credentials sofort!</strong>
              <div className="bg-gray-100 p-3 rounded mt-2 font-mono text-xs">
                Username: device_10_abc123<br />
                Password: ******************
              </div>
            </li>
          </ol>
        </Section>

        {/* Section 3: Configuration */}
        <Section
          id="configuration"
          title="3. OwnTracks App Konfiguration"
          icon="⚙️"
          isOpen={openSections["3"]}
          onToggle={() => toggleSection("3")}
        >
          <div className="space-y-6">
            <div>
              <h4 className="font-bold mb-3">Schritt 1: Zu Einstellungen navigieren</h4>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li><strong>iOS:</strong> Tippen Sie auf das ⚙️ Symbol (oben rechts)</li>
                <li><strong>Android:</strong> Tippen Sie auf ☰ (Hamburger-Menü) → Einstellungen</li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-3">Schritt 2: Modus auswählen</h4>
              <p className="text-sm mb-2">Gehen Sie zu <strong>"Verbindung"</strong> oder <strong>"Connection"</strong></p>
              <p className="text-sm">Wählen Sie <strong>"Modus"</strong> → <strong className="text-green-600">MQTT</strong></p>
            </div>

            <div>
              <h4 className="font-bold mb-3">Schritt 3: Server-Einstellungen</h4>
              <ConfigTable />
            </div>

            <div>
              <h4 className="font-bold mb-3">Schritt 4: Authentifizierung</h4>
              <table className="w-full text-sm border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border p-2 text-left">Einstellung</th>
                    <th className="border p-2 text-left">Wert</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border p-2">Benutzername</td>
                    <td className="border p-2 font-mono text-xs">device_XX_xxxxxxxx</td>
                  </tr>
                  <tr>
                    <td className="border p-2">Passwort</td>
                    <td className="border p-2 font-mono text-xs">Ihr generiertes Passwort</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <h4 className="font-bold mb-3">Schritt 5: Device Identifikation</h4>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-red-800 mb-2">⚠️ Wichtig!</p>
                <p className="text-sm">Die Device ID und Tracker ID müssen mit der Device-ID übereinstimmen, die Sie im System konfiguriert haben (z.B. <code className="bg-gray-200 px-1 rounded">10</code>, <code className="bg-gray-200 px-1 rounded">12</code>, <code className="bg-gray-200 px-1 rounded">15</code>).</p>
              </div>
              <table className="w-full text-sm border mt-4">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border p-2 text-left">Einstellung</th>
                    <th className="border p-2 text-left">Wert</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border p-2">Geräte ID / Device ID</td>
                    <td className="border p-2 font-mono">10</td>
                  </tr>
                  <tr>
                    <td className="border p-2">Tracker ID</td>
                    <td className="border p-2 font-mono">10</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </Section>

        {/* Section 5: Testing */}
        <Section
          id="testing"
          title="5. Verbindung testen"
          icon="✅"
          isOpen={openSections["5"]}
          onToggle={() => toggleSection("5")}
        >
          <ol className="list-decimal list-inside space-y-3 text-sm">
            <li>
              <strong>Verbindung prüfen:</strong> Sie sollten ein <span className="text-green-600 font-semibold">grünes Symbol</span> oder "Connected" sehen
            </li>
            <li>
              <strong>Testpunkt senden:</strong> Tippen Sie auf den Location-Button (Fadenkreuz-Symbol)
            </li>
            <li>
              <strong>Im Location Tracker prüfen:</strong>
              <a href="/map" className="text-blue-600 hover:underline ml-1 font-semibold">→ Zur Live-Karte</a>
              <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                <li>Marker mit Ihrer Device-Farbe</li>
                <li>Aktuelle Koordinaten</li>
                <li>Zeitstempel der letzten Position</li>
              </ul>
            </li>
          </ol>
        </Section>

        {/* Section 6: Ports */}
        <Section
          id="ports"
          title="6. Port 1883 vs. 9001 - Was ist der Unterschied?"
          icon="🔌"
          isOpen={openSections["6"]}
          onToggle={() => toggleSection("6")}
        >
          <PortComparison />
        </Section>

        {/* Section 7: Troubleshooting */}
        <Section
          id="troubleshooting"
          title="7. Troubleshooting - Häufige Probleme"
          icon="🔧"
          isOpen={openSections["7"]}
          onToggle={() => toggleSection("7")}
        >
          <TroubleshootingSection />
        </Section>

        {/* Quick Start Checklist */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mt-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">✅ Schnellstart-Checkliste</h3>
          <ChecklistItems />
        </div>

        {/* Support Section */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mt-8">
          <h3 className="text-xl font-bold text-gray-900 mb-3">📞 Weiterführende Informationen</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">OwnTracks Dokumentation:</h4>
              <ul className="space-y-1">
                <li><a href="https://owntracks.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">→ Website</a></li>
                <li><a href="https://owntracks.org/booklet/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">→ Dokumentation</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Location Tracker System:</h4>
              <ul className="space-y-1">
                <li><a href="/admin" className="text-blue-600 hover:underline">→ Dashboard</a></li>
                <li><a href="/map" className="text-blue-600 hover:underline">→ Live-Karte</a></li>
                <li><a href="/admin/mqtt" className="text-blue-600 hover:underline">→ MQTT Provisioning</a></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Section Component
function Section({
  id,
  title,
  icon,
  isOpen,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  icon: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div id={id} className="border-b border-gray-200 py-6">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full text-left hover:bg-gray-50 p-2 rounded"
      >
        <h2 className="text-2xl font-bold text-gray-900">
          {icon} {title}
        </h2>
        <span className="text-2xl text-gray-400">
          {isOpen ? "−" : "+"}
        </span>
      </button>
      {isOpen && <div className="mt-4">{children}</div>}
    </div>
  );
}

// Config Table Component
function ConfigTable() {
  return (
    <table className="w-full text-sm border">
      <thead className="bg-gray-100">
        <tr>
          <th className="border p-2 text-left">Einstellung</th>
          <th className="border p-2 text-left">Wert</th>
          <th className="border p-2 text-left">Hinweis</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td className="border p-2">Hostname</td>
          <td className="border p-2 font-mono">192.168.10.118</td>
          <td className="border p-2 text-gray-600">IP-Adresse des Servers</td>
        </tr>
        <tr>
          <td className="border p-2">Port</td>
          <td className="border p-2 font-mono">1883</td>
          <td className="border p-2 text-gray-600">Standard MQTT Port</td>
        </tr>
        <tr className="bg-red-50">
          <td className="border p-2">Websockets nutzen</td>
          <td className="border p-2 font-bold text-red-600">❌ DEAKTIVIERT</td>
          <td className="border p-2 text-gray-600">Nur bei Port 9001!</td>
        </tr>
        <tr className="bg-red-50">
          <td className="border p-2">TLS</td>
          <td className="border p-2 font-bold text-red-600">❌ DEAKTIVIERT</td>
          <td className="border p-2 text-gray-600">Lokales Netzwerk</td>
        </tr>
        <tr>
          <td className="border p-2">Client ID</td>
          <td className="border p-2 text-gray-500">Automatisch</td>
          <td className="border p-2 text-gray-600">Kann leer bleiben</td>
        </tr>
      </tbody>
    </table>
  );
}

// Port Comparison Component
function PortComparison() {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="border-2 border-green-500 rounded-lg p-4 bg-green-50">
        <h4 className="font-bold text-lg mb-3 text-green-800">Port 1883 (Standard MQTT)</h4>
        <ul className="space-y-2 text-sm">
          <li>✅ <strong>Protokoll:</strong> Standard MQTT (TCP)</li>
          <li>✅ <strong>Verwendung:</strong> Mobile Apps, IoT-Geräte</li>
          <li>❌ <strong>Websockets:</strong> Nein</li>
          <li className="mt-3 pt-3 border-t border-green-300">
            <strong>Empfohlen für OwnTracks App!</strong>
          </li>
        </ul>
        <div className="mt-4 bg-white p-2 rounded text-xs font-mono">
          Port: 1883<br />
          Websockets: DEAKTIVIERT
        </div>
      </div>
      <div className="border-2 border-blue-500 rounded-lg p-4 bg-blue-50">
        <h4 className="font-bold text-lg mb-3 text-blue-800">Port 9001 (MQTT over WebSockets)</h4>
        <ul className="space-y-2 text-sm">
          <li>✅ <strong>Protokoll:</strong> MQTT über WebSocket</li>
          <li>✅ <strong>Verwendung:</strong> Browser, Web-Apps</li>
          <li>✅ <strong>Websockets:</strong> Ja</li>
          <li className="mt-3 pt-3 border-t border-blue-300">
            <strong>Für Web-Anwendungen</strong>
          </li>
        </ul>
        <div className="mt-4 bg-white p-2 rounded text-xs font-mono">
          Port: 9001<br />
          Websockets: AKTIVIERT
        </div>
      </div>
    </div>
  );
}

// Troubleshooting Component
function TroubleshootingSection() {
  return (
    <div className="space-y-4">
      <TroubleshootingItem
        problem="Verbindung fehlgeschlagen"
        solutions={[
          "Überprüfen Sie Hostname (192.168.10.118) und Port (1883)",
          "Stellen Sie sicher, dass Smartphone im selben Netzwerk ist",
          "Deaktivieren Sie TLS/SSL",
          "Deaktivieren Sie Websockets bei Port 1883",
          "Prüfen Sie Username und Passwort",
        ]}
      />
      <TroubleshootingItem
        problem="Verbunden, aber keine Daten auf der Karte"
        solutions={[
          "Device ID und Tracker ID müssen übereinstimmen",
          "Standortberechtigungen 'Immer' erteilen",
          "Akkuoptimierung deaktivieren (Android)",
        ]}
      />
      <TroubleshootingItem
        problem="Tracking stoppt im Hintergrund"
        solutions={[
          "iOS: Hintergrundaktualisierung aktivieren",
          "iOS: Standortzugriff auf 'Immer' setzen",
          "Android: Akkuoptimierung deaktivieren",
          "Android: Standort 'Immer zulassen'",
        ]}
      />
    </div>
  );
}

function TroubleshootingItem({ problem, solutions }: { problem: string; solutions: string[] }) {
  return (
    <div className="border border-gray-300 rounded-lg p-4">
      <h4 className="font-bold text-red-600 mb-2">❌ {problem}</h4>
      <ul className="space-y-1 text-sm">
        {solutions.map((solution, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span>{solution}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Checklist Items Component
function ChecklistItems() {
  const items = [
    "OwnTracks App installiert",
    "MQTT Credentials generiert und gespeichert",
    "Modus auf MQTT gesetzt",
    "Hostname: 192.168.10.118 eingetragen",
    "Port: 1883 eingetragen",
    "Websockets: ❌ Deaktiviert",
    "TLS: ❌ Deaktiviert",
    "Benutzername und Passwort eingetragen",
    "Device ID und Tracker ID korrekt gesetzt",
    "Standortberechtigungen 'Immer' erteilt",
    "Akkuoptimierung deaktiviert (Android)",
    "Verbindung erfolgreich (grünes Symbol)",
    "Position auf Karte sichtbar",
  ];

  return (
    <ul className="space-y-2 text-sm">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2">
          <input type="checkbox" className="mt-1" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
