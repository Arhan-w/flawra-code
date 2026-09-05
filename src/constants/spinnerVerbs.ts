import { getInitialSettings } from '../utils/settings/settings.js'

export function getSpinnerVerbs(): string[] {
  const settings = getInitialSettings()
  const config = settings.spinnerVerbs
  if (!config) {
    return SPINNER_VERBS
  }
  if (config.mode === 'replace') {
    return config.verbs.length > 0 ? config.verbs : SPINNER_VERBS
  }
  return [...SPINNER_VERBS, ...config.verbs]
}

// Spinner verbs for loading messages
export const SPINNER_VERBS = [
  'Compiling',
  'Indexing',
  'Parsing',
  'Resolving',
  'Tracing',
  'Weaving',
  'Forging',
  'Soldering',
  'Crunching',
  'Distilling',
  'Extracting',
  'Scanning',
  'Mapping',
  'Probing',
  'Refactoring',
  'Rewriting',
  'Synthesizing',
  'Tuning',
  'Unfolding',
  'Vectorizing',
  'Warping',
  'Flawrating',
  'Overclocking',
  'Threading',
  'Spawning',
  'Hacking',
  'Shipping',
  'Polishing',
  'Sharpening',
  'Loading',
]
