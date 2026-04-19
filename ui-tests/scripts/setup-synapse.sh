#!/usr/bin/env bash
# Erzeugt homeserver.yaml + patcht Test-Einstellungen (registration on,
# encryption off, hohe Rate-Limits). Idempotent.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATA_DIR="${HERE}/synapse/data"
YAML="${DATA_DIR}/homeserver.yaml"
MARKER="# --- Test-spezifische Einstellungen (durch ui-tests-Setup ergänzt) ---"

mkdir -p "${DATA_DIR}"

if [ ! -f "${YAML}" ]; then
  echo "→ Erzeuge Synapse-Basiskonfiguration via 'docker compose run generate'..."
  (cd "${HERE}" && docker compose run --rm synapse generate)
  # Synapse setzt Ownership auf uid 991 (Container-User). Auf Linux-Docker
  # ohne UID-Mapping (z.B. GitHub-Runner) kann der Host-User dann nichts mehr
  # an der Datei ändern — zurückchownen.
  docker run --rm -v "${DATA_DIR}:/data" alpine chown -R "$(id -u):$(id -g)" /data
fi

if grep -qF "${MARKER}" "${YAML}"; then
  echo "→ Test-Einstellungen sind bereits in homeserver.yaml vorhanden, überspringe Patch."
else
  echo "→ Hänge Test-Einstellungen an homeserver.yaml an..."
  docker run --rm -v "${DATA_DIR}:/data" alpine chown -R "$(id -u):$(id -g)" /data
  cat >> "${YAML}" <<'YAML'
suppress_key_server_warning: true

# --- Test-spezifische Einstellungen (durch ui-tests-Setup ergänzt) ---
enable_registration: true
enable_registration_without_verification: true
encryption_enabled_by_default_for_room_type: "off"
rc_message:
  per_second: 1000
  burst_count: 1000
rc_registration:
  per_second: 1000
  burst_count: 1000
rc_login:
  address:
    per_second: 1000
    burst_count: 1000
  account:
    per_second: 1000
    burst_count: 1000
  failed_attempts:
    per_second: 1000
    burst_count: 1000
YAML
fi

# Ownership zurück auf 991:991, damit der Synapse-Container lesen/schreiben kann.
docker run --rm -v "${DATA_DIR}:/data" alpine chown -R 991:991 /data

echo "✓ Synapse-Konfiguration bereit."
