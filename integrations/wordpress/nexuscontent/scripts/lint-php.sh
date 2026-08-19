#!/usr/bin/env bash
set -euo pipefail

plugin_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$plugin_root"

php -l nexuscontent.php
for directory in includes tests; do
  if [[ -d "$directory" ]]; then
    find "$directory" -type f -name '*.php' -exec php -l '{}' \;
  fi
done
