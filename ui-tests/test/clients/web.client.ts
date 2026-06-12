import type { ChainablePromiseElement } from 'webdriverio';
import { LoginPage } from '../pageobjects/web/login.page';
import { RoomPage } from '../pageobjects/web/room.page';
import { joinRoom, type UserCreds } from '../helpers/synapse-admin';
import type { MessengerClient, RoomRef } from './messenger-client';

export class WebMessengerClient implements MessengerClient {
  private readonly login: LoginPage;
  private readonly room: RoomPage;

  constructor(private readonly browser: WebdriverIO.Browser) {
    this.login = new LoginPage(browser);
    this.room = new RoomPage(browser);
  }

  async logIn(username: string, password: string): Promise<void> {
    await this.login.open();
    await this.login.signIn(username, password);
    await this.login.waitLoggedIn();
  }

  async openRoom(room: RoomRef): Promise<void> {
    await this.room.openRoomById(room.id);
  }

  async joinRoomFromInvite(room: RoomRef, creds: UserCreds): Promise<void> {
    await joinRoom(creds, room.id);
    await this.room.openRoomById(room.id);
  }

  async sendMessage(text: string): Promise<void> {
    await this.room.sendMessage(text);
  }

  async waitForMessage(text: string): Promise<void> {
    await this.room.waitForMessage(text);
  }

  messageTile(text: string): ChainablePromiseElement {
    return this.browser.$(
      `//*[contains(@class, "mx_EventTile")]//*[normalize-space()="${text}"]`,
    );
  }
}
