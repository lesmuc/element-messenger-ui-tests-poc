#!/usr/bin/env bash
# Erzeugt und patcht die Synapse-Testkonfiguration, sodass der UI-Test-
# Homeserver reproduzierbar gestartet werden kann.
#
# Idempotent: mehrfacher Aufruf ist sicher — einmal erzeugte Dateien
# werden nicht überschrieben; Test-Einstellungen werden nur angehängt,
# wenn sie noch nicht drin sind.
#
# Lokal und in CI identisch nutzbar. Aufruf aus ui-tests/:
#   ./scripts/setup-synapse.sh

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATA_DIR="${HERE}/synapse/data"
YAML="${DATA_DIR}/homeserver.yaml"
MARKER="# --- Test-spezifische Einstellungen (durch ui-tests-Setup ergänzt) ---"

mkdir -p "${DATA_DIR}"

if [ ! -f "${YAML}" ]; then
  echo "→ Erzeuge Synapse-Basiskonfiguration via 'docker compose run generate'..."
  (cd "${HERE}" && docker compose run --rm synapse generate)
fi

if grep -qF "${MARKER}" "${YAML}"; then
  echo "→ Test-Einstellungen sind bereits in homeserver.yaml vorhanden, überspringe Patch."
else
  echo "→ Hänge Test-Einstellungen an homeserver.yaml an..."
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

echo "✓ Synapse-Konfiguration bereit."
