import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import type { Deck, SessionLog, Word, WordProgress, Achievement } from '../core/types'
import { db } from './db'

export function useDecks(): Deck[] | undefined {
  return useLiveQuery(() => db.decks.orderBy('id').toArray(), [])
}

export function useDeckWords(deckId: string | undefined): Word[] | undefined {
  return useLiveQuery(
    async () => (deckId ? (await db.words.where('deckId').equals(deckId).toArray()).sort((a, b) => a.order - b.order) : []),
    [deckId],
  )
}

export function useProgressMap(profileId: string): Map<string, WordProgress> | undefined {
  const rows = useLiveQuery(() => db.progress.where('profileId').equals(profileId).toArray(), [profileId])
  return useMemo(() => (rows ? new Map(rows.map((r) => [r.wordId, r])) : undefined), [rows])
}

export function useSessions(profileId: string): SessionLog[] | undefined {
  return useLiveQuery(() => db.sessions.where('profileId').equals(profileId).toArray(), [profileId])
}

export function useAchievements(profileId: string): Achievement[] | undefined {
  return useLiveQuery(() => db.achievements.where('profileId').equals(profileId).toArray(), [profileId])
}

export function useMeta<T>(key: string): T | undefined {
  return useLiveQuery(async () => (await db.meta.get(key))?.value as T | undefined, [key])
}
