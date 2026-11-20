import { describe, expect, it } from 'vitest'
import {
  ACHIEVEMENTS, HEART_REFILL_MS, MAX_FREEZES, MAX_HEARTS, advanceStreak, crownFor, daysBetween, displayStreak,
  newlyUnlocked, refillHearts, unitMastery, unitStatus, xpForAnswer, type AchievementStats, type StreakState,
} from '../src/core/gamification'

const S = (over: Partial<StreakState> = {}): StreakState => ({
  streak: 0, bestStreak: 0, streakFreezes: 0, lastActiveDay: null, ...over,
})

describe('xp', () => {
  it('scales with difficulty, zero when wrong, halved for typos', () => {
    expect(xpForAnswer('type_l1_l2', true)).toBeGreaterThan(xpForAnswer('mc_l2_l1', true))
    expect(xpForAnswer('mc_l2_l1', false)).toBe(0)
    expect(xpForAnswer('type_l1_l2', true, 'typo')).toBeLessThan(xpForAnswer('type_l1_l2', true, 'exact'))
  })
})

describe('streak', () => {
  it('daysBetween handles month ends', () => {
    expect(daysBetween('2026-01-31', '2026-02-01')).toBe(1)
    expect(daysBetween('2026-01-01', '2026-01-01')).toBe(0)
  })
  it('starts, extends, and is idempotent within a day', () => {
    const a = advanceStreak(S(), '2026-01-01')
    expect(a).toMatchObject({ streak: 1, extended: true })
    const b = advanceStreak(a, '2026-01-02')
    expect(b.streak).toBe(2)
    const c = advanceStreak(b, '2026-01-02')
    expect(c.streak).toBe(2)
    expect(c.extended).toBe(false)
  })
  it('resets when days are missed without freezes', () => {
    expect(advanceStreak(S({ streak: 5, bestStreak: 5, lastActiveDay: '2026-01-01' }), '2026-01-04')).toMatchObject({
      streak: 1, bestStreak: 5,
    })
  })
  it('consumes freezes for missed days', () => {
    const r = advanceStreak(S({ streak: 5, streakFreezes: 2, lastActiveDay: '2026-01-01' }), '2026-01-03')
    expect(r).toMatchObject({ streak: 6, streakFreezes: 1, freezesUsed: 1 })
  })
  it('earns a freeze every 7 days, capped', () => {
    const r = advanceStreak(S({ streak: 6, lastActiveDay: '2026-01-06' }), '2026-01-07')
    expect(r).toMatchObject({ streak: 7, streakFreezes: 1, freezeEarned: true })
    const capped = advanceStreak(S({ streak: 13, streakFreezes: MAX_FREEZES, lastActiveDay: '2026-01-06' }), '2026-01-07')
    expect(capped.streakFreezes).toBe(MAX_FREEZES)
    expect(capped.freezeEarned).toBe(false)
  })
  it('displayStreak drops to 0 when the streak cannot be protected', () => {
    const s = S({ streak: 4, streakFreezes: 1, lastActiveDay: '2026-01-01' })
    expect(displayStreak(s, '2026-01-02')).toBe(4)
    expect(displayStreak(s, '2026-01-03')).toBe(4)
    expect(displayStreak(s, '2026-01-05')).toBe(0)
    expect(displayStreak(S(), '2026-01-05')).toBe(0)
  })
})

describe('hearts', () => {
  it('refills one heart per 20 minutes, up to the max', () => {
    expect(refillHearts(2, 0, HEART_REFILL_MS * 2.5)).toEqual({ hearts: 4, heartsAt: HEART_REFILL_MS * 2 })
    expect(refillHearts(2, 0, 1000)).toEqual({ hearts: 2, heartsAt: 0 })
    expect(refillHearts(1, 0, HEART_REFILL_MS * 100).hearts).toBe(MAX_HEARTS)
    expect(refillHearts(MAX_HEARTS, 0, 5).heartsAt).toBe(5)
  })
})

describe('crowns & units', () => {
  it('maps mastery to bronze/silver/gold', () => {
    expect(crownFor(0.1)).toBe(0)
    expect(crownFor(0.3)).toBe(1)
    expect(crownFor(0.6)).toBe(2)
    expect(crownFor(0.9)).toBe(3)
    expect(unitMastery([5, 5])).toBe(1)
    expect(unitMastery([])).toBe(0)
    expect(unitMastery([0, 5])).toBe(0.5)
  })
  it('locks / activates / completes units', () => {
    const levels = [[3, 3, 3, 3], [0, 0, 0, 0], [0, 0]]
    expect(unitStatus(levels, 0)).toBe('completed')
    expect(unitStatus(levels, 1)).toBe('active')
    expect(unitStatus(levels, 2)).toBe('locked')
    expect(unitStatus([[1, 0, 0, 0], [0]], 1)).toBe('locked')
    expect(unitStatus([[1, 1, 1, 0, 1], [0]], 1)).toBe('active')
    expect(unitStatus([[0, 0]], 0)).toBe('active')
    expect(unitStatus([], 0)).toBe('active')
  })
})

describe('achievements', () => {
  const stats: AchievementStats = {
    lessons: 1, perfectLessons: 1, streak: 7, xpTotal: 100, masteredWords: 0, learnedWords: 10, decks: 1, goldUnits: 0, goalDays: 0,
  }
  it('unlocks the right ones and never twice', () => {
    const keys = newlyUnlocked(stats, new Set()).map((a) => a.key)
    expect(keys).toEqual(expect.arrayContaining(['first_lesson', 'perfect_lesson', 'streak_3', 'streak_7']))
    expect(keys).not.toContain('mastered_100')
    expect(newlyUnlocked(stats, new Set(keys))).toEqual([])
  })
  it('covers every definition with a working predicate', () => {
    const big: AchievementStats = {
      lessons: 99, perfectLessons: 9, streak: 99, xpTotal: 99999, masteredWords: 999, learnedWords: 999, decks: 9, goldUnits: 9, goalDays: 99,
    }
    expect(ACHIEVEMENTS.every((a) => a.test(big))).toBe(true)
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(10)
  })
})
