# Security policy

## Supported versions

Godmode follows SemVer. The latest minor release gets security fixes.

| Version | Supported |
| ------- | --------- |
| 1.3.x   | yes       |
| < 1.3   | no        |

## Reporting a vulnerability

Please do not open a public issue for a security problem. Report it privately through
[GitHub Security Advisories](https://github.com/patrickking67/godmode/security/advisories/new).

Include what you found, steps or a proof of concept, the affected version and your view of
the impact.

I aim to acknowledge a report within 72 hours and to ship a fix in the next patch release.
I will credit you in the changelog unless you would rather stay anonymous.

## What ships today

The plugin runs no server and stores no data. It is Markdown skills and subagents, three
Node hook scripts and MCP server configuration. None of the bundled MCP servers need a key
in config; Azure uses the local `az login`.

## In scope

- The hook scripts in `src/plugin/_sources/hooks/` (shipped as `plugin/hooks/`): for
  example a payload that makes a hook run an unintended command, or a destructive command
  the Bash guard should catch but does not.
- The build script `scripts/build-plugin.ts`: for example output written outside `plugin/`
  or a manifest that loads something other than what the sources declare.
- MCP wiring in `plugin/.mcp.json`, `plugin/codex-config.toml` and
  `plugin/codex-mcp-setup.sh`: for example a server definition that leaks credentials.
- Skill or subagent instructions that steer an agent into an unsafe action.
- The site in `site/`.

## Out of scope

- Vulnerabilities in the third-party MCP servers themselves. Report those to their owners.
- Physical access to the host, social engineering, or user-misconfigured MCP servers and
  other plugins.
- Upstream dependency issues already patched upstream but not yet picked up here.
- Roadmap features that are designed but not built (memory, token tracking, a local
  dashboard).
