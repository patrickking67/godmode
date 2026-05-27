# Security policy

## Supported versions

Forge follows SemVer. During the `v0.x` series, only the current minor version receives security fixes. Once `v1.0` ships, the policy will be the current minor + previous minor.

| Version | Supported |
| --- | --- |
| v0.1.x | ✅ (current) |
| < v0.1 | ❌ |

## Reporting a vulnerability

**Please do not file a public GitHub issue for security reports.**

Email: `security@<owner-domain>` (replace once domain is set).
Alternatively, use [GitHub Security Advisories](https://github.com/patrickking67/forge/security/advisories/new) for private disclosure.

Include:

- A clear description of the issue
- Reproduction steps or proof-of-concept
- Affected version(s)
- Your assessment of impact

We aim to acknowledge reports within 72 hours and ship a fix in the next patch release. Coordinated disclosure is appreciated — we will credit reporters in the changelog unless you prefer to stay anonymous.

## Security model

Forge runs a local Hono server bound to `127.0.0.1` only. Every request requires a bearer token stored at `~/.forge/auth.token` (file mode `0600`). Hook ingestion uses the same token, set via `FORGE_TOKEN` environment variable injected by the plugin install.

**No CORS open. No external bind. No embedded credentials.** MCP servers that need auth read credentials from environment variables only — Forge never embeds keys.

## In scope

- Local server auth bypass (request to `/api/*` without valid bearer)
- Hook-injection RCE (hook payloads triggering arbitrary code execution)
- MCP credential leak (logs, error messages, or memory observations containing secrets)
- Sandbox escape via skill / agent definitions
- Memory exfiltration between projects (data from project A surfacing in project B through Forge)
- SQL injection in `/api/observations` search or other parameterized endpoints
- WebSocket auth bypass

## Out of scope

- Physical access compromise of the host machine
- Social engineering of the user
- User-misconfigured MCP servers or third-party plugins
- Vulnerabilities in upstream dependencies that have been patched but not yet rolled in (please report upstream; we'll update in the next patch release)

## Hall of fame

(empty for now — your name could be here)
