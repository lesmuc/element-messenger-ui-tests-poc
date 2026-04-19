#!/usr/bin/env bash
# Patcht die Element-X-APK: NSC erlaubt Cleartext → Tests reden per HTTP
# mit dem lokalen Synapse. Ergebnis: apps/android/element-patched.apk.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APKS_DIR="${HERE}/apps/android"
SRC_APK="${1:-${APKS_DIR}/202604020.apk}"
OUT_APK="${APKS_DIR}/element-patched.apk"
UNPACK_DIR="${APKS_DIR}/element-unpacked"

KEYSTORE="${HOME}/.android/debug.keystore"
KEYSTORE_ALIAS="androiddebugkey"
KEYSTORE_PASS="android"

if [ ! -f "$SRC_APK" ]; then
  echo "❌ Source-APK nicht gefunden: $SRC_APK" >&2
  echo "   Entweder Parameter übergeben oder Default 202604020.apk in apps/android ablegen:" >&2
  echo "   gh release download v26.04.2 --repo element-hq/element-x-android --pattern '202604020.apk' --dir apps/android" >&2
  exit 1
fi

if [ ! -f "$KEYSTORE" ]; then
  echo "→ Debug-Keystore fehlt, lege neuen an"
  mkdir -p "$(dirname "$KEYSTORE")"
  keytool -genkeypair -v \
    -keystore "$KEYSTORE" \
    -storepass "$KEYSTORE_PASS" \
    -keypass "$KEYSTORE_PASS" \
    -alias "$KEYSTORE_ALIAS" \
    -keyalg RSA -keysize 2048 -validity 10000 \
    -dname "CN=Android Debug,O=Android,C=US"
fi

APKSIGNER=$(ls "${ANDROID_HOME}"/build-tools/*/apksigner 2>/dev/null | sort -V | tail -1)
if [ -z "$APKSIGNER" ]; then
  echo "❌ apksigner nicht gefunden. ANDROID_HOME gesetzt? build-tools installiert?" >&2
  exit 1
fi

echo "→ Entpacke APK mit apktool"
rm -rf "$UNPACK_DIR"
apktool d -f -o "$UNPACK_DIR" "$SRC_APK" > /dev/null

NSC="${UNPACK_DIR}/res/xml/network_security_config.xml"
if [ ! -f "$NSC" ]; then
  echo "❌ network_security_config.xml nicht gefunden in $UNPACK_DIR/res/xml/" >&2
  exit 1
fi

echo "→ Patche network_security_config.xml → cleartextTrafficPermitted=true"
cat > "$NSC" <<'XML'
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="system" />
            <certificates src="user" />
        </trust-anchors>
    </base-config>
</network-security-config>
XML

echo "→ Baue APK wieder zusammen"
apktool b -o "${OUT_APK}.unsigned" "$UNPACK_DIR" > /dev/null

echo "→ Zipalign + signieren mit Debug-Keystore"
ZIPALIGN=$(ls "${ANDROID_HOME}"/build-tools/*/zipalign 2>/dev/null | sort -V | tail -1)
if [ -n "$ZIPALIGN" ]; then
  "$ZIPALIGN" -p -f 4 "${OUT_APK}.unsigned" "${OUT_APK}.aligned" > /dev/null
  mv "${OUT_APK}.aligned" "${OUT_APK}.unsigned"
fi

"$APKSIGNER" sign \
  --ks "$KEYSTORE" \
  --ks-key-alias "$KEYSTORE_ALIAS" \
  --ks-pass "pass:$KEYSTORE_PASS" \
  --key-pass "pass:$KEYSTORE_PASS" \
  --out "$OUT_APK" \
  "${OUT_APK}.unsigned"

rm -f "${OUT_APK}.unsigned" "${OUT_APK}.idsig"
rm -rf "$UNPACK_DIR"

echo "✓ Gepatchte APK: $OUT_APK ($(du -h "$OUT_APK" | cut -f1))"
