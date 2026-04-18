/**
 * Synapse-Admin- und Matrix-Client-API-Helper
 * ===========================================
 *
 * Bereitet Testdaten (Benutzer, Räume, Mitgliedschaften) direkt gegen
 * Synapse vor, damit die wdio-Specs nicht für Setup-Flows durch die
 * Element-Web-UI klicken müssen.
 *
 * Hintergrund: Element-Webs eigene Playwright-Dokumentation empfiehlt
 * ausdrücklich "minimize UI driving for setup by using REST APIs instead"
 * — also „Setup möglichst über REST-APIs, nicht über die UI". Grund: Die
 * Create-Room-/Invite-UI ändert sich zwischen Versionen (Verschlüsselungs-
 * Toggle, Visibility-Presets, Invite-Autocomplete) und würde Setup-
 * Flakiness in jeden Test tragen. Die API bleibt stabil, die UI-Assertion
 * bleibt am Kern des Testziels.
 *
 * Auth-Strategien, die hier verwendet werden:
 *   1. Shared-Secret + HMAC  → Admin-Registrierung (vor dem ersten Login)
 *   2. Access-Token (Bearer) → alle normalen Client-API-Aufrufe danach
 *
 * Voraussetzungen:
 *   - Synapse läuft auf `SYNAPSE_URL` (Default http://localhost:8008)
 *   - `registration_shared_secret` ist in synapse/data/homeserver.yaml
 *     gesetzt (wird von `docker compose run --rm synapse generate`
 *     automatisch erzeugt)
 *   - In homeserver.yaml: `enable_registration: true`,
 *     `encryption_enabled_by_default_for_room_type: off`
 */

import { createHmac } from 'node:crypto';
import { request } from 'undici';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Rückgabe von `registerUser`. Enthält alles, was wir brauchen, um den
 * Benutzer anschließend per UI einzuloggen (username/password) oder per
 * API weiter zu steuern (access_token).
 */
export interface UserCreds {
  user_id: string;       // z. B. "@alice:localhost"
  access_token: string;  // Bearer-Token für spätere Client-API-Aufrufe
  home_server: string;   // Servername — sollte "localhost" sein
  device_id: string;     // von Synapse automatisch vergebenes Gerät
  username: string;      // Lokalteil, ohne @ und Server
  password: string;      // im Klartext — nur für Testzwecke!
}

const HS_URL = process.env.SYNAPSE_URL ?? 'http://localhost:8008';
const SERVER_NAME = process.env.SYNAPSE_SERVER_NAME ?? 'localhost';

/**
 * Holt das `registration_shared_secret` — bevorzugt aus der Umgebungs-
 * variable SYNAPSE_SHARED_SECRET (für CI), Fallback: Parsen der
 * generierten homeserver.yaml. Die Env-Variable hat Vorrang, damit man
 * in CI das Secret außerhalb der Repo-Checkout-Struktur setzen kann.
 */
function loadSharedSecret(): string {
  if (process.env.SYNAPSE_SHARED_SECRET) return process.env.SYNAPSE_SHARED_SECRET;

  const yamlPath = join(__dirname, '..', '..', 'synapse', 'data', 'homeserver.yaml');
  const yaml = readFileSync(yamlPath, 'utf8');
  const match = yaml.match(/^registration_shared_secret:\s*"(.+)"\s*$/m);
  if (!match) {
    throw new Error(
      `registration_shared_secret in ${yamlPath} nicht gefunden. ` +
      `Führe "docker compose run --rm synapse generate" aus oder setze SYNAPSE_SHARED_SECRET.`,
    );
  }
  return match[1];
}

/**
 * Legt einen Account über die Synapse-Admin-API an — funktioniert auch
 * ohne bereits bestehenden Admin-Account, weil das
 * `registration_shared_secret` den Zugriff autorisiert.
 *
 * Zweischritt-Protokoll:
 *   1. GET  /_synapse/admin/v1/register  → liefert eine einmalige Nonce
 *   2. POST /_synapse/admin/v1/register  → mit HMAC-Signatur über die Nonce
 *
 * Die HMAC-SHA1 ist von Synapse vorgegeben (NUL-getrennte Felder), nicht
 * von uns frei wählbar — siehe
 * https://element-hq.github.io/synapse/latest/admin_api/register_api.html
 */
export async function registerUser(
  username: string,
  password: string,
  admin = false,
): Promise<UserCreds> {
  const secret = loadSharedSecret();

  // Schritt 1: Nonce holen (einmalig gültig, verfällt serverseitig nach ~60 s).
  const nonceResp = await request(`${HS_URL}/_synapse/admin/v1/register`, { method: 'GET' });
  if (nonceResp.statusCode !== 200) {
    throw new Error(`Nonce-Anfrage fehlgeschlagen: HTTP ${nonceResp.statusCode}`);
  }
  const { nonce } = (await nonceResp.body.json()) as { nonce: string };

  // Schritt 2: HMAC-SHA1 über "nonce\0username\0password\0(admin|notadmin)"
  // mit dem Shared-Secret als Schlüssel. Reihenfolge und NUL-Bytes sind fix vorgegeben.
  const mac = createHmac('sha1', secret)
    .update(nonce).update('\0')
    .update(username).update('\0')
    .update(password).update('\0')
    .update(admin ? 'admin' : 'notadmin')
    .digest('hex');

  const regResp = await request(`${HS_URL}/_synapse/admin/v1/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ nonce, username, password, admin, mac }),
  });
  const body = (await regResp.body.json()) as Record<string, unknown>;
  if (regResp.statusCode !== 200) {
    throw new Error(`Registrierung fehlgeschlagen (HTTP ${regResp.statusCode}): ${JSON.stringify(body)}`);
  }

  return {
    user_id: body.user_id as string,
    access_token: body.access_token as string,
    home_server: body.home_server as string,
    device_id: body.device_id as string,
    username,
    password,
  };
}

/**
 * Baut eine vollständige Matrix-User-ID aus einem Lokalteil.
 * Beispiel: `userIdFor("alice") === "@alice:localhost"`.
 */
export function userIdFor(username: string): string {
  return `@${username}:${SERVER_NAME}`;
}

/**
 * Interner Wrapper für authentifizierte Matrix-Client-API-Aufrufe.
 * Setzt das Bearer-Token aus den Credentials und prüft den Statuscode.
 * Bei Non-200 wird eine Exception mit dem API-Response-Body ausgelöst —
 * das hilft beim Debuggen, weil Matrix-Fehler oft nur in `errcode` und
 * `error` stehen.
 */
async function clientApi<T>(
  creds: UserCreds,
  method: 'GET' | 'POST' | 'PUT',
  path: string,
  body?: unknown,
): Promise<T> {
  const resp = await request(`${HS_URL}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${creds.access_token}`,
      'content-type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const parsed = (await resp.body.json()) as Record<string, unknown>;
  if (resp.statusCode !== 200) {
    throw new Error(`${method} ${path} fehlgeschlagen (HTTP ${resp.statusCode}): ${JSON.stringify(parsed)}`);
  }
  return parsed as T;
}

/**
 * Erzeugt einen Raum im Namen von `creator` und lädt optional weitere
 * Benutzer direkt ein.
 *
 * Preset `private_chat`: invite-only, History nur für Mitglieder sichtbar,
 * **keine Default-Verschlüsselung** (die würde sonst durch `public_chat`
 * oder `trusted_private_chat` ausgelöst; zusätzlich ist sie in unserer
 * homeserver.yaml global über
 * `encryption_enabled_by_default_for_room_type: off` deaktiviert).
 *
 * `is_direct: false` sorgt dafür, dass der Raum NICHT als 1:1-DM in den
 * Client-Account-Data markiert wird — DMs haben in Element-Web eine
 * eigene Sidebar-Sektion, die Tests zusätzlich berühren würde.
 *
 * Rückgabe: die `room_id` (Format `!abcXYZ:localhost`).
 */
export async function createRoom(
  creator: UserCreds,
  options: { name: string; invite?: string[] },
): Promise<string> {
  const res = await clientApi<{ room_id: string }>(creator, 'POST', '/_matrix/client/v3/createRoom', {
    name: options.name,
    invite: options.invite ?? [],
    preset: 'private_chat',
    is_direct: false,
  });
  return res.room_id;
}

/**
 * Lässt `joiner` einem Raum beitreten. Voraussetzung: entweder der Raum
 * ist öffentlich, oder `joiner` wurde vorher eingeladen (`createRoom` mit
 * `invite: [joiner.user_id]`).
 *
 * `encodeURIComponent` ist nötig, weil Matrix-Raum-IDs mit `!` beginnen
 * und Doppelpunkte enthalten — beide müssen URL-codiert werden.
 */
export async function joinRoom(joiner: UserCreds, roomId: string): Promise<void> {
  await clientApi(joiner, 'POST', `/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/join`, {});
}

/**
 * CLI-Einstiegspunkt: `npx ts-node test/helpers/synapse-admin.ts`
 * legt einen zufälligen Testbenutzer an und gibt die Credentials als
 * JSON aus. Praktisch, um den Helper smoke-zu-testen oder um manuell in
 * Element-Web reinzuschauen (Benutzername und Passwort stehen im Output).
 */
if (require.main === module) {
  const uniq = Date.now();
  registerUser(`test_${uniq}`, `P@ssw0rd_${uniq}`).then((creds) => {
    console.log(JSON.stringify(creds, null, 2));
  }).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
