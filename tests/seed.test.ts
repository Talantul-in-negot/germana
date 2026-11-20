import { describe, expect, it } from 'vitest'
import { buildStageItems } from '../src/core/conjugation'
import { buildExercise, contextOf, hasMaskableExample } from '../src/core/exercises'
import { seededRng } from '../src/core/id'
import { parseWordList, rowToInput } from '../src/core/parser'
import type { Word } from '../src/core/types'
import { GERMAN_SEEDS } from '../src/data/seed'

const wordsOf = (text: string): Word[] =>
  parseWordList(text).rows.filter((r) => r.valid).map((r, i) => ({ id: `w${i}`, deckId: 'd', unitIndex: 0, order: i, ...rowToInput(r) }))

describe('shipped seed lessons', () => {
  it('contain only the supplied words, without example sentences', () => {
    const counts: Record<string, number> = { wfragen: 8, zahlen: 41, wochentage: 7, monate: 12, familie2: 16, verben: 10 }
    expect(GERMAN_SEEDS.map((s) => s.key).sort()).toEqual(Object.keys(counts).sort())
    for (const s of GERMAN_SEEDS) {
      const ws = wordsOf(s.text)
      expect(ws, s.key).toHaveLength(counts[s.key] as number)
      expect(ws.every((w) => !w.example), s.key).toBe(true)
    }
  })

  it('Conjugare stage 2 uses pronoun rows only when the verb has no sentence', () => {
    const verbs = wordsOf(GERMAN_SEEDS.find((s) => s.key === 'verben')!.text)
    const items = buildStageItems(verbs[2]!, verbs, 2, seededRng(1))
    expect(items).toHaveLength(12)
    expect(items.some((i) => i.kind === 'sentenceAll')).toBe(false)
  })

  it('a pasted example sentence still creates fill-in and context exercises', () => {
    const ws = wordsOf('Wo? ; Unde? ; ; Wo wohnst du? – In Timișoara.\nWer? ; Cine? ; ; Wer ist das? – Das ist Ana.\nWas? ; Ce? ; ; Was ist das? – Ein Buch.\nWie? ; Cum? ; ; Wie heißt du? – Ana.')
    const w = ws[0]!
    expect(hasMaskableExample(w)).toBe(true)
    expect(contextOf(w)).not.toBeNull()
    expect(buildExercise(w, 'fill_blank', { deckWords: ws, rng: seededRng(1), newId: () => 'x' }).type).toBe('fill_blank')
    expect(buildExercise(w, 'context_choice', { deckWords: ws, rng: seededRng(1), newId: () => 'y' }).type).toBe('context_choice')
  })
})
