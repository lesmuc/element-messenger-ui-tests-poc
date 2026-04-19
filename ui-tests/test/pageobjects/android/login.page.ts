/**
 * Onboarding-Flow (Element X v26.04):
 *   1. Welcome-Screen → „Sign in" (resource-id: onboarding-sign_in)
 *   2. „You're about to sign in to matrix.org" → „Change account provider"
 *   3. Provider-Liste → „Other"
 *   4. Custom-Server-Seite → EditText resource-id: change_server-server
 *   5. Continue → Confirm-Screen („You're about to sign in to <server>") → Continue
 *   6. Username + Password eingeben → Sign in
 */
export class AndroidLoginPage {
  constructor(private readonly browser: WebdriverIO.Browser) {}

  async openCustomServer(serverUrl: string): Promise<void> {
    const b = this.browser;

    const signIn = await b.$(
      'android=new UiSelector().resourceId("onboarding-sign_in")',
    );
    await signIn.waitForDisplayed({ timeout: 60_000 });
    await signIn.click();

    const changeProvider = await b.$(
      'android=new UiSelector().textContains("Change account provider")',
    );
    await changeProvider.waitForDisplayed({ timeout: 30_000 });
    await changeProvider.click();

    const other = await b.$('android=new UiSelector().text("Other")');
    await other.waitForDisplayed({ timeout: 15_000 });
    await other.click();

    // Search-basierte UI: Treffer erscheint als Listen-Eintrag unter dem
    // Suchfeld, kein „Continue"-Button — wir tappen direkt den Treffer.
    const serverSelector = 'android=new UiSelector().resourceId("change_server-server")';
    await b.$(serverSelector).waitForDisplayed({ timeout: 15_000 });
    await b.$(serverSelector).click();
    // Nach dem Click re-mountet Compose das EditText; setValue scheitert.
    // `adb shell input text` geht über das System-IME und bleibt stabil.
    // Escapes: Leerzeichen → %s, : → \:
    await b.pause(500);
    const escaped = serverUrl.replace(/ /g, '%s').replace(/:/g, '\\:');
    await b.executeScript('mobile: shell', [
      { command: 'input', args: ['text', escaped] },
    ]);

    // Listen-Eintrag zeigt die URL ohne Schema (z.B. "10.0.2.2:8008").
    const hostPortion = serverUrl.replace(/^https?:\/\//, '');
    const serverResult = await b.$(
      `android=new UiSelector().text("${hostPortion}")`,
    );
    await serverResult.waitForDisplayed({ timeout: 30_000 });
    await serverResult.click();

    const confirmContinue = await b.$(
      'android=new UiSelector().text("Continue")',
    );
    await confirmContinue.waitForEnabled({ timeout: 30_000 });
    await confirmContinue.click();
  }

  async enterCredentials(username: string, password: string): Promise<void> {
    const b = this.browser;

    const userSelector = 'android=new UiSelector().resourceId("login-email_username")';
    await b.$(userSelector).waitForDisplayed({ timeout: 30_000 });
    await b.$(userSelector).click();
    await b.pause(400);
    await b.executeScript('mobile: shell', [
      { command: 'input', args: ['text', username] },
    ]);

    const passSelector = 'android=new UiSelector().resourceId("login-password")';
    await b.$(passSelector).waitForDisplayed({ timeout: 10_000 });
    await b.$(passSelector).click();
    await b.pause(400);
    await b.executeScript('mobile: shell', [
      { command: 'input', args: ['text', password] },
    ]);

    const submit = await b.$(
      'android=new UiSelector().resourceId("login-continue")',
    );
    await submit.waitForEnabled({ timeout: 30_000 });
    await submit.click();
  }

  // Onboarding-Screens erscheinen zeitversetzt nach dem Login-Submit.
  // Wir pollen aktiv: Home-Marker da → fertig; Skip-Button da → klicken;
  // sonst nächster Loop.
  async waitLoggedIn(): Promise<void> {
    const b = this.browser;
    const dismissSelectors = [
      'android=new UiSelector().text("Not now")',
      'android=new UiSelector().text("Skip this step")',
      'android=new UiSelector().text("Skip")',
    ];
    const homeMarker = 'android=new UiSelector().text("Chats")';

    await b.waitUntil(
      async () => {
        if (await b.$(homeMarker).isExisting()) return true;
        for (const sel of dismissSelectors) {
          const btn = await b.$(sel);
          if (await btn.isExisting() && await btn.isDisplayed()) {
            await btn.click();
            await b.pause(500);
            return false;
          }
        }
        return false;
      },
      { timeout: 90_000, interval: 1500, timeoutMsg: 'Home-Screen nach Login wurde nicht erreicht' },
    );
  }
}
