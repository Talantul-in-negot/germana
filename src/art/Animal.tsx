import type { CSSProperties, ReactElement } from 'react'
import type { AnimalKind } from '../theme/scenes'
import { Fish, Bird, Duckling, Lion, Turtle } from './animals/friends'
import { Fawn, Fox, Hedgehog, Rabbit, Squirrel } from './animals/woodland'
import { Sparkles, type DrawProps, type Mood } from './animals/parts'
import { vars } from './layers/types'
import { useArtMotion, useUid } from './motion'
import './art.css'

export type AnimalMood = Mood
export const ANIMAL_MOODS: readonly AnimalMood[] = ['idle', 'happy', 'encourage', 'celebrate']
export const ANIMAL_KINDS: readonly AnimalKind[] = ['fawn', 'rabbit', 'fox', 'squirrel', 'hedgehog', 'bird', 'duckling', 'lion', 'fish', 'turtle']

const DRAW: Record<AnimalKind, (p: DrawProps) => ReactElement> = {
  fawn: Fawn, rabbit: Rabbit, fox: Fox, squirrel: Squirrel, hedgehog: Hedgehog,
  bird: Bird, duckling: Duckling, lion: Lion, fish: Fish, turtle: Turtle,
}

/** Half-width of the ground shadow (0 = none, for the floating fish). */
const SHADOW: Record<AnimalKind, number> = {
  fawn: 32, rabbit: 30, fox: 32, squirrel: 30, hedgehog: 34, bird: 26, duckling: 30, lion: 30, fish: 0, turtle: 44,
}

/** Romanian names, used for accessible labels. */
export const ANIMAL_LABEL: Record<AnimalKind, string> = {
  fawn: 'Pui de căprioară', rabbit: 'Iepuraș', fox: 'Pui de vulpe', squirrel: 'Veveriță', hedgehog: 'Arici',
  bird: 'Păsărică', duckling: 'Rățușcă', lion: 'Pui de leu', fish: 'Pește mic', turtle: 'Broască țestoasă',
}

/** Cheap stable string hash, used to desynchronise idle loops between instances. */
function hash(s: string): number {
  let h = 7
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 100003
  return h
}

export interface AnimalProps {
  readonly kind: AnimalKind
  readonly mood?: AnimalMood
  /** Width and height in px (the art is square). */
  readonly size?: number
  /** Accessible label; omit to hide the illustration from assistive tech. */
  readonly label?: string
  readonly className?: string
  readonly style?: CSSProperties
}

/**
 * Hand-built SVG animal. Idle: breathing, blinking, ear twitch, tail wag, occasional wave / head tilt.
 * Moods: happy = small hop + ears up, encourage = gentle head tilt, celebrate = jump + sparkles.
 * With reduced motion every animation stops and the mood shows as a static pose.
 */
export function Animal({ kind, mood = 'idle', size = 96, label, className, style }: AnimalProps) {
  const u = useUid()
  const motion = useArtMotion()
  const Draw = DRAW[kind]
  const shadow = SHADOW[kind]
  return (
    <svg
      viewBox="0 0 120 120" width={size} height={size}
      className={`wp-art wp-an${className ? ` ${className}` : ''}`}
      data-kind={kind} data-mood={mood} data-motion={motion}
      role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}
      style={{ overflow: 'visible', ...vars({ '--ad': `-${(hash(u) % 54) / 10}s` }), ...style }}
    >
      {shadow > 0 && <ellipse cx="60" cy="111.5" rx={shadow} ry="4.6" fill="#3b2a1a" opacity="0.13" />}
      <g className="wp-mood">
        <g className="wp-breathe wp-o-b"><Draw mood={mood} u={u} /></g>
      </g>
      <Sparkles mood={mood} />
    </svg>
  )
}
