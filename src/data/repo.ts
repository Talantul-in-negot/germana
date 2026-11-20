/** Repository functions over Dexie. Keep UI free of table details. */
import { uid } from '../core/id'
import { parseWordList, type JsonWordInput } from '../core/parser'
import { newProgress } from '../core/srs'
import { assignUnits } from '../core/units'
import type { Deck, Profile, ProfileSettings, Word, WordProgress } from '../core/types'
import { db } from './db'
import { DEMO_DECK_NAME, DEMO_TEXT } from './seed'

export const DEFAULT_SETTINGS: ProfileSettings = { ttsVoice: null, ttsRate: 0.9, sound: true, hearts: false, speaking: false }
export const AVATARS = ['🦊', '🐼', '🐯', '🐸', '🦄', '🐙', '🦉', '🐧', '🐝', '🦖']

// ---------- meta ----------

export async function getMeta<T>(key: string): Promise<T | undefined> {
  return (await db.meta.get(key))?.value as T | undefined
}
export async function setMeta(key: string, value: unknown): Promise<void> {
  await db.meta.put({ key, value })
}

// ---------- decks & words ----------

export async function createDeck(name: string, items: JsonWordInput[], l2 = 'English', l1 = 'Romanian'): Promise<string> {
  const deck: Deck = { id: uid(), name: name.trim() || 'Pachet nou', createdAt: Date.now(), l2, l1 }
  const units = assignUnits(items.length)
  const words: Word[] = items.map((it, i) => {
    const w: Word = {
      id: uid(), deckId: deck.id, unitIndex: units[i] ?? 0, order: i,
      term: it.term.trim(), translations: it.translations, tags: it.tags,
    }
    if (it.example) w.example = it.example
    return w
  })
  await db.transaction('rw', db.decks, db.words, async () => {
    await db.decks.add(deck)
    await db.words.bulkAdd(words)
  })
  return deck.id
}

/** Re-number `order` and `unitIndex` after words were added/removed. */
export async function reindexDeck(deckId: string): Promise<void> {
  const words = (await db.words.where('deckId').equals(deckId).toArray()).sort((a, b) => a.order - b.order)
  const units = assignUnits(words.length)
  await db.words.bulkPut(words.map((w, i) => ({ ...w, order: i, unitIndex: units[i] ?? 0 })))
}

export async function addWords(deckId: string, items: JsonWordInput[]): Promise<void> {
  const existing = await db.words.where('deckId').equals(deckId).toArray()
  let order = existing.reduce((m, w) => Math.max(m, w.order), -1) + 1
  const words: Word[] = items.map((it) => {
    const w: Word = { id: uid(), deckId, unitIndex: 0, order: order++, term: it.term.trim(), translations: it.translations, tags: it.tags }
    if (it.example) w.example = it.example
    return w
  })
  await db.transaction('rw', db.words, async () => {
    await db.words.bulkAdd(words)
    await reindexDeck(deckId)
  })
}

export async function updateWord(id: string, patch: Partial<Pick<Word, 'term' | 'translations' | 'example' | 'tags'>>): Promise<void> {
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

/** Creates the first profile and the demo deck on first launch. Idempotent. */
export async function ensureSeed(): Promise<void> {
  if (await getMeta<boolean>('seeded')) return
  await db.transaction('rw', db.profiles, db.decks, db.words, db.meta, async () => {
    if ((await db.profiles.count()) === 0) {
      const p = makeProfile('Elev', AVATARS[0] as string)
      await db.profiles.add(p)
      await setMeta('activeProfileId', p.id)
    }
    if ((await db.decks.count()) === 0) {
      const parsed = parseWordList(DEMO_TEXT)
      const items: JsonWordInput[] = parsed.rows.filter((r) => r.valid).map((r) => {
        const it: JsonWordInput = { term: r.term, translations: r.translations, tags: r.tags }
        if (r.example) it.example = r.example
        return it
      })
      await createDeck(DEMO_DECK_NAME, items)
    }
    await setMeta('seeded', true)
  })
}
