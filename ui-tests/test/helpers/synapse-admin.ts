// Setup-Helfer für Tests: spricht Synapse direkt an (Admin-Register + Client-API),
// damit Specs nicht durch die UI klicken müssen, um User/Räume/Mitgliedschaften
// herzustellen.

import { createHmac } from 'node:crypto';
import { request } from 'undici';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface UserCreds {
  user_id: string;
  access_token: string;
  home_server: string;
  device_id: string;
  username: string;
  password: string;
}

const HS_URL = process.env.SYNAPSE_URL ?? 'http://localhost:8008';
const SERVER_NAME = process.env.SYNAPSE_SERVER_NAME ?? 'localhost';

// Env-Variable hat Vorrang vor YAML-Parsing, damit CI das Secret außerhalb
// der Repo-Checkout-Struktur setzen kann.
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
 * Registriert einen Account via Synapse-Admin-API. HMAC-Format (SHA1,
 * NUL-getrennte Felder) ist von Synapse vorgegeben — nicht frei wählbar.
 * Siehe https://element-hq.github.io/synapse/latest/admin_api/register_api.html
 */
export async function registerUser(
  username: string,
  password: string,
  admin = false,
): Promise<UserCreds> {
  const secret = loadSharedSecret();

  const nonceResp = await request(`${HS_URL}/_synapse/admin/v1/register`, { method: 'GET' });
  if (nonceResp.statusCode !== 200) {
    throw new Error(`Nonce-Anfrage fehlgeschlagen: HTTP ${nonceResp.statusCode}`);
  }
  const { nonce } = (await nonceResp.body.json()) as { nonce: string };

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

export function userIdFor(username: string): string {
  return `@${username}:${SERVER_NAME}`;
}

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
 * `preset: private_chat` + `is_direct: false` bewusst gewählt: kein
 * Default-Encryption (würde sonst bei trusted_private_chat kommen), keine
 * Einsortierung unter der DM-Sidebar-Sektion in Element-Web.
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

// `encodeURIComponent`, weil Matrix-Raum-IDs `!` und `:` enthalten.
export async function joinRoom(joiner: UserCreds, roomId: string): Promise<void> {
  await clientApi(joiner, 'POST', `/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/join`, {});
}

// CLI-Einstiegspunkt: `npx ts-node test/helpers/synapse-admin.ts` legt einen
// Zufalls-User an und druckt die Creds — nützlich zum Smoke-Testen.
if (require.main === module) {
  const uniq = Date.now();
  registerUser(`test_${uniq}`, `P@ssw0rd_${uniq}`).then((creds) => {
    console.log(JSON.stringify(creds, null, 2));
  }).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
