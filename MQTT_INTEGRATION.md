# MQTT Provisioning Integration

Diese Anleitung beschreibt die Integration des MQTT Provisioning Systems (aus `mosquitto-automation`) in die Location Tracker App.

## 🎯 Übersicht

Die Integration vereint zwei vormals separate Systeme:
- **mosquitto-automation**: Device Provisioning und MQTT Credential Management
- **location-tracker-app**: GPS Tracking Visualisierung mit OwnTracks

### Was wurde integriert?

✅ **MQTT Credentials Management** - Direkt im Admin Panel
✅ **ACL (Access Control List) Management** - Feine Kontrolle über Topic-Berechtigungen
✅ **Mosquitto Sync** - Password & ACL Files werden automatisch generiert
✅ **MQTT Subscriber** - Direkte Verarbeitung von OwnTracks Messages (kein n8n mehr nötig)
✅ **Docker Compose Setup** - All-in-One Deployment

---

## 📋 Features

### Admin Panel: MQTT Provisioning

**Route:** `/admin/mqtt`

#### Device Provisioning
- Erstelle MQTT Credentials für registrierte Devices
- Automatische Generierung von Username & Passwort
- Passwörter werden mit `mosquitto_passwd` gehasht
- Default ACL Regel: `owntracks/[device-id]/#` (readwrite)

#### Credentials Management
- Liste aller provisionierten Devices
- Enable/Disable MQTT Zugriff pro Device
- Passwort Regenerierung
- Credentials löschen (inkl. ACL Regeln)

#### ACL Management
- Custom Topic Patterns definieren
- Berechtigungen: `read`, `write`, `readwrite`
- Wildcard Support mit `#`
- Regeln pro Device verwalten

#### Mosquitto Sync
- **"Zu Mosquitto Syncen"** Button im Admin Panel
- Generiert `/mosquitto/config/password.txt`
- Generiert `/mosquitto/config/acl.txt`
- Sendet SIGHUP an Mosquitto Container (Config Reload)
- Zeigt ausstehende Änderungen an

---

## 🗄️ Datenbankschema

### Neue Tabellen

#### `mqtt_credentials`
```sql
CREATE TABLE mqtt_credentials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT NOT NULL UNIQUE,           -- Referenz zu Device Tabelle
  mqtt_username TEXT NOT NULL UNIQUE,
  mqtt_password_hash TEXT NOT NULL,         -- Mosquitto-kompatible Hash
  enabled INTEGER DEFAULT 1,                 -- 0 = disabled, 1 = enabled
  created_at TEXT,
  updated_at TEXT,
  FOREIGN KEY (device_id) REFERENCES Device(id) ON DELETE CASCADE
);
```

#### `mqtt_acl_rules`
```sql
CREATE TABLE mqtt_acl_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT NOT NULL,
  topic_pattern TEXT NOT NULL,              -- z.B. "owntracks/device10/#"
  permission TEXT NOT NULL,                  -- read | write | readwrite
  created_at TEXT,
  FOREIGN KEY (device_id) REFERENCES Device(id) ON DELETE CASCADE
);
```

#### `mqtt_sync_status`
```sql
CREATE TABLE mqtt_sync_status (
  id INTEGER PRIMARY KEY CHECK (id = 1),    -- Singleton
  pending_changes INTEGER DEFAULT 0,
  last_sync_at TEXT,
  last_sync_status TEXT,                     -- success | error: ...
  created_at TEXT,
  updated_at TEXT
);
```

### Migration

```bash
# Datenbanken initialisieren
npm run db:init

# MQTT Tabellen hinzufügen
node scripts/add-mqtt-tables.js
```

---

## 🚀 Installation & Setup

### Voraussetzungen

- Docker & Docker Compose
- Node.js 20+ (für lokale Entwicklung)

### 1. Repository Setup

```bash
cd location-tracker-app

# Dependencies installieren
npm install

# .env Datei erstellen
cp .env.example .env
```

### 2. Environment Variables

Bearbeite `.env`:

```env
# MQTT Configuration
MQTT_BROKER_URL=mqtt://mosquitto:1883
MQTT_ADMIN_USERNAME=admin
MQTT_ADMIN_PASSWORD=dein-sicheres-passwort

MOSQUITTO_PASSWORD_FILE=/mosquitto/config/password.txt
MOSQUITTO_ACL_FILE=/mosquitto/config/acl.txt
MOSQUITTO_CONTAINER_NAME=mosquitto

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generiere mit: openssl rand -base64 32>

# Verschlüsselung für SMTP Passwords
ENCRYPTION_KEY=<generiere mit: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
```

### 3. Docker Compose Start

```bash
# Build und Start
docker-compose up -d

# Logs verfolgen
docker-compose logs -f

# Status prüfen
docker-compose ps
```

Die App läuft auf: `http://localhost:3000`
Mosquitto MQTT Broker: `mqtt://localhost:1883`

### 4. Admin Zugang

**Default Credentials:**
- Username: `admin`
- Password: `admin123`

⚠️ **Ändere das Passwort nach dem ersten Login!**

---

## 🔧 Entwicklung

### Lokale Entwicklung (ohne Docker)

```bash
# 1. Mosquitto extern starten (oder Docker Compose nur Mosquitto)
docker run -d -p 1883:1883 -p 9001:9001 \
  -v $(pwd)/mosquitto.conf:/mosquitto/config/mosquitto.conf \
  -v mosquitto_data:/mosquitto/data \
  eclipse-mosquitto:2

# 2. .env anpassen
MQTT_BROKER_URL=mqtt://localhost:1883

# 3. Datenbanken initialisieren
npm run db:init
node scripts/add-mqtt-tables.js

# 4. App starten
npm run dev
```

### Neue MQTT Credentials testen

```bash
# Mit mosquitto_sub testen
mosquitto_sub -h localhost -p 1883 \
  -u "device_10_abc123" \
  -P "dein-generiertes-passwort" \
  -t "owntracks/10/#" \
  -v

# OwnTracks Message simulieren
mosquitto_pub -h localhost -p 1883 \
  -u "device_10_abc123" \
  -P "dein-generiertes-passwort" \
  -t "owntracks/10/device" \
  -m '{"_type":"location","lat":52.5200,"lon":13.4050,"tst":1234567890,"batt":85,"vel":5.2}'
```

---

## 📡 MQTT Subscriber

Der MQTT Subscriber läuft automatisch beim App-Start und verarbeitet OwnTracks Messages.

### Implementierung

- **Service:** `lib/mqtt-subscriber.ts`
- **Startup:** `instrumentation.ts` (Next.js Hook)
- **Topic:** `owntracks/+/+`
- **Datenbank:** Schreibt direkt in `locations.sqlite`

### OwnTracks Message Format

```json
{
  "_type": "location",
  "tid": "XX",
  "lat": 52.5200,
  "lon": 13.4050,
  "tst": 1234567890,
  "batt": 85,
  "vel": 5.2,
  "acc": 10,
  "alt": 50
}
```

### Logs

```bash
# Docker Logs
docker-compose logs -f app

# Du solltest sehen:
# ✓ Connected to MQTT broker
# ✓ Subscribed to owntracks/+/+
# ✓ Location saved: device10 at (52.52, 13.405)
```

---

## 🔐 Sicherheit

### Mosquitto Authentication

- **Keine Anonymous Connections:** `allow_anonymous false`
- **Password File:** Mosquitto-kompatible Hashes (SHA512)
- **ACL File:** Topic-basierte Access Control

### Best Practices

1. **Starke Admin Passwörter:** Ändere `MQTT_ADMIN_PASSWORD` in `.env`
2. **Device Passwörter:** Auto-generierte Passwörter haben 128 Bit Entropie
3. **ACL Regeln:** Gib Devices nur Zugriff auf ihre eigenen Topics
4. **Docker Socket:** Container benötigt Zugriff für Mosquitto Reload (optional)

### ACL Beispiele

```text
# Device darf nur in eigenes Topic schreiben
user device_10_abc123
topic readwrite owntracks/10/#

# Device mit zusätzlichem Read-only Topic
user device_11_xyz789
topic readwrite owntracks/11/#
topic read status/#

# Admin hat vollen Zugriff
user admin
topic readwrite #
```

---

## 🐛 Troubleshooting

### Problem: "Mosquitto configuration reloaded" fehlgeschlagen

**Symptom:** Nach Sync kommt Warnung "Could not reload Mosquitto automatically"

**Lösung:** Docker Socket Zugriff fehlt. Entweder:

```bash
# Option 1: Manuelle Mosquitto Neustart
docker-compose restart mosquitto

# Option 2: Docker Socket in docker-compose.yml freigeben (bereits konfiguriert)
volumes:
  - /var/run/docker.sock:/var/run/docker.sock
```

### Problem: MQTT Subscriber verbindet nicht

**Debug Steps:**

```bash
# 1. Prüfe Mosquitto läuft
docker-compose ps mosquitto

# 2. Prüfe Mosquitto Logs
docker-compose logs mosquitto

# 3. Prüfe App Logs
docker-compose logs app | grep MQTT

# 4. Teste MQTT Verbindung manuell
mosquitto_sub -h localhost -p 1883 -u admin -P admin -t '#'
```

### Problem: Password Hash falsch

**Symptom:** Authentication failed im Mosquitto Log

**Lösung:** `mosquitto_passwd` Tool muss im Container verfügbar sein (ist im Dockerfile installiert)

```bash
# Im Container testen
docker exec -it location-tracker-app mosquitto_passwd -h
```

### Problem: ACL Regeln funktionieren nicht

**Debug:**

```bash
# ACL File prüfen
docker exec -it location-tracker-app cat /mosquitto/config/acl.txt

# Mosquitto Logs auf "Access denied" prüfen
docker-compose logs mosquitto | grep -i denied
```

---

## 📊 API Endpoints

### MQTT Credentials

```http
# Liste aller Credentials
GET /api/mqtt/credentials

# Credential für Device abrufen
GET /api/mqtt/credentials/{device_id}

# Neue Credentials erstellen
POST /api/mqtt/credentials
Content-Type: application/json

{
  "device_id": "10",
  "auto_generate": true
}

# Credentials aktualisieren
PATCH /api/mqtt/credentials/{device_id}
Content-Type: application/json

{
  "regenerate_password": true,
  "enabled": true
}

# Credentials löschen
DELETE /api/mqtt/credentials/{device_id}
```

### ACL Rules

```http
# ACL Regeln für Device
GET /api/mqtt/acl?device_id=10

# Neue ACL Regel erstellen
POST /api/mqtt/acl
Content-Type: application/json

{
  "device_id": "10",
  "topic_pattern": "owntracks/10/#",
  "permission": "readwrite"
}

# ACL Regel löschen
DELETE /api/mqtt/acl/{rule_id}
```

### Mosquitto Sync

```http
# Sync Status abrufen
GET /api/mqtt/sync

# Sync triggern
POST /api/mqtt/sync
```

Alle Endpoints erfordern Admin-Authentifizierung (Role: ADMIN).

---

## 🔄 Migration von mosquitto-automation

Wenn du bereits Devices in `mosquitto-automation` hast:

### Automatische Migration (TODO)

```bash
# Script erstellen das aus der alten DB liest
node scripts/migrate-from-mosquitto-automation.js \
  --old-db /pfad/zu/mosquitto-automation/data/devices.db
```

### Manuelle Migration

1. Exportiere Devices aus alter DB:
```sql
SELECT id, name, username, password_hash, permissions
FROM devices
WHERE active = 1;
```

2. Erstelle Devices im neuen System über Admin Panel
3. Provisioniere MQTT Credentials manuell
4. Importiere ACL Regeln

---

## 📚 Architektur

### Komponenten

```
┌─────────────────────────────────────────────────────┐
│           Location Tracker App (Next.js)            │
│                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │
│  │ Admin Panel  │  │ MQTT Service │  │   API    │ │
│  │ /admin/mqtt  │  │  Subscriber  │  │  Routes  │ │
│  └──────────────┘  └──────────────┘  └──────────┘ │
│         │                  │                │      │
│         └──────────────────┴────────────────┘      │
│                         │                          │
│                    ┌────▼────┐                     │
│                    │ SQLite  │                     │
│                    │   DB    │                     │
│                    └────┬────┘                     │
│                         │                          │
│                    ┌────▼────────┐                 │
│                    │ Mosquitto   │                 │
│                    │ Sync Service│                 │
│                    └────┬────────┘                 │
└─────────────────────────┼──────────────────────────┘
                          │
              ┌───────────▼───────────┐
              │  Mosquitto Broker     │
              │                       │
              │  • password.txt       │
              │  • acl.txt            │
              └───────────┬───────────┘
                          │
              ┌───────────▼───────────┐
              │   GPS Tracking        │
              │   Devices             │
              │   (OwnTracks)         │
              └───────────────────────┘
```

### Datei-Struktur

```
location-tracker-app/
├── app/
│   ├── admin/
│   │   └── mqtt/
│   │       └── page.tsx              # MQTT Provisioning UI
│   └── api/
│       └── mqtt/
│           ├── credentials/          # Credentials Management
│           ├── acl/                  # ACL Management
│           └── sync/                 # Mosquitto Sync
├── lib/
│   ├── mqtt-db.ts                    # MQTT Datenbank Operations
│   ├── mqtt-subscriber.ts            # MQTT Message Processing
│   ├── mosquitto-sync.ts             # Config File Generation
│   └── startup.ts                    # Service Initialization
├── scripts/
│   └── add-mqtt-tables.js            # Datenbank Migration
├── docker-compose.yml                # Docker Setup
├── Dockerfile                        # App Container
├── mosquitto.conf                    # Mosquitto Config
└── instrumentation.ts                # Next.js Startup Hook
```

---

## ✨ Vorteile der Integration

### Vorher (Separate Systeme)

```
GPS Device → MQTT → n8n → HTTP API → location-tracker-app → UI
                     ↓
            mosquitto-automation (separate)
```

**Probleme:**
- n8n als zusätzliche Dependency
- Zwei separate Admin Panels
- Keine zentrale User/Device Verwaltung
- Komplexes Setup

### Nachher (Integriert)

```
GPS Device → MQTT → location-tracker-app → UI
                            ↓
                    (integriertes Provisioning)
```

**Vorteile:**
✅ Ein Admin Panel für alles
✅ Direkte MQTT Verarbeitung (schneller)
✅ Einfaches Docker Compose Setup
✅ Zentrale Datenbank
✅ Weniger Dependencies

---

## 🎉 Fertig!

Die Integration ist komplett. Du kannst jetzt:

1. **Devices verwalten** unter `/admin/devices`
2. **MQTT Credentials provisionieren** unter `/admin/mqtt`
3. **ACL Regeln definieren** im MQTT Panel
4. **Zu Mosquitto syncen** mit einem Klick
5. **GPS Tracking visualisieren** auf der Hauptseite

Bei Fragen oder Problemen: Siehe Troubleshooting oder check die Logs.

Happy Tracking! 🚀📍
