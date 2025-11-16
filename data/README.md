# Database Directory

This directory contains SQLite database files for the application.

## Initial Setup

After cloning the repository, initialize the databases:

```bash
# Initialize BOTH databases (recommended)
npm run db:init

# Or initialize them separately:
npm run db:init:app        # Creates database.sqlite (User + Device tables)
npm run db:init:locations  # Creates locations.sqlite (Location cache)
```

**Default admin credentials:**
- Username: `admin`
- Password: `admin123`

**Default devices:**
- Device 10: "Joachim Pixel" (red #e74c3c)
- Device 11: "Huawei Smartphone" (blue #3498db)

## Database Files

- `database.sqlite` - User accounts and device configuration (critical)
- `locations.sqlite` - Location tracking cache (disposable, can be regenerated)
- `.gitkeep` - Ensures this directory exists in git

**Note:** Database files (*.db, *.sqlite) are NOT tracked in git to avoid conflicts.
Only the schema (via init scripts) is versioned.

## Maintenance

```bash
# Clean up old location data (keeps last 7 days)
npm run db:cleanup:7d

# Clean up old location data (keeps last 30 days)
npm run db:cleanup:30d

# Get database statistics
curl http://localhost:3000/api/locations/ingest
```

## Backup Strategy

**database.sqlite** (critical):
- Daily automated backups recommended
- Contains user accounts and device configurations
- Keep 30-day retention

**locations.sqlite** (cache):
- Optional backups
- Can be regenerated from NocoDB if needed
- Or use automatic cleanup to keep size manageable
