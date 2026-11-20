import { describe, expect, it } from 'vitest'
import { checkAnswer, checkRomanian, expandRomanian } from '../src/core/answer'
import { checkDigits, checkGermanAnswer, asciiDe } from '../src/core/answerDe'
import { applyUmlaut, expandPlural, parseGermanTerm, parseVerbForms, splitArticle, splitDialogue } from '../src/core/german'
import { allNumberWords, isCompoundNumber, numberBreakdown, numberDistractors, numberToGerman } from '../src/core/numbers'
import { parseWordList, pluralDisplay } from '../src/core/parser'
import { assignUnitsFor, unitSizes } from '../src/core/units'
import { DEMO_TEXT, WFRAGEN_TEXT, ZAHLEN_TEXT } from './fixtures/seed-fixture'

const row = (line: string) => parseWordList(line).rows[0]!

describe('plural shorthand', () => {
  it.each([
    ['Tisch', '-e', 'Tische'],
    ['Mutter', '¨-', 'Mütter'],
    ['Buch', '¨-er', 'Bücher'],
    ['Auto', '-s', 'Autos'],
    ['Lehrer', '-', 'Lehrer'],
    ['Vater', '"-', 'Väter'],
    ['Haus', ':-er', 'Häuser'],
    ['Lehrerin', '-nen', 'Lehrerinnen'],
    ['Apfel', '¨-', 'Äpfel'],
    ['Frau', '-en', 'Frauen'],
  ])('%s, %s -> %s', (noun, sh, plural) => {
    expect(expandPlural(noun, sh).plural).toBe(plural)
  })
  it('(Pl.) and (Sg.)', () => {
    expect(expandPlural('Eltern', '(Pl.)')).toEqual({ plural: 'Eltern', pluralOnly: true, error: false })
    expect(expandPlural('Milch', '(Sg.)')).toEqual({ plural: null, pluralOnly: false, error: false })
  })
  it('flags unparseable shorthand and impossible umlauts', () => {
    expect(expandPlural('Tisch', '?!').error).toBe(true)
    expect(expandPlural('Tisch', '').error).toBe(true)
    expect(expandPlural('Reis', '¨-e').error).toBe(true)
  })
  it('applyUmlaut handles au', () => {
    expect(applyUmlaut('Haus')).toBe('Häus')
    expect(applyUmlaut('Baum')).toBe('Bäum')
    expect(applyUmlaut('Fisch')).toBeNull()
  })
})

describe('German term parsing', () => {
  it('die Mutter, ¨- previews as plural "die Mütter"', () => {
    const r = row('die Mutter, ¨- ; mama ; ; ; family')
    expect(r.type).toBe('noun')
    expect(r.gender).toBe('die')
    expect(r.term).toBe('die Mutter')
    expect(r.plural).toBe('Mütter')
    expect(pluralDisplay(r.plural)).toBe('die Mütter')
    expect(r.warnings).toEqual([])
  })
  it('nouns, plural-only and no-plural', () => {
    expect(row('der Tisch, -e ; masă').plural).toBe('Tische')
    expect(row('das Buch, ¨-er ; carte').plural).toBe('Bücher')
    const eltern = row('die Eltern (Pl.) ; părinți')
    expect(eltern.pluralOnly).toBe(true)
    expect(eltern.term).toBe('die Eltern')
    expect(row('die Milch, (Sg.) ; lapte').plural).toBeNull()
  })
  it('explicit plural in the forms column', () => {
    expect(row('der Tisch ; masă ; die Tische').plural).toBe('Tische')
    expect(row('das Kind ; copil ; Kinder').plural).toBe('Kinder')
    expect(row('der Tisch ; masă ; -e').plural).toBe('Tische')
  })
  it('flags nouns without article, lowercased nouns, bad plurals', () => {
    expect(row('Tisch, -e ; masă').warnings).toContain('noun_no_article')
    expect(row('der tisch, -e ; masă').warnings).toContain('noun_lowercase')
    expect(row('der Tisch, ?! ; masă').warnings).toContain('plural_unparseable')
  })
  it('keeps the first variant displayed and the others as alternatives (both sides)', () => {
    const r = row('Wie viel?|Wieviel? ; Cât?|Câți?|Câte?')
    expect(r.term).toBe('Wie viel?')
    expect(r.alternatives).toEqual(['Wieviel?'])
    expect(r.translations).toEqual(['Cât?', 'Câți?', 'Câte?'])
    expect(r.type).toBe('other')
  })
  it('empty fields are allowed', () => {
    const r = row('Wo? ; Unde? ; ; Wo wohnst du? – In Timișoara.')
    expect(r.valid).toBe(true)
    expect(r.example).toBe('Wo wohnst du? – In Timișoara.')
    expect(r.forms).toBeUndefined()
  })
  it('splitArticle / parseGermanTerm basics', () => {
    expect(splitArticle('Das Mädchen')).toEqual({ article: 'das', rest: 'Mädchen' })
    expect(splitArticle('Hallo').article).toBeNull()
    expect(parseGermanTerm('').display).toBe('')
  })
})

describe('verbs', () => {
  it('gehen ; a merge ; geht, ging, ist gegangen', () => {
    const r = row('gehen ; a merge ; geht, ging, ist gegangen ; Ich gehe nach Hause.')
    expect(r.type).toBe('verb')
    expect(r.verb).toMatchObject({ present3sg: 'geht', praeteritum: 'ging', perfekt: 'ist gegangen', auxiliary: 'sein', irregular: true, separable: false })
  })
  it('regular verb with haben', () => {
    const r = row('machen ; a face ; macht, machte, hat gemacht')
    expect(r.verb).toMatchObject({ auxiliary: 'haben', irregular: false })
  })
  it('separable verbs', () => {
    const r = row('aufstehen ; a se ridica ; steht auf, stand auf, ist aufgestanden ; Ich stehe um 7 Uhr auf.')
    expect(r.verb?.separable).toBe(true)
    expect(r.verb?.auxiliary).toBe('sein')
  })
  it('accepts any prefix of the forms list and detects bare verbs by "a "', () => {
    expect(row('wohnen ; a locui ; wohnt').verb).toEqual({ present3sg: 'wohnt', separable: false, irregular: false })
    const v = row('lernen ; a învăța')
    expect(v.type).toBe('verb')
  })
  it('parseVerbForms rejects nonsense', () => {
    expect(parseVerbForms('Tisch', '123').ok).toBe(false)
  })
  it('dialogues', () => {
    expect(splitDialogue('Wo wohnst du? – In Timișoara.')).toEqual({ question: 'Wo wohnst du?', answer: 'In Timișoara.' })
    expect(splitDialogue('Wo wohnst du? - Hier.')?.answer).toBe('Hier.')
    expect(splitDialogue('Kein Dialog')).toBeNull()
    expect(splitDialogue(undefined)).toBeNull()
  })
})

describe('tags: numbers and groups', () => {
  it('n=21 sets the value, ranges become groups, type stays other', () => {
    const r = row('einundzwanzig ; douăzeci și unu ; ; ; n=21 21-30')
    expect(r.value).toBe(21)
    expect(r.group).toBe('21-30')
    expect(r.type).toBe('other')
    expect(r.tags).toEqual([])
  })
  it('one unit per group, regardless of the 8–10 rule', () => {
    const words = [{ group: '0-10' }, { group: '0-10' }, { group: '11-20' }, {}, { group: '21-30' }]
    expect(assignUnitsFor(words)).toEqual([0, 0, 1, 1, 2])
  })
  it('lessons <= 12 words are one unit; larger ones split 8–10', () => {
    expect(unitSizes(12)).toEqual([12])
    expect(unitSizes(8)).toEqual([8])
    expect(assignUnitsFor(Array.from({ length: 30 }, () => ({})))).toHaveLength(30)
    expect(new Set(assignUnitsFor(Array.from({ length: 30 }, () => ({})))).size).toBe(3)
  })
})

describe('seed lessons import without warnings', () => {
  it('W-Fragen', () => {
    const r = parseWordList(WFRAGEN_TEXT)
    expect(r.rows).toHaveLength(8)
    expect(r.rows.every((x) => x.valid && x.warnings.length === 0)).toBe(true)
    const wv = r.rows[7]!
    expect(wv.term).toBe('Wie viel?')
    expect(wv.alternatives).toEqual(['Wieviel?'])
  })
  it('Zahlen 0–40', () => {
    const r = parseWordList(ZAHLEN_TEXT)
    expect(r.rows).toHaveLength(41)
    expect(r.rows.every((x) => x.valid && x.warnings.length === 0 && x.value !== undefined)).toBe(true)
    expect(r.rows.every((x, i) => x.value === i && x.translations.length > 0)).toBe(true)
    expect(r.rows.map((x) => x.term)).toEqual(Array.from({ length: 41 }, (_, i) => numberToGerman(i)))
    expect(new Set(r.rows.map((x) => x.group))).toEqual(new Set(['0-10', '11-20', '21-30', '31-40']))
  })
  it('demo lesson', () => {
    const r = parseWordList(DEMO_TEXT)
    expect(r.rows.every((x) => x.valid)).toBe(true)
  })
})

describe('German answer checker', () => {
  const madchen = { term: 'das Mädchen' }
  it('"Maedchen" for "das Mädchen" -> almost (missing article)', () => {
    const c = checkGermanAnswer('Maedchen', madchen)
    expect(c.verdict).toBe('almost')
    expect(c.meaning).toBe(true)
    expect(c.gender).toBe('skip')
    expect(c.notes).toContain('article_missing')
    expect(c.notes).toContain('umlaut_spelling')
  })
  it('"das Maedchen" -> correct, with a spelling note', () => {
    const c = checkGermanAnswer('das Maedchen', madchen)
    expect(c.verdict).toBe('correct')
    expect(c.notes).toEqual(['umlaut_spelling'])
    expect(c.gender).toBe('ok')
    expect(c.expected).toBe('das Mädchen')
  })
  it('"der Mädchen" -> meaning credited, gender failed', () => {
    const c = checkGermanAnswer('der Mädchen', madchen)
    expect(c.verdict).toBe('almost')
    expect(c.meaning).toBe(true)
    expect(c.gender).toBe('fail')
    expect(c.notes).toContain('article_wrong')
  })
  it('exact answer with article', () => {
    const c = checkGermanAnswer('das Mädchen', madchen)
    expect(c).toMatchObject({ verdict: 'correct', gender: 'ok', notes: [], quality: 'exact' })
  })
  it('noun in lowercase is "almost"', () => {
    const c = checkGermanAnswer('das mädchen', madchen)
    expect(c.verdict).toBe('almost')
    expect(c.notes).toContain('capital')
    expect(c.meaning).toBe(true)
  })
  it('"schon" is rejected for "schön" (dropped umlaut) and vice versa', () => {
    expect(checkGermanAnswer('schon', { term: 'schön' }, ['schon']).verdict).toBe('wrong')
    expect(checkGermanAnswer('schon', { term: 'schön' }).verdict).toBe('wrong')
    expect(checkGermanAnswer('schoen', { term: 'schön' }).verdict).toBe('correct')
    expect(checkGermanAnswer('zahlen', { term: 'zählen' }).verdict).toBe('wrong')
    expect(checkGermanAnswer('zaehlen', { term: 'zählen' }).notes).toEqual(['umlaut_spelling'])
  })
  it('ß ~ ss', () => {
    expect(checkGermanAnswer('heissen', { term: 'heißen' }).verdict).toBe('correct')
    expect(asciiDe('Straße')).toBe('strasse')
  })
  it('typo accepted and flagged when it is not another word', () => {
    const c = checkGermanAnswer('Schueler', { term: 'der Schüler' })
    expect(c.notes).toContain('umlaut_spelling')
    const t = checkGermanAnswer('der Schulr', { term: 'der Schüler' })
    expect(t.verdict).toBe('wrong')
    const typo = checkGermanAnswer('der Schüller', { term: 'der Schüler' })
    expect(typo.verdict).toBe('almost')
    expect(typo.quality).toBe('typo')
  })
  it('typo that yields another word of the course is rejected', () => {
    expect(checkGermanAnswer('Tische', { term: 'Tisches' }, ['tische']).verdict).toBe('wrong')
    expect(checkGermanAnswer('sechszehn', { term: 'sechzehn' }, allNumberWords()).verdict).toBe('almost')
    expect(checkGermanAnswer('siebzehn', { term: 'siebzig' }, allNumberWords()).verdict).toBe('wrong')
  })
  it('all | alternatives accepted; first one is displayed', () => {
    const t = { term: 'Wie viel?', alternatives: ['Wieviel?'] }
    expect(checkGermanAnswer('Wieviel', t).verdict).toBe('correct')
    expect(checkGermanAnswer('Wie viel', t).verdict).toBe('correct')
    expect(checkGermanAnswer('wie viel?', t).verdict).toBe('correct')
    expect(checkGermanAnswer('Wo', t).verdict).toBe('wrong')
  })
  it('empty answer', () => {
    expect(checkGermanAnswer('  ', madchen).verdict).toBe('wrong')
  })
})

describe('numbers', () => {
  it('generates and breaks down number words', () => {
    expect(numberToGerman(0)).toBe('null')
    expect(numberToGerman(12)).toBe('zwölf')
    expect(numberToGerman(16)).toBe('sechzehn')
    expect(numberToGerman(21)).toBe('einundzwanzig')
    expect(numberToGerman(30)).toBe('dreißig')
    expect(numberToGerman(36)).toBe('sechsunddreißig')
    expect(numberToGerman(100)).toBe('hundert')
    expect(numberBreakdown(21)).toEqual([
      { text: 'ein', kind: 'unit' }, { text: 'und', kind: 'und' }, { text: 'zwanzig', kind: 'ten' },
    ])
    expect(isCompoundNumber(21)).toBe(true)
    expect(isCompoundNumber(20)).toBe(false)
    expect(() => numberBreakdown(101)).toThrow()
  })
  it('digits are an equivalent answer: 21 = einundzwanzig', () => {
    const t = { term: 'einundzwanzig', value: 21 }
    expect(checkGermanAnswer('21', t)).toMatchObject({ verdict: 'correct', notes: ['digits'] })
    expect(checkGermanAnswer('12', t).verdict).toBe('wrong')
    expect(checkGermanAnswer('einundzwanzig', t).verdict).toBe('correct')
    expect(checkDigits(' 21 ', 21)).toBe(true)
    expect(checkDigits('zwölf', 12)).toBe(false)
  })
  it('dreissig = dreißig; spaces/hyphens -> almost (one word)', () => {
    const t = { term: 'dreißig', value: 30 }
    expect(checkGermanAnswer('dreissig', t).verdict).toBe('correct')
    const u = { term: 'einundzwanzig', value: 21 }
    expect(checkGermanAnswer('ein und zwanzig', u).verdict).toBe('almost')
    expect(checkGermanAnswer('ein-und-zwanzig', u).notes).toContain('number_one_word')
  })
  it('never accepts a typo that produces another number word', () => {
    const lex = allNumberWords()
    expect(checkGermanAnswer('sechzen', { term: 'sechzehn' }, lex).verdict).toBe('almost')
    expect(checkGermanAnswer('dreizehn', { term: 'dreißig' }, lex).verdict).toBe('wrong')
    expect(checkGermanAnswer('siebzig', { term: 'siebzehn' }, lex).verdict).toBe('wrong')
    expect(checkGermanAnswer('sechs', { term: 'sechzehn' }, lex).verdict).toBe('wrong')
  })
  it('distractors: swapped digits and teen/ten neighbours', () => {
    const d21 = numberDistractors(21, () => 0.5)
    expect(d21).toContain(12)
    const d13 = numberDistractors(13, () => 0.5)
    expect(d13).toContain(31)
    expect(d13).toContain(30)
    expect(numberDistractors(30, () => 0.5)).toContain(13)
    expect(numberDistractors(5, () => 0.5)).toHaveLength(3)
    expect(new Set(numberDistractors(21, () => 0.1)).size).toBe(3)
  })
})

describe('Romanian answers', () => {
  it('accepts with or without the definite article and diacritics', () => {
    expect(checkRomanian('masa', ['masă']).verdict).not.toBe('wrong')
    expect(checkRomanian('masă', ['masă']).verdict).toBe('correct')
    expect(checkRomanian('câinele', ['câine']).verdict).toBe('correct')
    expect(checkRomanian('băiatul', ['băiat']).verdict).toBe('correct')
    expect(checkRomanian('floarea', ['floare']).verdict).toBe('correct')
    expect(checkRomanian('merge', ['a merge']).verdict).toBe('correct')
    expect(checkRomanian('ţara', ['țara']).verdict).toBe('correct')
    expect(checkRomanian('Câte', ['Cât?', 'Câți?', 'Câte?']).verdict).toBe('correct')
    expect(checkRomanian('xyz', ['masă']).verdict).toBe('wrong')
  })
  it('expandRomanian covers the common endings', () => {
    expect(expandRomanian(['ochi', 'stea', 'masă', 'om'])).toEqual(expect.arrayContaining(['ochil', 'steaua', 'masa', 'omul']))
    expect(expandRomanian(['', 'două cuvinte'])).toEqual(['două cuvinte'])
  })
  it('lexicon rule: a typo equal to another word is wrong', () => {
    expect(checkAnswer('casei', ['casă', 'caseta'], ['casei']).verdict).toBe('wrong')
    expect(checkAnswer('caseta', ['casetă'], ['caseta']).verdict).toBe('diacritics')
  })
})
