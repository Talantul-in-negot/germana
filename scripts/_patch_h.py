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
s = must(s, "export interface VerbInfo {\n", "/** Präsens in notebook order: ich, du, er/sie/es, wir, ihr, Sie/sie */\nexport type Present = [string, string, string, string, string, string]\n\nexport interface VerbInfo {\n  present?: Present\n")
s = must(s, "  /** numeric value for number words (tag n=21) */", "  /** Romanian translation per example sentence (same order as the ` // ` split) */\n  exampleRo?: string[]\n  /** numeric value for number words (tag n=21) */")
s = must(s, "  skills?: Partial<Record<Exclude<SubSkill, 'meaning'>, SkillProgress>>\n", "  skills?: Partial<Record<Exclude<SubSkill, 'meaning'>, SkillProgress>>\n  /** present-tense verbs: one SRS state per person (ich … Sie/sie) for the forms sub-skill */\n  persons?: SkillProgress[]\n  /** \"Conjugare\" stages: date each of the 3 stages was first passed */\n  conj?: { passed: (string | null)[] }\n")
s = must(s, "export type SkillProgress = Omit<WordProgress, 'skills' | 'required'>", "export type SkillProgress = Omit<WordProgress, 'skills' | 'required' | 'persons' | 'conj'>")
s = must(s, "  | 'possessive'\n", "  | 'possessive'\n  // present-tense conjugation\n  | 'conj_dropdown'\n  | 'conj_dropdown_all'\n  | 'conj_typing'\n  | 'verb_dropdown'\n  | 'verb_pronoun'\n  | 'verb_pronoun_type'\n  | 'verb_endings'\n  | 'verb_listen_blank'\n  | 'verb_sentence_build'\n")
wr('src/core/types.ts', s)

# ---------- srs: weights, per-person, formsLevel
s = rd('src/core/srs.ts')
s = must(s, "  possessive: 1.5,\n}", "  possessive: 1.5,\n  conj_dropdown: 1.2,\n  conj_dropdown_all: 2.0,\n  conj_typing: 2.5,\n  verb_dropdown: 1.5,\n  verb_pronoun: 1.2,\n  verb_pronoun_type: 2.5,\n  verb_endings: 1.0,\n  verb_listen_blank: 1.5,\n  verb_sentence_build: 1.8,\n}")
s = must(s, "export function skillLevel(p: WordProgress, skill: SubSkill): number {\n  return skill === 'meaning' ? p.level : (p.skills?.[skill]?.level ?? 0)\n}",
         """export function skillLevel(p: WordProgress, skill: SubSkill): number {
  if (skill === 'meaning') return p.level
  if (skill === 'forms' && p.persons) return formsLevel(p)
  return p.skills?.[skill]?.level ?? 0
}

/** Forms level of a present-tense verb: the average level of its 6 persons, rounded down. */
export function formsLevel(p: WordProgress): number {
  const ps = p.persons ?? []
  if (ps.length === 0) return p.skills?.forms?.level ?? 0
  const sum = [0, 1, 2, 3, 4, 5].reduce((a, i) => a + (ps[i]?.level ?? 0), 0)
  return Math.floor(sum / 6)
}""")
s = must(s, """/** Strength of the word = weakest strength among practised required sub-skills. */
export function wordStrengthAt(p: WordProgress, now: number): number {
  let s = strengthAt(p, now)
  for (const k of p.required ?? []) {
    const st = p.skills?.[k]""", """/** Strength of each person (0-100); never-practised persons count 0. */
export function personStrengths(p: WordProgress, now: number): number[] {
  return [0, 1, 2, 3, 4, 5].map((i) => {
    const st = p.persons?.[i]
    return st ? strengthAt(asWordProgress(p, st), now) : 0
  })
}

/** Apply one answer to one person of a present-tense verb (own SRS state per person). */
export function applyPersonAnswer(prev: WordProgress, person: number, a: AnswerInput): AnswerOutcome {
  const persons = (prev.persons ? prev.persons.slice() : []) as SkillProgress[]
  while (persons.length < 6) persons.push(stripState(newProgress(prev.profileId, prev.wordId)))
  const out = applyAnswer(asWordProgress(prev, persons[person]), a)
  persons[person] = stripState(out.progress)
  return { progress: { ...prev, persons }, previousLevel: out.previousLevel, leveledUp: out.leveledUp, leveledDown: out.leveledDown }
}

function stripState(p: WordProgress): SkillProgress {
  const { skills: _s, required: _r, persons: _p, conj: _c, ...state } = p
  void _s
  void _r
  void _p
  void _c
  return state
}

/** Strength of the word = weakest strength among practised required sub-skills. */
export function wordStrengthAt(p: WordProgress, now: number): number {
  let s = strengthAt(p, now)
  if (p.persons && (p.required ?? []).includes('forms')) {
    const ps = personStrengths(p, now)
    s = Math.min(s, Math.round(ps.reduce((a, b) => a + b, 0) / 6))
    return s
  }
  for (const k of p.required ?? []) {
    const st = p.skills?.[k]""")
s = must(s, "  return { ...fresh, ...(st ?? {}), skills: undefined, required: undefined } as WordProgress", "  return { ...fresh, ...(st ?? {}), skills: undefined, required: undefined, persons: undefined, conj: undefined } as WordProgress")
s = must(s, "  const { skills: _s, required: _r, ...state } = out.progress\n  void _s\n  void _r\n  const progress", "  const state = stripState(out.progress)\n  const progress")
# dueNow also resets persons
s = must(s, "  return { ...p, dueAt: now, skills }\n}", "  const persons = p.persons?.map((x) => ({ ...x, dueAt: now }))\n  return { ...p, dueAt: now, skills, ...(persons ? { persons } : {}) }\n}")
# isDue includes persons
s = must(s, "  return Object.values(p.skills ?? {}).some((s) => !!s && s.level > 0 && s.lastSeenAt > 0 && now >= s.dueAt)",
         "  const due = (s: { level: number; lastSeenAt: number; dueAt: number } | undefined): boolean => !!s && s.level > 0 && s.lastSeenAt > 0 && now >= s.dueAt\n  return Object.values(p.skills ?? {}).some(due) || (p.persons ?? []).some(due)")
wr('src/core/srs.ts', s)

# ---------- german.ts: P: table
s = rd('src/core/german.ts')
s = must(s, "import type { Gender, VerbInfo } from './types'", "import type { Gender, Present, VerbInfo } from './types'")
s = must(s, "export function parseVerbForms(infinitive: string, forms: string): VerbParse {\n", """/** `P: bin, bist, ist, sind, seid, sind` -> exactly 6 values, notebook order. */
export function parsePresentTable(forms: string): Present | null {
  const m = forms.match(/^\\s*P\\s*:\\s*(.+)$/i)
  if (!m) return null
  const parts = (m[1] as string).split(',').map((x) => x.trim())
  if (parts.length !== 6 || parts.some((x) => !/^[a-zäöüß]+$/i.test(x))) return null
  return parts as Present
}

export function parseVerbForms(infinitive: string, forms: string): VerbParse {
  if (/^\\s*P\\s*:/i.test(forms)) {
    const present = parsePresentTable(forms)
    if (!present) return { info: {}, ok: false }
    const info: VerbInfo = { present, present3sg: present[2], irregular: !isRegularForTable(infinitive, present) }
    return { info, ok: /^[a-zäöüß]+n$/i.test(infinitive.trim()) }
  }
""")
s = must(s, "export interface VerbParse {", "const REG_END = ['e', 'st', 't', 'en', 't', 'en']\nfunction isRegularForTable(inf: string, present: Present): boolean {\n  const stem = inf.toLowerCase().replace(/e?n$/, '')\n  return present.every((f, i) => {\n    const w = f.toLowerCase()\n    const ok = [stem + REG_END[i]]\n    if (/[dt]$/.test(stem) && (i === 1 || i === 2 || i === 4)) ok.push(stem + 'e' + REG_END[i])\n    if (i === 3 || i === 5) ok.push(inf.toLowerCase())\n    return ok.includes(w)\n  })\n}\n\nexport interface VerbParse {")
wr('src/core/german.ts', s)

# ---------- parser: multi-word tags are group labels; P: tables keep their forms
s = rd('src/core/parser.ts')
s = must(s, """function splitTags(s: string): string[] {
  return s
    .split(/[,|#\\s]+/)
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean)
}""", """/** Machine tags (n=21, 0-10) may be space separated; any other text is one label ("Sein und Haben"). */
function splitTags(s: string): string[] {
  const out: string[] = []
  for (const part of s.split(/[,|#]+/)) {
    const p = part.trim().toLowerCase()
    if (!p) continue
    const toks = p.split(/\\s+/)
    if (toks.length > 1 && toks.every((x) => /^(n=\\d+|\\d+-\\d+)$/.test(x))) out.push(...toks)
    else out.push(p)
  }
  return out
}""")
s = must(s, "    else if (RANGE_TAG.test(t)) fields.group = t\n", "    else if (RANGE_TAG.test(t)) fields.group = t\n    else if (/\\s/.test(t)) fields.group = t // multi-word label (Sein und Haben): one unit per group\n")
wr('src/core/parser.ts', s)

# ---------- db v3
s = rd('src/data/db.ts')
s = must(s, "      .upgrade(async (tx) => {", "      .upgrade(async (tx) => {", )
a = s.rindex("  }\n}\n\nexport const db")
s = s[:a] + """    // v3 (verbs): per-person forms progress (`persons`) and Conjugare stages (`conj`) are optional
    // fields on progress rows; existing rows are kept exactly as they are.
    this.version(3).stores({
      decks: 'id',
      words: 'id, deckId, [deckId+unitIndex]',
      profiles: 'id',
      progress: '[profileId+wordId], profileId, wordId',
      sessions: 'id, profileId, date',
      achievements: 'id, profileId, &[profileId+key]',
      meta: 'key',
      tests: 'id, profileId, deckId',
    })
""" + s[a:]
wr('src/data/db.ts', s)
print('H ok')
