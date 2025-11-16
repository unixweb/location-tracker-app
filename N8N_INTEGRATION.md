# n8n Integration Anleitung

## Übersicht

Die poc-app verwendet nun eine **Dual-Datenbank-Architektur** mit lokalem SQLite-Caching:

- **database.sqlite** - Benutzerkonten, Geräteverwaltung (kritische Daten, wenige Schreibvorgänge)
- **locations.sqlite** - Standortverfolgung Cache (viele Schreibvorgänge, temporär)

Diese Architektur bietet:
- **Performance**: Schnelle Abfragen aus lokalem SQLite anstatt NocoDB API
- **Skalierbarkeit**: Unbegrenzter Verlauf ohne Paginierungslimits
- **Resilienz**: Auth-System isoliert von der Tracking-Datenbank
- **Flexibilität**: Einfaches Löschen alter Daten

---

## Erforderliche n8n Workflow-Änderungen

### Aktueller Flow (ALT)

```
MQTT Trigger (owntracks/#)
    ↓
MQTT Location verarbeiten (Parse & Transform)
    ↓
Speichere in NocoDB
```

### Neuer Flow (ERFORDERLICH)

```
MQTT Trigger (owntracks/#)
    ↓
MQTT Location verarbeiten (Parse & Transform)
    ↓
Speichere in NocoDB
    ↓
[NEU] Push to Next.js Cache (HTTP Request)
```

---

## Schritt-für-Schritt: HTTP Request Node hinzufügen

### 1. HTTP Request Node hinzufügen

Nach dem "Speichere in NocoDB" Node einen neuen **HTTP Request** Node hinzufügen:

**Node-Konfiguration:**
- **Name**: "Push to Next.js Cache"
- **Methode**: POST
- **URL**: `https://deine-nextjs-domain.com/api/locations/ingest`
- **Authentifizierung**: None (API-Key in Produktion hinzufügen!)
- **Body Content Type**: JSON
- **Specify Body**: Using Fields Below

### 2. Felder zuordnen

Im Bereich "Body Parameters" die folgenden Felder zuordnen:

| Parameter | Wert (Expression) | Beschreibung |
|-----------|-------------------|-------------|
| `latitude` | `{{ $json.latitude }}` | Geografischer Breitengrad |
| `longitude` | `{{ $json.longitude }}` | Geografischer Längengrad |
| `timestamp` | `{{ $json.timestamp }}` | ISO 8601 Zeitstempel |
| `user_id` | `{{ $json.user_id }}` | Benutzer-ID (0 für MQTT) |
| `first_name` | `{{ $json.first_name }}` | Tracker ID |
| `last_name` | `{{ $json.last_name }}` | Quelltyp |
| `username` | `{{ $json.username }}` | Geräte-Benutzername |
| `marker_label` | `{{ $json.marker_label }}` | Anzeige-Label |
| `display_time` | `{{ $json.display_time }}` | Formatierte Zeit |
| `chat_id` | `{{ $json.chat_id }}` | Chat-ID (0 für MQTT) |
| `battery` | `{{ $json.battery }}` | Batterieprozent |
| `speed` | `{{ $json.speed }}` | Geschwindigkeit (m/s) |

### 3. Fehlerbehandlung (Optional aber empfohlen)

Einen **Error Trigger** Node hinzufügen, um fehlgeschlagene API-Aufrufe zu behandeln:

- **Workflow**: Current Workflow
- **Error Type**: All Errors
- **Connected to**: Push to Next.js Cache node

Einen **Slack/Email** Benachrichtigungs-Node hinzufügen, um über Fehler informiert zu werden.

---

## Beispiel n8n HTTP Request Node (JSON)

```json
{
  "parameters": {
    "method": "POST",
    "url": "https://deine-domain.com/api/locations/ingest",
    "authentication": "none",
    "options": {},
    "bodyParametersJson": "={{ {\n  \"latitude\": $json.latitude,\n  \"longitude\": $json.longitude,\n  \"timestamp\": $json.timestamp,\n  \"user_id\": $json.user_id,\n  \"first_name\": $json.first_name,\n  \"last_name\": $json.last_name,\n  \"username\": $json.username,\n  \"marker_label\": $json.marker_label,\n  \"display_time\": $json.display_time,\n  \"chat_id\": $json.chat_id,\n  \"battery\": $json.battery,\n  \"speed\": $json.speed\n} }}"
  },
  "name": "Push to Next.js Cache",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.1,
  "position": [1200, 300]
}
```

---

## Testen

### 1. Ingest-Endpunkt testen

```bash
curl -X POST https://deine-domain.com/api/locations/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 48.1351,
    "longitude": 11.5820,
    "timestamp": "2024-01-15T10:30:00Z",
    "user_id": 0,
    "username": "10",
    "marker_label": "Test Gerät",
    "battery": 85,
    "speed": 2.5
  }'
```

Erwartete Antwort:
```json
{
  "success": true,
  "inserted": 1,
  "message": "Successfully stored 1 location(s)"
}
```

### 2. Daten überprüfen

```bash
curl https://deine-domain.com/api/locations?username=10&timeRangeHours=1
```

### 3. Statistiken prüfen

```bash
curl https://deine-domain.com/api/locations/ingest
```

---

## Produktions-Überlegungen

### 1. API-Key-Authentifizierung hinzufügen

**Aktualisieren** von `app/api/locations/ingest/route.ts`:

```typescript
export async function POST(request: NextRequest) {
  // API-Key validieren
  const apiKey = request.headers.get('x-api-key');
  if (apiKey !== process.env.N8N_API_KEY) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // ... restlicher Code
}
```

**n8n HTTP Request Node aktualisieren:**
- Header hinzufügen: `x-api-key` = `dein-secret-key`

### 2. Automatisches Aufräumen einrichten

Einen Cron-Job hinzufügen, um alte Daten zu löschen (hält die Datenbankgröße überschaubar):

```bash
# /etc/crontab
# Tägliche Bereinigung um 2 Uhr morgens - löscht Daten älter als 7 Tage
0 2 * * * cd /pfad/zu/poc-app && node scripts/cleanup-old-locations.js 168
```

Oder verwende einen systemd Timer, PM2 Cron oder ähnliches.

### 3. Datenbankgröße überwachen

```bash
# Datenbankstatistiken prüfen
curl https://deine-domain.com/api/locations/ingest

# Erwartete Ausgabe:
# {
#   "total": 5432,
#   "oldest": "2024-01-08T10:00:00Z",
#   "newest": "2024-01-15T10:30:00Z",
#   "sizeKB": 1024
# }
```

### 4. Backup-Strategie

**database.sqlite** (kritisch):
- Tägliche automatisierte Backups
- 30-Tage Aufbewahrung

**locations.sqlite** (Cache):
- Optional: Wöchentliche Backups
- Oder keine Backups (Daten existieren in NocoDB)

---

## Migration: Vorhandene NocoDB-Daten importieren

Falls du bereits Standortdaten in NocoDB hast, kannst du diese importieren:

### Option 1: CSV aus NocoDB exportieren

1. Daten aus NocoDB als CSV exportieren
2. In JSON konvertieren
3. In Batches an `/api/locations/ingest` senden (POST)

### Option 2: Direkter NocoDB API Import (empfohlen)

Ein Skript `scripts/import-from-nocodb.js` erstellen:

```javascript
const fetch = require('node-fetch');
const { locationDb } = require('../lib/db');

async function importFromNocoDB() {
  // Alle Daten von NocoDB API abrufen
  const response = await fetch('https://n8n.unixweb.home64.de/webhook/location');
  const data = await response.json();

  // Bulk-Insert in locations.sqlite
  const count = locationDb.createMany(data.history);
  console.log(`Importiert: ${count} Standorte`);
}

importFromNocoDB().catch(console.error);
```

Ausführen: `node scripts/import-from-nocodb.js`

---

## Fehlerbehebung

### Problem: "directory does not exist" Fehler

**Lösung**: Init-Skript ausführen:
```bash
cd poc-app
node scripts/init-locations-db.js
```

### Problem: n8n gibt 500-Fehler beim Push zu Next.js zurück

**Prüfen**:
1. Next.js App läuft und ist erreichbar
2. URL in n8n ist korrekt
3. Next.js Logs prüfen: `pm2 logs` oder `docker logs`

### Problem: Keine Daten im Frontend sichtbar

**Überprüfen**:
1. Daten sind in SQLite: `curl https://deine-domain.com/api/locations/ingest`
2. API gibt Daten zurück: `curl https://deine-domain.com/api/locations`
3. Browser-Konsole auf Fehler prüfen

### Problem: Datenbank wird zu groß

**Lösung**: Cleanup-Skript ausführen:
```bash
node scripts/cleanup-old-locations.js 168  # Behalte 7 Tage
```

Oder die Aufbewahrungsdauer im Cron-Job reduzieren.

---

## Architektur-Diagramm

```
┌─────────────────┐
│  OwnTracks App  │
└────────┬────────┘
         │ MQTT
         ▼
┌─────────────────┐
│  MQTT Broker    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   n8n Workflow  │
│                 │
│  1. Parse MQTT  │
│  2. Save NocoDB │───────────┐
│  3. Push Next.js│            │
└────────┬────────┘            │
         │                     │
         │ HTTP POST           │ (Backup)
         ▼                     ▼
┌─────────────────┐    ┌──────────────┐
│  Next.js API    │    │   NocoDB     │
│  /api/locations │    │  (Cloud DB)  │
│      /ingest    │    └──────────────┘
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ locations.sqlite│ (Lokaler Cache)
│  - Schnelle     │
│    Abfragen     │
│  - Auto Cleanup │
│  - Isoliert     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Frontend API   │
│  /api/locations │
│  (Read-only)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Map UI        │
│  - 24h Verlauf  │
│  - Schnelle     │
│    Filter       │
│  - Echtzeit     │
└─────────────────┘
```

---

## Zusammenfassung

✅ **Dual-Datenbank** isoliert kritische Auth von hochvolumiger Standortverfolgung
✅ **Lokaler Cache** ermöglicht schnelle 24h+ Abfragen ohne NocoDB-Paginierungslimits
✅ **WAL-Modus** bietet Absturzsicherheit und bessere Nebenläufigkeit
✅ **Auto Cleanup** hält die Datenbankgröße überschaubar
✅ **Rückwärtskompatibel** - gleiches API-Antwortformat wie n8n Webhook

🚀 **Die Next.js App ist jetzt produktionsreif mit unbegrenztem Standortverlauf!**
