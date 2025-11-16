# Location Tracker - Next.js Anwendung

Eine moderne Location-Tracking Anwendung basierend auf Next.js 14 mit MQTT/OwnTracks Integration, SQLite-Datenbank, Admin-Panel und Authentifizierung.

## 📋 Inhaltsverzeichnis

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Installation](#-installation)
- [Datenbank-Setup](#-datenbank-setup)
- [Verwendung](#-verwendung)
- [Architektur](#-architektur)
- [API-Endpunkte](#-api-endpunkte)
- [Device Management](#-device-management)
- [Wartung](#-wartung)
- [Deployment](#-deployment)

---

## ✨ Features

### Öffentliche Features
- 🗺️ **Interaktive Karte** - Echtzeit-Standortverfolgung mit Leaflet.js
- 🎨 **Mehrere Kartenansichten** - Standard, Satellit, Dark Mode
- 🔍 **Device-Filterung** - Filtern nach Gerät und Zeitraum (1h, 3h, 6h, 12h, 24h)
- 🔄 **Auto-Refresh** - Automatische Aktualisierung alle 5 Sekunden
- 📱 **Responsive Design** - Optimiert für Desktop und Mobile
- 📊 **Polylines** - Bewegungspfade mit farbcodierter Darstellung

### Admin-Panel (Login erforderlich)
- 🔐 **Authentifizierung** - NextAuth.js v5 mit bcrypt-Hashing
- 📊 **Dashboard** - Übersicht über Geräte, Statistiken und Datenbankstatus
- 📱 **Device Management** - Geräte hinzufügen, bearbeiten, löschen
- 💾 **Datenbank-Wartung**:
  - 🔄 Manueller Sync von n8n
  - 🧹 Cleanup alter Daten (7, 15, 30, 90 Tage)
  - ⚡ Datenbank-Optimierung (VACUUM)
  - 📈 Detaillierte Statistiken
- 🟢 **Online/Offline Status** - Echtzeit-Status (< 10 Min = Online)
- 🔋 **Telemetrie-Daten** - Batterie, Geschwindigkeit, letzte Position

---

## 🛠 Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Sprache:** TypeScript 5.9
- **Styling:** Tailwind CSS v4
- **Karten:** Leaflet 1.9.4 + React-Leaflet 5.0
- **Authentifizierung:** NextAuth.js v5 (beta)
- **Datenbank:** SQLite (better-sqlite3)
- **Passwort-Hashing:** bcryptjs
- **Datenquelle:** n8n Webhook API + lokale SQLite-Cache

### Dual-Database Architektur
- **database.sqlite** - User, Geräte (kritische Daten)
- **locations.sqlite** - Location-Tracking (hohe Schreibrate, isoliert)

---

## 📦 Installation

### Voraussetzungen
- Node.js 18+
- npm oder yarn

### Schritte

1. **Repository klonen**
```bash
git clone <repo-url>
cd claude-code-web/poc-app
```

2. **Dependencies installieren**
```bash
npm install
```

3. **Datenbank initialisieren**
```bash
npm run db:init
```

Dies erstellt:
- `data/database.sqlite` (User + Devices)
- `data/locations.sqlite` (Location-Tracking)
- Standard Admin-User: `admin` / `admin123`
- Standard Devices (ID 10, 11)

4. **Development Server starten**
```bash
npm run dev
```

5. **Im Browser öffnen**
- Karte: http://localhost:3000
- Login: http://localhost:3000/login
- Admin: http://localhost:3000/admin
- Devices: http://localhost:3000/admin/devices

---

## 🗄️ Datenbank-Setup

### Initialisierung

**Beide Datenbanken erstellen:**
```bash
npm run db:init
```

**Nur database.sqlite (User/Devices):**
```bash
npm run db:init:app
```

**Nur locations.sqlite (Tracking):**
```bash
npm run db:init:locations
```

### Datenbank zurücksetzen

**Admin-User neu anlegen:**
```bash
node scripts/reset-admin.js
```

**Alte Locations löschen:**
```bash
npm run db:cleanup       # Älter als 7 Tage
npm run db:cleanup:7d    # Älter als 7 Tage
npm run db:cleanup:30d   # Älter als 30 Tage
```

**Duplikate entfernen (falls vorhanden):**
```bash
node scripts/remove-duplicates.js
```

### Schema

**database.sqlite:**
- `User` - Benutzer mit Rollen (ADMIN, VIEWER)
- `Device` - Geräte-Konfiguration

**locations.sqlite:**
- `Location` - Standort-Historie mit Telemetrie
- UNIQUE Index: (timestamp, username, latitude, longitude)

---

## 🚀 Verwendung

### Login

Standard-Zugangsdaten:
```
Benutzername: admin
Passwort: admin123
```

⚠️ **Wichtig:** Für Production neuen User anlegen und Passwort ändern!

### Geräte hinzufügen

1. Admin-Panel öffnen: `/admin/devices`
2. "Add Device" klicken
3. Device ID (muss mit OwnTracks `tid` übereinstimmen)
4. Name und Farbe festlegen
5. Speichern

**Wichtig:** Die Device ID muss mit der OwnTracks Tracker-ID übereinstimmen!

### OwnTracks konfigurieren

In der OwnTracks App:
- **Tracker ID (tid):** z.B. `12`
- **Topic:** `owntracks/user/12`
- MQTT Broker wie gewohnt

Die n8n-Workflow holt die Daten, und die App synct automatisch alle 5 Sekunden.

---

## 🏗 Architektur

### Datenfluss

```
OwnTracks App (MQTT)
    ↓
n8n MQTT Trigger
    ↓
NocoDB Speicherung
    ↓
n8n Webhook API (/webhook/location)
    ↓
Next.js API Route (/api/locations)
    ↓ (Auto-Sync alle 5 Sek.)
SQLite Cache (locations.sqlite)
    ↓
Frontend (React Components)
```

### Auto-Sync Mechanismus

Die App verwendet einen **Hybrid-Ansatz**:

1. **Frontend polling** (alle 5 Sek.) → `/api/locations`
2. **API prüft** ob neue Daten in n8n verfügbar
3. **Nur neue Locations** werden in SQLite gespeichert
4. **Duplikate** werden durch UNIQUE Index verhindert
5. **Antwort** kommt aus lokalem SQLite Cache

**Vorteil:**
- Schnelle Antwortzeiten (SQLite statt n8n)
- Längere Zeiträume abrufbar (24h+)
- Funktioniert auch wenn n8n nicht erreichbar ist

---

## 📡 API-Endpunkte

### Öffentlich

**GET /api/locations**
- Location-Daten abrufen (mit Auto-Sync)
- Query-Parameter:
  - `username` - Device-Filter
  - `timeRangeHours` - Zeitraum (1, 3, 6, 12, 24)
  - `limit` - Max. Anzahl (Standard: 1000)
  - `sync=false` - Nur Cache ohne n8n Sync

**GET /api/devices/public**
- Öffentliche Device-Liste (nur ID, Name, Color)

### Geschützt (Login erforderlich)

**GET /api/devices**
- Alle Geräte mit Latest Location und Telemetrie

**POST /api/devices**
- Neues Gerät erstellen
- Body: `{ id, name, color, description? }`

**PATCH /api/devices/:id**
- Gerät aktualisieren
- Body: `{ name?, color?, description? }`

**DELETE /api/devices/:id**
- Gerät löschen (soft delete)

**POST /api/locations/sync**
- Manueller Sync von n8n
- Gibt Anzahl neu eingefügter Locations zurück

**POST /api/locations/cleanup**
- Alte Locations löschen
- Body: `{ retentionHours }`

**POST /api/locations/optimize**
- VACUUM + ANALYZE ausführen
- Gibt freigegebenen Speicher zurück

**GET /api/locations/stats**
- Detaillierte DB-Statistiken
- Größe, Zeitraum, Locations pro Device

---

## 📱 Device Management

### Device-Karte zeigt:

- 🟢/⚫ **Online/Offline Status**
  - Online = letzte Location < 10 Minuten
  - Offline = letzte Location > 10 Minuten
- 🕒 **Last Seen** - Zeitstempel letzter Location
- 🔋 **Batterie** - Prozent (Rot bei < 20%)
- 🚗 **Geschwindigkeit** - km/h (umgerechnet von m/s)
- 📍 **Koordinaten** - Lat/Lon mit 5 Dezimalen

### Auto-Refresh
- Devices-Seite aktualisiert sich alle 10 Sekunden
- Online/Offline Status wird automatisch aktualisiert

---

## 🧹 Wartung

### Datenbank aufräumen

**Via Admin-Panel:**
- `/admin` → Database Maintenance → Cleanup Buttons

**Via CLI:**
```bash
npm run db:cleanup        # 7 Tage
npm run db:cleanup:30d    # 30 Tage
```

### Datenbank optimieren

**Via Admin-Panel:**
- `/admin` → Database Maintenance → Optimize Button

**Via CLI:**
```bash
# Manuell
node scripts/optimize-db.js
```

**Was macht Optimize:**
- `VACUUM` - Speicherplatz freigeben
- `ANALYZE` - Query-Statistiken aktualisieren

### Sync von n8n

**Via Admin-Panel:**
- `/admin` → Database Maintenance → Sync Now

**Automatisch:**
- Passiert alle 5 Sekunden beim Abruf der Karte

### Logs prüfen

```bash
# Development Server Logs
npm run dev

# Production Logs (PM2)
pm2 logs poc-app
```

---

## 🚀 Deployment

### Environment Variables

Erstelle `.env.local`:

```env
# NextAuth
AUTH_SECRET=<generiere-mit-openssl-rand-base64-32>
NEXTAUTH_URL=https://your-domain.com

# Optional: n8n API URL (Standard in Code definiert)
N8N_API_URL=https://n8n.unixweb.home64.de/webhook/location
```

**Secret generieren:**
```bash
openssl rand -base64 32
```

### Production Build

```bash
# Build
npm run build

# Start
npm run start
```

### Mit PM2 (empfohlen)

```bash
# PM2 installieren
npm install -g pm2

# App starten
pm2 start npm --name "poc-app" -- start

# Auto-Start bei Server-Neustart
pm2 startup
pm2 save
```

### Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 🔒 Sicherheit

### Production Checklist

- [ ] `AUTH_SECRET` mit starkem Wert setzen
- [ ] `NEXTAUTH_URL` auf Production-Domain setzen
- [ ] Admin-Passwort ändern (nicht `admin123`)
- [ ] Ggf. weitere User anlegen mit VIEWER Rolle
- [ ] HTTPS aktivieren (Let's Encrypt)
- [ ] Firewall-Regeln prüfen
- [ ] Regelmäßige Backups einrichten

### User-Rollen

- **ADMIN** - Voller Zugriff auf alle Admin-Funktionen
- **VIEWER** - Nur lesender Zugriff (geplant, noch nicht implementiert)

---

## 📂 Projektstruktur

```
poc-app/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/      # NextAuth API
│   │   ├── devices/                 # Device CRUD
│   │   └── locations/               # Location API + Sync/Cleanup/Stats
│   ├── admin/
│   │   ├── devices/                 # Device Management
│   │   └── page.tsx                 # Dashboard
│   ├── login/                       # Login-Seite
│   ├── page.tsx                     # Öffentliche Karte
│   └── layout.tsx                   # Root Layout
├── components/
│   └── map/
│       └── MapView.tsx              # Leaflet Map Component
├── lib/
│   ├── auth.ts                      # NextAuth Config
│   └── db.ts                        # SQLite Database Layer
├── scripts/
│   ├── init-database.js             # Database.sqlite Setup
│   ├── init-locations-db.js         # Locations.sqlite Setup
│   ├── reset-admin.js               # Admin User Reset
│   ├── remove-duplicates.js         # Duplikate bereinigen
│   └── cleanup-old-locations.js     # Alte Daten löschen
├── data/
│   ├── database.sqlite              # User + Devices
│   └── locations.sqlite             # Location Tracking
├── types/
│   └── location.ts                  # TypeScript Interfaces
└── middleware.ts                    # Route Protection
```

---

## 🐛 Troubleshooting

### "Invalid username or password"

**Lösung:**
```bash
node scripts/reset-admin.js
```

### Datenbank-Dateien fehlen

**Lösung:**
```bash
npm run db:init
```

### Duplikate in locations.sqlite

**Lösung:**
```bash
# Erst Duplikate entfernen
node scripts/remove-duplicates.js

# Dann UNIQUE Index hinzufügen
node scripts/init-locations-db.js
```

### Map zeigt keine Daten

1. n8n Webhook erreichbar? `curl https://n8n.unixweb.home64.de/webhook/location`
2. Locations in Datenbank? `/admin` → Database Statistics prüfen
3. Auto-Sync aktiv? Browser Console öffnen

### "ENOENT: no such file or directory, open 'data/database.sqlite'"

**Lösung:**
```bash
mkdir -p data
npm run db:init
```

---

## 📝 NPM Scripts

```bash
# Development
npm run dev              # Dev Server starten

# Production
npm run build            # Production Build
npm run start            # Production Server

# Database
npm run db:init          # Beide DBs initialisieren
npm run db:init:app      # Nur database.sqlite
npm run db:init:locations # Nur locations.sqlite
npm run db:cleanup       # Cleanup 7 Tage
npm run db:cleanup:7d    # Cleanup 7 Tage
npm run db:cleanup:30d   # Cleanup 30 Tage

# Linting
npm run lint             # ESLint ausführen
```

---

## 🔄 Migration von Prisma zu SQLite

Diese App wurde von Prisma ORM auf direktes better-sqlite3 migriert:

**Vorteile:**
- Keine ORM-Komplexität
- Schnellere Queries
- Bessere Kontrolle über SQL
- Dual-Database Architektur möglich
- WAL Mode für bessere Concurrency

**Schema bleibt kompatibel** - Daten können aus alter `dev.db` übernommen werden.

---

## 📄 Lizenz

Internal Use Only - POC Anwendung

---

## 🙏 Credits

- **Next.js 14** - React Framework
- **Leaflet.js** - Karten-Bibliothek
- **NextAuth.js** - Authentifizierung
- **better-sqlite3** - SQLite für Node.js
- **Tailwind CSS** - Utility-First CSS
- **n8n** - Workflow Automation (Backend)
- **OwnTracks** - Location Tracking Apps

---

## 📞 Support

Bei Fragen oder Problemen:
1. Logs prüfen (`npm run dev` Output)
2. Browser Console öffnen (F12)
3. Datenbank-Status in `/admin` prüfen
4. Issues im Repository erstellen
