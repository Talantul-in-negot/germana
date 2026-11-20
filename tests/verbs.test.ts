import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import {
  allVerbsUnlocked, analyzeSentence, answerItem, buildStageItems, canPassStage, checkForm, currentItem, distinctForms, isRegularPresent,
  markPassed, newConj, pickPairs, rewriteSentence, runFinished, sentencesOf, splitEnding, stagePassed, stageUnlocked, stagesPassed, startRun,
  type ConjItem,
} from '../src/core/conjugation'
import { buildExercise, chooseTypeFor, evaluateChoice, evaluateTyped, verbOptions, type ChoiceExercise, type MatchExercise, type TypeExercise } from '../src/core/exercises'
import { conjTier, verbCrown } from '../src/core/gamification'
import { parsePresentTable, parseVerbForms } from '../src/core/german'
import { seededRng } from '../src/core/id'
import { assignUnitsFor } from '../src/core/units'
import { parseWordList, rowToInput } from '../src/core/parser'
import {
  DAY_MS, applyPersonAnswer, effectiveLevel, formsLevel, isDue, newProgress, personStrengths, requiredSkills, skillLevel, wordStrengthAt, type AnswerInput,
} from '../src/core/srs'
import type { Word, WordProgress } from '../src/core/types'
import { LexiDB } from '../src/data/db'
import { VERBEN_TEXT, withSentenceTranslations } from '../src/data/seed'

const rows = parseWordList(VERBEN_TEXT).rows
const items = withSentenceTranslations(rows.map(rowToInput))
const V: Word[] = items.map((it, i) => ({ id: 'v' + i, deckId: 'v', unitIndex: 0, order: i, ...it }))
const verb = (t: string): Word => V.find((w) => w.term === t) as Word
let n = 0
const ctx = (seed = 1, extra: object = {}) => ({ deckWords: V, rng: seededRng(seed), newId: () => 'e' + n++, ...extra })
const T0 = new Date(2026, 0, 1, 12).getTime()

describe('P: table parser', () => {
  it('parses exactly 6 values in notebook order and derives present3sg', () => {
    const t = parsePresentTable('P: bin, bist, ist, sind, seid, sind')
    expect(t).toEqual(['bin', 'bist', 'ist', 'sind', 'seid', 'sind'])
    expect(parsePresentTable('P: a, b, c')).toBeNull()
    expect(parsePresentTable('P: a, b, c, d, e, f, g')).toBeNull()
    expect(parsePresentTable('geht, ging, ist gegangen')).toBeNull()
    const v = parseVerbForms('haben', 'P: habe, hast, hat, haben, habt, haben')
    expect(v.ok).toBe(true)
    expect(v.info.present?.[2]).toBe('hat')
    expect(v.info.present3sg).toBe('hat')
  })
  it('the old "3sg, Präteritum, Perfekt" syntax still works', () => {
    const v = parseVerbForms('gehen', 'geht, ging, ist gegangen')
    expect(v.info).toMatchObject({ present3sg: 'geht', praeteritum: 'ging', auxiliary: 'sein', irregular: true })
    expect(v.info.present).toBeUndefined()
  })
  it('pasting the 10 lines gives 10 verbs, 2 units, sein and haben irregular', () => {
    expect(rows).toHaveLength(10)
    expect(rows.every((r) => r.valid && r.warnings.length === 0 && r.type === 'verb')).toBe(true)
    expect(new Set(assignUnitsFor(rows)).size).toBe(2)
    expect(new Set(rows.map((r) => r.group))).toEqual(new Set(['sein und haben', 'regelmäßige verben']))
    const irregular = rows.filter((r) => r.verb?.irregular).map((r) => r.term)
    expect(irregular).toEqual(['sein', 'haben'])
    for (const r of rows) expect(r.verb?.present).toHaveLength(6)
  })
  it('a P: table with the wrong number of values is flagged', () => {
    const r = parseWordList('sehen ; a vedea ; P: sehe, siehst, sieht').rows[0]!
    expect(r.warnings).toContain('verb_forms_unparseable')
  })
  it('irregular detection follows stem + -e, -st, -t, -en, -t, -en (with e-insertion)', () => {
    expect(isRegularPresent('lernen', ['lerne', 'lernst', 'lernt', 'lernen', 'lernt', 'lernen'])).toBe(true)
    expect(isRegularPresent('arbeiten', ['arbeite', 'arbeitest', 'arbeitet', 'arbeiten', 'arbeitet', 'arbeiten'])).toBe(true)
    expect(isRegularPresent('sehen', ['sehe', 'siehst', 'sieht', 'sehen', 'seht', 'sehen'])).toBe(false)
    expect(parseVerbForms('fahren', 'P: fahre, fährst, fährt, fahren, fahrt, fahren').info.irregular).toBe(true)
    expect(parseVerbForms('lernen', 'P: lerne, lernst, lernt, lernen, lernt, lernen').info.irregular).toBe(false)
  })
  it('multiple example sentences are split on " // " and carry Romanian translations', () => {
    const s = sentencesOf(verb('haben'))
    expect(s.map((x) => x.de)).toEqual(['Ich habe einen Bruder.', 'Er hat eine Schwester.'])
    expect(s[0]?.ro).toBe('Eu am un frate.')
    expect(sentencesOf({})).toEqual([])
  })
  it('Romanian answers are accepted with or without the "a" particle', async () => {
    const { checkRomanian } = await import('../src/core/answer')
    expect(checkRomanian('învăța', verb('lernen').translations).verdict).toBe('correct')
    expect(checkRomanian('a învăța', verb('lernen').translations).verdict).toBe('correct')
    expect(checkRomanian('juca', verb('spielen').translations).verdict).toBe('correct')
    expect(checkRomanian('se juca', verb('spielen').translations).verdict).toBe('correct')
    expect(checkRomanian('a se juca', verb('spielen').translations).verdict).toBe('correct')
  })
})

describe('card, sentence analysis and rewriting', () => {
  it('splits stem and ending; irregular forms are coloured whole', () => {
    expect(splitEnding('lernen', 'lernst', 1, false)).toEqual({ stem: 'lern', ending: 'st' })
    expect(splitEnding('lernen', 'lernen', 3, false)).toEqual({ stem: 'lern', ending: 'en' })
    expect(splitEnding('arbeiten', 'arbeitest', 1, false)).toEqual({ stem: 'arbeit', ending: 'est' })
    expect(splitEnding('haben', 'hast', 1, true)).toEqual({ stem: '', ending: 'hast' })
    expect(distinctForms(verb('lernen').verb!.present!)).toEqual(['lerne', 'lernst', 'lernt', 'lernen'])
  })
  it('finds the conjugated form in a sentence and blanks it (identical forms disambiguated by the subject)', () => {
    const p = verb('wohnen').verb!.present!
    expect(analyzeSentence('Ich wohne in Timișoara.', p)).toMatchObject({ answer: 'wohne', person: 0, before: 'Ich ', after: ' in Timișoara.' })
    expect(analyzeSentence('Meine Oma wohnt auf dem Land.', p)?.person).toBe(2)
    expect(analyzeSentence('Ihr spielt im Garten.', verb('spielen').verb!.present!)?.person).toBe(4)
    expect(analyzeSentence('Wir sind in der Schule.', verb('sein').verb!.present!)?.person).toBe(3)
    expect(analyzeSentence('Woher kommst du?', verb('kommen').verb!.present!)).toMatchObject({ answer: 'kommst', person: 1, before: 'Woher ', after: ' du?' })
    expect(analyzeSentence('Kein Verb hier.', p)).toBeNull()
  })
  it('rewrites a sentence for another person', () => {
    const p = verb('haben').verb!.present!
    expect(rewriteSentence('Ich habe einen Bruder.', p, 2)).toBe('Er hat einen Bruder.')
    expect(rewriteSentence('Ich habe einen Bruder.', p, 4)).toBe('Ihr habt einen Bruder.')
    expect(rewriteSentence('Woher kommst du?', verb('kommen').verb!.present!, 0)).toBeNull()
  })
})

describe('exact-match checker (no typo tolerance for conjugated forms)', () => {
  it('"du ___ (haben)": hast is correct; habst and hat are wrong', () => {
    expect(checkForm('hast', 'hast')).toBe(true)
    expect(checkForm(' Hast ', 'hast')).toBe(true)
    expect(checkForm('habst', 'hast')).toBe(false)
    expect(checkForm('hat', 'hast')).toBe(false)
    const ex = buildExercise(verb('haben'), 'verb_pronoun_type', ctx(1, { person: 1 })) as TypeExercise
    expect(ex.prompt).toBe('du ___ (haben)')
    expect(evaluateTyped(ex, 'hast').correct).toBe(true)
    expect(evaluateTyped(ex, 'habst').correct).toBe(false)
    expect(evaluateTyped(ex, 'hat').correct).toBe(false)
  })
  it('lerne / lernst / lernt / lernen are one letter apart and are different answers', () => {
    const forms = ['lerne', 'lernst', 'lernt', 'lernen']
    for (const a of forms) for (const b of forms) expect(checkForm(a, b)).toBe(a === b)
    expect(checkForm('lernd', 'lernt')).toBe(false)
  })
  it('accepts the ae/oe/ue/ss substitutions', () => {
    expect(checkForm('faehrt', 'fährt')).toBe(true)
    expect(checkForm('fahrt', 'fährt')).toBe(false)
    expect(checkForm('', 'hast')).toBe(false)
  })
  it('a wrong form names the asked person', () => {
    const ex = buildExercise(verb('lernen'), 'verb_pronoun_type', ctx(1, { person: 1 })) as TypeExercise
    const o = evaluateTyped(ex, 'lernt')
    expect(o.correct).toBe(false)
    expect(o.personNote).toEqual({ person: 1, expected: 'lernst', given: 'lernt' })
    expect(o.credits).toEqual([{ skill: 'forms', correct: false, person: 1 }])
    expect(evaluateTyped(ex, 'lernst').personNote).toBeUndefined()
  })
})

describe('dropdown exercises', () => {
  it('levels 0-1 offer 3 options, levels 2+ all distinct forms; only the exact form is accepted', () => {
    const rng = seededRng(3)
    const lernen = verb('lernen')
    expect(verbOptions(lernen, V, 1, 'lernt', rng)).toHaveLength(3)
    expect(verbOptions(lernen, V, 0, 'lernt', rng)).toContain('lernt')
    const all = verbOptions(lernen, V, 2, 'lernt', rng)
    expect(all.slice().sort()).toEqual(['lerne', 'lernen', 'lernst', 'lernt'])
  })
  it('sein / haben mix in the other verb\'s forms as distractors', () => {
    const rng = seededRng(4)
    const haben = verb('haben')
    const all = verbOptions(haben, V, 2, 'hat', rng)
    for (const f of ['hat', 'ist', 'hast', 'habe', 'bin']) expect(all).toContain(f)
    expect(all).toHaveLength(10)
    const low = verbOptions(haben, V, 0, 'hat', rng)
    expect(low).toHaveLength(3)
    expect(low.some((f) => ['bin', 'bist', 'ist', 'sind', 'seid'].includes(f))).toBe(true)
  })
  it('"Er ___ einen Bruder." offers hat / ist / hast / habe / bin and credits the person', () => {
    let found: ChoiceExercise | null = null
    for (let seed = 1; seed < 80 && !found; seed++) {
      const e = buildExercise(verb('haben'), 'verb_dropdown', ctx(seed, { person: 2, level: 2 })) as ChoiceExercise
      if (e.sentence === 'Er ___ einen Bruder.') found = e
    }
    expect(found).not.toBeNull()
    const e = found as ChoiceExercise
    for (const f of ['hat', 'ist', 'hast', 'habe', 'bin']) expect(e.options).toContain(f)
    expect(e.inline).toEqual({ before: 'Er ', after: ' einen Bruder.' })
    expect(e.options[e.answerIndex]).toBe('hat')
    expect(evaluateChoice(e, e.answerIndex).credits).toEqual([{ skill: 'forms', correct: true, person: 2 }])
    const wrongIdx = e.options.indexOf('ist')
    const o = evaluateChoice(e, wrongIdx)
    expect(o.correct).toBe(false)
    expect(o.personNote).toMatchObject({ person: 2, expected: 'hat', given: 'ist' })
  })
  it('pronoun -> form (choice), listening with a blank, context choice "Woher ___ du?"', () => {
    const p = buildExercise(verb('kommen'), 'verb_pronoun', ctx(2, { person: 3, level: 0 })) as ChoiceExercise
    expect(p.prompt).toBe('wir ___ (kommen)')
    expect(p.options[p.answerIndex]).toBe('kommen')
    const l = buildExercise(verb('gehen'), 'verb_listen_blank', ctx(5, { level: 3 })) as ChoiceExercise
    expect(l.speakParts).toBeDefined()
    expect(l.sentence).toContain('___')
    let c: ChoiceExercise | null = null
    for (let seed = 1; seed < 20 && !c; seed++) {
      const e = buildExercise(verb('kommen'), 'context_choice', ctx(seed, { level: 2 })) as ChoiceExercise
      if (e.sentence === 'Woher ___ du?') c = e
    }
    expect(c).not.toBeNull()
    expect((c as ChoiceExercise).options[(c as ChoiceExercise).answerIndex]).toBe('kommst')
  })
  it('match endings to persons (regular verbs only)', () => {
    const e = buildExercise(verb('lernen'), 'verb_endings', ctx()) as MatchExercise
    expect(e.type).toBe('verb_endings')
    expect(e.pairs.map((p) => [p.left, p.right])).toEqual([['ich', '-e'], ['du', '-st'], ['er/sie/es', '-t'], ['wir', '-en'], ['ihr', '-t'], ['Sie/sie', '-en']])
    expect(buildExercise(verb('sein'), 'verb_endings', ctx()).type).not.toBe('verb_endings')
  })
  it('sentence building: Romanian sentence -> German word bank (only these verbs)', () => {
    let e = null as ReturnType<typeof buildExercise> | null
    for (let seed = 1; seed < 20; seed++) {
      e = buildExercise(verb('haben'), 'verb_sentence_build', ctx(seed))
      if (e.type === 'verb_sentence_build' && e.prompt === 'Eu am un frate.') break
    }
    expect(e?.type).toBe('verb_sentence_build')
    const s = e as { prompt: string; solution: string[]; noSpeak?: boolean }
    expect(s.prompt).toBe('Eu am un frate.')
    expect(s.solution.join(' ')).toBe('Ich habe einen Bruder.')
    expect(s.noSpeak).toBe(true)
  })
  it('exercise choice: verbs with a present table get verb exercises, never the old verb_forms', () => {
    const rng = seededRng(21)
    const base = { deckSize: V.length, speakEnabled: false, rng }
    const types = new Set(Array.from({ length: 300 }, () => chooseTypeFor(verb('lernen'), { level: 2, skillLevels: {}, seenNumbers: [] }, base)))
    expect(types.has('verb_pronoun') || types.has('verb_dropdown')).toBe(true)
    expect(types.has('verb_forms')).toBe(false)
    expect(types.has('separable')).toBe(false)
  })
})

describe('Conjugare stages', () => {
  const haben = verb('haben')
  const lernen = verb('lernen')
  it('stage 1: 6 persons in notebook order, 3 options each, correct one among them', () => {
    const it1 = buildStageItems(haben, V, 1, seededRng(1))
    expect(it1.map((i) => i.person)).toEqual([0, 1, 2, 3, 4, 5])
    expect(it1.map((i) => i.answer)).toEqual(haben.verb!.present)
    for (const i of it1) {
      expect(i.options).toHaveLength(3)
      expect(i.options).toContain(i.answer)
      expect(new Set(i.options).size).toBe(3)
    }
    expect(it1[0]?.prompt).toBe('ich ___')
  })
  it('stage 2: ALL forms, shuffled persons, each twice (alone and in a sentence); only the exact form is accepted', () => {
    const it2 = buildStageItems(lernen, V, 2, seededRng(2))
    expect(it2).toHaveLength(12)
    for (let p = 0; p < 6; p++) {
      const mine = it2.filter((i) => i.person === p)
      expect(mine).toHaveLength(2)
      expect(mine.map((i) => i.kind).sort()).toEqual(['dropdownAll', 'sentenceAll'])
    }
    const ihr = it2.find((i) => i.person === 4 && i.kind === 'dropdownAll') as ConjItem
    expect(ihr.prompt).toBe('ihr ___')
    expect(ihr.options!.slice().sort()).toEqual(['lerne', 'lernen', 'lernst', 'lernt'])
    expect(ihr.answer).toBe('lernt')
    expect(ihr.options!.filter((o) => checkForm(o, ihr.answer))).toEqual(['lernt'])
    const sent = it2.find((i) => i.kind === 'sentenceAll') as ConjItem
    expect(sent.prompt).toContain('___')
    expect(sent.before! + sent.answer + sent.after!).toMatch(/\w/)
    expect(it2.map((i) => i.person).join()).not.toBe([0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5].join())
    const h2 = buildStageItems(haben, V, 2, seededRng(3))
    expect(h2[0]?.options).toHaveLength(10) // sein + haben forms
  })
  it('stage 3: typing, random order, one at a time, no options', () => {
    const it3 = buildStageItems(haben, V, 3, seededRng(4))
    expect(it3).toHaveLength(6)
    expect(new Set(it3.map((i) => i.person)).size).toBe(6)
    expect(it3.every((i) => i.kind === 'typing' && !i.options && /\(haben\)$/.test(i.prompt))).toBe(true)
    expect(it3.find((i) => i.person === 1)?.prompt).toBe('du ___ (haben)')
  })
  it('cannot end before all 6 persons were answered correctly; wrong rows are repeated', () => {
    let run = startRun(buildStageItems(haben, V, 1, seededRng(1)))
    run = answerItem(run, false) // ich wrong
    expect(runFinished(run)).toBe(false)
    for (let i = 0; i < 5; i++) run = answerItem(run, true)
    expect(runFinished(run)).toBe(false) // the repeated row is still pending
    expect(currentItem(run)?.person).toBe(0)
    expect(run.queue).toHaveLength(7)
    run = answerItem(run, true)
    expect(runFinished(run)).toBe(true)
    expect(run.attempts.filter((a) => a.firstTry)).toHaveLength(6)
    expect(stagePassed(run)).toBe(true) // 5/6 first-try correct
  })
  it('passing needs >= 5/6; 4/6 fails', () => {
    let run = startRun(buildStageItems(haben, V, 1, seededRng(1)))
    for (let i = 0; i < 6; i++) run = answerItem(run, i >= 2) // persons 0 and 1 wrong
    while (!runFinished(run)) run = answerItem(run, true)
    expect(stagePassed(run)).toBe(false)
  })
  it('a person with two rows (stage 2) counts as correct only if both first tries were right', () => {
    let run = startRun(buildStageItems(lernen, V, 2, seededRng(5)))
    let first = true
    while (!runFinished(run)) {
      const cur = currentItem(run) as ConjItem
      const wrongOnce = first && cur.person === 0
      if (wrongOnce) first = false
      run = answerItem(run, !wrongOnce)
    }
    expect(run.personOk[0]).toBe(false)
    expect(stagePassed(run)).toBe(true) // 5 other persons are fine
  })
  it('after stage 1 on a given day, stage 2 opens only on a later day; a stage is not passed twice a day', () => {
    const d1 = '2026-01-01'
    const d2 = '2026-01-02'
    let c = newConj()
    expect(stageUnlocked(c, 1, d1)).toBe(true)
    expect(stageUnlocked(c, 2, d1)).toBe(false)
    expect(canPassStage(c, 1, d1)).toBe(true)
    c = markPassed(c, 1, d1)
    expect(c.passed).toEqual([d1, null, null])
    expect(stageUnlocked(c, 2, d1)).toBe(false)
    expect(canPassStage(c, 1, d1)).toBe(false)
    expect(markPassed(c, 2, d1).passed[1]).toBeNull() // cannot be recorded the same day
    expect(stageUnlocked(c, 2, d2)).toBe(true)
    c = markPassed(c, 2, d2)
    expect(c.passed).toEqual([d1, d2, null])
    expect(stageUnlocked(c, 3, d2)).toBe(false)
    expect(stageUnlocked(c, 3, '2026-01-03')).toBe(true)
    expect(stagesPassed(c)).toBe(2)
    expect(stagesPassed(undefined)).toBe(0)
    expect(stageUnlocked(undefined, 2, d2)).toBe(false)
  })
  it('"Toate verbele" unlocks with 3 verbs at silver; 20 random (verb, person) pairs', () => {
    expect(allVerbsUnlocked([2, 2, 1, 3])).toBe(true)
    expect(allVerbsUnlocked([2, 2, 1, 1])).toBe(false)
    const pairs = pickPairs(['a', 'b', 'c'], seededRng(2))
    expect(pairs).toHaveLength(20)
    expect(pairs.every((p) => ['a', 'b', 'c'].includes(p.verbId) && p.person >= 0 && p.person < 6)).toBe(true)
    expect(pickPairs([], seededRng(1))).toEqual([])
    expect(pickPairs(['a'], seededRng(1), 20)).toHaveLength(20)
  })
})

describe('per-person progress', () => {
  const ans = (p: WordProgress, person: number, over: Partial<AnswerInput> & { sessionId: string }): WordProgress =>
    applyPersonAnswer(p, person, { correct: true, type: 'conj_typing', now: T0, ...over }).progress
  const base = (): WordProgress => ({ ...newProgress('p', 'w'), required: ['forms'] })

  it('each person has its own SRS state', () => {
    let p = base()
    p = ans(p, 1, { sessionId: 's1' })
    p = ans(p, 1, { sessionId: 's1', correct: false })
    expect(p.persons).toHaveLength(6)
    expect(p.persons![1]!.lapses).toBe(1)
    expect(p.persons![0]!.level).toBe(0)
    expect(p.persons![1]!.level).toBe(1)
    expect(p.level).toBe(0) // meaning untouched
  })
  it('forms level is the (rounded down) average of the 6 persons and caps the verb level', () => {
    let p: WordProgress = { ...base(), level: 5 }
    expect(effectiveLevel(p)).toBe(2) // forms 0 + margin
    for (let person = 0; person < 6; person++) for (let s = 0; s < 12; s++) p = ans(p, person, { sessionId: `a${person}x${s}`, now: T0 + s * 1000 })
    expect(formsLevel(p)).toBe(4)
    expect(skillLevel(p, 'forms')).toBe(4)
    for (let person = 0; person < 6; person++) for (let s = 0; s < 3; s++) p = ans(p, person, { sessionId: `b${person}x${s}`, now: T0 + DAY_MS + s * 1000 })
    expect(formsLevel(p)).toBe(5)
    expect(effectiveLevel(p)).toBe(5)
    // one lagging person pulls the average (and the cap) down
    const weak = { ...p, persons: p.persons!.map((x, i) => (i === 0 ? { ...x, level: 0 as const } : x)) }
    expect(formsLevel(weak)).toBeLessThanOrEqual(4)
    expect(effectiveLevel(weak)).toBeLessThanOrEqual(5)
  })
  it('strength per person, word strength = average, due when any person is due', () => {
    let p = base()
    p = { ...p, level: 3, lastSeenAt: T0, dueAt: T0 + 5 * DAY_MS, interval: 5 }
    for (let person = 0; person < 6; person++) p = ans(p, person, { sessionId: 's' + person })
    const sts = personStrengths(p, T0)
    expect(sts).toHaveLength(6)
    expect(sts.every((x) => x > 0)).toBe(true)
    expect(personStrengths(base(), T0)).toEqual([0, 0, 0, 0, 0, 0])
    const later = T0 + 40 * DAY_MS
    expect(Math.max(...personStrengths(p, later))).toBeLessThan(Math.min(...sts))
    expect(wordStrengthAt(p, later)).toBeLessThan(wordStrengthAt(p, T0))
    expect(isDue({ ...p, dueAt: T0 + 99 * DAY_MS }, later)).toBe(true) // persons are due even if meaning is not
  })
  it('requires the forms sub-skill for verbs with a present table', () => {
    expect(requiredSkills(verb('haben'))).toEqual(['forms'])
  })
  it('verb crown: average strength of the 6 persons, no gold while any person is below 60%', () => {
    expect(verbCrown([90, 90, 90, 90, 90, 90])).toBe(3)
    expect(verbCrown([100, 100, 100, 100, 100, 50])).toBe(2)
    expect(verbCrown([70, 70, 70, 70, 70, 70])).toBe(2)
    expect(verbCrown([20, 20, 20, 20, 20, 20])).toBe(0)
    expect(verbCrown([])).toBe(0)
    expect(conjTier(3, [90, 90, 90, 90, 90, 90])).toBe(3)
    expect(conjTier(3, [90, 90, 90, 90, 90, 40])).toBe(2)
    expect(conjTier(1, [90, 90, 90, 90, 90, 90])).toBe(1)
    expect(conjTier(0, [])).toBe(0)
    expect(conjTier(3, [])).toBe(2)
  })
})

describe('Dexie v2 -> v3 migration keeps progress', () => {
  it('existing rows survive and new optional fields are simply absent', async () => {
    const name = 'mig-v3'
    const old = new LexiDB(name)
    await old.open()
    await old.progress.add({ ...newProgress('p', 'w'), level: 4, interval: 9 })
    old.close()
    const again = new LexiDB(name)
    await again.open()
    expect(again.verno).toBe(3)
    const row = (await again.progress.get(['p', 'w']))!
    expect(row.level).toBe(4)
    expect(row.interval).toBe(9)
    expect(row.persons).toBeUndefined()
    again.close()
  })
})
