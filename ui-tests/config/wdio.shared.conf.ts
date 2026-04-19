import type { Options, Frameworks } from '@wdio/types';
import { snap } from '../test/helpers/screenshots';

export const sharedConfig: Partial<Options.Testrunner> = {
  runner: 'local',
  framework: 'mocha',
  mochaOpts: {
    ui: 'bdd',
    // Großzügig, damit Two-Emulator-Android-Runs auf schwächerer Runner-Hardware
    // nicht am Mocha-Hard-Timeout zerschlagen (lokal: ~30 s, Runner-Mac bis ~4 min).
    timeout: 300_000,
  },
  reporters: ['spec'],
  logLevel: 'warn',
  bail: 0,
  waitforTimeout: 30_000,
  // Session-Create kann auf langsameren Mobile-Runnern mehrere Minuten dauern,
  // wenn Appium intern adb-Retries läuft. Default 120 s ist dann knapp.
  connectionRetryTimeout: 240_000,
  connectionRetryCount: 3,

  // Bei Fehlschlag Screenshots aller aktiven Sessions — Test-Titel im Dateinamen.
  afterTest: async function (
    test: Frameworks.Test,
    _context: unknown,
    result: Frameworks.TestResult,
  ): Promise<void> {
    if (!result.passed) {
      await snap(`FAILED_${test.title}`);
    }
  },
};
