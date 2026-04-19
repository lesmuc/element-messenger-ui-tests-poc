import { browser, multiremotebrowser } from '@wdio/globals';
import { mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// UI_TEST_PLATFORM wird pro wdio-Config gesetzt ('web'/'android'/'ios') —
// Screenshots landen in screenshots/<platform>/.
const PLATFORM = process.env.UI_TEST_PLATFORM ?? 'unknown';
const SCREENSHOTS_DIR = join(__dirname, '..', '..', 'screenshots', PLATFORM);

let counter = 0;

export function resetSnapCounter(): void {
  counter = 0;
}

// Fehlschläge werden nur geloggt, nicht geworfen: ein Screenshot-Fehler soll
// weder einen grünen Test umkippen noch einen roten zusätzlich verschleiern.
export async function snap(stepName: string): Promise<void> {
  if (!existsSync(SCREENSHOTS_DIR)) {
    mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  const safeName = stepName.replace(/[^a-z0-9_-]/gi, '_').slice(0, 60);
  const idx = String(++counter).padStart(2, '0');

  if (browser.isMultiremote) {
    for (const instanceName of multiremotebrowser.instances) {
      try {
        const instance = multiremotebrowser.getInstance(instanceName) as WebdriverIO.Browser;
        const path = join(SCREENSHOTS_DIR, `${idx}_${safeName}_${instanceName}.png`);
        await instance.saveScreenshot(path);
        console.log(`  📸 ${path}`);
      } catch (e) {
        console.warn(`  ⚠️  Screenshot "${stepName}" für ${instanceName} fehlgeschlagen: ${(e as Error).message}`);
      }
    }
  } else {
    try {
      const path = join(SCREENSHOTS_DIR, `${idx}_${safeName}.png`);
      await browser.saveScreenshot(path);
      console.log(`  📸 ${path}`);
    } catch (e) {
      console.warn(`  ⚠️  Screenshot "${stepName}" fehlgeschlagen: ${(e as Error).message}`);
    }
  }
}
