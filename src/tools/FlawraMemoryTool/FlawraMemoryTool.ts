// FLAWRA-CODE — persistent memory tool (Bun-native SQLite, zero external deps)
import { mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { Database } from 'bun:sqlite'
import { z } from 'zod/v4'
import { buildTool, type ToolDef } from '../../Tool.js'
import { lazySchema } from '../../utils/lazySchema.js'

const DB_PATH = process.env.FLAWRA_MEMORY_DB
  ? process.env.FLAWRA_MEMORY_DB
  : join(process.env.HOME || process.env.USERPROFILE || '.', '.flawra', 'memory.db')

let db: Database | null = null

function getDb(): Database {
  if (db) return db
  const dir = dirname(DB_PATH)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  db = new Database(DB_PATH)
  db.run(`
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
type InputSchema = ReturnType<typeof inputSchema>

const outputSchema = lazySchema(() =>
  z.object({
    ok: z.boolean(),
    action: z.string(),
    key: z.string().optional(),
    value: z.string().nullable().optional(),
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
    error: z.string().optional(),
  }),
)
type OutputSchema = ReturnType<typeof outputSchema>
export type Output = z.infer<OutputSchema>

export const MEMORY_TOOL_NAME = 'flawra_memory'

const DESCRIPTION =
  'Persistent memory across sessions: remember facts, recall by key, list all, or forget.'

const PROMPT = `Maintain a persistent key/value memory store that survives across conversations.

When to use:
- The user tells you something durable about themselves (name, preferences, projects, environment facts) → remember it, no need to ask.
- The user asks what you know about them or references something from before → recall or list.
- The user says to forget something → forget it.

Keys should be short and snake_case (e.g. user_name, favorite_language, current_project). Values should be complete standalone facts.`

export const FlawraMemoryTool = buildTool({
  alwaysLoad: true,
  name: MEMORY_TOOL_NAME,
  searchHint: 'remember recall facts about the user across sessions',
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
    return 'Memory'
  },
  isConcurrencySafe: () => true,
  isReadOnly: () => false,

  async call(input): Promise<{ data: Output }> {
    const d = getDb()
    const now = new Date().toISOString()

    switch (input.action) {
      case 'remember': {
        if (!input.key || input.value === undefined) {
          return { data: { ok: false, action: 'remember', error: 'key and value required' } }
        }
        d.run(
          `INSERT INTO memory (key, value, updated_at) VALUES (?, ?, ?)
           ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`,
          input.key,
          input.value,
          now,
        )
        return { data: { ok: true, action: 'remember', key: input.key, value: input.value } }
      }
      case 'recall': {
        if (!input.key) return { data: { ok: false, action: 'recall', error: 'key required' } }
        const row = d
          .prepare('SELECT value FROM memory WHERE key = ?')
          .get(input.key) as { value: string } | undefined
        return { data: { ok: true, action: 'recall', key: input.key, value: row?.value ?? null } }
      }
      case 'list': {
        const rows = d
          .prepare('SELECT key, value, updated_at FROM memory ORDER BY updated_at DESC')
          .all() as Array<{ key: string; value: string; updated_at: string }>
        return { data: { ok: true, action: 'list', items: rows, count: rows.length } }
      }
      case 'forget': {
        if (!input.key) return { data: { ok: false, action: 'forget', error: 'key required' } }
        const info = d.prepare('DELETE FROM memory WHERE key = ?').run(input.key)
        return { data: { ok: true, action: 'forget', key: input.key, count: info.changes } }
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
