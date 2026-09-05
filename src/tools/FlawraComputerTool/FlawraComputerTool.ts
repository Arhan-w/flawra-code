// FLAWRA-CODE — human-like computer use (Windows): screenshot, click, type, key, scroll.
// Drives the real desktop via PowerShell + user32 SendInput + GDI screenshot.
// No native modules required.
import { execSync } from 'node:child_process'
import { mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { z } from 'zod/v4'
import { buildTool, type ToolDef } from '../../Tool.js'
import { lazySchema } from '../../utils/lazySchema.js'

const SHOT_DIR = join(tmpdir(), 'flawra-computer')

const PS_HEADER = `
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Windows.Forms,System.Drawing
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public struct MINPUT {
  [MarshalAs(UnmanagedType.ByValTStruct, SizeConst=40)] public byte[] data;
}
public static class Win32 {
  [DllImport("user32.dll")] public static extern void mouse_event(uint flags, uint dx, uint dy, uint data, UIntPtr extra);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void keybd_event(byte vk, byte scan, uint flags, UIntPtr extra);
  [DllImport("user32.dll")] public static extern short VkKeyScan(char ch);
}
'@
`

function runPs(script: string): string {
  return execSync(`powershell -NoProfile -NonInteractive -Command "${script.replace(/"/g, '\\"')}"`, {
    encoding: 'utf-8',
    timeout: 30000,
    maxBuffer: 20 * 1024 * 1024,
  })
}

const inputSchema = lazySchema(() =>
  z.strictObject({
    action: z
      .enum(['screenshot', 'click', 'double_click', 'right_click', 'type', 'key', 'scroll', 'move', 'list_windows'])
      .describe('Computer action'),
    x: z.number().int().optional().describe('Screen X coordinate (for click/move/scroll)'),
    y: z.number().int().optional().describe('Screen Y coordinate'),
    text: z.string().optional().describe('Text to type (type action)'),
    keys: z.string().optional().describe('Key combo like "ctrl+s" or "enter" (key action)'),
    amount: z.number().int().optional().describe('Scroll ticks (scroll action, default 3)'),
  }),
)
type InputSchema = ReturnType<typeof inputSchema>

const outputSchema = lazySchema(() =>
  z.object({
    ok: z.boolean(),
    action: z.string(),
    screenshot_path: z.string().optional(),
    output: z.string().optional(),
    error: z.string().optional(),
  }),
)
type OutputSchema = ReturnType<typeof outputSchema>
export type Output = z.infer<OutputSchema>

export const COMPUTER_TOOL_NAME = 'flawra_computer'

const DESCRIPTION =
  'Control the desktop like a human: take screenshots, click, type, press keys, scroll.'

const PROMPT = `Drive the real Windows desktop with mouse and keyboard, then look at the result via screenshot.

Workflow (always): screenshot → decide → act → screenshot again to verify. Never assume an action worked without re-capturing.

- screenshot: captures the full screen to a PNG; read the returned file to see what's on screen.
- click / double_click / right_click at (x,y): pixel coordinates from the screenshot.
- type: types literal text into whatever has keyboard focus. Click the target field first.
- key: press a key or combo — "enter", "escape", "tab", "ctrl+a", "ctrl+c", "alt+tab", "win", "cmd+shift+s".
- scroll: wheel up/down at (x,y).
- list_windows: enumerate open windows (title + process) to find your target.

Human-like rules:
- Move deliberately: click the right spot, verify, then continue. One action at a time.
- NEVER type passwords, payment info, or secrets. NEVER click permission dialogs, "Are you sure" prompts, or purchase buttons — stop and ask the user instead.
- If something goes wrong (wrong window focused, misclick), take a screenshot, recover (alt+tab, escape), and retry.
- Prefer keyboard shortcuts over pixel-hunting when you know them.
- After typing into a field, screenshot to confirm the text landed before pressing Enter.`

function vkForChar(ch: string): number {
  // Use PowerShell to resolve; simpler: handle common keys, fall back to VkKeyScan via PS
  return -1
}

const VKEYS: Record<string, number> = {
  enter: 0x0d, return: 0x0d, tab: 0x09, escape: 0x1b, esc: 0x1b, space: 0x20,
  backspace: 0x08, delete: 0x2e, insert: 0x2d, home: 0x24, end: 0x23,
  pageup: 0x21, pagedown: 0x22, up: 0x26, down: 0x28, left: 0x25, right: 0x27,
  win: 0x5b, ctrl: 0x11, control: 0x11, alt: 0x12, shift: 0x10,
  f1: 0x70, f2: 0x71, f3: 0x72, f4: 0x73, f5: 0x74, f6: 0x75,
  f7: 0x76, f8: 0x77, f9: 0x78, f10: 0x79, f11: 0x7a, f12: 0x7b,
}

function keyToVkey(k: string): number | null {
  const lower = k.toLowerCase()
  if (VKEYS[lower] !== undefined) return VKEYS[lower]
  if (/^[a-z0-9]$/.test(lower)) return lower.toUpperCase().charCodeAt(0)
  if (/^f\d+$/.test(lower)) return 0x70 + parseInt(lower.slice(1), 10) - 1
  return null
}

function psQuote(s: string): string {
  // single-quote escape for PowerShell literals
  return `'${s.replace(/'/g, "''")}'`
}

function takeScreenshot(): string {
  if (!existsSync(SHOT_DIR)) mkdirSync(SHOT_DIR, { recursive: true })
  const path = join(SHOT_DIR, `screen-${Date.now()}.png`)
  const script = `$b=[System.Windows.Forms.SystemInformation]::VirtualScreen; $bmp=New-Object System.Drawing.Bitmap($b.Width,$b.Height); $g=[System.Drawing.Graphics]::FromImage($bmp); $g.CopyFromScreen($b.Location,[System.Drawing.Point]::Empty,$b.Size); $bmp.Save(${psQuote(path)}); Write-Output ${psQuote(path)}`
  runPs(PS_HEADER + script)
  return path
}

function moveAndClick(x: number, y: number, button: 'left' | 'right' | 'double') {
  const LEFTDOWN = 0x02, LEFTUP = 0x04, RIGHTDOWN = 0x08, RIGHTUP = 0x10
  let script = `[Win32]::SetCursorPos(${x},${y}); Start-Sleep -Milliseconds 80;`
  if (button === 'left') script += `[Win32]::mouse_event(${LEFTDOWN},0,0,0,[UIntPtr]::Zero); Start-Sleep -Milliseconds 60; [Win32]::mouse_event(${LEFTUP},0,0,0,[UIntPtr]::Zero);`
  else if (button === 'right') script += `[Win32]::mouse_event(${RIGHTDOWN},0,0,0,[UIntPtr]::Zero); Start-Sleep -Milliseconds 60; [Win32]::mouse_event(${RIGHTUP},0,0,0,[UIntPtr]::Zero);`
  else script += `[Win32]::mouse_event(${LEFTDOWN},0,0,0,[UIntPtr]::Zero); [Win32]::mouse_event(${LEFTUP},0,0,0,[UIntPtr]::Zero); Start-Sleep -Milliseconds 80; [Win32]::mouse_event(${LEFTDOWN},0,0,0,[UIntPtr]::Zero); [Win32]::mouse_event(${LEFTUP},0,0,0,[UIntPtr]::Zero);`
  runPs(PS_HEADER + script)
}

function typeText(text: string) {
  // SendKeys via System.Windows.Forms — escape special chars
  const escaped = text
    .replace(/([+^%~(){}\[\]])/g, '{$1}')
    .replace(/"/g, '{\"}')
  const script = `[System.Windows.Forms.SendKeys]::SendWait(${psQuote(escaped)})`
  runPs(PS_HEADER + script)
}

function pressCombo(keys: string) {
  const parts = keys.toLowerCase().split('+').map((p) => p.trim())
  const vks: number[] = []
  for (const p of parts) {
    const vk = keyToVkey(p)
    if (vk === null) throw new Error(`Unknown key: ${p}`)
    vks.push(vk)
  }
  const KEYUP = 0x02
  let script = ''
  for (const vk of vks) script += `[Win32]::keybd_event(${vk},0,0,[UIntPtr]::Zero); Start-Sleep -Milliseconds 30;`
  for (const vk of [...vks].reverse()) script += `[Win32]::keybd_event(${vk},0,${KEYUP},[UIntPtr]::Zero); Start-Sleep -Milliseconds 30;`
  runPs(PS_HEADER + script)
}

function scrollAt(x: number, y: number, amount: number) {
  const MOUSEEVENTF_WHEEL = 0x800
  let script = `[Win32]::SetCursorPos(${x},${y}); Start-Sleep -Milliseconds 60;`
  const step = amount > 0 ? 120 : -120
  const ticks = Math.min(Math.abs(amount), 20)
  for (let i = 0; i < ticks; i++) {
    script += `[Win32]::mouse_event(${MOUSEEVENTF_WHEEL},0,0,${step & 0xffffffff},[UIntPtr]::Zero); Start-Sleep -Milliseconds 40;`
  }
  runPs(PS_HEADER + script)
}

function listWindows(): string {
  const script =
    "Get-Process | Where-Object { $_.MainWindowTitle } | ForEach-Object { '{0} | {1}' -f $_.ProcessName, $_.MainWindowTitle } | Out-String"
  return runPs(PS_HEADER + script).trim()
}

export const FlawraComputerTool = buildTool({
  name: COMPUTER_TOOL_NAME,
  searchHint: 'desktop control screenshot mouse keyboard computer use',
  maxResultSizeChars: 20_000,
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
    return 'Computer'
  },
  isEnabled: () => process.platform === 'win32',
  isConcurrencySafe: () => false,
  isReadOnly(input) {
    return input.action === 'screenshot' || input.action === 'list_windows'
  },

  async call(input): Promise<{ data: Output }> {
    try {
      switch (input.action) {
        case 'screenshot': {
          const p = takeScreenshot()
          return { data: { ok: true, action: 'screenshot', screenshot_path: p, output: `Screen captured to ${p}` } }
        }
        case 'click': {
          if (input.x === undefined || input.y === undefined) return { data: { ok: false, action: 'click', error: 'x and y required' } }
          moveAndClick(input.x, input.y, 'left')
          return { data: { ok: true, action: 'click', output: `Clicked (${input.x},${input.y})` } }
        }
        case 'double_click': {
          if (input.x === undefined || input.y === undefined) return { data: { ok: false, action: 'double_click', error: 'x and y required' } }
          moveAndClick(input.x, input.y, 'double')
          return { data: { ok: true, action: 'double_click', output: `Double-clicked (${input.x},${input.y})` } }
        }
        case 'right_click': {
          if (input.x === undefined || input.y === undefined) return { data: { ok: false, action: 'right_click', error: 'x and y required' } }
          moveAndClick(input.x, input.y, 'right')
          return { data: { ok: true, action: 'right_click', output: `Right-clicked (${input.x},${input.y})` } }
        }
        case 'type': {
          if (!input.text) return { data: { ok: false, action: 'type', error: 'text required' } }
          typeText(input.text)
          return { data: { ok: true, action: 'type', output: `Typed ${input.text.length} chars` } }
        }
        case 'key': {
          if (!input.keys) return { data: { ok: false, action: 'key', error: 'keys required' } }
          pressCombo(input.keys)
          return { data: { ok: true, action: 'key', output: `Pressed ${input.keys}` } }
        }
        case 'scroll': {
          if (input.x === undefined || input.y === undefined) return { data: { ok: false, action: 'scroll', error: 'x and y required' } }
          scrollAt(input.x, input.y, input.amount ?? 3)
          return { data: { ok: true, action: 'scroll', output: `Scrolled at (${input.x},${input.y})` } }
        }
        case 'move': {
          if (input.x === undefined || input.y === undefined) return { data: { ok: false, action: 'move', error: 'x and y required' } }
          runPs(PS_HEADER + `[Win32]::SetCursorPos(${input.x},${input.y})`)
          return { data: { ok: true, action: 'move', output: `Moved cursor to (${input.x},${input.y})` } }
        }
        case 'list_windows': {
          const out = listWindows()
          return { data: { ok: true, action: 'list_windows', output: out } }
        }
      }
    } catch (e: any) {
      return { data: { ok: false, action: input.action, error: e?.stderr || e?.message || String(e) } }
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
