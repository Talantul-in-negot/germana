/**
 * German answer checker.
 *  - ae/oe/ue/ss accepted for ä/ö/ü/ß (correct + spelling note)
 *  - noun in lowercase  -> "almost"
 *  - noun without article / wrong article -> "almost" (meaning credited; gender skipped / failed)
 *  - typos (<= 1 edit, > 4 chars) only when they do NOT produce another word of the course
 *    and do NOT merely drop a meaningful umlaut (schon/schön)
 *  - number words: digits are an equivalent answer; "ein und zwanzig" -> almost
 */
import { levenshtein } from './answer'
import { splitArticle } from './german'
import type { Gender, Quality } from './types'

export type DeNote = 'umlaut_spelling' | 'capital' | 'article_missing' | 'article_wrong' | 'typo' | 'digits' | 'number_one_word'

export interface DeTarget {
  /** display form, with article for nouns ("das Mädchen") */
  term: string
  alternatives?: string[]
  value?: number
  ignoreArticle?: boolean
  /** the article may be left out without penalty (weekdays/months: "Montag") */
  articleOptional?: boolean
}

export interface DeCheck {
  verdict: 'correct' | 'almost' | 'wrong'
  /** word meaning is credited */
  meaning: boolean
  /** gender sub-skill: ok / failed / not credited */
  gender: 'ok' | 'fail' | 'skip'
  notes: DeNote[]
  expected: string
  quality: Quality | undefined
}

/** ä→ae, ö→oe, ü→ue, ß→ss, lowercase. */
export function asciiDe(s: string): string {
  return s.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
}

/** Strip every diacritic incl. umlauts (ä→a) and ß→ss. */
function stripAll(s: string): string {
  return s.toLowerCase().replace(/ß/g, 'ss').normalize('NFD').replace(/\p{M}+/gu, '')
}

export function cleanDe(s: string): string {
  return s.replace(/[^\p{L}\p{N}\s'-]/gu, ' ').replace(/\s+/g, ' ').trim()
}

type Kind = 'exact' | 'capital' | 'translit' | 'typo' | 'oneword'

function kindOf(inp: string, target: string, lexicon: ReadonlySet<string>, own: ReadonlySet<string>): Kind | null {
  const a = cleanDe(inp)
  const b = cleanDe(target)
  if (!a) return null
  if (a === b) return 'exact'
  if (a.toLowerCase() === b.toLowerCase()) return 'capital'
  if (asciiDe(a) === asciiDe(b)) return 'translit'
  const joined = asciiDe(a.replace(/[\s-]+/g, ''))
  if (joined === asciiDe(b) && /[\s-]/.test(a)) return 'oneword'
  const la = asciiDe(a)
  const lb = asciiDe(b)
  if (lb.length > 4 && levenshtein(la, lb) <= 1) {
    if (stripAll(a) === stripAll(b)) return null // dropped umlaut: schon vs schön
    const key = a.toLowerCase()
    if (lexicon.has(key) && !own.has(key)) return null // would be another word of the course
    if (lexicon.has(asciiDe(a)) && !own.has(asciiDe(a))) return null
    return 'typo'
  }
  return null
}

const RANK = { correct: 0, almost: 1, wrong: 2 } as const

/** `lexicon`: lowercase course words (bare nouns, forms, number words …) used by the "another word" rule. */
export function checkGermanAnswer(input: string, target: DeTarget, lexicon: readonly string[] = []): DeCheck {
  const expected = target.term
  const wrong: DeCheck = { verdict: 'wrong', meaning: false, gender: 'skip', notes: [], expected, quality: undefined }
  const raw = input.trim()
  if (!raw) return wrong

  if (target.value !== undefined && /^\d+$/.test(raw)) {
    return Number(raw) === target.value
      ? { verdict: 'correct', meaning: true, gender: 'skip', notes: ['digits'], expected, quality: 'exact' }
      : wrong
  }

  const lex = new Set(lexicon.map((x) => x.toLowerCase()))
  const candidates = [target.term, ...(target.alternatives ?? [])]
  const own = new Set<string>()
  for (const c of candidates) {
    const r = splitArticle(c).rest.toLowerCase()
    own.add(r)
    own.add(asciiDe(r))
    own.add(c.toLowerCase())
  }

  let best: DeCheck = wrong
  for (const cand of candidates) {
    const t = splitArticle(cand)
    const i = splitArticle(raw)
    const isNoun = t.article !== null
    const core = kindOf(i.article && isNoun ? i.rest : raw.replace(/^(der|die|das)\s+/i, (m) => (isNoun ? '' : m)), t.rest, lex, own)
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

    const notes: DeNote[] = []
    let gender: DeCheck['gender'] = 'skip'
    let almost = false
    if (core === 'translit') notes.push('umlaut_spelling')
    if (core === 'typo') {
      notes.push('typo')
      almost = true
    }
    if (core === 'oneword') {
      notes.push('number_one_word')
      almost = true
    }
    if (core === 'capital' && isNoun) {
      notes.push('capital')
      almost = true
    }
    if (isNoun) {
      const want = t.article as Gender
      if (i.article === want) gender = 'ok'
      else if (i.article) {
        gender = 'fail'
        notes.push('article_wrong')
        almost = true
      } else {
        gender = 'skip'
        if (!target.articleOptional) {
          notes.push('article_missing')
          almost = true
        }
      }
    }
    const quality: Quality | undefined = core === 'typo' ? 'typo' : core === 'translit' ? 'diacritics' : 'exact'
    const res: DeCheck = { verdict: almost ? 'almost' : 'correct', meaning: true, gender, notes, expected: cand, quality }
    if (RANK[res.verdict] < RANK[best.verdict]) best = res
    if (best.verdict === 'correct') break
  }
  return best
}

/** Digits typed for a number (listening exercise). */
export function checkDigits(input: string, value: number): boolean {
  return /^\d+$/.test(input.trim()) && Number(input.trim()) === value
}
