import { useEffect, useState } from 'react'
import {
  type FlawraAILimits,
  currentLimits,
  statusListeners,
} from './flawraAiLimits.js'

export function useFlawraAiLimits(): FlawraAILimits {
  const [limits, setLimits] = useState<FlawraAILimits>({ ...currentLimits })

  useEffect(() => {
    const listener = (newLimits: FlawraAILimits) => {
      setLimits({ ...newLimits })
    }
    statusListeners.add(listener)

    return () => {
      statusListeners.delete(listener)
    }
  }, [])

  return limits
}
