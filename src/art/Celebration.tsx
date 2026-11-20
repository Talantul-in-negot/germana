import { useEffect, useMemo } from 'react'
import { seeded } from './shapes'
import { useArtMotion } from './motion'
import { vars } from './layers/types'
import './art.css'

export interface CelebrationProps {
  /** Mount/unmount switch; when false nothing renders. */
  readonly active?: boolean
  /** Number of falling pieces. */
  readonly count?: number
  /** Called once the shower is over. */
  readonly onDone?: () => void
  readonly className?: string
}

type PieceKind = 'leaf' | 'petal' | 'star'
const COLORS = ['#ffd45a', '#ff9db5', '#8fd17a', '#9fd4f5', '#ffb36b', '#c89aea'] as const
const STILL_MS = 1800

interface Piece {
  readonly kind: PieceKind
  readonly color: string
  readonly left: number
  readonly size: number
  readonly delay: number
  readonly dur: number
  readonly dx: number
  readonly rot: number
  readonly top: number
}

function makePieces(count: number): Piece[] {
  const rnd = seeded(2024)
  const kinds: readonly PieceKind[] = ['leaf', 'petal', 'star']
  return Array.from({ length: count }, (_, i) => ({
    kind: kinds[i % 3] ?? 'star',
    color: COLORS[i % COLORS.length] ?? '#ffd45a',
    left: rnd() * 96 + 2,
    size: 14 + rnd() * 12,
    delay: rnd() * 1.1,
    dur: 2.4 + rnd() * 1.4,
    dx: (rnd() - 0.5) * 120,
    rot: (rnd() - 0.4) * 720,
    top: 6 + rnd() * 70,
  }))
}

const PATHS: Record<PieceKind, string> = {
  leaf: 'M-8 0Q0 -8 9 0Q0 8 -8 0ZM-8 0L-11 1.5',
  petal: 'M0 -8Q7 -2 0 8Q-7 -2 0 -8Z',
  star: 'M0 -9L2.6 -2.8L9 -2.2L4.1 2L5.6 8.6L0 5.2L-5.6 8.6L-4.1 2L-9 -2.2L-2.6 -2.8Z',
}

/** Overlay shower of leaves, petals and stars. Place inside a positioned container. Static when motion is reduced. */
export function Celebration({ active = true, count = 28, onDone, className }: CelebrationProps) {
  const motion = useArtMotion()
  const pieces = useMemo(() => makePieces(count), [count])
  const animated = motion !== 'none'
  const totalMs = animated ? Math.max(0, ...pieces.map((p) => p.delay + p.dur)) * 1000 : STILL_MS

  useEffect(() => {
    if (!active || !onDone) return undefined
    const id = window.setTimeout(onDone, totalMs)
    return () => window.clearTimeout(id)
  }, [active, onDone, totalMs])

  if (!active) return null
  return (
    <div className={`wp-celebrate${className ? ` ${className}` : ''}`} data-motion={motion} aria-hidden="true">
      {pieces.map((p, i) => (
        <span key={i} className="wp-confetti"
          style={vars({ left: `${p.left}%`, '--d': `${p.dur}s`, '--delay': `${p.delay}s`, '--dx': `${p.dx}px`, '--rot': `${p.rot}deg`, '--top': `${p.top}%` })}>
          <svg viewBox="-12 -12 24 24" width={p.size} height={p.size}><path d={PATHS[p.kind]} fill={p.color} stroke={p.color} strokeWidth="1.5" strokeLinejoin="round" /></svg>
        </span>
      ))}
    </div>
  )
}
