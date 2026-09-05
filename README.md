# FLAWRA-CODE

![FLAWRA-CODE](assets/hero.png)

**An agentic coding assistant that lives in your terminal.** Read a codebase, edit files, run commands, search the web, manage git, and remember what matters — across sessions, on any model, through any endpoint.

FLAWRA-CODE is a rebuilt, extended terminal coding agent: a full interactive REPL with streaming tool execution, permission gating, sub-agents, skills, MCP support, and persistent memory — plus custom provider routing so you are never locked to one API.

![FLAWRA-CODE demo](assets/demo.gif)

## What it does

- **Works in your repo** — reads, edits, and creates files with surgical string replacement; runs shell commands with a permission system and sandbox awareness.
- **Searches like a developer** — glob, ripgrep-backed search, web search, and URL fetching built in.
- **Plans and executes** — plan mode, todo lists, background tasks, and sub-agent delegation for parallel workstreams.
- **Remembers you** — `flawra_memory` persists facts to a local SQLite store (`~/.flawra/memory.db`) and recalls them in future sessions.
- **Reviews before you commit** — `flawra_code_review` scans files or your git working tree for hardcoded secrets, injection patterns, leftover debug code, and perf smells, with a severity-scored report.
- **Speaks git** — `flawra_git` wraps status/diff/branch/commit/push/pull/log/stash in one tool call.
- **Runs any model** — point it at Anthropic, Bedrock, Vertex, Foundry, or any local/self-hosted endpoint that speaks the Messages format.

## Demo

Watch the full session: **[assets/demo.mp4](assets/demo.mp4)**

*Memory recall in action — the agent stores a fact to SQLite, then retrieves it on the next turn.*

![Memory recall](assets/memory-result.png)

## Install

Requires [Bun](https://bun.sh) ≥ 1.2.

```bash
git clone https://github.com/Arhan-w/flawra-code.git
cd flawra-code
bun install
bun run build
bun link            # exposes the `flawra` command
```

Run it anywhere:

```bash
cd your-project
flawra
```

Non-interactive / pipe mode:

```bash
echo "explain this error: $(some_command 2>&1)" | flawra -p
```

## Custom providers & local models

FLAWRA-CODE works with **any endpoint that speaks the Anthropic Messages format** — Ollama, LM Studio, llama.cpp server, LiteLLM, claude-code-router, GitHub Models, or hosted gateways. Configure once in `~/.flawra/providers.json`:

```json
{
  "active": "ollama",
  "providers": {
    "ollama": {
      "label": "Ollama (local)",
      "baseUrl": "http://localhost:11434",
      "apiKey": "ollama",
      "models": {
        "sonnet": "qwen3-coder:30b",
        "haiku": "llama3.2:3b",
        "opus": "qwen3-coder:480b"
      }
    },
    "gateway": {
      "label": "LiteLLM proxy",
      "baseUrl": "http://localhost:4000",
      "apiKeyEnv": "LITELLM_MASTER_KEY",
      "models": { "sonnet": "claude-sonnet-4-5" }
    }
  }
}
```

- `models` maps the built-in aliases (`sonnet`, `opus`, `haiku`, `best`) onto your provider's model IDs — `/model sonnet` then resolves to your local model.
- `apiKeyEnv` reads the key from an environment variable instead of storing it in the file.
- `headers` adds custom request headers (merged into `ANTHROPIC_CUSTOM_HEADERS`).
- Switch providers per-run with `FLAWRA_PROVIDER=gateway flawra`.
- Inspect your config with `flawra providers`.

Environment variables still work for one-off use:

```bash
ANTHROPIC_BASE_URL=http://localhost:11434 ANTHROPIC_AUTH_TOKEN=*** flawra --model qwen3-coder:30b
```

## Tools

| Tool | What it does |
|---|---|
| `Bash` | Shell execution with permission rules, sandbox detection, background tasks |
| `Read` / `Write` / `Edit` | File operations with line-ending and encoding preservation |
| `Glob` / `Grep` | Fast file and content search |
| `WebSearch` / `WebFetch` | Live search and page extraction (works through proxies) |
| `Agent` | Spawn sub-agents with isolated context for parallel work |
| `TodoWrite` / `Task*` | Structured task tracking across turns |
| `Skill` | Load reusable procedures from disk |
| `flawra_memory` | Persistent key/value memory (SQLite) across sessions |
| `flawra_code_review` | Security/quality/perf scan with severity scoring |
| `flawra_git` | One-call git: status, diff, commit, push, branch, stash |
| `MCP*` | Any Model Context Protocol server tool, dynamically discovered |

## Permissions

Nothing destructive happens silently. Every tool call goes through a permission layer: read-only operations run free, edits and commands prompt for approval, and rules in settings (`~/.claude/settings.json`) let you pre-allow patterns like `Bash(git diff:*)`. Plan mode blocks all writes until you approve the plan.

## Recording demos

Built-in asciicast recorder — no external tools:

```bash
FLAWRA_RECORD=1 flawra        # records to ~/.flawra/recordings/*.cast
agg demo.cast demo.gif        # render with https://github.com/asciinema/agg
```

## Development

```bash
bun run dev          # dev mode with MACRO defines
bun test             # test suite
bun run build        # production bundle → dist/
bun run lint         # biome
```

Architecture: `src/entrypoints/cli.tsx` → `src/main.tsx` (commander) → `src/screens/REPL.tsx` (Ink UI) → `src/QueryEngine.ts` (turn loop, compaction, snapshots) → `src/query.ts` (API streaming + tool execution). Tools live in `src/tools/<Name>/`, each self-contained with schema, prompt, and UI renderer.

## Credits

Built by **Arhan**. Architecture informed by open terminal-agent design; providers layer added for full model freedom.

## License

MIT
