<div align="center">

# FLAWRA-CODE

### The terminal-first AI coding agent.

[![version](https://img.shields.io/badge/version-2.1.900-22d3ee?style=for-the-badge)](./package.json)
[![bun](https://img.shields.io/badge/bun-%E2%89%A51.2-fbf0df?style=for-the-badge&logo=bun&logoColor=black)](https://bun.sh)
[![license](https://img.shields.io/badge/license-MIT-11151f?style=for-the-badge)](./LICENSE)
[![stars](https://img.shields.io/github/stars/Arhan-w/flawra-code?style=for-the-badge&logo=github&color=22d3ee)](https://github.com/Arhan-w/flawra-code)
[![build](https://img.shields.io/badge/build-passing-22c55e?style=for-the-badge)](https://github.com/Arhan-w/flawra-code/actions)
[![tests](https://img.shields.io/badge/tests-2041%20%2F%202041-22c55e?style=for-the-badge)](https://github.com/Arhan-w/flawra-code)

<br/>

![FLAWRA-CODE](assets/hero.png)

<br/>

[**Demo (26s)**](assets/demo-v3.mp4) · [**Install**](#install) · [**Tools**](#tools) · [**Roadmap**](#roadmap) · [**Contribute**](./CONTRIBUTING.md)

</div>

---

## Why FLAWRA-CODE

A coding agent that respects your terminal, your machine, and your model choice.

- **No vendor lock** — point it at Anthropic, Bedrock, Vertex, Foundry, Ollama, LM Studio, llama.cpp, LiteLLM, or any endpoint that speaks the Messages format. Switch with one env var.
- **No cloud lock** — your code, your memory, your scheduled jobs all live in `~/.flawra/`. Nothing leaves your machine unless you send it to a model.
- **No silent actions** — every read/edit/run goes through a permission layer you can lock down to `Bash(git diff:*)` patterns.
- **No hands required** — `flawra harness "<goal>"` walks away and comes back with proof.
- **Its own identity** — Prism mascot, diamond-pulse spinner, FLAWRA terminal theme. Binary, config, theme keys, mascot: all FLAWRA from the kernel up.

---

## Demo

<video src="assets/demo-v3.mp4" controls width="100%"></video>

*24-second capture of an interactive session — typed prompt → spinner → generated code → memory recall. All running on the built binary, no mock.*

---

## Install

Requires [Bun](https://bun.sh) ≥ 1.2.

```bash
# 1. Install
git clone https://github.com/Arhan-w/flawra-code.git
cd flawra-code
bun install
bun run build

# 2. Expose the `flawra` command
bun link

# 3. Run it
cd your-project
flawra
```

Pipe mode for scripts and CI:

```bash
echo "explain this error: $(some_command 2>&1)" | flawra -p
```

---

## What it can do

| | Capability | Notes |
|---|---|---|
| 🧠 | **Read & write** | Surgical string-replacement edits, line-ending and encoding preserved. |
| 🐚 | **Shell** | Permission-gated `Bash` with sandbox detection and background tasks. |
| 🔎 | **Search** | Glob + ripgrep + web search + URL fetch built in. |
| 🪜 | **Plan & execute** | Plan mode, todo lists, background tasks, sub-agent delegation. |
| 🤖 | **Run unattended** | `flawra harness "<goal>"` — autonomous multi-turn loop with `HARNESS:DONE` / `HARNESS:CONTINUE` protocol. |
| 🖥️ | **Drive the desktop** | `flawra_computer` — screenshot, click, type, key, scroll (Windows, PowerShell + `user32.dll`, no native modules). |
| 💾 | **Remember** | `flawra_memory` — persistent key/value store in SQLite, survives across sessions. |
| 🛡️ | **Review before commit** | `flawra_code_review` — secrets, injection patterns, leftover debug, perf smells, severity scored. |
| 🪝 | **Speak git** | `flawra_git` — one tool call for status/diff/branch/commit/push/pull/log/stash. |
| 🗣️ | **Voice** | `flawra_voice_assistant` — record from mic (or read an audio file), transcribe with Whisper. |
| ⏰ | **Schedule** | `flawra_scheduler` — cron and one-shot jobs in `~/.flawra/scheduler.json`. |
| 🌐 | **Monitor** | `flawra_dashboard` — local web UI on `http://localhost:3030` for status, jobs, memory. |
| 🔌 | **Extend** | MCP server over stdio JSON-RPC — IDEs, web apps, mobile clients can call every tool. |

---

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
| `flawra_code_review` | Security/quality scan with severity scoring |
| `flawra_git` | One-call git: status, diff, commit, push, branch, stash |
| `flawra_computer` | Windows desktop driver: screenshot, click, type, key, scroll |
| `flawra_voice_assistant` | Mic capture + Whisper transcription → user command |
| `flawra_scheduler` | Cron/one-shot task scheduling, jobs in `~/.flawra/scheduler.json` |
| `flawra_dashboard` | Local web dashboard on `http://localhost:3030` |
| `MCP*` | Any Model Context Protocol server tool, dynamically discovered |

---

## Harness — autonomous goal loop

Give it an end-state, walk away. The harness runs the agent in print mode and re-feeds a verify-and-continue checkpoint each turn so the same session keeps going until the goal is actually finished and proven.

```bash
flawra harness "ship the login page with tests" --max-turns 8
flawra harness "fix every TS error in src/"    --max-turns 6 --model sonnet
```

The agent must end every turn with exactly one of these on its final line:

- `HARNESS:DONE` — only when the goal is fully achieved **and** verified by a command the agent actually ran.
- `HARNESS:CONTINUE <one-line next step>` — when work remains.

It will not let the agent claim "done" without evidence. Exits 0 on `HARNESS:DONE`, 1 if the turn budget is exhausted.

---

## Computer use (Windows)

`flawra_computer` drives the real desktop: screenshots, mouse clicks (left/right/double), typing, key combos, scroll, window enumeration. Drive it like a human — one action, screenshot, decide, repeat.

- Registered automatically on `process.platform === 'win32'`.
- PowerShell is the only host requirement — no native modules, no admin rights.
- Screenshots go to `%TEMP%\flawra-computer\screen-<ts>.png` so the agent can read the file back to see what happened.
- **Hard rules:** never type passwords, never click permission / 2FA / "Are you sure" prompts — stop and ask the user instead.

---

## Custom providers & local models

Works with **any endpoint that speaks the Anthropic Messages format**. Configure once in `~/.flawra/providers.json`:

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
        "haiku":  "llama3.2:3b",
        "opus":   "qwen3-coder:480b"
      }
    },
    "gateway": {
      "label": "LiteLLM proxy",
      "baseUrl": "http://localhost:4000",
      "apiKeyEnv": "LITELLM_MASTER_KEY",
      "models": { "sonnet": "flawra-sonnet-4-5" }
    }
  }
}
```

- `models` maps built-in aliases (`sonnet`, `opus`, `haiku`, `best`) onto your provider's model IDs.
- `apiKeyEnv` reads the key from an environment variable instead of storing it.
- `headers` adds custom request headers (merged into `ANTHROPIC_CUSTOM_HEADERS`).
- Switch per-run with `FLAWRA_PROVIDER=gateway flawra`.
- Inspect config with `flawra providers`.

One-off via env vars still works:

```bash
ANTHROPIC_BASE_URL=http://localhost:11434 ANTHROPIC_AUTH_TOKEN=*** flawra --model qwen3-coder:30b
```

---

## Config & data location

| Path | What lives there |
|---|---|
| `~/.flawra/` | All FLAWRA-CODE state (override with `FLAWRA_CONFIG_DIR`) |
| `~/.flawra/providers.json` | Custom provider config |
| `~/.flawra/memory.db` | `flawra_memory` SQLite store |
| `~/.flawra/recordings/` | asciicast recordings (when `FLAWRA_RECORD=1`) |
| `~/.flawra/scheduler.json` | Scheduled jobs |
| `%TEMP%\flawra-computer\` | `flawra_computer` screenshots |

---

## Permissions

Nothing destructive happens silently. Every tool call goes through a permission layer:

- Read-only operations run free.
- Edits and commands prompt for approval.
- Rules in `~/.flawra/settings.json` let you pre-allow patterns like `Bash(git diff:*)`.
- Plan mode blocks all writes until you approve the plan.

---

## Recording demos

Built-in asciicast recorder — no external tools needed:

```bash
FLAWRA_RECORD=1 flawra        # records to ~/.flawra/recordings/*.cast
agg demo.cast demo.gif        # render with https://github.com/asciinema/agg
```

---

## Development

```bash
bun run dev          # dev mode with MACRO defines
bun test             # 2041 tests across 115 files
bun run build        # production bundle → dist/
bun run lint         # biome
bun run start:ui     # dev server + web UI together
```

Architecture: `src/entrypoints/cli.tsx` → `src/main.tsx` (commander) → `src/screens/REPL.tsx` (Ink UI) → `src/QueryEngine.ts` (turn loop, compaction, snapshots) → `src/query.ts` (API streaming + tool execution). Tools live in `src/tools/<Name>/`, each self-contained with schema, prompt, and UI renderer. The harness lives in `src/cli/harness.ts`; the desktop driver in `src/tools/FlawraComputerTool/`.

---

## Roadmap

| Feature | Status |
|---|---|
| `flawra_scheduler` — cron/one-shot task scheduling | ✅ |
| `flawra_voice_assistant` — Whisper transcription + voice commands | ✅ |
| `flawra_computer` — Windows desktop driver | ✅ |
| `flawra_memory` — SQLite persistent memory | ✅ |
| `flawra_code_review` — security/quality scan with severity scoring | ✅ |
| `flawra_git` — one-call git wrapper | ✅ |
| `flawra harness "<goal>"` — autonomous goal loop | ✅ |
| `flawra_dashboard` — local web dashboard | ✅ |
| Custom providers (`~/.flawra/providers.json`) | ✅ |
| MCP server over stdio JSON-RPC | ✅ |
| GitHub Actions CI + auto-release | ✅ |
| Test suite (`bun test`) — 2041/2041 | ✅ |
| Community MCP marketplace registry | 🔜 |
| Mobile companion app | 🔜 |

---

## Credits

Built by **Arhan**.

## License

[MIT](./LICENSE)
