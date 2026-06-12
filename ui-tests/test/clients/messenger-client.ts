import type { ChainablePromiseElement } from 'webdriverio';
import type { UserCreds } from '../helpers/synapse-admin';
import { WebMessengerClient } from './web.client';
import { AndroidMessengerClient } from './android.client';

export interface RoomRef {
  id: string;
  name: string;
}

/**
 * Plattformneutrale Schnittstelle auf Absichtsebene („melde dich an",
 * „öffne den Raum", …). Specs programmieren nur gegen dieses Interface;
 * die Screen-Abläufe dahinter sind Sache der Plattform-Implementierung.
 */
export interface MessengerClient {
  /** Kompletter Login bis der Home-Screen erreicht ist. */
  logIn(username: string, password: string): Promise<void>;

  /** Öffnet einen Raum, in dem der Nutzer bereits Mitglied ist. */
  openRoom(room: RoomRef): Promise<void>;

  /**
   * Bringt einen eingeladenen Nutzer in den Raum. Wie, entscheidet die
   * Plattform: Web joint per Matrix-API („minimize UI driving"), Android
   * nimmt den Invite bewusst über die UI an.
   */
  joinRoomFromInvite(room: RoomRef, creds: UserCreds): Promise<void>;

  sendMessage(text: string): Promise<void>;
  waitForMessage(text: string): Promise<void>;

  /** Timeline-Element der Nachricht, für Sichtbarkeits-Asserts im Spec. */
  messageTile(text: string): ChainablePromiseElement;
}

export function createMessengerClient(browser: WebdriverIO.Browser): MessengerClient {
  const platform = process.env.UI_TEST_PLATFORM;
  switch (platform) {
    case 'web':
      return new WebMessengerClient(browser);
    case 'android':
      return new AndroidMessengerClient(browser);
    default:
      throw new Error(`Kein MessengerClient für UI_TEST_PLATFORM "${platform}" implementiert`);
  }
}
