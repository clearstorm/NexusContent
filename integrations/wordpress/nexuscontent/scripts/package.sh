#!/usr/bin/env bash
set -euo pipefail

readonly version="0.1.2"
readonly plugin_slug="nexuscontent"
plugin_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
repo_root="$(cd "$plugin_root/../../.." && pwd)"

# Admin CSS is not compiled by webpack; copy it into the build directory
# so the required_files check and staging step both find it.
if [[ -f "$plugin_root/assets/src/admin.css" ]]; then
  cp "$plugin_root/assets/src/admin.css" "$plugin_root/assets/build/admin.css"
fi

dist_dir="$repo_root/dist"
archive="$dist_dir/${plugin_slug}-${version}.zip"
stage="$(mktemp -d "${TMPDIR:-/tmp}/nexuscontent-package.XXXXXX")"
trap 'rm -rf "$stage"' EXIT

required_files=(
  "nexuscontent.php"
  "sections.json"
  "README.md"
  "readme.txt"
  "LICENSE"
  "assets/build/editor.js"
  "assets/build/editor.css"
  "assets/build/admin.css"
  "assets/build/editor-rtl.css"
  "assets/build/editor.asset.php"
  "assets/build/preview.js"
  "assets/build/preview.asset.php"
  "includes/class-contract.php"
  "includes/class-diagnostics.php"
  "includes/class-capabilities.php"
  "includes/class-editor-mode.php"
  "includes/class-section-registry.php"
  "includes/class-media-normalizer.php"
  "includes/class-normalizer.php"
  "includes/class-rest-controller.php"
  "includes/class-admin-page.php"
  "includes/class-preview-token.php"
  "includes/class-webhook-dispatcher.php"
  "includes/class-plugin.php"
  "includes/acf/class-registration.php"
  "includes/acf/class-acf-loader.php"
  "includes/acf/class-acf-field-factory.php"
  "includes/blocks/class-registration.php"
  "includes/blocks/class-block-loader.php"
  "includes/blocks/class-block-normalizer.php"
)

block_names=(hero intro rich-text image-text features statistics testimonials gallery cta faq logo-grid form-embed)
for block_name in "${block_names[@]}"; do
  required_files+=("blocks/$block_name/block.json")
  required_files+=("assets/previews/$block_name.svg")
done

for file in "${required_files[@]}"; do
  if [[ ! -f "$plugin_root/$file" ]]; then
    printf 'Required package file is missing: %s\n' "$file" >&2
    exit 1
  fi
done

package_root="$stage/$plugin_slug"
mkdir -p "$package_root/assets/build" "$package_root/assets/previews" "$package_root/blocks"
cp "$plugin_root/nexuscontent.php" "$plugin_root/sections.json" "$plugin_root/README.md" "$plugin_root/readme.txt" "$plugin_root/LICENSE" "$package_root/"
cp -R "$plugin_root/includes" "$package_root/includes"
find "$package_root/includes" -name '.DS_Store' -delete
cp "$plugin_root/assets/build/editor.js" "$plugin_root/assets/build/editor.css" "$plugin_root/assets/build/admin.css" "$plugin_root/assets/build/editor-rtl.css" "$plugin_root/assets/build/editor.asset.php" "$plugin_root/assets/build/preview.js" "$plugin_root/assets/build/preview.asset.php" "$package_root/assets/build/"
cp "$plugin_root"/assets/previews/*.svg "$package_root/assets/previews/"

for block_dir in "$plugin_root"/blocks/*; do
  if [[ -d "$block_dir" ]] && [[ -f "$block_dir/block.json" ]]; then
    block_name="$(basename "$block_dir")"
    mkdir -p "$package_root/blocks/$block_name"
    cp "$block_dir/block.json" "$package_root/blocks/$block_name/block.json"
  fi
done

# Fixed timestamps, permissions, and sorted input make repeated archives stable.
find "$package_root" -type d -exec chmod 755 '{}' \;
find "$package_root" -type f -exec chmod 644 '{}' \;
find "$package_root" -exec touch -t 198001010000 '{}' \;
mkdir -p "$dist_dir"
rm -f "$archive"
(
  cd "$stage"
  find "$plugin_slug" -type f -print | LC_ALL=C sort | zip -X -q "$archive" -@
)

listing="$(unzip -Z1 "$archive")"
expected_listing="$(printf '%s\n' "${required_files[@]/#/$plugin_slug/}" | LC_ALL=C sort)"
if [[ "$listing" != "$expected_listing" ]]; then
  printf 'Archive verification failed; contents differ from the production allowlist.\n' >&2
  diff <(printf '%s\n' "$expected_listing") <(printf '%s\n' "$listing") || true
  exit 1
fi
for file in "${required_files[@]}"; do
  if ! printf '%s\n' "$listing" | grep -Fqx "$plugin_slug/$file"; then
    printf 'Archive verification failed; missing %s\n' "$plugin_slug/$file" >&2
    exit 1
  fi
done

if printf '%s\n' "$listing" | grep -Eq '(^|/)(assets/src|tests|vendor|node_modules|\.git|\.env|\.wp-env|composer\.(json|lock)|package(-lock)?\.json|phpunit|phpcs|phpstan|scripts)(/|$)|\.map$'; then
  printf 'Archive verification failed; a development or secret path was included.\n' >&2
  exit 1
fi

if ! unzip -p "$archive" "$plugin_slug/nexuscontent.php" | grep -Fq 'Plugin Name:       NexusContent Companion'; then
  printf 'Archive verification failed; plugin bootstrap header was not found.\n' >&2
  exit 1
fi

printf 'Created %s\n' "$archive"
