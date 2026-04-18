# Element-Clients — Test-Bestandsaufnahme

**Stand:** 2026-04-18
**Scope:** `element-hq/element-web`, `element-hq/element-x-ios`, `element-hq/element-x-android`
**Methodik:** Read-only via GitHub-API (`gh`), WebFetch auf raw.githubusercontent.com und Codecov/SonarCloud. Keine Repo-Klone, keine lokalen Testläufe.
**Out of Scope:** Legacy-Clients (`element-ios`, `element-android`), BundesMessenger, Tool-Empfehlung, Testcode.

---

## Zusammenfassung

| Client | Unit-Framework | Unit-Testzahl | UI/E2E-Framework | UI/E2E-Testzahl | Coverage (Unit) | CI-Trigger |
|---|---|---|---|---|---|---|
| **element-web** | Jest (`@nx/jest` ^22.5.0) | **165** (`13 *.test.ts` + `152 *.spec.ts`) | Playwright `^1.59.1` | **150** Specs in 48 Flow-Ordnern | **70.6 %** (SonarCloud Badge-API, `element-web`-Projekt) | PR (Chrome only), Merge-Queue (alle Browser + Dendrite + Pinecone), Nightly |
| **element-x-ios** | XCTest + SnapshotTesting `1.19.2` | **~150** Dateien in `UnitTests/Sources/` | XCUITest (16–18 Specs) + Preview/Snapshot (2) + Accessibility (3) + Integration (3+) | ~22–26 Suites + 100+ Snapshots | **79 %** (Codecov Badge, Branch `main`) | Unit auf PR; UI/Accessibility/Integration: Nightly bzw. `workflow_dispatch` |
| **element-x-android** | JUnit 4.13.2 + Turbine + Truth + Robolectric + Molecule + Kover | *Sichtbar im Tree: wenige Dutzend; Gesamtzahl via API nicht exakt zählbar* | Paparazzi `2.0.0-alpha04` (Preview-Scan) + Maestro (28 YAMLs) + connectedAndroidTest | 28 Maestro-Flows, automatische Paparazzi-Snapshots, androidTest optional | **81 %** (Codecov Badge, Branch `main`) | PR: `tests.yml` (Unit + Paparazzi) + `quality.yml`; Maestro manuell/label; Nightly: **keine Tests** |

> **Hinweis zu den Coverage-Zahlen:** Diese Werte stammen aus den öffentlichen Badge-SVGs (SonarCloud bzw. Codecov) und beziehen sich **nur auf Unit-Tests** (Kover/Jest/`xccov`-LLVM). E2E-/UI-Tests (Playwright, Maestro, XCUITest) werden nicht instrumentiert und fließen nicht in diese Prozente ein. Die Dashboards selbst (klickbare Detail-Ansichten auf SonarCloud/Codecov) erfordern weiterhin Login.

**Kern-Beobachtungen auf einen Blick:**
- **Webdriver.io ist in keinem der drei Repos im Einsatz** — bestätigt durch `package.json`- und Dependency-Checks.
- **Coverage-Prozente liegen beieinander:** Web 70.6 %, iOS 79 %, Android 81 %. Die Dashboards selbst sind nicht öffentlich, die Badge-SVGs aber doch.
- Nur **element-web** hat einen verbindlichen Coverage-Gate (≥80 % für neuen Code in CONTRIBUTING.md) — und liegt mit 70.6 % **darunter** im Gesamtschnitt. Die 80 %-Regel bezieht sich allerdings auf *neuen* Code, nicht den Gesamt-Stand. iOS dokumentiert „wird irgendwann enforced", Android nennt keinen Mindestwert.
- Die Testpyramide ist pro Client unterschiedlich tief: Web hat die umfangreichste E2E-Schicht, iOS die ausgefeilteste Snapshot-Disziplin, Android setzt stark auf Fakes und auf Maestro für User-Flows.

---

## element-web

### Unit-Tests
- **Framework:** Jest, gemanagt über Nx (`@nx/jest` `^22.5.0`). — [`package.json`](https://raw.githubusercontent.com/element-hq/element-web/develop/package.json)
- **Anzahl:** 13 `*.test.ts` + 152 `*.spec.ts` = **165 Test-Dateien** (via GitHub Code Search API).
- **Verzeichnis:** Primär unter `apps/web/` (Monorepo — Migration auf Nx hat Test-Dateien über das App-Verzeichnis verteilt; historisch war `/test/` Haupt-Ort, CONTRIBUTING verweist teils noch darauf).
- **Mocking:** `jest.mock(...)` direkt; kein `msw` oder ähnliches Browser-Level-Mocking in Dependencies.

### E2E / UI-Tests (Playwright)
- **Framework:** Playwright `^1.59.1` (aus `pnpm-workspace.yaml`-Katalog).
- **Anzahl:** **150 `*.spec.ts`** unter `apps/web/playwright/e2e/` (via Code Search).
- **Abgedeckte Flow-Ordner (48 Top-Level-Kategorien):** accessibility, app-loading, audio-player, chat-export, composer, crypto, devtools, editing, feedback, file-upload, forgot-password, integration-manager, invite, knock, lazy-loading, left-panel, links, location, login, messages, mobile-guide, modules, oidc, one-to-one-chat, pinned-messages, polls, presence, read-receipts, register, regression-tests, release-announcement, right-panel, room, room-directory, room_options, settings, share-dialog, sliding-sync, spaces, spotlight, threads, timeline, toasts, update, user-menu, user-view, voip, widgets. — [Repo-Tree](https://github.com/element-hq/element-web/tree/develop/apps/web/playwright/e2e)
- **Browser-/Homeserver-Matrix:** 5 Projekte — Chrome, Firefox, WebKit, Dendrite, Pinecone. — [`playwright.config.ts`](https://raw.githubusercontent.com/element-hq/element-web/develop/apps/web/playwright.config.ts)
- **Homeserver-Strategie:** Synapse/Dendrite/Pinecone als **Testcontainers**, per Worker gestartet und pro Worker-Config wiederverwendet. Deklarativ via `test.use({ synapseConfig: {...} })`. — [`docs/playwright.md`](https://raw.githubusercontent.com/element-hq/element-web/develop/docs/playwright.md)

### CI-Workflows
- Haupt-Workflows: `build-and-test.yaml`, `merge-queue.yaml`, `build_desktop_*.yaml`, `docker.yaml`, `cd.yaml`.
- **PR-Trigger:** nur Chrome-Playwright-Suite; Firefox/WebKit/Dendrite/Pinecone laufen nur mit Label `X-Run-All-Tests`, im Nightly oder in der Merge-Queue. Sharding via `SHARD`-env (4 Runner regulär, 1 Nightly). — [`build-and-test.yaml`](https://raw.githubusercontent.com/element-hq/element-web/develop/.github/workflows/build-and-test.yaml)
- **Merge-Queue:** eigener Workflow mit Conditional-Skips (license/cla-Check wird dort als „extraordinarily flaky" kommentiert). — [`merge-queue.yaml`](https://raw.githubusercontent.com/element-hq/element-web/develop/.github/workflows/merge-queue.yaml)

### Coverage
- **SonarCloud — 70.6 %** (Unit-Test-Coverage, Gesamt-Projekt). — [Badge-API](https://sonarcloud.io/api/project_badges/measure?project=element-web&metric=coverage)
- Dashboard [`sonarcloud.io/summary/new_code?id=element-web`](https://sonarcloud.io/summary/new_code?id=element-web) erfordert Login für Detail-Metriken (neuer-Code-vs.-Gesamt, Branches, Quality-Gates).
- **CONTRIBUTING-Regel:** *"When writing unit tests, please aim for a high level of test coverage for new code — 80 % or greater. If 80 % cannot be achieved, please document why in the pull request."* — [`CONTRIBUTING.md`](https://raw.githubusercontent.com/element-hq/element-web/develop/CONTRIBUTING.md)
- Einordnung: 70.6 % ist der **Gesamt-Schnitt**; die 80-%-Regel gilt nur für *neuen* Code je PR. Beide sind konsistent — Altcode zieht den Schnitt nach unten, neuer Code wird auf ≥ 80 % gehalten.
- Zusätzlich verbindlich: neue User-Facing-Features benötigen „comprehensive unit tests written in Jest" + „happy path end-to-end tests"; Bugfixes mindestens einen Unit- oder E2E-Test. (Zitat aus derselben Datei.)

### Contributor-Doku
- [`CONTRIBUTING.md`](https://raw.githubusercontent.com/element-hq/element-web/develop/CONTRIBUTING.md) — Test-Pflichten je PR-Typ, 80-%-Regel.
- [`docs/playwright.md`](https://raw.githubusercontent.com/element-hq/element-web/develop/docs/playwright.md) — Testcontainer-Setup, Page-Object-Katalog, Visual-Test-Konventionen (`@screenshot`-Tag, Docker-basiertes Font-Rendering), Empfehlung *"minimize UI driving for setup by using REST APIs instead"*.

### Qualität

**Test-Tiefe — tief.** Beleg aus `soft_logout_oauth.spec.ts`: kompletter End-to-End-Flow von OAuth-Registration über Mock-Intercept bis Re-Login, mit URL- und UI-State-Assertions:
```ts
await expect(page.getByRole("heading", { name: "Welcome Alice", exact: true })).toBeVisible();
await interceptRequestsWithSoftLogout(page, user);
await expect(page.getByText("You're signed out")).toBeVisible();
```
— [`soft_logout_oauth.spec.ts`](https://raw.githubusercontent.com/element-hq/element-web/develop/apps/web/playwright/e2e/login/soft_logout_oauth.spec.ts)

**Isolation — real-Backend + REST-Setup.** Tests sprechen gegen echte Homeserver-Container, nutzen aber REST-APIs für Setup (Accounts, Räume), nicht UI-Klicks. — [`docs/playwright.md`](https://raw.githubusercontent.com/element-hq/element-web/develop/docs/playwright.md)

**Flakiness-Signale:**
- `retries: process.env.CI ? 2 : 0` — CI erlaubt 2 Retries. — [`playwright.config.ts`](https://raw.githubusercontent.com/element-hq/element-web/develop/apps/web/playwright.config.ts)
- `trace: "on-first-retry"` — automatische Trace-Aufzeichnung ab erstem Retry.
- Merge-Queue kennzeichnet license/cla-Check explizit als „extraordinarily flaky". — [`merge-queue.yaml`](https://raw.githubusercontent.com/element-hq/element-web/develop/.github/workflows/merge-queue.yaml)
- Offene Flaky-Issues: exakte Zahl via API-Search wegen Rate-Limits nicht sicher ermittelbar, aber kein dominierender `flaky`-Label-Bestand sichtbar.

**Pyramide:** ~1:1 Unit zu E2E (165 vs. 150) — **deutlich e2e-lastig** für ein Frontend-Projekt.

**Page-Objects:** Ja, etabliertes Muster unter `apps/web/playwright/pages/`. — [`docs/playwright.md`](https://raw.githubusercontent.com/element-hq/element-web/develop/docs/playwright.md)

**Skipped Tests:** API-Suche zeigt ~48–51 Treffer für `test.skip`/`it.skip`-Pattern (Code-Search-Rate-Limit macht die Zahl ungenau; Größenordnung: mittel).

### Auffällige Stellen / Lücken
1. Playwright-Config liegt in `apps/web/`, nicht im Repo-Root (Monorepo-Nx-Umbau). Für Contributors ein potenzieller Stolperstein.
2. Browser-Matrix läuft auf PRs nur unter Chrome — Firefox-/WebKit-/Alternativ-Homeserver-Regressions werden erst in Merge-Queue oder Nightly sichtbar.
3. CONTRIBUTING referenziert `/test`-Pfade, die real unter `apps/web/` liegen — Doku-Drift.
4. SonarCloud-Coverage-Wert nicht öffentlich — nur die 80-%-Regel auf PR-Ebene ist extern prüfbar.
5. E2E ≈ Unit in Anzahl — ungewöhnliches Verhältnis; E2E ist hier die dominante Test-Kategorie.

---

## element-x-ios

### Unit-Tests (XCTest)
- **Framework:** XCTest (native Swift); Abhängigkeiten via Swift Package Manager (`project.yml` / Package-Definitionen).
- **Verzeichnis:** `UnitTests/Sources/` — hierarchisch nach Komponente (Analytics, Authentication, Layout …). — [Tree](https://github.com/element-hq/element-x-ios/tree/develop/UnitTests/Sources)
- **Anzahl:** ca. **150 Test-Dateien** (Tree-Zählung).
- **Mocking:** `SDKMocks`-Target mit auto-generierten Mocks (`SDKMocks/Sources/Generated/`); Constructor-Injection über Protokolle. — [Tree](https://github.com/element-hq/element-x-ios/tree/develop/SDKMocks)

### UI-Tests (XCUITest)
- **Anzahl:** 16–18 Test-Dateien in `UITests/Sources/`. — [Tree](https://github.com/element-hq/element-x-ios/tree/develop/UITests/Sources)
- **Flows:** App Lock, Login (Password + Passkey), Encryption Setup/Reset, Device Linking, Polls, Room Management, Accessibility, Session Verification, Chat Initiation.
- **Zentrale Test-Infrastruktur:** `Application.swift` stellt `launch()`, `assertScreenshot()` (99 % Bildgenauigkeit), Locale/Device-Handling bereit. — [`UITests/Sources/Application.swift`](https://raw.githubusercontent.com/element-hq/element-x-ios/develop/UITests/Sources/Application.swift)
- **Waits statt Retries:** `Task.sleep()` (2–10 s) + `await client.waitForApp()` statt klassischer Retries. — [`UITests/Sources/RoomScreenTests.swift`](https://raw.githubusercontent.com/element-hq/element-x-ios/develop/UITests/Sources/RoomScreenTests.swift)

### Preview / Snapshot-Tests
- **Framework:** `pointfreeco/swift-snapshot-testing` v1.19.2. — [`project.yml`](https://raw.githubusercontent.com/element-hq/element-x-ios/develop/project.yml)
- **Dateien:** 2 (`GeneratedPreviewTests.swift`, `PreviewTests.swift`) unter `PreviewTests/Sources/`. — [Tree](https://github.com/element-hq/element-x-ios/tree/develop/PreviewTests/Sources)
- **Snapshots:** 100+ PNGs unter `UITests/Sources/__Snapshots__/Application/`, geräte- und sprachspezifisch (iPhone/iPad, en-GB). — [Tree](https://github.com/element-hq/element-x-ios/tree/develop/UITests/Sources/__Snapshots__/Application)

### Accessibility-Tests
- **Dateien:** 3 (`AccessibilityTests.swift`, `Application.swift`, `GeneratedAccessibilityTests.swift`) unter `AccessibilityTests/Sources/`. — [Tree](https://github.com/element-hq/element-x-ios/tree/develop/AccessibilityTests/Sources)
- **CI-Ausführung:** Werktags 02:00 UTC via `swift run -q tools ci accessibility-tests`. — [`accessibility_tests.yml`](https://raw.githubusercontent.com/element-hq/element-x-ios/develop/.github/workflows/accessibility_tests.yml)

### Integration-Tests
- **Dateien:** 3+ (z. B. `UserFlowTests.swift`).
- **Scope:** End-to-End-Flows (Login, Messaging, Media-Sharing, Room-Verwaltung, Settings, Logout).
- **Homeserver:** extern authentifiziert via Secrets (`INTEGRATION_TESTS_HOST`, `INTEGRATION_TESTS_USERNAME`, `INTEGRATION_TESTS_PASSWORD`). — [`IntegrationTests/Sources/UserFlowTests.swift`](https://raw.githubusercontent.com/element-hq/element-x-ios/develop/IntegrationTests/Sources/UserFlowTests.swift)

### CI / Fastlane
- **16 Workflows** unter [`.github/workflows/`](https://github.com/element-hq/element-x-ios/tree/develop/.github/workflows). Wesentliche:
  - `unit_tests.yml` — Swift CLI (`swift run -q tools ci unit-tests`), Codecov-Upload.
  - `ui_tests.yml` — iPhone/iPad-Matrix, manuell oder täglich (02:00 UTC).
  - `accessibility_tests.yml` — Werktags, täglich.
  - `integration-tests.yml` — mit Secrets für externen Server.
  - `unit_tests_enterprise.yml`, `danger.yml` + weitere Lint-/Triage-Jobs.
- **Test-Skripte:** `ci_scripts/` (`ci_common.sh`, `ci_post_clone.sh`, `ci_post_xcodebuild.sh`). — [Tree](https://github.com/element-hq/element-x-ios/tree/develop/ci_scripts)

### Coverage
- **Codecov — 79 %** (Unit-Coverage, Branch `main`). — [Badge](https://codecov.io/gh/element-hq/element-x-ios/branch/main/graph/badge.svg)
- Branch-Detail: Die `develop`-Badge zeigt `unknown` (Codecov trackt aktuell nur `main`). Das Repo hat `develop` als Default-Branch im Tree, aber CI-Coverage-Upload läuft auf `main`.
- **CONTRIBUTING.md:** *"We gather coverage reports on every PR through Codecov; will eventually start enforcing minimums"* — **aktuell kein enforced Mindestwert.** — [`CONTRIBUTING.md`](https://raw.githubusercontent.com/element-hq/element-x-ios/develop/CONTRIBUTING.md)
- Dashboard [`codecov.io/gh/element-hq/element-x-ios`](https://codecov.io/gh/element-hq/element-x-ios) erfordert für Detail-Ansicht Login.

### Qualität

**Test-Tiefe — oberflächlich auf Unit-Ebene.** Stichprobe `AnalyticsSettingsScreenViewModelTests.swift`: boolesche State-Assertions ohne Fehlerszenarien oder Service-Interaktions-Verifikation. — [Datei](https://raw.githubusercontent.com/element-hq/element-x-ios/develop/UnitTests/Sources/AnalyticsSettingsScreenViewModelTests.swift)

UITests sind flow-orientierter (mehrschrittige Navigations- und State-Prüfungen mit Snapshot-Vergleich).

**Isolation — Mock-lastig auf Unit-, echt auf Integration-Ebene.** Unit-Tests via DI + generierte Mocks (`ClientSDKMock`, `EncryptionSDKMock`, `UserSessionStoreMock`). — [`AuthenticationServiceTests.swift`](https://raw.githubusercontent.com/element-hq/element-x-ios/develop/UnitTests/Sources/AuthenticationServiceTests.swift)

**Flakiness-Signale:**
- Offene Issues mit Label `flaky`: 3 (#1189 Invites-Echo, #1269 To-device-Msgs-Spinner, #5399 Voice/Video-Call-Support) — **kein Test-Flaky, sondern Feature-Behaviour-Issues.** — [Query](https://api.github.com/search/issues?q=repo:element-hq/element-x-ios+flaky+state:open)
- Keine dokumentierte Retry-Konfiguration in Xcode-Schemes oder Fastlane — Synchronisation erfolgt via fester `Task.sleep()`-Pausen (riechbares Flaky-Risiko).

**Pyramide:** ~150 Unit zu ~25 UI/Integration/Accessibility = **klassisch pyramidenförmig** (viele Unit, wenig UI).

**Skipped Tests:** 40 Code-Search-Treffer für „skip"-Pattern — exakte `XCTSkip()`-Anzahl via API nicht sauber trennbar.

**Snapshot-Disziplin:** CONTRIBUTING warnt explizit vor Snapshot-Failures bei UI-Änderungen, kein dokumentierter Auto-Update-Pfad sichtbar — Snapshots werden per PR manuell regeneriert.

**Wartbarkeit:** Zentrale Helpers in `Application.swift`, aber **keine Page-Object-/Robot-Struktur**; Helpers teils inline, teils über `SDKMocks`.

### Auffällige Stellen / Lücken
1. Unit-Test-Tiefe inkonsistent — Stichproben-VM-Tests prüfen nur State, keine Nebenwirkungen.
2. Kein Coverage-Mindestwert enforced — `"will eventually"` deutet auf offene Absicht.
3. UITest-Synchronisation über feste Sleeps → latentes Flakiness-Risiko, aber keine Retry-Safety-Net.
4. Integration-Tests hängen an externen Secrets/Server — Forks/externe Contributors können sie lokal nicht reproduzieren.
5. Codecov-Wert nicht öffentlich.

---

## element-x-android

### Unit-Tests (JUnit + Molecule + Turbine)
- **Framework-Stack:** JUnit 4.13.2, Truth 1.4.5, Turbine 1.2.1, Robolectric 4.16.1, **Molecule** (für Presenter-Tests), **Kover** für Coverage. — [`gradle/libs.versions.toml`](https://raw.githubusercontent.com/element-hq/element-x-android/main/gradle/libs.versions.toml)
- **Keine MockK-Nutzung — Fakes statt Mocks.** Dokumentierte Regel: *"For now we want to avoid using class mocking … we prefer to create Fake implementation of our interfaces."* — [`docs/_developer_onboarding.md`](https://raw.githubusercontent.com/element-hq/element-x-android/main/docs/_developer_onboarding.md)
- **Verzeichnis:** `src/test/kotlin/` je Modul. `tests/testutils` als gemeinsames Helper-Modul. — [`tests/`-Tree](https://github.com/element-hq/element-x-android/tree/main/tests)
- **Anzahl:** Tree-Stichproben zeigen eine moderate Menge pro Modul (wenige Dutzend). Code-Search-API liefert wegen Pattern-Vielfalt keine zuverlässige Gesamtzahl.
- **CI-Command:** `./gradlew testDebugUnitTest :koverXmlReportMerged :koverHtmlReportMerged :koverVerifyAll`. — [`.github/workflows/tests.yml`](https://raw.githubusercontent.com/element-hq/element-x-android/main/.github/workflows/tests.yml)

### Instrumented Tests (`androidTest/`)
- **Verzeichnis:** `src/androidTest/kotlin/` je Feature-Modul; Umfang nicht öffentlich zählbar.
- **Homeserver:** Synapse-Demo, 3 föderierte Instanzen (Ports 8080/8081/8082), `public_baseurl: http://10.0.2.2:8080/` (Emulator-Host-Bridge). — [`docs/integration_tests.md`](https://raw.githubusercontent.com/element-hq/element-x-android/main/docs/integration_tests.md)
- **Status:** laut CONTRIBUTING *"should consider adding … integration tests (AndroidTest)"* — **nicht verpflichtend**.

### Paparazzi / Compose-Screenshot-Tests
- **Framework:** Paparazzi `2.0.0-alpha04`, getrieben von `ComposablePreviewScanner` + Showkase. — [`libs.versions.toml`](https://raw.githubusercontent.com/element-hq/element-x-android/main/gradle/libs.versions.toml)
- **Verifikation im CI:** `verifyPaparazziDebug`; Diffs unter `:tests:uitests/build/paparazzi/failures`.
- **Update-Workflow:** `.github/workflows/recordScreenshots.yml` — triggered per `workflow_dispatch` oder PR-Label `Record-Screenshots`; Action regeneriert Snapshots und committed sie. **Lokale Snapshots werden nicht committed.** — [`recordScreenshots.yml`](https://raw.githubusercontent.com/element-hq/element-x-android/main/.github/workflows/recordScreenshots.yml), [`docs/screenshot_testing.md`](https://raw.githubusercontent.com/element-hq/element-x-android/main/docs/screenshot_testing.md)

### Maestro End-to-End
- **Struktur:** `.maestro/tests/` mit Sub-Verzeichnissen `account/`, `assertions/`, `roomList/`, `settings/`, `timeline/` plus Root-`init.yaml`.
- **28 YAML-Dateien gesamt:**
  - `account/`: 4 (login, logout, changeServer, verifySession)
  - `assertions/`: 6 (Home, Init, Login, RoomListSynced, SessionVerification, Analytics)
  - `roomList/`: 5 (list, search, createDM, createRoom, contextMenu)
  - `settings/`: 1
  - `timeline/`: ≥ 1 (Message-Flows: text, poll, location, call = 4 Varianten innerhalb)
  - Root: `init.yaml`, `allTests.yaml`
  — [`.maestro/tests/`](https://github.com/element-hq/element-x-android/tree/main/.maestro/tests)
- **CI:** `maestro-local.yml` — Debug-APK via `./gradlew assembleGplayNightly`, Android Emulator (API 33, Pixel 7 Pro, x86_64), Maestro via curl, Screen-Recording an, `concurrency: max 1`. Credentials via Env (`MAESTRO_USERNAME`, Secrets). — [`maestro-local.yml`](https://raw.githubusercontent.com/element-hq/element-x-android/main/.github/workflows/maestro-local.yml)

### CI-Workflows
- **PR-Jobs:** `tests.yml` (Unit + Paparazzi), `quality.yml` (Konsist-Architektur-Checks, Ktlint, Detekt, Android Lint, Zizmor, Danger), `pull_request.yml` (Label-Management, Fork-Prävention).
- **Nightly:** `nightly.yml` — **nur Build + Firebase/BrowserStack-Upload, keine Tests**. — [`nightly.yml`](https://raw.githubusercontent.com/element-hq/element-x-android/main/.github/workflows/nightly.yml)
- **Kein Fastlane.**
- **Parallel-Gradle:** `maxParallelForks = (cores / 2).coerceAtLeast(1)`.

### Coverage
- **Codecov — 81 %** (Unit-Coverage via Kover, Branch `main`). — [Badge](https://codecov.io/gh/element-hq/element-x-android/graph/badge.svg?branch=main)
- **Kover** aggregiert nur Unit-Tests; Maestro-, Paparazzi-, und androidTest-Ergebnisse fließen **nicht** in diese 81 % ein.
- **CONTRIBUTING:** kein expliziter Coverage-Mindestwert genannt; Architektur-Namenkonventionen sind via Konsist durchgesetzt.
- Dashboard [`codecov.io/github/element-hq/element-x-android`](https://codecov.io/github/element-hq/element-x-android) erfordert für Detail-Ansicht Login.

### Contributor-Doku
- [`CONTRIBUTING.md`](https://raw.githubusercontent.com/element-hq/element-x-android/main/CONTRIBUTING.md): *"Make sure `./gradlew test` runs without error"*; *"You should consider adding Unit tests … and integration tests (AndroidTest)"*; Testen auf API 23+ empfohlen.
- [`docs/pull_request.md`](https://raw.githubusercontent.com/element-hq/element-x-android/main/docs/pull_request.md): PR-Checklist fordert `allScreensTest` und Unit-Tests; Reviewer prüfen Nominal + Edge-Cases.
- [`docs/_developer_onboarding.md`](https://raw.githubusercontent.com/element-hq/element-x-android/main/docs/_developer_onboarding.md): Molecule+Turbine für Presenter, Showkase+Paparazzi für UI, Maestro für E2E.
- [`docs/integration_tests.md`](https://raw.githubusercontent.com/element-hq/element-x-android/main/docs/integration_tests.md) + [`docs/screenshot_testing.md`](https://raw.githubusercontent.com/element-hq/element-x-android/main/docs/screenshot_testing.md).

### Qualität

**Test-Tiefe — flach bei Stichproben.** `DefaultIntentProviderTest` deckt nur einen Happy-Path-Fall ab; `DefaultOidcRedirectUrlProviderTest` verifiziert Ressourcen-Zugriff ohne Null-/Alternativ-Handling. — [`app/src/test/kotlin/...`](https://github.com/element-hq/element-x-android/tree/main/app/src/test/kotlin)

**Isolation — Fake-basiert statt Mock.** Explizite Design-Regel (Doku-Zitat oben); Presenter-Tests nutzen Molecule+Turbine (Composable-State-Streams als Flows); androidTest spricht echten Synapse-Homeserver.

**Flakiness-Signale:**
- Suche nach offenen `flaky`-Issues: **keine Treffer** via API — entweder niemand trackt, oder es gibt wirklich keine offenen.
- Kein `retry`-Key in den Test-Workflows; `maestro-local.yml` nutzt `continue-on-error: true` nur für Artifact-Upload, nicht für Tests.

**Pyramide:** Unit-Menge mittel, instrumented Tests optional, Maestro mit 28 Flows als Top-Level-E2E-Schicht. **Verhältnis schwer quantifizierbar** mangels Unit-Gesamtzahl.

**Skipped Tests:** `@Ignore`-Anzahl via Code-Search nicht zuverlässig zählbar.

**Paparazzi-Disziplin — strikt.** Lokale Snapshots sind **nicht zu committen**; Regeneration läuft zwingend über CI-Action. Diffs werden bei Fehlschlägen als Artefakt bereitgestellt.

**Wartbarkeit:** `tests/testutils`-Modul; Konsist-Validator erzwingt Namens-/Architekturkonventionen (Presenter/State-Suffixes). Kein klassisches Robot-Pattern, aber Fake-+-Preview-Ansatz ist konsistent umgesetzt.

### Auffällige Stellen / Lücken
1. **Nightly-Build führt keine Tests aus** — nur Build+Upload. E2E läuft ausschließlich bei expliziter Maestro-Auslösung.
2. **Unit-Gesamtzahl und androidTest-Umfang** sind nicht öffentlich messbar (keine Badge-Zahlen, keine README-Angaben).
3. **Kein enforced Coverage-Minimum.**
4. **Maestro Cloud-Limit** (~100 Runs/Monat) erzwingt sparsame Auslösung — ggf. Begrenzung der praktischen E2E-Frequenz.
5. Stichproben-Unit-Tests sind sehr flach — ein quantitativer Indikator fehlt, aber die Qualitäts-Stichprobe stützt den Eindruck *"viele Tests, aber wenig Tiefe pro Test"*.

---

## Quellenliste

**element-web**
- Repo: https://github.com/element-hq/element-web
- E2E-Verzeichnis: https://github.com/element-hq/element-web/tree/develop/apps/web/playwright/e2e
- `package.json`: https://raw.githubusercontent.com/element-hq/element-web/develop/package.json
- `playwright.config.ts`: https://raw.githubusercontent.com/element-hq/element-web/develop/apps/web/playwright.config.ts
- `pnpm-workspace.yaml`: https://raw.githubusercontent.com/element-hq/element-web/develop/pnpm-workspace.yaml
- `docs/playwright.md`: https://raw.githubusercontent.com/element-hq/element-web/develop/docs/playwright.md
- `CONTRIBUTING.md`: https://raw.githubusercontent.com/element-hq/element-web/develop/CONTRIBUTING.md
- `build-and-test.yaml`: https://raw.githubusercontent.com/element-hq/element-web/develop/.github/workflows/build-and-test.yaml
- `merge-queue.yaml`: https://raw.githubusercontent.com/element-hq/element-web/develop/.github/workflows/merge-queue.yaml
- Beleg-Test `soft_logout_oauth.spec.ts`: https://raw.githubusercontent.com/element-hq/element-web/develop/apps/web/playwright/e2e/login/soft_logout_oauth.spec.ts
- SonarCloud (privat): https://sonarcloud.io/summary/new_code?id=element-web

**element-x-ios**
- Repo: https://github.com/element-hq/element-x-ios
- UnitTests: https://github.com/element-hq/element-x-ios/tree/develop/UnitTests/Sources
- UITests: https://github.com/element-hq/element-x-ios/tree/develop/UITests/Sources
- PreviewTests: https://github.com/element-hq/element-x-ios/tree/develop/PreviewTests/Sources
- AccessibilityTests: https://github.com/element-hq/element-x-ios/tree/develop/AccessibilityTests/Sources
- Snapshots: https://github.com/element-hq/element-x-ios/tree/develop/UITests/Sources/__Snapshots__/Application
- `project.yml`: https://raw.githubusercontent.com/element-hq/element-x-ios/develop/project.yml
- `CONTRIBUTING.md`: https://raw.githubusercontent.com/element-hq/element-x-ios/develop/CONTRIBUTING.md
- CI-Workflows: https://github.com/element-hq/element-x-ios/tree/develop/.github/workflows
- `accessibility_tests.yml`: https://raw.githubusercontent.com/element-hq/element-x-ios/develop/.github/workflows/accessibility_tests.yml
- Beleg `AnalyticsSettingsScreenViewModelTests.swift`: https://raw.githubusercontent.com/element-hq/element-x-ios/develop/UnitTests/Sources/AnalyticsSettingsScreenViewModelTests.swift
- Beleg `AuthenticationServiceTests.swift`: https://raw.githubusercontent.com/element-hq/element-x-ios/develop/UnitTests/Sources/AuthenticationServiceTests.swift
- Beleg `RoomScreenTests.swift`: https://raw.githubusercontent.com/element-hq/element-x-ios/develop/UITests/Sources/RoomScreenTests.swift
- Beleg `UserFlowTests.swift`: https://raw.githubusercontent.com/element-hq/element-x-ios/develop/IntegrationTests/Sources/UserFlowTests.swift
- `UITests/Application.swift`: https://raw.githubusercontent.com/element-hq/element-x-ios/develop/UITests/Sources/Application.swift
- Codecov (privat): https://codecov.io/gh/element-hq/element-x-ios
- Flaky-Issues-Query: https://api.github.com/search/issues?q=repo:element-hq/element-x-ios+flaky+state:open

**element-x-android**
- Repo: https://github.com/element-hq/element-x-android
- `gradle/libs.versions.toml`: https://raw.githubusercontent.com/element-hq/element-x-android/main/gradle/libs.versions.toml
- Maestro-Tests: https://github.com/element-hq/element-x-android/tree/main/.maestro/tests
- Test-Helpers: https://github.com/element-hq/element-x-android/tree/main/tests
- `CONTRIBUTING.md`: https://raw.githubusercontent.com/element-hq/element-x-android/main/CONTRIBUTING.md
- `docs/integration_tests.md`: https://raw.githubusercontent.com/element-hq/element-x-android/main/docs/integration_tests.md
- `docs/screenshot_testing.md`: https://raw.githubusercontent.com/element-hq/element-x-android/main/docs/screenshot_testing.md
- `docs/_developer_onboarding.md`: https://raw.githubusercontent.com/element-hq/element-x-android/main/docs/_developer_onboarding.md
- `docs/pull_request.md`: https://raw.githubusercontent.com/element-hq/element-x-android/main/docs/pull_request.md
- `tests.yml`: https://raw.githubusercontent.com/element-hq/element-x-android/main/.github/workflows/tests.yml
- `maestro-local.yml`: https://raw.githubusercontent.com/element-hq/element-x-android/main/.github/workflows/maestro-local.yml
- `recordScreenshots.yml`: https://raw.githubusercontent.com/element-hq/element-x-android/main/.github/workflows/recordScreenshots.yml
- `nightly.yml`: https://raw.githubusercontent.com/element-hq/element-x-android/main/.github/workflows/nightly.yml
- Codecov (privat): https://codecov.io/github/element-hq/element-x-android
