#!/usr/bin/env bash
set -Eeuo pipefail

# Safe selective release overlay for SecureView's Hostinger shared-hosting layout.
# The production .env, vendor/, storage/, and customer data are never copied from
# the release ZIP. Database backup confirmation is required before any changes.

APP_DIR="${APP_DIR:-/home/u512629837/domains/secureviewcctv.shop/secureview_app}"
PUBLIC_DIR="${PUBLIC_DIR:-/home/u512629837/domains/secureviewcctv.shop/public_html}"
PHP_BIN="${PHP_BIN:-php}"
SITE_URL="${SITE_URL:-https://secureviewcctv.shop}"
RELEASE_ZIP="${1:-}"
CHECKSUM_FILE="${2:-}"

fail() {
    echo "ERROR: ${*}" >&2
    exit 1
}

[[ -n "$RELEASE_ZIP" && -n "$CHECKSUM_FILE" ]] || fail "Usage: APP_DIR='...' PUBLIC_DIR='...' SITE_URL='https://...' SECUREVIEW_DB_BACKUP_CONFIRMED=YES bash deploy-hostinger-release.sh release.zip release.zip.sha256"
[[ -f "$RELEASE_ZIP" ]] || fail "Release ZIP not found: $RELEASE_ZIP"
[[ -f "$CHECKSUM_FILE" ]] || fail "SHA-256 file not found: $CHECKSUM_FILE"
[[ -f "$APP_DIR/artisan" ]] || fail "Laravel app was not found at $APP_DIR"
[[ -f "$APP_DIR/.env" ]] || fail "App .env is missing at $APP_DIR/.env; no files were changed."
[[ -d "$APP_DIR/vendor" ]] || fail "vendor/ is missing. Install production dependencies before deploying."
[[ -d "$APP_DIR/storage" && -d "$APP_DIR/public" ]] || fail "Expected Laravel storage/ or public/ directory is missing."
[[ -d "$PUBLIC_DIR" ]] || fail "Web root was not found at $PUBLIC_DIR"
[[ "${SECUREVIEW_DB_BACKUP_CONFIRMED:-}" == "YES" ]] || fail "Confirm a recent, verified Hostinger database backup first, then rerun with SECUREVIEW_DB_BACKUP_CONFIRMED=YES."

for command_name in sha256sum unzip find grep curl cmp awk mktemp; do
    command -v "$command_name" >/dev/null 2>&1 || fail "Required command is missing: $command_name"
done
command -v "$PHP_BIN" >/dev/null 2>&1 || fail "PHP CLI was not found: $PHP_BIN"

ZIP_DIR="$(cd "$(dirname "$RELEASE_ZIP")" && pwd)"
ZIP_PATH="$ZIP_DIR/$(basename "$RELEASE_ZIP")"
CHECKSUM_PATH="$(cd "$(dirname "$CHECKSUM_FILE")" && pwd)/$(basename "$CHECKSUM_FILE")"

echo "=== 1. Verify the release ZIP checksum ==="
(cd "$ZIP_DIR" && sha256sum --check "$CHECKSUM_PATH") || fail "Checksum verification failed."

echo "=== 2. Verify archive paths and protected content ==="
if unzip -Z1 "$ZIP_PATH" | grep -Eq '(^/|(^|/)\.\.(/|$))'; then
    fail "Release archive contains an unsafe absolute or parent-traversal path."
fi
if unzip -Z1 "$ZIP_PATH" | grep -Eq '(^|/)\.env($|/)|(^|/)(vendor|storage)(/|$)'; then
    fail "Release archive includes protected .env, vendor/, or storage/ content. Nothing was deployed."
fi
unzip -t "$ZIP_PATH" >/dev/null || fail "Release ZIP integrity check failed."

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_ROOT="$APP_DIR/storage/app/deploy-backups/$STAMP"
STAGE_DIR="$(mktemp -d "${TMPDIR:-/tmp}/secureview-release.XXXXXX")"
FILE_LIST="$(mktemp "${TMPDIR:-/tmp}/secureview-release-files.XXXXXX")"
cleanup() {
    rm -f "$FILE_LIST"
    rm -rf "$STAGE_DIR"
}
trap cleanup EXIT

unzip -q "$ZIP_PATH" -d "$STAGE_DIR"
[[ -f "$STAGE_DIR/build/manifest.json" ]] || fail "Release is missing build/manifest.json."
[[ -f "$STAGE_DIR/app/Http/Controllers/InquiryController.php" ]] || fail "Release is missing an expected application controller."
[[ -f "$STAGE_DIR/app/Http/Controllers/Admin/VoucherController.php" ]] || fail "Release is missing the voucher administration controller."
[[ -f "$STAGE_DIR/app/Services/VoucherService.php" ]] || fail "Release is missing the voucher validation service."
[[ -f "$STAGE_DIR/app/Services/PayMongoLineItemBuilder.php" ]] || fail "Release is missing the discounted payment line-item builder."
[[ -f "$STAGE_DIR/database/migrations/2026_10_24_010000_sync_cancelled_order_payment_status.php" ]] || fail "Release is missing the cancelled-payment-status migration."
[[ -f "$STAGE_DIR/database/migrations/2026_10_27_000001_create_vouchers_and_add_order_discounts.php" ]] || fail "Release is missing the voucher/order-discount migration."

mkdir -p "$BACKUP_ROOT/files" "$BACKUP_ROOT/app-public" "$BACKUP_ROOT/web-public"

find "$STAGE_DIR" -type f -print0 > "$FILE_LIST"

echo "=== 3. Back up files that will be replaced ==="
while IFS= read -r -d '' staged_file; do
    relative_path="${staged_file#"$STAGE_DIR"/}"
    case "$relative_path" in
        build/*) continue ;;
        .env|.env/*|vendor/*|storage/*|public/*)
            fail "Refusing to overlay protected path: $relative_path"
            ;;
    esac

    target="$APP_DIR/$relative_path"
    if [[ -L "$target" ]]; then
        fail "Refusing to replace a symlinked application file: $target"
    fi
    if [[ -e "$target" ]]; then
        backup_target="$BACKUP_ROOT/files/$relative_path"
        mkdir -p "$(dirname "$backup_target")"
        cp -a "$target" "$backup_target"
    fi
done < "$FILE_LIST"

ENV_HASH_BEFORE="$(sha256sum "$APP_DIR/.env" | awk '{print $1}')"
if [[ -e "$APP_DIR/public/build" ]]; then
    [[ ! -L "$APP_DIR/public/build" ]] || fail "Refusing to replace symlinked app public/build."
    cp -a "$APP_DIR/public/build" "$BACKUP_ROOT/app-public/build"
fi
if [[ -e "$PUBLIC_DIR/build" ]]; then
    [[ ! -L "$PUBLIC_DIR/build" ]] || fail "Refusing to replace symlinked public_html/build."
    cp -a "$PUBLIC_DIR/build" "$BACKUP_ROOT/web-public/build"
fi

echo "=== 4. Overlay reviewed application files and built assets ==="
while IFS= read -r -d '' staged_file; do
    relative_path="${staged_file#"$STAGE_DIR"/}"
    case "$relative_path" in
        build/*) continue ;;
    esac

    target="$APP_DIR/$relative_path"
    mkdir -p "$(dirname "$target")"
    cp -a "$staged_file" "$target"
done < "$FILE_LIST"

mkdir -p "$APP_DIR/public/build" "$PUBLIC_DIR/build"
cp -a "$STAGE_DIR/build/." "$APP_DIR/public/build/"
cp -a "$STAGE_DIR/build/." "$PUBLIC_DIR/build/"

ENV_HASH_AFTER="$(sha256sum "$APP_DIR/.env" | awk '{print $1}')"
[[ "$ENV_HASH_BEFORE" == "$ENV_HASH_AFTER" ]] || fail "App .env changed unexpectedly."
cmp -s "$APP_DIR/public/build/manifest.json" "$PUBLIC_DIR/build/manifest.json" || fail "The app and web-root Vite manifests do not match."

echo "=== 5. Inspect migrations and apply only outstanding migrations ==="
cd "$APP_DIR"
"$PHP_BIN" artisan --version
"$PHP_BIN" artisan migrate:status
"$PHP_BIN" artisan migrate --force
"$PHP_BIN" artisan optimize:clear
"$PHP_BIN" artisan config:cache
"$PHP_BIN" artisan view:cache

echo "=== 6. Verify app health and a compiled asset over HTTPS ==="
HTTP_CODE="$(curl -sS -o /dev/null -w '%{http_code}' "${SITE_URL%/}/up")"
[[ "$HTTP_CODE" =~ ^2[0-9][0-9]$ ]] || fail "Health endpoint returned HTTP $HTTP_CODE."

ASSET_PATH="$("$PHP_BIN" -r '
$manifest = json_decode(file_get_contents($argv[1]), true);
if (!is_array($manifest)) { exit(2); }
foreach ($manifest as $entry) {
    if (isset($entry["file"]) && (str_ends_with($entry["file"], ".js") || str_ends_with($entry["file"], ".css"))) {
        echo $entry["file"];
        exit(0);
    }
}
exit(3);
' "$PUBLIC_DIR/build/manifest.json")" || fail "Could not locate a compiled JavaScript/CSS asset in the Vite manifest."
ASSET_CODE="$(curl -sS -o /dev/null -w '%{http_code}' "${SITE_URL%/}/build/$ASSET_PATH")"
[[ "$ASSET_CODE" =~ ^2[0-9][0-9]$ ]] || fail "Compiled asset returned HTTP $ASSET_CODE: /build/$ASSET_PATH"

echo "PASS: checksum and archive verified."
echo "PASS: .env hash unchanged; vendor/ and storage/ were not overlaid."
echo "PASS: migration command completed without a destructive reset."
echo "PASS: /up returned HTTP $HTTP_CODE and compiled asset returned HTTP $ASSET_CODE."
echo "Backup directory: $BACKUP_ROOT"
echo "Keep this backup until the site has been manually smoke-tested."
echo "The Hostinger scheduler cron should remain set to run 'artisan schedule:run' every minute."
