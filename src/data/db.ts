import Dexie, { type Table } from 'dexie'
import type { Achievement, Deck, Profile, SessionLog, Word, WordProgress } from '../core/types'

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
  }
}

export const db = new LexiDB()
