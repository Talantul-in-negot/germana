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
    expect(await db.decks.count()).toBe(6)
    const decks = await db.decks.toArray()
    expect(decks.every((d) => d.course === 'Menschen A1' && d.cefr === 'A1' && d.l2 === 'German')).toBe(true)
    const words = await db.words.toArray()
    expect(words).toHaveLength(7 + 8 + 12 + 16 + 10 + 41)
    expect(words.every((w) => !w.example)).toBe(true)
    expect(decks.some((d) => d.name.includes('Erste'))).toBe(false)
    const zahlen = decks.find((d) => d.name.includes('Zahlen'))!
    expect(new Set(words.filter((w) => w.deckId === zahlen.id).map((w) => w.unitIndex)).size).toBe(4)
    const familie = decks.find((d) => d.name.includes('Familie'))!
    expect(new Set(words.filter((w) => w.deckId === familie.id).map((w) => w.unitIndex)).size).toBe(2)
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
    const deck = (await db.decks.toArray()).find((d) => d.name.includes('Familie'))!
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
    const deck = (await db.decks.toArray()).find((d) => d.name.includes('Familie'))!
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

describe('v4 cleanup of content the learner did not supply', () => {
  it('drops the demo deck, assistant-added words and example sentences; keeps progress of kept words', async () => {
    const { newProgress } = await import('../src/core/srs')
    const { cleanSeedContent } = await import('../src/data/db')
    const mk = (deckId: string, term: string, tags: string[], order: number, example?: string) =>
      ({ id: `${deckId}-${term}`, deckId, unitIndex: 0, order, term, translations: ['x'], tags, ...(example ? { example, exampleRo: ['ro'] } : {}) })
    await db.decks.bulkAdd([
      { id: 'demo', name: 'Lektion 1 – Erste Wörter', createdAt: 1, l2: 'German', l1: 'Romanian' },
      { id: 'wt', name: 'Lektion 3 – Wochentage', createdAt: 1, l2: 'German', l1: 'Romanian' },
      { id: 'mine', name: 'Lektion 9 – Mein Heft', createdAt: 1, l2: 'German', l1: 'Romanian' },
    ])
    await db.words.bulkAdd([
      mk('demo', 'der Vater', ['familie'], 0, 'Mein Vater.'),
      mk('wt', 'der Montag', ['wochentage'], 0, 'Am Montag habe ich Schule.'),
      mk('wt', 'heute', ['zeit'], 1, 'Heute ist Dienstag.'),
      mk('mine', 'der Hund', [], 0, 'Der Hund bellt.'),
    ])
    await db.progress.bulkAdd([newProgress('p', 'demo-der Vater'), newProgress('p', 'wt-der Montag'), newProgress('p', 'wt-heute'), newProgress('p', 'mine-der Hund')])
    await cleanSeedContent(db.decks, db.words, db.progress)
    expect((await db.decks.toArray()).map((d) => d.id).sort()).toEqual(['mine', 'wt'])
    expect((await db.words.toArray()).map((w) => w.id).sort()).toEqual(['mine-der Hund', 'wt-der Montag'])
    expect((await db.words.get('wt-der Montag'))?.example).toBeUndefined()
    expect((await db.words.get('wt-der Montag'))?.exampleRo).toBeUndefined()
    expect((await db.words.get('mine-der Hund'))?.example).toBe('Der Hund bellt.') // user deck untouched
    expect((await db.progress.toArray()).map((x) => x.wordId).sort()).toEqual(['mine-der Hund', 'wt-der Montag'])
  })
})

describe('v5: stage locks are gone', () => {
  it('drops the obsolete stage-pass dates from saved progress and keeps the rest', async () => {
    const { default: Dexie } = await import('dexie')
    const { newProgress } = await import('../src/core/srs')
    const { LexiDB } = await import('../src/data/db')
    const name = 'mig-v5'
    const v4 = new Dexie(name)
    v4.version(4).stores({
      decks: 'id', words: 'id, deckId, [deckId+unitIndex]', profiles: 'id', progress: '[profileId+wordId], profileId, wordId',
      sessions: 'id, profileId, date', achievements: 'id, profileId, &[profileId+key]', meta: 'key', tests: 'id, profileId, deckId',
    })
    await v4.open()
    await v4.table('progress').add({ ...newProgress('p', 'w'), level: 3, conj: { passed: ['2026-01-01', null, null] } })
    v4.close()
    const now = new LexiDB(name)
    await now.open()
    const row = (await now.progress.get(['p', 'w'])) as unknown as Record<string, unknown>
    expect(row.level).toBe(3)
    expect('conj' in row).toBe(false)
    now.close()
  })
})

describe('v6: numbers lesson is Lektion 1', () => {
  it('renames the old unnumbered Zahlen deck and keeps its words', async () => {
    const { default: Dexie } = await import('dexie')
    const { LexiDB } = await import('../src/data/db')
    const name = 'mig-v6'
    const v5 = new Dexie(name)
    v5.version(5).stores({
      decks: 'id', words: 'id, deckId, [deckId+unitIndex]', profiles: 'id', progress: '[profileId+wordId], profileId, wordId',
      sessions: 'id, profileId, date', achievements: 'id, profileId, &[profileId+key]', meta: 'key', tests: 'id, profileId, deckId',
    })
    await v5.open()
    await v5.table('decks').bulkAdd([
      { id: 'z', name: 'Zahlen 0–40', createdAt: 1, l2: 'German', l1: 'Romanian', lesson: 0 },
      { id: 'o', name: 'Mein Heft', createdAt: 1, l2: 'German', l1: 'Romanian' },
    ])
    await v5.table('words').add({ id: 'w', deckId: 'z', unitIndex: 0, order: 0, term: 'null', translations: ['zero'], tags: [] })
    v5.close()
    const now = new LexiDB(name)
    await now.open()
    expect(await now.decks.get('z')).toMatchObject({ name: 'Lektion 1 – Zahlen 0–40', lesson: 1 })
    expect((await now.decks.get('o'))?.name).toBe('Mein Heft')
    expect(await now.words.count()).toBe(1)
    now.close()
  })
})
