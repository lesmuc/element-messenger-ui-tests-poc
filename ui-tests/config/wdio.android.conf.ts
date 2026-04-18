import type { Options } from '@wdio/types';
import { sharedConfig } from './wdio.shared.conf';

/**
 * -Platzhalter — wird in  aktiviert.
 *
 * Aktivierungs-Schritte (siehe Plan):
 *   1. npm install -D @wdio/appium-service appium
 *   2. npx appium driver install uiautomator2
 *   3. Debug-APK unter apps/android/element-x.apk ablegen
 *   4. Die auskommentierten Capabilities- und Services-Blöcke unten aktivieren
 *   5. Den onPrepare-Throw entfernen
 *   6. Android-Page-Objects unter test/pageobjects/android/ anlegen
 *   7. Specs unter test/specs/android/ anlegen
 */
export const config: Options.Testrunner = {
  ...sharedConfig,
  specs: ['../test/specs/android/**/*.spec.ts'],
  maxInstances: 1,

  // capabilities: [
  //   {
  //     platformName: 'Android',
  //     'appium:deviceName': 'Pixel_7_API_33',
  //     'appium:platformVersion': '13.0',
  //     'appium:automationName': 'UIAutomator2',
  //     'appium:app': require('path').resolve(__dirname, '../apps/android/element-x.apk'),
  //     'appium:autoGrantPermissions': true,
  //     'appium:newCommandTimeout': 240,
  //   },
  // ],
  capabilities: [],

  // services: [['appium', { command: 'appium', args: { relaxedSecurity: true } }]],

  onPrepare: (): void => {
    throw new Error(
      'wdio.android.conf.ts: -Platzhalter — Appium ist noch nicht eingerichtet.\n' +
      'Siehe Plan : @wdio/appium-service + appium installieren, uiautomator2-Driver\n' +
      'installieren, APK unter apps/android/ ablegen, Capabilities + Services einkommentieren,\n' +
      'diesen Throw entfernen.',
    );
  },
} as Options.Testrunner;
