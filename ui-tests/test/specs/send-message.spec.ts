import { multiremotebrowser, expect } from '@wdio/globals';
import {
  registerUser,
  userIdFor,
  createRoom,
  type UserCreds,
} from '../helpers/synapse-admin';
import { createMessengerClient } from '../clients/messenger-client';
import { snap, resetSnapCounter } from '../helpers/screenshots';

// Ein Spec für alle Plattformen: Die jeweilige wdio-Config setzt
// UI_TEST_PLATFORM, die Client-Factory liefert die passende Implementierung.
const platform = process.env.UI_TEST_PLATFORM ?? 'unknown';

describe(`Send message end-to-end (two users, unencrypted) — ${platform}`, () => {
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
    aliceCreds = await registerUser(aliceName, password);
    bobCreds = await registerUser(bobName, password);
    roomId = await createRoom(aliceCreds, {
      name: roomName,
      invite: [userIdFor(bobName)],
    });
    console.log(`Setup complete: room ${roomId}, alice=${aliceCreds.user_id}, bob=${bobCreds.user_id}`);
  });

  it('alice sends a message, bob receives it via UI', async () => {
    resetSnapCounter();

    const room = { id: roomId, name: roomName };
    const alice = createMessengerClient(
      multiremotebrowser.getInstance('alice') as WebdriverIO.Browser,
    );
    const bob = createMessengerClient(
      multiremotebrowser.getInstance('bob') as WebdriverIO.Browser,
    );

    await alice.logIn(aliceName, password);
    await bob.logIn(bobName, password);
    await snap('after-login');

    await alice.openRoom(room);
    await bob.joinRoomFromInvite(room, bobCreds);
    await snap('room-open');

    await alice.sendMessage(message);
    await snap('message-sent');

    await bob.waitForMessage(message);
    await snap('message-received');

    await expect(bob.messageTile(message)).toBeDisplayed();
  });
});
