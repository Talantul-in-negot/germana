import { useEffect, useState } from 'react'
import type { AnimalMood } from '../art'

export type Verdict = 'correct' | 'wrong' | null
/** How long the animal stays happy after a correct answer. */
export const HAPPY_MS = 1200

/** Pure: the mood that goes with a verdict, `happy` only while `fresh`. */
export function moodFor(verdict: Verdict, fresh: boolean): AnimalMood {
  if (verdict === 'wrong') return 'encourage'
  return verdict === 'correct' && fresh ? 'happy' : 'idle'
}

/** Animal mood for the latest verdict: correct = happy for ~1.2 s then idle, wrong = encourage until the next question. */
export function useReactionMood(verdict: Verdict): AnimalMood {
  const [fresh, setFresh] = useState(true)
  useEffect(() => {
    setFresh(true)
    if (verdict !== 'correct') return
    const id = setTimeout(() => setFresh(false), HAPPY_MS)
    return () => clearTimeout(id)
  }, [verdict])
  return moodFor(verdict, fresh)
}
