import type { Options } from '@wdio/types';
import { sharedConfig } from './wdio.shared.conf';

// Muss vor sharedConfig-Import gesetzt sein (screenshots.ts liest beim Laden).
process.env.UI_TEST_PLATFORM = 'ios';

// Phase-3-Platzhalter — Aktivierung siehe README „Phase 3 — iOS".
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
      'wdio.ios.conf.ts: Phase-3-Platzhalter. Zum Aktivieren siehe README.',
    );
  },
} as Options.Testrunner;
