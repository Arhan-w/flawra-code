// FLAWRA-CODE — automated code review tool
import { execSync } from 'node:child_process'
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod/v4'
import { buildTool, type ToolDef } from '../../Tool.js'
import { lazySchema } from '../../utils/lazySchema.js'

const inputSchema = lazySchema(() =>
  z.strictObject({
    path: z
      .string()
      .optional()
      .describe('File or directory to review (default: files changed in the working tree)'),
    focus: z
      .enum(['security', 'quality', 'performance', 'all'])
      .optional()
      .describe('Review focus area (default: all)'),
  }),
)
type InputSchema = ReturnType<typeof inputSchema>

const outputSchema = lazySchema(() =>
  z.object({
    ok: z.boolean(),
    target: z.string(),
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
  }),
)
type OutputSchema = ReturnType<typeof outputSchema>
export type Output = z.infer<OutputSchema>

export const CODE_REVIEW_TOOL_NAME = 'flawra_code_review'

const DESCRIPTION =
  'Automated security, quality, and performance review of code files or git-changed files.'

const PROMPT = `Scan code for concrete problems before committing.

Security: hardcoded secrets/keys/passwords, eval usage, command built via concatenation, path traversal patterns, SQL built via interpolation, destructive rm with variables.
Quality: console.log/debugger left in code, unresolved TODO/FIXME/HACK markers.
Performance: sync fs calls in async code paths, JSON.parse of very large buffers without streaming.

Pass a file or directory path to review specific code, or omit path to review everything changed in the working tree (git diff). Report issues with file, line, severity, and a concrete fix. Treat the output as advisory — verify critical findings yourself before telling the user they are real.`

interface Pattern {
  regex: RegExp
  severity: 'critical' | 'high' | 'medium' | 'low'
  category: string
  message: string
  suggestion?: string
}

const SECURITY_PATTERNS: Pattern[] = [
  { regex: /(api[_-]?key|secret|password|passwd|token|credential)s?\s*[:=]\s*['"][A-Za-z0-9\-_/+=.]{12,}['"]/i, severity: 'critical', category: 'security', message: 'Hardcoded secret detected', suggestion: 'Move to an environment variable or a secrets manager' },
  { regex: /\beval\s*\(/, severity: 'critical', category: 'security', message: 'eval() is a code-injection risk', suggestion: 'Parse with JSON.parse or a real parser instead of eval' },
  { regex: /child_process.*(exec|spawn|execSync)\s*\(\s*['"`][^'"`]*\+/, severity: 'high', category: 'security', message: 'Shell command built via string concatenation', suggestion: 'Pass arguments as an array and never interpolate untrusted input' },
  { regex: /(SELECT|INSERT|UPDATE|DELETE)[^;'"]*['"]\s*\+/, severity: 'high', category: 'security', message: 'SQL query built via string concatenation', suggestion: 'Use parameterized queries / prepared statements' },
  { regex: /\.\.\\?\.\.\\?\.\.[/\\]/, severity: 'high', category: 'security', message: 'Path traversal pattern in source', suggestion: 'Resolve and validate paths against an allowed root before use' },
  { regex: /rm\s+-rf\s+\$/, severity: 'critical', category: 'security', message: 'Destructive rm with unvalidated variable', suggestion: 'Validate the path is non-empty and inside the expected root first' },
]

const QUALITY_PATTERNS: Pattern[] = [
  { regex: /\bconsole\.(log|debug|info|warn)\s*\(/, severity: 'low', category: 'quality', message: 'console logging left in code', suggestion: 'Remove or route through a logger with levels' },
  { regex: /^\s*debugger\s*;?\s*$/m, severity: 'medium', category: 'quality', message: 'debugger statement left in code', suggestion: 'Remove before committing' },
  { regex: /\b(TODO|FIXME|HACK|XXX)\b/, severity: 'low', category: 'quality', message: 'Unresolved TODO/FIXME marker', suggestion: 'Resolve it or file an issue' },
]

const PERF_PATTERNS: Pattern[] = [
  { regex: /\b(fs\.readFileSync|fs\.writeFileSync|readFileSync|writeFileSync)\s*\(/, severity: 'low', category: 'performance', message: 'Synchronous file I/O detected', suggestion: 'Use the async fs/promises API in request/hot paths' },
  { regex: /while\s*\(\s*(?:true|1)\s*\)\s*\{[^}]*\}\s*$/m, severity: 'medium', category: 'performance', message: 'Unbounded busy loop', suggestion: 'Add an exit condition or sleep inside the loop' },
]

const CODE_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.go', '.rs', '.java', '.php', '.rb', '.sh', '.sql'])

function collectFiles(target: string): string[] {
  let st
  try {
    st = statSync(target)
  } catch {
    return []
  }
  if (st.isFile()) return [target]
  const out: string[] = []
  const walk = (dir: string, depth: number) => {
    if (depth > 4 || out.length > 500) return
    let entries
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const e of entries) {
      if (e.name === 'node_modules' || e.name === '.git' || e.name === 'dist' || e.name === 'build') continue
      const p = join(dir, e.name)
      if (e.isDirectory()) walk(p, depth + 1)
      else if (CODE_EXT.has('.' + e.name.split('.').pop())) out.push(p)
    }
  }
  walk(target, 0)
  return out
}

function scanFile(filePath: string, focus: string): Output['issues'] {
  const issues: Output['issues'] = []
  let content: string
  try {
    content = readFileSync(filePath, 'utf-8')
  } catch {
    return issues
  }
  if (content.length > 2_000_000) return issues

  const lines = content.split('\n')
  const groups: Pattern[] =
    focus === 'security' ? SECURITY_PATTERNS
    : focus === 'quality' ? QUALITY_PATTERNS
    : focus === 'performance' ? PERF_PATTERNS
    : [...SECURITY_PATTERNS, ...QUALITY_PATTERNS, ...PERF_PATTERNS]

  for (const p of groups) {
    for (let i = 0; i < lines.length; i++) {
      if (p.regex.test(lines[i])) {
        issues.push({
          severity: p.severity,
          category: p.category,
          file: filePath,
          line: i + 1,
          message: p.message,
          suggestion: p.suggestion,
        })
        if (issues.length > 200) return issues
      }
    }
  }
  return issues
}

function getChangedFiles(): string[] {
  try {
    const out = execSync('git diff --name-only HEAD', { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 })
    return out.split('\n').map(s => s.trim()).filter(Boolean)
  } catch {
    return []
  }
}

export const FlawraCodeReviewTool = buildTool({
  alwaysLoad: true,
  name: CODE_REVIEW_TOOL_NAME,
  searchHint: 'security audit code review before commit',
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
    return 'Code Review'
  },
  isConcurrencySafe: () => true,
  isReadOnly: () => true,
  isSearchOrReadCommand() {
    return { isSearch: true, isRead: true }
  },

  async call(input): Promise<{ data: Output }> {
    const focus = input.focus ?? 'all'
    let files: string[]
    let target: string

    if (input.path) {
      files = collectFiles(input.path)
      target = input.path
    } else {
      files = getChangedFiles().filter(existsSync)
      target = 'git working tree'
    }

    const allIssues: Output['issues'] = []
    for (const f of files) allIssues.push(...scanFile(f, focus))

    const critical = allIssues.filter(i => i.severity === 'critical').length
    const high = allIssues.filter(i => i.severity === 'high').length
    const score = Math.max(0, 100 - critical * 25 - high * 10 - (allIssues.length - critical - high) * 2)

    const summary =
      files.length === 0
        ? 'No reviewable files found.'
        : allIssues.length === 0
          ? `Clean — no issues in ${files.length} file(s).`
          : `${allIssues.length} issue(s) in ${files.length} file(s): ${critical} critical, ${high} high.`

    return { data: { ok: allIssues.length === 0, target, focus, issues: allIssues, summary, score } }
  },

  mapToolResultToToolResultBlockParam(result, toolUseID) {
    return {
      tool_use_id: toolUseID,
      type: 'tool_result' as const,
      content: JSON.stringify(result),
    }
  },
} satisfies ToolDef<InputSchema, Output>)
