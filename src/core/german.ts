/** German-specific parsing helpers: articles, plural shorthand, verb forms, dialogues. Pure. */
import type { Gender, VerbInfo } from './types'

export const ARTICLES: readonly Gender[] = ['der', 'die', 'das']

export function splitArticle(s: string): { article: Gender | null; rest: string } {
  const m = s.trim().match(/^(der|die|das)\s+(\S.*)$/i)
  return m ? { article: (m[1] as string).toLowerCase() as Gender, rest: (m[2] as string).trim() } : { article: null, rest: s.trim() }
}

const UMLAUT_MARKS = ['¨', '"', ':', '“', '”', '̈']

/** Add an umlaut to the last a/o/u of the stem (au -> äu). null if there is none. */
export function applyUmlaut(stem: string): string | null {
  const idx = Math.max(stem.search(/[aouAOU][^aouAOU]*$/), -1)
  if (idx < 0) return null
  const ch = stem[idx] as string
  const map: Record<string, string> = { a: 'ä', o: 'ö', u: 'ü', A: 'Ä', O: 'Ö', U: 'Ü' }
  if ((ch === 'u' || ch === 'U') && idx > 0 && /[aA]/.test(stem[idx - 1] as string)) {
    const a = stem[idx - 1] as string
    return stem.slice(0, idx - 1) + (a === 'A' ? 'Ä' : 'ä') + stem.slice(idx)
  }
  return stem.slice(0, idx) + (map[ch] as string) + stem.slice(idx + 1)
}

export interface PluralParse {
  /** plural WITHOUT article; null = no plural */
  plural: string | null
  pluralOnly: boolean
  error: boolean
}

export function isPluralShorthand(s: string): boolean {
  return /^\s*(\(\s*(pl|sg)\.?\s*\)|[¨"':“”]-?[a-zäöüß]*|-[a-zäöüß]*)\s*$/i.test(s)
}

/** Textbook shorthand after a noun: `-e`, `¨-`, `¨-er`, `-s`, `-`, `(Pl.)`, `(Sg.)`. */
export function expandPlural(noun: string, shorthand: string): PluralParse {
  const s = shorthand.trim()
  if (/^\(\s*pl\.?\s*\)$/i.test(s)) return { plural: noun, pluralOnly: true, error: false }
  if (/^\(\s*sg\.?\s*\)$/i.test(s)) return { plural: null, pluralOnly: false, error: false }
  let rest = s
  let umlaut = false
  if (rest && UMLAUT_MARKS.includes(rest[0] as string)) {
    umlaut = true
    rest = rest.slice(1)
  }
  if (rest.startsWith('-')) rest = rest.slice(1)
  if (!/^[a-zäöüß]*$/i.test(rest) || s === '') return { plural: null, pluralOnly: false, error: true }
  let stem = noun
  if (umlaut) {
    const u = applyUmlaut(noun)
    if (u === null) return { plural: null, pluralOnly: false, error: true }
    stem = u
  }
  return { plural: stem + rest, pluralOnly: false, error: false }
}

export type GermanIssue = 'noun_lowercase' | 'plural_unparseable' | 'noun_no_article'

export interface ParsedTerm {
  display: string
  alternatives: string[]
  isNoun: boolean
  gender?: Gender
  /** undefined = no information, null = no plural */
  plural?: string | null
  pluralOnly?: boolean
  issues: GermanIssue[]
}

function parseVariant(v: string): { article: Gender | null; noun: string; shorthand: string | null; text: string } {
  let text = v.trim()
  let shorthand: string | null = null
  const pm = text.match(/\s*,?\s*(\(\s*(?:pl|sg)\.?\s*\))\s*$/i)
  if (pm) {
    shorthand = pm[1] as string
    text = text.slice(0, pm.index).trim()
  }
  const { article, rest } = splitArticle(text)
  if (article) {
    const comma = rest.indexOf(',')
    if (comma >= 0 && shorthand === null) {
      shorthand = rest.slice(comma + 1).trim()
      return { article, noun: rest.slice(0, comma).trim(), shorthand, text }
    }
    return { article, noun: rest, shorthand, text }
  }
  const comma = text.indexOf(',')
  if (comma > 0 && shorthand === null && isPluralShorthand(text.slice(comma + 1)) && /^[A-ZÄÖÜ]/.test(text)) {
    return { article: null, noun: text.slice(0, comma).trim(), shorthand: text.slice(comma + 1).trim(), text }
  }
  return { article: null, noun: text, shorthand, text }
}

/** First CSV column: `der Tisch, -e`, `die Mutter, ¨-`, `Wie viel?|Wieviel?` … */
export function parseGermanTerm(cell: string): ParsedTerm {
  const variants = cell.split('|').map((x) => x.trim()).filter(Boolean)
  const issues: GermanIssue[] = []
  if (variants.length === 0) return { display: '', alternatives: [], isNoun: false, issues }
  const first = parseVariant(variants[0] as string)
  const alternatives = variants.slice(1).map((v) => {
    const p = parseVariant(v)
    return p.article ? `${p.article} ${p.noun}` : p.noun
  })
  if (first.article) {
    if (/^[a-zäöüß]/.test(first.noun)) issues.push('noun_lowercase')
    const out: ParsedTerm = { display: `${first.article} ${first.noun}`, alternatives, isNoun: true, gender: first.article, issues }
    if (first.shorthand !== null) {
      const pp = expandPlural(first.noun, first.shorthand)
      if (pp.error) issues.push('plural_unparseable')
      else {
        out.plural = pp.plural
        out.pluralOnly = pp.pluralOnly
        if (pp.pluralOnly) out.gender = 'die'
      }
    }
    return out
  }
  if (first.shorthand !== null) {
    issues.push('noun_no_article')
    return { display: first.noun, alternatives, isNoun: true, issues }
  }
  return { display: first.noun, alternatives, isNoun: false, issues }
}

/** Plural given explicitly ("die Tische" or "Tische"); returns the bare form. */
export function bareFromExplicitPlural(s: string): string {
  const { article, rest } = splitArticle(s)
  return article === 'die' || article === null ? rest : rest
}

// ---------- verbs ----------

const PARTICLES = ['auf', 'an', 'ab', 'aus', 'ein', 'mit', 'vor', 'zu', 'zurück', 'weg', 'fest', 'her', 'hin', 'nach', 'um', 'weiter', 'zusammen', 'fern', 'dazu', 'los', 'statt', 'teil', 'durch', 'bei', 'heraus', 'herunter', 'hoch', 'vorbei', 'rein', 'raus']

export interface VerbParse {
  info: VerbInfo
  /** false when the forms text did not look like German verb forms */
  ok: boolean
}

/** Forms = `3rd sg, Präteritum, Perfekt` (any prefix of that list). */
export function parseVerbForms(infinitive: string, forms: string): VerbParse {
  const parts = forms.split(',').map((x) => x.trim()).filter(Boolean)
  const info: VerbInfo = {}
  if (parts[0]) info.present3sg = parts[0]
  if (parts[1]) info.praeteritum = parts[1]
  if (parts[2]) {
    info.perfekt = parts[2]
    const m = parts[2].match(/^(hat|ist)\b/i)
    if (m) info.auxiliary = (m[1] as string).toLowerCase() === 'ist' ? 'sein' : 'haben'
  }
  const toks = (info.present3sg ?? '').split(/\s+/)
  const last = toks[toks.length - 1] as string
  if (toks.length === 2 && PARTICLES.includes(last)) info.separable = true
  else if (info.present3sg) info.separable = false
  if (info.present3sg || info.praeteritum || info.perfekt) {
    const base = (toks[0] ?? '').replace(/e?t$/, '')
    const regularPret = `${base}${/[dt]$|[mn]$/.test(base) && /[dt]$/.test(base) ? 'ete' : 'te'}`
    const pret = (info.praeteritum ?? '').split(/\s+/)[0] ?? ''
    const part = (info.perfekt ?? '').split(/\s+/).slice(-1)[0] ?? ''
    const irregPret = info.praeteritum ? pret !== regularPret && !pret.endsWith('te') : false
    const irregPart = info.perfekt ? part.endsWith('en') : false
    const irregBase = info.praeteritum && info.present3sg ? pret.endsWith('te') && pret !== regularPret && !/ete$/.test(pret) : false
    info.irregular = irregPret || irregPart || irregBase
  }
  const looksVerb = /^[a-zäöüß]+(en|ern|eln|n)$/i.test(infinitive.trim()) || infinitive.includes(' ')
  const formsOk = parts.length > 0 && parts.every((p) => /^[a-zäöüß ]+$/i.test(p))
  return { info, ok: looksVerb && formsOk }
}

// ---------- dialogues ----------

export interface Dialogue {
  question: string
  answer: string
}

export function splitDialogue(example: string | undefined): Dialogue | null {
  if (!example) return null
  const m = example.match(/^(.+?)\s[–—-]\s(.+)$/)
  if (!m) return null
  return { question: (m[1] as string).trim(), answer: (m[2] as string).trim() }
}
