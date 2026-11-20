/**
 * Present-tense conjugation ("Präsens"): the 6-person table, regularity, card splitting,
 * sentence analysis/rewriting and the "Conjugare" stage engine. Pure.
 */
import { asciiDe } from './answerDe'
import { shuffle } from './id'
import type { Present, Word } from './types'

export const PERSONS = ['ich', 'du', 'er/sie/es', 'wir', 'ihr', 'Sie/sie'] as const
/** Subject used when a sentence is rewritten for another person. */
const SUBJECT = ['Ich', 'Du', 'Er', 'Wir', 'Ihr', 'Sie'] as const
export const ENDINGS = ['e', 'st', 't', 'en', 't', 'en'] as const
export const MAX_PERSON = 5

export const stemOf = (inf: string): string => inf.replace(/e?n$/, '')

/** Possible regular endings for a person (e-insertion after d/t: arbeitest, arbeitet). */
function regularForms(inf: string, i: number): string[] {
  const stem = stemOf(inf)
  const out = [stem + ENDINGS[i]]
  if (/[dt]$/.test(stem) && (i === 1 || i === 2 || i === 4)) out.push(stem + 'e' + ENDINGS[i])
  if (i === 3 || i === 5) out.push(inf)
  return out
}

/** Regular = stem + -e, -st, -t, -en, -t, -en. */
export function isRegularPresent(inf: string, present: Present): boolean {
  return present.every((f, i) => regularForms(inf.toLowerCase(), i).includes(f.toLowerCase()))
}

/** Stem (black) and ending (coloured) for the card; irregular forms are coloured as a whole. */
export function splitEnding(inf: string, form: string, i: number, irregular: boolean): { stem: string; ending: string } {
  if (irregular) return { stem: '', ending: form }
  const stem = stemOf(inf.toLowerCase())
  for (const f of regularForms(inf.toLowerCase(), i)) {
    if (f === form.toLowerCase() && form.toLowerCase().startsWith(stem)) return { stem: form.slice(0, stem.length), ending: form.slice(stem.length) }
  }
  return { stem: '', ending: form }
}

export function distinctForms(present: readonly string[]): string[] {
  return [...new Set(present)]
}

export const hasPresent = (w: Word): w is Word & { verb: { present: Present } } => !!w.verb?.present

/** Forms offered by a dropdown: this verb's, plus the other verb's for sein/haben. */
export function allFormsFor(w: Word, deckWords: Word[]): string[] {
  const own = distinctForms(w.verb?.present ?? [])
  if (!isSeinHaben(w)) return own
  const other = deckWords.find((x) => x.id !== w.id && isSeinHaben(x))
  return [...new Set([...own, ...distinctForms(other?.verb?.present ?? [])])]
}

export const isSeinHaben = (w: Word): boolean => w.term === 'sein' || w.term === 'haben'

// ---------- sentences ----------

export interface Sentence {
  de: string
  ro?: string
}

/** Example field with several sentences separated by " // ". */
export function sentencesOf(w: Pick<Word, 'example' | 'exampleRo'>): Sentence[] {
  if (!w.example) return []
  return w.example.split(' // ').map((x) => x.trim()).filter(Boolean).map((de, i) => {
    const s: Sentence = { de }
    const ro = w.exampleRo?.[i]
    if (ro) s.ro = ro
    return s
  })
}

const clean = (tok: string): string => tok.replace(/[.,!?;:]+$/g, '')
const SUBJECT_PERSON: Record<string, number> = { ich: 0, du: 1, wir: 3, ihr: 4, er: 2, es: 2 }

export interface BlankedSentence {
  /** tokens before the verb, with trailing space */
  before: string
  after: string
  answer: string
  person: number
}

/** Find the conjugated form of the verb in a sentence by matching it against the table. */
export function analyzeSentence(sentence: string, present: Present): BlankedSentence | null {
  const toks = sentence.split(/\s+/)
  const lower = toks.map((x) => clean(x).toLowerCase())
  for (let t = 0; t < toks.length; t++) {
    const cands = present.map((f, i) => (f.toLowerCase() === lower[t] ? i : -1)).filter((i) => i >= 0)
    if (!cands.length) continue
    // disambiguate identical forms (wohnt: er/ihr, sind: wir/sie) by the subject pronoun in the sentence
    const subj = lower.map((x) => SUBJECT_PERSON[x]).find((p) => p !== undefined)
    let person = cands.includes(2) ? 2 : (cands[0] as number)
    if (subj !== undefined && cands.includes(subj)) person = subj
    else if (lower.includes('sie') && cands.includes(5) && !cands.includes(2)) person = 5
    const verbTok = toks[t] as string
    const trailing = verbTok.slice(clean(verbTok).length)
    return {
      before: toks.slice(0, t).join(' ') + (t > 0 ? ' ' : ''),
      after: trailing + (t < toks.length - 1 ? ' ' + toks.slice(t + 1).join(' ') : ''),
      answer: clean(verbTok),
      person,
    }
  }
  return null
}

/** "Du lernst Deutsch." -> "Ich lerne Deutsch." (only plain Subject + Verb sentences). */
export function rewriteSentence(sentence: string, present: Present, person: number): string | null {
  const toks = sentence.split(/\s+/)
  if (toks.length < 3) return null
  const subj = clean(toks[0] as string).toLowerCase()
  const isSubj = subj in SUBJECT_PERSON || subj === 'sie'
  const verb = clean(toks[1] as string).toLowerCase()
  if (!isSubj || !present.some((f) => f.toLowerCase() === verb)) return null
  const rest = toks.slice(2).join(' ')
  return `${SUBJECT[person]} ${present[person]} ${rest}`
}

// ---------- answers ----------

export function checkForm(input: string, expected: string): boolean {
  const a = input.trim().toLowerCase()
  if (!a) return false
  return a === expected.toLowerCase() || asciiDe(a) === asciiDe(expected)
}

// ---------- Conjugare stages ----------

export type Stage = 1 | 2 | 3
export type RowKind = 'dropdown3' | 'dropdownAll' | 'sentenceAll' | 'typing'

export interface ConjItem {
  id: string
  person: number
  kind: RowKind
  /** "ihr ___" / "du ___ (haben)" / the sentence parts */
  prompt: string
  before?: string
  after?: string
  options?: string[]
  answer: string
}

export interface ConjState {
  /** date (YYYY-MM-DD) on which each stage was first passed */
  passed: (string | null)[]
}

export const newConj = (): ConjState => ({ passed: [null, null, null] })

/** Stage k needs stage k-1 passed on an EARLIER day. */
export function stageUnlocked(c: ConjState | undefined, stage: Stage, today: string): boolean {
  if (stage === 1) return true
  const prev = c?.passed[stage - 2]
  return !!prev && prev < today
}

/** A stage cannot be passed twice on the same day, nor re-recorded once passed. */
export function canPassStage(c: ConjState | undefined, stage: Stage, today: string): boolean {
  return stageUnlocked(c, stage, today) && !c?.passed[stage - 1]
}

export function markPassed(c: ConjState | undefined, stage: Stage, today: string): ConjState {
  const cur = c ? { passed: [...c.passed] } : newConj()
  if (!cur.passed[stage - 1] && stageUnlocked(c, stage, today)) cur.passed[stage - 1] = today
  return cur
}

export const stagesPassed = (c: ConjState | undefined): number => (c?.passed ?? []).filter(Boolean).length

export function buildStageItems(verb: Word, deckWords: Word[], stage: Stage, rng: () => number = Math.random): ConjItem[] {
  const present = verb.verb?.present as Present
  const persons = [0, 1, 2, 3, 4, 5]
  const forms = distinctForms(present)
  const sentences = sentencesOf(verb)
  let n = 0
  const id = (): string => `c${n++}`
  if (stage === 1) {
    return persons.map((p) => {
      const others = shuffle(forms.filter((f) => f !== present[p]), rng).slice(0, 2)
      return { id: id(), person: p, kind: 'dropdown3' as const, prompt: `${PERSONS[p]} ___`, options: shuffle([present[p] as string, ...others], rng), answer: present[p] as string }
    })
  }
  if (stage === 2) {
    const all = shuffle(allFormsFor(verb, deckWords), rng)
    const items: ConjItem[] = []
    for (const p of shuffle(persons, rng)) {
      items.push({ id: id(), person: p, kind: 'dropdownAll', prompt: `${PERSONS[p]} ___`, options: all, answer: present[p] as string })
      // the same person inside one of the verb's example sentences (rewritten for this person)
      let s: string | null = null
      for (const ex of shuffle(sentences, rng)) {
        const a = analyzeSentence(ex.de, present)
        s = a && a.person === p ? ex.de : rewriteSentence(ex.de, present, p)
        if (s) break
      }
      const b = s ? analyzeSentence(s, present) : null
      if (b) items.push({ id: id(), person: p, kind: 'sentenceAll', prompt: `${b.before}___${b.after}`, before: b.before, after: b.after, options: all, answer: present[p] as string })
      else items.push({ id: id(), person: p, kind: 'dropdownAll', prompt: `${SUBJECT[p]} ___ (${verb.term})`, options: all, answer: present[p] as string })
    }
    return shuffle(items, rng)
  }
  return shuffle(persons, rng).map((p) => ({ id: id(), person: p, kind: 'typing' as const, prompt: `${PERSONS[p]} ___ (${verb.term})`, answer: present[p] as string }))
}

export interface ConjRun {
  queue: ConjItem[]
  cursor: number
  /** person -> true while every first attempt of that person was right */
  personOk: Record<number, boolean>
  seen: Set<string>
  attempts: { person: number; correct: boolean; firstTry: boolean }[]
}

export const startRun = (items: ConjItem[]): ConjRun => ({ queue: items, cursor: 0, personOk: {}, seen: new Set(), attempts: [] })

export const currentItem = (r: ConjRun): ConjItem | undefined => r.queue[r.cursor]
export const runFinished = (r: ConjRun): boolean => r.cursor >= r.queue.length

/** Record an answer; a wrong row is repeated at the end of the stage until it is correct. */
export function answerItem(r: ConjRun, correct: boolean, rng: () => number = Math.random): ConjRun {
  const item = r.queue[r.cursor] as ConjItem
  const firstTry = !r.seen.has(item.id)
  const seen = new Set(r.seen).add(item.id)
  const personOk = { ...r.personOk }
  if (firstTry) personOk[item.person] = (personOk[item.person] ?? true) && correct
  const queue = r.queue.slice()
  if (!correct) queue.push({ ...item, options: item.options ? shuffle(item.options, rng) : item.options })
  return { queue, cursor: r.cursor + 1, personOk, seen, attempts: [...r.attempts, { person: item.person, correct, firstTry }] }
}

/** Passing a stage requires >= 5 of the 6 persons right on the first try. */
export function stagePassed(r: ConjRun): boolean {
  return [0, 1, 2, 3, 4, 5].filter((p) => r.personOk[p] === true).length >= 5
}

// ---------- "Toate verbele" ----------

export interface Pair {
  verbId: string
  person: number
}

/** 20 random (verb, person) pairs from the verbs seen so far. */
export function pickPairs(verbIds: string[], rng: () => number = Math.random, count = 20): Pair[] {
  if (!verbIds.length) return []
  const all: Pair[] = verbIds.flatMap((verbId) => [0, 1, 2, 3, 4, 5].map((person) => ({ verbId, person })))
  const out: Pair[] = []
  let bag = shuffle(all, rng)
  while (out.length < count) {
    if (!bag.length) bag = shuffle(all, rng)
    out.push(bag.pop() as Pair)
  }
  return out
}

/** "Toate verbele" unlocks once >= 3 verbs reached silver (2 stages passed). */
export const allVerbsUnlocked = (passedStages: number[]): boolean => passedStages.filter((n) => n >= 2).length >= 3
