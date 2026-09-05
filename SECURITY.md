# Security Policy

FLAWRA-CODE runs commands and edits files on your machine, behind a permission system. Treat that boundary seriously.

## Reporting a Vulnerability

Open a **private security advisory** on the repository:
https://github.com/Arhan-w/flawra-code/security/advisories/new

Do not file public issues for vulnerabilities. We aim to acknowledge within 72 hours and ship a fix or guidance within 14 days for anything actionable.

## In scope

- Permission-system bypass (tool execution without approval)
- Path traversal outside allowed working directories
- Credential leakage (OAuth tokens, API keys) to unintended endpoints
- Injection through settings, MCP responses, or project files

## Out of scope

- Prompt injection that only influences the model within already-granted permissions
- Attacks requiring physical access to your machine or your config directory
- `--dangerously-skip-permissions` behavior (documented as unsafe by design)

## Good practices

- Review permission prompts; don't run with bypass permissions outside disposable sandboxes
- Keep `~/.flawra/providers.json` free of literal keys — use `apiKeyEnv`
- Pin which MCP servers you trust; they execute third-party code
