/** Word-list import: `term ; translation ; [example] ; [tags]` with separator auto-detection. */
import { fold } from './answer'

export type Separator = ';' | ',' | '\t' | ' - ' | ' = ' | '='

export type RowIssue = 'empty_term' | 'empty_translation' | 'duplicate' | 'duplicate_existing'

export interface ParsedRow {
  /** 1-based line number in the source text */
  line: number
  term: string
  translations: string[]
  example?: string
  tags: string[]
  issues: RowIssue[]
  valid: boolean
}

export interface ParseResult {
  separator: Separator | null
  rows: ParsedRow[]
  validCount: number
}

// Order matters: the more "intentional" a separator, the earlier it is tried (commas are common inside text).
const CANDIDATES: Separator[] = [';', '\t', ' - ', ' = ', '=', ',']

/** Split a line on `sep`, honouring "double quoted" fields for single-char separators. */
export function splitLine(line: string, sep: Separator): string[] {
  if (sep.length > 1 || !line.includes('"')) return line.split(sep).map((s) => s.trim())
  const out: string[] = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i] as string
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"'
        i++
      } else inQ = !inQ
    } else if (ch === sep && !inQ) {
      out.push(cur.trim())
      cur = ''
    } else cur += ch
  }
  out.push(cur.trim())
  return out
}

export function detectSeparator(lines: string[]): Separator | null {
  for (const sep of CANDIDATES) {
    const hits = lines.filter((l) => splitLine(l, sep).length >= 2).length
    if (hits > 0 && hits >= Math.ceil(lines.length / 2)) return sep
  }
  return null
}

const HEADER_TERMS = new Set(['term', 'word', 'english', 'cuvant', 'cuvinte', 'termen'])
const HEADER_TRANS = new Set(['translation', 'traducere', 'romanian', 'romana', 'translations'])

function looksLikeHeader(cells: string[]): boolean {
  const a = fold(cells[0] ?? '')
  const b = fold(cells[1] ?? '')
  return HEADER_TERMS.has(a) && HEADER_TRANS.has(b)
}

export function splitTranslations(s: string): string[] {
  return s
    .split('|')
    .map((x) => x.trim())
    .filter(Boolean)
}

function splitTags(s: string): string[] {
  return s
    .split(/[,|#\s]+/)
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean)
}

/** Parse pasted/imported text. `existingTerms` flags duplicates against an existing deck. */
export function parseWordList(text: string, existingTerms: readonly string[] = []): ParseResult {
  const raw = text.replace(/^﻿/, '').split(/\r?\n/)
  const numbered = raw
    .map((l, i) => ({ l, line: i + 1 }))
    .filter((x) => x.l.trim().length > 0 && !x.l.trim().startsWith('#'))

  const separator = detectSeparator(numbered.map((x) => x.l))
  const seen = new Set(existingTerms.map((t) => fold(t)))
  const existing = new Set(seen)
  const rows: ParsedRow[] = []

  numbered.forEach(({ l, line }, idx) => {
    const cells = separator ? splitLine(l, separator) : [l.trim()]
    if (idx === 0 && looksLikeHeader(cells)) return
    const term = (cells[0] ?? '').trim()
    const translations = splitTranslations(cells[1] ?? '')
    const example = (cells[2] ?? '').trim() || undefined
    const tags = splitTags(cells.slice(3).join(' '))
    const issues: RowIssue[] = []
    if (!term) issues.push('empty_term')
    if (translations.length === 0) issues.push('empty_translation')
    if (term) {
      const key = fold(term)
      if (existing.has(key)) issues.push('duplicate_existing')
      else if (seen.has(key)) issues.push('duplicate')
      seen.add(key)
    }
    const row: ParsedRow = { line, term, translations, tags, issues, valid: issues.length === 0 }
    if (example) row.example = example
    rows.push(row)
  })

  return { separator, rows, validCount: rows.filter((r) => r.valid).length }
}

export interface JsonWordInput {
  term: string
  translations: string[]
  example?: string
  tags: string[]
}

/** Parse `.json` word lists: array of `{term, translation|translations, example?, tags?}` or `[term, translation]`. */
export function parseJsonWords(text: string): JsonWordInput[] {
  const data: unknown = JSON.parse(text)
  const arr: unknown[] = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && Array.isArray((data as { words?: unknown }).words)
      ? ((data as { words: unknown[] }).words)
      : []
  const out: JsonWordInput[] = []
  for (const item of arr) {
    let term = ''
    let trans: string[] = []
    let example: string | undefined
    let tags: string[] = []
    if (Array.isArray(item)) {
      term = String(item[0] ?? '')
      trans = splitTranslations(String(item[1] ?? ''))
      example = item[2] ? String(item[2]) : undefined
    } else if (item && typeof item === 'object') {
      const o = item as Record<string, unknown>
      term = String(o.term ?? o.word ?? '')
      const t = o.translations ?? o.translation
      trans = Array.isArray(t) ? t.map(String) : splitTranslations(String(t ?? ''))
      example = o.example ? String(o.example) : undefined
      tags = Array.isArray(o.tags) ? o.tags.map(String) : []
    }
    if (term.trim()) {
      const w: JsonWordInput = { term: term.trim(), translations: trans, tags }
      if (example) w.example = example
      out.push(w)
    }
  }
  return out
}

/** Turn parsed JSON entries into the same row shape the preview table uses. */
export function rowsFromJson(items: JsonWordInput[], existingTerms: readonly string[] = []): ParseResult {
  const seen = new Set(existingTerms.map((t) => fold(t)))
  const existing = new Set(seen)
  const rows: ParsedRow[] = items.map((it, i) => {
    const issues: RowIssue[] = []
    if (it.translations.length === 0) issues.push('empty_translation')
    const key = fold(it.term)
    if (existing.has(key)) issues.push('duplicate_existing')
    else if (seen.has(key)) issues.push('duplicate')
    seen.add(key)
    const row: ParsedRow = { line: i + 1, term: it.term, translations: it.translations, tags: it.tags, issues, valid: issues.length === 0 }
    if (it.example) row.example = it.example
    return row
  })
  return { separator: null, rows, validCount: rows.filter((r) => r.valid).length }
}
