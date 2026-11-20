/** Orchestration: finishing a lesson applies SRS, XP, streak, hearts, session log and achievements atomically. */
import {
  ACHIEVEMENTS, MAX_HEARTS, PERFECT_BONUS_XP, advanceStreak, crownFor, newlyUnlocked, unitMastery, xpForAnswer,
  type AchievementDef, type AchievementStats, type StreakUpdate,
} from '../core/gamification'
import { uid } from '../core/id'
import type { LessonMode, LessonResultItem } from '../core/lesson'
import { markPassed } from '../core/conjugation'
import { applyPersonAnswer, applySkillAnswer, dayKey, dueNow, effectiveLevel, requiredSkills } from '../core/srs'
import type { Level, Profile, SessionLog, TestExtra, TestResult, TestWordResult, Word } from '../core/types'
import { db } from './db'
import { progressOrNew } from './repo'

export interface LevelChange {
  wordId: string
  term: string
  from: Level
  to: Level
}

export interface FinishInput {
  profileId: string
  deckId: string
  sessionId: string
  results: LessonResultItem[]
  startedAt: number
  now: number
  mode: LessonMode
  heartsLost: number
  /** XP lost for peeking at the conjugation card */
  xpPenalty?: number
  /** a Conjugare stage finished: record the pass date on the verb */
  conj?: { wordId: string; stage: 1 | 2 | 3; passed: boolean }
}

export interface FinishOutput {
  xp: number
  bonusXp: number
  accuracy: number
  durationSec: number
  perfect: boolean
  levelUps: LevelChange[]
  streak: StreakUpdate
  unlocked: AchievementDef[]
  goalReached: boolean
  todayXp: number
}

export function sumXpByDay(sessions: readonly SessionLog[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const s of sessions) m.set(s.date, (m.get(s.date) ?? 0) + s.xp)
  return m
}

export async function computeAchievementStats(profile: Profile): Promise<AchievementStats> {
  const [sessions, progress, decks, words] = await Promise.all([
    db.sessions.where('profileId').equals(profile.id).toArray(),
    db.progress.where('profileId').equals(profile.id).toArray(),
    db.decks.count(),
    db.words.toArray(),
  ])
  const levelOf = new Map(progress.map((p) => [p.wordId, effectiveLevel(p)]))
  const byUnit = new Map<string, number[]>()
  for (const w of words) {
    const k = `${w.deckId}#${w.unitIndex}`
    byUnit.set(k, [...(byUnit.get(k) ?? []), levelOf.get(w.id) ?? 0])
  }
  const goldUnits = [...byUnit.values()].filter((l) => crownFor(unitMastery(l)) === 3).length
  const goalDays = [...sumXpByDay(sessions).values()].filter((xp) => xp >= profile.dailyGoal).length
  return {
    lessons: sessions.length,
    perfectLessons: sessions.filter((s) => s.perfect).length,
    streak: profile.streak,
    xpTotal: profile.xpTotal,
    masteredWords: progress.filter((p) => effectiveLevel(p) === 5).length,
    learnedWords: progress.filter((p) => effectiveLevel(p) >= 1).length,
    decks,
    goldUnits,
    goalDays,
  }
}

export async function finishLesson(input: FinishInput): Promise<FinishOutput> {
  return db.transaction('rw', [db.progress, db.profiles, db.sessions, db.achievements, db.words, db.decks], async () => {
    const profile = (await db.profiles.get(input.profileId)) as Profile
    const wordIds = [...new Set(input.results.map((r) => r.wordId))]
    const words = new Map((await db.words.bulkGet(wordIds)).filter((w): w is Word => !!w).map((w) => [w.id, w]))
    const existing = new Map(
      (await db.progress.bulkGet(wordIds.map((w) => [input.profileId, w] as [string, string])))
        .filter((p): p is NonNullable<typeof p> => !!p)
        .map((p) => [p.wordId, p]),
    )
    const state = new Map(existing)
    const firstLevel = new Map<string, Level>()
    let xp = 0
    for (const r of input.results) {
      let cur = progressOrNew(state, input.profileId, r.wordId)
      const word = words.get(r.wordId)
      if (word) cur = { ...cur, required: requiredSkills(word) }
      if (!firstLevel.has(r.wordId)) firstLevel.set(r.wordId, effectiveLevel(cur))
      for (const c of r.credits ?? [{ skill: 'meaning' as const, correct: r.correct }]) {
        const a = { correct: c.correct, type: r.type, ...(r.quality ? { quality: r.quality } : {}), now: input.now, sessionId: input.sessionId }
        cur = c.person !== undefined ? applyPersonAnswer(cur, c.person, a).progress : applySkillAnswer(cur, c.skill, a).progress
      }
      state.set(r.wordId, cur)
      xp += xpForAnswer(r.type, r.correct, r.quality)
    }
    if (input.conj?.passed) {
      const target = state.get(input.conj.wordId) ?? progressOrNew(state, input.profileId, input.conj.wordId)
      state.set(input.conj.wordId, { ...target, conj: markPassed(target.conj, input.conj.stage, dayKey(input.now)) })
    }
    xp = Math.max(0, xp - (input.xpPenalty ?? 0))
    const correct = input.results.filter((r) => r.correct).length
    const accuracy = input.results.length ? correct / input.results.length : 1
    const perfect = input.results.length >= 5 && correct === input.results.length
    const bonusXp = perfect ? PERFECT_BONUS_XP : 0

    const levelUps: LevelChange[] = []
    for (const [wordId, p] of state) {
      const from = firstLevel.get(wordId) ?? 0
      const to = effectiveLevel(p)
      if (to > from) levelUps.push({ wordId, term: words.get(wordId)?.term ?? '', from, to })
    }

    const today = dayKey(input.now)
    const streak = advanceStreak(profile, today)
    const prevSessions = await db.sessions.where('profileId').equals(profile.id).toArray()
    const before = sumXpByDay(prevSessions).get(today) ?? 0
    const todayXp = before + xp + bonusXp

    const hearts = input.mode === 'review' ? MAX_HEARTS : Math.max(0, profile.hearts - input.heartsLost)
    const updated: Profile = {
      ...profile,
      xpTotal: profile.xpTotal + xp + bonusXp,
      streak: streak.streak,
      bestStreak: streak.bestStreak,
      streakFreezes: streak.streakFreezes,
      lastActiveDay: streak.lastActiveDay,
      hearts,
      heartsAt: hearts < profile.hearts || input.mode === 'review' ? input.now : profile.heartsAt,
    }
    const durationSec = Math.max(1, Math.round((input.now - input.startedAt) / 1000))
    const log: SessionLog = {
      id: input.sessionId, profileId: profile.id, date: today, ts: input.now, xp: xp + bonusXp, accuracy, durationSec,
      wordIds, deckId: input.deckId, perfect,
    }

    await db.progress.bulkPut([...state.values()])
    await db.profiles.put(updated)
    await db.sessions.put(log)

    const stats = await computeAchievementStats(updated)
    const have = new Set((await db.achievements.where('profileId').equals(profile.id).toArray()).map((a) => a.key))
    const unlocked = newlyUnlocked(stats, have)
    if (unlocked.length) {
      await db.achievements.bulkAdd(unlocked.map((a) => ({ id: uid(), profileId: profile.id, key: a.key, unlockedAt: input.now })))
    }

    return {
      xp, bonusXp, accuracy, durationSec, perfect, levelUps, streak, unlocked,
      goalReached: before < profile.dailyGoal && todayXp >= profile.dailyGoal,
      todayXp,
    }
  })
}

export { ACHIEVEMENTS }


// ---------------------------------------------------------------------------
// "Test lecție"
// ---------------------------------------------------------------------------

export const VERIFIED_AT = 0.9

/** A verb counts as correct in the lesson test with >= 5 of 6 persons right. */
export const personsOk = (ps: readonly { ok: boolean }[]): boolean => ps.filter((p) => p.ok).length >= 5

export interface FinishTestInput {
  profileId: string
  deckId: string
  words: TestWordResult[]
  extras?: TestExtra[]
  now: number
}

export function scoreTest(words: readonly TestWordResult[], extras: readonly TestExtra[] = []): { correct: number; total: number; score: number } {
  let correct = extras.filter((x) => x.ok).length
  let total = extras.length
  for (const w of words) {
    for (const d of [w.deToRo, w.roToDe, w.context]) {
      if (!d) continue
      total += 1
      if (d.ok) correct += 1
    }
    if (w.persons?.length) {
      total += 1
      if (personsOk(w.persons)) correct += 1
    }
  }
  return { correct, total, score: total ? correct / total : 0 }
}

/** Per-group score (numbers lessons: 0–10, 11–20 …). */
export function groupScores(words: readonly TestWordResult[]): { group: string; correct: number; total: number }[] {
  const m = new Map<string, { correct: number; total: number }>()
  for (const w of words) {
    if (!w.group) continue
    const g = m.get(w.group) ?? { correct: 0, total: 0 }
    for (const d of [w.deToRo, w.roToDe, w.context]) {
      if (!d) continue
      g.total += 1
      if (d.ok) g.correct += 1
    }
    if (w.persons?.length) {
      g.total += 1
      if (personsOk(w.persons)) g.correct += 1
    }
    m.set(w.group, g)
  }
  return [...m.entries()].map(([group, v]) => ({ group, ...v }))
}

/** Saves the attempt in the lesson's history; failed words come back in the next sessions. */
export async function finishTest(input: FinishTestInput): Promise<TestResult> {
  return db.transaction('rw', [db.tests, db.progress], async () => {
    const { correct, total, score } = scoreTest(input.words, input.extras ?? [])
    const result: TestResult = {
      id: uid(), profileId: input.profileId, deckId: input.deckId, ts: input.now, date: dayKey(input.now),
      score, total, correct, words: input.words, verified: score >= VERIFIED_AT,
      ...(input.extras?.length ? { extras: input.extras } : {}),
    }
    await db.tests.add(result)
    const failed = input.words.filter((w) => [w.deToRo, w.roToDe, w.context].some((d) => d && !d.ok) || (w.persons?.length ? !personsOk(w.persons) : false))
    const rows = (await db.progress.bulkGet(failed.map((w) => [input.profileId, w.wordId] as [string, string]))).filter(
      (p): p is NonNullable<typeof p> => !!p,
    )
    await db.progress.bulkPut(rows.map((p) => dueNow(p, input.now)))
    return result
  })
}

export function isVerified(tests: readonly TestResult[]): boolean {
  return tests.some((t) => t.verified)
}
