ROOT = 'C:/Users/Sergiu/Desktop/Projects/De/'


def rd(p):
    return open(ROOT + p, encoding='utf-8').read()


def wr(p, s):
    open(ROOT + p, 'w', encoding='utf-8').write(s)


def must(s, old, new):
    assert old in s, old[:60]
    return s.replace(old, new, 1)


# ---------- answerDe: articleOptional
s = rd('src/core/answerDe.ts')
s = must(s, "  ignoreArticle?: boolean\n}\n\nexport interface DeCheck",
         "  ignoreArticle?: boolean\n  /** the article may be left out without penalty (weekdays/months: \"Montag\") */\n  articleOptional?: boolean\n}\n\nexport interface DeCheck")
s = must(s, """      } else {
        gender = 'skip'
        notes.push('article_missing')
        almost = true
      }""", """      } else {
        gender = 'skip'
        if (!target.articleOptional) {
          notes.push('article_missing')
          almost = true
        }
      }""")
wr('src/core/answerDe.ts', s)

# ---------- exercises
s = rd('src/core/exercises.ts')
s = must(s, "import { splitArticle, splitDialogue } from './german'",
         "import { MONTHS, SEASONS, SEASON_OF_MONTH, seqOf, splitArticle, splitDialogue, type SeqSet } from './german'")
s = must(s, "type: 'mc_l2_l1' | 'mc_l1_l2' | 'listen_choose' | 'fill_blank' | 'plural_choice' | 'context_choice' | 'context_listen' | 'num_word_to_digits'",
         "type: 'mc_l2_l1' | 'mc_l1_l2' | 'listen_choose' | 'fill_blank' | 'plural_choice' | 'context_choice' | 'context_listen' | 'num_word_to_digits' | 'seq_neighbor' | 'fill_prep' | 'listen_ro' | 'month_season' | 'season_months'")
s = must(s, "type: 'type_l1_l2' | 'type_l2_l1' | 'listen_type' | 'speak' | 'plural_type' | 'num_listen_digits' | 'num_digits_to_word' | 'num_arith'",
         "type: 'type_l1_l2' | 'type_l2_l1' | 'listen_type' | 'speak' | 'plural_type' | 'num_listen_digits' | 'num_digits_to_word' | 'num_arith' | 'seq_neighbor_type'")
s = must(s, "  ro?: { translations: string[] }\n", "  ro?: { translations: string[] }\n  /** Romanian words of the course (a typo must not produce another one: iunie/iulie) */\n  roLexicon?: string[]\n")
s = must(s, "export type Exercise = ChoiceExercise | MatchExercise | TypeExercise | SentenceExercise | ArticleExercise | VerbFormsExercise | SeparableExercise",
         """export interface SequenceExercise extends Base {
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
  | ChoiceExercise | MatchExercise | TypeExercise | SentenceExercise | ArticleExercise | VerbFormsExercise | SeparableExercise | SequenceExercise""")
s = must(s, "  /** number words the learner has already seen (mini-arithmetic) */\n  seenNumbers?: Word[]\n}",
         "  /** number words the learner has already seen (mini-arithmetic) */\n  seenNumbers?: Word[]\n  /** effective level of the target word (partial vs full sequence) */\n  level?: number\n}")

# contextOf: also blank the word in the answer for ordered-set nouns (Wann hast du Geburtstag? – Im Mai.)
a = s.index('/** "Wo wohnst du? – In Timișoara."')
b = s.index("function separableParts")
s = s[:a] + """/**
 * "Wo wohnst du? – In Timișoara." with the word blanked in the question part. Months/weekdays blank
 * the noun in the answer ("Wann hast du Geburtstag? – Im ___."); words of type `other`
 * (heute/morgen/gestern …) without a dialogue blank the word inside the whole example sentence.
 */
export function contextOf(w: Word): { sentence: string; question: string; answer: string } | null {
  const d = splitDialogue(w.example)
  if (d) {
    const masked = maskTerm(d.question, w.term, '___')
    if (masked) return { sentence: `${masked} – ${d.answer}`, question: d.question, answer: d.answer }
    if (seqOf(w)) {
      const am = maskTerm(d.answer, splitArticle(w.term).rest, '___')
      if (am) return { sentence: `${d.question} – ${am}`, question: d.question, answer: d.answer }
    }
    return null
  }
  if (w.type === 'other' && w.example) {
    const masked = maskTerm(w.example, w.term, '___')
    return masked ? { sentence: masked, question: w.example, answer: '' } : null
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
  const re = new RegExp(`(?<![\\\\p{L}])(am|im)(?=\\\\s+(?:${names.join('|')})(?![\\\\p{L}]))`, 'iu')
  return re.test(w.example) ? w.example.replace(re, '___') : null
}

""" + s[b:]

s = must(s, """  if (deckSize >= 4 && contextOf(w)) {
    s.add('context_choice')
    s.add('context_listen')
    s.add('match_qa')
  }""", """  if (deckSize >= 4 && contextOf(w)) {
    s.add('context_choice')
    s.add('context_listen')
    if (hasDialogue(w) && !seqOf(w)) s.add('match_qa')
  }""")

s = must(s, "  skillLevels: Partial<Record<SubSkill, number>>\n  seenNumbers: Word[]\n}",
         "  skillLevels: Partial<Record<SubSkill, number>>\n  seenNumbers: Word[]\n  /** ordered sets (by tag) that are complete in this deck: sequence / next-previous possible */\n  completeSets?: string[]\n  /** the deck has the seasons (month -> season exercises) */\n  hasSeasons?: boolean\n}")

s = must(s, """  if (w.value !== undefined) {
    const band = bandForLevel(info.level)""", """  const seq = seqOf(w)
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
  if (w.value !== undefined) {
    const band = bandForLevel(info.level)""")

# type_l2_l1 with Romanian lexicon
s = must(s, "      return { ...base, type, prompt: w.term, accepted: w.translations, ro: { translations: w.translations }, speak: w.term }",
         "      return {\n        ...base, type, prompt: w.term, accepted: w.translations, ro: { translations: w.translations }, speak: w.term,\n        roLexicon: deckWords.flatMap((x) => x.translations),\n      }")

# builder cases
s = must(s, "    // ---- numbers ----\n    case 'num_word_to_digits': {", """    // ---- ordered sets: weekdays, months, seasons ----
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
    case 'num_word_to_digits': {""")

# context options: bare nouns (strip article)
s = must(s, "      const bare = (t: string): string => t.replace(/[?!.]+$/, '')", "      const bare = (t: string): string => splitArticle(t).rest.replace(/[?!.]+$/, '')")

# romanian lexicon in evaluation
s = must(s, "  if (ex.ro) return { ...fromCheck(checkRomanian(input, ex.ro.translations)), given: input }",
         "  if (ex.ro) return { ...fromCheck(checkRomanian(input, ex.ro.translations, ex.roLexicon ?? [])), given: input }")

s += """
/** Ordered-set sequence: every missing slot must hold the right name (all of them in order for the full version). */
export function evaluateSequence(ex: SequenceExercise, filled: (string | null)[]): Outcome {
  const expected = ex.days.filter((_, i) => ex.given[i] === null)
  const ok = filled.length === expected.length && filled.every((x, i) => x === expected[i])
  return { correct: ok, expected: ex.days.join(', '), given: filled.map((x) => x ?? '…').join(', ') }
}
"""
wr('src/core/exercises.ts', s)
print('B ok')
