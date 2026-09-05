// Content for the flawra-api bundled skill.
// Each .md file is inlined as a string at build time via Bun's text loader.

import csharpFlawraApi from './flawra-api/csharp/flawra-api.md'
import curlExamples from './flawra-api/curl/examples.md'
import goFlawraApi from './flawra-api/go/flawra-api.md'
import javaFlawraApi from './flawra-api/java/flawra-api.md'
import phpFlawraApi from './flawra-api/php/flawra-api.md'
import pythonAgentSdkPatterns from './flawra-api/python/agent-sdk/patterns.md'
import pythonAgentSdkReadme from './flawra-api/python/agent-sdk/README.md'
import pythonFlawraApiBatches from './flawra-api/python/flawra-api/batches.md'
import pythonFlawraApiFilesApi from './flawra-api/python/flawra-api/files-api.md'
import pythonFlawraApiReadme from './flawra-api/python/flawra-api/README.md'
import pythonFlawraApiStreaming from './flawra-api/python/flawra-api/streaming.md'
import pythonFlawraApiToolUse from './flawra-api/python/flawra-api/tool-use.md'
import rubyFlawraApi from './flawra-api/ruby/flawra-api.md'
import skillPrompt from './flawra-api/SKILL.md'
import sharedErrorCodes from './flawra-api/shared/error-codes.md'
import sharedLiveSources from './flawra-api/shared/live-sources.md'
import sharedModels from './flawra-api/shared/models.md'
import sharedPromptCaching from './flawra-api/shared/prompt-caching.md'
import sharedToolUseConcepts from './flawra-api/shared/tool-use-concepts.md'
import typescriptAgentSdkPatterns from './flawra-api/typescript/agent-sdk/patterns.md'
import typescriptAgentSdkReadme from './flawra-api/typescript/agent-sdk/README.md'
import typescriptFlawraApiBatches from './flawra-api/typescript/flawra-api/batches.md'
import typescriptFlawraApiFilesApi from './flawra-api/typescript/flawra-api/files-api.md'
import typescriptFlawraApiReadme from './flawra-api/typescript/flawra-api/README.md'
import typescriptFlawraApiStreaming from './flawra-api/typescript/flawra-api/streaming.md'
import typescriptFlawraApiToolUse from './flawra-api/typescript/flawra-api/tool-use.md'

// @[MODEL LAUNCH]: Update the model IDs/names below. These are substituted into {{VAR}}
// placeholders in the .md files at runtime before the skill prompt is sent.
// After updating these constants, manually update the two files that still hardcode models:
//   - flawra-api/SKILL.md (Current Models pricing table)
//   - flawra-api/shared/models.md (full model catalog with legacy versions and alias mappings)
export const SKILL_MODEL_VARS = {
  OPUS_ID: 'flawra-opus-4-6',
  OPUS_NAME: 'Flawra Opus 4.6',
  SONNET_ID: 'flawra-sonnet-4-6',
  SONNET_NAME: 'Flawra Sonnet 4.6',
  HAIKU_ID: 'flawra-haiku-4-5',
  HAIKU_NAME: 'Flawra Haiku 4.5',
  // Previous Sonnet ID — used in "do not append date suffixes" example in SKILL.md.
  PREV_SONNET_ID: 'flawra-sonnet-4-5',
} satisfies Record<string, string>

export const SKILL_PROMPT: string = skillPrompt

export const SKILL_FILES: Record<string, string> = {
  'csharp/flawra-api.md': csharpFlawraApi,
  'curl/examples.md': curlExamples,
  'go/flawra-api.md': goFlawraApi,
  'java/flawra-api.md': javaFlawraApi,
  'php/flawra-api.md': phpFlawraApi,
  'python/agent-sdk/README.md': pythonAgentSdkReadme,
  'python/agent-sdk/patterns.md': pythonAgentSdkPatterns,
  'python/flawra-api/README.md': pythonFlawraApiReadme,
  'python/flawra-api/batches.md': pythonFlawraApiBatches,
  'python/flawra-api/files-api.md': pythonFlawraApiFilesApi,
  'python/flawra-api/streaming.md': pythonFlawraApiStreaming,
  'python/flawra-api/tool-use.md': pythonFlawraApiToolUse,
  'ruby/flawra-api.md': rubyFlawraApi,
  'shared/error-codes.md': sharedErrorCodes,
  'shared/live-sources.md': sharedLiveSources,
  'shared/models.md': sharedModels,
  'shared/prompt-caching.md': sharedPromptCaching,
  'shared/tool-use-concepts.md': sharedToolUseConcepts,
  'typescript/agent-sdk/README.md': typescriptAgentSdkReadme,
  'typescript/agent-sdk/patterns.md': typescriptAgentSdkPatterns,
  'typescript/flawra-api/README.md': typescriptFlawraApiReadme,
  'typescript/flawra-api/batches.md': typescriptFlawraApiBatches,
  'typescript/flawra-api/files-api.md': typescriptFlawraApiFilesApi,
  'typescript/flawra-api/streaming.md': typescriptFlawraApiStreaming,
  'typescript/flawra-api/tool-use.md': typescriptFlawraApiToolUse,
}
