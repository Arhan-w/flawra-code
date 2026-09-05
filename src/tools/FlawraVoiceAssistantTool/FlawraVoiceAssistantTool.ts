// FlawraVoiceAssistantTool – a unique voice‑controlled assistant for FLAWRA‑CODE.
// It uses OpenAI's Whisper (or any local whisper implementation) to capture
// microphone audio, transcribe it, and feed the transcription to the
// Flawra agent as a user command. This gives a hands‑free way to drive the
// CLI and is not present in any other Claude‑derived forks.

import { buildTool, type ToolDef } from '../../Tool.js';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const FlawraVoiceAssistantToolDef: ToolDef<{
  audioPath?: string;
}> = {
  name: 'flawra_voice_assistant',
  description: 'Capture microphone audio, transcribe with Whisper, and feed the text as a user command.',
  schema: {
    audioPath: { type: 'string', description: 'Path to audio file (optional, records 5s if omitted)' },
  },
  async run(args) {
    try {
      const audioPath = args.audioPath ?? path.resolve('tmp', 'voice_input.wav');
      if (!fs.existsSync(audioPath)) {
        // Record with ffmpeg (5 s) – minimal for demo.
        execSync(`ffmpeg -y -f dshow -i audio="Microphone (Realtek Audio)" -t 5 -q:a 0 ${audioPath}`);
      }
      // Transcribe via whisper (assumes whisper CLI returns plain text).
      const transcription = execSync(`whisper ${audioPath} --model base --output_format txt`, { encoding: 'utf8' }).trim();
      // Feed transcription back to Flawra CLI as a command.
      const cliOutput = execSync(`bun run dist/cli.js --print "${transcription.replace(/"/g, '\"')}"`, { encoding: 'utf8' });
      return { success: true, output: cliOutput };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },
};

export default buildTool(FlawraVoiceAssistantToolDef);