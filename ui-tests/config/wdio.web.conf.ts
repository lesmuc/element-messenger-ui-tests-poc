import type { Options } from '@wdio/types';
import { sharedConfig } from './wdio.shared.conf';

// Muss vor sharedConfig-Import gesetzt sein (screenshots.ts liest beim Laden).
process.env.UI_TEST_PLATFORM = 'web';

const baseUrl = process.env.ELEMENT_URL ?? 'http://localhost:8080';

export const config: Options.Testrunner = {
  ...sharedConfig,
  specs: ['../test/specs/web/**/*.spec.ts'],
  maxInstances: 1,
  capabilities: {
    alice: {
      capabilities: {
        browserName: 'chrome',
        'goog:chromeOptions': {
          args: [
            '--lang=en-US',
            ...(process.env.HEADED ? [] : ['--headless=new', '--disable-gpu', '--window-size=1280,900']),
          ],
          prefs: { 'intl.accept_languages': 'en-US,en' },
        },
      },
    },
    bob: {
      capabilities: {
        browserName: 'chrome',
        'goog:chromeOptions': {
          args: [
            '--lang=en-US',
            ...(process.env.HEADED ? [] : ['--headless=new', '--disable-gpu', '--window-size=1280,900']),
          ],
          prefs: { 'intl.accept_languages': 'en-US,en' },
        },
      },
    },
  },
  baseUrl,
} as Options.Testrunner;
