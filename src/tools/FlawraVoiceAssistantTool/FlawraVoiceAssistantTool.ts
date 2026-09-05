// FlawraVoiceAssistantTool – a unique voice‑controlled assistant for FLAWRA‑CODE.
// It uses OpenAI's Whisper (or any local whisper implementation) to capture
// microphone audio, transcribe it, and feed the transcription to the
// Flawra agent as a user command. This gives a hands‑free way to drive the
// CLI and is not present in any other Claude‑derived forks.

import { Tool, ToolResult } from '../../tool.js';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export class FlawraVoiceAssistantTool extends Tool {
  name = 'flawra_voice_assistant';
  description = 'Capture microphone audio, transcribe with Whisper, and feed the text as a user command.';
  // Assumes `whisper` CLI is installed and in PATH. For demo we use a simple
  // placeholder that reads a pre‑recorded wav file.

  async run(args: { audioPath?: string } = {}): Promise<ToolResult> {
    try {
      // If user supplied an audio file, use it; otherwise record 5 seconds.
      const audioPath = args.audioPath ?? path.resolve('tmp', 'voice_input.wav');
      if (!fs.existsSync(audioPath)) {
        // Record with ffmpeg (5 s) – minimal for demo.
        execSync(`ffmpeg -y -f dshow -i audio="Microphone (Realtek Audio)" -t 5 -q:a 0 ${audioPath}`);
      }
      // Transcribe via whisper (assumes whisper CLI returns plain text).
      const transcription = execSync(`whisper ${audioPath} --model base --output_format txt`, { encoding: 'utf8' }).trim();
      // Feed transcription back to Flawra CLI as a command.
      // We'll invoke the CLI in print mode, capture output.
      const cliOutput = execSync(`bun run dist/cli.js --print "${transcription.replace(/"/g, '\"')}"`, { encoding: 'utf8' });
      return { success: true, output: cliOutput };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
}
