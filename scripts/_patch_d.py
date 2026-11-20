ROOT = 'C:/Users/Sergiu/Desktop/Projects/De/'


def rd(p):
    return open(ROOT + p, encoding='utf-8').read()


def wr(p, s):
    open(ROOT + p, 'w', encoding='utf-8').write(s)


def must(s, old, new):
    assert old in s, old[:70]
    return s.replace(old, new, 1)


# ---------- types
s = rd('src/core/types.ts')
s = must(s, "  | 'season_months'\n", "  | 'season_months'\n  // family\n  | 'gender_pairs'\n  | 'collective'\n  | 'possessive'\n")
wr('src/core/types.ts', s)

# ---------- srs: weights, (Pl.) nouns ask meaning + article only
s = rd('src/core/srs.ts')
s = must(s, "  season_months: 1.8,\n}", "  season_months: 1.8,\n  gender_pairs: 1.0,\n  collective: 1.5,\n  possessive: 1.5,\n}")
s = must(s, "    if (!w.pluralOnly && !allDer) out.push('gender')\n    if (w.plural) out.push('plural')",
         "    if (!allDer) out.push('gender') // (Pl.) nouns: meaning + article only (always `die`)\n    if (w.plural && !w.pluralOnly) out.push('plural')")
wr('src/core/srs.ts', s)

# ---------- parser: plural variants in the forms field (die Großmütter|die Omas)
s = rd('src/core/parser.ts')
s = must(s, "      } else fields.plural = bareFromExplicitPlural(forms)",
         """      } else {
        const parts = forms.split('|').map((x) => bareFromExplicitPlural(x.trim())).filter(Boolean)
        fields.plural = parts[0] ?? null
        if (parts.length > 1) fields.pluralAlternatives = parts.slice(1)
      }""")
wr('src/core/parser.ts', s)

# ---------- answerDe: Cousin/Cousine is a gender error, not a typo
s = rd('src/core/answerDe.ts')
s = must(s, """    const core = kindOf(i.article && isNoun ? i.rest : raw.replace(/^(der|die|das)\\s+/i, (m) => (isNoun ? '' : m)), t.rest, lex, own)
    if (core === null) continue
""", """    const core = kindOf(i.article && isNoun ? i.rest : raw.replace(/^(der|die|das)\\s+/i, (m) => (isNoun ? '' : m)), t.rest, lex, own)
    if (core === null) {
      // another word of the course that differs only slightly AND carries another article
      // (der Cousin / die Cousine): graded as a gender error, never as a typo
      if (isNoun && i.article && i.article !== t.article) {
        const k = cleanDe(i.rest).toLowerCase()
        if (lex.has(k) && !own.has(k) && levenshtein(asciiDe(k), asciiDe(cleanDe(t.rest))) <= 2) {
          const err: DeCheck = { verdict: 'wrong', meaning: false, gender: 'fail', notes: ['article_wrong'], expected: cand, quality: undefined }
          if (best.verdict === 'wrong') best = err
        }
      }
      continue
    }
""")
wr('src/core/answerDe.ts', s)

# ---------- exercises
s = rd('src/core/exercises.ts')
s = must(s, "'seq_neighbor' | 'fill_prep' | 'listen_ro' | 'month_season' | 'season_months'",
         "'seq_neighbor' | 'fill_prep' | 'listen_ro' | 'month_season' | 'season_months' | 'collective' | 'possessive'")
s = must(s, "  type: 'match' | 'match_qa'\n", "  type: 'match' | 'match_qa' | 'gender_pairs'\n")

# article drill also for (Pl.) nouns
s = must(s, "      if (!w.gender || w.pluralOnly) return buildExercise(w, 'mc_l1_l2', ctx)\n      return { ...base, type, noun: splitArticle(w.term).rest, answer: w.gender, translation: primary(w), speak: w.term, skill: 'gender' }",
         "      if (!w.gender) return buildExercise(w, 'mc_l1_l2', ctx)\n      return { ...base, type, noun: splitArticle(w.term).rest, answer: w.gender, translation: primary(w), speak: w.term, skill: 'gender' }")

# plural alternatives
s = must(s, "        de: { term: w.plural, ignoreArticle: true }, lexicon: lexicon ?? [],",
         "        de: { term: w.plural, ignoreArticle: true, ...(w.pluralAlternatives?.length ? { alternatives: w.pluralAlternatives } : {}) }, lexicon: lexicon ?? [],")
s = must(s, "      return choice({ ...base, type, prompt: w.term, skill: 'plural', speak: w.term }, w.plural, pluralVariants(bare, w.plural, rng), rng)",
         "      const alts = new Set(w.pluralAlternatives ?? [])\n      return choice({ ...base, type, prompt: w.term, skill: 'plural', speak: w.term }, w.plural, pluralVariants(bare, w.plural, rng).filter((x) => !alts.has(x)), rng)")

# family helpers + contextOf for family words
s = must(s, "export const hasDialogue = ", """const FAMILY_TAGS = ['kernfamilie', 'verwandte']
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

export const hasDialogue = """)
s = must(s, "    if (seqOf(w)) {\n      const am = maskTerm(d.answer, splitArticle(w.term).rest, '___')",
         "    if (seqOf(w) || isFamilyWord(w)) {\n      const am = maskTerm(d.answer, splitArticle(w.term).rest, '___')")

# availableTypes: listen_ro for every word, gender pairs / possessive
s = must(s, "  const s = new Set<ExerciseType>(['mc_l2_l1', 'mc_l1_l2', 'listen_choose', 'type_l1_l2', 'listen_type'])",
         "  const s = new Set<ExerciseType>(['mc_l2_l1', 'mc_l1_l2', 'listen_choose', 'listen_ro', 'type_l1_l2', 'listen_type'])")

# chooseTypeFor: family
s = must(s, "  if (w.value !== undefined) {\n    const band = bandForLevel(info.level)",
         """  if (isFamilyWord(w) && info.level >= 1) {
    const r = ctx.rng()
    if (info.hasPairs && r < 0.25) return 'gender_pairs'
    if (info.collectives && COLLECTIVES.some((c) => c.word === splitArticle(w.term).rest) && r < 0.5) return 'collective'
    if (w.gender && r < 0.4) return 'possessive'
  }
  if (w.value !== undefined) {
    const band = bandForLevel(info.level)""")
s = must(s, "  /** the deck has the seasons (month -> season exercises) */\n  hasSeasons?: boolean\n}",
         "  /** the deck has the seasons (month -> season exercises) */\n  hasSeasons?: boolean\n  /** the deck has male/female family pairs (gender pairs) */\n  hasPairs?: boolean\n  /** the deck has collective words (Eltern, Geschwister …) */\n  collectives?: boolean\n}")
# plural weight for umlaut plurals
s = must(s, "    if (req.includes('plural') && ctx.rng() < 0.3)",
         "    if (req.includes('plural') && ctx.rng() < (isUmlautPlural(w) ? 0.65 : 0.3))")
s = must(s, "const primary = (w: Word): string => w.translations[0] ?? ''",
         """/** Mütter, Väter, Brüder, Söhne …: the plural adds an umlaut the singular lacks. */
export function isUmlautPlural(w: Word): boolean {
  return !!w.plural && !w.pluralOnly && /[äöü]/i.test(w.plural) && !/[äöü]/i.test(splitArticle(w.term).rest)
}

const primary = (w: Word): string => w.translations[0] ?? ''""")

# builders
s = must(s, "    // ---- ordered sets: weekdays, months, seasons ----", """    // ---- family ----
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
    // ---- ordered sets: weekdays, months, seasons ----""")

# family distractors prefer the same article in context_choice
s = must(s, "      const pool = [...shuffle(withCtx, rng), ...shuffle(rest, rng)]\n      const bare = ",
         "      const sameGender = (x: Word): number => (isFamilyWord(w) && x.gender === w.gender ? 0 : 1)\n      const pool = [...shuffle(withCtx, rng).sort((a, b) => sameGender(a) - sameGender(b)), ...shuffle(rest, rng)]\n      const bare = ")

# evaluateTyped: gender fail credit even when the answer is wrong
s = must(s, "    out.credits = credits\n    return out",
         "    if (!c.meaning && c.gender === 'fail') credits.push({ skill: 'gender', correct: false })\n    out.credits = credits\n    return out")
wr('src/core/exercises.ts', s)

# ---------- seeds
s = rd('src/data/seed.ts')
s = must(s, "export const DEMO_DECK_NAME = 'Lektion 1 – Familie'", "export const DEMO_DECK_NAME = 'Lektion 1 – Erste Wörter'")
a = s.index('export const GERMAN_SEEDS')
s = s[:a] + '''export const FAMILIE_DECK_NAME = 'Lektion 5 – Familie'
export const FAMILIE_TEXT = `der Vater|der Papa, ¨- ; tatăl ; ; Wer ist das? – Das ist mein Vater. ; kernfamilie
die Mutter|die Mama, ¨- ; mama ; ; Wer ist das? – Das ist meine Mutter. ; kernfamilie
der Bruder, ¨- ; fratele ; ; Wer ist das? – Das ist mein Bruder. ; kernfamilie
die Schwester, -n ; sora ; ; Wer ist das? – Das ist meine Schwester. ; kernfamilie
der Sohn, ¨-e ; fiul ; ; Wer ist das? – Das ist mein Sohn. ; kernfamilie
die Tochter, ¨- ; fiica ; ; Wer ist das? – Das ist meine Tochter. ; kernfamilie
die Eltern (Pl.) ; părinții ; ; Meine Eltern wohnen in Cluj. ; kernfamilie
die Geschwister (Pl.) ; frații și surorile ; ; Ich habe drei Geschwister. ; kernfamilie
die Kinder (Pl.) ; copiii ; ; Meine Kinder sind klein. ; kernfamilie
die Großmutter|die Oma ; bunica ; die Großmütter|die Omas ; Wer ist das? – Das ist meine Oma. ; verwandte
der Großvater|der Opa ; bunicul ; die Großväter|die Opas ; Wer ist das? – Das ist mein Opa. ; verwandte
die Großeltern (Pl.) ; bunicii ; ; Meine Großeltern wohnen in Arad. ; verwandte
der Onkel, ¨- ; unchiul ; ; Wer ist das? – Das ist mein Onkel. ; verwandte
die Tante, -n ; mătușa ; ; Wer ist das? – Das ist meine Tante. ; verwandte
der Cousin, -s ; vărul ; ; Wer ist das? – Das ist mein Cousin. ; verwandte
die Cousine, -n ; vara ; ; Wer ist das? – Das ist meine Cousine. ; verwandte`

''' + s[a:]
s = must(s, "  { key: 'monate', name: MONATE_DECK_NAME, text: MONATE_TEXT, lesson: 4 },",
         "  { key: 'monate', name: MONATE_DECK_NAME, text: MONATE_TEXT, lesson: 4 },\n  { key: 'familie2', name: FAMILIE_DECK_NAME, text: FAMILIE_TEXT, lesson: 5 },")
s = must(s, "  { key: 'familie', name: DEMO_DECK_NAME", "  { key: 'familie', name: DEMO_DECK_NAME")
# NAMED_GROUPS for the parser
wr('src/data/seed.ts', s)

s = rd('src/core/parser.ts')
s = must(s, "const NAMED_GROUPS = new Set(['monate', 'jahreszeiten', 'extra'])", "const NAMED_GROUPS = new Set(['monate', 'jahreszeiten', 'extra', 'kernfamilie', 'verwandte'])")
wr('src/core/parser.ts', s)

# ---------- tests expectations
s = rd('tests/data.test.ts')
s = s.replace("decks.length", "decks.length")
s = s.replace("toBe(5)\n    const decks", "toBe(6)\n    const decks")
s = s.replace("12 + 8 + 12 + 20 + 41", "12 + 8 + 12 + 20 + 16 + 41")
s = s.replace("d.name.includes('Familie')", "d.name.includes('Erste')")
wr('tests/data.test.ts', s)
print('D ok')
