ROOT = 'C:/Users/Sergiu/Desktop/Projects/De/'


def rd(p):
    return open(ROOT + p, encoding='utf-8').read()


def wr(p, s):
    open(ROOT + p, 'w', encoding='utf-8').write(s)


def must(s, old, new):
    assert old in s, old[:70]
    return s.replace(old, new, 1)


s = rd('src/core/exercises.ts')
s = must(s, "import { MONTHS, SEASONS,", "import { ENDINGS, PERSONS, allFormsFor, analyzeSentence, checkForm, distinctForms, hasPresent, isSeinHaben, rewriteSentence, sentencesOf } from './conjugation'\nimport { MONTHS, SEASONS,")
s = must(s, "'collective' | 'possessive'\n", "'collective' | 'possessive' | 'verb_dropdown' | 'verb_pronoun' | 'verb_listen_blank'\n") if "'collective' | 'possessive'\n" in s else s
s = must(s, "| 'season_months' | 'collective' | 'possessive'", "| 'season_months' | 'collective' | 'possessive' | 'verb_dropdown' | 'verb_pronoun' | 'verb_listen_blank'")
s = must(s, "  /** number value, to show the ein+und+zwanzig breakdown */\n  value?: number\n}", "  /** number value, to show the ein+und+zwanzig breakdown */\n  value?: number\n  /** present-tense person (0..5) this exercise trains */\n  person?: number\n  /** dropdown inside a sentence (verb_dropdown) */\n  inline?: { before: string; after: string }\n  /** TTS reads before, beeps for the blank, reads after (verb_listen_blank) */\n  speakParts?: [string, string]\n}")
s = must(s, "  type: 'match' | 'match_qa' | 'gender_pairs'\n", "  type: 'match' | 'match_qa' | 'gender_pairs' | 'verb_endings'\n")
s = must(s, "'num_arith' | 'seq_neighbor_type'\n", "'num_arith' | 'seq_neighbor_type' | 'verb_pronoun_type'\n") if False else s
s = must(s, "| 'num_arith' | 'seq_neighbor_type'", "| 'num_arith' | 'seq_neighbor_type' | 'verb_pronoun_type'")
s = must(s, "  roLexicon?: string[]\n", "  roLexicon?: string[]\n  /** conjugated form: EXACT match, no typo tolerance */\n  exact?: { expected: string; person: number }\n")
s = must(s, "  bank: string[]\n  speak: string\n}", "  bank: string[]\n  speak: string\n  /** do not read the German sentence aloud (it would give the answer away) */\n  noSpeak?: boolean\n}")
s = must(s, "  /** effective level of the target word (partial vs full sequence) */\n  level?: number\n}", "  /** effective level of the target word (partial vs full sequence, dropdown size) */\n  level?: number\n  /** present-tense person to practise (the weakest one) */\n  person?: number\n}")
s = must(s, "  hasPairs?: boolean\n", "  hasPairs?: boolean\n  /** strength (0-100) of each person of a present-tense verb */\n  personStrengths?: number[]\n")

# contextOf: verbs with a present table blank the conjugated form (prefer questions)
s = must(s, "  if (w.type === 'other' && w.example) {", """  if (w.verb?.present && w.example) {
    const sents = sentencesOf(w).map((x) => x.de)
    const pick = sents.find((x) => x.trim().endsWith('?')) ?? sents[0]
    const b = pick ? analyzeSentence(pick, w.verb.present) : null
    if (b) return { sentence: `${b.before}___${b.after}`, question: pick as string, answer: '' }
  }
  if (w.type === 'other' && w.example) {""")

# chooseTypeFor: verbs with a present table
s = must(s, "  if (info.level >= 1) {\n    const req = requiredSkills(w)", """  if (hasPresent(w) && info.level >= 1 && ctx.rng() < 0.7) {
    const band = bandForLevel(info.level)
    const regular = !w.verb?.irregular
    const ro = sentencesOf(w).some((x) => x.ro)
    if (band === 'recognition') return pick(['verb_dropdown', 'verb_listen_blank', ...(regular ? (['verb_endings'] as const) : [])])
    if (band === 'recall') return pick(['verb_pronoun', 'context_choice', 'verb_dropdown', ...(ro ? (['verb_sentence_build'] as const) : [])])
    return pick(['verb_pronoun_type', 'verb_dropdown', ...(ro ? (['verb_sentence_build'] as const) : [])])
  }
  if (info.level >= 1 && !hasPresent(w)) {
    const req = requiredSkills(w)""")

# builders
s = must(s, "    // ---- family ----\n    case 'gender_pairs': {", """    // ---- present-tense verbs ----
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
    case 'gender_pairs': {""")

# context_choice for verbs with a present table
s = must(s, "    case 'context_choice': {\n      const c = contextOf(w)\n      if (!c) return buildExercise(w, 'mc_l1_l2', ctx)", """    case 'context_choice': {
      const c = contextOf(w)
      if (!c) return buildExercise(w, 'mc_l1_l2', ctx)
      if (hasPresent(w)) {
        const b = analyzeSentence(c.question, w.verb.present)
        if (b) {
          const forms = verbOptions(w, deckWords, ctx.level ?? 2, b.answer, rng)
          return choice({ ...base, type, prompt: primary(w), sentence: c.sentence, speak: c.question, skill: 'forms', person: b.person }, b.answer, forms.filter((o) => o !== b.answer), rng)
        }
      }""")

# helper verbOptions before buildExercise
s = must(s, "export function buildExercise(", """/**
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

export function buildExercise(""")

# evaluation: person notes + exact conjugated forms
s = must(s, "export interface Credit {\n  skill: SubSkill\n  correct: boolean\n}", "export interface Credit {\n  skill: SubSkill\n  correct: boolean\n  /** present-tense person (0..5) for per-person forms progress */\n  person?: number\n}")
s = must(s, "  /** per-field results (verb forms, separable) */\n  details?: boolean[]\n}", "  /** per-field results (verb forms, separable) */\n  details?: boolean[]\n  /** \"După «du» urmează lernst, nu lernt.\" */\n  personNote?: { person: number; expected: string; given: string }\n}")
s = must(s, "export function evaluateChoice(ex: ChoiceExercise, index: number): Outcome {\n  const out: Outcome = { correct: index === ex.answerIndex, expected: ex.options[ex.answerIndex] ?? '', given: ex.options[index] ?? '' }\n  if (ex.skill) out.credits = [{ skill: ex.skill, correct: out.correct }]",
         "export function evaluateChoice(ex: ChoiceExercise, index: number): Outcome {\n  const out: Outcome = { correct: index === ex.answerIndex, expected: ex.options[ex.answerIndex] ?? '', given: ex.options[index] ?? '' }\n  if (ex.skill) out.credits = [{ skill: ex.skill, correct: out.correct, ...(ex.person !== undefined ? { person: ex.person } : {}) }]\n  if (ex.person !== undefined && !out.correct) out.personNote = { person: ex.person, expected: out.expected, given: out.given ?? '' }")
s = must(s, "export function evaluateTyped(ex: TypeExercise, input: string): Outcome {\n", """export function evaluateTyped(ex: TypeExercise, input: string): Outcome {
  if (ex.exact) {
    const ok = checkForm(input, ex.exact.expected)
    const out: Outcome = {
      correct: ok, expected: ex.exact.expected, given: input, credits: [{ skill: 'forms', correct: ok, person: ex.exact.person }],
    }
    if (ok) out.quality = 'exact'
    else out.personNote = { person: ex.exact.person, expected: ex.exact.expected, given: input.trim() }
    return out
  }
""")
wr('src/core/exercises.ts', s)

# ---------- service: person credits, conj stages, xp penalty
s = rd('src/data/service.ts')
s = must(s, "import { applySkillAnswer, dayKey, dueNow, effectiveLevel, requiredSkills } from '../core/srs'", "import { markPassed } from '../core/conjugation'\nimport { applyPersonAnswer, applySkillAnswer, dayKey, dueNow, effectiveLevel, requiredSkills } from '../core/srs'")
s = must(s, "  mode: LessonMode\n  heartsLost: number\n}", "  mode: LessonMode\n  heartsLost: number\n  /** XP lost for peeking at the conjugation card */\n  xpPenalty?: number\n  /** a Conjugare stage finished: record the pass date on the verb */\n  conj?: { wordId: string; stage: 1 | 2 | 3; passed: boolean }\n}")
s = must(s, """      for (const c of r.credits ?? [{ skill: 'meaning' as const, correct: r.correct }]) {
        cur = applySkillAnswer(cur, c.skill, {
          correct: c.correct,
          type: r.type,
          ...(r.quality ? { quality: r.quality } : {}),
          now: input.now,
          sessionId: input.sessionId,
        }).progress
      }""", """      for (const c of r.credits ?? [{ skill: 'meaning' as const, correct: r.correct }]) {
        const a = { correct: c.correct, type: r.type, ...(r.quality ? { quality: r.quality } : {}), now: input.now, sessionId: input.sessionId }
        cur = c.person !== undefined ? applyPersonAnswer(cur, c.person, a).progress : applySkillAnswer(cur, c.skill, a).progress
      }""")
s = must(s, "    const correct = input.results.filter((r) => r.correct).length", """    if (input.conj?.passed) {
      const target = state.get(input.conj.wordId) ?? progressOrNew(state, input.profileId, input.conj.wordId)
      state.set(input.conj.wordId, { ...target, conj: markPassed(target.conj, input.conj.stage, dayKey(input.now)) })
    }
    xp = Math.max(0, xp - (input.xpPenalty ?? 0))
    const correct = input.results.filter((r) => r.correct).length""")
wr('src/data/service.ts', s)

# ---------- repo toWord: exampleRo
s = rd('src/data/repo.ts')
s = must(s, "  if (it.value !== undefined) w.value = it.value\n  if (it.group) w.group = it.group\n  return w", "  if (it.value !== undefined) w.value = it.value\n  if (it.group) w.group = it.group\n  if (it.exampleRo?.length) w.exampleRo = it.exampleRo\n  return w")
s = must(s, "import { COURSE, GERMAN_SEEDS } from './seed'", "import { COURSE, GERMAN_SEEDS, withSentenceTranslations } from './seed'")
s = must(s, "      const items = parseWordList(seed.text).rows.filter((r) => r.valid).map(rowToInput)\n      await createDeck", "      const items = withSentenceTranslations(parseWordList(seed.text).rows.filter((r) => r.valid).map(rowToInput))\n      await createDeck")
wr('src/data/repo.ts', s)

s = rd('src/core/parser.ts')
s = must(s, "  alternatives?: string[]\n  value?: number\n  group?: string\n}\n\n/** Preview", "  alternatives?: string[]\n  exampleRo?: string[]\n  value?: number\n  group?: string\n}\n\n/** Preview")
wr('src/core/parser.ts', s)

# ---------- seeds
s = rd('src/data/seed.ts')
a = s.index('export const GERMAN_SEEDS')
s = s[:a] + '''export const VERBEN_DECK_NAME = 'Lektion 6 – Verben (Präsens)'
export const VERBEN_TEXT = `sein ; a fi ; P: bin, bist, ist, sind, seid, sind ; Ich bin zehn Jahre alt. // Wir sind in der Schule. ; Sein und Haben
haben ; a avea ; P: habe, hast, hat, haben, habt, haben ; Ich habe einen Bruder. // Er hat eine Schwester. ; Sein und Haben
lernen ; a învăța ; P: lerne, lernst, lernt, lernen, lernt, lernen ; Du lernst Deutsch. // Wir lernen jeden Tag. ; Regelmäßige Verben
wohnen ; a locui ; P: wohne, wohnst, wohnt, wohnen, wohnt, wohnen ; Ich wohne in Timișoara. // Meine Oma wohnt auf dem Land. ; Regelmäßige Verben
spielen ; a juca|a se juca ; P: spiele, spielst, spielt, spielen, spielt, spielen ; Er spielt Fußball. // Ihr spielt im Garten. ; Regelmäßige Verben
singen ; a cânta ; P: singe, singst, singt, singen, singt, singen ; Sie singt gern. // Wir singen ein Lied. ; Regelmäßige Verben
kommen ; a veni ; P: komme, kommst, kommt, kommen, kommt, kommen ; Ich komme aus Rumänien. // Woher kommst du? ; Regelmäßige Verben
gehen ; a merge ; P: gehe, gehst, geht, gehen, geht, gehen ; Ich gehe in die Schule. // Ihr geht nach Hause. ; Regelmäßige Verben
fragen ; a întreba ; P: frage, fragst, fragt, fragen, fragt, fragen ; Du fragst die Mutter. // Ich frage den Lehrer. ; Regelmäßige Verben
schreiben ; a scrie ; P: schreibe, schreibst, schreibt, schreiben, schreibt, schreiben ; Ich schreibe einen Brief. // Wir schreiben einen Test. ; Regelmäßige Verben`

/** Romanian translations of the verb example sentences (for "sentence building"). */
export const VERB_SENTENCE_RO: Record<string, string> = {
  'Ich bin zehn Jahre alt.': 'Eu am zece ani.',
  'Wir sind in der Schule.': 'Noi suntem la școală.',
  'Ich habe einen Bruder.': 'Eu am un frate.',
  'Er hat eine Schwester.': 'El are o soră.',
  'Du lernst Deutsch.': 'Tu înveți germană.',
  'Wir lernen jeden Tag.': 'Noi învățăm în fiecare zi.',
  'Ich wohne in Timișoara.': 'Eu locuiesc în Timișoara.',
  'Meine Oma wohnt auf dem Land.': 'Bunica mea locuiește la țară.',
  'Er spielt Fußball.': 'El joacă fotbal.',
  'Ihr spielt im Garten.': 'Voi vă jucați în grădină.',
  'Sie singt gern.': 'Ea cântă cu plăcere.',
  'Wir singen ein Lied.': 'Noi cântăm un cântec.',
  'Ich komme aus Rumänien.': 'Eu vin din România.',
  'Woher kommst du?': 'De unde vii?',
  'Ich gehe in die Schule.': 'Eu merg la școală.',
  'Ihr geht nach Hause.': 'Voi mergeți acasă.',
  'Du fragst die Mutter.': 'Tu o întrebi pe mama.',
  'Ich frage den Lehrer.': 'Eu îl întreb pe profesor.',
  'Ich schreibe einen Brief.': 'Eu scriu o scrisoare.',
  'Wir schreiben einen Test.': 'Noi scriem un test.',
}

/** Attach known Romanian sentence translations (per ` // ` sentence) to imported items. */
export function withSentenceTranslations<T extends { example?: string; exampleRo?: string[] }>(items: T[]): T[] {
  return items.map((it) => {
    if (!it.example) return it
    const ro = it.example.split(' // ').map((x) => VERB_SENTENCE_RO[x.trim()] ?? '')
    return ro.some(Boolean) ? { ...it, exampleRo: ro } : it
  })
}

''' + s[a:]
s = must(s, "  { key: 'zahlen', name: ZAHLEN_DECK_NAME, text: ZAHLEN_TEXT, lesson: 0 },", "  { key: 'verben', name: VERBEN_DECK_NAME, text: VERBEN_TEXT, lesson: 6 },\n  { key: 'zahlen', name: ZAHLEN_DECK_NAME, text: ZAHLEN_TEXT, lesson: 0 },")
wr('src/data/seed.ts', s)

# ---------- tests expectation
s = rd('tests/data.test.ts')
s = s.replace("toBe(6)\n    const decks", "toBe(7)\n    const decks")
s = s.replace("expect(await db.decks.count()).toBe(6)", "expect(await db.decks.count()).toBe(7)")
s = s.replace("12 + 8 + 12 + 20 + 16 + 41", "12 + 8 + 12 + 20 + 16 + 10 + 41")
wr('tests/data.test.ts', s)
print('I ok')
