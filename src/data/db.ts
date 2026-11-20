import Dexie, { type Table } from 'dexie'
import { assignUnitsFor } from '../core/units'
import type { Achievement, Deck, Profile, SessionLog, TestResult, Word, WordProgress } from '../core/types'

export interface MetaRow {
  key: string
  value: unknown
}

export class LexiDB extends Dexie {
  decks!: Table<Deck, string>
  words!: Table<Word, string>
  profiles!: Table<Profile, string>
  progress!: Table<WordProgress, [string, string]>
  sessions!: Table<SessionLog, string>
  achievements!: Table<Achievement, string>
  meta!: Table<MetaRow, string>
  tests!: Table<TestResult, string>

  constructor(name = 'lexi-path') {
    super(name)
    this.version(1).stores({
      decks: 'id',
      words: 'id, deckId, [deckId+unitIndex]',
      profiles: 'id',
      progress: '[profileId+wordId], profileId, wordId',
      sessions: 'id, profileId, date',
      achievements: 'id, profileId, &[profileId+key]',
      meta: 'key',
    })
    // v2 (German): sub-skills on progress, lesson-test history, gender-colour setting.
    // Existing decks, words and progress are kept as they are; old progress becomes the `meaning` sub-skill.
    this.version(2)
      .stores({
        decks: 'id',
        words: 'id, deckId, [deckId+unitIndex]',
        profiles: 'id',
        progress: '[profileId+wordId], profileId, wordId',
        sessions: 'id, profileId, date',
        achievements: 'id, profileId, &[profileId+key]',
        meta: 'key',
        tests: 'id, profileId, deckId',
      })
      .upgrade(async (tx) => {
        await tx.table('progress').toCollection().modify((p: WordProgress) => {
          p.skills ??= {}
          p.required ??= []
        })
        await tx.table('profiles').toCollection().modify((p: Profile) => {
          p.settings.genderColors ??= true
        })
      })
    // v3 (verbs): per-person forms progress (`persons`) and Conjugare stages (`conj`) are optional
    // fields on progress rows; existing rows are kept exactly as they are.
    this.version(3).stores({
      decks: 'id',
      words: 'id, deckId, [deckId+unitIndex]',
      profiles: 'id',
      progress: '[profileId+wordId], profileId, wordId',
      sessions: 'id, profileId, date',
      achievements: 'id, profileId, &[profileId+key]',
      meta: 'key',
      tests: 'id, profileId, deckId',
    })
    // v4: remove content the learner did not supply (demo deck, assistant-added words, assistant-written
    // example sentences). Progress on the kept words is untouched.
    this.version(4)
      .stores({})
      .upgrade(async (tx) => {
        await cleanSeedContent(tx.table('decks'), tx.table('words'), tx.table('progress'))
      })
    // v5: no locks or time gates any more; the stage-pass dates (`conj`) of Conjugare are obsolete.
    this.version(5)
      .stores({})
      .upgrade(async (tx) => {
        await tx.table('progress').toCollection().modify((p: Record<string, unknown>) => {
          delete p.conj
        })
      })
    // v6: the numbers lesson is "Lektion 1" (it used to be an unnumbered lesson 0).
    this.version(6)
      .stores({})
      .upgrade(async (tx) => {
        await tx.table('decks').toCollection().modify((d: Deck) => {
          if (d.name === 'Zahlen 0–40') {
            d.name = 'Lektion 1 – Zahlen 0–40'
            d.lesson = 1
          }
        })
      })
  }
}

const DEMO_DECK = 'Lektion 1 – Erste Wörter'
/** Shipped lessons -> the only tag that marks words the learner supplied (null = keep all words). */
const SEED_KEEP_TAG: Record<string, string | null> = {
  'Lektion 2 – W-Fragen': null,
  'Lektion 3 – Wochentage': 'wochentage',
  'Lektion 4 – Jahresmonate': 'monate',
  'Lektion 5 – Familie': null,
  'Lektion 6 – Verben (Präsens)': null,
  'Zahlen 0–40': null,
  'Lektion 1 – Zahlen 0–40': null,
}

/** Shared by the v4 upgrade (and its test). */
export async function cleanSeedContent(decks: Table<Deck, string>, words: Table<Word, string>, progress: Table<WordProgress, [string, string]>): Promise<void> {
  const removeWords = async (ids: string[]) => {
    if (!ids.length) return
    await progress.where('wordId').anyOf(ids).delete()
    await words.bulkDelete(ids)
  }
  for (const deck of await decks.toArray()) {
    const mine = await words.where('deckId').equals(deck.id).toArray()
    if (deck.name === DEMO_DECK) {
      await removeWords(mine.map((w) => w.id))
      await decks.delete(deck.id)
      continue
    }
    if (!(deck.name in SEED_KEEP_TAG)) continue
    const keepTag = SEED_KEEP_TAG[deck.name]
    const drop = keepTag ? mine.filter((w) => !(w.tags ?? []).includes(keepTag)) : []
    await removeWords(drop.map((w) => w.id))
    const dropped = new Set(drop.map((w) => w.id))
    const kept = mine.filter((w) => !dropped.has(w.id)).sort((a, b) => a.order - b.order)
    const units = assignUnitsFor(kept)
    await words.bulkPut(
      kept.map((w, i) => {
        const { example: _e, exampleRo: _r, ...rest } = w
        return { ...rest, order: i, unitIndex: units[i] ?? 0 }
      }),
    )
  }
}

export const db = new LexiDB()
