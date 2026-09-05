// FLAWRA-CODE demo recorder — spawns the CLI in a real PTY, captures
// asciicast v2 output, and drives it with a scripted prompt sequence.
import { spawn } from 'bun'
import { writeFileSync, mkdirSync } from 'node:fs'

const COLS = 110
const ROWS = 32
const outPath = process.argv[2] || 'demo.cast'

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

const proc = spawn({
  cmd: ['bun', 'dist/cli.js', '--settings', '{"disableAllHooks":true}', '--strict-mcp-config'],
  cwd: 'D:/claude/flawra-code',
  stdout: 'pipe',
  stderr: 'ignore',
  pty: true,
  stdin: 'pipe',
  env: { ...process.env, TERM_PROGRAM: 'flawra-demo', COLUMNS: String(COLS), LINES: String(ROWS) },
})

const reader = proc.stdout.getReader()
const decoder = new TextDecoder()
;(async () => {
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const t = (performance.now() - t0) / 1000
    events.push([t, 'o', decoder.decode(value, { stream: true })])
  }
})()

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function writeInput(data: string) {
  ;(proc.stdin as any).write(data)
}

async function type(text: string) {
  // type char-by-char-ish: chunks of 3 with small delays for realism
  for (let i = 0; i < text.length; i += 4) {
    writeInput(text.slice(i, i + 4))
    await sleep(35)
  }
}

const script: Array<{ wait: number; text?: string; enter?: boolean }> = [
  { wait: 6000 },                                    // boot + logo
  { wait: 1500, text: 'remember that my favorite color is red', enter: true },
  { wait: 45000 },                                   // model turn + memory tool
  { wait: 1500, text: 'what is my favorite color?', enter: true },
  { wait: 30000 },                                   // recall turn
  { wait: 1200, text: '/exit', enter: true },
  { wait: 3000 },
]

for (const step of script) {
  await sleep(step.wait)
  if (step.text) await type(step.text)
  if (step.enter) {
    await sleep(250)
    writeInput('\r')
  }
}

await sleep(2000)
try { proc.kill() } catch {}

// coalesce events, cap total duration
for (const [t, kind, data] of events) {
  lines.push(JSON.stringify([Math.round(t * 1000) / 1000, kind, data]))
}
writeFileSync(outPath, lines.join('\n') + '\n')
console.log('wrote', outPath, events.length, 'frames')
