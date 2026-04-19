#!/usr/bin/env bash
# Startet zwei Android-Emulatoren (Alice auf 5554, Bob auf 5556), legt das
# Bob-AVD bei Bedarf an und deaktiviert Stylus-Onboarding + Animationen.
# Idempotent.

set -euo pipefail

# Ubuntu-CI hat die Android-Tools nicht per Default im PATH — lokal meist schon.
# Doppelter Eintrag schadet nicht.
export PATH="${ANDROID_HOME}/emulator:${ANDROID_HOME}/platform-tools:${ANDROID_HOME}/cmdline-tools/latest/bin:${PATH}"

# `avdmanager create` und `emulator` verwenden unterschiedliche AVD-Pfade,
# wenn ANDROID_AVD_HOME nicht explizit gesetzt ist — dann findet der
# Emulator auf GHA-Runnern das frisch erstellte AVD nicht.
export ANDROID_AVD_HOME="${HOME}/.android/avd"
mkdir -p "$ANDROID_AVD_HOME"

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AVD_ALICE="${AVD_NAME_ALICE:-Pixel_6a}"
AVD_BOB="${AVD_NAME_BOB:-Pixel_6a_bob}"
PORT_ALICE=5554
PORT_BOB=5556
SYSTEM_IMAGE="${ANDROID_SYSTEM_IMAGE:-system-images;android-36;google_apis;arm64-v8a}"
mkdir -p "${HERE}/logs"

ensure_avd() {
  local name="$1"
  if emulator -list-avds | grep -qx "$name"; then
    return
  fi
  echo "→ AVD $name anlegen aus $SYSTEM_IMAGE"
  echo 'no' | avdmanager create avd -n "$name" -k "$SYSTEM_IMAGE" -d pixel_6a > /dev/null
}

ensure_avd "$AVD_ALICE"
ensure_avd "$AVD_BOB"

start_emulator() {
  local avd="$1" port="$2"
  if adb devices | grep -qE "^emulator-${port}[[:space:]]+device"; then
    echo "→ Emulator $avd läuft bereits auf Port $port"
    return
  fi
  echo "→ Starte Emulator $avd auf Port $port"
  nohup "${ANDROID_HOME}/emulator/emulator" -avd "$avd" -port "$port" \
    -no-snapshot-load -no-boot-anim -no-audio \
    -memory 2048 -cores 1 \
    -netdelay none -netspeed full \
    > "${HERE}/logs/emulator-${port}.log" 2>&1 &
  disown
}

prep_device() {
  local port="$1"
  local serial="emulator-${port}"
  echo "→ Warte auf $serial (max 3 min) …"
  if ! timeout 180 adb -s "$serial" wait-for-device; then
    echo "✗ $serial ist nicht online geworden. Emulator-Log:"
    tail -100 "${HERE}/logs/emulator-${port}.log" || true
    exit 1
  fi
  local booted=0
  for i in $(seq 1 120); do
    if [ "$(adb -s "$serial" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ]; then
      echo "   ✓ $serial boot complete nach ${i}×2s"
      booted=1
      break
    fi
    sleep 2
  done
  if [ "$booted" != 1 ]; then
    echo "✗ $serial hat sys.boot_completed nicht gesetzt. Emulator-Log:"
    tail -100 "${HERE}/logs/emulator-${port}.log" || true
    exit 1
  fi

  echo "   → Stylus-Handwriting + Animationen auf $serial deaktivieren"
  for kv in \
    "secure stylus_handwriting_enabled 0" \
    "secure stylus_handwriting_onboarding_completed 1" \
    "secure stylus_buttons_enabled 0" \
    "global window_animation_scale 0" \
    "global transition_animation_scale 0" \
    "global animator_duration_scale 0"; do
    adb -s "$serial" shell settings put $kv || true
  done
}

# Seriell booten: erst Alice fertig, dann Bob — halbiert den Peak-RAM-Druck
# gegenüber parallelem Boot (wichtig auf 7 GB GHA-Runnern).
start_emulator "$AVD_ALICE" "$PORT_ALICE"
prep_device "$PORT_ALICE"
start_emulator "$AVD_BOB" "$PORT_BOB"
prep_device "$PORT_BOB"

echo "✓ Beide Emulatoren bereit — Alice: emulator-${PORT_ALICE}, Bob: emulator-${PORT_BOB}"
