# Proof-of-Concept für plattformübergreifende UI-Tests der Element-Messenger-Clients mit Webdriver.io + Appium

## Inhalt

- **[`ui-tests/`](./ui-tests/README.md)** — Proof-of-Concept UI-Tests, komplett
  reproduzierbar gegen einen lokalen Synapse + Element-Web via Docker.
  Zwei Plattformen funktionieren grün:
  - **Web** — Chrome multiremote (Alice + Bob), direkter Send/Receive-Test
  - **Android** — Appium + UIAutomator2, zwei Emulatoren parallel, element-x-android
    als gepatchte APK (`cleartextTrafficPermitted=true` für Cleartext-HTTP
    zum lokalen Homeserver)
  - **iOS** — Platzhalter, noch nicht aktiviert

## GitHub Actions

Beide UI-Test-Suiten laufen im CI auf jedem Push und PR (nur bei Änderungen
unter `ui-tests/` oder am jeweiligen Workflow):

- **[`ui-tests-web.yml`](./.github/workflows/ui-tests-web.yml)** — GitHub-Ubuntu-Runner,
  Docker-Stack + headless Chrome × 2, ~1–2 min pro Run
- **[`ui-tests-android.yml`](./.github/workflows/ui-tests-android.yml)** — Self-hosted
  M1-Runner (alle Tools lokal vorhanden), zwei arm64-Emulatoren, ~3–5 min pro Run

Screenshots der Test-Schritte (Login, Raum-Öffnen, Nachricht gesendet, empfangen)
werden als Artifact hochgeladen und in der Step-Summary aufgelistet — sowohl
bei Erfolg als auch bei Fehlschlag.

## Schnellstart

Details stehen in [`ui-tests/README.md`](./ui-tests/README.md). Kurz:

```bash
cd ui-tests
npm install
npm run synapse:setup && npm run synapse:up
npm run test:web                    # Web-Tests
bash scripts/setup-emulator.sh      # nur für Android
bash scripts/patch-apk.sh           # nur für Android (einmalig)
npm run test:android                # Android-Tests
```
