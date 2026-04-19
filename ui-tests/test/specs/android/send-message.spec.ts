import { multiremotebrowser, expect } from '@wdio/globals';
import {
  registerUser,
  userIdFor,
  createRoom,
  type UserCreds,
} from '../../helpers/synapse-admin';
import { AndroidLoginPage } from '../../pageobjects/android/login.page';
import { AndroidRoomPage } from '../../pageobjects/android/room.page';
import { snap, resetSnapCounter } from '../../helpers/screenshots';

describe('Element X Android — Send-Message (Two-Device)', () => {
  const uniq = Date.now();
  const aliceName = `alice_${uniq}`;
  const bobName = `bob_${uniq}`;
  const password = 'TestP@ssw0rd!';
  const roomName = `Test Room ${uniq}`;
  const message = `Hallo Bob aus Android ${uniq}`;
  const serverUrl = 'http://10.0.2.2:8008';

  let aliceCreds: UserCreds;
  let bobCreds: UserCreds;

  before(async () => {
    aliceCreds = await registerUser(aliceName, password);
    bobCreds = await registerUser(bobName, password);
    await createRoom(aliceCreds, {
      name: roomName,
      invite: [userIdFor(bobName)],
    });
    console.log(`Setup: ${aliceCreds.user_id} lädt ${bobCreds.user_id} ein in "${roomName}"`);
  });

  it('alice sendet per App, bob empfängt per App', async () => {
    resetSnapCounter();

    const alice = multiremotebrowser.getInstance('alice') as WebdriverIO.Browser;
    const bob = multiremotebrowser.getInstance('bob') as WebdriverIO.Browser;

    const aliceLogin = new AndroidLoginPage(alice);
    const bobLogin = new AndroidLoginPage(bob);
    const aliceRoom = new AndroidRoomPage(alice);
    const bobRoom = new AndroidRoomPage(bob);

    await aliceLogin.openCustomServer(serverUrl);
    await aliceLogin.enterCredentials(aliceName, password);
    await aliceLogin.waitLoggedIn();

    await bobLogin.openCustomServer(serverUrl);
    await bobLogin.enterCredentials(bobName, password);
    await bobLogin.waitLoggedIn();
    await snap('after-login');

    await aliceRoom.openByName(roomName);
    await bobRoom.acceptInvite(roomName);
    await snap('rooms-open');

    await aliceRoom.sendMessage(message);
    await snap('message-sent');

    await bobRoom.waitForMessage(message);
    await snap('message-received');

    const tile = await bob.$(
      `android=new UiSelector().textContains("${message}")`,
    );
    await expect(tile).toBeDisplayed();
  });
});
