/** Tolerant answer checker for typed answers. */

export type Verdict = 'correct' | 'diacritics' | 'typo' | 'wrong'

export interface CheckResult {
  verdict: Verdict
  /** accepted answer that matched (or the closest/first one when wrong) */
  expected: string
}

/** Unify Romanian cedilla/comma-below variants, lowercase, drop punctuation, collapse spaces. */
export function normalize(s: string): string {
  return s
    .normalize('NFC')
    .toLowerCase()
    .replace(/ş/g, 'ș')
    .replace(/ţ/g, 'ț')
    .replace(/[‘’]/g, "'")
    .replace(/[^\p{L}\p{N}\s']/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** normalize() + strip diacritics (ă→a, â→a, î→i, ș→s, ț→t, é→e …). */
export function fold(s: string): string {
  return normalize(s)
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .normalize('NFC')
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      cur[j] = Math.min((prev[j] ?? 0) + 1, (cur[j - 1] ?? 0) + 1, (prev[j - 1] ?? 0) + cost)
    }
    prev = cur
  }
  return prev[b.length] ?? 0
}

/**
 * Order of checks (best verdict over all accepted answers wins):
 *  1. exact after normalisation                         -> correct
 *  2. equal after stripping diacritics                  -> diacritics (accepted, show correct form)
 *  3. Levenshtein <= 1 on folded text, target > 4 chars -> typo (accepted, flagged)
 */
export function checkAnswer(input: string, accepted: readonly string[]): CheckResult {
  const list = accepted.filter((a) => a.trim().length > 0)
  const fallback = list[0] ?? ''
  const n = normalize(input)
  if (!n) return { verdict: 'wrong', expected: fallback }
  const f = fold(input)

  for (const a of list) if (normalize(a) === n) return { verdict: 'correct', expected: a }
  for (const a of list) if (fold(a) === f) return { verdict: 'diacritics', expected: a }
  for (const a of list) {
    const fa = fold(a)
    if (fa.length > 4 && levenshtein(f, fa) <= 1) return { verdict: 'typo', expected: a }
  }
  return { verdict: 'wrong', expected: fallback }
}

export function isAccepted(v: Verdict): boolean {
  return v !== 'wrong'
}
