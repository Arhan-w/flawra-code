// FLAWRA-CODE — voice assistant tool: capture mic audio, transcribe with Whisper,
// and return the transcription as text the agent can act on.
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod/v4'
import { buildTool, type ToolDef } from '../../Tool.js'
import { lazySchema } from '../../utils/lazySchema.js'

const inputSchema = lazySchema(() =>
  z.strictObject({
    audioPath: z
      .string()
      .optional()
      .describe('Path to an audio file to transcribe (if omitted, records 5s from the default mic)'),
    seconds: z
      .number()
      .int()
      .min(1)
      .max(60)
      .optional()
      .describe('Recording duration in seconds when capturing from the mic (default 5)'),
  }),
)
type InputSchema = ReturnType<typeof inputSchema>

const outputSchema = lazySchema(() =>
  z.object({
    ok: z.boolean(),
    transcription: z.string().optional(),
    audioPath: z.string().optional(),
    error: z.string().optional(),
  }),
)
type OutputSchema = ReturnType<typeof outputSchema>
export type Output = z.infer<OutputSchema>

export const VOICE_TOOL_NAME = 'flawra_voice_assistant'

const DESCRIPTION =
  'Voice input: record from the microphone (or read an audio file) and transcribe it with Whisper.'

const PROMPT = `Capture spoken commands and convert them to text.

When to use:
- The user says they want to talk instead of type → record and transcribe.
- The user points you at an audio file (memo, lecture, voicemail) → transcribe it.

Requirements: ffmpeg (capture) and a whisper CLI on PATH (transcription).
If either is missing, report the error honestly — do not fabricate a transcription.
Treat the transcription as user intent, then act on it with the other tools.`

export const FlawraVoiceAssistantTool = buildTool({
  alwaysLoad: true,
  name: VOICE_TOOL_NAME,
  searchHint: 'voice microphone speech whisper transcribe audio',
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
    return 'Voice'
  },
  isConcurrencySafe: () => false,
  isReadOnly: () => true,

  async call(input): Promise<{ data: Output }> {
    const { execSync } = await import('node:child_process')
    const os = await import('node:os')
    const tmp = join(os.tmpdir(), `flawra-voice-${Date.now()}.wav`)
    const audioPath = input.audioPath ?? tmp

    try {
      if (!input.audioPath) {
        // Record N seconds from the default microphone.
        const secs = input.seconds ?? 5
        execSync(
          `ffmpeg -y -f dshow -i audio="default" -t ${secs} -q:a 0 "${audioPath}"`,
          { encoding: 'utf8', timeout: (secs + 15) * 1000 },
        )
      }
      if (!existsSync(audioPath)) {
        return { data: { ok: false, error: `audio file not found: ${audioPath}` } }
      }
      // Transcribe with whisper CLI (base model, plain text output).
      const transcription = execSync(
        `whisper "${audioPath}" --model base --output_format txt --output_dir "${os.tmpdir()}"`,
        { encoding: 'utf8', timeout: 300_000 },
      )
      // whisper prints progress to stdout; prefer the .txt sidecar if present.
      const txtPath = audioPath.replace(/\.[^.]+$/, '.txt')
      const text = existsSync(txtPath)
        ? (await import('node:fs')).readFileSync(txtPath, 'utf8').trim()
        : transcription.trim()
      return { data: { ok: true, transcription: text, audioPath } }
    } catch (e: unknown) {
      return {
        data: {
          ok: false,
          error:
            e instanceof Error
              ? `voice pipeline failed (needs ffmpeg + whisper CLI): ${e.message}`
              : String(e),
        },
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
