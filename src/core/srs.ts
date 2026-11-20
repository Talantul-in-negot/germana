/**
 * Mastery / spaced-repetition model. Pure and framework-free.
 *
 * Levels: 0 New · 1 Seen · 2 Learning · 3 Familiar · 4 Strong · 5 Mastered
 *
 * Rules (see README "Mastery rules"):
 *  - first exposure moves 0 -> 1 (no gating: it only means "seen");
 *  - every later level needs weighted credit AND credit from >= 2 distinct sessions;
 *  - 4 -> 5 additionally needs credit on >= 2 distinct calendar days, so a word
 *    can never be Mastered within a single day of practice;
 *  - wrong answers lower ease, remove some credit and may drop the level by one;
 *  - strength (0-100) decays after `dueAt`; the level never drops from time alone.
 */
import type { ExerciseType, Level, Quality, SkillProgress, SubSkill, WordProgress, Word } from './types'

export const DAY_MS = 86_400_000
export const MAX_LEVEL: Level = 5
export const MIN_EASE = 1.3
export const MAX_EASE = 3.0
export const START_EASE = 2.3

/** Harder exercise => bigger weight => counts more (credit and XP). */
export const EXERCISE_WEIGHT: Record<ExerciseType, number> = {
  match: 0.8,
  mc_l2_l1: 1.0,
  listen_choose: 1.0,
  mc_l1_l2: 1.5,
  fill_blank: 1.8,
  sentence_build: 1.8,
  speak: 2.0,
  type_l1_l2: 2.5,
  listen_type: 2.5,
  type_l2_l1: 2.0,
  article: 1.2,
  plural_choice: 1.2,
  plural_type: 2.0,
  verb_forms: 2.2,
  separable: 2.0,
  context_choice: 1.5,
  context_listen: 1.5,
  match_qa: 1.0,
  num_listen_digits: 2.2,
  num_digits_to_word: 2.5,
  num_word_to_digits: 1.2,
  num_arith: 2.5,
  seq_order: 1.8,
  seq_neighbor: 1.5,
  seq_neighbor_type: 2.2,
  fill_prep: 1.5,
  listen_ro: 1.0,
  month_season: 1.5,
  season_months: 1.8,
  gender_pairs: 1.0,
  collective: 1.5,
  possessive: 1.5,
  conj_dropdown: 1.2,
  conj_dropdown_all: 2.0,
  conj_typing: 2.5,
  verb_dropdown: 1.5,
  verb_pronoun: 1.2,
  verb_pronoun_type: 2.5,
  verb_endings: 1.0,
  verb_listen_blank: 1.5,
  verb_sentence_build: 1.8,
}

/** Credit needed to leave level N (index = current level 1..4). */
export const LEVEL_UP_CREDIT: Record<number, number> = { 1: 2, 2: 3, 3: 4.5, 4: 6 }

/** Strength ceiling per level while the word is not overdue. */
export const LEVEL_STRENGTH: readonly number[] = [0, 30, 50, 70, 88, 100]

export const LEVEL_KEYS = ['new', 'seen', 'learning', 'familiar', 'strong', 'mastered'] as const

export type Band = 'recognition' | 'recall' | 'production'

export const BAND_TYPES: Record<Band, ExerciseType[]> = {
  recognition: ['mc_l2_l1', 'match', 'listen_choose', 'match_qa'],
  recall: ['mc_l1_l2', 'fill_blank', 'sentence_build', 'context_choice', 'context_listen'],
  production: ['type_l1_l2', 'listen_type', 'speak'],
}

export function bandForLevel(level: number): Band {
  if (level <= 1) return 'recognition'
  if (level <= 3) return 'recall'
  return 'production'
}

export function exerciseWeight(type: ExerciseType): number {
  return EXERCISE_WEIGHT[type]
}

/** Local calendar day key YYYY-MM-DD. */
export function dayKey(ts: number): string {
  const d = new Date(ts)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function newProgress(profileId: string, wordId: string): WordProgress {
  return {
    profileId,
    wordId,
    level: 0,
    strength: 0,
    interval: 0,
    ease: START_EASE,
    dueAt: 0,
    lastSeenAt: 0,
    correctStreak: 0,
    lapses: 0,
    consecutiveWrong: 0,
    levelCredit: 0,
    creditSessions: [],
    creditDays: [],
    lastSessionId: null,
    lapseSessionId: null,
    statsByExerciseType: {},
  }
}

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n))

/** Current strength 0-100. Decays once `dueAt` has passed. Never touches the level. */
export function strengthAt(p: WordProgress, now: number): number {
  if (p.level === 0 || p.lastSeenAt === 0) return 0
  const base = LEVEL_STRENGTH[p.level] ?? 0
  const lapsePenalty = p.consecutiveWrong > 0 ? 0.6 : 1
  if (now <= p.dueAt) {
    const span = Math.max(p.dueAt - p.lastSeenAt, 1)
    const frac = clamp((now - p.lastSeenAt) / span, 0, 1)
    return Math.round(base * (1 - 0.1 * frac) * lapsePenalty)
  }
  const overdueDays = (now - p.dueAt) / DAY_MS
  const halfLife = Math.max(p.interval, 1)
  return Math.round(base * 0.9 * Math.pow(2, -overdueDays / halfLife) * lapsePenalty)
}

export function isDue(p: WordProgress, now: number): boolean {
  if (p.level > 0 && p.lastSeenAt > 0 && now >= p.dueAt) return true
  const due = (s: { level: number; lastSeenAt: number; dueAt: number } | undefined): boolean => !!s && s.level > 0 && s.lastSeenAt > 0 && now >= s.dueAt
  return Object.values(p.skills ?? {}).some(due) || (p.persons ?? []).some(due)
}

export function needsPractice(p: WordProgress, now: number): boolean {
  return p.level > 0 && (isDue(p, now) || wordStrengthAt(p, now) < 50)
}

export interface AnswerInput {
  correct: boolean
  type: ExerciseType
  /** Only meaningful for typed answers. A typo/diacritics hit is `correct: true` but weighted lower. */
  quality?: Quality
  now: number
  /** id of the lesson/session the answer belongs to */
  sessionId: string
}

export interface AnswerOutcome {
  progress: WordProgress
  previousLevel: Level
  leveledUp: boolean
  leveledDown: boolean
}

function addUnique(list: string[], v: string): string[] {
  return list.includes(v) ? list : [...list, v]
}

function qualityMultiplier(q: Quality | undefined): number {
  if (q === 'typo') return 0.5
  if (q === 'diacritics') return 0.9
  return 1
}

/** Apply one answer to a word's progress. Returns a new object; input is not mutated. */
export function applyAnswer(prev: WordProgress, a: AnswerInput): AnswerOutcome {
  const p: WordProgress = {
    ...prev,
    creditSessions: [...prev.creditSessions],
    creditDays: [...prev.creditDays],
    statsByExerciseType: { ...prev.statsByExerciseType },
  }
  const previousLevel = prev.level
  const weight = exerciseWeight(a.type)
  const firstInSession = prev.lastSessionId !== a.sessionId
  const today = dayKey(a.now)

  const stats = { ...(p.statsByExerciseType[a.type] ?? { correct: 0, wrong: 0 }) }
  if (a.correct) stats.correct += 1
  else stats.wrong += 1
  p.statsByExerciseType[a.type] = stats

  p.lastSeenAt = a.now
  p.lastSessionId = a.sessionId

  let leveledUp = false
  let leveledDown = false

  if (a.correct) {
    p.correctStreak += 1
    p.consecutiveWrong = 0
    p.levelCredit += weight * qualityMultiplier(a.quality)
    p.creditSessions = addUnique(p.creditSessions, a.sessionId)
    p.creditDays = addUnique(p.creditDays, today)
    if (a.quality !== 'typo') p.ease = Math.min(MAX_EASE, p.ease + 0.03 * weight)

    if (firstInSession) {
      let next: number
      if (p.interval < 1) next = 1
      else if (p.interval < 3) next = 3
      else next = Math.max(p.interval + 1, Math.round(p.interval * p.ease))
      if (a.quality === 'typo') next = Math.max(1, Math.round(next * 0.7))
      p.interval = next
      p.dueAt = a.now + next * DAY_MS
    }
  } else {
    p.correctStreak = 0
    p.consecutiveWrong += 1
    p.ease = Math.max(MIN_EASE, p.ease - 0.2)
    if (p.lapseSessionId !== a.sessionId) {
      p.lapses += 1
      p.lapseSessionId = a.sessionId
    }
    p.interval = Math.max(0.5, Math.round(p.interval * 0.25 * 10) / 10)
    p.dueAt = a.now + p.interval * DAY_MS
    p.levelCredit = Math.max(0, p.levelCredit - 1)
  }

  if (p.level === 0) {
    // First exposure only means "seen"; credit earned now is kept.
    p.level = 1
    leveledUp = true
  } else if (a.correct && p.level < MAX_LEVEL) {
    const need = LEVEL_UP_CREDIT[p.level] ?? Infinity
    const sessionsOk = p.creditSessions.length >= 2
    const daysOk = p.level < 4 || p.creditDays.length >= 2
    if (p.levelCredit >= need && sessionsOk && daysOk) {
      p.level = (p.level + 1) as Level
      p.levelCredit = 0
      p.creditSessions = []
      p.creditDays = []
      leveledUp = true
    }
  } else if (!a.correct && p.level >= 2 && p.consecutiveWrong >= 2) {
    p.level = (p.level - 1) as Level
    p.levelCredit = 0
    p.creditSessions = []
    p.creditDays = []
    p.consecutiveWrong = 0
    leveledDown = true
  }

  p.strength = strengthAt(p, a.now)
  return { progress: p, previousLevel, leveledUp, leveledDown }
}

/** Overall accuracy of a word across all exercise types, 0-1 (null if never answered). */
export function accuracyOf(p: WordProgress): number | null {
  let c = 0
  let w = 0
  for (const s of Object.values(p.statsByExerciseType)) {
    if (!s) continue
    c += s.correct
    w += s.wrong
  }
  return c + w === 0 ? null : c / (c + w)
}

/** Lesson-selection priority: overdue words first, then the weakest. Higher = more urgent. */
export function reviewPriority(p: WordProgress, now: number): number {
  const s = wordStrengthAt(p, now)
  const overdue = isDue(p, now) ? 100 + Math.min((now - p.dueAt) / DAY_MS, 60) : 0
  return overdue + (100 - s)
}


// ---------------------------------------------------------------------------
// Sub-skills (meaning / gender / plural / forms)
// ---------------------------------------------------------------------------

type ExtraSkill = Exclude<SubSkill, 'meaning'>

/** Which extra sub-skills a word needs besides its meaning. */
export function requiredSkills(w: Pick<Word, 'type' | 'gender' | 'plural' | 'pluralOnly' | 'verb'> & { tags?: string[] }): ExtraSkill[] {
  const out: ExtraSkill[] = []
  if (w.type === 'noun' && w.gender) {
    // weekdays, months and seasons are all `der`: one info card instead of an article drill
    const allDer = (w.tags ?? []).some((t) => t === 'wochentage' || t === 'monate' || t === 'jahreszeiten')
    if (!allDer) out.push('gender') // (Pl.) nouns: meaning + article only (always `die`)
    if (w.plural && !w.pluralOnly) out.push('plural')
  }
  if (w.type === 'verb' && w.verb && (w.verb.present3sg || w.verb.praeteritum || w.verb.perfekt)) out.push('forms')
  return out
}

/** A word can only be as strong as its weakest required sub-skill allows: cap = skill level + 2. */
export const SKILL_CAP_MARGIN = 2

export function skillLevel(p: WordProgress, skill: SubSkill): number {
  if (skill === 'meaning') return p.level
  if (skill === 'forms' && p.persons) return formsLevel(p)
  return p.skills?.[skill]?.level ?? 0
}

/** Forms level of a present-tense verb: the average level of its 6 persons, rounded down. */
export function formsLevel(p: WordProgress): number {
  const ps = p.persons ?? []
  if (ps.length === 0) return p.skills?.forms?.level ?? 0
  const sum = [0, 1, 2, 3, 4, 5].reduce((a, i) => a + (ps[i]?.level ?? 0), 0)
  return Math.floor(sum / 6)
}

/** Level shown in the UI and used for exercise bands: meaning level capped by required sub-skills. */
export function effectiveLevel(p: WordProgress): Level {
  let lv: number = p.level
  for (const s of p.required ?? []) lv = Math.min(lv, skillLevel(p, s) + SKILL_CAP_MARGIN)
  return Math.max(0, lv) as Level
}

function asWordProgress(base: WordProgress, st: SkillProgress | undefined): WordProgress {
  const fresh = newProgress(base.profileId, base.wordId)
  return { ...fresh, ...(st ?? {}), skills: undefined, required: undefined, persons: undefined } as WordProgress
}

/** Apply one answer to a sub-skill (same SRS rules as `applyAnswer`). */
export function applySkillAnswer(prev: WordProgress, skill: SubSkill, a: AnswerInput): AnswerOutcome {
  if (skill === 'meaning') {
    const out = applyAnswer(prev, a)
    return { ...out, progress: { ...out.progress, skills: prev.skills, required: prev.required } }
  }
  const cur = asWordProgress(prev, prev.skills?.[skill])
  const out = applyAnswer(cur, a)
  const state = stripState(out.progress)
  const progress: WordProgress = { ...prev, skills: { ...(prev.skills ?? {}), [skill]: state } }
  return { progress, previousLevel: out.previousLevel, leveledUp: out.leveledUp, leveledDown: out.leveledDown }
}

/** Strength of each person (0-100); never-practised persons count 0. */
export function personStrengths(p: WordProgress, now: number): number[] {
  return [0, 1, 2, 3, 4, 5].map((i) => {
    const st = p.persons?.[i]
    return st ? strengthAt(asWordProgress(p, st), now) : 0
  })
}

/** Apply one answer to one person of a present-tense verb (own SRS state per person). */
export function applyPersonAnswer(prev: WordProgress, person: number, a: AnswerInput): AnswerOutcome {
  const persons = (prev.persons ? prev.persons.slice() : []) as SkillProgress[]
  while (persons.length < 6) persons.push(stripState(newProgress(prev.profileId, prev.wordId)))
  const out = applyAnswer(asWordProgress(prev, persons[person]), a)
  persons[person] = stripState(out.progress)
  return { progress: { ...prev, persons }, previousLevel: out.previousLevel, leveledUp: out.leveledUp, leveledDown: out.leveledDown }
}

function stripState(p: WordProgress): SkillProgress {
  const { skills: _s, required: _r, persons: _p, ...state } = p
  void _s
  void _r
  void _p
  return state
}

/** Strength of the word = weakest strength among practised required sub-skills. */
export function wordStrengthAt(p: WordProgress, now: number): number {
  let s = strengthAt(p, now)
  if (p.persons && (p.required ?? []).includes('forms')) {
    const ps = personStrengths(p, now)
    s = Math.min(s, Math.round(ps.reduce((a, b) => a + b, 0) / 6))
    return s
  }
  for (const k of p.required ?? []) {
    const st = p.skills?.[k]
    if (st && st.level > 0) s = Math.min(s, strengthAt(asWordProgress(p, st), now))
  }
  return s
}

/** Reset the review date of every sub-skill to `now` (failed words in the lesson test come back soon). */
export function dueNow(p: WordProgress, now: number): WordProgress {
  const skills: WordProgress['skills'] = {}
  for (const [k, v] of Object.entries(p.skills ?? {})) skills[k as ExtraSkill] = { ...(v as SkillProgress), dueAt: now }
  const persons = p.persons?.map((x) => ({ ...x, dueAt: now }))
  return { ...p, dueAt: now, skills, ...(persons ? { persons } : {}) }
}

/** Effective level of an optional progress record (0 when the word was never practised). */
export function levelOf(p: WordProgress | undefined): Level {
  return p ? effectiveLevel(p) : 0
}
