# Claude Code UI Integration with Flawra‑CODE

This guide shows how to pull in the official Claude Code web UI and run it side‑by‑side with the Flawra backend so you get the full chat‑card experience.

## 1️⃣ Add the UI package as a workspace

The Flawra repository already uses Yarn/NPM workspaces with the pattern:
```
"workspaces": ["packages/*", "packages/@ant/*"]
```
Create a new folder that matches the workspace glob:
```
flawra-code/
└─ packages/
   └─ @ant/
      └─ claude-code-web/   ← UI lives here
```
The UI code is hosted in the public **Claude Code** repo. We’ll clone it directly into that folder.

## 2️⃣ Clone the Claude Code repo (only the UI part)
```bash
# From the root of the Flawra repo
cd packages/@ant
if [ ! -d "claude-code-web" ]; then
  git clone https://github.com/anthropic/claude-code.git claude-code-web
  # The repo contains many packages; we only need the web UI:
  cd claude-code-web
  # Remove the other workspaces to keep the size small (optional)
  rm -rf packages/*
fi
```
The UI lives in `packages/@ant/claude-code-web/packages/claude-code-web` inside the cloned repo. For simplicity we will move the UI folder to the top level of the workspace:
```bash
mv claude-code-web/packages/claude-code-web/* .
rm -rf claude-code-web
```
Now `packages/@ant/claude-code-web` contains a standard React app (`package.json`, `src/`, `vite.config.ts`, …).

## 3️⃣ Install UI dependencies
```bash
cd packages/@ant/claude-code-web
# You can use bun (the same version used by Flawra) or npm
bun install   # or `npm install`
```

## 4️⃣ Point the UI at the local Flawra backend
Create a `.env` file (or copy the example) with the endpoint of the Flawra server:
```dotenv
# .env (in packages/@ant/claude-code-web)
REACT_APP_FLawraEndpoint=http://localhost:3000   # default dev port of Flawra
```
If you run Flawra on a different port, update the URL accordingly.

## 5️⃣ Run both processes
You can start them in two terminals or use a simple script:
### Terminal 1 – Flawra backend
```bash
# From the repo root
bun run dev   # this starts the REPL server on http://localhost:3000
```
### Terminal 2 – UI dev server
```bash
cd packages/@ant/claude-code-web
npm run dev   # defaults to http://localhost:5173 (Vite)
```
Open the UI URL (e.g., `http://localhost:5173`) in a browser. The UI will connect to the Flawra backend via the `REACT_APP_FLawraEndpoint` defined above, and you’ll see the full chat view with tool buttons, avatars, and message bubbles.

## 6️⃣ Optional – Single‑command starter
A helper script is provided at `scripts/start-with-ui.sh`. It launches both servers automatically (requires `concurrently` or `npm-run-all`).
```bash
bash scripts/start-with-ui.sh
```
The script:
1. Starts `bun run dev` in the background.
2. Waits a few seconds for the backend to be ready.
3. Starts the UI dev server.

## 7️⃣ Production build (optional)
When you’re ready to ship a bundled version, run:
```bash
# Build the UI
cd packages/@ant/claude-code-web
npm run build   # produces `dist/` that can be served statically
# Serve it together with Flawra (e.g., via a simple Node/Express static server)
```
You can then point the UI at the production endpoint (`REACT_APP_FLawraEndpoint=https://your‑host.com`).

---
**Result:** After following these steps you have the same rich chat UI that Claude Code offers, powered by your customized Flawra‑CODE backend. This makes Flawra stand out with a graphical interface that no other fork currently provides.
