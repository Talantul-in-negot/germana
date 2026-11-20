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
  | 'type_l2_l1'
  // German-specific
  | 'article'
  | 'plural_type'
  | 'plural_choice'
  | 'verb_forms'
  | 'separable'
  | 'context_choice'
  | 'context_listen'
  | 'match_qa'
  // numbers
  | 'num_listen_digits'
  | 'num_digits_to_word'
  | 'num_word_to_digits'
  | 'num_arith'

export type WordType = 'noun' | 'verb' | 'other'
export type Gender = 'der' | 'die' | 'das'
export type SubSkill = 'meaning' | 'gender' | 'plural' | 'forms'
export type Cefr = 'A1' | 'A2' | 'B1' | 'B2' | 'C1'

export interface VerbInfo {
  present3sg?: string
  praeteritum?: string
  perfekt?: string
  auxiliary?: 'haben' | 'sein'
  separable?: boolean
  irregular?: boolean
}

export type Quality = 'exact' | 'diacritics' | 'typo'

export interface Deck {
  id: string
  name: string
  createdAt: number
  l2: string
  l1: string
  /** textbook / course name, e.g. "Menschen A1" */
  course?: string
  cefr?: Cefr
  /** textbook lesson number used for ordering inside a course */
  lesson?: number
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
  /** German extensions (absent on old/English words => 'other') */
  type?: WordType
  gender?: Gender
  /** plural form WITHOUT article; null = no plural, undefined = unknown */
  plural?: string | null
  pluralOnly?: boolean
  verb?: VerbInfo
  /** additional accepted German variants (display form, with article for nouns) */
  alternatives?: string[]
  /** numeric value for number words (tag n=21) */
  value?: number
  /** group label for numbers (tag 11-20) */
  group?: string
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
  /**
   * Top-level fields above are the `meaning` sub-skill (so pre-German progress migrates for free).
   * Other sub-skills keep their own full SRS state here.
   */
  skills?: Partial<Record<Exclude<SubSkill, 'meaning'>, SkillProgress>>
  /** sub-skills this word requires besides meaning (derived from the word) */
  required?: Exclude<SubSkill, 'meaning'>[]
}

export type SkillProgress = Omit<WordProgress, 'skills' | 'required'>

export interface ProfileSettings {
  ttsVoice: string | null
  ttsRate: number
  sound: boolean
  hearts: boolean
  speaking: boolean
  /** der = blue, die = red, das = green */
  genderColors: boolean
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

export interface TestWordResult {
  wordId: string
  term: string
  group?: string
  /** direction results: null = not tested (e.g. no example) */
  deToRo: { ok: boolean; given: string; expected: string } | null
  roToDe: { ok: boolean; given: string; expected: string } | null
  context: { ok: boolean; given: string; expected: string } | null
}

export interface TestResult {
  id: string
  profileId: string
  deckId: string
  ts: number
  date: string
  score: number
  total: number
  correct: number
  words: TestWordResult[]
  verified: boolean
}
