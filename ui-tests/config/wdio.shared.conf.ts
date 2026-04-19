import type { Options, Frameworks } from '@wdio/types';
import { snap } from '../test/helpers/screenshots';

export const sharedConfig: Partial<Options.Testrunner> = {
  runner: 'local',
  framework: 'mocha',
  mochaOpts: {
    ui: 'bdd',
    timeout: 120_000,
  },
  reporters: ['spec'],
  logLevel: 'warn',
  bail: 0,
  waitforTimeout: 30_000,
  connectionRetryTimeout: 120_000,
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
