import type { ChainablePromiseElement } from 'webdriverio';

// Chrome wird in wdio.web.conf.ts auf en-US gezwungen, damit die Text-Selectors
// hier nicht mehrsprachig sein müssen.
export class LoginPage {
  constructor(private readonly browser: WebdriverIO.Browser) {}

  async open(): Promise<void> {
    await this.browser.url('/');

    // Element-Web startet je nach Profil-Zustand auf /#/welcome oder /#/login
    // — aktiv auf einen der beiden Anker warten ist robuster gegen
    // Service-Worker-/Asset-Delays als ein fester Sleep.
    const welcomeSignInXPath =
      '//*[@role="button" or self::a or self::button][normalize-space()="Sign in"]';
    await this.browser.waitUntil(
      async () => {
        const onLogin = await this.browser.$('#mx_LoginForm_username').isExisting();
        if (onLogin) return true;
        const onWelcome = await this.browser.$(welcomeSignInXPath).isExisting();
        return onWelcome;
      },
      { timeout: 30_000, timeoutMsg: 'Weder Welcome- noch Login-Page wurde gerendert' },
    );

    const welcomeSignIn = await this.browser.$(welcomeSignInXPath);
    if (await welcomeSignIn.isExisting()) {
      await welcomeSignIn.click();
      await this.browser.$('#mx_LoginForm_username').waitForDisplayed({ timeout: 30_000 });
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
