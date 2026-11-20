/** Export / import of ALL data as one JSON file. */
import { db } from './db'

export const BACKUP_VERSION = 2

export interface BackupFile {
  app: 'lexi-path'
  version: number
  exportedAt: number
  decks: unknown[]
  words: unknown[]
  profiles: unknown[]
  progress: unknown[]
  sessions: unknown[]
  achievements: unknown[]
  meta: unknown[]
  /** lesson-test history (absent in v1 backups) */
  tests?: unknown[]
}

export async function exportAll(): Promise<BackupFile> {
  const [decks, words, profiles, progress, sessions, achievements, meta, tests] = await Promise.all([
    db.decks.toArray(), db.words.toArray(), db.profiles.toArray(), db.progress.toArray(),
    db.sessions.toArray(), db.achievements.toArray(), db.meta.toArray(), db.tests.toArray(),
  ])
  return { app: 'lexi-path', version: BACKUP_VERSION, exportedAt: Date.now(), decks, words, profiles, progress, sessions, achievements, meta, tests }
}

export function validateBackup(data: unknown): BackupFile {
  const d = data as Partial<BackupFile> | null
  if (!d || d.app !== 'lexi-path' || typeof d.version !== 'number') throw new Error('invalid_backup')
  if (d.version > BACKUP_VERSION) throw new Error('backup_too_new')
  for (const k of ['decks', 'words', 'profiles', 'progress', 'sessions', 'achievements', 'meta'] as const) {
    if (!Array.isArray(d[k])) throw new Error('invalid_backup')
  }
  return d as BackupFile
}

/** Replaces everything in the database with the backup content. */
export async function importAll(data: unknown): Promise<void> {
  const b = validateBackup(data)
  await db.transaction('rw', [db.decks, db.words, db.profiles, db.progress, db.sessions, db.achievements, db.meta, db.tests], async () => {
    await Promise.all([
      db.decks.clear(), db.words.clear(), db.profiles.clear(), db.progress.clear(),
      db.sessions.clear(), db.achievements.clear(), db.meta.clear(), db.tests.clear(),
    ])
    await db.decks.bulkAdd(b.decks as never[])
    await db.words.bulkAdd(b.words as never[])
    await db.profiles.bulkAdd(b.profiles as never[])
    await db.progress.bulkAdd(b.progress as never[])
    await db.sessions.bulkAdd(b.sessions as never[])
    await db.achievements.bulkAdd(b.achievements as never[])
    await db.meta.bulkAdd(b.meta as never[])
    await db.tests.bulkAdd((b.tests ?? []) as never[])
  })
}

export async function wipeAll(): Promise<void> {
  await db.transaction('rw', [db.decks, db.words, db.profiles, db.progress, db.sessions, db.achievements, db.meta, db.tests], async () => {
    await Promise.all([
      db.decks.clear(), db.words.clear(), db.profiles.clear(), db.progress.clear(),
      db.sessions.clear(), db.achievements.clear(), db.meta.clear(), db.tests.clear(),
    ])
  })
}
