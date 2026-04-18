import { multiremotebrowser, expect } from '@wdio/globals';
import {
  registerUser,
  userIdFor,
  createRoom,
  joinRoom,
  type UserCreds,
} from '../../helpers/synapse-admin';
import { LoginPage } from '../../pageobjects/web/login.page';
import { RoomPage } from '../../pageobjects/web/room.page';
import { snap, resetSnapCounter } from '../../helpers/screenshots';

describe('Send message end-to-end (two users, unencrypted)', () => {
  const uniq = Date.now();
  const aliceName = `alice_${uniq}`;
  const bobName = `bob_${uniq}`;
  const password = 'TestP@ssw0rd!';
  const roomName = `Test Room ${uniq}`;
  const message = `Hello Bob — ${uniq}`;

  let aliceCreds: UserCreds;
  let bobCreds: UserCreds;
  let roomId: string;

  before(async () => {
    // Setup über die Matrix-Client-Server-API — folgt Element-Webs eigener
    // Empfehlung "minimize UI driving for setup by using REST APIs instead".
    // Das hält den Test fokussiert auf den Send-/Receive-Pfad statt auch
    // zufällig die Raum-Erstellungs-UX zu verifizieren.
    aliceCreds = await registerUser(aliceName, password);
    bobCreds = await registerUser(bobName, password);
    roomId = await createRoom(aliceCreds, {
      name: roomName,
      invite: [userIdFor(bobName)],
    });
    await joinRoom(bobCreds, roomId);
    console.log(`Setup complete: room ${roomId}, alice=${aliceCreds.user_id}, bob=${bobCreds.user_id}`);
  });

  it('alice sends a message, bob receives it via UI', async () => {
    resetSnapCounter();

    const alice = multiremotebrowser.getInstance('alice') as WebdriverIO.Browser;
    const bob = multiremotebrowser.getInstance('bob') as WebdriverIO.Browser;

    const aliceLogin = new LoginPage(alice);
    const bobLogin = new LoginPage(bob);
    const aliceRoom = new RoomPage(alice);
    const bobRoom = new RoomPage(bob);

    await aliceLogin.open();
    await aliceLogin.signIn(aliceName, password);
    await aliceLogin.waitLoggedIn();

    await bobLogin.open();
    await bobLogin.signIn(bobName, password);
    await bobLogin.waitLoggedIn();
    await snap('after-login');

    await aliceRoom.openRoomById(roomId);
    await bobRoom.openRoomById(roomId);
    await snap('room-open');

    await aliceRoom.sendMessage(message);
    await snap('message-sent');

    await bobRoom.waitForMessage(message);
    await snap('message-received');

    const tile = await bob.$(
      `//*[contains(@class, "mx_EventTile")]//*[normalize-space()="${message}"]`,
    );
    await expect(tile).toBeDisplayed();
  });
});
