/** German number words 0–100: generation, breakdown (ein + und + zwanzig) and distractors. */
import { shuffle } from './id'

const UNITS = ['null', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf', 'dreizehn', 'vierzehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn']
const TENS = ['', '', 'zwanzig', 'dreißig', 'vierzig', 'fünfzig', 'sechzig', 'siebzig', 'achtzig', 'neunzig']

export interface NumPart {
  text: string
  kind: 'unit' | 'und' | 'ten' | 'whole'
}

/** Breakdown shown in the feedback panel; units come BEFORE tens from 21 on. */
export function numberBreakdown(n: number): NumPart[] {
  if (n < 0 || n > 100 || !Number.isInteger(n)) throw new RangeError('0..100 only')
  if (n === 100) return [{ text: 'hundert', kind: 'whole' }]
  if (n < 20) return [{ text: UNITS[n] as string, kind: 'whole' }]
  const t = Math.floor(n / 10)
  const u = n % 10
  const ten = TENS[t] as string
  if (u === 0) return [{ text: ten, kind: 'whole' }]
  return [
    { text: u === 1 ? 'ein' : (UNITS[u] as string), kind: 'unit' },
    { text: 'und', kind: 'und' },
    { text: ten, kind: 'ten' },
  ]
}

export function numberToGerman(n: number): string {
  return numberBreakdown(n).map((p) => p.text).join('')
}

export function isCompoundNumber(n: number): boolean {
  return n > 20 && n < 100 && n % 10 !== 0
}

/** All number words 0..100, lowercase, for "typo yields another number" checks. */
export function allNumberWords(): string[] {
  return Array.from({ length: 101 }, (_, i) => numberToGerman(i))
}

/** Digits-confusion distractors: swapped digits (21↔12), teen↔ten (13↔30), neighbours. */
export function numberDistractors(value: number, rng: () => number = Math.random, count = 3, max = 100): number[] {
  const ordered: number[] = []
  const push = (n: number) => {
    if (Number.isInteger(n) && n >= 0 && n <= max && n !== value && !ordered.includes(n)) ordered.push(n)
  }
  if (value >= 10 && value < 100) {
    const d = String(value)
    push(Number(`${d[1]}${d[0]}`))
  }
  if (value >= 13 && value <= 19) push((value - 10) * 10)
  if (value >= 30 && value % 10 === 0 && value <= 90) push(value / 10 + 10)
  push(value + 1)
  push(value - 1)
  push(value + 10)
  push(value - 10)
  const head = ordered.slice(0, count)
  if (head.length < count) {
    const pool = shuffle(Array.from({ length: Math.min(max, 40) + 1 }, (_, i) => i), rng)
    for (const n of pool) {
      if (head.length >= count) break
      if (n !== value && !head.includes(n)) head.push(n)
    }
  }
  return head
}
