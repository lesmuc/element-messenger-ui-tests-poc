import type { Options } from '@wdio/types';
import { resolve } from 'node:path';
import { sharedConfig } from './wdio.shared.conf';

// Muss vor sharedConfig-Import gesetzt sein (screenshots.ts liest beim Laden).
process.env.UI_TEST_PLATFORM = 'android';

// Voraussetzungen vor `npm run test:android`: siehe README „ — Android".
const apkPath = process.env.ANDROID_APK_PATH
  ? resolve(process.env.ANDROID_APK_PATH)
  : resolve(__dirname, '..', 'apps', 'android', 'element-patched.apk');

function sessionCap(udid: string, systemPort: number) {
  return {
    platformName: 'Android',
    'appium:automationName': 'UIAutomator2',
    'appium:udid': udid,
    'appium:app': apkPath,
    'appium:autoGrantPermissions': true,
    'appium:newCommandTimeout': 300,
    // Pro Session eigener systemPort — sonst kollidieren parallele UIAutomator2-Bridges.
    'appium:systemPort': systemPort,
    'appium:skipDeviceInitialization': true,
    // Gepatchte APK (Debug-Key) vs. evtl. vorher installierte Release (F-Droid-Key):
    // Signatur-Mismatch erzwingt Uninstall-First.
    'appium:fullReset': true,
  };
}

export const config: Options.Testrunner = {
  ...sharedConfig,
  specs: ['../test/specs/android/**/*.spec.ts'],

  capabilities: {
    alice: { capabilities: sessionCap('emulator-5554', 8200) },
    bob:   { capabilities: sessionCap('emulator-5556', 8201) },
  },

  services: [['appium', { command: 'appium', args: { relaxedSecurity: true } }]],
} as Options.Testrunner;
