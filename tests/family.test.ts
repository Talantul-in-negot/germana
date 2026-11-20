import { describe, expect, it } from 'vitest'
import { checkGermanAnswer } from '../src/core/answerDe'
import {
  buildExercise, chooseTypeFor, contextOf, evaluateChoice, evaluateMatch, evaluateTyped, isUmlautPlural, lexiconOf, partnerOf,
  type BuildContext, type ChoiceExercise, type MatchExercise, type TypeExercise,
} from '../src/core/exercises'
import { seededRng } from '../src/core/id'
import { parseWordList, rowToInput } from '../src/core/parser'
import { requiredSkills } from '../src/core/srs'
import type { Word } from '../src/core/types'
import { FAMILIE_TEXT } from './fixtures/seed-fixture'

const FAM: Word[] = parseWordList(FAMILIE_TEXT).rows.map((r, i) => ({ id: 'f' + i, deckId: 'f', unitIndex: 0, order: i, ...rowToInput(r) }))
const find = (t: string): Word => FAM.find((w) => w.term === t) as Word
let n = 0
const ctx = (seed = 1): BuildContext => ({ deckWords: FAM, rng: seededRng(seed), newId: () => 'e' + n++ })
const lex = lexiconOf(FAM)

describe('parser: family lesson', () => {
  it('imports without warnings; Kernfamilie / Verwandte are group labels', () => {
    const r = parseWordList(FAMILIE_TEXT)
    expect(r.rows).toHaveLength(16)
    expect(r.rows.every((x) => x.valid && x.warnings.length === 0)).toBe(true)
    expect(new Set(FAM.map((w) => w.group))).toEqual(new Set(['kernfamilie', 'verwandte']))
    expect(FAM.filter((w) => w.group === 'kernfamilie')).toHaveLength(9)
  })
  it('die Großmutter|die Oma with plurals die Großmütter|die Omas in the forms field', () => {
    const w = find('die Großmutter')
    expect(w.alternatives).toEqual(['die Oma'])
    expect(w.plural).toBe('Großmütter')
    expect(w.pluralAlternatives).toEqual(['Omas'])
    const v = find('der Großvater')
    expect(v.plural).toBe('Großväter')
    expect(v.pluralAlternatives).toEqual(['Opas'])
  })
  it('(Pl.) nouns: plural only, all die, meaning + article only', () => {
    for (const t of ['die Eltern', 'die Geschwister', 'die Großeltern', 'die Kinder']) {
      const w = find(t)
      expect(w).toMatchObject({ pluralOnly: true, gender: 'die' })
      expect(requiredSkills(w)).toEqual(['gender'])
    }
    expect(requiredSkills(find('die Mutter'))).toEqual(['gender', 'plural'])
  })
  it('umlaut plurals', () => {
    for (const [t, p] of [['die Mutter', 'Mütter'], ['der Vater', 'Väter'], ['der Bruder', 'Brüder'], ['die Tochter', 'Töchter'], ['der Sohn', 'Söhne']] as const) {
      expect(find(t).plural).toBe(p)
      expect(isUmlautPlural(find(t))).toBe(true)
    }
    expect(isUmlautPlural(find('die Schwester'))).toBe(false)
    expect(isUmlautPlural(find('die Eltern'))).toBe(false)
  })
})

describe('checker: family', () => {
  it('Grossmutter = Großmutter; Oma/Großmutter and Opa/Großvater are equivalent', () => {
    const gm = find('die Großmutter')
    const t = { term: gm.term, alternatives: gm.alternatives }
    expect(checkGermanAnswer('die Grossmutter', t, lex)).toMatchObject({ verdict: 'correct', notes: ['umlaut_spelling'] })
    expect(checkGermanAnswer('die Oma', t, lex).verdict).toBe('correct')
    expect(checkGermanAnswer('die Großmutter', t, lex).verdict).toBe('correct')
    const gv = find('der Großvater')
    expect(checkGermanAnswer('der Opa', { term: gv.term, alternatives: gv.alternatives }, lex).verdict).toBe('correct')
  })
  it('typos never produce another word of the course', () => {
    expect(checkGermanAnswer('der Sohne', { term: 'der Sohn' }, lex).verdict).toBe('wrong')
    expect(checkGermanAnswer('die Mutter', { term: 'der Vater' }, lex).verdict).toBe('wrong')
    expect(checkGermanAnswer('der Vater', { term: 'die Mutter' }, lex).verdict).toBe('wrong')
    expect(checkGermanAnswer('Cousine', { term: 'der Cousin' }, lex).verdict).toBe('wrong')
    expect(checkGermanAnswer('der Cousin', { term: 'die Cousine' }, lex).verdict).toBe('wrong')
  })
  it('Cousin vs Cousine is a gender error, not a typo', () => {
    const c = checkGermanAnswer('die Cousine', { term: 'der Cousin' }, lex)
    expect(c).toMatchObject({ verdict: 'wrong', meaning: false, gender: 'fail' })
    expect(c.notes).toContain('article_wrong')
    expect(c.notes).not.toContain('typo')
    const ex = buildExercise(find('der Cousin'), 'type_l1_l2', ctx()) as TypeExercise
    const o = evaluateTyped(ex, 'die Cousine')
    expect(o.correct).toBe(false)
    expect(o.credits).toEqual([{ skill: 'meaning', correct: false }, { skill: 'gender', correct: false }])
    // the right word with the wrong article is still "meaning credited, gender failed"
    const o2 = evaluateTyped(ex, 'die Cousin')
    expect(o2.correct).toBe(true)
    expect(o2.credits).toEqual([{ skill: 'meaning', correct: true }, { skill: 'gender', correct: false }])
    expect(evaluateTyped(ex, 'der Cousin').quality).toBe('exact')
  })
  it('both plural variants are accepted; the first is the expected one', () => {
    const ex = buildExercise(find('die Großmutter'), 'plural_type', ctx()) as TypeExercise
    expect(ex.accepted).toEqual(['Großmütter'])
    expect(evaluateTyped(ex, 'Großmütter').correct).toBe(true)
    expect(evaluateTyped(ex, 'die Omas').correct).toBe(true)
    expect(evaluateTyped(ex, 'Grossmuetter').notes).toContain('umlaut_spelling')
    expect(evaluateTyped(ex, 'Großmutter').correct).toBe(false)
    const c = buildExercise(find('die Großmutter'), 'plural_choice', ctx(3)) as ChoiceExercise
    expect(c.options[c.answerIndex]).toBe('Großmütter')
    expect(c.options).not.toContain('Omas')
  })
})

describe('exercises: family', () => {
  it('gender pairs: male <-> female, target pair first-class', () => {
    expect(partnerOf(find('der Bruder'), FAM)?.term).toBe('die Schwester')
    expect(partnerOf(find('die Großmutter'), FAM)?.term).toBe('der Großvater')
    expect(partnerOf(find('der Cousin'), FAM)?.term).toBe('die Cousine')
    expect(partnerOf(find('die Eltern'), FAM)).toBeNull()
    for (const t of ['der Onkel', 'die Tante', 'der Sohn', 'die Tochter', 'der Vater']) {
      const e = buildExercise(find(t), 'gender_pairs', ctx(4)) as MatchExercise
      expect(e.type).toBe('gender_pairs')
      expect(e.pairs.length).toBeGreaterThanOrEqual(3)
      const mine = e.pairs.find((p) => p.wordId === e.wordId)!
      expect(mine.left.startsWith('der ')).toBe(true)
      expect(mine.right.startsWith('die ')).toBe(true)
      expect([mine.left, mine.right]).toContain(t)
      for (const p of e.pairs) expect(p.left.startsWith('der ') && p.right.startsWith('die ')).toBe(true)
      expect(evaluateMatch(e, 0).correct).toBe(true)
    }
    const o = buildExercise(find('der Onkel'), 'gender_pairs', ctx(5)) as MatchExercise
    expect(o.pairs.find((p) => p.wordId === o.wordId)).toMatchObject({ left: 'der Onkel', right: 'die Tante' })
  })
  it('collective words', () => {
    const cases: [string, string][] = [['die Eltern', 'Mutter + Vater = ?'], ['die Geschwister', 'Bruder + Schwester = ?'], ['die Kinder', 'Tochter + Sohn = ?'], ['die Großeltern', 'Oma + Opa = ?']]
    for (const [t, prompt] of cases) {
      const e = buildExercise(find(t), 'collective', ctx(6)) as ChoiceExercise
      expect(e.prompt).toBe(prompt)
      expect(e.options[e.answerIndex]).toBe(t)
      expect(e.options.every((o) => ['die Eltern', 'die Geschwister', 'die Kinder', 'die Großeltern'].includes(o))).toBe(true)
      expect(evaluateChoice(e, e.answerIndex).correct).toBe(true)
    }
  })
  it('possessive fill-in: meine for die, mein for der; it trains the article', () => {
    const f = buildExercise(find('die Mutter'), 'possessive', ctx()) as ChoiceExercise
    expect(f.prompt).toBe('___ Mutter')
    expect(f.options[f.answerIndex]).toBe('meine')
    const m = buildExercise(find('der Vater'), 'possessive', ctx()) as ChoiceExercise
    expect(m.prompt).toBe('___ Vater')
    expect(m.options[m.answerIndex]).toBe('mein')
    expect(evaluateChoice(m, m.answerIndex).credits).toEqual([{ skill: 'gender', correct: true }])
    expect(evaluateChoice(m, (m.answerIndex + 1) % 4).credits).toEqual([{ skill: 'gender', correct: false }])
  })
  it('context choice: "Wer ist das? – Das ist mein ___." with same-gender family words', () => {
    expect(contextOf(find('der Onkel'))?.sentence).toBe('Wer ist das? – Das ist mein ___.')
    const e = buildExercise(find('der Onkel'), 'context_choice', ctx(7)) as ChoiceExercise
    expect(e.options[e.answerIndex]).toBe('Onkel')
    expect(e.options).toHaveLength(4)
    expect(e.options.slice().sort()).not.toContain('Cousine')
    const c = buildExercise(find('der Cousin'), 'context_choice', ctx(8)) as ChoiceExercise
    expect(c.options[c.answerIndex]).toBe('Cousin')
    expect(c.sentence).toBe('Wer ist das? – Das ist mein ___.')
  })
  it('listening: TTS says the word with its article, learner picks the Romanian meaning', () => {
    const e = buildExercise(find('die Tante'), 'listen_ro', ctx()) as ChoiceExercise
    expect(e.speak).toBe('die Tante')
    expect(e.options[e.answerIndex]).toBe('mătușa')
  })
  it('umlaut plurals are drilled more often than regular ones', () => {
    const rng = seededRng(11)
    const base = { deckSize: FAM.length, speakEnabled: false, rng }
    const info = { level: 2, skillLevels: { gender: 3, plural: 3 }, seenNumbers: [], hasPairs: false, collectives: false }
    const count = (w: Word): number => Array.from({ length: 400 }, () => chooseTypeFor(w, info, base)).filter((t) => t === 'plural_type' || t === 'plural_choice').length
    expect(count(find('die Mutter'))).toBeGreaterThan(count(find('die Schwester')) * 1.3)
  })
  it('(Pl.) nouns get article exercises but never plural/singular drills', () => {
    const rng = seededRng(12)
    const base = { deckSize: FAM.length, speakEnabled: false, rng }
    const info = { level: 2, skillLevels: {}, seenNumbers: [] }
    const types = new Set(Array.from({ length: 300 }, () => chooseTypeFor(find('die Eltern'), info, base)))
    expect(types.has('plural_type')).toBe(false)
    expect(types.has('plural_choice')).toBe(false)
    const a = buildExercise(find('die Eltern'), 'article', ctx()) as { type: string; answer: string; noun: string }
    expect(a).toMatchObject({ type: 'article', answer: 'die', noun: 'Eltern' })
  })
})
