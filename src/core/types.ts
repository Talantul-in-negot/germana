export type Level = 0 | 1 | 2 | 3 | 4 | 5

export type ExerciseType =
  | 'mc_l2_l1'
  | 'mc_l1_l2'
  | 'match'
  | 'listen_choose'
  | 'listen_type'
  | 'type_l1_l2'
  | 'fill_blank'
  | 'sentence_build'
  | 'speak'

export type Quality = 'exact' | 'diacritics' | 'typo'

export interface Deck {
  id: string
  name: string
  createdAt: number
  l2: string
  l1: string
}

export interface Word {
  id: string
  deckId: string
  unitIndex: number
  /** position inside the deck (list order) */
  order: number
  term: string
  translations: string[]
  example?: string
  tags: string[]
}

export interface TypeStats {
  correct: number
  wrong: number
}

export interface WordProgress {
  profileId: string
  wordId: string
  level: Level
  /** cached strength 0-100 at last answer; the UI recomputes with strengthAt() */
  strength: number
  /** days */
  interval: number
  ease: number
  dueAt: number
  lastSeenAt: number
  correctStreak: number
  lapses: number
  consecutiveWrong: number
  /** weighted correct answers accumulated at the current level */
  levelCredit: number
  /** distinct session ids that contributed credit at the current level */
  creditSessions: string[]
  /** distinct calendar days (YYYY-MM-DD) that contributed credit at the current level */
  creditDays: string[]
  lastSessionId: string | null
  lapseSessionId: string | null
  statsByExerciseType: Partial<Record<ExerciseType, TypeStats>>
}

export interface ProfileSettings {
  ttsVoice: string | null
  ttsRate: number
  sound: boolean
  hearts: boolean
  speaking: boolean
}

export interface Profile {
  id: string
  name: string
  avatar: string
  createdAt: number
  xpTotal: number
  streak: number
  bestStreak: number
  /** YYYY-MM-DD of the last day with a finished lesson */
  lastActiveDay: string | null
  streakFreezes: number
  dailyGoal: number
  hearts: number
  heartsAt: number
  settings: ProfileSettings
}

export interface SessionLog {
  id: string
  profileId: string
  /** YYYY-MM-DD */
  date: string
  ts: number
  xp: number
  accuracy: number
  durationSec: number
  wordIds: string[]
  deckId: string
  perfect: boolean
}

export interface Achievement {
  id: string
  profileId: string
  key: string
  unlockedAt: number
}
