#!/bin/sh
set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOOKS_DIR="$REPO_ROOT/scripts/git-hooks"
GIT_HOOKS_DIR="$REPO_ROOT/.git/hooks"

mkdir -p "$GIT_HOOKS_DIR"
cp "$HOOKS_DIR/pre-commit" "$GIT_HOOKS_DIR/pre-commit"
chmod +x "$GIT_HOOKS_DIR/pre-commit"

echo "Git hooks installed."







