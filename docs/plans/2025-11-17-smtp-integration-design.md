# SMTP Integration Design

**Datum:** 2025-11-17
**Feature:** SMTP Integration für E-Mail-Versand (Welcome Mails & Password Reset)

## Übersicht

Integration eines flexiblen SMTP-Systems in die Location Tracker App für automatische E-Mail-Benachrichtigungen. Hybrid-Ansatz mit .env-Fallback und Admin-Panel-Konfiguration.

## Anforderungen

### Funktionale Anforderungen
- Welcome-E-Mails beim Erstellen neuer User
- Password-Reset-Flow für User
- SMTP-Konfiguration über Admin-Panel
- Live-Vorschau aller E-Mail-Templates
- Test-E-Mail-Versand zur Validierung
- Fallback auf .env wenn DB-Config leer

### Nicht-funktionale Anforderungen
- Verschlüsselte Speicherung von SMTP-Passwörtern
- Rate-Limiting für Test-E-Mails
- Fehlertoleranz (User-Erstellung funktioniert auch bei E-Mail-Fehler)
- Mobile-responsive Admin-UI

## Architektur

### 1. Datenbank-Schema

**Neue Tabelle: `settings`** (in `database.sqlite`)
```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**SMTP-Config als JSON in `settings.value`:**
```json
{
  "host": "smtp.gmail.com",
  "port": 587,
  "secure": false,
  "auth": {
    "user": "user@example.com",
    "pass": "encrypted_password_here"
  },
  "from": {
    "email": "noreply@example.com",
    "name": "Location Tracker"
  },
  "replyTo": "support@example.com",
  "timeout": 10000
}
```

**Neue Tabelle: `password_reset_tokens`** (in `database.sqlite`)
```sql
CREATE TABLE password_reset_tokens (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  used INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### 2. Umgebungsvariablen (.env)

Neue Variablen für Fallback-Config:
```env
# SMTP Configuration (Fallback)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=user@example.com
SMTP_PASS=password
SMTP_FROM_EMAIL=noreply@example.com
SMTP_FROM_NAME=Location Tracker

# Security
ENCRYPTION_KEY=<32-byte-hex-string>
```

### 3. API-Struktur

#### Admin-APIs (Authentifizierung erforderlich, role: admin)

**`GET /api/admin/settings/smtp`**
- Gibt aktuelle SMTP-Config zurück (Passwort maskiert)
- Response: `{ config: SMTPConfig | null, source: 'database' | 'env' }`

**`POST /api/admin/settings/smtp`**
- Speichert SMTP-Einstellungen in Datenbank
- Body: `SMTPConfig`
- Validiert alle Felder
- Verschlüsselt Passwort vor Speicherung

**`POST /api/admin/settings/smtp/test`**
- Testet SMTP-Verbindung ohne zu speichern
- Body: `{ config: SMTPConfig, testEmail: string }`
- Sendet Test-E-Mail an angegebene Adresse

**`GET /api/admin/emails/preview?template=welcome`**
- Rendert E-Mail-Template als HTML
- Query: `template` ("welcome" | "password-reset")
- Verwendet Beispiel-Daten

**`POST /api/admin/emails/send-test`**
- Sendet Test-E-Mail mit echtem Template
- Body: `{ template: string, email: string }`
- Rate-Limit: 5 pro Minute

#### Auth-APIs (Public)

**`POST /api/auth/forgot-password`**
- Body: `{ email: string }`
- Generiert Token, sendet Reset-E-Mail
- Response: Immer Success (Security: kein User-Enumeration)

**`POST /api/auth/reset-password`**
- Body: `{ token: string, newPassword: string }`
- Validiert Token, setzt neues Passwort
- Markiert Token als "used"

### 4. E-Mail-Service

**Zentrale Klasse: `EmailService`** (`/lib/email-service.ts`)

```typescript
class EmailService {
  async sendWelcomeEmail(user: User, temporaryPassword?: string): Promise<void>
  async sendPasswordReset(user: User, token: string): Promise<void>

  private async getConfig(): Promise<SMTPConfig>
  private async sendEmail(to: string, subject: string, html: string): Promise<void>
}
```

**Funktionsweise:**
1. Lädt SMTP-Config aus DB (Key: `smtp_config`)
2. Falls leer → Lädt aus .env
3. Entschlüsselt Passwort
4. Erstellt Nodemailer-Transport
5. Rendert React Email Template → HTML
6. Sendet E-Mail mit Fehlerbehandlung

### 5. React Email Templates

**Verzeichnisstruktur:**
```
/emails/
  ├── components/
  │   ├── email-layout.tsx      # Basis-Layout für alle E-Mails
  │   ├── email-header.tsx      # Header mit Logo
  │   └── email-footer.tsx      # Footer mit Links
  ├── welcome.tsx               # Welcome-E-Mail Template
  └── password-reset.tsx        # Password-Reset Template
```

**Template-Props:**
```typescript
// welcome.tsx
interface WelcomeEmailProps {
  username: string;
  loginUrl: string;
  temporaryPassword?: string;
}

// password-reset.tsx
interface PasswordResetEmailProps {
  username: string;
  resetUrl: string;
  expiresIn: string;
}
```

**Features:**
- Inline-Styles für maximale Kompatibilität
- Responsive Design
- Automatische Plain-Text-Alternative
- Wiederverwendbare Komponenten

### 6. Admin-Panel UI

#### Neue Navigation

Erweitere `/admin/layout.tsx`:
```typescript
const navigation = [
  { name: "Dashboard", href: "/admin" },
  { name: "Devices", href: "/admin/devices" },
  { name: "Users", href: "/admin/users" },
  { name: "Settings", href: "/admin/settings" },    // NEU
  { name: "Emails", href: "/admin/emails" },        // NEU
];
```

#### `/admin/settings` - SMTP-Konfiguration

**Layout:**
- Tab-Navigation: "SMTP Settings" (weitere Tabs vorbereitet)
- Formular mit Feldern:
  - Host (Text)
  - Port (Number)
  - Secure (Toggle: TLS/SSL)
  - Username (Text)
  - Password (Password, zeigt *** wenn gesetzt)
  - From Email (Email)
  - From Name (Text)
  - Reply-To (Email, optional)
  - Timeout (Number, ms)

**Buttons:**
- "Test Connection" → Modal für Test-E-Mail-Adresse
- "Save Settings" → Speichert in DB
- "Reset to Defaults" → Lädt .env-Werte

**Validierung:**
- Live-Validierung bei Eingabe
- Port: 1-65535
- E-Mail-Format prüfen
- Required-Felder markieren

#### `/admin/emails` - E-Mail-Vorschau

**Layout:**
- Links: Liste aller Templates
- Rechts: Live-Vorschau (iframe mit gerendertem HTML)
- Mobile: Gestapelt

**Features:**
- Template auswählen → Vorschau aktualisiert
- "Send Test Email" Button → Modal für E-Mail-Adresse
- "Edit Template" Link (führt zur Datei, Info-Text)

#### `/admin/users` - Erweiterungen

Neue Buttons pro User:
- "Resend Welcome Email"
- "Send Password Reset"

### 7. User-facing Pages

#### `/forgot-password`

**UI:**
- E-Mail-Eingabefeld
- "Send Reset Link" Button
- Link zurück zu `/login`

**Flow:**
1. User gibt E-Mail ein
2. POST zu `/api/auth/forgot-password`
3. Success-Message (immer, auch bei ungültiger E-Mail)
4. E-Mail mit Reset-Link wird versendet

#### `/reset-password?token=xxx`

**UI:**
- Neues Passwort eingeben (2x)
- "Reset Password" Button

**Validierung:**
- Token gültig?
- Token nicht abgelaufen?
- Token nicht bereits verwendet?
- Passwort-Stärke prüfen

**Flow:**
1. Token validieren (onLoad)
2. Bei ungültig: Fehler anzeigen
3. User gibt neues Passwort ein
4. POST zu `/api/auth/reset-password`
5. Erfolg → Redirect zu `/login`

#### `/login` - Erweiterung

Neuer Link unter Login-Form:
```tsx
<Link href="/forgot-password">Forgot Password?</Link>
```

## Sicherheit

### Verschlüsselung

**SMTP-Passwort:**
- Algorithmus: AES-256-GCM
- Key: `process.env.ENCRYPTION_KEY` (32-Byte-Hex)
- Verschlüsselt vor DB-Speicherung
- Entschlüsselt beim Abrufen

**Implementierung:** `/lib/crypto-utils.ts`
```typescript
function encrypt(text: string): string
function decrypt(encryptedText: string): string
```

### Authentifizierung & Autorisierung

- Alle `/api/admin/*` prüfen `next-auth` Session
- User muss `role: "admin"` haben
- Unauthorized → 401 Response

### Rate-Limiting

**Test-E-Mail-Versand:**
- Max. 5 Test-E-Mails pro Minute
- Pro IP-Adresse
- 429 Response bei Überschreitung

### Input-Validierung

- E-Mail-Adressen: RFC 5322 Format
- Port: 1-65535
- Timeout: > 0
- SQL-Injection-Schutz durch Prepared Statements

### Token-Sicherheit

**Password-Reset-Tokens:**
- UUID v4 (kryptografisch sicher)
- Gültigkeitsdauer: 1 Stunde
- One-Time-Use (used-Flag)
- Automatisches Cleanup alter Tokens (Cron-Job)

## Fehlerbehandlung

### E-Mail-Versand-Fehler

**Strategie: Fail-Soft**
- User-Erstellung schlägt NICHT fehl bei E-Mail-Fehler
- Fehler wird geloggt
- Admin-Benachrichtigung im Dashboard (später)
- "Resend" Option verfügbar

**Error-Logging:**
```typescript
console.error('[EmailService] Failed to send email:', {
  type: 'welcome' | 'password-reset',
  recipient: user.email,
  error: error.message
});
```

### SMTP-Verbindungsfehler

**Im Admin-Panel:**
- Detaillierte Fehlermeldung anzeigen
- Vorschläge zur Fehlerbehebung
- Link zur SMTP-Provider-Dokumentation

**Typische Fehler:**
- Authentication failed → Credentials prüfen
- Connection timeout → Firewall/Port prüfen
- TLS error → secure-Flag anpassen

## Testing

### Development

**Mailtrap/Ethereal für SMTP-Tests:**
```env
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=<ethereal-user>
SMTP_PASS=<ethereal-pass>
```

**React Email Dev-Server:**
```bash
npm run email:dev
```
Öffnet Browser mit Vorschau aller Templates

### Admin-Panel Testing

1. SMTP-Config eingeben
2. "Test Connection" klicken
3. Test-E-Mail-Adresse eingeben
4. E-Mail empfangen & Inhalt prüfen
5. "Save Settings" klicken
6. Page-Reload → Config bleibt erhalten

### Integration Testing

**Welcome-E-Mail:**
1. Neuen User in `/admin/users` erstellen
2. Welcome-E-Mail wird versendet
3. E-Mail empfangen & prüfen

**Password-Reset:**
1. `/forgot-password` öffnen
2. E-Mail eingeben & absenden
3. Reset-E-Mail empfangen
4. Link klicken → `/reset-password` öffnet
5. Neues Passwort setzen
6. Mit neuem Passwort einloggen

## Deployment

### Checklist

- [ ] `npm install` für neue Dependencies
- [ ] `ENCRYPTION_KEY` in `.env` generieren
- [ ] SMTP-Credentials in `.env` setzen (optional, Fallback)
- [ ] `npm run db:init:app` (neue Tabellen erstellen)
- [ ] Server-Neustart
- [ ] SMTP im Admin-Panel konfigurieren
- [ ] Test-E-Mail senden & empfangen
- [ ] Password-Reset-Flow einmal komplett testen

### Migration-Script

Erweitere `/scripts/init-database.js`:
```javascript
// Neue Tabellen erstellen
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at TEXT NOT NULL,
    used INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// Index für Performance
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_reset_tokens_user_id
  ON password_reset_tokens(user_id);
`);
```

## Dependencies

### NPM-Packages

```json
{
  "dependencies": {
    "nodemailer": "^6.9.8",
    "react-email": "^2.1.0",
    "@react-email/components": "^0.0.14"
  },
  "devDependencies": {
    "@types/nodemailer": "^6.4.14"
  }
}
```

### Scripts (package.json)

```json
{
  "scripts": {
    "email:dev": "email dev"
  }
}
```

## Dateistruktur

```
/location-tracker-app/
├── docs/
│   └── plans/
│       └── 2025-11-17-smtp-integration-design.md
├── emails/
│   ├── components/
│   │   ├── email-layout.tsx
│   │   ├── email-header.tsx
│   │   └── email-footer.tsx
│   ├── welcome.tsx
│   └── password-reset.tsx
├── lib/
│   ├── email-service.ts
│   ├── crypto-utils.ts
│   └── email-renderer.ts
├── app/
│   ├── admin/
│   │   ├── settings/
│   │   │   └── page.tsx
│   │   ├── emails/
│   │   │   └── page.tsx
│   │   └── users/
│   │       └── page.tsx (erweitern)
│   ├── forgot-password/
│   │   └── page.tsx
│   ├── reset-password/
│   │   └── page.tsx
│   └── api/
│       ├── admin/
│       │   ├── settings/
│       │   │   └── smtp/
│       │   │       ├── route.ts
│       │   │       └── test/route.ts
│       │   └── emails/
│       │       ├── preview/route.ts
│       │       └── send-test/route.ts
│       └── auth/
│           ├── forgot-password/route.ts
│           └── reset-password/route.ts
└── scripts/
    └── init-database.js (erweitern)
```

## Zukünftige Erweiterungen

### Phase 2 (Optional)
- Weitere E-Mail-Templates (Geofence-Alerts, Reports)
- E-Mail-Queue für Bulk-Versand
- E-Mail-Versand-Statistiken im Dashboard
- Attachments-Support
- Multiple SMTP-Provider (Failover)
- E-Mail-Template-Editor im Admin-Panel

### Phase 3 (Optional)
- Alternative zu SMTP: SendGrid/Mailgun/Resend API
- Webhook für E-Mail-Events (Delivered, Opened, Clicked)
- Unsubscribe-Verwaltung
- E-Mail-Preferences pro User

## Offene Fragen

- ✅ SMTP-Parameter: Erweiterte Konfiguration gewählt
- ✅ E-Mail-Bibliothek: Nodemailer gewählt
- ✅ Template-Engine: React Email gewählt
- ✅ Vorschau-Strategie: Live-Vorschau im Admin-Panel
- ✅ Config-Speicherung: Hybrid-Ansatz (DB + .env Fallback)

## Abnahmekriterien

- [ ] Admin kann SMTP-Settings im Panel konfigurieren
- [ ] Test-E-Mail-Versand funktioniert
- [ ] Welcome-E-Mail wird bei User-Erstellung gesendet
- [ ] Password-Reset-Flow funktioniert komplett
- [ ] E-Mail-Vorschau zeigt alle Templates korrekt an
- [ ] SMTP-Passwort wird verschlüsselt gespeichert
- [ ] Fallback auf .env funktioniert
- [ ] Fehlerbehandlung zeigt sinnvolle Meldungen
- [ ] Mobile-responsive Admin-UI
- [ ] Alle Tests erfolgreich
