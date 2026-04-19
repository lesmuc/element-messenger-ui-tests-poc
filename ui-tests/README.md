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

Zwei parallele Workflows auf Ubuntu-Runnern, beide triggern auf jedem
PR und Push auf `master`/`main`, sofern `ui-tests/**` geändert wurde:

- `.github/workflows/ui-tests-web.yml` — **Ubuntu-Runner (GHA)**, Chrome-multiremote
  (Alice + Bob). Dauer ~1–2 min.
- `.github/workflows/ui-tests-android.yml` — **Self-hosted M1-Runner**, zwei
  arm64-Emulatoren, APK wird lokal gepatcht. Dauer ~3–5 min. Android-SDK,
  apktool, Java, AVDs und Docker Desktop müssen auf dem Mac installiert und
  lauffähig sein; der Runner muss registriert und als Service aktiv sein.

### Self-hosted Runner auf dem M1 einrichten

In GitHub → Settings → Actions → Runners → **New self-hosted runner**:
Labels **`self-hosted`, `macOS`, `ARM64`** auswählen, die drei Terminal-
Kommandos ausführen (`./config.sh …` + `./run.sh` oder `./svc.sh install`
für Service-Mode). Docker Desktop beim Mac-Login automatisch starten lassen,
damit der Runner ohne manuelles Eingreifen Tests durchführen kann.

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

##  — Android (implementiert)

Android-Tests laufen per Appium + UIAutomator2 auf **zwei parallelen
Emulatoren** (Alice auf Port 5554, Bob auf Port 5556), analog zum
multiremote-Pattern des Web-Tests:

- `test/specs/android/send-message.spec.ts` — End-to-End Two-Device:
  Alice + Bob loggen sich beide per App ein, Bob nimmt den Invite per
  UI an, Alice sendet, Bob sieht die Nachricht in seiner Timeline.

### Voraussetzungen für 

- Android SDK (ANDROID_HOME gesetzt), AVD `Pixel_6a` (Default, via `AVD_NAME_ALICE` überschreibbar). Das Bob-AVD (`Pixel_6a_bob`, via `AVD_NAME_BOB` überschreibbar) legt `setup-emulator.sh` bei Bedarf selbst an.
- Java 17+
- `apktool` (via `brew install apktool`)
- `~/.android/debug.keystore` (kommt mit Android Studio / Gradle; sonst erzeugt das Patch-Script einen)

### Einmaliger Setup

```bash
# Universal-APK herunterladen (aus Element-X-Android Release)
gh release download v26.04.2 --repo element-hq/element-x-android \
  --pattern '202604020.apk' --dir apps/android

# APK patchen: network_security_config auf cleartextTrafficPermitted=true
# setzen, mit Debug-Keystore re-signen → apps/android/element-patched.apk
bash scripts/patch-apk.sh
```

### Android-Tests ausführen

```bash
npm run synapse:up                 # Synapse + Element-Web starten
bash scripts/setup-emulator.sh     # Beide Emulatoren starten + tweaken
npm run test:android               # Two-Device Send-Message-Test
```

### Warum APK-Patch?

Element X hat `networkSecurityConfig` → Cleartext-HTTP zu `10.0.2.2:8008`
wird per Default verboten. Alternativen (TLS-Sidecar mit System-CA-Install,
Source-Build aus element-x-android) sind entweder auf aktuellen Android-
Versionen fragile (apex-Mount-Tricks greifen nicht für alle Zygote-Kinder)
oder deutlich aufwändiger (Rust-SDK-Build + Gradle-Pipeline).

Das Patchen ist reproduzierbar, CI-freundlich, und berührt nur eine
XML-Datei in der APK — die getestete App bleibt ansonsten bit-gleich
mit dem Release-Binary.

##  — iOS (noch offen)

```bash
npm install -D @wdio/appium-service appium   # falls noch nicht aus 
npx appium driver install xcuitest
# Debug-.app von element-x-ios nach apps/ios/element-x.app legen
```

Dann in `config/wdio.ios.conf.ts`: Capabilities + Services aktivieren, Exception entfernen.

iOS-Simulator erreicht den Host-Synapse direkt unter `http://localhost:8008`.
Die Debug-Build braucht `NSAppTransportSecurity` mit Exception für `localhost` —
oder analog zu Android eine patch-`.app`-Pipeline.

## Troubleshooting

- **`docker compose up` hängt**: Docker Desktop läuft? `docker version` muss Server + Client anzeigen.
- **Port 8008 oder 8080 belegt**: `lsof -i :8008` bzw. `:8080` prüfen; andere Container stoppen.
- **Synapse-Admin-Helper: „Could not find registration_shared_secret"**: `synapse/data/homeserver.yaml` fehlt oder wurde noch nicht generiert — siehe Setup.
- **Login schlägt fehl mit „Invalid homeserver"**: Prüfe `element-web/config.json` — `base_url` muss auf `http://localhost:8008` zeigen.
- **Tests laufen, aber Selectors finden nichts**: Element-Web-Version aktualisiert, Selectors können sich geändert haben. Mit `HEADED=1 npm run test:web` manuell beobachten, Selectors in `test/pageobjects/web/` anpassen.
