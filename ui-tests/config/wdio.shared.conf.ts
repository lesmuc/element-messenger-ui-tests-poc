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

  /**
   * Failure-Screenshot-Hook: wenn ein Test failt, wird automatisch ein
   * Screenshot aller aktiven Sessions gespeichert. Der Titel des Tests
   * landet im Dateinamen — erleichtert das Debuggen in der CI-Artifact-
   * Galerie. Key-Step-Screenshots im Spec-Code selbst bleiben davon
   * unberührt.
   */
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
