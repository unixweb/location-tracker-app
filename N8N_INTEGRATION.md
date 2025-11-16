# n8n Integration Guide

## Overview

The poc-app now uses a **dual-database architecture** with local SQLite caching:

- **database.sqlite** - User accounts, device management (critical data, few writes)
- **locations.sqlite** - Location tracking cache (high-volume writes, disposable)

This architecture provides:
- **Performance**: Fast queries from local SQLite instead of NocoDB API
- **Scalability**: Unlimited history without pagination limits
- **Resilience**: Auth system isolated from tracking database
- **Flexibility**: Easy cleanup of old data

---

## Required n8n Workflow Changes

### Current Flow (OLD)

```
MQTT Trigger (owntracks/#)
    ↓
MQTT Location verarbeiten (Parse & Transform)
    ↓
Speichere in NocoDB
```

### New Flow (REQUIRED)

```
MQTT Trigger (owntracks/#)
    ↓
MQTT Location verarbeiten (Parse & Transform)
    ↓
Speichere in NocoDB
    ↓
[NEW] Push to Next.js Cache (HTTP Request)
```

---

## Step-by-Step: Add HTTP Request Node

### 1. Add HTTP Request Node

After the "Speichere in NocoDB" node, add a new **HTTP Request** node:

**Node Configuration:**
- **Name**: "Push to Next.js Cache"
- **Method**: POST
- **URL**: `https://your-nextjs-domain.com/api/locations/ingest`
- **Authentication**: None (add API key in production!)
- **Body Content Type**: JSON
- **Specify Body**: Using Fields Below

### 2. Map Fields

In the "Body Parameters" section, map the following fields:

| Parameter | Value (Expression) | Description |
|-----------|-------------------|-------------|
| `latitude` | `{{ $json.latitude }}` | Geographic latitude |
| `longitude` | `{{ $json.longitude }}` | Geographic longitude |
| `timestamp` | `{{ $json.timestamp }}` | ISO 8601 timestamp |
| `user_id` | `{{ $json.user_id }}` | User ID (0 for MQTT) |
| `first_name` | `{{ $json.first_name }}` | Tracker ID |
| `last_name` | `{{ $json.last_name }}` | Source type |
| `username` | `{{ $json.username }}` | Device username |
| `marker_label` | `{{ $json.marker_label }}` | Display label |
| `display_time` | `{{ $json.display_time }}` | Formatted time |
| `chat_id` | `{{ $json.chat_id }}` | Chat ID (0 for MQTT) |
| `battery` | `{{ $json.battery }}` | Battery percentage |
| `speed` | `{{ $json.speed }}` | Velocity (m/s) |

### 3. Error Handling (Optional but Recommended)

Add an **Error Trigger** node to handle failed API calls:

- **Workflow**: Current Workflow
- **Error Type**: All Errors
- **Connected to**: Push to Next.js Cache node

Add a **Slack/Email** notification to alert you of failures.

---

## Example n8n HTTP Request Node (JSON)

```json
{
  "parameters": {
    "method": "POST",
    "url": "https://your-domain.com/api/locations/ingest",
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

## Testing

### 1. Test the Ingest Endpoint

```bash
curl -X POST https://your-domain.com/api/locations/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 48.1351,
    "longitude": 11.5820,
    "timestamp": "2024-01-15T10:30:00Z",
    "user_id": 0,
    "username": "10",
    "marker_label": "Test Device",
    "battery": 85,
    "speed": 2.5
  }'
```

Expected response:
```json
{
  "success": true,
  "inserted": 1,
  "message": "Successfully stored 1 location(s)"
}
```

### 2. Verify Data

```bash
curl https://your-domain.com/api/locations?username=10&timeRangeHours=1
```

### 3. Check Stats

```bash
curl https://your-domain.com/api/locations/ingest
```

---

## Production Considerations

### 1. Add API Key Authentication

**Update** `app/api/locations/ingest/route.ts`:

```typescript
export async function POST(request: NextRequest) {
  // Validate API key
  const apiKey = request.headers.get('x-api-key');
  if (apiKey !== process.env.N8N_API_KEY) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // ... rest of the code
}
```

**Update n8n HTTP Request Node:**
- Add Header: `x-api-key` = `your-secret-key`

### 2. Set Up Automatic Cleanup

Add a cron job to delete old data (keeps database size manageable):

```bash
# /etc/crontab
# Daily cleanup at 2 AM - delete data older than 7 days
0 2 * * * cd /path/to/poc-app && node scripts/cleanup-old-locations.js 168
```

Or use a systemd timer, PM2 cron, or similar.

### 3. Monitor Database Size

```bash
# Check database stats
curl https://your-domain.com/api/locations/ingest

# Expected output:
# {
#   "total": 5432,
#   "oldest": "2024-01-08T10:00:00Z",
#   "newest": "2024-01-15T10:30:00Z",
#   "sizeKB": 1024
# }
```

### 4. Backup Strategy

**database.sqlite** (critical):
- Daily automated backups
- Keep 30-day retention

**locations.sqlite** (cache):
- Optional: Weekly backups
- Or no backups (data exists in NocoDB)

---

## Migration: Importing Existing NocoDB Data

If you have existing location data in NocoDB, you can import it:

### Option 1: Export CSV from NocoDB

1. Export data from NocoDB as CSV
2. Convert to JSON
3. POST to `/api/locations/ingest` in batches

### Option 2: Direct NocoDB API Import (recommended)

Create a script `scripts/import-from-nocodb.js`:

```javascript
const fetch = require('node-fetch');
const { locationDb } = require('../lib/db');

async function importFromNocoDB() {
  // Fetch all data from NocoDB API
  const response = await fetch('https://n8n.unixweb.home64.de/webhook/location');
  const data = await response.json();

  // Bulk insert into locations.sqlite
  const count = locationDb.createMany(data.history);
  console.log(`Imported ${count} locations`);
}

importFromNocoDB().catch(console.error);
```

Run: `node scripts/import-from-nocodb.js`

---

## Troubleshooting

### Issue: "directory does not exist" error

**Solution**: Run the init script:
```bash
cd poc-app
node scripts/init-locations-db.js
```

### Issue: n8n returns 500 error when pushing to Next.js

**Check**:
1. Next.js app is running and accessible
2. URL in n8n is correct
3. Check Next.js logs: `pm2 logs` or `docker logs`

### Issue: No data appearing in frontend

**Verify**:
1. Data is in SQLite: `curl https://your-domain.com/api/locations/ingest`
2. API returns data: `curl https://your-domain.com/api/locations`
3. Check browser console for errors

### Issue: Database growing too large

**Solution**: Run cleanup script:
```bash
node scripts/cleanup-old-locations.js 168  # Keep 7 days
```

Or reduce retention period in cron job.

---

## Architecture Diagram

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
│ locations.sqlite│ (Local Cache)
│  - Fast queries │
│  - Auto cleanup │
│  - Isolated     │
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
│  - 24h history  │
│  - Fast filters │
│  - Real-time    │
└─────────────────┘
```

---

## Summary

✅ **Dual database** isolates critical auth from high-volume tracking
✅ **Local cache** enables fast 24h+ queries without NocoDB pagination limits
✅ **WAL mode** provides crash resilience and better concurrency
✅ **Auto cleanup** keeps database size manageable
✅ **Backward compatible** - same API response format as n8n webhook

🚀 **Next.js app is now production-ready with unlimited location history!**
