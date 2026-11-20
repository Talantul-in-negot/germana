import type { Deck } from './types'

/** Courses alphabetically (decks without a course last), lessons by number, then by name. */
export function sortDecks(decks: readonly Deck[]): Deck[] {
  return decks.slice().sort((a, b) => {
    const ca = a.course ?? '￿'
    const cb = b.course ?? '￿'
    if (ca !== cb) return ca.localeCompare(cb)
    const la = a.lesson ?? Number.MAX_SAFE_INTEGER
    const lb = b.lesson ?? Number.MAX_SAFE_INTEGER
    if (la !== lb) return la - lb
    return a.name.localeCompare(b.name)
  })
}

export interface CourseGroup {
  course: string | null
  decks: Deck[]
}

export function groupByCourse(decks: readonly Deck[]): CourseGroup[] {
  const out: CourseGroup[] = []
  for (const d of sortDecks(decks)) {
    const key = d.course ?? null
    const last = out[out.length - 1]
    if (last && last.course === key) last.decks.push(d)
    else out.push({ course: key, decks: [d] })
  }
  return out
}
