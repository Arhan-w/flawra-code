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
    branch: z.string().optional().describe('Branch name (for branch create/checkout)'),
    args: z.string().optional().describe('Extra git arguments'),
  }),
)

type Input = z.infer<typeof inputSchema>

const outputSchema = z.object({
  ok: z.boolean(),
  action: z.string(),
  output: z.string(),
  error: z.string().optional(),
})

type Output = z.infer<typeof outputSchema>

const prompt = `# FlawraGitTool — Git Operations

Run git operations safely within the current repository.

Actions:
- status: Show working tree status (what's changed, staged, untracked)
- diff: Show unstaged changes
- branch: List branches, or create/checkout a branch
- commit: Stage all changes and commit with the given message
- push: Push current branch to remote
- pull: Pull from remote
- log: Show recent commit history
- stash: Stash or pop changes

Always confirm destructive actions (push, commit with force) with the user first.`

function git(args: string, cwd?: string): string {
  return execSync(`git ${args}`, {
    encoding: 'utf-8',
    maxBuffer: 50 * 1024 * 1024,
    cwd: cwd || process.cwd(),
  })
}

const FlawraGitTool: ToolDef<Input, Output> = {
  name: 'flawra_git',
  description: 'Git operations: status, diff, branch, commit, push, pull, log, stash.',
  prompt,
  inputSchema,
  outputSchema,
  userFacingName: () => 'git',
  isEnabled: () => true,
  isConcurrencySafe: () => false,
  isReadOnly: () => false,
  isDestructive: () => false,

  async call(input: Input): Promise<Output> {
    let cmd = ''
    switch (input.action) {
      case 'status':
        cmd = 'status --short --branch'
        break
      case 'diff':
        cmd = 'diff'
        break
      case 'branch':
        cmd = input.branch ? `branch ${input.branch}` : 'branch -a'
        break
      case 'commit':
        if (!input.message) return { ok: false, action: 'commit', output: '', error: 'Commit message required' }
        cmd = `add -A && commit -m "${input.message.replace(/"/g, '\\"')}"`.replace('&&', '&&')
        cmd = `add -A && commit -m "${input.message.replace(/"/g, '\\"')}"`
        break
      case 'push':
        cmd = 'push'
        break
      case 'pull':
        cmd = 'pull'
        break
      case 'log':
        cmd = 'log --oneline -20'
        break
      case 'stash':
        cmd = input.branch ? 'stash pop' : 'stash'
        break
    }
    if (input.args) cmd += ' ' + input.args

    try {
      const out = git(cmd)
      return { ok: true, action: input.action, output: out }
    } catch (e: any) {
      return { ok: false, action: input.action, output: e.stdout || '', error: e.stderr || e.message }
    }
  },
}

export default buildTool(FlawraGitTool)
export const FlawraGitTool = buildTool(FlawraGitTool)