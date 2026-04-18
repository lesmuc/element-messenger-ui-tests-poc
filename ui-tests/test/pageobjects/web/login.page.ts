import type { ChainablePromiseElement } from 'webdriverio';

/**
 * Page-Object für den Element-Web-Login.
 *
 * Element-Web startet — abhängig vom Onboarding-Zustand des Profils —
 * entweder direkt auf `/#/login` oder zuerst auf `/#/welcome`. `open()`
 * kommt mit beiden Fällen zurecht: auf Welcome wird der „Sign in"-
 * Button geklickt; ist er nicht da, sind wir bereits auf dem Login-
 * Formular.
 *
 * Hinweis zum Locale: Chrome wird in wdio.web.conf.ts explizit auf
 * en-US gestellt, damit die Button-/Label-Texte hier stabil auf
 * Englisch sind und die Selectors nicht mehrsprachig sein müssen.
 */
export class LoginPage {
  constructor(private readonly browser: WebdriverIO.Browser) {}

  async open(): Promise<void> {
    await this.browser.url('/');
    await this.browser.waitUntil(
      async () => (await this.browser.getTitle()).length > 0,
      { timeout: 30_000, timeoutMsg: 'Element-Web konnte nicht geladen werden' },
    );

    try {
      const welcomeSignIn = await this.browser.$(
        '//*[@role="button" or self::a or self::button][normalize-space()="Sign in"]',
      );
      if (await welcomeSignIn.isExisting()) {
        await welcomeSignIn.click();
      }
    } catch {
      // Bereits auf dem Login-Formular, kein Welcome-Button nötig.
    }
  }

  private usernameInput(): ChainablePromiseElement {
    return this.browser.$('#mx_LoginForm_username');
  }

  private passwordInput(): ChainablePromiseElement {
    return this.browser.$('#mx_LoginForm_password');
  }

  private signInButton(): ChainablePromiseElement {
    return this.browser.$('.mx_Login_submit');
  }

  async signIn(username: string, password: string): Promise<void> {
    const user = this.usernameInput();
    await user.waitForDisplayed({ timeout: 30_000 });
    await user.setValue(username);

    const pass = this.passwordInput();
    await pass.setValue(password);

    const submit = this.signInButton();
    await submit.waitForEnabled({ timeout: 10_000 });
    await submit.click();
  }

  async waitLoggedIn(): Promise<void> {
    await this.browser.waitUntil(
      async () => {
        const spaces = await this.browser.$('.mx_SpacePanel, .mx_LeftPanel');
        return spaces.isExisting();
      },
      { timeout: 60_000, timeoutMsg: 'Home-Screen nach Login wurde nicht erreicht' },
    );
  }
}
