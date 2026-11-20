/** Exercise generation + evaluation from a deck. Pure. */
import { checkAnswer, checkRomanian, fold, normalize, type CheckResult } from './answer'
import { checkDigits, checkGermanAnswer, type DeNote, type DeTarget } from './answerDe'
import { ENDINGS, PERSONS, allFormsFor, analyzeSentence, checkForm, distinctForms, hasPresent, isSeinHaben, rewriteSentence, sentencesOf } from './conjugation'
import { MONTHS, SEASONS, SEASON_OF_MONTH, seqOf, splitArticle, splitDialogue, type SeqSet } from './german'
import { shuffle } from './id'
import { allNumberWords, isCompoundNumber, numberBreakdown, numberDistractors, numberToGerman, type NumPart } from './numbers'
import { BAND_TYPES, bandForLevel, requiredSkills, type Band } from './srs'
import type { ExerciseType, Gender, Quality, SubSkill, Word } from './types'

interface Base {
  id: string
  wordId: string
}

export interface ChoiceExercise extends Base {
  type: 'mc_l2_l1' | 'mc_l1_l2' | 'listen_choose' | 'fill_blank' | 'plural_choice' | 'context_choice' | 'context_listen' | 'num_word_to_digits' | 'seq_neighbor' | 'fill_prep' | 'listen_ro' | 'month_season' | 'season_months' | 'collective' | 'possessive' | 'verb_dropdown' | 'verb_pronoun' | 'verb_listen_blank' | 'verb_dropdown' | 'verb_pronoun' | 'verb_listen_blank'
  prompt: string
  /** sentence with the word masked (fill_blank / context) */
  sentence?: string
  options: string[]
  answerIndex: number
  /** text to read aloud (L2) */
  speak?: string
  /** sub-skill credited by this exercise (default meaning) */
  skill?: SubSkill
  /** number value, to show the ein+und+zwanzig breakdown */
  value?: number
  /** present-tense person (0..5) this exercise trains */
  person?: number
  /** dropdown inside a sentence (verb_dropdown) */
  inline?: { before: string; after: string }
  /** TTS reads before, beeps for the blank, reads after (verb_listen_blank) */
  speakParts?: [string, string]
}

export interface MatchExercise extends Base {
  type: 'match' | 'match_qa' | 'gender_pairs' | 'verb_endings'
  /** `wordId` of each pair; the exercise's own wordId is the target */
  pairs: { wordId: string; left: string; right: string }[]
}

export interface TypeExercise extends Base {
  type: 'type_l1_l2' | 'type_l2_l1' | 'listen_type' | 'speak' | 'plural_type' | 'num_listen_digits' | 'num_digits_to_word' | 'num_arith' | 'seq_neighbor_type' | 'verb_pronoun_type'
  prompt: string
  accepted: string[]
  speak?: string
  /** German checker target (when present, the German rules apply) */
  de?: DeTarget & { ignoreArticle?: boolean }
  /** Romanian answer: accepted with/without definite article */
  ro?: { translations: string[] }
  /** Romanian words of the course (a typo must not produce another one: iunie/iulie) */
  roLexicon?: string[]
  /** conjugated form: EXACT match, no typo tolerance */
  exact?: { expected: string; person: number }
  /** accepted digits (number listening) */
  digits?: number
  lexicon?: string[]
  skill?: SubSkill
  value?: number
}

export interface SentenceExercise extends Base {
  type: 'sentence_build' | 'verb_sentence_build'
  prompt: string
  solution: string[]
  bank: string[]
  speak: string
  /** do not read the German sentence aloud (it would give the answer away) */
  noSpeak?: boolean
}

export interface ArticleExercise extends Base {
  type: 'article'
  /** bare noun */
  noun: string
  answer: Gender
  translation: string
  speak: string
  skill: 'gender'
}

export interface VerbFormsExercise extends Base {
  type: 'verb_forms'
  infinitive: string
  translation: string
  fields: { key: 'present3sg' | 'praeteritum' | 'perfekt'; label: string; expected: string }[]
  skill: 'forms'
}

export interface SeparableExercise extends Base {
  type: 'separable'
  /** text segments around two blanks: [before, between, after] */
  parts: [string, string, string]
  answers: [string, string]
  translation: string
  skill: 'forms'
}

export interface SequenceExercise extends Base {
  type: 'seq_order'
  /** which set (wochentage / monate / jahreszeiten) */
  set: string
  /** the set in order (Montag first) */
  days: string[]
  /** shown names per slot; null = the learner fills this slot */
  given: (string | null)[]
  /** shuffled words to place */
  bank: string[]
}

export type Exercise =
  | ChoiceExercise | MatchExercise | TypeExercise | SentenceExercise | ArticleExercise | VerbFormsExercise | SeparableExercise | SequenceExercise

export interface BuildContext {
  /** all words of the deck (for distractors / pairs) */
  deckWords: Word[]
  rng: () => number
  newId: () => string
  /** number words the learner has already seen (mini-arithmetic) */
  seenNumbers?: Word[]
  /** effective level of the target word (partial vs full sequence, dropdown size) */
  level?: number
  /** present-tense person to practise (the weakest one) */
  person?: number
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

const lexCache = new WeakMap<Word[], string[]>()

/** Lowercase German words of the course: used to reject "typos" that are other words. */
export function lexiconOf(words: Word[]): string[] {
  const hit = lexCache.get(words)
  if (hit) return hit
  const out = new Set<string>()
  let hasNumbers = false
  for (const w of words) {
    for (const t of [w.term, ...(w.alternatives ?? [])]) {
      out.add(t.toLowerCase())
      out.add(splitArticle(t).rest.toLowerCase())
    }
    if (w.plural) out.add(w.plural.toLowerCase())
    if (w.verb) {
      for (const f of [w.verb.present3sg, w.verb.praeteritum, w.verb.perfekt]) {
        if (f) for (const tok of f.toLowerCase().split(/\s+/)) out.add(tok)
      }
    }
    if (w.value !== undefined) hasNumbers = true
  }
  if (hasNumbers) for (const n of allNumberWords()) out.add(n)
  const list = [...out]
  lexCache.set(words, list)
  return list
}

export function hasMaskableExample(w: Word): boolean {
  return !!w.example && maskTerm(w.example, w.term) !== null
}

export function hasSentence(w: Word): boolean {
  return !!w.example && w.example.trim().split(/\s+/).length >= 3
}

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Replace the term in the sentence by "_____". null if the term does not occur. */
export function maskTerm(sentence: string, term: string, blank = '_____'): string | null {
  const bare = term.trim().replace(/[?!.,;:]+$/, '')
  if (!bare) return null
  const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(bare)}(?![\\p{L}\\p{N}])`, 'iu')
  return re.test(sentence) ? sentence.replace(re, blank) : null
}

/**
 * "Wo wohnst du? – In Timișoara." with the word blanked in the question part. Months/weekdays blank
 * the noun in the answer ("Wann hast du Geburtstag? – Im ___."); words of type `other`
 * (heute/morgen/gestern …) without a dialogue blank the word inside the whole example sentence.
 */
export function contextOf(w: Word): { sentence: string; question: string; answer: string } | null {
  const d = splitDialogue(w.example)
  if (d) {
    const masked = maskTerm(d.question, w.term, '___')
    if (masked) return { sentence: `${masked} – ${d.answer}`, question: d.question, answer: d.answer }
    if (seqOf(w) || isFamilyWord(w)) {
      const am = maskTerm(d.answer, splitArticle(w.term).rest, '___')
      if (am) return { sentence: `${d.question} – ${am}`, question: d.question, answer: d.answer }
    }
    return null
  }
  if (w.verb?.present && w.example) {
    const sents = sentencesOf(w).map((x) => x.de)
    const pick = sents.find((x) => x.trim().endsWith('?')) ?? sents[0]
    const b = pick ? analyzeSentence(pick, w.verb.present) : null
    if (b) return { sentence: `${b.before}___${b.after}`, question: pick as string, answer: '' }
  }
  if (w.type === 'other' && w.example) {
    const masked = maskTerm(w.example, w.term, '___')
    return masked ? { sentence: masked, question: w.example, answer: '' } : null
  }
  return null
}

const FAMILY_TAGS = ['kernfamilie', 'verwandte']
export const isFamilyWord = (w: Word): boolean => (w.tags ?? []).some((t) => FAMILY_TAGS.includes(t))

/** Male <-> female partners (bare names; Opa/Oma are variants of Großvater/Großmutter). */
export const FAMILY_PAIRS: readonly (readonly [string, string])[] = [
  ['Bruder', 'Schwester'], ['Sohn', 'Tochter'], ['Onkel', 'Tante'], ['Cousin', 'Cousine'], ['Vater', 'Mutter'], ['Opa', 'Oma'],
]
/** Collective words and the members they are made of. */
export const COLLECTIVES: readonly { word: string; parts: readonly [string, string] }[] = [
  { word: 'Eltern', parts: ['Mutter', 'Vater'] },
  { word: 'Geschwister', parts: ['Bruder', 'Schwester'] },
  { word: 'Kinder', parts: ['Tochter', 'Sohn'] },
  { word: 'Großeltern', parts: ['Oma', 'Opa'] },
]

const variantsOf = (w: Word): string[] => [w.term, ...(w.alternatives ?? [])].map((t) => splitArticle(t).rest.toLowerCase())

/** The male/female partner of a family word that is present in the deck. */
export function partnerOf(w: Word, deckWords: Word[]): Word | null {
  const mine = variantsOf(w)
  for (const [m, f] of FAMILY_PAIRS) {
    const side = mine.includes(m.toLowerCase()) ? f : mine.includes(f.toLowerCase()) ? m : null
    if (!side) continue
    const p = deckWords.find((x) => x.id !== w.id && variantsOf(x).includes(side.toLowerCase()))
    if (p) return p
  }
  return null
}

export const hasDialogue = (w: Word): boolean => !!splitDialogue(w.example) && !!contextOf(w)

/** Words of an ordered set found in a deck, one per position, in order. */
export function setWordsOf(words: Word[], set: SeqSet): Word[] {
  const byIdx = new Map<number, Word>()
  for (const w of words) {
    const s = seqOf(w)
    if (s && s.set.tag === set.tag && !byIdx.has(s.index)) byIdx.set(s.index, w)
  }
  return [...byIdx.entries()].sort((a, b) => a[0] - b[0]).map(([, w]) => w)
}

export const isSetComplete = (words: Word[], set: SeqSet): boolean => setWordsOf(words, set).length === set.names.length

const bareOf = (w: Word): string => splitArticle(w.term).rest

/** "Am Montag habe ich Schule." -> "___ Montag habe ich Schule." (answer: am / im) */
export function maskPrep(w: Word): string | null {
  const info = seqOf(w)
  if (!info || !w.example) return null
  const names = [w.term, ...(w.alternatives ?? [])].map((t) => escapeRe(splitArticle(t).rest))
  const re = new RegExp(`(?<![\\p{L}])(am|im)(?=\\s+(?:${names.join('|')})(?![\\p{L}]))`, 'iu')
  return re.test(w.example) ? w.example.replace(re, '___') : null
}

function separableParts(w: Word): { parts: [string, string, string]; answers: [string, string] } | null {
  if (!w.verb?.separable || !w.example || !w.verb.present3sg) return null
  const particle = w.verb.present3sg.trim().split(/\s+/).slice(-1)[0] as string
  const inf = w.term.toLowerCase()
  const stemBase = inf.startsWith(particle) ? inf.slice(particle.length).replace(/(e?n)$/, '') : inf.replace(/(e?n)$/, '')
  const toks = w.example.split(/\s+/)
  const pi = toks.findIndex((t, i) => t.replace(/[.,!?]/g, '').toLowerCase() === particle && i > 0)
  const vi = toks.findIndex((t) => t.replace(/[.,!?]/g, '').toLowerCase().startsWith(stemBase.slice(0, Math.max(2, stemBase.length - 1))))
  if (pi < 0 || vi < 0 || vi >= pi) return null
  const strip = (s: string): string => s.replace(/[.,!?]+$/, '')
  const a1 = strip(toks[vi] as string)
  const a2 = strip(toks[pi] as string)
  const tail = (toks[pi] as string).slice(a2.length)
  return {
    parts: [toks.slice(0, vi).join(' ') + (vi > 0 ? ' ' : ''), ' ' + toks.slice(vi + 1, pi).join(' ') + (pi - vi > 1 ? ' ' : ''), tail ? tail : ''],
    answers: [a1, a2],
  }
}

export function availableTypes(w: Word, deckSize: number, speakEnabled: boolean): Set<ExerciseType> {
  const s = new Set<ExerciseType>(['mc_l2_l1', 'mc_l1_l2', 'listen_choose', 'listen_ro', 'type_l1_l2', 'listen_type'])
  if (deckSize >= 3) s.add('match')
  if (hasMaskableExample(w) && deckSize >= 3) s.add('fill_blank')
  if (hasSentence(w)) s.add('sentence_build')
  if (speakEnabled) s.add('speak')
  if (deckSize >= 4 && contextOf(w)) {
    s.add('context_choice')
    s.add('context_listen')
    if (hasDialogue(w) && !seqOf(w)) s.add('match_qa')
  }
  return s
}

const BAND_ORDER: Band[] = ['recognition', 'recall', 'production']

/**
 * Pick an exercise type matching the word's level band. Falls back inside the band,
 * then to the nearest other band (towards easier first). Avoids `lastType` when possible.
 */
export function chooseType(
  w: Word,
  level: number,
  ctx: { deckSize: number; speakEnabled: boolean; rng: () => number },
  lastType?: ExerciseType,
): ExerciseType {
  const avail = availableTypes(w, ctx.deckSize, ctx.speakEnabled)
  const band = bandForLevel(level)
  const idx = BAND_ORDER.indexOf(band)
  const order = [idx, idx - 1, idx + 1, idx - 2, idx + 2].filter((i) => i >= 0 && i < 3)
  for (const bi of order) {
    const types = BAND_TYPES[BAND_ORDER[bi] as Band].filter((t) => avail.has(t))
    if (!types.length) continue
    const fresh = types.filter((t) => t !== lastType)
    const pool = fresh.length ? fresh : types
    return pool[Math.floor(ctx.rng() * pool.length)] as ExerciseType
  }
  return 'mc_l2_l1'
}

export interface PlanInfo {
  /** effective word level */
  level: number
  skillLevels: Partial<Record<SubSkill, number>>
  seenNumbers: Word[]
  /** ordered sets (by tag) that are complete in this deck: sequence / next-previous possible */
  completeSets?: string[]
  /** the deck has the seasons (month -> season exercises) */
  hasSeasons?: boolean
  /** the deck has male/female family pairs (gender pairs) */
  hasPairs?: boolean
  /** strength (0-100) of each person of a present-tense verb */
  personStrengths?: number[]
  /** the deck has collective words (Eltern, Geschwister …) */
  collectives?: boolean
}

/** Like `chooseType`, but also schedules sub-skill drills (article / plural / forms) and number exercises. */
export function chooseTypeFor(
  w: Word,
  info: PlanInfo,
  ctx: { deckSize: number; speakEnabled: boolean; rng: () => number },
  lastType?: ExerciseType,
): ExerciseType {
  const pick = (list: ExerciseType[]): ExerciseType => {
    const fresh = list.filter((t) => t !== lastType)
    const pool = fresh.length ? fresh : list
    return pool[Math.floor(ctx.rng() * pool.length)] as ExerciseType
  }
  const seq = seqOf(w)
  if (seq) {
    const band = bandForLevel(info.level)
    const full = (info.completeSets ?? []).includes(seq.set.tag)
    const prep = maskPrep(w) !== null
    const seasons = seq.set.tag === 'monate' && info.hasSeasons === true
    const months = seq.set.tag === 'jahreszeiten'
    if (band === 'recognition') return pick(['listen_ro', 'mc_l2_l1', 'listen_choose'])
    if (band === 'recall') {
      return pick([
        ...(full ? (['seq_neighbor', 'seq_order'] as const) : []), ...(prep ? (['fill_prep'] as const) : []),
        ...(seasons ? (['month_season'] as const) : []), ...(months ? (['season_months'] as const) : []), 'mc_l1_l2',
      ])
    }
    return pick([
      ...(full ? (['seq_neighbor_type', 'seq_order'] as const) : []), ...(prep ? (['fill_prep'] as const) : []),
      ...(seasons ? (['month_season'] as const) : []), 'type_l1_l2',
    ])
  }
  if (isFamilyWord(w) && info.level >= 1) {
    const r = ctx.rng()
    if (info.hasPairs && r < 0.25) return 'gender_pairs'
    if (info.collectives && COLLECTIVES.some((c) => c.word === splitArticle(w.term).rest) && r < 0.5) return 'collective'
    if (w.gender && r < 0.4) return 'possessive'
  }
  if (w.value !== undefined) {
    const band = bandForLevel(info.level)
    if (band === 'recognition') return pick(['num_word_to_digits', 'mc_l2_l1'])
    if (band === 'recall') return pick(['num_listen_digits', 'num_word_to_digits', 'mc_l1_l2'])
    return pick(info.seenNumbers.length >= 2 ? ['num_digits_to_word', 'num_arith', 'num_listen_digits'] : ['num_digits_to_word', 'num_listen_digits'])
  }
  if (hasPresent(w) && info.level >= 1 && ctx.rng() < 0.7) {
    const band = bandForLevel(info.level)
    const regular = !w.verb?.irregular
    const ro = sentencesOf(w).some((x) => x.ro)
    if (band === 'recognition') return pick(['verb_dropdown', 'verb_listen_blank', ...(regular ? (['verb_endings'] as const) : [])])
    if (band === 'recall') return pick(['verb_pronoun', 'context_choice', 'verb_dropdown', ...(ro ? (['verb_sentence_build'] as const) : [])])
    return pick(['verb_pronoun_type', 'verb_dropdown', ...(ro ? (['verb_sentence_build'] as const) : [])])
  }
  if (info.level >= 1 && !hasPresent(w)) {
    const req = requiredSkills(w)
    if (req.includes('gender') && ctx.rng() < 0.4) return 'article'
    if (req.includes('plural') && ctx.rng() < (isUmlautPlural(w) ? 0.65 : 0.3)) return (info.skillLevels.plural ?? 0) <= 1 ? 'plural_choice' : 'plural_type'
    if (req.includes('forms')) {
      if (separableParts(w) && ctx.rng() < 0.4) return 'separable'
      if (ctx.rng() < 0.5) return 'verb_forms'
    }
  }
  return chooseType(w, info.level, ctx, lastType)
}

/** Mütter, Väter, Brüder, Söhne …: the plural adds an umlaut the singular lacks. */
export function isUmlautPlural(w: Word): boolean {
  return !!w.plural && !w.pluralOnly && /[äöü]/i.test(w.plural) && !/[äöü]/i.test(splitArticle(w.term).rest)
}

const primary = (w: Word): string => w.translations[0] ?? ''

function pickTranslation(w: Word, rng: () => number): string {
  return w.translations[Math.floor(rng() * w.translations.length)] ?? ''
}

/** Distractor words: other words whose accepted answers do not overlap with the target's. */
function distractors(target: Word, pool: Word[], count: number, rng: () => number, key: (w: Word) => string[]): Word[] {
  const bad = new Set(key(target).map((x) => fold(x)))
  const out: Word[] = []
  const used = new Set<string>(bad)
  for (const w of shuffle(pool, rng)) {
    if (w.id === target.id) continue
    const ks = key(w).map((x) => fold(x))
    if (ks.some((k) => used.has(k))) continue
    ks.forEach((k) => used.add(k))
    out.push(w)
    if (out.length >= count) break
  }
  return out
}

function choice(
  base: Pick<ChoiceExercise, 'id' | 'wordId' | 'type' | 'prompt'> & Partial<ChoiceExercise>,
  correct: string,
  wrong: string[],
  rng: () => number,
): ChoiceExercise {
  const options = shuffle([correct, ...wrong], rng)
  return { ...base, options, answerIndex: options.indexOf(correct) }
}

export function tokenize(sentence: string): string[] {
  return sentence.trim().split(/\s+/).filter(Boolean)
}

const deTarget = (w: Word, withValue = true): DeTarget => {
  const t: DeTarget = { term: w.term }
  if (w.alternatives?.length) t.alternatives = w.alternatives
  if (withValue && w.value !== undefined) t.value = w.value
  return t
}

/** Plausible wrong plurals for a choice exercise. */
export function pluralVariants(noun: string, correct: string, rng: () => number): string[] {
  const cands = new Set<string>()
  const um = (s: string): string => {
    const i = s.search(/[aouAOU][^aouAOU]*$/)
    if (i < 0) return s
    const m: Record<string, string> = { a: 'ä', o: 'ö', u: 'ü', A: 'Ä', O: 'Ö', U: 'Ü' }
    return s.slice(0, i) + (m[s[i] as string] as string) + s.slice(i + 1)
  }
  for (const suf of ['', 'e', 'er', 'n', 'en', 's']) {
    cands.add(noun + suf)
    cands.add(um(noun) + suf)
  }
  cands.delete(correct)
  return shuffle([...cands], rng).slice(0, 3)
}

/**
 * Options of a conjugation dropdown. Levels 0-1: 3 options (sein/haben: one distractor comes from
 * the other verb). Levels 2+: ALL distinct forms (sein/haben: of both verbs).
 */
export function verbOptions(w: Word, deckWords: Word[], level: number, correct: string, rng: () => number): string[] {
  const own = distinctForms(w.verb?.present ?? [])
  if (level >= 2) return shuffle(allFormsFor(w, deckWords), rng)
  const same = shuffle(own.filter((f) => f !== correct), rng)
  if (isSeinHaben(w)) {
    const other = deckWords.find((x) => x.id !== w.id && isSeinHaben(x))
    const alt = shuffle(distinctForms(other?.verb?.present ?? []).filter((f) => f !== correct && !own.includes(f)), rng)
    return shuffle([correct, ...same.slice(0, 1), ...alt.slice(0, 1)], rng)
  }
  return shuffle([correct, ...same.slice(0, 2)], rng)
}

export function buildExercise(w: Word, type: ExerciseType, ctx: BuildContext): Exercise {
  const { deckWords, rng } = ctx
  const id = ctx.newId()
  const base = { id, wordId: w.id }
  const isDe = w.type !== undefined
  const lexicon = isDe ? lexiconOf(deckWords) : undefined

  switch (type) {
    case 'mc_l2_l1': {
      const correct = pickTranslation(w, rng)
      const wrong = distractors(w, deckWords, 3, rng, (x) => x.translations).map(primary)
      return choice({ ...base, type, prompt: w.term, speak: w.term }, correct, wrong, rng)
    }
    case 'mc_l1_l2': {
      const wrong = distractors(w, deckWords, 3, rng, (x) => [x.term]).map((x) => x.term)
      return choice({ ...base, type, prompt: pickTranslation(w, rng) }, w.term, wrong, rng)
    }
    case 'listen_choose': {
      const wrong = distractors(w, deckWords, 3, rng, (x) => [x.term]).map((x) => x.term)
      return choice({ ...base, type, prompt: w.term, speak: w.term }, w.term, wrong, rng)
    }
    case 'fill_blank': {
      const masked = w.example ? maskTerm(w.example, w.term) : null
      if (!masked) return buildExercise(w, 'mc_l1_l2', ctx)
      const wrong = distractors(w, deckWords, 3, rng, (x) => [x.term]).map((x) => x.term)
      return choice({ ...base, type, prompt: primary(w), sentence: masked, speak: w.example as string }, w.term, wrong, rng)
    }
    case 'match': {
      const others = distractors(w, deckWords, 4, rng, (x) => [x.term, ...x.translations])
      const pairs = shuffle([w, ...others], rng).map((x) => ({ wordId: x.id, left: x.term, right: primary(x) }))
      return { ...base, type, pairs }
    }
    case 'match_qa': {
      const ctxs = [w, ...shuffle(deckWords.filter((x) => x.id !== w.id), rng)].filter((x) => contextOf(x)).slice(0, 4)
      if (ctxs.length < 3 || ctxs[0]?.id !== w.id) return buildExercise(w, 'mc_l2_l1', ctx)
      const pairs = shuffle(ctxs, rng).map((x) => {
        const d = splitDialogue(x.example) as { question: string; answer: string }
        return { wordId: x.id, left: d.question, right: d.answer }
      })
      return { ...base, type, pairs }
    }
    case 'type_l1_l2': {
      const ex: TypeExercise = { ...base, type, prompt: primary(w), accepted: [w.term] }
      if (isDe) {
        ex.de = deTarget(w)
        ex.lexicon = lexicon as string[]
      }
      return ex
    }
    case 'type_l2_l1':
      return {
        ...base, type, prompt: w.term, accepted: w.translations, ro: { translations: w.translations }, speak: w.term,
        roLexicon: deckWords.flatMap((x) => x.translations),
      }
    case 'listen_type': {
      const ex: TypeExercise = { ...base, type, prompt: '', accepted: [w.term], speak: w.term }
      if (isDe) {
        ex.de = deTarget(w)
        ex.lexicon = lexicon as string[]
      }
      return ex
    }
    case 'speak': {
      const ex: TypeExercise = { ...base, type, prompt: primary(w), accepted: [w.term] }
      if (isDe) ex.de = { ...deTarget(w), ignoreArticle: true }
      return ex
    }
    case 'sentence_build': {
      if (!w.example || !hasSentence(w)) return buildExercise(w, 'type_l1_l2', ctx)
      const solution = tokenize(w.example)
      let bank = shuffle(solution, rng)
      for (let i = 0; i < 5 && bank.join(' ') === solution.join(' '); i++) bank = shuffle(solution, rng)
      return { ...base, type, prompt: `${w.term} = ${primary(w)}`, solution, bank, speak: w.example }
    }
    case 'article': {
      if (!w.gender) return buildExercise(w, 'mc_l1_l2', ctx)
      return { ...base, type, noun: splitArticle(w.term).rest, answer: w.gender, translation: primary(w), speak: w.term, skill: 'gender' }
    }
    case 'plural_type': {
      if (!w.plural) return buildExercise(w, 'mc_l1_l2', ctx)
      return {
        ...base, type, prompt: w.term, accepted: [w.plural], speak: w.term, skill: 'plural',
        de: { term: w.plural, ignoreArticle: true, ...(w.pluralAlternatives?.length ? { alternatives: w.pluralAlternatives } : {}) }, lexicon: lexicon ?? [],
      }
    }
    case 'plural_choice': {
      if (!w.plural) return buildExercise(w, 'mc_l1_l2', ctx)
      const bare = splitArticle(w.term).rest
      const alts = new Set(w.pluralAlternatives ?? [])
      return choice({ ...base, type, prompt: w.term, skill: 'plural', speak: w.term }, w.plural, pluralVariants(bare, w.plural, rng).filter((x) => !alts.has(x)), rng)
    }
    case 'verb_forms': {
      const v = w.verb
      const fields: VerbFormsExercise['fields'] = []
      if (v?.present3sg) fields.push({ key: 'present3sg', label: 'er/sie/es', expected: v.present3sg })
      if (v?.praeteritum) fields.push({ key: 'praeteritum', label: 'Präteritum', expected: v.praeteritum })
      if (v?.perfekt) fields.push({ key: 'perfekt', label: 'Perfekt', expected: v.perfekt })
      if (!fields.length) return buildExercise(w, 'mc_l1_l2', ctx)
      return { ...base, type, infinitive: w.term, translation: primary(w), fields, skill: 'forms' }
    }
    case 'separable': {
      const sp = separableParts(w)
      if (!sp) return buildExercise(w, 'verb_forms', ctx)
      return { ...base, type, parts: sp.parts, answers: sp.answers, translation: primary(w), skill: 'forms' }
    }
    case 'context_choice': {
      const c = contextOf(w)
      if (!c) return buildExercise(w, 'mc_l1_l2', ctx)
      if (hasPresent(w)) {
        const b = analyzeSentence(c.question, w.verb.present)
        if (b) {
          const forms = verbOptions(w, deckWords, ctx.level ?? 2, b.answer, rng)
          return choice({ ...base, type, prompt: primary(w), sentence: c.sentence, speak: c.question, skill: 'forms', person: b.person }, b.answer, forms.filter((o) => o !== b.answer), rng)
        }
      }
      const withCtx = deckWords.filter((x) => x.id !== w.id && contextOf(x))
      const rest = deckWords.filter((x) => x.id !== w.id && !contextOf(x) && x.type !== 'noun')
      const sameGender = (x: Word): number => (isFamilyWord(w) && x.gender === w.gender ? 0 : 1)
      const pool = [...shuffle(withCtx, rng).sort((a, b) => sameGender(a) - sameGender(b)), ...shuffle(rest, rng)]
      const bare = (t: string): string => splitArticle(t).rest.replace(/[?!.]+$/, '')
      const wrong = distractors(w, pool, 3, () => 0.5, (x) => [x.term]).map((x) => bare(x.term))
      return choice({ ...base, type, prompt: primary(w), sentence: c.sentence, speak: c.question }, bare(w.term), wrong, rng)
    }
    case 'context_listen': {
      const c = contextOf(w)
      if (!c) return buildExercise(w, 'mc_l2_l1', ctx)
      const withCtx = deckWords.filter((x) => x.id !== w.id && contextOf(x))
      const pool = [...shuffle(withCtx, rng), ...shuffle(deckWords.filter((x) => x.id !== w.id && !contextOf(x)), rng)]
      const wrong = distractors(w, pool, 3, () => 0.5, (x) => x.translations).map(primary)
      return choice({ ...base, type, prompt: '', sentence: c.sentence, speak: c.question }, pickTranslation(w, rng), wrong, rng)
    }
    // ---- present-tense verbs ----
    case 'verb_dropdown':
    case 'verb_listen_blank': {
      if (!hasPresent(w)) return buildExercise(w, 'mc_l2_l1', ctx)
      const present = w.verb.present
      const sents = sentencesOf(w).map((x) => x.de)
      let sentence = sents[Math.floor(rng() * sents.length)] ?? ''
      if (ctx.person !== undefined && rng() < 0.5) sentence = rewriteSentence(sentence, present, ctx.person) ?? sentence
      const b = analyzeSentence(sentence, present)
      if (!b) return buildExercise(w, 'verb_pronoun', ctx)
      const options = verbOptions(w, deckWords, ctx.level ?? 0, b.answer, rng)
      const ex = choice({ ...base, type, prompt: '', skill: 'forms', person: b.person, sentence: `${b.before}___${b.after}` }, b.answer, options.filter((o) => o !== b.answer), rng)
      if (type === 'verb_dropdown') ex.inline = { before: b.before, after: b.after }
      else ex.speakParts = [b.before, b.after]
      return ex
    }
    case 'verb_pronoun':
    case 'verb_pronoun_type': {
      if (!hasPresent(w)) return buildExercise(w, 'mc_l2_l1', ctx)
      const p = ctx.person ?? Math.floor(rng() * 6)
      const answer = w.verb.present[p] as string
      const prompt = `${PERSONS[p]} ___ (${w.term})`
      if (type === 'verb_pronoun_type') {
        return { ...base, type, prompt, accepted: [answer], exact: { expected: answer, person: p }, skill: 'forms' }
      }
      const options = verbOptions(w, deckWords, ctx.level ?? 0, answer, rng)
      return choice({ ...base, type, prompt, skill: 'forms', person: p }, answer, options.filter((o) => o !== answer), rng)
    }
    case 'verb_endings': {
      if (!hasPresent(w) || w.verb.irregular) return buildExercise(w, 'verb_pronoun', ctx)
      const pairs = PERSONS.map((label, i) => ({ wordId: `p${i}`, left: label, right: `-${ENDINGS[i]}` }))
      return { ...base, type, pairs }
    }
    case 'verb_sentence_build': {
      const s = sentencesOf(w).filter((x) => x.ro)
      const pick = s[Math.floor(rng() * s.length)]
      if (!pick || !pick.ro) return buildExercise(w, 'verb_dropdown', ctx)
      const solution = tokenize(pick.de)
      let bank = shuffle(solution, rng)
      for (let i = 0; i < 5 && bank.join(' ') === solution.join(' '); i++) bank = shuffle(solution, rng)
      return { ...base, type, prompt: pick.ro, solution, bank, speak: pick.de, noSpeak: true }
    }
    // ---- family ----
    case 'gender_pairs': {
      const mate = partnerOf(w, deckWords)
      if (!mate) return buildExercise(w, 'mc_l2_l1', ctx)
      const male = (x: Word): boolean => x.gender === 'der'
      const mk = (a: Word, b: Word, id: string): { wordId: string; left: string; right: string } =>
        male(a) ? { wordId: id, left: a.term, right: b.term } : { wordId: id, left: b.term, right: a.term }
      const pairs = [mk(w, mate, w.id)]
      const used = new Set([w.id, mate.id])
      for (const x of shuffle(deckWords, rng)) {
        if (pairs.length >= 4) break
        if (used.has(x.id) || !isFamilyWord(x)) continue
        const m = partnerOf(x, deckWords)
        if (!m || used.has(m.id)) continue
        used.add(x.id)
        used.add(m.id)
        pairs.push(mk(x, m, male(x) ? x.id : m.id))
      }
      if (pairs.length < 3) return buildExercise(w, 'mc_l2_l1', ctx)
      return { ...base, type, pairs: shuffle(pairs, rng) }
    }
    case 'collective': {
      const bare = splitArticle(w.term).rest
      const c = COLLECTIVES.find((x) => x.word === bare)
      if (!c) return buildExercise(w, 'mc_l2_l1', ctx)
      const others = shuffle(deckWords.filter((x) => x.id !== w.id && COLLECTIVES.some((y) => y.word === splitArticle(x.term).rest)), rng)
      return choice({ ...base, type, prompt: `${c.parts[0]} + ${c.parts[1]} = ?` }, w.term, others.slice(0, 3).map((x) => x.term), rng)
    }
    case 'possessive': {
      if (!w.gender) return buildExercise(w, 'mc_l1_l2', ctx)
      const feminine = w.gender === 'die'
      const correct = feminine ? 'meine' : 'mein'
      const wrong = (feminine ? ['mein', 'deine', 'dein'] : ['meine', 'dein', 'deine'])
      return choice({ ...base, type, prompt: `___ ${splitArticle(w.term).rest}`, skill: 'gender', speak: w.term }, correct, wrong, rng)
    }
    // ---- ordered sets: weekdays, months, seasons ----
    case 'listen_ro': {
      const wrong = distractors(w, deckWords, 3, rng, (x) => x.translations).map(primary)
      return choice({ ...base, type, prompt: '', speak: w.term }, pickTranslation(w, rng), wrong, rng)
    }
    case 'fill_prep': {
      const masked = maskPrep(w)
      const info = seqOf(w)
      if (!masked || !info) return buildExercise(w, 'mc_l2_l1', ctx)
      const wrongs = shuffle(['am', 'im', 'um', 'an', 'in'].filter((p) => p !== info.set.prep), rng).slice(0, 3)
      return choice({ ...base, type, prompt: primary(w), sentence: masked, speak: w.example as string }, info.set.prep, wrongs, rng)
    }
    case 'seq_neighbor':
    case 'seq_neighbor_type': {
      const info = seqOf(w)
      const set = info?.set
      const items = set ? setWordsOf(deckWords, set) : []
      if (!info || !set || items.length !== set.names.length) return buildExercise(w, 'mc_l1_l2', ctx)
      const n = items.length
      const noun = set.tag === 'wochentage' ? 'Tag' : set.tag === 'monate' ? 'Monat' : 'Jahreszeit'
      const after = rng() < 0.5
      const ref = items[(info.index + (after ? n - 1 : 1)) % n] as Word
      const prompt = `Welche${noun === 'Jahreszeit' ? '' : 'r'} ${noun} kommt ${after ? 'nach' : 'vor'} ${bareOf(ref)}?`
      if (type === 'seq_neighbor_type') {
        return { ...base, type, prompt, accepted: [w.term], lexicon: lexicon ?? [], de: { ...deTarget(w), articleOptional: true } }
      }
      const wrong = shuffle(items.filter((d) => d.id !== w.id && d.id !== ref.id), rng).slice(0, 3).map(bareOf)
      return choice({ ...base, type, prompt }, bareOf(w), wrong, rng)
    }
    case 'seq_order': {
      const info = seqOf(w)
      const set = info?.set
      const items = set ? setWordsOf(deckWords, set) : []
      if (!info || !set || items.length !== set.names.length) return buildExercise(w, 'mc_l2_l1', ctx)
      const names = items.map(bareOf)
      const partial = (ctx.level ?? 0) < 4
      let missing = new Set(names.map((_, i) => i))
      if (partial) {
        const k = 3 + (rng() < 0.5 ? 1 : 0)
        missing = new Set(shuffle(names.map((_, i) => i), rng).slice(0, k))
        missing.add(info.index)
      }
      const expected = names.filter((_, i) => missing.has(i))
      let bank = shuffle(expected, rng)
      for (let i = 0; i < 5 && bank.length > 1 && bank.join() === expected.join(); i++) bank = shuffle(expected, rng)
      return { ...base, type, set: set.tag, days: names, given: names.map((x, i) => (missing.has(i) ? null : x)), bank }
    }
    case 'month_season': {
      const info = seqOf(w)
      if (!info || info.set.tag !== 'monate') return buildExercise(w, 'mc_l2_l1', ctx)
      const season = SEASONS[SEASON_OF_MONTH[info.index] as number] as string
      const wrong = SEASONS.filter((x) => x !== season) as string[]
      return choice({ ...base, type, prompt: `In welcher Jahreszeit ist ${w.term}?` }, season, wrong, rng)
    }
    case 'season_months': {
      const info = seqOf(w)
      if (!info || info.set.tag !== 'jahreszeiten') return buildExercise(w, 'mc_l2_l1', ctx)
      const first = SEASON_OF_MONTH.findIndex((x) => x === info.index)
      const triple = (start: number): string => [0, 1, 2].map((k) => MONTHS[(start + k) % 12]).join(', ')
      // the season's own months, in calendar order (Winter = Dezember, Januar, Februar)
      const own = info.index === 3 ? 11 : first
      const correct = triple(own)
      const wrong = [1, 2, 3, 11, 10].map((d) => triple((own + d) % 12)).filter((x) => x !== correct)
      return choice({ ...base, type, prompt: `Welche drei Monate gehören zum ${bareOf(w)}?` }, correct, shuffle(wrong, rng).slice(0, 3), rng)
    }
    // ---- numbers ----
    case 'num_word_to_digits': {
      if (w.value === undefined) return buildExercise(w, 'mc_l2_l1', ctx)
      const wrong = numberDistractors(w.value, rng, 3).map(String)
      return choice({ ...base, type, prompt: w.term, speak: w.term, value: w.value }, String(w.value), wrong, rng)
    }
    case 'num_listen_digits': {
      if (w.value === undefined) return buildExercise(w, 'listen_type', ctx)
      return { ...base, type, prompt: '', accepted: [String(w.value)], speak: w.term, digits: w.value, value: w.value }
    }
    case 'num_digits_to_word': {
      if (w.value === undefined) return buildExercise(w, 'type_l1_l2', ctx)
      return { ...base, type, prompt: String(w.value), accepted: [w.term], de: deTarget(w, false), lexicon: lexicon ?? [], value: w.value }
    }
    case 'num_arith': {
      const seen = (ctx.seenNumbers ?? []).filter((x) => x.id !== w.id && x.value !== undefined)
      if (w.value === undefined || seen.length === 0) return buildExercise(w, 'num_digits_to_word', ctx)
      const other = shuffle(seen, rng).find((x) => {
        const o = x.value as number
        return (w.value as number) + o <= 100 || (w.value as number) - o >= 0
      })
      if (!other) return buildExercise(w, 'num_digits_to_word', ctx)
      const a = w.value
      const b = other.value as number
      const plus = a + b <= 100 && (a - b < 0 || rng() < 0.5)
      const r = plus ? a + b : a - b
      const text = `${w.term} ${plus ? 'plus' : 'minus'} ${other.term} = ?`
      return {
        ...base, type, prompt: text, accepted: [numberToGerman(r), String(r)], lexicon: lexicon ?? [], value: r,
        de: { term: numberToGerman(r), value: r },
      }
    }
  }
  return buildExercise(w, 'mc_l2_l1', ctx)
}

// ---------------------------------------------------------------------------
// evaluation
// ---------------------------------------------------------------------------

export interface Credit {
  skill: SubSkill
  correct: boolean
  /** present-tense person (0..5) for per-person forms progress */
  person?: number
}

export interface Outcome {
  correct: boolean
  quality?: Quality
  /** the answer to show when wrong / diacritics / typo */
  expected: string
  note?: 'diacritics' | 'typo'
  /** German notes (spelling, article …) */
  notes?: DeNote[]
  /** match pairs: no "Nu chiar… / Încearcă din nou!" message (the learner already saw each mistake) */
  quiet?: boolean
  /** per-sub-skill results; default = [{meaning, correct}] */
  credits?: Credit[]
  /** what the learner answered (test history) */
  given?: string
  /** ein + und + zwanzig */
  breakdown?: NumPart[]
  /** per-field results (verb forms, separable) */
  details?: boolean[]
  /** "După «du» urmează lernst, nu lernt." */
  personNote?: { person: number; expected: string; given: string }
}

export function creditsOf(o: Outcome): Credit[] {
  return o.credits ?? [{ skill: 'meaning', correct: o.correct }]
}

function numberInfo(value: number | undefined): Pick<Outcome, 'breakdown'> {
  return value !== undefined && isCompoundNumber(value) ? { breakdown: numberBreakdown(value) } : {}
}

export function evaluateChoice(ex: ChoiceExercise, index: number): Outcome {
  const out: Outcome = { correct: index === ex.answerIndex, expected: ex.options[ex.answerIndex] ?? '', given: ex.options[index] ?? '' }
  if (ex.skill) out.credits = [{ skill: ex.skill, correct: out.correct, ...(ex.person !== undefined ? { person: ex.person } : {}) }]
  if (ex.person !== undefined && !out.correct) out.personNote = { person: ex.person, expected: out.expected, given: out.given ?? '' }
  if (ex.value !== undefined) Object.assign(out, numberInfo(ex.value))
  return out
}

export function evaluateArticle(ex: ArticleExercise, chosen: Gender): Outcome {
  const ok = chosen === ex.answer
  return { correct: ok, expected: `${ex.answer} ${ex.noun}`, given: chosen, credits: [{ skill: 'gender', correct: ok }] }
}

export function evaluateTyped(ex: TypeExercise, input: string): Outcome {
  if (ex.exact) {
    const ok = checkForm(input, ex.exact.expected)
    const out: Outcome = {
      correct: ok, expected: ex.exact.expected, given: input, credits: [{ skill: 'forms', correct: ok, person: ex.exact.person }],
    }
    if (ok) out.quality = 'exact'
    else out.personNote = { person: ex.exact.person, expected: ex.exact.expected, given: input.trim() }
    return out
  }
  if (ex.digits !== undefined) {
    const ok = checkDigits(input, ex.digits)
    return { correct: ok, quality: ok ? 'exact' : undefined, expected: String(ex.digits), given: input, ...numberInfo(ex.value) }
  }
  if (ex.de) {
    const target = { ...ex.de }
    const tIn = ex.de.ignoreArticle ? input.replace(/^\s*(der|die|das)\s+/i, '') : input
    const c = checkGermanAnswer(tIn, target, ex.lexicon ?? [])
    const out: Outcome = { correct: c.meaning, expected: c.expected, notes: c.notes, given: input, ...numberInfo(ex.value) }
    if (c.quality) out.quality = c.quality
    if (c.notes.includes('typo')) out.note = 'typo'
    else if (c.notes.includes('umlaut_spelling')) out.note = 'diacritics'
    const credits: Credit[] = []
    const mainSkill: SubSkill = ex.skill ?? 'meaning'
    credits.push({ skill: mainSkill, correct: c.meaning })
    if (!ex.skill && c.meaning && c.gender !== 'skip') credits.push({ skill: 'gender', correct: c.gender === 'ok' })
    if (!c.meaning && c.gender === 'fail') credits.push({ skill: 'gender', correct: false })
    out.credits = credits
    return out
  }
  if (ex.ro) return { ...fromCheck(checkRomanian(input, ex.ro.translations, ex.roLexicon ?? [])), given: input }
  return { ...fromCheck(checkAnswer(input, ex.accepted)), given: input }
}

/** `spoken` can hold several recognition alternatives; the best verdict wins. */
export function evaluateSpoken(ex: TypeExercise, spoken: string[]): Outcome {
  let best: Outcome | null = null
  for (const s of spoken) {
    const o = evaluateTyped(ex, s)
    const score = (x: Outcome): number => (!x.correct ? 3 : (x.notes?.length ?? 0) + (x.quality === 'exact' ? 0 : 1))
    if (!best || score(o) < score(best)) best = o
  }
  return best ?? { correct: false, expected: ex.accepted[0] ?? '' }
}

function fromCheck(r: CheckResult): Outcome {
  if (r.verdict === 'wrong') return { correct: false, expected: r.expected }
  if (r.verdict === 'correct') return { correct: true, quality: 'exact', expected: r.expected }
  return { correct: true, quality: r.verdict, note: r.verdict, expected: r.expected }
}

export function evaluateSentence(ex: SentenceExercise, built: string[]): Outcome {
  const ok = built.length === ex.solution.length && built.every((t, i) => normalize(t) === normalize(ex.solution[i] as string))
  return { correct: ok, expected: ex.solution.join(' '), given: built.join(' ') }
}

export function evaluateMatch(ex: MatchExercise, targetMistakes: number): Outcome {
  const t = ex.pairs.find((p) => p.wordId === ex.wordId)
  return { correct: targetMistakes === 0, expected: t ? `${t.left} = ${t.right}` : '', quiet: true }
}

/** Verb forms: every field must match (typo/umlaut rules apply). */
export function evaluateVerbForms(ex: VerbFormsExercise, inputs: string[]): Outcome {
  const details = ex.fields.map((f, i) => {
    const c = checkGermanAnswer(inputs[i] ?? '', { term: f.expected })
    return c.meaning && c.verdict !== 'wrong'
  })
  const ok = details.every(Boolean)
  return {
    correct: ok, expected: ex.fields.map((f) => f.expected).join(', '), details, given: inputs.join(', '),
    credits: [{ skill: 'forms', correct: ok }],
  }
}

export function evaluateSeparable(ex: SeparableExercise, inputs: string[]): Outcome {
  const details = ex.answers.map((a, i) => checkGermanAnswer(inputs[i] ?? '', { term: a }).meaning)
  const ok = details.every(Boolean)
  return { correct: ok, expected: ex.answers.join(' … '), details, given: inputs.join(' … '), credits: [{ skill: 'forms', correct: ok }] }
}

/** Ordered-set sequence: every missing slot must hold the right name (all of them in order for the full version). */
export function evaluateSequence(ex: SequenceExercise, filled: (string | null)[]): Outcome {
  const expected = ex.days.filter((_, i) => ex.given[i] === null)
  const ok = filled.length === expected.length && filled.every((x, i) => x === expected[i])
  return { correct: ok, expected: ex.days.join(', '), given: filled.map((x) => x ?? '…').join(', ') }
}
