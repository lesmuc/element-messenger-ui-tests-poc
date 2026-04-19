export class AndroidRoomPage {
  constructor(private readonly browser: WebdriverIO.Browser) {}

  async openByName(roomName: string): Promise<void> {
    const b = this.browser;

    const tile = await b.$(`android=new UiSelector().text("${roomName}")`);
    await tile.waitForDisplayed({ timeout: 30_000 });
    await tile.click();

    // Timeline als Anker, dass wir wirklich in der Room-View gelandet sind.
    await b
      .$('android=new UiSelector().resourceId("timeline")')
      .waitForDisplayed({ timeout: 30_000 });
  }

  async acceptInvite(roomName: string): Promise<void> {
    const b = this.browser;

    const invitesTab = await b.$('android=new UiSelector().text("Invites")');
    await invitesTab.waitForDisplayed({ timeout: 30_000 });
    await invitesTab.click();

    const inviteTile = await b.$(
      `android=new UiSelector().textContains("${roomName}")`,
    );
    await inviteTile.waitForDisplayed({ timeout: 30_000 });
    await inviteTile.click();

    const acceptBtn = await b.$('android=new UiSelector().text("Accept")');
    await acceptBtn.waitForDisplayed({ timeout: 30_000 });
    await acceptBtn.click();

    await b
      .$('android=new UiSelector().resourceId("timeline")')
      .waitForDisplayed({ timeout: 30_000 });
  }

  async sendMessage(text: string): Promise<void> {
    const b = this.browser;

    const editorSelector = 'android=new UiSelector().resourceId("text_editor")';
    await b.$(editorSelector).waitForDisplayed({ timeout: 15_000 });
    await b.$(editorSelector).click();
    await b.pause(500);

    // `adb shell input` erwartet Leerzeichen als `%s`.
    const escaped = text.replace(/ /g, '%s');
    await b.executeScript('mobile: shell', [
      { command: 'input', args: ['text', escaped] },
    ]);
    await b.pause(400);

    const sendBtn = await b.$(
      'android=new UiSelector().descriptionContains("Send")',
    );
    await sendBtn.waitForDisplayed({ timeout: 10_000 });
    await sendBtn.click();
  }

  async waitForMessage(text: string): Promise<void> {
    await this.browser.waitUntil(
      async () => {
        const msg = await this.browser.$(
          `android=new UiSelector().textContains("${text}")`,
        );
        return msg.isExisting();
      },
      { timeout: 60_000, timeoutMsg: `Nachricht "${text}" ist nicht in der Timeline erschienen` },
    );
  }
}
