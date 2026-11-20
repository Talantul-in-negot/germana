import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { seededRng } from '../src/core/id'
import { current, planLesson, selectLessonWords, submitResult, type LessonResultItem } from '../src/core/lesson'
import { exportAll, importAll, validateBackup, wipeAll } from '../src/data/backup'
import { db } from '../src/data/db'
import { addWords, createDeck, createProfile, deleteDeck, deleteWord, ensureSeed, getMeta, progressMap, renameDeck, resetProgress, updateWord } from '../src/data/repo'
import { finishLesson } from '../src/data/service'

beforeEach(async () => {
  await wipeAll()
})

const items = (n: number) => Array.from({ length: n }, (_, i) => ({ term: `w${i}`, translations: [`t${i}`], tags: [] as string[] }))

describe('repo', () => {
  it('ensureSeed creates a profile and the German demo lessons exactly once', async () => {
    await ensureSeed()
    await ensureSeed()
    expect(await db.profiles.count()).toBe(1)
    expect(await db.decks.count()).toBe(7)
    const decks = await db.decks.toArray()
    expect(decks.every((d) => d.course === 'Menschen A1' && d.cefr === 'A1' && d.l2 === 'German')).toBe(true)
    const words = await db.words.toArray()
    expect(words).toHaveLength(12 + 8 + 12 + 20 + 16 + 10 + 41)
    const zahlen = decks.find((d) => d.name.startsWith('Zahlen'))!
    expect(new Set(words.filter((w) => w.deckId === zahlen.id).map((w) => w.unitIndex)).size).toBe(4)
    const familie = decks.find((d) => d.name.includes('Erste'))!
    expect(new Set(words.filter((w) => w.deckId === familie.id).map((w) => w.unitIndex)).size).toBe(1)
    const mutter = words.find((w) => w.term === 'die Mutter')!
    expect(mutter).toMatchObject({ type: 'noun', gender: 'die', plural: 'Mütter' })
    expect(await getMeta('activeProfileId')).toBeTruthy()
  })

  it('50 imported words -> 5 units; add/delete reindexes', async () => {
    const id = await createDeck('Test', items(50))
    let words = await db.words.where('deckId').equals(id).toArray()
    expect(new Set(words.map((w) => w.unitIndex)).size).toBe(5)
    await addWords(id, items(10).map((x) => ({ ...x, term: 'extra' + x.term })))
    words = await db.words.where('deckId').equals(id).toArray()
    expect(words).toHaveLength(60)
    expect(new Set(words.map((w) => w.unitIndex)).size).toBe(6)
    await deleteWord(words[0]!.id)
    expect(await db.words.where('deckId').equals(id).count()).toBe(59)
  })

  it('updates, renames and deletes decks with cascade', async () => {
    const p = await createProfile('A', '🦊')
    const id = await createDeck('Old', items(9))
    await renameDeck(id, 'New')
    expect((await db.decks.get(id))?.name).toBe('New')
    const w = (await db.words.where('deckId').equals(id).first())!
    await updateWord(w.id, { example: 'hello w0 there', translations: ['x', 'y'] })
    expect((await db.words.get(w.id))?.example).toBe('hello w0 there')
    await updateWord(w.id, { example: '' })
    expect((await db.words.get(w.id))?.example).toBeUndefined()
    await db.progress.put({ ...(await import('../src/core/srs')).newProgress(p.id, w.id) })
    await deleteDeck(id)
    expect(await db.words.count()).toBe(0)
    expect(await db.progress.count()).toBe(0)
  })
})

describe('lesson completion + persistence', () => {
  it('finishLesson stores progress/xp/streak and is visible after reading again', async () => {
    await ensureSeed()
    const profile = (await db.profiles.toCollection().first())!
    const deck = (await db.decks.toArray()).find((d) => d.name.includes('Erste'))!
    const words = await db.words.where('deckId').equals(deck.id).toArray()
    const rng = seededRng(3)
    const sel = selectLessonWords(words, new Map(), Date.now(), { mode: 'unit', size: 12, newRatio: 0.3, unitIndex: 0 }, rng)
    const ctx = { deckWords: words, rng, newId: () => Math.random().toString(36) }
    const picked = sel.wordIds.map((id) => words.find((w) => w.id === id)!)
    let rt = planLesson(picked, () => 0, words, ctx, false, 12)
    const results: LessonResultItem[] = []
    while (current(rt)) {
      const e = current(rt)!
      const w = words.find((x) => x.id === e.wordId)!
      const item = { wordId: w.id, type: e.type, correct: true }
      results.push(item)
      rt = submitResult(rt, item, w, ctx, false)
    }
    const now = Date.now()
    const out = await finishLesson({ profileId: profile.id, deckId: deck.id, sessionId: 's1', results, startedAt: now - 60000, now, mode: 'unit', heartsLost: 0 })
    expect(out.xp).toBeGreaterThan(0)
    expect(out.perfect).toBe(true)
    expect(out.bonusXp).toBe(10)
    expect(out.streak.streak).toBe(1)
    expect(out.unlocked.map((a) => a.key)).toEqual(expect.arrayContaining(['first_lesson', 'perfect_lesson']))
    const p2 = (await db.profiles.get(profile.id))!
    expect(p2.xpTotal).toBe(out.xp + out.bonusXp)
    const map = await progressMap(profile.id)
    expect(map.size).toBeGreaterThan(0)
    expect([...map.values()].every((x) => x.level >= 1)).toBe(true)
    expect(out.levelUps.length).toBeGreaterThan(0)
    expect(await db.sessions.count()).toBe(1)

    await resetProgress(profile.id)
    expect((await progressMap(profile.id)).size).toBe(0)
    expect((await db.profiles.get(profile.id))!.xpTotal).toBe(0)
  })
})

describe('backup', () => {
  it('export -> wipe -> import restores everything', async () => {
    await ensureSeed()
    const profile = (await db.profiles.toCollection().first())!
    const deck = (await db.decks.toArray()).find((d) => d.name.includes('Erste'))!
    const w = (await db.words.where('deckId').equals(deck.id).first())!
    const now = Date.now()
    await finishLesson({
      profileId: profile.id, deckId: deck.id, sessionId: 's1', startedAt: now - 1000, now, mode: 'unit', heartsLost: 0,
      results: [{ wordId: w.id, type: 'mc_l2_l1', correct: true }],
    })
    const before = JSON.parse(JSON.stringify(await exportAll()))
    await wipeAll()
    expect(await db.words.count()).toBe(0)
    await importAll(JSON.parse(JSON.stringify(before)))
    const after = JSON.parse(JSON.stringify(await exportAll()))
    for (const k of ['decks', 'words', 'profiles', 'progress', 'sessions', 'achievements', 'meta'] as const) {
      expect(after[k]).toEqual(before[k])
    }
    expect((await progressMap(profile.id)).size).toBe(1)
  })

  it('rejects invalid files', () => {
    expect(() => validateBackup(null)).toThrow('invalid_backup')
    expect(() => validateBackup({ app: 'x' })).toThrow('invalid_backup')
    expect(() => validateBackup({ app: 'lexi-path', version: 99 })).toThrow('backup_too_new')
    expect(() => validateBackup({ app: 'lexi-path', version: 1, decks: [] })).toThrow('invalid_backup')
  })
})
