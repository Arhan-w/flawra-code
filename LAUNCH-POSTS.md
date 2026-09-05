# FLAWRA-CODE launch posts (ready to paste)

Repo: https://github.com/Arhan-w/flawra-code
Release: https://github.com/Arhan-w/flawra-code/releases/tag/v1.0.0
Attach: assets/demo.gif (X/Reddit), assets/hero.png (social card)

## X (280 chars)

Built FLAWRA-CODE — an agentic coding assistant for your terminal.

Persistent memory across sessions, built-in code review, one-call git, and custom providers: run it on Ollama, LM Studio, LiteLLM or any endpoint.

Not a Claude reskin. Its own UI, its own rules.

https://github.com/Arhan-w/flawra-code

## X (thread, 3 tweets)

1/ I rebuilt the terminal coding agent from the ground up. Meet FLAWRA-CODE.

It reads your repo, edits files, runs commands, plans, delegates to sub-agents — and it REMEMBERS you across sessions.

https://github.com/Arhan-w/flawra-code

2/ Locked to one API? Never.

~/.flawra/providers.json routes sonnet/opus/haiku to ANY endpoint:
- Ollama (local, free)
- LM Studio
- LiteLLM / gateways
- GitHub Models

Your models. Your keys. Your machine.

3/ Also ships with tools nobody else has:

flawra_memory — SQLite memory that survives restarts
flawra_code_review — secrets/injection/debug scan before commit
flawra_git — one-call git ops
FLAWRA_RECORD — built-in demo recording

MIT. Clone it. https://github.com/Arhan-w/flawra-code

## Reddit (r/SideProject / r/LocalLLaMA / r/ClaudeAI)

Title: I built FLAWRA-CODE — a terminal coding agent with persistent memory that runs on any model (Ollama, LM Studio, LiteLLM, gateways)

Body:
Full-featured agentic coding CLI: REPL with streaming tool execution, permission gating, plan mode, sub-agents, skills, MCP.

What makes it different:
- Custom providers file (~/.flawra/providers.json) maps model aliases to any Anthropic-Messages-compatible endpoint — local models included
- flawra_memory: persistent SQLite key/value memory across sessions (it actually remembers your preferences)
- flawra_code_review: scans git working tree for hardcoded secrets, injection patterns, debug leftovers with severity scoring
- flawra_git: one-call git operations
- FLAWRA_RECORD=1: built-in asciicast recording for demos
- Its own identity UI — Prism mascot, cyan theme, diamond spinner

MIT, Bun-based, one-command build:
git clone https://github.com/Arhan-w/flawra-code && cd flawra-code && bun install && bun run build && bun link

## Hacker News (Show HN)

Title: Show HN: FLAWRA-CODE – terminal coding agent with persistent memory and custom provider routing

URL: https://github.com/Arhan-w/flawra-code

Comment (first reply):
Built this because existing terminal agents lock you into one API and forget everything between sessions. FLAWRA-CODE keeps a SQLite memory store, maps model aliases to any Messages-compatible endpoint (Ollama/LM Studio/LiteLLM), and ships code-review + git tools. Bun + Ink, MIT. Demo GIF in the README shows a real memory save/recall session.

## Instagram / WhatsApp status (short)

FLAWRA-CODE is live. My terminal AI coding agent — remembers you, runs on any model, reviews your code before you commit. Link in bio.
