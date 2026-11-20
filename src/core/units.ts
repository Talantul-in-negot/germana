export const MIN_UNIT = 8
export const MAX_UNIT = 10

/** Sizes of consecutive units for `n` words. Aims for 8–10 words each, as even as possible. */
export function unitSizes(n: number): number[] {
  if (n <= 0) return []
  let k = -1
  for (let c = Math.ceil(n / MAX_UNIT); c <= Math.floor(n / MIN_UNIT); c++) {
    k = c
    break
  }
  // No k gives 8–10 each (e.g. 11–15, 21–23 words): small decks round, bigger ones stay <= 10 per unit.
  if (k === -1) k = n < 16 ? Math.max(1, Math.round(n / 9)) : Math.ceil(n / MAX_UNIT)
  const base = Math.floor(n / k)
  const extra = n % k
  return Array.from({ length: k }, (_, i) => base + (i < extra ? 1 : 0))
}

/** unitIndex for the word at list position `i` (0-based) in a deck of `n` words. */
export function assignUnits(n: number): number[] {
  const out: number[] = []
  unitSizes(n).forEach((size, u) => {
    for (let i = 0; i < size; i++) out.push(u)
  })
  return out
}
