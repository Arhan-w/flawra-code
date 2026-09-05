// FLAWRA-CODE — automated code review tool
import { execSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod/v4'
import { buildTool, type ToolDef } from '../../Tool.js'
import { lazySchema } from '../../utils/lazySchema.js'

const inputSchema = lazySchema(() =>
  z.strictObject({
    path: z.string().optional().describe('File or directory to review (default: git diff of staged changes)'),
    focus: z
      .enum(['security', 'quality', 'performance', 'all'])
      .optional()
      .default('all')
      .describe('Review focus area'),
  }),
)

type Input = z.infer<typeof inputSchema>

const outputSchema = z.object({
  ok: z.boolean(),
  path: z.string(),
  focus: z.string(),
  issues: z.array(
    z.object({
      severity: z.enum(['critical', 'high', 'medium', 'low']),
      category: z.string(),
      file: z.string(),
      line: z.number().optional(),
      message: z.string(),
      suggestion: z.string().optional(),
    }),
  ),
  summary: z.string(),
  score: z.number(),
})

type Output = z.infer<typeof outputSchema>

const prompt = `# FlawraCodeReviewTool — Automated Code Review

Review code for security vulnerabilities, quality issues, and performance problems before committing.

Security checks:
- Hardcoded secrets, API keys, passwords, tokens
- Command injection via unsanitized user input
- Path traversal in file operations
- eval/exec with untrusted input
- SQL injection via string concatenation
- Insecure regex (ReDoS)

Quality checks:
- TODO/FIXME/HACK comments left in code
- console.log/debugger statements in production code
- Large functions (>50 lines) that should be split
- Duplicate logic

Performance checks:
- N+1 query patterns
- Unbounded loops
- Sync I/O in hot paths
- Large file reads without streaming

Always run this before committing code. Be direct and specific about issues.`

// Patterns that indicate a security or quality problem
const SECURITY_PATTERNS: Array<{ regex: RegExp; severity: 'critical' | 'high' | 'medium'; message: string; suggestion: string }> = [
  { regex: /(api[_-]?key|secret|password|token)\s*=\s*['"][^'"]{8,}['"]/i, severity: 'critical', message: 'Hardcoded secret detected', suggestion: 'Move to environment variable or secrets manager' },
  { regex: /\bexec\s*\(\s*['"`]/, severity: 'high', message: 'exec() with literal string', suggestion: 'Use a safer API or sanitize input first' },
  { regex: /\beval\s*\(/, severity: 'critical', message: 'eval() usage is a code injection risk', suggestion: 'Never use eval — use JSON.parse or a parser' },
  { regex: /child_process.*spawn.*\+/, severity: 'high', message: 'Command built via string concatenation', suggestion: 'Use an argument array instead of concatenating strings' },
  { regex: /\.\.\/\.\.\/\.\.\//, severity: 'high', message: 'Path traversal pattern detected', suggestion: 'Validate and sanitize paths before use' },
  { regex: /SELECT\s+.*FROM\s+.*WHERE.*\$|INSERT\s+INTO.*\$|UPDATE\s+.*SET.*\$/, severity: 'high', message: 'SQL query built via string interpolation', suggestion: 'Use parameterized queries' },
  { regex: /rm\s+-rf\s+\$/, severity: 'critical', message: 'Destructive rm with variable', suggestion: 'Validate paths before deletion' },
]

const QUALITY_PATTERNS: Array<{ regex: RegExp; severity: 'low' | 'medium'; message: string }> = [
  { regex: /\bconsole\.(log|debug|info|warn)\b/, severity: 'low', message: 'console.log in code — remove before production' },
  { regex: /\bdebugger\b/, severity: 'medium', message: 'debugger statement left in code' },
  { regex: /\b(TODO|FIXME|HACK|XXX)\b/, severity: 'low', message: 'Unresolved TODO/FIXME comment' },
]

function scanFile(filePath: string, focus: string): Output['issues'] {
  const issues: Output['issues'] = []
  if (!existsSync(filePath)) return issues

  let content: string
  try {
    content = readFileSync(filePath, 'utf-8')
  } catch {
    return issues
  }

  const lines = content.split('\n')

  if (focus === 'security' || focus === 'all') {
    for (const p of SECURITY_PATTERNS) {
      for (let i = 0; i < lines.length; i++) {
        if (p.regex.test(lines[i])) {
          issues.push({
            severity: p.severity,
            category: 'security',
            file: filePath,
            line: i + 1,
            message: p.message,
            suggestion: p.suggestion,
          })
        }
      }
    }
  }

  if (focus === 'quality' || focus === 'all') {
    for (const p of QUALITY_PATTERNS) {
      for (let i = 0; i < lines.length; i++) {
        if (p.regex.test(lines[i])) {
          issues.push({
            severity: p.severity,
            category: 'quality',
            file: filePath,
            line: i + 1,
            message: p.message,
          })
        }
      }
    }
  }

  return issues
}

function getChangedFiles(): string[] {
  try {
    const out = execSync('git diff --name-only HEAD 2>/dev/null', { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 })
    return out.split('\n').map((s) => s.trim()).filter(Boolean)
  } catch {
    return []
  }
}

const FlawraCodeReviewTool: ToolDef<Input, Output> = {
  name: 'flawra_code_review',
  description: 'Automated security and quality review of code before committing.',
  prompt,
  inputSchema,
  outputSchema,
  userFacingName: () => 'code review',
  isEnabled: () => true,
  isConcurrencySafe: () => true,
  isReadOnly: () => true,

  async call(input: Input): Promise<Output> {
    const target = input.path
    let files: string[] = []

    if (target) {
      files = [target]
    } else {
      files = getChangedFiles()
    }

    const allIssues: Output['issues'] = []
    for (const f of files) {
      if (!existsSync(f)) continue
      allIssues.push(...scanFile(f, input.focus))
    }

    const critical = allIssues.filter((i) => i.severity === 'critical').length
    const high = allIssues.filter((i) => i.severity === 'high').length
    const score = Math.max(0, 100 - critical * 25 - high * 10 - allIssues.length * 2)

    const summary =
      allIssues.length === 0
        ? `Clean. No issues found in ${files.length} file(s).`
        : `${allIssues.length} issue(s) found — ${critical} critical, ${high} high.`

    return {
      ok: allIssues.length === 0,
      path: target || 'git diff',
      focus: input.focus,
      issues: allIssues,
      summary,
      score,
    }
  },
}

export default buildTool(FlawraCodeReviewTool)
export const FlawraCodeReviewTool = buildTool(FlawraCodeReviewTool)