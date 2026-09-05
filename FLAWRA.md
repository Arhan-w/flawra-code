# FLAWRA.md

Guidance for FLAWRA-CODE when working in this repository.

## Project Overview

FLAWRA-CODE is an agentic coding CLI for the terminal: interactive REPL (Ink/React), streaming tool execution, permission gating, sub-agents, skills, MCP support, persistent memory, and custom provider routing (any Anthropic-Messages-compatible endpoint, including local models).

Runtime is Bun. The codebase carries some decompilation-era type noise (~1300 tsc diagnostics, mostly `unknown`/`never`) — these do not block Bun runtime execution or the build.

## Commands

```bash
bun install          # deps
bun run dev          # dev mode with MACRO defines
bun run build        # production bundle → dist/cli.js + chunks
bun test             # test suite
bun run lint         # biome check
echo "hi" | bun dist/cli.js -p   # pipe mode
```

## Architecture

1. **`src/entrypoints/cli.tsx`** — true entrypoint; runtime globals, provider env application (`~/.flawra/providers.json`), fast paths (`--version`, `providers`).
2. **`src/main.tsx`** — Commander CLI definition; auth, policy, service init; launches REPL or pipe mode.
3. **`src/query.ts`** — core API loop: stream, tool calls, turn continuation.
4. **`src/QueryEngine.ts`** — conversation orchestration: state, compaction, file snapshots, turn bookkeeping.
5. **`src/screens/REPL.tsx`** — interactive Ink screen: input, rendering, permission prompts.
6. **`src/services/api/flawra.ts`** — request builder + provider selection (first-party / Bedrock / Vertex / Foundry / custom base URL).
7. **`src/tools/<Name>/`** — one directory per tool: schema, prompt, call(), optional UI renderer. Registry in `src/tools.ts`.
8. **`src/utils/model/customProviders.ts`** — FLAWRA provider layer: model alias mapping, env application, `flawra providers` listing.

## Conventions

- New tools: `buildTool({...} satisfies ToolDef<InputSchema, Output>)`, return `{ data }` from `call()`, implement `mapToolResultToToolResultBlockParam`, set `alwaysLoad: true` when the model must see the tool without ToolSearch.
- Schemas via `lazySchema(() => z.strictObject({...}))` to defer construction.
- Never hardcode secrets; provider keys come from env (`apiKeyEnv`) or user config.
- Keep `MACRO.*` defines centralized in `scripts/defines.ts`.

## Demo recording

`FLAWRA_RECORD=1 flawra` writes an asciicast v2 file to `~/.flawra/recordings/`; render with `agg`.
