import { describe, expect, it } from 'vitest'
import { checkRomanian } from '../src/core/answer'
import { checkGermanAnswer } from '../src/core/answerDe'
import {
  buildExercise, chooseTypeFor, contextOf, evaluateChoice, evaluateSequence, evaluateTyped, isSetComplete, lexiconOf, maskPrep,
  setWordsOf, type BuildContext, type ChoiceExercise, type SequenceExercise, type TypeExercise,
} from '../src/core/exercises'
import { SEQ_SETS, seqOf } from '../src/core/german'
import { seededRng } from '../src/core/id'
import { current, planLesson, submitResult } from '../src/core/lesson'
import { parseWordList, rowToInput } from '../src/core/parser'
import { requiredSkills } from '../src/core/srs'
import type { Word } from '../src/core/types'
import { MONATE_TEXT, WOCHENTAGE_TEXT, ZAHLEN_TEXT } from './fixtures/seed-fixture'

const wordsOf = (text: string, deckId = 'd'): Word[] =>
  parseWordList(text).rows.map((r, i) => ({ id: `${deckId}${i}`, deckId, unitIndex: 0, order: i, ...rowToInput(r) }))

const DAYS = wordsOf(WOCHENTAGE_TEXT, 'w')
const MONTHS = wordsOf(MONATE_TEXT, 'm')
const NUMS = wordsOf(ZAHLEN_TEXT, 'n')
let n = 0
const ctx = (deckWords: Word[], seed = 1, level?: number): BuildContext => ({ deckWords, rng: seededRng(seed), newId: () => 'e' + n++, ...(level !== undefined ? { level } : {}) })
const find = (ws: Word[], term: string): Word => ws.find((w) => w.term === term) as Word

describe('parser: shared plural variants and (Sg.)', () => {
  it('der Samstag|der Sonnabend, -e -> both variants share the plural shorthand', () => {
    const w = find(DAYS, 'der Samstag')
    expect(w.alternatives).toEqual(['der Sonnabend'])
    expect(w.plural).toBe('Samstage')
    expect(w.pluralAlternatives).toEqual(['Sonnabende'])
    expect(w.tags).toContain('wochentage')
  })
  it('der Januar|der Jänner (Sg.) -> two variants, no plural', () => {
    const w = find(MONTHS, 'der Januar')
    expect(w.alternatives).toEqual(['der Jänner'])
    expect(w.plural).toBeNull()
    expect(w.gender).toBe('der')
  })
  it('lessons import without warnings', () => {
    for (const text of [WOCHENTAGE_TEXT, MONATE_TEXT]) {
      const r = parseWordList(text)
      expect(r.rows.every((x) => x.valid && x.warnings.length === 0)).toBe(true)
    }
  })
  it('Monate / Jahreszeiten / Extra are group labels: one unit per group', () => {
    const groups = new Set(MONTHS.map((w) => w.group))
    expect(groups).toEqual(new Set(['monate', 'jahreszeiten', 'extra']))
    expect(MONTHS.filter((w) => w.group === 'monate')).toHaveLength(12)
    expect(NUMS.every((w) => w.value !== undefined)).toBe(true)
  })
  it('weekdays, months and seasons skip the article drill (all der)', () => {
    expect(requiredSkills(find(DAYS, 'der Montag'))).toEqual(['plural'])
    expect(requiredSkills(find(MONTHS, 'der Mai'))).toEqual([])
    expect(requiredSkills(find(MONTHS, 'der Winter'))).toEqual(['plural'])
    expect(requiredSkills(find(MONTHS, 'die Jahreszeit'))).toEqual(['gender', 'plural'])
  })
  it('seqOf recognises sets, aliases and positions', () => {
    expect(seqOf(find(DAYS, 'der Samstag'))).toMatchObject({ index: 5 })
    expect(seqOf({ tags: ['wochentage'], term: 'der Sonnabend' })?.index).toBe(5)
    expect(seqOf(find(MONTHS, 'der Januar'))?.set.tag).toBe('monate')
    expect(seqOf({ tags: ['monate'], term: 'der Jänner' })?.index).toBe(0)
    expect(seqOf(find(DAYS, 'heute'))).toBeNull()
    expect(SEQ_SETS.map((s) => s.names.length)).toEqual([7, 12, 4])
    expect(isSetComplete(DAYS, SEQ_SETS[0]!)).toBe(true)
    expect(isSetComplete(MONTHS, SEQ_SETS[1]!)).toBe(true)
    expect(setWordsOf(DAYS, SEQ_SETS[0]!)).toHaveLength(7)
  })
})

describe('checker: weekdays and months', () => {
  const lex = lexiconOf(MONTHS)
  const dayLex = lexiconOf(DAYS)
  it('capitalisation: "montag"/"mai" -> almost, with the capital note', () => {
    const c = checkGermanAnswer('montag', { term: 'der Montag', articleOptional: true }, dayLex)
    expect(c).toMatchObject({ verdict: 'almost', meaning: true })
    expect(c.notes).toContain('capital')
    expect(checkGermanAnswer('mai', { term: 'der Mai', articleOptional: true }, lex).notes).toContain('capital')
    expect(checkGermanAnswer('Mai', { term: 'der Mai', articleOptional: true }, lex).verdict).toBe('correct')
  })
  it('Sonnabend = Samstag; Jänner = Januar; Maerz = März', () => {
    const sa = find(DAYS, 'der Samstag')
    expect(checkGermanAnswer('der Sonnabend', { term: sa.term, alternatives: sa.alternatives }).verdict).toBe('correct')
    const ja = find(MONTHS, 'der Januar')
    expect(checkGermanAnswer('der Jänner', { term: ja.term, alternatives: ja.alternatives }).verdict).toBe('correct')
    const c = checkGermanAnswer('der Maerz', { term: 'der März' })
    expect(c.verdict).toBe('correct')
    expect(c.notes).toEqual(['umlaut_spelling'])
  })
  it('a typo never produces another day or month', () => {
    // Dienstag/Donnerstag, Juni/Juli, März/Mai
    expect(checkGermanAnswer('Dienstag', { term: 'Donnerstag' }, dayLex).verdict).toBe('wrong')
    expect(checkGermanAnswer('Donnerstag', { term: 'Dienstag' }, dayLex).verdict).toBe('wrong')
    expect(checkGermanAnswer('Juli', { term: 'der Juni', articleOptional: true }, lex).verdict).toBe('wrong')
    expect(checkGermanAnswer('Mai', { term: 'der März', articleOptional: true }, lex).verdict).toBe('wrong')
    expect(checkGermanAnswer('Septembar', { term: 'der September', articleOptional: true }, lex).verdict).toBe('almost') // a real typo is still fine
    expect(checkGermanAnswer('Dezembr', { term: 'der Dezember', articleOptional: true }, lex).quality).toBe('typo')
  })
  it('Romanian: iunie/iulie are NOT interchangeable, diacritics-lenient', () => {
    const lexRo = MONTHS.flatMap((w) => w.translations)
    expect(checkRomanian('iulie', ['iunie'], lexRo).verdict).toBe('wrong')
    expect(checkRomanian('iunie', ['iulie'], lexRo).verdict).toBe('wrong')
    expect(checkRomanian('iunie', ['iunie'], lexRo).verdict).toBe('correct')
    expect(checkRomanian('sambata', ['sâmbătă'], DAYS.flatMap((w) => w.translations)).verdict).not.toBe('wrong')
    expect(checkRomanian('sambata', ['sâmbătă']).verdict).toBe('diacritics')
    expect(checkRomanian('iarna', ['iarna']).verdict).toBe('correct')
    const ex = buildExercise(find(MONTHS, 'der Juni'), 'type_l2_l1', ctx(MONTHS)) as TypeExercise
    expect(evaluateTyped(ex, 'iulie').correct).toBe(false)
    expect(evaluateTyped(ex, 'iunie').correct).toBe(true)
  })
})

describe('exercises for ordered sets', () => {
  it('full sequence has no given slots; partial has 3–4 missing (+ the target)', () => {
    const w = find(MONTHS, 'der Mai')
    const full = buildExercise(w, 'seq_order', ctx(MONTHS, 2, 5)) as SequenceExercise
    expect(full.days).toHaveLength(12)
    expect(full.given.every((x) => x === null)).toBe(true)
    expect(full.bank).toHaveLength(12)
    expect(evaluateSequence(full, full.days).correct).toBe(true)
    expect(evaluateSequence(full, [...full.days].reverse()).correct).toBe(false)
    const swapped = [...full.days]
    ;[swapped[0], swapped[1]] = [swapped[1] as string, swapped[0] as string]
    expect(evaluateSequence(full, swapped).correct).toBe(false) // all 12 in order for the point
    for (let seed = 1; seed < 20; seed++) {
      const p = buildExercise(w, 'seq_order', ctx(MONTHS, seed, 1)) as SequenceExercise
      const missing = p.given.filter((x) => x === null).length
      expect(missing).toBeGreaterThanOrEqual(3)
      expect(missing).toBeLessThanOrEqual(5)
      expect(p.given[4]).toBeNull() // Mai is among the missing ones
      expect(evaluateSequence(p, p.days.filter((_, i) => p.given[i] === null)).correct).toBe(true)
    }
    const days = buildExercise(find(DAYS, 'der Montag'), 'seq_order', ctx(DAYS, 3, 5)) as SequenceExercise
    expect(days.days).toEqual(['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'])
  })
  it('next / previous day and month (choice and typed)', () => {
    for (let seed = 1; seed < 15; seed++) {
      const e = buildExercise(find(DAYS, 'der Donnerstag'), 'seq_neighbor', ctx(DAYS, seed)) as ChoiceExercise
      expect(e.prompt).toMatch(/^Welcher Tag kommt (nach Mittwoch|vor Freitag)\?$/)
      expect(e.options[e.answerIndex]).toBe('Donnerstag')
    }
    const m = buildExercise(find(MONTHS, 'der Juni'), 'seq_neighbor', ctx(MONTHS, 4)) as ChoiceExercise
    expect(m.prompt).toMatch(/^Welcher Monat kommt (nach Mai|vor Juli)\?$/)
    const t = buildExercise(find(MONTHS, 'der Mai'), 'seq_neighbor_type', ctx(MONTHS, 5)) as TypeExercise
    expect(evaluateTyped(t, 'Mai').correct).toBe(true)
    expect(evaluateTyped(t, 'mai').notes).toContain('capital')
    expect(evaluateTyped(t, 'Juni').correct).toBe(false)
    const wrap = buildExercise(find(DAYS, 'der Montag'), 'seq_neighbor', ctx(DAYS, 6)) as ChoiceExercise
    expect(wrap.prompt).toMatch(/nach Sonntag|vor Dienstag/)
  })
  it('fill in with am / im', () => {
    expect(maskPrep(find(DAYS, 'der Montag'))).toBe('___ Montag habe ich Schule.')
    expect(maskPrep(find(MONTHS, 'der Juli'))).toBe('___ Juli ist es heiß.')
    const d = buildExercise(find(DAYS, 'der Montag'), 'fill_prep', ctx(DAYS)) as ChoiceExercise
    expect(d.options[d.answerIndex]).toBe('am')
    const m = buildExercise(find(MONTHS, 'der Juli'), 'fill_prep', ctx(MONTHS)) as ChoiceExercise
    expect(m.options[m.answerIndex]).toBe('im')
    expect(m.sentence).toBe('___ Juli ist es heiß.')
    expect(new Set(m.options).size).toBe(4)
  })
  it('month -> season and season -> months', () => {
    const a = buildExercise(find(MONTHS, 'der Juli'), 'month_season', ctx(MONTHS)) as ChoiceExercise
    expect(a.prompt).toBe('In welcher Jahreszeit ist der Juli?')
    expect(a.options[a.answerIndex]).toBe('Sommer')
    expect(evaluateChoice(a, a.answerIndex).correct).toBe(true)
    const jan = buildExercise(find(MONTHS, 'der Januar'), 'month_season', ctx(MONTHS)) as ChoiceExercise
    expect(jan.options[jan.answerIndex]).toBe('Winter')
    const b = buildExercise(find(MONTHS, 'der Sommer'), 'season_months', ctx(MONTHS)) as ChoiceExercise
    expect(b.options[b.answerIndex]).toBe('Juni, Juli, August')
    expect(new Set(b.options).size).toBe(b.options.length)
    const w = buildExercise(find(MONTHS, 'der Winter'), 'season_months', ctx(MONTHS)) as ChoiceExercise
    expect(w.options[w.answerIndex]).toBe('Dezember, Januar, Februar')
  })
  it('context choice for months: "Wann hast du Geburtstag? – Im ___."', () => {
    const c = contextOf(find(MONTHS, 'der Mai'))
    expect(c?.sentence).toBe('Wann hast du Geburtstag? – Im ___.')
    const e = buildExercise(find(MONTHS, 'der Mai'), 'context_choice', ctx(MONTHS)) as ChoiceExercise
    expect(e.options[e.answerIndex]).toBe('Mai')
    expect(e.options.every((o) => MONTHS.some((m) => m.term === `der ${o}`))).toBe(true)
  })
  it('context choice heute / morgen / gestern', () => {
    const c = contextOf(find(DAYS, 'morgen'))
    expect(c?.sentence).toBe('Heute ist Dienstag. ___ ist Mittwoch.')
    const e = buildExercise(find(DAYS, 'morgen'), 'context_choice', ctx(DAYS)) as ChoiceExercise
    expect(e.options[e.answerIndex]).toBe('morgen')
    expect(e.options.length).toBeGreaterThanOrEqual(3)
    expect(contextOf(find(DAYS, 'übermorgen'))?.sentence).toBe('Heute ist Dienstag. ___ ist Donnerstag.')
  })
  it('listening: TTS says the word, learner picks the Romanian name', () => {
    const e = buildExercise(find(MONTHS, 'der Mai'), 'listen_ro', ctx(MONTHS)) as ChoiceExercise
    expect(e.speak).toBe('der Mai')
    expect(e.options[e.answerIndex]).toBe('mai')
    expect(e.prompt).toBe('')
  })
  it('exercise choice for set words depends on the band and on completeness', () => {
    const w = find(MONTHS, 'der Mai')
    const rng = seededRng(7)
    const base = { deckSize: MONTHS.length, speakEnabled: false, rng }
    const info = (level: number) => ({ level, skillLevels: {}, seenNumbers: [], completeSets: ['monate'], hasSeasons: true })
    const seen = (level: number) => new Set(Array.from({ length: 60 }, () => chooseTypeFor(w, info(level), base)))
    expect([...seen(0)].every((t) => ['listen_ro', 'mc_l2_l1', 'listen_choose'].includes(t))).toBe(true)
    expect(seen(2).has('seq_neighbor')).toBe(true)
    expect(seen(2).has('month_season')).toBe(true)
    expect(seen(4).has('seq_neighbor_type')).toBe(true)
    expect(seen(4).has('article')).toBe(false) // article drill is skipped
    const incomplete = new Set(Array.from({ length: 60 }, () => chooseTypeFor(w, { ...info(2), completeSets: [] }, base)))
    expect(incomplete.has('seq_order')).toBe(false)
    expect(incomplete.has('seq_neighbor')).toBe(false)
  })
})

describe('numbers 21–40 are retried as "digits -> type the word"', () => {
  it('a wrong answer for a 21–40 word requeues num_digits_to_word with the breakdown', () => {
    const w = NUMS.find((x) => x.value === 27) as Word
    const c = ctx(NUMS, 8)
    const rt = planLesson([w], () => 0, NUMS, c, false, 10)
    const first = current(rt)!
    const after = submitResult(rt, { wordId: w.id, type: first.type, correct: false }, w, c, false)
    const next = after.queue[after.cursor]
    expect(next?.wordId).toBe(w.id)
    expect(next?.type).toBe('num_digits_to_word')
    const ex = next as TypeExercise
    expect(ex.prompt).toBe('27')
    const wrong = evaluateTyped(ex, 'siebenundzwanzik')
    expect(wrong.correct).toBe(true) // one-letter typo is tolerated (and flagged)
    expect(wrong.notes).toContain('typo')
    const bad = evaluateTyped(ex, 'zweiundsiebzig')
    expect(bad.correct).toBe(false)
    expect(bad.breakdown?.map((p) => p.text)).toEqual(['sieben', 'und', 'zwanzig'])
    expect(evaluateTyped(ex, '27').correct).toBe(false) // digits are not an answer for a digits prompt
    expect(evaluateTyped(ex, 'siebenundzwanzig').quality).toBe('exact')
  })
  it('numbers below 21 are retried like other words', () => {
    const w = NUMS.find((x) => x.value === 7) as Word
    const c = ctx(NUMS, 9)
    const rt = planLesson([w], () => 0, NUMS, c, false, 10)
    const first = current(rt)!
    const after = submitResult(rt, { wordId: w.id, type: first.type, correct: false }, w, c, false)
    expect(after.queue[after.cursor]?.type).not.toBe('num_digits_to_word')
  })
  it('number exercises: listening -> digits, word -> digits (swapped / neighbours), arithmetic', () => {
    const w = NUMS.find((x) => x.value === 21) as Word
    const l = buildExercise(w, 'num_listen_digits', ctx(NUMS)) as TypeExercise
    expect(l.speak).toBe('einundzwanzig')
    expect(evaluateTyped(l, '21').correct).toBe(true)
    expect(evaluateTyped(l, '12').correct).toBe(false)
    const c = buildExercise(w, 'num_word_to_digits', ctx(NUMS)) as ChoiceExercise
    expect(c.options).toContain('12')
    expect(c.options[c.answerIndex]).toBe('21')
    const seen = NUMS.filter((x) => (x.value as number) >= 8 && (x.value as number) <= 12)
    const a = buildExercise(NUMS.find((x) => x.value === 12) as Word, 'num_arith', { ...ctx(NUMS, 3), seenNumbers: seen }) as TypeExercise
    expect(a.prompt).toMatch(/^zwölf (plus|minus) \S+ = \?$/)
    const r = a.value as number
    expect(evaluateTyped(a, String(r)).correct).toBe(true)
    expect(evaluateTyped(a, String(r + 1)).correct).toBe(false)
  })
})
