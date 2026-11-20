/** XP, streak, hearts, crowns, achievements. Pure. */
import { exerciseWeight } from './srs'
import type { ExerciseType, Quality } from './types'

export const PERFECT_BONUS_XP = 10
export const MAX_HEARTS = 5
export const HEART_REFILL_MS = 20 * 60_000
export const MAX_FREEZES = 2
export const GOAL_CHOICES = [10, 20, 50] as const

export function xpForAnswer(type: ExerciseType, correct: boolean, quality?: Quality): number {
  if (!correct) return 0
  const base = Math.round(exerciseWeight(type) * 5)
  return quality === 'typo' ? Math.max(1, Math.round(base / 2)) : base
}

// ---------- streak ----------

export function daysBetween(a: string, b: string): number {
  const [ya, ma, da] = a.split('-').map(Number) as [number, number, number]
  const [yb, mb, db] = b.split('-').map(Number) as [number, number, number]
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86_400_000)
}

export interface StreakState {
  streak: number
  bestStreak: number
  streakFreezes: number
  lastActiveDay: string | null
}

export interface StreakUpdate extends StreakState {
  freezesUsed: number
  freezeEarned: boolean
  extended: boolean
}

/** Call once when a lesson is finished on `today`. */
export function advanceStreak(s: StreakState, today: string): StreakUpdate {
  const none = { freezesUsed: 0, freezeEarned: false, extended: false }
  if (s.lastActiveDay === today) return { ...s, ...none }
  let streak = s.streak
  let freezes = s.streakFreezes
  let used = 0
  if (s.lastActiveDay === null) streak = 1
  else {
    const diff = daysBetween(s.lastActiveDay, today)
    const missed = Math.max(0, diff - 1)
    if (missed === 0) streak += 1
    else if (freezes >= missed) {
      freezes -= missed
      used = missed
      streak += 1
    } else streak = 1
  }
  let earned = false
  if (streak > 0 && streak % 7 === 0 && freezes < MAX_FREEZES) {
    freezes += 1
    earned = true
  }
  return {
    streak,
    bestStreak: Math.max(s.bestStreak, streak),
    streakFreezes: freezes,
    lastActiveDay: today,
    freezesUsed: used,
    freezeEarned: earned,
    extended: true,
  }
}

/** Streak to display today: it is lost if more days were missed than freezes can cover. */
export function displayStreak(s: StreakState, today: string): number {
  if (!s.lastActiveDay) return 0
  const missed = Math.max(0, daysBetween(s.lastActiveDay, today) - 1)
  return missed <= s.streakFreezes ? s.streak : 0
}

// ---------- hearts ----------

export function refillHearts(hearts: number, updatedAt: number, now: number): { hearts: number; heartsAt: number } {
  if (hearts >= MAX_HEARTS) return { hearts: MAX_HEARTS, heartsAt: now }
  const gained = Math.floor((now - updatedAt) / HEART_REFILL_MS)
  if (gained <= 0) return { hearts, heartsAt: updatedAt }
  const h = Math.min(MAX_HEARTS, hearts + gained)
  return { hearts: h, heartsAt: h >= MAX_HEARTS ? now : updatedAt + gained * HEART_REFILL_MS }
}

// ---------- crowns ----------

export type Crown = 0 | 1 | 2 | 3 // none, bronze, silver, gold
export const CROWN_THRESHOLDS = [0.3, 0.6, 0.85] as const

/** Average mastery of unit words, 0–1 (level / 5). */
export function unitMastery(levels: readonly number[]): number {
  if (!levels.length) return 0
  return levels.reduce((a, b) => a + b, 0) / (levels.length * 5)
}

export function crownFor(mastery: number): Crown {
  let c: Crown = 0
  CROWN_THRESHOLDS.forEach((t, i) => {
    if (mastery >= t) c = (i + 1) as Crown
  })
  return c
}

export type UnitStatus = 'locked' | 'active' | 'completed'

/** Unit N+1 unlocks when >= 80% of unit N has been seen; completed = at least bronze. */
export function unitStatus(unitLevels: readonly number[][], index: number): UnitStatus {
  const levels = unitLevels[index] ?? []
  if (crownFor(unitMastery(levels)) >= 1) return 'completed'
  if (index === 0) return 'active'
  const prev = unitLevels[index - 1] ?? []
  const seen = prev.filter((l) => l >= 1).length
  return prev.length > 0 && seen / prev.length >= 0.8 ? 'active' : 'locked'
}

// ---------- achievements ----------

export interface AchievementStats {
  lessons: number
  perfectLessons: number
  streak: number
  xpTotal: number
  masteredWords: number
  learnedWords: number
  decks: number
  goldUnits: number
  goalDays: number
}

export interface AchievementDef {
  key: string
  icon: string
  test: (s: AchievementStats) => boolean
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { key: 'first_lesson', icon: '🌱', test: (s) => s.lessons >= 1 },
  { key: 'ten_lessons', icon: '📚', test: (s) => s.lessons >= 10 },
  { key: 'perfect_lesson', icon: '💯', test: (s) => s.perfectLessons >= 1 },
  { key: 'streak_3', icon: '🔥', test: (s) => s.streak >= 3 },
  { key: 'streak_7', icon: '⚡', test: (s) => s.streak >= 7 },
  { key: 'streak_30', icon: '🏆', test: (s) => s.streak >= 30 },
  { key: 'learned_50', icon: '🧠', test: (s) => s.learnedWords >= 50 },
  { key: 'mastered_10', icon: '⭐', test: (s) => s.masteredWords >= 10 },
  { key: 'mastered_100', icon: '🌟', test: (s) => s.masteredWords >= 100 },
  { key: 'xp_1000', icon: '💎', test: (s) => s.xpTotal >= 1000 },
  { key: 'gold_unit', icon: '👑', test: (s) => s.goldUnits >= 1 },
  { key: 'goal_5', icon: '🎯', test: (s) => s.goalDays >= 5 },
]

export function newlyUnlocked(stats: AchievementStats, already: ReadonlySet<string>): AchievementDef[] {
  return ACHIEVEMENTS.filter((a) => !already.has(a.key) && a.test(stats))
}
