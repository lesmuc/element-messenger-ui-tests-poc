import type { Options } from '@wdio/types';
import { sharedConfig } from './wdio.shared.conf';

/**
 * Phase-1-Platzhalter — wird in Phase 3 aktiviert.
 *
 * Aktivierungs-Schritte (siehe Plan):
 *   1. npm install -D @wdio/appium-service appium
 *   2. npx appium driver install xcuitest
 *   3. Debug-.app von element-x-ios so bauen, dass sie auf
 *      http://localhost:8008 zeigt und per NSAppTransportSecurity-Exception
 *      Cleartext für localhost erlaubt.
 *   4. Build-Output unter apps/ios/element-x.app (oder .ipa) ablegen
 *   5. Die auskommentierten Capabilities- und Services-Blöcke unten aktivieren
 *   6. Die onPrepare-Exception entfernen
 *   7. iOS-Page-Objects unter test/pageobjects/ios/ anlegen
 *   8. Specs unter test/specs/ios/ anlegen
 */
export const config: Options.Testrunner = {
  ...sharedConfig,
  specs: ['../test/specs/ios/**/*.spec.ts'],
  maxInstances: 1,

  // capabilities: [
  //   {
  //     platformName: 'iOS',
  //     'appium:deviceName': 'iPhone 15',
  //     'appium:platformVersion': '17.0',
  //     'appium:automationName': 'XCUITest',
  //     'appium:app': require('path').resolve(__dirname, '../apps/ios/element-x.app'),
  //     'appium:newCommandTimeout': 240,
  //   },
  // ],
  capabilities: [],

  // services: [['appium', { command: 'appium' }]],

  onPrepare: (): void => {
    throw new Error(
      'wdio.ios.conf.ts: Phase-1-Platzhalter — Appium ist noch nicht eingerichtet.\n' +
      'Siehe Plan Phase 3: @wdio/appium-service + appium installieren, xcuitest-Driver\n' +
      'installieren, Debug-.app unter apps/ios/ ablegen, Capabilities + Services einkommentieren,\n' +
      'diese Exception entfernen.',
    );
  },
} as Options.Testrunner;
