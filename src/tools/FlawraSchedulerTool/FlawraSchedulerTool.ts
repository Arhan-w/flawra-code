// FLAWRA-CODE — scheduler tool: cron/one-shot tasks persisted to ~/.flawra/scheduler.json
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { z } from 'zod/v4'
import { buildTool, type ToolDef } from '../../Tool.js'
import { lazySchema } from '../../utils/lazySchema.js'

const SCHEDULER_FILE = process.env.FLAWRA_SCHEDULER_DB
  ? process.env.FLAWRA_SCHEDULER_DB
  : join(process.env.HOME || process.env.USERPROFILE || '.', '.flawra', 'scheduler.json')

type Job = {
  id: string
  name: string
  cron?: string
  at?: string
  command: string
  enabled: boolean
  lastRun?: string
}

function loadJobs(): Job[] {
  try {
    if (existsSync(SCHEDULER_FILE)) return JSON.parse(readFileSync(SCHEDULER_FILE, 'utf8'))
  } catch {}
  return []
}

function saveJobs(jobs: Job[]) {
  const dir = dirname(SCHEDULER_FILE)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(SCHEDULER_FILE, JSON.stringify(jobs, null, 2))
}

const inputSchema = lazySchema(() =>
  z.strictObject({
    action: z
      .enum(['list', 'add', 'remove', 'run-now'])
      .describe('Scheduler operation to perform'),
    name: z.string().optional().describe('Job name (required for add)'),
    cron: z.string().optional().describe('Cron expression for recurring jobs (e.g. "*/5 * * * *")'),
    at: z.string().optional().describe('ISO timestamp for a one-shot job'),
    command: z.string().optional().describe('Shell command to run (required for add)'),
    id: z.string().optional().describe('Job id (required for remove/run-now)'),
  }),
)
type InputSchema = ReturnType<typeof inputSchema>

const outputSchema = lazySchema(() =>
  z.object({
    ok: z.boolean(),
    action: z.string(),
    jobs: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          command: z.string(),
          cron: z.string().optional(),
          at: z.string().optional(),
          enabled: z.boolean(),
          lastRun: z.string().optional(),
        }),
      )
      .optional(),
    output: z.string().optional(),
    error: z.string().optional(),
  }),
)
type OutputSchema = ReturnType<typeof outputSchema>
export type Output = z.infer<OutputSchema>

export const SCHEDULER_TOOL_NAME = 'flawra_scheduler'

const DESCRIPTION =
  'Schedule recurring (cron) or one-time tasks that run shell commands. Jobs persist across sessions.'

const PROMPT = `Manage a persistent task scheduler.

When to use:
- The user asks to run something every N minutes/hours/days → add with a cron expression.
- The user asks to run something at a specific time → add with an ISO timestamp (at).
- The user asks what is scheduled → list.
- The user asks to cancel a job → remove by id.
- The user asks to trigger a job immediately → run-now by id.

Job ids are returned by add and list. Commands run with the user's shell permissions.`

export const FlawraSchedulerTool = buildTool({
  alwaysLoad: true,
  name: SCHEDULER_TOOL_NAME,
  searchHint: 'schedule cron recurring one-time tasks timers',
  maxResultSizeChars: 50_000,
  async description() {
    return DESCRIPTION
  },
  async prompt() {
    return PROMPT
  },
  get inputSchema(): InputSchema {
    return inputSchema()
  },
  get outputSchema(): OutputSchema {
    return outputSchema()
  },
  userFacingName() {
    return 'Scheduler'
  },
  isConcurrencySafe: () => false,
  isReadOnly: () => false,

  async call(input): Promise<{ data: Output }> {
    const jobs = loadJobs()

    switch (input.action) {
      case 'list': {
        return { data: { ok: true, action: 'list', jobs } }
      }
      case 'add': {
        if (!input.name || !input.command) {
          return { data: { ok: false, action: 'add', error: 'name and command required' } }
        }
        if (!input.cron && !input.at) {
          return { data: { ok: false, action: 'add', error: 'either cron or at required' } }
        }
        const job: Job = {
          id: `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          name: input.name,
          cron: input.cron,
          at: input.at,
          command: input.command,
          enabled: true,
        }
        jobs.push(job)
        saveJobs(jobs)
        return { data: { ok: true, action: 'add', jobs } }
      }
      case 'remove': {
        if (!input.id) return { data: { ok: false, action: 'remove', error: 'id required' } }
        const filtered = jobs.filter(j => j.id !== input.id)
        if (filtered.length === jobs.length) {
          return { data: { ok: false, action: 'remove', error: `job ${input.id} not found` } }
        }
        saveJobs(filtered)
        return { data: { ok: true, action: 'remove', jobs: filtered } }
      }
      case 'run-now': {
        if (!input.id) return { data: { ok: false, action: 'run-now', error: 'id required' } }
        const job = jobs.find(j => j.id === input.id)
        if (!job) return { data: { ok: false, action: 'run-now', error: `job ${input.id} not found` } }
        try {
          const { execSync } = await import('node:child_process')
          const out = execSync(job.command, { encoding: 'utf8', timeout: 300_000 })
          job.lastRun = new Date().toISOString()
          saveJobs(jobs)
          return { data: { ok: true, action: 'run-now', jobs, output: out } }
        } catch (e: unknown) {
          return { data: { ok: false, action: 'run-now', error: e instanceof Error ? e.message : String(e) } }
        }
      }
    }
  },

  mapToolResultToToolResultBlockParam(result, toolUseID) {
    return {
      tool_use_id: toolUseID,
      type: 'tool_result' as const,
      content: JSON.stringify(result),
    }
  },
} satisfies ToolDef<InputSchema, Output>)
