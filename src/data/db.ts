import Dexie, { type Table } from 'dexie'
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
  }
}

export const db = new LexiDB()
