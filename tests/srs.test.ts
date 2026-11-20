import { describe, expect, it } from 'vitest'
import {
  DAY_MS, accuracyOf, applyAnswer, bandForLevel, dayKey, exerciseWeight, isDue,
  needsPractice, newProgress, reviewPriority, strengthAt, type AnswerInput,
} from '../src/core/srs'
import type { WordProgress } from '../src/core/types'

const T0 = new Date(2026, 0, 1, 12, 0, 0).getTime()
const ans = (p: WordProgress, over: Partial<AnswerInput> & { sessionId: string }): WordProgress =>
  applyAnswer(p, { correct: true, type: 'type_l1_l2', now: T0, ...over }).progress

describe('bands & weights', () => {
  it('maps levels to bands', () => {
    expect([0, 1].map(bandForLevel)).toEqual(['recognition', 'recognition'])
    expect([2, 3].map(bandForLevel)).toEqual(['recall', 'recall'])
    expect([4, 5].map(bandForLevel)).toEqual(['production', 'production'])
  })
  it('harder exercise types weigh more', () => {
    expect(exerciseWeight('type_l1_l2')).toBeGreaterThan(exerciseWeight('mc_l1_l2'))
    expect(exerciseWeight('mc_l1_l2')).toBeGreaterThan(exerciseWeight('mc_l2_l1'))
    expect(exerciseWeight('mc_l2_l1')).toBeGreaterThan(exerciseWeight('match'))
  })
})

describe('applyAnswer', () => {
  it('first exposure moves New -> Seen and schedules a review', () => {
    const r = applyAnswer(newProgress('p', 'w'), { correct: true, type: 'mc_l2_l1', now: T0, sessionId: 's1' })
    expect(r.progress.level).toBe(1)
    expect(r.leveledUp).toBe(true)
    expect(r.progress.interval).toBe(1)
    expect(r.progress.dueAt).toBe(T0 + DAY_MS)
  })

  it('does not mutate its input', () => {
    const p = newProgress('p', 'w')
    applyAnswer(p, { correct: true, type: 'mc_l2_l1', now: T0, sessionId: 's1' })
    expect(p.level).toBe(0)
    expect(p.creditSessions).toEqual([])
  })

  it('needs credit from >= 2 sessions: lots of correct answers in one session do not level up', () => {
    let p = ans(newProgress('p', 'w'), { sessionId: 's1' }) // -> level 1
    for (let i = 0; i < 20; i++) p = ans(p, { sessionId: 's1' })
    expect(p.level).toBe(1)
    p = ans(p, { sessionId: 's2' })
    expect(p.level).toBe(2)
  })

  it('harder exercise gives more credit than easier', () => {
    const base = ans(newProgress('p', 'w'), { sessionId: 's1', type: 'mc_l2_l1' })
    const easy = ans(base, { sessionId: 's1', type: 'match' })
    const hard = ans(base, { sessionId: 's1', type: 'type_l1_l2' })
    expect(hard.levelCredit).toBeGreaterThan(easy.levelCredit)
  })

  it('typo and diacritics are credited less than exact', () => {
    const b = ans(newProgress('p', 'w'), { sessionId: 's1' })
    const exact = ans(b, { sessionId: 's1', quality: 'exact' })
    const dia = ans(b, { sessionId: 's1', quality: 'diacritics' })
    const typo = ans(b, { sessionId: 's1', quality: 'typo' })
    expect(exact.levelCredit).toBeGreaterThan(dia.levelCredit)
    expect(dia.levelCredit).toBeGreaterThan(typo.levelCredit)
  })

  it('typo shortens the next interval and does not raise ease', () => {
    const base = ans(newProgress('p', 'w'), { sessionId: 's1' })
    const typo = ans(base, { sessionId: 's2', quality: 'typo', now: T0 + DAY_MS })
    const clean = ans(base, { sessionId: 's2', now: T0 + DAY_MS })
    expect(typo.interval).toBeLessThanOrEqual(clean.interval)
    expect(typo.ease).toBeLessThanOrEqual(clean.ease)
  })

  it('interval grows 1 -> 3 -> ease-scaled, once per session', () => {
    let p = ans(newProgress('p', 'w'), { sessionId: 's1' })
    expect(p.interval).toBe(1)
    p = ans(p, { sessionId: 's1' }) // same session: unchanged
    expect(p.interval).toBe(1)
    p = ans(p, { sessionId: 's2', now: T0 + DAY_MS })
    expect(p.interval).toBe(3)
    p = ans(p, { sessionId: 's3', now: T0 + 4 * DAY_MS })
    expect(p.interval).toBeGreaterThan(3)
  })

  it('wrong answer lowers ease, counts one lapse per session and resets streak', () => {
    let p = ans(newProgress('p', 'w'), { sessionId: 's1' })
    const ease0 = p.ease
    p = ans(p, { sessionId: 's2', correct: false, now: T0 + DAY_MS })
    p = ans(p, { sessionId: 's2', correct: false, now: T0 + DAY_MS })
    expect(p.ease).toBeLessThan(ease0)
    expect(p.lapses).toBe(1)
    expect(p.correctStreak).toBe(0)
    expect(p.interval).toBeLessThan(1)
    expect(p.statsByExerciseType.type_l1_l2).toEqual({ correct: 1, wrong: 2 })
  })

  it('ease stays within [1.3, 3.0]', () => {
    let p = ans(newProgress('p', 'w'), { sessionId: 's1' })
    for (let i = 0; i < 30; i++) p = ans(p, { sessionId: 's' + i, correct: false })
    expect(p.ease).toBeGreaterThanOrEqual(1.3)
    let q = ans(newProgress('p', 'w'), { sessionId: 's1' })
    for (let i = 0; i < 200; i++) q = ans(q, { sessionId: 'x' + i, now: T0 + i * DAY_MS })
    expect(q.ease).toBeLessThanOrEqual(3)
  })

  it('two consecutive wrong answers drop the level by one; a single one does not', () => {
    const p: WordProgress = { ...newProgress('p', 'w'), level: 3, lastSeenAt: T0, dueAt: T0 + DAY_MS, interval: 3 }
    const a = applyAnswer(p, { correct: false, type: 'mc_l1_l2', now: T0, sessionId: 's1' })
    expect(a.progress.level).toBe(3)
    expect(a.leveledDown).toBe(false)
    const b = applyAnswer(a.progress, { correct: false, type: 'mc_l1_l2', now: T0, sessionId: 's1' })
    expect(b.progress.level).toBe(2)
    expect(b.leveledDown).toBe(true)
  })

  it('level 1 never drops below 1 on wrong answers', () => {
    let p = ans(newProgress('p', 'w'), { sessionId: 's1' })
    for (let i = 0; i < 5; i++) p = ans(p, { sessionId: 's1', correct: false })
    expect(p.level).toBe(1)
  })

  it('a word CANNOT reach Mastered within a single day, however much is practised', () => {
    let p = newProgress('p', 'w')
    for (let s = 0; s < 50; s++) {
      for (let i = 0; i < 20; i++) {
        p = ans(p, { sessionId: 'sess' + s, type: 'type_l1_l2', now: T0 + s * 60_000 })
      }
    }
    expect(p.level).toBe(4)
  })

  it('reaches Mastered once practised on a second day', () => {
    let p = newProgress('p', 'w')
    for (let s = 0; s < 10; s++) p = ans(p, { sessionId: 'a' + s, now: T0 + s * 1000 })
    expect(p.level).toBe(4)
    for (let s = 0; s < 4; s++) p = ans(p, { sessionId: 'b' + s, now: T0 + DAY_MS + s * 1000 })
    expect(p.level).toBe(5)
  })

  it('level 5 stays at 5 on correct answers', () => {
    const p: WordProgress = { ...newProgress('p', 'w'), level: 5, lastSeenAt: T0, dueAt: T0 + DAY_MS }
    expect(applyAnswer(p, { correct: true, type: 'type_l1_l2', now: T0, sessionId: 'x' }).progress.level).toBe(5)
  })
})

describe('strength & decay', () => {
  const learned = (): WordProgress => {
    let p = ans(newProgress('p', 'w'), { sessionId: 's1' })
    p = ans(p, { sessionId: 's2', now: T0 + DAY_MS })
    return p
  }

  it('is 0 for new words', () => {
    expect(strengthAt(newProgress('p', 'w'), T0)).toBe(0)
  })

  it('stays high before dueAt and drops after, without changing the level', () => {
    const p = learned()
    const before = strengthAt(p, p.lastSeenAt)
    const afterDue = strengthAt(p, p.dueAt + 5 * DAY_MS)
    const longAfter = strengthAt(p, p.dueAt + 60 * DAY_MS)
    expect(before).toBeGreaterThan(afterDue)
    expect(afterDue).toBeGreaterThan(longAfter)
    expect(p.level).toBe(2)
  })

  it('decreases monotonically over time', () => {
    const p = learned()
    let prev = 101
    for (let d = 0; d < 40; d += 2) {
      const s = strengthAt(p, p.lastSeenAt + d * DAY_MS)
      expect(s).toBeLessThanOrEqual(prev)
      prev = s
    }
  })

  it('a fresh lapse shows low strength', () => {
    const p = applyAnswer(learned(), { correct: false, type: 'mc_l2_l1', now: T0 + 3 * DAY_MS, sessionId: 's9' }).progress
    expect(strengthAt(p, T0 + 3 * DAY_MS)).toBeLessThan(40)
  })

  it('isDue / needsPractice / priority', () => {
    const p = learned()
    expect(isDue(p, p.dueAt - 1)).toBe(false)
    expect(isDue(p, p.dueAt)).toBe(true)
    expect(isDue(newProgress('p', 'w'), T0)).toBe(false)
    expect(needsPractice(p, p.dueAt + 1)).toBe(true)
    expect(needsPractice(newProgress('p', 'w'), T0)).toBe(false)
    expect(reviewPriority(p, p.dueAt + 3 * DAY_MS)).toBeGreaterThan(reviewPriority(p, p.lastSeenAt))
  })
})

describe('helpers', () => {
  it('dayKey is local YYYY-MM-DD', () => {
    expect(dayKey(new Date(2026, 2, 5, 23, 59).getTime())).toBe('2026-03-05')
  })
  it('accuracyOf', () => {
    expect(accuracyOf(newProgress('p', 'w'))).toBeNull()
    let p = ans(newProgress('p', 'w'), { sessionId: 's1' })
    p = ans(p, { sessionId: 's1', correct: false, type: 'mc_l2_l1' })
    expect(accuracyOf(p)).toBe(0.5)
  })
})
