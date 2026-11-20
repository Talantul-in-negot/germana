/** Repository functions over Dexie. Keep UI free of table details. */
import { uid } from '../core/id'
import { parseWordList, rowToInput, type JsonWordInput } from '../core/parser'
import { newProgress } from '../core/srs'
import { assignUnitsFor } from '../core/units'
import type { Cefr, Deck, Profile, ProfileSettings, TestResult, Word, WordProgress } from '../core/types'
import { db } from './db'
import { COURSE, GERMAN_SEEDS } from './seed'

export const DEFAULT_SETTINGS: ProfileSettings = { ttsVoice: null, ttsRate: 0.9, sound: true, hearts: false, speaking: false, genderColors: true }
export const AVATARS = ['🦊', '🐼', '🐯', '🐸', '🦄', '🐙', '🦉', '🐧', '🐝', '🦖']

// ---------- meta ----------

export async function getMeta<T>(key: string): Promise<T | undefined> {
  return (await db.meta.get(key))?.value as T | undefined
}
export async function setMeta(key: string, value: unknown): Promise<void> {
  await db.meta.put({ key, value })
}

// ---------- decks & words ----------

export interface DeckOptions {
  l2?: string
  l1?: string
  course?: string
  cefr?: Cefr
  lesson?: number
}

function toWord(it: JsonWordInput, deckId: string, order: number, unitIndex: number): Word {
  const w: Word = { id: uid(), deckId, unitIndex, order, term: it.term.trim(), translations: it.translations, tags: it.tags }
  if (it.example) w.example = it.example
  if (it.type) w.type = it.type
  if (it.gender) w.gender = it.gender
  if (it.plural !== undefined) w.plural = it.plural
  if (it.pluralAlternatives?.length) w.pluralAlternatives = it.pluralAlternatives
  if (it.pluralOnly) w.pluralOnly = true
  if (it.verb) w.verb = it.verb
  if (it.alternatives?.length) w.alternatives = it.alternatives
  if (it.value !== undefined) w.value = it.value
  if (it.group) w.group = it.group
  if (it.exampleRo?.length) w.exampleRo = it.exampleRo
  return w
}

/** Lesson number from a textbook-style name ("Lektion 5 – Familie" -> 5). */
export function lessonFromName(name: string): number | undefined {
  const m = name.match(/(?:lektion|lecția|lectia|lesson|unit)\s*(\d+)/i)
  return m ? Number(m[1]) : undefined
}

export async function createDeck(name: string, items: JsonWordInput[], opts: DeckOptions = {}): Promise<string> {
  const deck: Deck = {
    id: uid(), name: name.trim() || 'Pachet nou', createdAt: Date.now(), l2: opts.l2 ?? 'German', l1: opts.l1 ?? 'Romanian',
  }
  if (opts.course?.trim()) deck.course = opts.course.trim()
  if (opts.cefr) deck.cefr = opts.cefr
  const lesson = opts.lesson ?? lessonFromName(deck.name)
  if (lesson !== undefined) deck.lesson = lesson
  const units = assignUnitsFor(items)
  const words = items.map((it, i) => toWord(it, deck.id, i, units[i] ?? 0))
  await db.transaction('rw', db.decks, db.words, async () => {
    await db.decks.add(deck)
    await db.words.bulkAdd(words)
  })
  return deck.id
}

export async function updateDeck(id: string, patch: Partial<Pick<Deck, 'name' | 'course' | 'cefr' | 'lesson'>>): Promise<void> {
  const d = await db.decks.get(id)
  if (!d) return
  const next: Deck = { ...d, ...patch }
  if (!next.course) delete next.course
  if (!next.cefr) delete next.cefr
  if (next.lesson === undefined) delete next.lesson
  await db.decks.put(next)
}

/** Re-number `order` and `unitIndex` after words were added/removed. */
export async function reindexDeck(deckId: string): Promise<void> {
  const words = (await db.words.where('deckId').equals(deckId).toArray()).sort((a, b) => a.order - b.order)
  const units = assignUnitsFor(words)
  await db.words.bulkPut(words.map((w, i) => ({ ...w, order: i, unitIndex: units[i] ?? 0 })))
}

export async function addWords(deckId: string, items: JsonWordInput[]): Promise<void> {
  const existing = await db.words.where('deckId').equals(deckId).toArray()
  let order = existing.reduce((m, w) => Math.max(m, w.order), -1) + 1
  const words = items.map((it) => toWord(it, deckId, order++, 0))
  await db.transaction('rw', db.words, async () => {
    await db.words.bulkAdd(words)
    await reindexDeck(deckId)
  })
}

export async function updateWord(id: string, patch: Partial<Pick<Word, 'term' | 'translations' | 'example' | 'tags' | 'type' | 'gender' | 'plural' | 'pluralOnly' | 'verb' | 'alternatives'>>): Promise<void> {
  const w = await db.words.get(id)
  if (!w) return
  const next: Word = { ...w, ...patch }
  if (!next.example) delete next.example
  await db.words.put(next)
}

export async function deleteWord(id: string): Promise<void> {
  const w = await db.words.get(id)
  if (!w) return
  await db.transaction('rw', db.words, db.progress, async () => {
    await db.words.delete(id)
    await db.progress.where('wordId').equals(id).delete()
    await reindexDeck(w.deckId)
  })
}

export async function renameDeck(id: string, name: string): Promise<void> {
  await db.decks.update(id, { name: name.trim() })
}

export async function deleteDeck(id: string): Promise<void> {
  const ids = await db.words.where('deckId').equals(id).primaryKeys()
  await db.transaction('rw', db.decks, db.words, db.progress, db.sessions, async () => {
    await db.progress.where('wordId').anyOf(ids).delete()
    await db.words.where('deckId').equals(id).delete()
    await db.sessions.filter((s) => s.deckId === id).delete()
    await db.decks.delete(id)
  })
}

// ---------- profiles ----------

export function makeProfile(name: string, avatar: string): Profile {
  return {
    id: uid(), name: name.trim() || 'Elev', avatar, createdAt: Date.now(), xpTotal: 0, streak: 0, bestStreak: 0,
    lastActiveDay: null, streakFreezes: 0, dailyGoal: 20, hearts: 5, heartsAt: Date.now(), settings: { ...DEFAULT_SETTINGS },
  }
}

export async function createProfile(name: string, avatar: string): Promise<Profile> {
  const p = makeProfile(name, avatar)
  await db.profiles.add(p)
  return p
}

export async function updateProfile(id: string, patch: Partial<Profile>): Promise<void> {
  await db.profiles.update(id, patch)
}

export async function updateSettings(id: string, patch: Partial<ProfileSettings>): Promise<void> {
  const p = await db.profiles.get(id)
  if (p) await db.profiles.update(id, { settings: { ...p.settings, ...patch } })
}

export async function deleteProfile(id: string): Promise<void> {
  await db.transaction('rw', db.profiles, db.progress, db.sessions, db.achievements, async () => {
    await db.progress.where('profileId').equals(id).delete()
    await db.sessions.where('profileId').equals(id).delete()
    await db.achievements.where('profileId').equals(id).delete()
    await db.profiles.delete(id)
  })
}

export async function resetProgress(profileId: string): Promise<void> {
  await db.transaction('rw', db.profiles, db.progress, db.sessions, db.achievements, async () => {
    await db.progress.where('profileId').equals(profileId).delete()
    await db.sessions.where('profileId').equals(profileId).delete()
    await db.achievements.where('profileId').equals(profileId).delete()
    await db.profiles.update(profileId, {
      xpTotal: 0, streak: 0, bestStreak: 0, lastActiveDay: null, streakFreezes: 0, hearts: 5, heartsAt: Date.now(),
    })
  })
}

// ---------- progress ----------

export async function progressMap(profileId: string, wordIds?: string[]): Promise<Map<string, WordProgress>> {
  const rows = wordIds
    ? (await db.progress.bulkGet(wordIds.map((w) => [profileId, w] as [string, string]))).filter((x): x is WordProgress => !!x)
    : await db.progress.where('profileId').equals(profileId).toArray()
  return new Map(rows.map((r) => [r.wordId, r]))
}

export function progressOrNew(map: ReadonlyMap<string, WordProgress>, profileId: string, wordId: string): WordProgress {
  return map.get(wordId) ?? newProgress(profileId, wordId)
}

// ---------- first run ----------

/**
 * First run: creates a profile and the German demo lessons. Each seed lesson is added once
 * (meta `seed:de:<key>`), also on installs that predate it, and never touches existing data.
 */
export async function ensureSeed(): Promise<void> {
  await db.transaction('rw', db.profiles, db.decks, db.words, db.meta, async () => {
    if ((await db.profiles.count()) === 0) {
      const p = makeProfile('Elev', AVATARS[0] as string)
      await db.profiles.add(p)
      await setMeta('activeProfileId', p.id)
    }
    const legacy = await getMeta<boolean>('seed:de1') // first German release: familie, wfragen, zahlen
    for (const seed of GERMAN_SEEDS) {
      const key = `seed:de:${seed.key}`
      if (await getMeta<boolean>(key)) continue
      if (legacy && ['familie', 'wfragen', 'zahlen'].includes(seed.key)) {
        await setMeta(key, true)
        continue
      }
      const items = parseWordList(seed.text).rows.filter((r) => r.valid).map(rowToInput)
      await createDeck(seed.name, items, { course: COURSE, cefr: 'A1', lesson: seed.lesson })
      await setMeta(key, true)
    }
    if (!(await getMeta<number>('installedAt'))) await setMeta('installedAt', Date.now())
    await setMeta('seeded', true)
  })
}

// ---------- lesson tests ----------

export async function testsFor(profileId: string, deckId: string): Promise<TestResult[]> {
  const all = await db.tests.where('deckId').equals(deckId).toArray()
  return all.filter((t) => t.profileId === profileId).sort((a, b) => b.ts - a.ts)
}
