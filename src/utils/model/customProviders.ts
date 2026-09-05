/**
 * FLAWRA-CODE — custom providers.
 *
 * Lets users point the CLI at ANY Anthropic-Messages-compatible endpoint:
 * local (Ollama, LM Studio, llama.cpp server, claude-code-router), proxies
 * (LiteLLM, one-api, new-api), or hosted gateways (OpenRouter via a
 * translating proxy, github-models, etc.) — and map the built-in model
 * aliases (sonnet / opus / haiku / best) onto that provider's model IDs.
 *
 * Config file: ~/.flawra/providers.json  (override dir with FLAWRA_HOME)
 *
 * {
 *   "active": "ollama",
 *   "providers": {
 *     "ollama": {
 *       "label": "Ollama (local)",
 *       "baseUrl": "http://localhost:11434",
 *       "apiKey": "ollama",
 *       "models": { "sonnet": "qwen3-coder:30b", "haiku": "llama3.2:3b" }
 *     },
 *     "litellm": {
 *       "label": "LiteLLM proxy",
 *       "baseUrl": "http://localhost:4000",
 *       "apiKeyEnv": "LITELLM_MASTER_KEY",
 *       "models": { "opus": "claude-opus-4-6", "sonnet": "claude-sonnet-4-5" }
 *     }
 *   }
 * }
 *
 * Selection priority: FLAWRA_PROVIDER env > "active" field.
 * Applied BEFORE any other module reads ANTHROPIC_BASE_URL / auth env vars.
 */
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

export type CustomProviderConfig = {
  label?: string
  baseUrl: string
  apiKey?: string
  apiKeyEnv?: string
  /** Maps model aliases (sonnet|opus|haiku|best) or exact model IDs to provider model IDs */
  models?: Record<string, string>
  /** Extra headers sent on every request, e.g. { "X-Title": "flawra" } */
  headers?: Record<string, string>
}

export type ProvidersFile = {
  active?: string
  providers?: Record<string, CustomProviderConfig>
}

export const PROVIDERS_FILE_PATH = join(
  process.env.FLAWRA_HOME || join(homedir(), '.flawra'),
  'providers.json',
)

let cached: { file: ProvidersFile | null; path: string } | null = null

export function loadProvidersFile(): ProvidersFile | null {
  if (cached) return cached.file
  try {
    const raw = existsSync(PROVIDERS_FILE_PATH)
      ? readFileSync(PROVIDERS_FILE_PATH, 'utf-8')
      : null
    cached = { file: raw ? (JSON.parse(raw) as ProvidersFile) : null, path: PROVIDERS_FILE_PATH }
  } catch {
    cached = { file: null, path: PROVIDERS_FILE_PATH }
  }
  return cached.file
}

/** Reset the module cache — used by tests and after editing the file. */
export function resetProvidersCache(): void {
  cached = null
}

export function getActiveProviderName(): string | null {
  const file = loadProvidersFile()
  const fromEnv = process.env.FLAWRA_PROVIDER?.trim()
  if (fromEnv) return fromEnv
  return file?.active?.trim() || null
}

export function getActiveProvider(): { name: string; config: CustomProviderConfig } | null {
  const file = loadProvidersFile()
  const name = getActiveProviderName()
  if (!file?.providers || !name) return null
  const config = file.providers[name]
  if (!config?.baseUrl) return null
  return { name, config }
}

/**
 * Apply the active provider to process.env. Call once at startup, before the
 * API client, OAuth, or model code reads these variables.
 *
 * Never overwrites an explicitly-set ANTHROPIC_BASE_URL / ANTHROPIC_AUTH_TOKEN
 * from the user's own shell — the shell wins, so a provider file can't hijack
 * a manual override.
 */
export function applyCustomProviderEnv(): { applied: boolean; provider?: string; reason?: string } {
  const active = getActiveProvider()
  if (!active) {
    return { applied: false, reason: getActiveProviderName() ? 'unknown-provider' : 'no-provider-configured' }
  }
  const { name, config } = active

  if (!process.env.ANTHROPIC_BASE_URL) {
    process.env.ANTHROPIC_BASE_URL = config.baseUrl
  }

  const token =
    (config.apiKeyEnv ? process.env[config.apiKeyEnv] : undefined) || config.apiKey
  if (token) {
    if (!process.env.ANTHROPIC_AUTH_TOKEN && !process.env.ANTHROPIC_API_KEY) {
      process.env.ANTHROPIC_AUTH_TOKEN = token
    }
  }

  if (config.headers && Object.keys(config.headers).length > 0) {
    // Merge into ANTHROPIC_CUSTOM_HEADERS (curl-style "Name: Value", newline separated)
    const existing = process.env.ANTHROPIC_CUSTOM_HEADERS
    const lines = Object.entries(config.headers).map(([k, v]) => `${k}: ${v}`)
    process.env.ANTHROPIC_CUSTOM_HEADERS = existing
      ? `${existing}\n${lines.join('\n')}`
      : lines.join('\n')
  }

  return { applied: true, provider: name }
}

/**
 * Resolve a user-specified model string against the active provider's model
 * map. Returns the provider model ID if mapped, otherwise null (caller falls
 * through to built-in alias handling).
 *
 * Matches on (in order): exact key, case-insensitive key, alias with [1m]
 * suffix stripped.
 */
export function resolveCustomProviderModel(modelInput: string): string | null {
  const active = getActiveProvider()
  if (!active?.config.models) return null
  const models = active.config.models

  const trimmed = modelInput.trim()
  const base = trimmed.replace(/\[1m\]$/i, '').trim()
  const has1m = /\[1m\]$/i.test(trimmed)

  // exact match first (case-sensitive), then case-insensitive
  let mapped: string | undefined = models[base]
  if (mapped === undefined) {
    const lower = base.toLowerCase()
    for (const [k, v] of Object.entries(models)) {
      if (k.toLowerCase() === lower) {
        mapped = v
        break
      }
    }
  }
  if (mapped === undefined) return null
  return has1m ? mapped + '[1m]' : mapped
}

/** Human summary for `flawra providers`. */
export function describeProviders(): string {
  const file = loadProvidersFile()
  if (!file?.providers || Object.keys(file.providers).length === 0) {
    return `No providers configured.\nCreate ${PROVIDERS_FILE_PATH} with:\n\n${JSON.stringify(
      {
        active: 'ollama',
        providers: {
          ollama: {
            label: 'Ollama (local)',
            baseUrl: 'http://localhost:11434',
            apiKey: 'ollama',
            models: { sonnet: 'qwen3-coder:30b', haiku: 'llama3.2:3b' },
          },
        },
      },
      null,
      2,
    )}\n\nAny Anthropic-Messages-compatible endpoint works: Ollama, LM Studio,\nLiteLLM, llama.cpp server, claude-code-router, GitHub Models, gateways.`
  }
  const activeName = getActiveProviderName()
  const lines: string[] = [`Config: ${PROVIDERS_FILE_PATH}`, '']
  for (const [name, cfg] of Object.entries(file.providers)) {
    const marker = name === activeName ? '*' : ' '
    const label = cfg.label ? ` — ${cfg.label}` : ''
    const modelPairs = cfg.models
      ? Object.entries(cfg.models)
          .map(([alias, id]) => `${alias}→${id}`)
          .join(', ')
      : ''
    lines.push(`${marker} ${name}${label}`)
    lines.push(`    baseUrl: ${cfg.baseUrl}`)
    if (modelPairs) lines.push(`    models:  ${modelPairs}`)
  }
  lines.push('', `Switch with: FLAWRA_PROVIDER=<name> flawra  (or edit "active")`)
  return lines.join('\n')
}
