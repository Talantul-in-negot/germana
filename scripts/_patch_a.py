import re
ROOT = 'C:/Users/Sergiu/Desktop/Projects/De/'


def rd(p):
    return open(ROOT + p, encoding='utf-8').read()


def wr(p, s):
    open(ROOT + p, 'w', encoding='utf-8').write(s)


# ---------- types: rename day_* to generic sequence types
s = rd('src/core/types.ts')
s = s.replace("  // weekdays\n  | 'day_sequence'\n  | 'day_neighbor'\n  | 'day_neighbor_type'\n  | 'fill_am'\n  | 'listen_ro'\n",
              "  // ordered sets: weekdays, months, seasons\n  | 'seq_order'\n  | 'seq_neighbor'\n  | 'seq_neighbor_type'\n  | 'fill_prep'\n  | 'listen_ro'\n  | 'month_season'\n  | 'season_months'\n")
s = s.replace("export interface TestExtra {\n  key: 'sequence'\n", "export interface TestExtra {\n  key: 'sequence'\n  /** which set: wochentage / monate / jahreszeiten */\n  set: string\n")
wr('src/core/types.ts', s)

# ---------- srs weights + required skills
s = rd('src/core/srs.ts')
s = s.replace("  day_sequence: 1.8,\n  day_neighbor: 1.5,\n  day_neighbor_type: 2.2,\n  fill_am: 1.5,\n  listen_ro: 1.0,\n}",
              "  seq_order: 1.8,\n  seq_neighbor: 1.5,\n  seq_neighbor_type: 2.2,\n  fill_prep: 1.5,\n  listen_ro: 1.0,\n  month_season: 1.5,\n  season_months: 1.8,\n}")
s = s.replace("    // all weekdays are `der`: one info card instead of an article drill\n    const days = (w.tags ?? []).includes('wochentage')\n    if (!w.pluralOnly && !days) out.push('gender')",
              "    // weekdays, months and seasons are all `der`: one info card instead of an article drill\n    const allDer = (w.tags ?? []).some((t) => t === 'wochentage' || t === 'monate' || t === 'jahreszeiten')\n    if (!w.pluralOnly && !allDer) out.push('gender')")
wr('src/core/srs.ts', s)

# ---------- german.ts: shared (Sg.) marker + generic sequence sets
s = rd('src/core/german.ts')
s = s.replace("""  const m = body.match(/^(.*\\S)\\s*,\\s*([^,|]+)$/)
  if (m && isPluralShorthand(m[2] as string)) {
    body = m[1] as string
    shared = (m[2] as string).trim()
  }""", """  const m = body.match(/^(.*\\S)\\s*,\\s*([^,|]+)$/)
  const mark = body.match(/^(.*?\\S)\\s*,?\\s*(\\(\\s*(?:pl|sg)\\.?\\s*\\))\\s*$/i)
  if (m && isPluralShorthand(m[2] as string)) {
    body = m[1] as string
    shared = (m[2] as string).trim()
  } else if (mark && body.includes('|')) {
    // der Januar|der Jänner (Sg.): the marker belongs to every variant
    body = mark[1] as string
    shared = (mark[2] as string).trim()
  }""")
a = s.index("// ---------- weekdays ----------")
s = s[:a] + """// ---------- ordered sets: weekdays, months, seasons ----------

export const WEEKDAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'] as const
export const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'] as const
export const SEASONS = ['Frühling', 'Sommer', 'Herbst', 'Winter'] as const
/** Season index (into SEASONS) of each month Januar..Dezember. */
export const SEASON_OF_MONTH = [3, 3, 0, 0, 0, 1, 1, 1, 2, 2, 2, 3] as const

export interface SeqSet {
  /** tag that marks the words of the set */
  tag: 'wochentage' | 'monate' | 'jahreszeiten'
  names: readonly string[]
  /** preposition used with the set: am Montag, im Mai */
  prep: 'am' | 'im'
  /** other accepted spellings -> index */
  aliases: Record<string, number>
  /** which info card to show */
  info: 'days' | 'months'
}

export const SEQ_SETS: readonly SeqSet[] = [
  { tag: 'wochentage', names: WEEKDAYS, prep: 'am', aliases: { sonnabend: 5 }, info: 'days' },
  { tag: 'monate', names: MONTHS, prep: 'im', aliases: { jänner: 0, jaenner: 0 }, info: 'months' },
  { tag: 'jahreszeiten', names: SEASONS, prep: 'im', aliases: {}, info: 'months' },
]

export function seqSetByTag(tag: string): SeqSet | undefined {
  return SEQ_SETS.find((s) => s.tag === tag)
}

interface SeqWordLike {
  tags?: string[]
  term: string
  alternatives?: string[] | undefined
}

/** Which ordered set a word belongs to (by tag) and its position; null for everything else. */
export function seqOf(w: SeqWordLike): { set: SeqSet; index: number } | null {
  const tags = (w.tags ?? []).map((t) => t.toLowerCase())
  for (const set of SEQ_SETS) {
    if (!tags.includes(set.tag)) continue
    for (const t of [w.term, ...(w.alternatives ?? [])]) {
      const bare = splitArticle(t).rest.toLowerCase()
      const i = set.names.findIndex((n) => n.toLowerCase() === bare)
      if (i >= 0) return { set, index: i }
      const a = set.aliases[bare]
      if (a !== undefined) return { set, index: a }
    }
  }
  return null
}

export const isSeqWord = (w: SeqWordLike): boolean => seqOf(w) !== null
"""
wr('src/core/german.ts', s)

# ---------- parser: group tags (ranges + monate/jahreszeiten/extra), tags kept for sets
s = rd('src/core/parser.ts')
s = s.replace("const RANGE_TAG = /^\\d+-\\d+$/", "const RANGE_TAG = /^\\d+-\\d+$/\nconst NAMED_GROUPS = new Set(['monate', 'jahreszeiten', 'extra'])")
s = s.replace("    else if (RANGE_TAG.test(t)) fields.group = t\n    else tags.push(t)",
              "    else if (RANGE_TAG.test(t)) fields.group = t\n    else if (NAMED_GROUPS.has(t)) {\n      fields.group = t\n      tags.push(t)\n    } else tags.push(t)")
wr('src/core/parser.ts', s)
print('A ok')
