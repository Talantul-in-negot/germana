import { describe, expect, it } from 'vitest'
import {
  availableTypes, buildExercise, chooseType, evaluateChoice, evaluateMatch, evaluateSentence, evaluateSpoken,
  evaluateTyped, hasMaskableExample, hasSentence, maskTerm, tokenize, type BuildContext, type ChoiceExercise,
  type MatchExercise, type SentenceExercise, type TypeExercise,
} from '../src/core/exercises'
import { seededRng, shuffle, uid } from '../src/core/id'
import {
  countDue, current, isFinished, planLesson, progressRatio, selectLessonWords, submitResult, summarize,
} from '../src/core/lesson'
import { BAND_TYPES, DAY_MS, applyAnswer, newProgress } from '../src/core/srs'
import type { ExerciseType, Word, WordProgress } from '../src/core/types'

const WORDS: Word[] = Array.from({ length: 30 }, (_, i) => ({
  id: 'w' + i,
  deckId: 'd',
  unitIndex: Math.floor(i / 10),
  order: i,
  term: 'term' + i,
  translations: ['tr' + i, 'alt' + i],
  tags: [],
  ...(i % 2 === 0 ? { example: `I really like term${i} very much` } : {}),
}))

let counter = 0
const mkCtx = (seed = 1): BuildContext => ({ deckWords: WORDS, rng: seededRng(seed), newId: () => 'e' + counter++ })
const NOW = new Date(2026, 0, 10, 12).getTime()

describe('id helpers', () => {
  it('uid is unique and shuffle keeps elements', () => {
    expect(uid()).not.toBe(uid())
    const s = shuffle([1, 2, 3, 4, 5], seededRng(3))
    expect([...s].sort()).toEqual([1, 2, 3, 4, 5])
  })
  it('seededRng is deterministic', () => {
    expect(seededRng(5)()).toBe(seededRng(5)())
  })
})

describe('masking & availability', () => {
  it('masks whole words only, case-insensitively', () => {
    expect(maskTerm('The House is big', 'house')).toBe('The _____ is big')
    expect(maskTerm('Housework is hard', 'house')).toBeNull()
    expect(maskTerm('a (b+c) d', '(b+c)')).toBe('a _____ d')
  })
  it('fill_blank/sentence need an example', () => {
    const bare = WORDS[1] as Word
    const ex = WORDS[0] as Word
    expect(hasMaskableExample(bare)).toBe(false)
    expect(hasMaskableExample(ex)).toBe(true)
    expect(hasSentence(bare)).toBe(false)
    expect(hasSentence(ex)).toBe(true)
    expect(availableTypes(bare, 30, false).has('fill_blank')).toBe(false)
    expect(availableTypes(bare, 30, false).has('sentence_build')).toBe(false)
    expect(availableTypes(ex, 30, false).has('fill_blank')).toBe(true)
    expect(availableTypes(ex, 2, false).has('match')).toBe(false)
    expect(availableTypes(ex, 30, true).has('speak')).toBe(true)
    expect(availableTypes(ex, 30, false).has('speak')).toBe(false)
  })
})

describe('chooseType follows the mastery band', () => {
  const rng = seededRng(9)
  const ex = WORDS[0] as Word
  it.each([
    [0, 'recognition'],
    [1, 'recognition'],
    [2, 'recall'],
    [3, 'recall'],
    [4, 'production'],
    [5, 'production'],
  ] as const)('level %i -> %s', (level, band) => {
    for (let i = 0; i < 40; i++) {
      const t = chooseType(ex, level, { deckSize: 30, speakEnabled: true, rng })
      expect(BAND_TYPES[band]).toContain(t)
    }
  })
  it('falls back inside the band, then to neighbouring bands', () => {
    const bare = WORDS[1] as Word
    for (let i = 0; i < 20; i++) {
      expect(chooseType(bare, 2, { deckSize: 30, speakEnabled: false, rng })).toBe('mc_l1_l2')
    }
    // production without speaking: still typing
    for (let i = 0; i < 20; i++) {
      expect(['type_l1_l2', 'listen_type']).toContain(chooseType(bare, 5, { deckSize: 30, speakEnabled: false, rng }))
    }
  })
  it('avoids repeating the last type when possible', () => {
    for (let i = 0; i < 30; i++) {
      expect(chooseType(ex, 0, { deckSize: 30, speakEnabled: false, rng }, 'mc_l2_l1')).not.toBe('mc_l2_l1')
    }
  })
})

describe('buildExercise', () => {
  const w = WORDS[0] as Word
  it('mc_l2_l1: 4 options, correct translation present, distractors from the deck', () => {
    const e = buildExercise(w, 'mc_l2_l1', mkCtx()) as ChoiceExercise
    expect(e.options).toHaveLength(4)
    expect(new Set(e.options).size).toBe(4)
    expect(w.translations).toContain(e.options[e.answerIndex])
    expect(evaluateChoice(e, e.answerIndex).correct).toBe(true)
    expect(evaluateChoice(e, (e.answerIndex + 1) % 4).correct).toBe(false)
  })
  it('mc_l1_l2 and listen_choose use terms as options', () => {
    const a = buildExercise(w, 'mc_l1_l2', mkCtx()) as ChoiceExercise
    expect(a.options[a.answerIndex]).toBe(w.term)
    const b = buildExercise(w, 'listen_choose', mkCtx()) as ChoiceExercise
    expect(b.speak).toBe(w.term)
    expect(b.options[b.answerIndex]).toBe(w.term)
  })
  it('fill_blank masks the term; falls back without example', () => {
    const f = buildExercise(w, 'fill_blank', mkCtx()) as ChoiceExercise
    expect(f.sentence).toContain('_____')
    expect(f.sentence).not.toContain(w.term)
    expect(buildExercise(WORDS[1] as Word, 'fill_blank', mkCtx()).type).toBe('mc_l1_l2')
  })
  it('match: 5 pairs including the target', () => {
    const m = buildExercise(w, 'match', mkCtx()) as MatchExercise
    expect(m.pairs).toHaveLength(5)
    expect(m.pairs.some((p) => p.wordId === w.id)).toBe(true)
    expect(evaluateMatch(m, 0).correct).toBe(true)
    expect(evaluateMatch(m, 2).correct).toBe(false)
    expect(evaluateMatch(m, 0).expected).toContain(w.term)
  })
  it('typed exercises check tolerantly', () => {
    const t = buildExercise(w, 'type_l1_l2', mkCtx()) as TypeExercise
    expect(evaluateTyped(t, 'TERM0').quality).toBe('exact')
    expect(evaluateTyped(t, 'xyz').correct).toBe(false)
    const l = buildExercise(w, 'listen_type', mkCtx()) as TypeExercise
    expect(l.speak).toBe(w.term)
  })
  it('speak picks the best of several alternatives', () => {
    const s = buildExercise(w, 'speak', mkCtx()) as TypeExercise
    expect(evaluateSpoken(s, ['tirm0', 'term0']).quality).toBe('exact')
    expect(evaluateSpoken(s, ['tirm0']).quality).toBe('typo')
    expect(evaluateSpoken(s, []).correct).toBe(false)
    expect(evaluateSpoken(s, ['banana']).correct).toBe(false)
  })
  it('sentence_build: shuffled bank, order-checked, falls back without example', () => {
    const s = buildExercise(w, 'sentence_build', mkCtx()) as SentenceExercise
    expect([...s.bank].sort()).toEqual([...s.solution].sort())
    expect(evaluateSentence(s, s.solution).correct).toBe(true)
    expect(evaluateSentence(s, [...s.solution].reverse()).correct).toBe(false)
    expect(evaluateSentence(s, s.solution.slice(1)).correct).toBe(false)
    expect(buildExercise(WORDS[1] as Word, 'sentence_build', mkCtx()).type).toBe('type_l1_l2')
    expect(tokenize(' a  b ')).toEqual(['a', 'b'])
  })
  it('tiny decks still give a usable choice exercise', () => {
    const ctx = { ...mkCtx(), deckWords: WORDS.slice(0, 2) }
    const e = buildExercise(w, 'mc_l2_l1', ctx) as ChoiceExercise
    expect(e.options.length).toBeGreaterThanOrEqual(2)
  })
})

describe('selectLessonWords', () => {
  const prog = (levels: Record<string, number>, dueDays = -1): Map<string, WordProgress> => {
    const m = new Map<string, WordProgress>()
    for (const [id, level] of Object.entries(levels)) {
      m.set(id, {
        ...newProgress('p', id),
        level: level as WordProgress['level'],
        lastSeenAt: NOW - 2 * DAY_MS,
        dueAt: NOW + dueDays * DAY_MS,
        interval: 1,
      })
    }
    return m
  }
  const cfg = { mode: 'unit' as const, size: 10, newRatio: 0.3, unitIndex: 0 }

  it('first lesson of a unit is all new words of that unit', () => {
    const r = selectLessonWords(WORDS, new Map(), NOW, cfg, seededRng(1))
    expect(r.wordIds).toHaveLength(10)
    expect(r.newIds).toHaveLength(10)
    expect(r.wordIds.every((id) => WORDS.find((w) => w.id === id)?.unitIndex === 0)).toBe(true)
  })

  it('mixes ~30% new / ~70% review with enough learned words', () => {
    const levels: Record<string, number> = {}
    for (let i = 0; i < 20; i++) levels['w' + i] = 2
    const r = selectLessonWords(WORDS, prog(levels), NOW, { ...cfg, unitIndex: 2 }, seededRng(2))
    expect(r.newIds).toHaveLength(3)
    expect(r.wordIds).toHaveLength(10)
    expect(r.newIds.every((id) => (WORDS.find((w) => w.id === id) as Word).unitIndex === 2)).toBe(true)
  })

  it('prioritises due and weak words in the review pool', () => {
    const base: Record<string, number> = {}
    for (let i = 0; i < 20; i++) base['w' + i] = 3
    const m = prog(base, 5) // none due
    const due = m.get('w15') as WordProgress
    m.set('w15', { ...due, dueAt: NOW - 3 * DAY_MS })
    const r = selectLessonWords(WORDS, m, NOW, { mode: 'review', size: 5, newRatio: 0.3 }, seededRng(3))
    expect(r.newIds).toHaveLength(0)
    expect(r.wordIds).toContain('w15')
  })

  it('weak mode picks the lowest-strength words and no new ones', () => {
    const base: Record<string, number> = {}
    for (let i = 0; i < 12; i++) base['w' + i] = 4
    base.w3 = 1
    base.w7 = 1
    const r = selectLessonWords(WORDS, prog(base, 5), NOW, { mode: 'weak', size: 4, newRatio: 0.3 }, seededRng(4))
    expect(r.newIds).toEqual([])
    expect(r.wordIds).toContain('w3')
    expect(r.wordIds).toContain('w7')
  })

  it('backfills with reviews when the unit has no unseen words left', () => {
    const levels: Record<string, number> = {}
    for (let i = 0; i < 30; i++) levels['w' + i] = 2
    const r = selectLessonWords(WORDS, prog(levels), NOW, cfg, seededRng(5))
    expect(r.newIds).toHaveLength(0)
    expect(r.wordIds).toHaveLength(10)
  })

  it('works when the deck has fewer words than the lesson size', () => {
    const r = selectLessonWords(WORDS.slice(0, 4), new Map(), NOW, { ...cfg }, seededRng(6))
    expect(r.wordIds).toHaveLength(4)
  })
})

describe('lesson runtime', () => {
  const plan = (n: number, level = 0) => {
    const ctx = mkCtx(11)
    const words = WORDS.slice(0, n)
    return { ctx, rt: planLesson(words, () => level, WORDS, ctx, false, 12) }
  }

  it('plans 10–15 exercises, also for tiny word sets (by cycling words)', () => {
    expect(plan(12).rt.queue.length).toBe(12)
    expect(plan(3).rt.queue.length).toBeGreaterThanOrEqual(10)
    expect(plan(3).rt.queue.length).toBeLessThanOrEqual(15)
    expect(plan(0).rt.queue).toEqual([])
  })

  it('exercise types follow each word level band', () => {
    const { rt } = plan(10, 4)
    for (const e of rt.queue) expect(BAND_TYPES.production).toContain(e.type as ExerciseType)
  })

  it('re-queues wrong answers later in the same lesson until answered correctly', () => {
    const { ctx, rt } = plan(10)
    const first = current(rt)!
    const word = WORDS.find((w) => w.id === first.wordId)!
    const after = submitResult(rt, { wordId: word.id, type: first.type, correct: false }, word, ctx, false)
    expect(after.queue.length).toBe(rt.queue.length + 1)
    expect(after.requeued).toBe(1)
    const retryIndex = after.queue.findIndex((e, i) => i > after.cursor - 1 && e.wordId === word.id)
    expect(retryIndex).toBeGreaterThan(0)
    expect(retryIndex).toBeLessThanOrEqual(after.cursor + 3)
    expect(after.queue[retryIndex]!.type).not.toBe('match')
    expect(progressRatio(after)).toBeLessThan(1)
  })

  it('finishes after all exercises are answered correctly', () => {
    const { ctx, rt: start } = plan(10)
    let rt = start
    let guard = 0
    while (!isFinished(rt) && guard++ < 100) {
      const e = current(rt)!
      const w = WORDS.find((x) => x.id === e.wordId)!
      rt = submitResult(rt, { wordId: w.id, type: e.type, correct: true }, w, ctx, false)
    }
    expect(isFinished(rt)).toBe(true)
    expect(current(rt)).toBeUndefined()
    expect(progressRatio(rt)).toBe(1)
    expect(summarize(rt.results)).toMatchObject({ perfect: true, accuracy: 1 })
  })

  it('summarize computes accuracy', () => {
    const s = summarize([
      { wordId: 'a', type: 'mc_l2_l1', correct: true },
      { wordId: 'b', type: 'mc_l2_l1', correct: false },
    ])
    expect(s).toEqual({ total: 2, correct: 1, accuracy: 0.5, perfect: false })
    expect(summarize([]).accuracy).toBe(1)
    expect(summarize([]).perfect).toBe(false)
    expect(progressRatio({ queue: [], cursor: 0, results: [], requeued: 0, lastType: {} })).toBe(1)
  })

  it('countDue counts only due words', () => {
    const a = applyAnswer(newProgress('p', 'a'), { correct: true, type: 'mc_l2_l1', now: NOW, sessionId: 's' }).progress
    expect(countDue([a, newProgress('p', 'b')], NOW)).toBe(0)
    expect(countDue([a], NOW + 2 * DAY_MS)).toBe(1)
  })
})
