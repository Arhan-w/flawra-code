// FLAWRA-CODE — persistent memory tool (SQLite-backed, no external deps)
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import Database from 'better-sqlite3'
import { z } from 'zod/v4'
import { buildTool, type ToolDef } from '../../Tool.js'
import { lazySchema } from '../../utils/lazySchema.js'
import { isEnvTruthy } from '../../utils/envUtils.js'

const DB_PATH = process.env.FLAWRA_MEMORY_DB
  ? process.env.FLAWRA_MEMORY_DB
  : join(process.env.HOME || process.env.USERPROFILE || '.', '.flawra', 'memory.db')

let db: Database.Database | null = null

function getDb(): Database.Database {
  if (db) return db
  const dir = dirname(DB_PATH)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.exec(`
    CREATE TABLE IF NOT EXISTS memory (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  return db
}

const inputSchema = lazySchema(() =>
  z.strictObject({
    action: z
      .enum(['remember', 'recall', 'list', 'forget'])
      .describe('Memory operation to perform'),
    key: z.string().optional().describe('Memory key (required for remember/recall/forget)'),
    value: z.string().optional().describe('Value to store (required for remember)'),
  }),
)

type Input = z.infer<typeof inputSchema>

const outputSchema = z.object({
  ok: z.boolean(),
  action: z.string(),
  key: z.string().optional(),
  value: z.string().optional(),
  items: z
    .array(
      z.object({
        key: z.string(),
        value: z.string(),
        updated_at: z.string(),
      }),
    )
    .optional(),
  count: z.number().optional(),
})

type Output = z.infer<typeof outputSchema>

const prompt = `# FlawraMemoryTool — Persistent Memory

Maintain a persistent key/value memory store across sessions. Use this tool when:

- The user tells you something about themselves (name, preferences, projects, environment facts) → remember it.
- The user asks what you know about them, or references a past conversation → recall or list.
- The user asks you to forget something → forget it.

Always be proactive: if the user shares a durable fact, remember it silently. When asked what you know, list first so the answer is grounded in real stored data.`

const FlawraMemoryTool: ToolDef<Input, Output> = {
  name: 'flawra_memory',
  description: 'Persistent memory: remember facts, recall by key, list all, or forget.',
  prompt,
  inputSchema,
  outputSchema,
  userFacingName: () => 'memory',
  isEnabled: () => true,
  isConcurrencySafe: () => true,
  isReadOnly: () => false,
  isDestructive: () => false,

  async call(input: Input) {
    const d = getDb()
    const now = new Date().toISOString()

    switch (input.action) {
      case 'remember': {
        if (!input.key || input.value === undefined) {
          return { ok: false, action: 'remember', error: 'key and value required' } as unknown as Output
        }
        d.prepare(
          `INSERT INTO memory (key, value, updated_at) VALUES (?, ?, ?)
           ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`,
        ).run(input.key, input.value, now)
        return { ok: true, action: 'remember', key: input.key, value: input.value }
      }
      case 'recall': {
        if (!input.key) return { ok: false, action: 'recall', error: 'key required' } as unknown as Output
        const row = d.prepare('SELECT value, updated_at FROM memory WHERE key = ?').get(input.key) as
          | { value: string; updated_at: string }
          | undefined
        return { ok: true, action: 'recall', key: input.key, value: row?.value ?? null }
      }
      case 'list': {
        const rows = d.prepare('SELECT key, value, updated_at FROM memory ORDER BY updated_at DESC').all() as Array<{
          key: string
          value: string
          updated_at: string
        }>
        return { ok: true, action: 'list', items: rows, count: rows.length }
      }
      case 'forget': {
        if (!input.key) return { ok: false, action: 'forget', error: 'key required' } as unknown as Output
        const info = d.prepare('DELETE FROM memory WHERE key = ?').run(input.key)
        return { ok: true, action: 'forget', key: input.key, count: info.changes }
      }
    }
  },
}

export default buildTool(FlawraMemoryTool)
export const FlawraMemoryTool = buildTool(FlawraMemoryTool)