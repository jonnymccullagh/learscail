# Git Hooks

This directory contains git hooks for the Léarscáil project.

## Installation

To install the git hooks, run:

```bash
./.githooks/install.sh
```

## Pre-commit Hook

The pre-commit hook automatically increments the patch version (third number) in both `frontend/VERSION.txt` and `backend/VERSION.txt` files whenever you make a commit.

### Version Format

Versions follow semantic versioning: `MAJOR.MINOR.PATCH`

- **MAJOR**: Incremented manually for breaking changes
- **MINOR**: Incremented manually for new features
- **PATCH**: Auto-incremented on each commit

### How It Works

1. When you commit changes, the hook reads the current version from both VERSION.txt files
2. It increments the patch number (e.g., 2.0.0 → 2.0.1)
3. It writes the new version back to the files
4. It copies the frontend VERSION.txt to frontend/public/VERSION.txt for web access
5. It stages the updated VERSION.txt files to be included in the commit

### Manual Version Updates

To manually update the major or minor version:

1. Edit `frontend/VERSION.txt` and `backend/VERSION.txt`
2. Update to desired version (e.g., `3.0.0` for major, `2.1.0` for minor)
3. Update `frontend/public/VERSION.txt` to match
4. Commit the changes - the patch will auto-increment from there

### Skipping Auto-increment

If you need to make a commit without incrementing the version (not recommended), use:

```bash
git commit --no-verify
```

## Version Display

The version number is displayed:
- In the frontend About page (fetched from /VERSION.txt)
- Available in backend at runtime (can be read from VERSION.txt file)
