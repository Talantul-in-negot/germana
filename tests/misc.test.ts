import { describe, expect, it } from 'vitest'
import { groupByCourse, sortDecks } from '../src/core/decks'
import {
  buildExercise, evaluateArticle, evaluateSeparable, evaluateVerbForms, pluralVariants, type ArticleExercise, type ChoiceExercise,
  type SeparableExercise, type VerbFormsExercise,
} from '../src/core/exercises'
import { seededRng } from '../src/core/id'
import { editRow, parseWordList, pluralDisplay } from '../src/core/parser'
import type { Deck, Word } from '../src/core/types'

const deck = (over: Partial<Deck>): Deck => ({ id: Math.random().toString(36), name: 'x', createdAt: 0, l2: 'German', l1: 'Romanian', ...over })

describe('decks: courses and lessons', () => {
  it('sorts by course, then lesson number, then name; decks without a course last', () => {
    const a = deck({ name: 'B', course: 'Menschen A1', lesson: 2 })
    const b = deck({ name: 'A', course: 'Menschen A1', lesson: 10 })
    const c = deck({ name: 'Z' })
    const d = deck({ name: 'M', course: 'Aspekte B1', lesson: 1 })
    const e = deck({ name: 'N', course: 'Menschen A1' })
    expect(sortDecks([c, b, e, a, d]).map((x) => x.name)).toEqual(['M', 'B', 'A', 'N', 'Z'])
    const g = groupByCourse([c, b, a, d])
    expect(g.map((x) => x.course)).toEqual(['Aspekte B1', 'Menschen A1', null])
    expect(g[1]?.decks.map((x) => x.lesson)).toEqual([2, 10])
  })
})

describe('import preview editing', () => {
  it('editing the term re-derives article and plural; editing the plural and type is respected', () => {
    const row = parseWordList('der Tisch, -e ; masă').rows[0]!
    expect(row.plural).toBe('Tische')
    const a = editRow(row, { term: 'die Mutter, ¨-' })
    expect(a).toMatchObject({ term: 'die Mutter', gender: 'die', plural: 'Mütter', type: 'noun' })
    expect(pluralDisplay(a.plural)).toBe('die Mütter')
    const b = editRow(row, { plural: 'die Tische2' })
    expect(b.plural).toBe('Tische2')
    expect(editRow(row, { plural: '' }).plural).toBeNull()
    const c = editRow(row, { type: 'other' })
    expect(c.type).toBe('other')
    expect(c.gender).toBeUndefined()
    const d = editRow(row, { type: 'verb' })
    expect(d.verb).toEqual({})
    const bad = parseWordList('der tisch, ?! ; masă').rows[0]!
    expect(bad.warnings).toEqual(expect.arrayContaining(['noun_lowercase', 'plural_unparseable']))
    expect(editRow(bad, { plural: 'Tische' }).warnings).not.toContain('plural_unparseable')
  })
  it('editing verb forms turns a bare verb into a table verb', () => {
    const row = parseWordList('lernen ; a învăța').rows[0]!
    expect(row.verb).toEqual({})
    const e = editRow(row, { forms: 'P: lerne, lernst, lernt, lernen, lernt, lernen' })
    expect(e.verb?.present).toHaveLength(6)
    expect(e.verb?.irregular).toBe(false)
    expect(e.type).toBe('verb')
  })
})

const W = (over: Partial<Word>): Word => ({ id: 'w' + Math.random(), deckId: 'd', unitIndex: 0, order: 0, term: 't', translations: ['x'], tags: [], type: 'other', ...over })
const ctx = (words: Word[]) => ({ deckWords: words, rng: seededRng(5), newId: () => 'id' + Math.random() })

describe('older German exercise types', () => {
  const noun = W({ term: 'der Tisch', translations: ['masa'], type: 'noun', gender: 'der', plural: 'Tische' })
  it('article drill and plural choice', () => {
    const a = buildExercise(noun, 'article', ctx([noun])) as ArticleExercise
    expect(a).toMatchObject({ noun: 'Tisch', answer: 'der' })
    expect(evaluateArticle(a, 'der').correct).toBe(true)
    expect(evaluateArticle(a, 'die')).toMatchObject({ correct: false, credits: [{ skill: 'gender', correct: false }] })
    const c = buildExercise(noun, 'plural_choice', ctx([noun])) as ChoiceExercise
    expect(c.options[c.answerIndex]).toBe('Tische')
    expect(pluralVariants('Tisch', 'Tische', seededRng(1))).toHaveLength(3)
    expect(buildExercise(W({ type: 'noun' }), 'article', ctx([noun])).type).not.toBe('article')
  })
  it('verb forms (3sg, Präteritum, Perfekt) and separable verbs', () => {
    const v = W({
      term: 'aufstehen', translations: ['a se trezi'], type: 'verb', example: 'Ich stehe um sieben Uhr auf.',
      verb: { present3sg: 'steht auf', praeteritum: 'stand auf', perfekt: 'ist aufgestanden', separable: true },
    })
    const f = buildExercise(v, 'verb_forms', ctx([v])) as VerbFormsExercise
    expect(f.fields.map((x) => x.expected)).toEqual(['steht auf', 'stand auf', 'ist aufgestanden'])
    expect(evaluateVerbForms(f, ['steht auf', 'stand auf', 'ist aufgestanden']).correct).toBe(true)
    const bad = evaluateVerbForms(f, ['steht auf', 'stand auf', 'hat aufgestanden'])
    expect(bad.correct).toBe(false)
    expect(bad.details).toEqual([true, true, false])
    const s = buildExercise(v, 'separable', ctx([v])) as SeparableExercise
    expect(s.answers).toEqual(['stehe', 'auf'])
    expect(evaluateSeparable(s, ['stehe', 'auf']).correct).toBe(true)
    expect(evaluateSeparable(s, ['stehe', 'an']).correct).toBe(false)
    expect(buildExercise(W({ type: 'verb', verb: {} }), 'verb_forms', ctx([v])).type).not.toBe('verb_forms')
  })
})
