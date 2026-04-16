

# Linux CLI for hashbin.net

Building a standalone Linux command-line tool that hashes files locally and submits timestamps to the hashbin.net API. This is a separate artifact (not part of the web app codebase) — I'll generate a self-contained Python script and package it for download.

## What it does

- `hashbin stamp <file>...` — hash files locally (MD5, SHA-1, SHA-256, SHA-512) and create signed timestamps via the hashbin.net API
- `hashbin verify <file-or-hash>` — look up existing timestamps for a file or raw hash
- `hashbin health` — check API availability
- Supports `--include-name` flag to optionally include file names
- Colored terminal output with human-readable results
- GNOME integration: a `.desktop` file and a Nautilus script so users can right-click files in the file manager to stamp them

## Deliverables

1. **`/mnt/documents/hashbin`** — single-file Python CLI script (no dependencies beyond Python 3.8+ standard library; uses `hashlib` and `urllib`)
2. **`/mnt/documents/hashbin.desktop`** — GNOME `.desktop` file for integration
3. **`/mnt/documents/hashbin-nautilus-stamp.sh`** — Nautilus right-click "Scripts" integration
4. **`/mnt/documents/README-cli.md`** — installation and usage instructions

## Technical details

- Uses `hashlib` for all hashing (MD5, SHA-1, SHA-256, SHA-512) — zero external dependencies
- Calls `https://hashbin.net/functions/v1/api/stamp` and `/api/verify` with the anon key
- Streams file reads in 64KB chunks for large file support
- Exit codes: 0 success, 1 error
- GNOME desktop file uses `zenity` for notification dialogs (available by default on GNOME)

