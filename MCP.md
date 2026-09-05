# MCP Marketplace

FLAWRA-CODE ships with a built-in MCP (Model Context Protocol) server that exposes all tools over stdio JSON-RPC. External clients — IDEs, web dashboards, mobile apps — can call `flawra_memory`, `flawra_code_review`, `flawra_git`, `flawra_scheduler`, and more without running the full REPL.

## Built-in MCP server

```bash
# Start the MCP server on stdio
flawra mcp
```

## Connect from any MCP client

```json
{
  "mcpServers": {
    "flawra": {
      "command": "flawra",
      "args": ["mcp"]
    }
  }
}
```

## Available tools over MCP

| Tool | Description |
|---|---|
| `flawra_memory` | Persistent key/value memory (SQLite) |
| `flawra_code_review` | Security/quality scan with severity scoring |
| `flawra_git` | One-call git wrapper |
| `flawra_scheduler` | Cron/one-shot task scheduling |
| `flawra_computer` | Windows desktop driver (Windows only) |
| `flawra_voice_assistant` | Whisper transcription + voice commands |

## Build your own MCP server

```bash
# Clone the template
git clone https://github.com/Arhan-w/flawra-mcp-template.git
cd flawra-mcp-template
bun install
bun run dev
```

## MCP Marketplace Roadmap

- [ ] Community-contributed MCP servers
- [ ] MCP server registry (search by tag, category, rating)
- [ ] One-click install from the registry
- [ ] Web dashboard for managing MCP servers
- [ ] Mobile companion app with full MCP support