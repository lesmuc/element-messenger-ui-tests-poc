# element-ui-tests

Webdriver.io + TypeScript UI-Tests gegen Element-Web, aufgebaut als Multi-Platform-Projekt.
 (dieser Stand): **Web**. : Android via Appium. : iOS via Appium.

## Voraussetzungen

- Docker Desktop (oder Colima / OrbStack), läuft
- Node.js ≥ 20
- Google Chrome auf dem Host (wird von wdio 9 über den eingebauten Chromedriver verwendet)

## Setup

```bash
cd ui-tests
npm install
```

Die Synapse-Konfiguration ist bereits im Repo (`synapse/data/homeserver.yaml`).
Wurde sie gelöscht, neu generieren:

```bash
docker compose run --rm synapse generate
# dann homeserver.yaml anpassen: enable_registration, encryption off, etc.
```

## Tests ausführen

```bash
npm run synapse:up      # Synapse + Element-Web starten
npm run test:web        # wdio-Testsuite laufen lassen (headless)
npm run synapse:down    # aufräumen
```

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
│   ├── wdio.android.conf.ts     # -Platzhalter
│   └── wdio.ios.conf.ts         # -Platzhalter
├── test/
│   ├── helpers/synapse-admin.ts # Account-Registrierung via Admin-API
│   ├── pageobjects/
│   │   ├── web/                 # : login, room
│   │   ├── android/             # 
│   │   └── ios/                 # 
│   └── specs/
│       ├── web/send-message.spec.ts
│       ├── android/             # 
│       └── ios/                 # 
└── apps/
    ├── android/                 # : Debug-APK ablegen
    └── ios/                     # : Debug-.app ablegen
```

## Test-Flow ()

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

###  — Android

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

###  — iOS

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
