/**
 * FLAWRA-CODE harness — autonomous goal loop.
 *
 * `flawra harness "ship the login page with tests" [--max-turns 8]`
 *
 * Runs the agent in print mode against a goal, then keeps feeding it a
 * verify-and-continue checkpoint each turn until it emits the DONE marker
 * or the turn budget is exhausted. Each iteration is a full agentic turn
 * (tools, edits, bash) inside the SAME session, so context carries forward.
 *
 * Protocol: the model must end every turn with either
 *   HARNESS:CONTINUE <one-line next step>   — work remains
 *   HARNESS:DONE                             — goal fully achieved & verified
 * The harness parses the LAST marker in the output.
 */
import { spawn } from 'node:child_process'

const DONE_RE = /HARNESS:DONE/
const NEXT_RE = /HARNESS:CONTINUE\s*(.*)/

export type HarnessOptions = {
  goal: string
  maxTurns: number
  model?: string
  resumeArgv?: string[] // extra flags forwarded to each print-mode run
}

function runOnce(prompt: string, extra: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [process.argv[1]!, '-p', ...extra], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env,
    })
    let out = ''
    let err = ''
    child.stdout.on('data', (d) => (out += d.toString()))
    child.stderr.on('data', (d) => (err += d.toString()))
    child.on('error', reject)
    child.on('close', (code) => {
      if (code !== 0 && !out.trim()) {
        reject(new Error(`harness turn failed (exit ${code}): ${err.slice(0, 500)}`))
      } else {
        resolve(out)
      }
    })
    child.stdin.write(prompt)
    child.stdin.end()
  })
}

const FIRST_PROMPT = (goal: string) => `You are running inside FLAWRA-CODE's autonomous harness. Your goal:

${goal}

Rules for this harness:
1. Do the work NOW with your tools (read, edit, bash, tests). Be thorough but honest.
2. Verify before claiming success: run the tests/build/command that proves it works.
3. End your reply with EXACTLY ONE marker on its own final line:
   - HARNESS:DONE  — only if the goal is fully achieved AND verified by a command you actually ran.
   - HARNESS:CONTINUE <one-line next step>  — if anything remains unverified or unfinished.
Never write HARNESS:DONE for work you have not verified.`

const CHECKPOINT_PROMPT = `Harness checkpoint. Re-read the goal and your progress. If everything is done AND verified by commands you actually ran this session, reply with a one-line summary ending in:
HARNESS:DONE
Otherwise, DO the remaining work now (use tools), then end with either marker per the protocol.`

export async function runHarness(opts: HarnessOptions): Promise<number> {
  const extra = ['--output-format', 'text', '--permission-mode', 'acceptEdits', ...(opts.resumeArgv ?? [])]
  if (opts.model) extra.push('--model', opts.model)

  let last = ''
  for (let turn = 1; turn <= opts.maxTurns; turn++) {
    const prompt = turn === 1 ? FIRST_PROMPT(opts.goal) : CHECKPOINT_PROMPT
    process.stderr.write(`\n[harness] turn ${turn}/${opts.maxTurns} …\n`)
    last = await runOnce(prompt, turn === 1 ? extra : [...extra, '--continue'])
    const trimmed = last.trim()
    process.stdout.write(trimmed + '\n')
    if (DONE_RE.test(trimmed)) {
      process.stderr.write(`[harness] goal complete after ${turn} turn(s).\n`)
      return 0
    }
    const m = trimmed.match(NEXT_RE)
    if (m) process.stderr.write(`[harness] next: ${m[1] || '(unspecified)'}\n`)
  }
  process.stderr.write(`[harness] turn budget exhausted (${opts.maxTurns}) — goal NOT marked done.\n`)
  return 1
}
