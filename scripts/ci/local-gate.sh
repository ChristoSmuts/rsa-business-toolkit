#!/usr/bin/env bash
# Runs the same steps as .github/workflows/ci.yml, in the same order, on a developer machine.
# Usage: scripts/ci/local-gate.sh [--fast]
set -euo pipefail

cd "$(dirname "$0")/../.."

export BASE_PATH="${BASE_PATH:-/business-toolkit/}"
export SITE_URL="${SITE_URL:-https://example.github.io}"

step() { printf '\n==> %s\n' "$*"; }
has_script() { node -e "process.exit(require('./package.json').scripts['$1'] ? 0 : 1)"; }
run_if_present() { if has_script "$1"; then step "pnpm $1"; pnpm "$1"; else step "skip $1 (script not defined yet)"; fi; }

step "pnpm install --frozen-lockfile"
pnpm install --frozen-lockfile

run_if_present lint
run_if_present typecheck
run_if_present test
run_if_present content:drift
run_if_present test:content
run_if_present content:fidelity

if [[ "${1:-}" == "--fast" ]]; then
  step "fast gate passed"
  exit 0
fi

run_if_present build
run_if_present test:e2e
run_if_present test:a11y

step "git status must be clean"
if [[ -n "$(git status --porcelain)" ]]; then
  git status --short
  echo "Working tree changed during the gate. Commit generated files or fix the generator." >&2
  exit 1
fi

step "full gate passed"
