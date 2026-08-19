#!/usr/bin/env bash
set -euo pipefail

plugin_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$plugin_root"

suite="${1:-}"
case "$suite" in
  unit)
    config="phpunit.xml.dist"
    test_root="tests"
    bootstrap="tests/bootstrap.php"
    ;;
  integration)
    config="phpunit.integration.xml.dist"
    test_root="tests/integration"
    bootstrap="tests/integration/bootstrap.php"
    ;;
  *)
    printf 'Usage: %s unit|integration\n' "$0" >&2
    exit 64
    ;;
esac

if [[ ! -f "$bootstrap" ]] || [[ ! -d "$test_root" ]]; then
  printf 'No %s test suite is present; skipping.\n' "$suite"
  exit 0
fi

test_file="$(find "$test_root" -type f -name '*Test.php' ! -name 'TestCase.php' -print -quit)"
if [[ -z "$test_file" ]]; then
  printf 'No %s tests are present; skipping.\n' "$suite"
  exit 0
fi

if [[ ! -x vendor/bin/phpunit ]]; then
  printf 'vendor/bin/phpunit is missing. Run composer install first.\n' >&2
  exit 1
fi

if [[ "$suite" == "integration" ]]; then
  exec vendor/bin/phpunit --configuration "$config" --testsuite "$suite" --exclude-group acf-real
fi

exec vendor/bin/phpunit --configuration "$config" --testsuite "$suite"
