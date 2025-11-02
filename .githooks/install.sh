#!/bin/bash
# Install git hooks from .githooks directory

HOOKS_DIR=".githooks"
GIT_HOOKS_DIR=".git/hooks"

if [ ! -d "$GIT_HOOKS_DIR" ]; then
    echo "Error: Not a git repository (no .git/hooks directory found)"
    exit 1
fi

echo "Installing git hooks..."

# Copy pre-commit hook
if [ -f "$HOOKS_DIR/pre-commit" ]; then
    cp "$HOOKS_DIR/pre-commit" "$GIT_HOOKS_DIR/pre-commit"
    chmod +x "$GIT_HOOKS_DIR/pre-commit"
    echo "✓ Installed pre-commit hook"
else
    echo "✗ pre-commit hook not found in $HOOKS_DIR"
fi

echo ""
echo "Git hooks installed successfully!"
echo "The pre-commit hook will automatically increment version numbers on each commit."
