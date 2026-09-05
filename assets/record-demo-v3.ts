// FLAWRA-CODE v3 demo recorder v2 — actual visible content.
// Captures: a real `flawra --version`, then `flawra providers`,
// then opens the TUI for ~5s to show the new banner/look.
import { spawn } from 'bun'
import { mkdirSync, writeFileSync } from 'node:fs'

const COLS = 100
const ROWS = 30
const outPath = process.argv[2] || 'demo-v3.cast'
mkdirSync('C:/Users/Arhan/.flawra/recordings', { recursive: true })

const t0 = performance.now()
const events: [number, string, string][] = []
const lines: string[] = [
  JSON.stringify({
    version: 2,
    width: COLS,
    height: ROWS,
    timestamp: Math.floor(Date.now() / 1000),
    env: { SHELL: 'bash', TERM: 'xterm-256color' },
  }),
]
const decoder = new TextDecoder()

async function run(cmd: string[], opts: any) {
  const p = spawn({ cmd, stdout: 'pipe', stderr: 'pipe', ...opts })
  events.push([(performance.now() - t0) / 1000, 'o', `\x1b[1;36m$ ${cmd.join(' ')}\x1b[0m\r\n`])
  const r = p.stdout.getReader()
  ;(async () => {
    while (true) {
      const { done, value } = await r.read()
      if (done) break
      events.push([(performance.now() - t0) / 1000, 'o', decoder.decode(value, { stream: true })])
    }
  })()
  await p.exited
}
const env = (extra: Record<string, string> = {}) => ({
  ...process.env,
  COLUMNS: String(COLS),
  LINES: String(ROWS),
  NO_COLOR: '1',
  ...extra,
})
const cwd = 'D:/claude/flawra-code'

// 1) version banner — type delay so it's visible
events.push([(performance.now() - t0) / 1000, 'o', '\x1b[1;36m$ \x1b[0m'])
await new Promise((r) => setTimeout(r, 400))
for (const ch of 'flawra --version') {
  events.push([(performance.now() - t0) / 1000, 'o', ch])
  await new Promise((r) => setTimeout(r, 50 + Math.random() * 80))
}
await new Promise((r) => setTimeout(r, 300))
events.push([(performance.now() - t0) / 1000, 'o', '\r\n'])
await run(['bun', 'dist/cli.js', '--version'], { cwd, env: env() })
await new Promise((r) => setTimeout(r, 800))

// 2) harness help
events.push([(performance.now() - t0) / 1000, 'o', '\r\n\x1b[1;36m$ \x1b[0m'])
await new Promise((r) => setTimeout(r, 400))
for (const ch of 'flawra harness --help') {
  events.push([(performance.now() - t0) / 1000, 'o', ch])
  await new Promise((r) => setTimeout(r, 50 + Math.random() * 80))
}
await new Promise((r) => setTimeout(r, 300))
events.push([(performance.now() - t0) / 1000, 'o', '\r\n'])
await run(['bun', 'dist/cli.js', 'harness', '--help'], { cwd, env: env() })
await new Promise((r) => setTimeout(r, 800))

// 3) providers command
events.push([(performance.now() - t0) / 1000, 'o', '\r\n\x1b[1;36m$ \x1b[0m'])
await new Promise((r) => setTimeout(r, 400))
for (const ch of 'flawra providers') {
  events.push([(performance.now() - t0) / 1000, 'o', ch])
  await new Promise((r) => setTimeout(r, 50 + Math.random() * 80))
}
await new Promise((r) => setTimeout(r, 300))
events.push([(performance.now() - t0) / 1000, 'o', '\r\n'])
await run(['bun', 'dist/cli.js', 'providers'], { cwd, env: env() })
await new Promise((r) => setTimeout(r, 1500))

events.push([(performance.now() - t0) / 1000, 'o', `\r\n\x1b[2m— end of demo —\x1b[0m\r\n`])

for (const [t, k, v] of events) lines.push(JSON.stringify([t, k, v]))
writeFileSync(outPath, lines.join('\n') + '\n')
console.log('wrote', outPath, 'with', events.length, 'events,', events.reduce((n, [, , v]) => n + v.length, 0), 'bytes')
