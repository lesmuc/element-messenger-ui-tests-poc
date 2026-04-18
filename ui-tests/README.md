# element-ui-tests

Webdriver.io + TypeScript UI-Tests gegen Element-Web, aufgebaut als Multi-Platform-Projekt.
Phase 1 (dieser Stand): **Web**. Phase 2: Android via Appium. Phase 3: iOS via Appium.

## Voraussetzungen

- Docker Desktop (oder Colima / OrbStack), läuft
- Node.js ≥ 20
- Google Chrome auf dem Host (wird von wdio 9 über den eingebauten Chromedriver verwendet)

## Setup

```bash
cd ui-tests
npm install
npm run synapse:setup   # erzeugt + patcht synapse/data/homeserver.yaml (idempotent)
```

`synapse:setup` ruft intern `docker compose run --rm synapse generate` auf und
hängt die Test-Einstellungen (registration on, encryption off, hohe Rate-Limits)
an. Mehrfach aufrufbar, bestehende Konfig wird nicht zerstört.

## Tests ausführen

```bash
npm run synapse:up      # Synapse + Element-Web starten
npm run test:web        # wdio-Testsuite laufen lassen (headless)
npm run synapse:down    # aufräumen
```

## CI

Der Workflow `.github/workflows/ui-tests-web.yml` führt dieselbe Kette auf
jedem PR und Push auf `master`/`main` aus (Ubuntu-Runner). Änderungen
außerhalb von `ui-tests/` triggern ihn nicht.

Mit sichtbarem Browser:

```bash
HEADED=1 npm run test:web
```

## Aufbau

```
ui-tests/
├── docker-compose.yml           # Synapse + Element-Web
├── synapse/data/                # generierte Synapse-Config
├── element-web/config.json      # zeigt auf http://localhost:8008
├── config/
│   ├── wdio.shared.conf.ts      # Mocha, Reporter, Timeouts
│   ├── wdio.web.conf.ts         # multiremote: alice + bob (Chrome × 2)
│   ├── wdio.android.conf.ts     # Phase-2-Platzhalter
│   └── wdio.ios.conf.ts         # Phase-3-Platzhalter
├── test/
│   ├── helpers/synapse-admin.ts # Account-Registrierung via Admin-API
│   ├── pageobjects/
│   │   ├── web/                 # Phase 1: login, room
│   │   ├── android/             # Phase 2
│   │   └── ios/                 # Phase 3
│   └── specs/
│       ├── web/send-message.spec.ts
│       ├── android/             # Phase 2
│       └── ios/                 # Phase 3
└── apps/
    ├── android/                 # Phase 2: Debug-APK ablegen
    └── ios/                     # Phase 3: Debug-.app ablegen
```

## Test-Flow (Phase 1)

`test/specs/web/send-message.spec.ts`:

**Setup (via Matrix Client-Server API — folgt Element-Webs eigener Best-Practice „minimize UI driving for setup"):**
1. Admin-Helper registriert `alice_<ts>` und `bob_<ts>` via Synapse-Admin-API.
2. Alice legt via `/_matrix/client/v3/createRoom` einen unverschlüsselten Raum an und lädt Bob ein.
3. Bob tritt via `/_matrix/client/v3/rooms/{id}/join` bei.

**UI-Test (der eigentliche Messwert):**
4. Zwei Chrome-Sessions (wdio-multiremote) öffnen Element-Web.
5. Alice + Bob loggen sich über die UI ein.
6. Beide navigieren via URL zum Raum (`/#/room/{roomId}`).
7. Alice sendet „Hello Bob – `<ts>`" über den Composer.
8. Test verifiziert, dass die Nachricht in Bobs Timeline erscheint.

Warum API-Setup statt UI-Klicks: Element-Webs Create-Room-Dialog ist komplex (Encryption-Toggle, Visibility-Presets, Invite-Suche) und ändert sich zwischen Versionen. Die API ist stabil. Wir testen damit *gezielt* den Send-/Receive-Pfad statt zufällig auch noch Raum-Erstellungs-UX.

## Mobile-Ausblick

### Phase 2 — Android

```bash
npm install -D @wdio/appium-service appium
npx appium driver install uiautomator2
# Debug-APK von element-x-android nach apps/android/element-x.apk legen
```

Dann in `config/wdio.android.conf.ts`:
- Die kommentierten Capabilities + `services`-Blöcke aktivieren
- Den `onPrepare`-Throw entfernen

Page-Objects unter `test/pageobjects/android/` mit gleichen Methodensignaturen wie Web,
Selectors per UIAutomator (`android=new UiSelector()...`).
Specs unter `test/specs/android/`.

Android-Emulator erreicht den Host-Synapse unter `http://10.0.2.2:8008` (nicht `localhost`).
Die Debug-APK muss Cleartext-HTTP auf `10.0.2.2` erlauben (per `network_security_config.xml`
oder `usesCleartextTraffic="true"`).

### Phase 3 — iOS

```bash
npm install -D @wdio/appium-service appium
npx appium driver install xcuitest
# Debug-.app von element-x-ios nach apps/ios/element-x.app legen
```

Dann in `config/wdio.ios.conf.ts`: Capabilities + Services aktivieren, Throw entfernen.

iOS-Simulator erreicht den Host-Synapse direkt unter `http://localhost:8008`.
Die Debug-Build braucht `NSAppTransportSecurity` mit Exception für `localhost`.

## Troubleshooting

- **`docker compose up` hängt**: Docker Desktop läuft? `docker version` muss Server + Client anzeigen.
- **Port 8008 oder 8080 belegt**: `lsof -i :8008` bzw. `:8080` prüfen; andere Container stoppen.
- **Synapse-Admin-Helper: „Could not find registration_shared_secret"**: `synapse/data/homeserver.yaml` fehlt oder wurde noch nicht generiert — siehe Setup.
- **Login schlägt fehl mit „Invalid homeserver"**: Prüfe `element-web/config.json` — `base_url` muss auf `http://localhost:8008` zeigen.
- **Tests laufen, aber Selectors finden nichts**: Element-Web-Version aktualisiert, Selectors können sich geändert haben. Mit `HEADED=1 npm run test:web` manuell beobachten, Selectors in `test/pageobjects/web/` anpassen.
