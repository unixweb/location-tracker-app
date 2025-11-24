# OwnTracks App Setup Anleitung

## Übersicht

Diese Anleitung erklärt Schritt-für-Schritt, wie Sie die OwnTracks App auf Ihrem Smartphone installieren und mit dem Location Tracker System verbinden.

---

## 1. Installation

### iOS (iPhone/iPad)
1. Öffnen Sie den **App Store**
2. Suchen Sie nach **"OwnTracks"**
3. Laden Sie die App herunter und installieren Sie sie
4. App-Link: https://apps.apple.com/app/owntracks/id692424691

### Android
1. Öffnen Sie den **Google Play Store**
2. Suchen Sie nach **"OwnTracks"**
3. Laden Sie die App herunter und installieren Sie sie
4. App-Link: https://play.google.com/store/apps/details?id=org.owntracks.android

---

## 2. MQTT Credentials erhalten

Bevor Sie die App konfigurieren können, benötigen Sie Ihre MQTT-Zugangsdaten:

1. Melden Sie sich im **Location Tracker** an: `http://192.168.10.118:3000/login`
2. Navigieren Sie zu: **Admin → MQTT Provisioning** (`/admin/mqtt`)
3. Klicken Sie auf **"Device Provisionieren"**
4. Wählen Sie Ihr Device aus der Liste
5. Aktivieren Sie **"Automatisch Username & Passwort generieren"**
6. Klicken Sie auf **"Erstellen"**
7. **WICHTIG:** Kopieren Sie sofort die angezeigten Credentials:
   ```
   Username: device_10_abc123
   Password: xxxxxxxxxxxxxxxx
   ```
8. Speichern Sie diese Daten sicher - das Passwort wird nur einmal angezeigt!

---

## 3. OwnTracks App Konfiguration

### Schritt 1: App öffnen
Starten Sie die OwnTracks App auf Ihrem Smartphone.

### Schritt 2: Zu Einstellungen navigieren
- **iOS:** Tippen Sie auf das ⚙️ Symbol (oben rechts)
- **Android:** Tippen Sie auf ☰ (Hamburger-Menü) → Einstellungen

### Schritt 3: Verbindung konfigurieren

#### 3.1 Modus auswählen
1. Gehen Sie zu **"Verbindung"** oder **"Connection"**
2. Wählen Sie **"Modus"** → **"MQTT"**
   - ✅ **MQTT** (Private Server)
   - ❌ Nicht: HTTP oder andere Modi

#### 3.2 MQTT Server-Einstellungen

Tragen Sie folgende Werte ein:

| Einstellung | Wert | Beschreibung |
|------------|------|--------------|
| **Hostname** | `192.168.10.118` | IP-Adresse Ihres Servers |
| **Port** | `1883` | Standard MQTT Port (ohne Websocket) |
| **Websockets nutzen** | ❌ **DEAKTIVIERT** | Websockets nur bei Port 9001 aktivieren |
| **TLS** | ❌ **DEAKTIVIERT** | TLS/SSL nicht aktivieren (lokales Netzwerk) |
| **Client ID** | Automatisch generiert | Kann leer gelassen werden |

#### 3.3 Authentifizierung

| Einstellung | Wert | Beispiel |
|------------|------|----------|
| **Benutzername** | Ihr MQTT Username | `device_10_f06e935e` |
| **Passwort** | Ihr MQTT Passwort | `n5DkMF+xEi9p56DFa7ewUg==` |

#### 3.4 Device Identifikation

| Einstellung | Wert | Beschreibung |
|------------|------|--------------|
| **Geräte ID** / **Device ID** | `10` | Muss mit Ihrer Device-ID im System übereinstimmen |
| **Tracker ID** | `10` | Identisch mit Device ID |

**WICHTIG:** Die Device ID und Tracker ID müssen mit der Device-ID übereinstimmen, die Sie im Location Tracker System konfiguriert haben (z.B. `10`, `11`, `12`, `15`).

---

## 4. Erweiterte Einstellungen (Optional)

### 4.1 Standort-Tracking Einstellungen

**Empfohlene Werte für präzises Tracking:**

| Einstellung | Empfohlener Wert | Beschreibung |
|------------|------------------|--------------|
| **Monitoring Modus** | Significant Changes | Spart Akku, trackt bei größeren Bewegungen |
| **Move Intervall** | 60 Sekunden | Sendet alle 60 Sekunden bei Bewegung |
| **Standby Intervall** | 300 Sekunden | Sendet alle 5 Minuten im Ruhezustand |

### 4.2 Benachrichtigungen

- **iOS:** Erlauben Sie Standortzugriff "Immer" für Hintergrund-Tracking
- **Android:** Aktivieren Sie "Standortzugriff im Hintergrund"

### 4.3 Akkuoptimierung (Android)

**WICHTIG für zuverlässiges Tracking:**
1. Gehen Sie zu **Systemeinstellungen → Apps → OwnTracks**
2. Wählen Sie **"Akku"** oder **"Akkuoptimierung"**
3. Wählen Sie **"Nicht optimieren"** oder deaktivieren Sie Akkuoptimierung
4. Dies verhindert, dass Android die App im Hintergrund beendet

---

## 5. Verbindung testen

### Schritt 1: Verbindung prüfen
1. Kehren Sie zum OwnTracks Hauptbildschirm zurück
2. Sie sollten ein **grünes Symbol** oder "Connected" sehen
3. Bei Problemen: Rotes Symbol oder "Disconnected"

### Schritt 2: Testpunkt senden
1. Tippen Sie auf den **Location-Button** (Fadenkreuz-Symbol)
2. Dies sendet sofort Ihre aktuelle Position

### Schritt 3: Im Location Tracker prüfen
1. Öffnen Sie den Location Tracker im Browser: `http://192.168.10.118:3000/map`
2. Ihre Position sollte jetzt auf der Karte erscheinen
3. Bei erfolgreicher Verbindung sehen Sie:
   - Marker mit Ihrer Device-Farbe
   - Aktuelle Koordinaten
   - Zeitstempel der letzten Position

---

## 6. Port 1883 vs. Port 9001 - Was ist der Unterschied?

### Port 1883 (Standard MQTT)
- **Protokoll:** Standard MQTT (TCP)
- **Verwendung:** Normale MQTT-Clients (OwnTracks, IoT-Geräte)
- **Websockets:** ❌ Nein
- **Empfohlen für:** Mobile Apps, eingebettete Geräte

**Konfiguration:**
```
Port: 1883
Websockets: DEAKTIVIERT
```

### Port 9001 (MQTT over WebSockets)
- **Protokoll:** MQTT über WebSocket
- **Verwendung:** Browser-basierte Clients, Web-Anwendungen
- **Websockets:** ✅ Ja
- **Empfohlen für:** Web-Apps, JavaScript-Clients

**Konfiguration:**
```
Port: 9001
Websockets: AKTIVIERT
```

### Welchen Port sollten Sie verwenden?

| Client-Typ | Empfohlener Port | Websockets |
|-----------|------------------|------------|
| **OwnTracks App (iOS/Android)** | **1883** | ❌ Nein |
| **Browser/Web-App** | **9001** | ✅ Ja |
| **IoT-Geräte** | **1883** | ❌ Nein |
| **Node.js/Python Scripts** | **1883** | ❌ Nein |

**Für die OwnTracks Mobile App verwenden Sie immer Port 1883 ohne Websockets!**

---

## 7. Troubleshooting - Häufige Probleme

### Problem: "Verbindung fehlgeschlagen"

**Mögliche Ursachen und Lösungen:**

#### 1. Falsche IP-Adresse oder Port
- ✅ **Lösung:** Überprüfen Sie Hostname: `192.168.10.118` und Port: `1883`
- Stellen Sie sicher, dass Ihr Smartphone im selben Netzwerk ist

#### 2. TLS aktiviert (sollte deaktiviert sein)
- ✅ **Lösung:** Deaktivieren Sie TLS/SSL in den Verbindungseinstellungen
- Lokale Verbindungen benötigen kein TLS

#### 3. Websockets fälschlicherweise aktiviert
- ✅ **Lösung:** Deaktivieren Sie "Websockets nutzen" bei Port 1883
- Websockets nur bei Port 9001 verwenden

#### 4. Falsche Credentials
- ✅ **Lösung:** Überprüfen Sie Username und Passwort
- Regenerieren Sie ggf. das Passwort über `/admin/mqtt`

#### 5. Firewall blockiert Port 1883
- ✅ **Lösung:** Prüfen Sie Firewall-Einstellungen auf dem Server
- Port 1883 muss für eingehende Verbindungen geöffnet sein

### Problem: "Verbunden, aber keine Daten auf der Karte"

**Mögliche Ursachen:**

#### 1. Falsche Device ID / Tracker ID
- ✅ **Lösung:** Device ID und Tracker ID müssen mit dem konfigurierten Device im System übereinstimmen
- Beispiel: Wenn Sie "Device 10" provisioniert haben, muss Tracker ID `10` sein

#### 2. Standortberechtigungen nicht erteilt
- ✅ **Lösung (iOS):** Einstellungen → Datenschutz → Ortungsdienste → OwnTracks → "Immer"
- ✅ **Lösung (Android):** App-Einstellungen → Berechtigungen → Standort → "Immer zulassen"

#### 3. Akkuoptimierung beendet App (Android)
- ✅ **Lösung:** Akkuoptimierung für OwnTracks deaktivieren (siehe Abschnitt 4.3)

### Problem: "Tracking stoppt im Hintergrund"

**Lösungen:**

#### iOS
1. Einstellungen → Allgemein → Hintergrundaktualisierung → OwnTracks aktivieren
2. Standortzugriff: "Immer" (nicht "Beim Verwenden der App")

#### Android
1. Akkuoptimierung deaktivieren
2. Einstellungen → Apps → OwnTracks → Berechtigungen → Standort → "Immer zulassen"
3. Bei manchen Herstellern: "Autostart" erlauben

---

## 8. Sicherheitshinweise

### WICHTIG - Nur im lokalen Netzwerk verwenden!

**Aktuelle Konfiguration ist NICHT für öffentliches Internet geeignet:**

- ❌ **TLS ist deaktiviert** - Daten werden unverschlüsselt übertragen
- ❌ **Keine VPN-Verbindung** - Direkter Zugriff erforderlich
- ⚠️ **Nur im sicheren WLAN** verwenden

### Für Zugriff von außerhalb:

Wenn Sie von außerhalb Ihres Heimnetzwerks zugreifen möchten, sollten Sie:

1. **VPN einrichten** (z.B. WireGuard, OpenVPN)
2. **TLS/SSL aktivieren** für verschlüsselte Verbindung
3. **Starke Passwörter verwenden** (automatisch generiert durch System)
4. **Firewall korrekt konfigurieren** (nur VPN-Zugriff)

---

## 9. Konfigurationsübersicht

### ✅ Korrekte Konfiguration für OwnTracks Mobile App

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Verbindungseinstellungen
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Modus:              MQTT
Hostname:           192.168.10.118
Port:               1883
Websockets nutzen:  ❌ NEIN
TLS:                ❌ NEIN
Client ID:          (automatisch)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Authentifizierung
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Benutzername:       device_XX_xxxxxxxx
Passwort:           ******************

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Device Identifikation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Geräte ID:          10 (Beispiel)
Tracker ID:         10 (identisch)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 10. Schnellstart-Checkliste

- [ ] OwnTracks App aus App Store / Play Store installiert
- [ ] MQTT Credentials über `/admin/mqtt` generiert
- [ ] Credentials sicher gespeichert
- [ ] **Modus auf MQTT** gesetzt
- [ ] **Hostname:** `192.168.10.118` eingetragen
- [ ] **Port:** `1883` eingetragen
- [ ] **Websockets:** ❌ Deaktiviert
- [ ] **TLS:** ❌ Deaktiviert
- [ ] **Benutzername** und **Passwort** eingetragen
- [ ] **Device ID** und **Tracker ID** korrekt gesetzt
- [ ] Standortberechtigungen "Immer" erteilt
- [ ] Akkuoptimierung deaktiviert (Android)
- [ ] Verbindung erfolgreich (grünes Symbol)
- [ ] Testpunkt gesendet
- [ ] Position auf Karte sichtbar unter `/map`

---

## 11. Weiterführende Informationen

### Offizielle OwnTracks Dokumentation
- Website: https://owntracks.org
- Dokumentation: https://owntracks.org/booklet/
- GitHub: https://github.com/owntracks

### Location Tracker System
- Dashboard: `http://192.168.10.118:3000/admin`
- Live-Karte: `http://192.168.10.118:3000/map`
- MQTT Provisioning: `http://192.168.10.118:3000/admin/mqtt`

---

## Support

Bei Problemen oder Fragen:
1. Überprüfen Sie zuerst die Troubleshooting-Sektion (Abschnitt 7)
2. Prüfen Sie die Verbindung im Location Tracker Dashboard
3. Kontrollieren Sie die Server-Logs auf Fehler

**Wichtige Logs prüfen:**
```bash
# Next.js Server Logs
npm run dev

# Mosquitto MQTT Broker Logs
docker logs mosquitto
```
