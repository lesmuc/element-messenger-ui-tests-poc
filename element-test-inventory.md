# Element-Clients — Test-Techniken

Grobe Bestandsaufnahme der offiziellen element-hq-Clients (Stand 2026-04-18):

- **element-web** — Jest (Unit) + Playwright (E2E). Coverage: 70.6 % (SonarCloud).
- **element-x-ios** — XCTest (Unit) + XCUITest (UI) + SnapshotTesting (Preview). Coverage: 79 % (Codecov).
- **element-x-android** — JUnit (Unit) + Paparazzi (Screenshot) + Maestro (E2E). Coverage: 81 % (Codecov).

Webdriver.io / Appium ist in keinem der drei Repos im Einsatz.
