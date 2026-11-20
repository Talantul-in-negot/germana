/** Exercise generation + evaluation from a deck. Pure. */
import { checkAnswer, fold, normalize, type CheckResult } from './answer'
import { shuffle } from './id'
import { BAND_TYPES, bandForLevel, type Band } from './srs'
import type { ExerciseType, Quality, Word } from './types'

interface Base {
  id: string
  wordId: string
}

export interface ChoiceExercise extends Base {
  type: 'mc_l2_l1' | 'mc_l1_l2' | 'listen_choose' | 'fill_blank'
  prompt: string
  /** sentence with the word masked (fill_blank) */
  sentence?: string
  options: string[]
  answerIndex: number
  /** text to read aloud (L2) */
  speak?: string
}

export interface MatchExercise extends Base {
  type: 'match'
  /** `wordId` of each pair; the exercise's own wordId is the target */
  pairs: { wordId: string; left: string; right: string }[]
}

export interface TypeExercise extends Base {
  type: 'type_l1_l2' | 'listen_type' | 'speak'
  prompt: string
  accepted: string[]
  speak?: string
}

export interface SentenceExercise extends Base {
  type: 'sentence_build'
  prompt: string
  solution: string[]
  bank: string[]
  speak: string
}

export type Exercise = ChoiceExercise | MatchExercise | TypeExercise | SentenceExercise

export interface BuildContext {
  /** all words of the deck (for distractors / pairs) */
  deckWords: Word[]
  rng: () => number
  newId: () => string
}

export function hasMaskableExample(w: Word): boolean {
  return !!w.example && maskTerm(w.example, w.term) !== null
}

export function hasSentence(w: Word): boolean {
  return !!w.example && w.example.trim().split(/\s+/).length >= 3
}

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Replace the term in the sentence by "_____". null if the term does not occur. */
export function maskTerm(sentence: string, term: string): string | null {
  const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(term.trim())}(?![\\p{L}\\p{N}])`, 'iu')
  return re.test(sentence) ? sentence.replace(re, '_____') : null
}

export function availableTypes(w: Word, deckSize: number, speakEnabled: boolean): Set<ExerciseType> {
  const s = new Set<ExerciseType>(['mc_l2_l1', 'mc_l1_l2', 'listen_choose', 'type_l1_l2', 'listen_type'])
  if (deckSize >= 3) s.add('match')
  if (hasMaskableExample(w) && deckSize >= 3) s.add('fill_blank')
  if (hasSentence(w)) s.add('sentence_build')
  if (speakEnabled) s.add('speak')
  return s
}

const BAND_ORDER: Band[] = ['recognition', 'recall', 'production']

/**
 * Pick an exercise type matching the word's level band. Falls back inside the band,
 * then to the nearest other band (towards easier first). Avoids `lastType` when possible.
 */
export function chooseType(
  w: Word,
  level: number,
  ctx: { deckSize: number; speakEnabled: boolean; rng: () => number },
  lastType?: ExerciseType,
): ExerciseType {
  const avail = availableTypes(w, ctx.deckSize, ctx.speakEnabled)
  const band = bandForLevel(level)
  const idx = BAND_ORDER.indexOf(band)
  const order = [idx, idx - 1, idx + 1, idx - 2, idx + 2].filter((i) => i >= 0 && i < 3)
  for (const bi of order) {
    const types = BAND_TYPES[BAND_ORDER[bi] as Band].filter((t) => avail.has(t))
    if (!types.length) continue
    const fresh = types.filter((t) => t !== lastType)
    const pool = fresh.length ? fresh : types
    return pool[Math.floor(ctx.rng() * pool.length)] as ExerciseType
  }
  return 'mc_l2_l1'
}

const primary = (w: Word): string => w.translations[0] ?? ''

function pickTranslation(w: Word, rng: () => number): string {
  return w.translations[Math.floor(rng() * w.translations.length)] ?? ''
}

/** Distractor words: other words whose accepted answers do not overlap with the target's. */
function distractors(target: Word, pool: Word[], count: number, rng: () => number, key: (w: Word) => string[]): Word[] {
  const bad = new Set(key(target).map((x) => fold(x)))
  const out: Word[] = []
  const used = new Set<string>(bad)
  for (const w of shuffle(pool, rng)) {
    if (w.id === target.id) continue
    const ks = key(w).map((x) => fold(x))
    if (ks.some((k) => used.has(k))) continue
    ks.forEach((k) => used.add(k))
    out.push(w)
    if (out.length >= count) break
  }
  return out
}

function choice(
  base: Pick<ChoiceExercise, 'id' | 'wordId' | 'type' | 'prompt'> & Partial<ChoiceExercise>,
  correct: string,
  wrong: string[],
  rng: () => number,
): ChoiceExercise {
  const options = shuffle([correct, ...wrong], rng)
  return { ...base, options, answerIndex: options.indexOf(correct) }
}

export function tokenize(sentence: string): string[] {
  return sentence.trim().split(/\s+/).filter(Boolean)
}

export function buildExercise(w: Word, type: ExerciseType, ctx: BuildContext): Exercise {
  const { deckWords, rng } = ctx
  const id = ctx.newId()
  const base = { id, wordId: w.id }

  switch (type) {
    case 'mc_l2_l1': {
      const correct = pickTranslation(w, rng)
      const wrong = distractors(w, deckWords, 3, rng, (x) => x.translations).map(primary)
      return choice({ ...base, type, prompt: w.term, speak: w.term }, correct, wrong, rng)
    }
    case 'mc_l1_l2': {
      const wrong = distractors(w, deckWords, 3, rng, (x) => [x.term]).map((x) => x.term)
      return choice({ ...base, type, prompt: pickTranslation(w, rng) }, w.term, wrong, rng)
    }
    case 'listen_choose': {
      const wrong = distractors(w, deckWords, 3, rng, (x) => [x.term]).map((x) => x.term)
      return choice({ ...base, type, prompt: w.term, speak: w.term }, w.term, wrong, rng)
    }
    case 'fill_blank': {
      const masked = w.example ? maskTerm(w.example, w.term) : null
      if (!masked) return buildExercise(w, 'mc_l1_l2', ctx)
      const wrong = distractors(w, deckWords, 3, rng, (x) => [x.term]).map((x) => x.term)
      return choice({ ...base, type, prompt: primary(w), sentence: masked, speak: w.example as string }, w.term, wrong, rng)
    }
    case 'match': {
      const others = distractors(w, deckWords, 4, rng, (x) => [x.term, ...x.translations])
      const pairs = shuffle([w, ...others], rng).map((x) => ({ wordId: x.id, left: x.term, right: primary(x) }))
      return { ...base, type, pairs }
    }
    case 'type_l1_l2':
      return { ...base, type, prompt: primary(w), accepted: [w.term] }
    case 'listen_type':
      return { ...base, type, prompt: '', accepted: [w.term], speak: w.term }
    case 'speak':
      return { ...base, type, prompt: primary(w), accepted: [w.term] }
    case 'sentence_build': {
      if (!w.example || !hasSentence(w)) return buildExercise(w, 'type_l1_l2', ctx)
      const solution = tokenize(w.example)
      let bank = shuffle(solution, rng)
      for (let i = 0; i < 5 && bank.join(' ') === solution.join(' '); i++) bank = shuffle(solution, rng)
      return { ...base, type, prompt: `${w.term} = ${primary(w)}`, solution, bank, speak: w.example }
    }
  }
}

// ---------- evaluation ----------

export interface Outcome {
  correct: boolean
  quality?: Quality
  /** the answer to show when wrong / diacritics / typo */
  expected: string
  note?: 'diacritics' | 'typo'
}

export function evaluateChoice(ex: ChoiceExercise, index: number): Outcome {
  return { correct: index === ex.answerIndex, expected: ex.options[ex.answerIndex] ?? '' }
}

export function evaluateTyped(ex: TypeExercise, input: string): Outcome {
  return fromCheck(checkAnswer(input, ex.accepted))
}

/** `spoken` can hold several recognition alternatives; the best verdict wins. */
export function evaluateSpoken(ex: TypeExercise, spoken: string[]): Outcome {
  let best: CheckResult | null = null
  const rank = { correct: 0, diacritics: 1, typo: 2, wrong: 3 } as const
  for (const s of spoken) {
    const r = checkAnswer(s, ex.accepted)
    if (!best || rank[r.verdict] < rank[best.verdict]) best = r
  }
  return fromCheck(best ?? { verdict: 'wrong', expected: ex.accepted[0] ?? '' })
}

function fromCheck(r: CheckResult): Outcome {
  if (r.verdict === 'wrong') return { correct: false, expected: r.expected }
  if (r.verdict === 'correct') return { correct: true, quality: 'exact', expected: r.expected }
  return { correct: true, quality: r.verdict, note: r.verdict, expected: r.expected }
}

export function evaluateSentence(ex: SentenceExercise, built: string[]): Outcome {
  const ok = built.length === ex.solution.length && built.every((t, i) => normalize(t) === normalize(ex.solution[i] as string))
  return { correct: ok, expected: ex.solution.join(' ') }
}

export function evaluateMatch(ex: MatchExercise, targetMistakes: number): Outcome {
  const t = ex.pairs.find((p) => p.wordId === ex.wordId)
  return { correct: targetMistakes === 0, expected: t ? `${t.left} = ${t.right}` : '' }
}
