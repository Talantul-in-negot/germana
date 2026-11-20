/** Orchestration: finishing a lesson applies SRS, XP, streak, hearts, session log and achievements atomically. */
import {
  ACHIEVEMENTS, MAX_HEARTS, PERFECT_BONUS_XP, advanceStreak, crownFor, newlyUnlocked, unitMastery, xpForAnswer,
  type AchievementDef, type AchievementStats, type StreakUpdate,
} from '../core/gamification'
import { uid } from '../core/id'
import type { LessonMode, LessonResultItem } from '../core/lesson'
import { applyAnswer, dayKey } from '../core/srs'
import type { Level, Profile, SessionLog, Word } from '../core/types'
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
  const levelOf = new Map(progress.map((p) => [p.wordId, p.level]))
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
    masteredWords: progress.filter((p) => p.level === 5).length,
    learnedWords: progress.filter((p) => p.level >= 1).length,
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
      const prev = progressOrNew(state, input.profileId, r.wordId)
      if (!firstLevel.has(r.wordId)) firstLevel.set(r.wordId, prev.level)
      const out = applyAnswer(prev, {
        correct: r.correct,
        type: r.type,
        ...(r.quality ? { quality: r.quality } : {}),
        now: input.now,
        sessionId: input.sessionId,
      })
      state.set(r.wordId, out.progress)
      xp += xpForAnswer(r.type, r.correct, r.quality)
    }
    const correct = input.results.filter((r) => r.correct).length
    const accuracy = input.results.length ? correct / input.results.length : 1
    const perfect = input.results.length >= 5 && correct === input.results.length
    const bonusXp = perfect ? PERFECT_BONUS_XP : 0

    const levelUps: LevelChange[] = []
    for (const [wordId, p] of state) {
      const from = firstLevel.get(wordId) ?? 0
      if (p.level > from) levelUps.push({ wordId, term: words.get(wordId)?.term ?? '', from, to: p.level })
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
