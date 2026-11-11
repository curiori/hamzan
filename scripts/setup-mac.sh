#!/usr/bin/env bash
#
# setup-mac.sh
# Sets up a fresh clone on a Mac: installs the packages that bun.lock lists,
# at the same versions, from the public npm registry, then runs the checks.
#   bash scripts/setup-mac.sh [--skip-checks]
# Runs on the bash that macOS ships (3.2), so it avoids newer bash features.
#
## Optional Environment Variables:
# NPM_REGISTRY - Registry to install from (default: https://registry.npmjs.org/)

set -euo pipefail

readonly PUBLIC_REGISTRY="https://registry.npmjs.org/"

log() {
  printf '\n==> %s\n' "$1"
}

err() {
  printf 'ERROR: %s\n' "$1" >&2
  exit 1
}

usage() {
  echo "Usage: ${0##*/} [--skip-checks]"
  echo ""
  echo "Installs the packages from the public npm registry and runs the checks."
  echo ""
  echo "Options:"
  echo "  --skip-checks  Install the packages only"
  echo "  --help, -h     Show this help message"
}

require_bun() {
  local major minor
  if ! command -v bun >/dev/null 2>&1; then
    err "Bun is missing. Install it (curl -fsSL https://bun.sh/install | bash), then open a new terminal."
  fi
  IFS=. read -r major minor _ <<< "$(bun --version)"
  # bun.lock has "configVersion", which Bun reads from 1.3 on
  if (( major < 1 || (major == 1 && minor < 3) )); then
    err "Bun $(bun --version) cannot read this bun.lock. Run: bun upgrade"
  fi
}

require_node() {
  local version major
  if ! command -v node >/dev/null 2>&1; then
    err "Node.js is missing. Install the LTS version from https://nodejs.org"
  fi
  version="$(node --version)"
  major="${version#v}"
  major="${major%%.*}"
  if (( major < 22 )); then
    err "Node.js ${version} is too old for Expo SDK 58. Install the LTS version from https://nodejs.org"
  fi
}

main() {
  local skip_checks=false
  local registry="${NPM_REGISTRY:-${PUBLIC_REGISTRY}}"

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --skip-checks)
        skip_checks=true
        shift
        ;;
      --help|-h)
        usage
        exit 0
        ;;
      *)
        echo "Unknown option: $1" >&2
        usage >&2
        exit 1
        ;;
    esac
  done

  cd "$(dirname "$0")/.."
  if [[ "$(uname -s)" != "Darwin" ]]; then
    echo "Note: this is not macOS. Continuing anyway."
  fi
  require_bun
  require_node
  echo "bun $(bun --version), node $(node --version)"

  log "Clearing registry URLs from bun.lock"
  bun run scripts/clear-lockfile-urls.ts

  log "Installing the packages from ${registry}"
  bun install --frozen-lockfile --registry "${registry}"

  if [[ "${skip_checks}" == false ]]; then
    log "Running the checks"
    bun run typecheck
    bun run lint
    bun test
    bun run test:domain
    bun run export:ios
  fi

  log "Ready"
  if git rev-parse --is-inside-work-tree >/dev/null 2>&1 \
    && ! git diff --quiet -- bun.lock; then
    echo "bun.lock named a registry and is now cleared. Commit and push it:"
    echo "  git commit -m 'build: clear registry URLs from bun.lock' bun.lock"
  fi
  echo "Open the app in Expo Go:  bunx expo start"
  echo "Build for the devices:    README, 本番版を家族の端末に入れる"
}

main "$@"
