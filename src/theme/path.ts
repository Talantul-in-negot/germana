// Pure helpers for the learning path (Home): deck -> scenery zone, where the fawn stands, node zig-zag.
import { ZONES, zoneForIndex, type ZoneDef } from './scenes'

/** Duration of the fawn's walk to the next node. */
export const FAWN_WALK_MS = 600
/** Max horizontal swing of a node from the path centre, in px. */
export const NODE_SWING = 70

/** Zone index for a lesson: its position in the (already sorted) lesson list; later lessons cycle. */
export function zoneIndexForDeck(sortedDeckIds: readonly string[], deckId: string | undefined): number {
  const i = deckId === undefined ? -1 : sortedDeckIds.indexOf(deckId)
  return i < 0 ? 0 : i % ZONES.length
}

export function zoneForDeck(sortedDeckIds: readonly string[], deckId: string | undefined): ZoneDef {
  return zoneForIndex(zoneIndexForDeck(sortedDeckIds, deckId))
}

/** Index of the node the fawn stands on: first non-completed unit, the last one when all are done. */
export function fawnTargetIndex(completed: readonly boolean[]): number {
  if (completed.length === 0) return 0
  const i = completed.findIndex((c) => !c)
  return i < 0 ? completed.length - 1 : i
}

/** Horizontal offset (px) of node `i` from the path centre. */
export function nodeOffset(i: number): number {
  return Math.round(Math.sin(i * 1.1) * NODE_SWING)
}
