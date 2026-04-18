/**
 * Screenshot-Helper
 * =================
 *
 * Speichert Screenshots aller aktiven Browser-Sessions (beim Web-Test also
 * Alice + Bob) in `ui-tests/screenshots/`. Dateinamen sind nummeriert, damit
 * die zeitliche Reihenfolge in der Datei-Ansicht sofort erkennbar ist:
 *
 *   01_after-login_alice.png
 *   01_after-login_bob.png
 *   02_message-sent_alice.png
 *   ...
 *
 * Verwendung im Spec:
 *   import { snap } from '../../helpers/screenshots';
 *   await snap('after-login');
 *
 * Verwendung im wdio-Hook (Fehlerfall):
 *   await snap(`FAILED_${testTitle}`);
 */

import { multiremotebrowser } from '@wdio/globals';
import { mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const SCREENSHOTS_DIR = join(__dirname, '..', '..', 'screenshots');

// Fortlaufende Nummer, damit die Reihenfolge beim Sortieren erhalten bleibt.
// Wird beim Spec-Start via resetSnapCounter() zurückgesetzt, falls gewünscht.
let counter = 0;

export function resetSnapCounter(): void {
  counter = 0;
}

/**
 * Macht für jede aktive multiremote-Instanz einen Screenshot.
 * Fehlschläge einzelner Screenshots werden nur geloggt und lösen keine
 * Exception aus — damit ein Screenshot-Fehler weder einen ansonsten
 * erfolgreichen Test umschmeißt noch einen bereits fehlschlagenden
 * Test zusätzlich verschleiert.
 */
export async function snap(stepName: string): Promise<void> {
  if (!existsSync(SCREENSHOTS_DIR)) {
    mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  const safeName = stepName.replace(/[^a-z0-9_-]/gi, '_').slice(0, 60);
  const idx = String(++counter).padStart(2, '0');

  // multiremotebrowser.instances ist ein Array mit den Namen der konfigurierten
  // Sessions (hier: ['alice', 'bob']). Für nicht-multiremote-Tests fällt dieser
  // Pfad auf eine leere Liste zurück — dann machen wir einen Single-Screenshot.
  const instances: string[] = (multiremotebrowser as unknown as { instances?: string[] }).instances ?? [];

  if (instances.length === 0) {
    try {
      const path = join(SCREENSHOTS_DIR, `${idx}_${safeName}.png`);
      await (multiremotebrowser as unknown as WebdriverIO.Browser).saveScreenshot(path);
      console.log(`  📸 ${path}`);
    } catch (e) {
      console.warn(`  ⚠️  Screenshot "${stepName}" fehlgeschlagen: ${(e as Error).message}`);
    }
    return;
  }

  for (const instanceName of instances) {
    try {
      const browser = multiremotebrowser.getInstance(instanceName) as WebdriverIO.Browser;
      const path = join(SCREENSHOTS_DIR, `${idx}_${safeName}_${instanceName}.png`);
      await browser.saveScreenshot(path);
      console.log(`  📸 ${path}`);
    } catch (e) {
      console.warn(`  ⚠️  Screenshot "${stepName}" für ${instanceName} fehlgeschlagen: ${(e as Error).message}`);
    }
  }
}
