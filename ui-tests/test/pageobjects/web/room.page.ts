// Raum-Erstellung, Invite und Join laufen in diesem Setup über die Matrix-API
// (helpers/synapse-admin.ts), daher hat die RoomPage nur Send + Receive.
export class RoomPage {
  constructor(private readonly browser: WebdriverIO.Browser) {}

  // Hash-Route direkt — umgeht Room-Liste/Sidebar und deren Sortier- bzw.
  // Ungelesen-Badges.
  async openRoomById(roomId: string): Promise<void> {
    await this.browser.url(`/#/room/${roomId}`);
    await this.browser.$(
      '.mx_MessageComposer, [role="textbox"][contenteditable="true"]',
    ).waitForDisplayed({ timeout: 60_000, timeoutMsg: 'Composer wurde nicht angezeigt' });
  }

  async sendMessage(text: string): Promise<void> {
    const composer = await this.browser.$(
      '.mx_BasicMessageComposer_input, [role="textbox"][contenteditable="true"]',
    );
    await composer.waitForDisplayed({ timeout: 10_000 });
    await composer.click();
    await composer.setValue(text);
    await this.browser.keys(['Enter']);
  }

  async waitForMessage(text: string): Promise<void> {
    await this.browser.waitUntil(
      async () => {
        const tile = await this.browser.$(
          `//*[contains(@class, "mx_EventTile")]//*[normalize-space()="${text}"]`,
        );
        return tile.isExisting();
      },
      { timeout: 60_000, timeoutMsg: `Nachricht "${text}" ist nicht in der Timeline erschienen` },
    );
  }
}
