/**
 * Page-Object für einen Element-Web-Raum.
 *
 * Bewusst minimal gehalten: Wir testen nur Senden und Empfangen von
 * Nachrichten. Raum-Erstellung, Einladung und Beitritt laufen in diesem
 * Setup über die Matrix-Client-API (siehe `helpers/synapse-admin.ts`),
 * nicht über die UI.
 *
 * `openRoomById` navigiert per Hash-Route direkt in den Raum und umgeht
 * damit die Room-Liste und die Sidebar — das macht Tests unabhängig von
 * Sortierung, Ungelesen-Badges und Onboarding-Overlays.
 */
export class RoomPage {
  constructor(private readonly browser: WebdriverIO.Browser) {}

  async openRoomById(roomId: string): Promise<void> {
    await this.browser.url(`/#/room/${roomId}`);
    await this.browser.$(
      '.mx_MessageComposer, [role="textbox"][contenteditable="true"]',
    ).waitForDisplayed({ timeout: 60_000, timeoutMsg: 'Composer wurde nicht angezeigt' });
  }

  async sendMessage(text: string): Promise<void> {
    // Der Composer ist ein contenteditable-Div (kein <input>), deshalb
    // funktionieren hier setValue + keys(Enter) zum Absenden.
    const composer = await this.browser.$(
      '.mx_BasicMessageComposer_input, [role="textbox"][contenteditable="true"]',
    );
    await composer.waitForDisplayed({ timeout: 10_000 });
    await composer.click();
    await composer.setValue(text);
    await this.browser.keys(['Enter']);
  }

  async waitForMessage(text: string): Promise<void> {
    // Wartet, bis ein EventTile mit exakt passendem Text in der Timeline
    // erscheint. Matrix-Sync braucht je nach Netzlast bis zu einigen
    // Sekunden — Timeout großzügig.
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
