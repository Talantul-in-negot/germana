/** Lesson planning and runtime (queue with re-queueing of wrong answers). Pure. */
import { buildExercise, chooseType, type BuildContext, type Exercise } from './exercises'
import { shuffle } from './id'
import { isDue, reviewPriority, strengthAt } from './srs'
import type { ExerciseType, Quality, Word, WordProgress } from './types'

export type LessonMode = 'unit' | 'weak' | 'review'

export interface LessonConfig {
  mode: LessonMode
  /** exercises in the initial queue (10–15) */
  size: number
  newRatio: number
  unitIndex?: number
  speakEnabled: boolean
}

export const DEFAULT_LESSON: Omit<LessonConfig, 'mode' | 'speakEnabled'> = { size: 12, newRatio: 0.3 }

export interface LessonSelection {
  wordIds: string[]
  newIds: string[]
}

/** ~30% new words, ~70% review (due first, then weakest). Backfills when one pool is short. */
export function selectLessonWords(
  deckWords: Word[],
  progress: ReadonlyMap<string, WordProgress>,
  now: number,
  cfg: Pick<LessonConfig, 'mode' | 'size' | 'newRatio' | 'unitIndex'>,
  rng: () => number,
): LessonSelection {
  const seen = (w: Word): WordProgress | undefined => {
    const p = progress.get(w.id)
    return p && p.level > 0 ? p : undefined
  }
  const jitter = (): number => rng() * 0.01

  const learned = deckWords.filter((w) => seen(w))
  const unseen = deckWords
    .filter((w) => !seen(w))
    .filter((w) => cfg.mode !== 'unit' || cfg.unitIndex === undefined || w.unitIndex === cfg.unitIndex)
    .sort((a, b) => a.order - b.order)

  const score = (w: Word): number => {
    const p = progress.get(w.id) as WordProgress
    const boost = cfg.mode === 'unit' && w.unitIndex === cfg.unitIndex ? 20 : 0
    if (cfg.mode === 'weak') return 100 - strengthAt(p, now) + jitter()
    return reviewPriority(p, now) + boost + jitter()
  }
  const reviewPool = learned.sort((a, b) => score(b) - score(a))

  let nNew = cfg.mode === 'unit' ? Math.round(cfg.size * cfg.newRatio) : 0
  let nRev = cfg.size - nNew
  if (reviewPool.length < nRev) {
    nNew += nRev - reviewPool.length
    nRev = reviewPool.length
  }
  if (unseen.length < nNew) {
    nRev = Math.min(reviewPool.length, nRev + (nNew - unseen.length))
    nNew = unseen.length
  }
  const newWords = unseen.slice(0, nNew)
  const revWords = reviewPool.slice(0, nRev)
  return {
    wordIds: shuffle([...newWords, ...revWords], rng).map((w) => w.id),
    newIds: newWords.map((w) => w.id),
  }
}

export interface LessonResultItem {
  wordId: string
  type: ExerciseType
  correct: boolean
  quality?: Quality
}

export interface LessonRuntime {
  queue: Exercise[]
  cursor: number
  results: LessonResultItem[]
  /** count of re-queued retries */
  requeued: number
  /** types last used per word, to vary exercises */
  lastType: Record<string, ExerciseType>
}

const MIN_EXERCISES = 10

export function planLesson(
  words: Word[],
  levelOf: (wordId: string) => number,
  deckWords: Word[],
  ctxBase: Omit<BuildContext, 'deckWords'>,
  speakEnabled: boolean,
  size: number,
): LessonRuntime {
  const lastType: Record<string, ExerciseType> = {}
  const queue: Exercise[] = []
  const ctx: BuildContext = { ...ctxBase, deckWords }
  const target = Math.max(MIN_EXERCISES, Math.min(15, size))
  let guard = 0
  while (queue.length < target && words.length > 0 && guard++ < 4) {
    for (const w of words) {
      if (queue.length >= target) break
      const type = chooseType(w, levelOf(w.id), { deckSize: deckWords.length, speakEnabled, rng: ctx.rng }, lastType[w.id])
      lastType[w.id] = type
      queue.push(buildExercise(w, type, ctx))
    }
  }
  return { queue, cursor: 0, results: [], requeued: 0, lastType }
}

export function current(rt: LessonRuntime): Exercise | undefined {
  return rt.queue[rt.cursor]
}

export function isFinished(rt: LessonRuntime): boolean {
  return rt.cursor >= rt.queue.length
}

/** 0..1 progress of the initial queue (re-queued retries extend the bar slightly). */
export function progressRatio(rt: LessonRuntime): number {
  return rt.queue.length === 0 ? 1 : Math.min(1, rt.cursor / rt.queue.length)
}

/**
 * Record the result of the current exercise and advance. A wrong answer re-queues the word
 * (a new easy-ish exercise, a few steps later) until it is answered correctly.
 */
export function submitResult(
  rt: LessonRuntime,
  item: LessonResultItem,
  word: Word,
  ctx: BuildContext,
  speakEnabled: boolean,
): LessonRuntime {
  const queue = rt.queue.slice()
  let requeued = rt.requeued
  const lastType = { ...rt.lastType, [item.wordId]: item.type }
  if (!item.correct) {
    // retry with a recognition-level exercise so the learner sees the answer again and succeeds
    const retryType = chooseType(word, 0, { deckSize: ctx.deckWords.length, speakEnabled, rng: ctx.rng }, item.type)
    const ex = buildExercise(word, retryType === 'match' ? 'mc_l2_l1' : retryType, ctx)
    const at = Math.min(queue.length, rt.cursor + 1 + Math.min(3, queue.length - rt.cursor - 1))
    queue.splice(Math.max(at, rt.cursor + 1), 0, ex)
    requeued += 1
  }
  return { queue, cursor: rt.cursor + 1, results: [...rt.results, item], requeued, lastType }
}

export interface LessonSummary {
  total: number
  correct: number
  accuracy: number
  perfect: boolean
}

export function summarize(results: readonly LessonResultItem[]): LessonSummary {
  const total = results.length
  const correct = results.filter((r) => r.correct).length
  return { total, correct, accuracy: total ? correct / total : 1, perfect: total > 0 && correct === total }
}

/** Used by the lesson screen to show "due words" in the progress UI. */
export function countDue(progress: Iterable<WordProgress>, now: number): number {
  let n = 0
  for (const p of progress) if (isDue(p, now)) n++
  return n
}
