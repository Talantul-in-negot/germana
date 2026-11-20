import { createContext, useContext, useState, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { ANIMAL_LABEL, Animal, Celebration, Scene, type AnimalMood } from '../art'
import { sortDecks } from '../core/decks'
import { useDecks } from '../data/hooks'
import { useKeyboardOpen } from '../lib/keyboard'
import { zoneForDeck } from '../theme/path'
import { MASCOT_NAME, zoneForIndex, type ZoneDef } from '../theme/scenes'

const ZoneContext = createContext<ZoneDef>(zoneForIndex(0))

/** Zone of the lesson being practised (the first zone outside a `ZonedScreen`). */
export const useZone = (): ZoneDef => useContext(ZoneContext)

/**
 * Wraps a `/…/:deckId` screen: a fixed, dimmed scene of the lesson's zone sits behind the content
 * (out of layout, never captures taps) and the zone is available through `useZone`.
 */
export function ZonedScreen({ children }: { children: ReactNode }) {
  const { deckId } = useParams()
  const decks = useDecks()
  const zone = decks ? zoneForDeck(sortDecks(decks).map((d) => d.id), deckId) : null
  return (
    <ZoneContext value={zone ?? zoneForIndex(0)}>
      {zone && (
        <div className="scene-fixed" aria-hidden="true" data-testid="lesson-scene" data-zone={zone.id}>
          <Scene zone={zone} variant="dim" />
        </div>
      )}
      <div className="relative z-[1] h-full">{children}</div>
    </ZoneContext>
  )
}

/**
 * Small animal for a corner of the exercise header. It keeps its box (no reflow) and is only made
 * invisible while the on-screen keyboard is open.
 */
export function CornerAnimal({ mood = 'idle' }: { mood?: AnimalMood }) {
  const zone = useZone()
  const keyboard = useKeyboardOpen()
  return (
    <div className="ex-corner" data-testid="corner-animal" data-mood={mood} style={{ visibility: keyboard ? 'hidden' : 'visible' }} aria-hidden="true">
      <Animal kind={zone.resident} mood={mood} size={48} />
    </div>
  )
}

/** One shower of leaves/petals over the whole screen (fixed, never captures taps), then it unmounts itself. */
export function CelebrationLayer({ count }: { count?: number }) {
  const [on, setOn] = useState(true)
  if (!on) return null
  return (
    <div className="pointer-events-none fixed inset-0 z-20" data-testid="celebration">
      <Celebration {...(count ? { count } : {})} onDone={() => setOn(false)} />
    </div>
  )
}

/** The zone's resident and the fawn, both celebrating. */
export function CelebratingPair({ size = 96 }: { size?: number }) {
  const zone = useZone()
  return (
    <div className="flex items-end justify-center gap-2" data-testid="celebrating-animals">
      <Animal kind={zone.resident} mood="celebrate" size={size} label={ANIMAL_LABEL[zone.resident]} />
      <Animal kind="fawn" mood="celebrate" size={size * 1.15} label={MASCOT_NAME} />
    </div>
  )
}
