import type { ChainablePromiseElement } from 'webdriverio';
import { AndroidLoginPage } from '../pageobjects/android/login.page';
import { AndroidRoomPage } from '../pageobjects/android/room.page';
import type { UserCreds } from '../helpers/synapse-admin';
import type { MessengerClient, RoomRef } from './messenger-client';

// Der Emulator erreicht den Host-Synapse über die feste NAT-Alias-Adresse.
const SERVER_URL = 'http://10.0.2.2:8008';

export class AndroidMessengerClient implements MessengerClient {
  private readonly login: AndroidLoginPage;
  private readonly room: AndroidRoomPage;

  constructor(private readonly browser: WebdriverIO.Browser) {
    this.login = new AndroidLoginPage(browser);
    this.room = new AndroidRoomPage(browser);
  }

  async logIn(username: string, password: string): Promise<void> {
    await this.login.openCustomServer(SERVER_URL);
    await this.login.enterCredentials(username, password);
    await this.login.waitLoggedIn();
  }

  async openRoom(room: RoomRef): Promise<void> {
    await this.room.openByName(room.name);
  }

  // Invite-Annahme bewusst per UI — deckt anders als Web auch den
  // Invite-Flow der App ab. Die creds braucht nur die Web-Implementierung.
  async joinRoomFromInvite(room: RoomRef, _creds: UserCreds): Promise<void> {
    await this.room.acceptInvite(room.name);
  }

  async sendMessage(text: string): Promise<void> {
    await this.room.sendMessage(text);
  }

  async waitForMessage(text: string): Promise<void> {
    await this.room.waitForMessage(text);
  }

  messageTile(text: string): ChainablePromiseElement {
    return this.browser.$(`android=new UiSelector().textContains("${text}")`);
  }
}
