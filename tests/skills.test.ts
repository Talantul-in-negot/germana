import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { describe, expect, it } from 'vitest'
import { DAY_MS, applySkillAnswer, dueNow, effectiveLevel, newProgress, requiredSkills, skillLevel, wordStrengthAt, type AnswerInput } from '../src/core/srs'
import type { WordProgress } from '../src/core/types'
import { LexiDB } from '../src/data/db'

const T0 = new Date(2026, 0, 1, 12).getTime()
const ans = (p: WordProgress, skill: 'meaning' | 'gender' | 'plural' | 'forms', over: Partial<AnswerInput> & { sessionId: string }): WordProgress =>
  applySkillAnswer(p, skill, { correct: true, type: 'type_l1_l2', now: T0, ...over }).progress

const noun = (): WordProgress => ({ ...newProgress('p', 'w'), required: ['gender', 'plural'] })

describe('required sub-skills', () => {
  it('nouns need gender (+ plural when known), verbs need forms', () => {
    expect(requiredSkills({ type: 'noun', gender: 'der', plural: 'Tische' })).toEqual(['gender', 'plural'])
    expect(requiredSkills({ type: 'noun', gender: 'die', plural: null })).toEqual(['gender'])
    expect(requiredSkills({ type: 'noun', gender: 'die', pluralOnly: true, plural: 'Eltern' })).toEqual(['gender'])
    expect(requiredSkills({ type: 'verb', verb: { present3sg: 'geht' } })).toEqual(['forms'])
    expect(requiredSkills({ type: 'verb', verb: {} })).toEqual([])
    expect(requiredSkills({ type: 'other' })).toEqual([])
    expect(requiredSkills({})).toEqual([])
  })
})

describe('sub-skills have their own SRS state', () => {
  it('answering gender does not touch meaning and vice versa', () => {
    let p = noun()
    p = ans(p, 'meaning', { sessionId: 's1' })
    p = ans(p, 'gender', { sessionId: 's1', type: 'article' })
    expect(p.level).toBe(1)
    expect(skillLevel(p, 'gender')).toBe(1)
    expect(p.skills?.gender?.interval).toBe(1)
    expect(p.interval).toBe(1)
    p = ans(p, 'gender', { sessionId: 's1', correct: false, type: 'article' })
    expect(p.skills?.gender?.lapses).toBe(1)
    expect(p.lapses).toBe(0)
    expect(skillLevel(p, 'plural')).toBe(0)
  })
  it('sub-skills obey the same rules (2 sessions, 2 days for level 5)', () => {
    let p = noun()
    for (let s = 0; s < 40; s++) p = ans(p, 'plural', { sessionId: 'x' + s, type: 'plural_type', now: T0 + s * 1000 })
    expect(skillLevel(p, 'plural')).toBe(4)
    p = ans(p, 'plural', { sessionId: 'next', type: 'plural_type', now: T0 + DAY_MS })
    expect(skillLevel(p, 'plural')).toBe(5)
  })
})

describe('word level is capped by the weakest required sub-skill', () => {
  const trained = (): WordProgress => {
    let p = noun()
    for (let s = 0; s < 12; s++) p = ans(p, 'meaning', { sessionId: 'm' + s, now: T0 + s * 1000 })
    for (let s = 0; s < 4; s++) p = ans(p, 'meaning', { sessionId: 'n' + s, now: T0 + DAY_MS + s * 1000 })
    return p
  }
  it('meaning alone reaches 5, but the noun stays <= 3 while the article is unreliable', () => {
    const p = trained()
    expect(p.level).toBe(5)
    expect(effectiveLevel(p)).toBeLessThanOrEqual(2) // gender level 0 -> cap 2
    let q = ans(p, 'gender', { sessionId: 'g1', type: 'article' })
    expect(skillLevel(q, 'gender')).toBe(1)
    expect(effectiveLevel(q)).toBeLessThanOrEqual(3)
    q = ans(q, 'gender', { sessionId: 'g2', type: 'article', now: T0 + 2 * DAY_MS })
    expect(effectiveLevel(q)).toBeLessThanOrEqual(3)
  })
  it('cannot reach level 5 without its plural', () => {
    let p = trained()
    for (let s = 0; s < 14; s++) p = ans(p, 'gender', { sessionId: 'g' + s, type: 'article', now: T0 + s * 1000 })
    for (let s = 0; s < 6; s++) p = ans(p, 'gender', { sessionId: 'h' + s, type: 'article', now: T0 + DAY_MS + s * 1000 })
    expect(skillLevel(p, 'gender')).toBe(5)
    expect(skillLevel(p, 'plural')).toBe(0)
    expect(effectiveLevel(p)).toBe(2) // plural level 0 + margin
    for (let s = 0; s < 6; s++) p = ans(p, 'plural', { sessionId: 'p' + s, type: 'plural_type', now: T0 + s * 1000 })
    p = ans(p, 'plural', { sessionId: 'p-late', type: 'plural_type', now: T0 + DAY_MS })
    expect(skillLevel(p, 'plural')).toBeGreaterThanOrEqual(3)
    expect(effectiveLevel(p)).toBe(5)
  })
  it('words without required sub-skills are unaffected', () => {
    const p: WordProgress = { ...newProgress('p', 'w'), level: 4 }
    expect(effectiveLevel(p)).toBe(4)
    expect(effectiveLevel({ ...p, required: [] })).toBe(4)
  })
  it('word strength is limited by practised sub-skills', () => {
    let p = noun()
    p = ans(p, 'meaning', { sessionId: 's1' })
    p = ans(p, 'gender', { sessionId: 's1', type: 'article' })
    const base = wordStrengthAt(p, T0)
    p = ans(p, 'gender', { sessionId: 's2', correct: false, type: 'article', now: T0 + 1000 })
    expect(wordStrengthAt(p, T0 + 1000)).toBeLessThan(base)
  })
  it('dueNow resets all sub-skill review dates', () => {
    let p = ans(noun(), 'meaning', { sessionId: 's1' })
    p = ans(p, 'gender', { sessionId: 's1', type: 'article' })
    const d = dueNow(p, T0 + 5 * 1000)
    expect(d.dueAt).toBe(T0 + 5000)
    expect(d.skills?.gender?.dueAt).toBe(T0 + 5000)
  })
})

describe('Dexie v1 -> v2 migration keeps existing data', () => {
  it('decks, words and progress survive; progress gains sub-skill containers', async () => {
    const name = 'mig-test'
    const v1 = new Dexie(name)
    v1.version(1).stores({
      decks: 'id', words: 'id, deckId, [deckId+unitIndex]', profiles: 'id', progress: '[profileId+wordId], profileId, wordId',
      sessions: 'id, profileId, date', achievements: 'id, profileId, &[profileId+key]', meta: 'key',
    })
    await v1.open()
    await v1.table('decks').add({ id: 'd', name: 'Old', createdAt: 1, l2: 'English', l1: 'Romanian' })
    await v1.table('words').add({ id: 'w', deckId: 'd', unitIndex: 0, order: 0, term: 'house', translations: ['casă'], tags: [] })
    await v1.table('profiles').add({
      id: 'p', name: 'A', avatar: 'x', createdAt: 1, xpTotal: 50, streak: 2, bestStreak: 2, lastActiveDay: null, streakFreezes: 0,
      dailyGoal: 20, hearts: 5, heartsAt: 0, settings: { ttsVoice: null, ttsRate: 1, sound: true, hearts: false, speaking: false },
    })
    await v1.table('progress').add({ ...newProgress('p', 'w'), level: 3, interval: 6 })
    v1.close()

    const v2 = new LexiDB(name)
    await v2.open()
    expect(await v2.decks.count()).toBe(1)
    expect((await v2.words.get('w'))?.term).toBe('house')
    const prog = (await v2.progress.get(['p', 'w']))!
    expect(prog.level).toBe(3) // existing progress is the `meaning` sub-skill
    expect(prog.interval).toBe(6)
    expect(prog.skills).toEqual({})
    expect(prog.required).toEqual([])
    expect(effectiveLevel(prog)).toBe(3)
    expect((await v2.profiles.get('p'))?.settings.genderColors).toBe(true)
    expect((await v2.profiles.get('p'))?.xpTotal).toBe(50)
    expect(await v2.tests.count()).toBe(0)
    v2.close()
  })
})
