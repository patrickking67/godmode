#!/usr/bin/env bash
# Godmode — register bundled MCP servers with Codex via the native CLI.
# Generated from src/plugin/_sources/mcps.ts — do not hand-edit. Run: bash codex-mcp-setup.sh
set -euo pipefail

# Up-to-date library & framework documentation, version-aware.
codex mcp add context7 -- npx -y @upstash/context7-mcp

# Official Microsoft & Azure documentation search and fetch.
codex mcp add microsoft-learn --url "https://learn.microsoft.com/api/mcp"

# Cloudflare developer platform documentation.
codex mcp add cloudflare-docs --url "https://docs.mcp.cloudflare.com/mcp"

# Keeper Security documentation.
codex mcp add keeper-docs --url "https://docs.keeper.io/~gitbook/mcp"

# Drive a real browser for testing and verification.
codex mcp add playwright -- npx -y @playwright/mcp@latest
