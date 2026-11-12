#!/usr/bin/env bash
# Godmode: register bundled MCP servers with Codex via the native CLI.
# Installing the plugin already wires them; use this only without the plugin.
# Generated from src/plugin/_sources/mcps.ts; do not hand-edit. Run: bash codex-mcp-setup.sh
set -euo pipefail

# Up-to-date library & framework documentation, version-aware.
codex mcp add context7 -- npx -y @upstash/context7-mcp@4.6.0

# Official Microsoft & Azure documentation search and fetch.
codex mcp add microsoft-learn --url "https://learn.microsoft.com/api/mcp"

# Official AWS documentation, code samples, and regional availability.
codex mcp add aws-knowledge --url "https://knowledge-mcp.global.api.aws"

# Cloudflare developer platform documentation.
codex mcp add cloudflare-docs --url "https://docs.mcp.cloudflare.com/mcp"

# Keeper Security documentation.
codex mcp add keeper-docs --url "https://docs.keeper.io/~gitbook/mcp"

# Ask questions about any public GitHub repo's architecture and docs.
codex mcp add deepwiki --url "https://mcp.deepwiki.com/mcp"

# Regex code search across a million public GitHub repositories.
codex mcp add grep --url "https://mcp.grep.app"

# Drive a real browser for testing and verification.
codex mcp add playwright -- npx -y @playwright/mcp@0.0.85

# Inspect the DOM, network, console, and performance traces in Chrome.
codex mcp add chrome-devtools -- npx -y chrome-devtools-mcp@1.13.0

# Manage Azure resources, deployments, and services (uses local az login).
codex mcp add azure -- npx -y @azure/mcp@3.0.0 server start
