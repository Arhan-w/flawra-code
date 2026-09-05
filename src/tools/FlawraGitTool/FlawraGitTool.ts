// FLAWRA-CODE — Git operations tool
import { execSync } from 'node:child_process'
import { z } from 'zod/v4'
import { buildTool, type ToolDef } from '../../Tool.js'
import { lazySchema } from '../../utils/lazySchema.js'

const inputSchema = lazySchema(() =>
  z.strictObject({
    action: z
      .enum(['status', 'diff', 'branch', 'commit', 'push', 'pull', 'log', 'stash'])
      .describe('Git operation to perform'),
    message: z.string().optional().describe('Commit message (required for commit)'),
    branch: z.string().optional().describe('Branch name (for branch create)'),
  }),
)
type InputSchema = ReturnType<typeof inputSchema>

const outputSchema = lazySchema(() =>
  z.object({
    ok: z.boolean(),
    action: z.string(),
    output: z.string(),
    error: z.string().optional(),
  }),
)
type OutputSchema = ReturnType<typeof outputSchema>
export type Output = z.infer<OutputSchema>

export const GIT_TOOL_NAME = 'flawra_git'

const DESCRIPTION =
  'Run git operations: status, diff, branch, commit, push, pull, log, stash.'

const PROMPT = `Perform common git operations in the current repository in one call, instead of chaining bash commands.

- status: working tree summary (short + branch)
- diff: unstaged changes
- branch: list branches, or create one with the branch param
- commit: stage everything and commit with the message
- push / pull: sync with remote
- log: last 20 commits oneline
- stash: stash working changes (pass branch param to pop instead)

commit, push, and stash-pop change repository state — confirm intent with the user before running them unless they already asked.`

function git(args: string): string {
  return execSync(`git ${args}`, { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024, cwd: process.cwd() })
}

export const FlawraGitTool = buildTool({
  alwaysLoad: true,
  name: GIT_TOOL_NAME,
  searchHint: 'git commit push pull status branch',
  maxResultSizeChars: 100_000,
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
    return 'Git'
  },
  isConcurrencySafe: () => false,
  isReadOnly(input) {
    return ['status', 'diff', 'log'].includes(input.action)
  },
  isDestructive(input) {
    return input.action === 'push'
  },

  async call(input): Promise<{ data: Output }> {
    let cmd: string
    switch (input.action) {
      case 'status': cmd = 'status --short --branch'; break
      case 'diff': cmd = 'diff'; break
      case 'branch': cmd = input.branch ? `branch ${input.branch}` : 'branch -a'; break
      case 'commit': {
        if (!input.message) {
          return { data: { ok: false, action: 'commit', output: '', error: 'Commit message required' } }
        }
        // commit -F - reads the message from stdin: no quoting/injection surface
        cmd = 'add -A'
        try {
          git(cmd)
          const out = execSync('git commit -F -', {
            encoding: 'utf-8',
            input: input.message,
            maxBuffer: 10 * 1024 * 1024,
            cwd: process.cwd(),
          })
          return { data: { ok: true, action: 'commit', output: out } }
        } catch (e: any) {
          return { data: { ok: false, action: 'commit', output: e.stdout || '', error: e.stderr || e.message } }
        }
      }
      case 'push': cmd = 'push'; break
      case 'pull': cmd = 'pull'; break
      case 'log': cmd = 'log --oneline -20'; break
      case 'stash': cmd = input.branch ? 'stash pop' : 'stash'; break
    }

    try {
      return { data: { ok: true, action: input.action, output: git(cmd) } }
    } catch (e: any) {
      return { data: { ok: false, action: input.action, output: e.stdout || '', error: e.stderr || e.message } }
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
