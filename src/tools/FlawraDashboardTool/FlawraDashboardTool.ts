// FLAWRA-CODE — dashboard tool: start/stop a local web dashboard showing
// session status, scheduler jobs, and memory entries.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod/v4'
import { buildTool, type ToolDef } from '../../Tool.js'
import { lazySchema } from '../../utils/lazySchema.js'

// @ts-ignore — global server handle for start/stop idempotency
const g = globalThis as { __flawraDashboard?: { close(): void; address(): { port: number } | string } | null }

const inputSchema = lazySchema(() =>
  z.strictObject({
    action: z.enum(['start', 'stop', 'status']).describe('Dashboard operation'),
    port: z.number().int().min(1024).max(65535).optional().describe('Port for the dashboard (default 3030)'),
  }),
)
type InputSchema = ReturnType<typeof inputSchema>

const outputSchema = lazySchema(() =>
  z.object({
    ok: z.boolean(),
    url: z.string().optional(),
    port: z.number().optional(),
    jobs: z.number().optional(),
    memories: z.number().optional(),
    error: z.string().optional(),
  }),
)
type OutputSchema = ReturnType<typeof outputSchema>
export type Output = z.infer<OutputSchema>

export const DASHBOARD_TOOL_NAME = 'flawra_dashboard'

const DESCRIPTION = 'Start or stop a local web dashboard showing FLAWRA-CODE status, scheduled jobs, and memory counts.'

const PROMPT = `Expose a lightweight HTTP dashboard for the current FLAWRA-CODE install.

When to use:
- The user wants to see what is scheduled / stored / running in a browser → start.
- The user is done looking → stop.

The dashboard serves /api/status (JSON) and a minimal HTML page. It binds to localhost only.`

function countJsonFile(p: string): number {
  try {
    if (!existsSync(p)) return 0
    const parsed = JSON.parse(readFileSync(p, 'utf8'))
    return Array.isArray(parsed) ? parsed.length : Object.keys(parsed).length
  } catch {
    return 0
  }
}

export const FlawraDashboardTool = buildTool({
  alwaysLoad: true,
  name: DASHBOARD_TOOL_NAME,
  searchHint: 'web dashboard monitor status jobs memory http',
  maxResultSizeChars: 10_000,
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
    return 'Dashboard'
  },
  isConcurrencySafe: () => false,
  isReadOnly: () => false,

  async call(input): Promise<{ data: Output }> {
    const home = process.env.HOME || process.env.USERPROFILE || '.'
    const schedulerFile = join(home, '.flawra', 'scheduler.json')

    if (input.action === 'status') {
      // @ts-ignore
      const running = !!g.__flawraDashboard
      const port = running ? (g.__flawraDashboard?.address() as { port: number })?.port : undefined
      return {
        data: {
          ok: true,
          port,
          url: port ? `http://localhost:${port}` : undefined,
          jobs: countJsonFile(schedulerFile),
        },
      }
    }

    if (input.action === 'start') {
      // @ts-ignore
      if (g.__flawraDashboard) {
        // @ts-ignore
        const addr = g.__flawraDashboard.address() as { port: number }
        return { data: { ok: false, error: `already running on http://localhost:${addr.port}`, port: addr.port } }
      }
      const port = input.port ?? 3030
      try {
        const { createServer } = await import('node:http')
        const server = createServer((req, res) => {
          const jobs = countJsonFile(schedulerFile)
          if (req.url === '/api/status') {
            res.writeHead(200, { 'content-type': 'application/json' })
            res.end(JSON.stringify({ ok: true, jobs, uptime: process.uptime() }))
            return
          }
          res.writeHead(200, { 'content-type': 'text/html' })
          res.end(
            `<!doctype html><html><head><title>FLAWRA-CODE</title><meta charset="utf-8"><style>body{background:#0b0e14;color:#e6e6e6;font-family:ui-monospace,Consolas,monospace;padding:2rem}h1{color:#22d3ee}a{color:#22d3ee}pre{background:#11151f;padding:1rem;border-radius:8px}</style></head><body><h1>FLAWRA-CODE</h1><p>Scheduled jobs: <b>${jobs}</b></p><p>API: <a href="/api/status">/api/status</a></p></body></html>`,
          )
        })
        server.listen(port, '127.0.0.1')
        // @ts-ignore
        g.__flawraDashboard = server
        return { data: { ok: true, url: `http://localhost:${port}`, port, jobs: countJsonFile(schedulerFile) } }
      } catch (e: unknown) {
        return { data: { ok: false, error: e instanceof Error ? e.message : String(e) } }
      }
    }

    // stop
    // @ts-ignore
    if (!g.__flawraDashboard) return { data: { ok: false, error: 'dashboard is not running' } }
    // @ts-ignore
    g.__flawraDashboard.close()
    // @ts-ignore
    g.__flawraDashboard = null
    return { data: { ok: true } }
  },

  mapToolResultToToolResultBlockParam(result, toolUseID) {
    return {
      tool_use_id: toolUseID,
      type: 'tool_result' as const,
      content: JSON.stringify(result),
    }
  },
} satisfies ToolDef<InputSchema, Output>)
