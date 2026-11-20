import { seeded } from '../shapes'
import type { LayerSpec, ParticleKind, Palette } from '../../theme/scenes'
import { ART_H, ART_W, at, vars, type LayerCtx } from './types'

type Spec<K extends LayerSpec['drawer']> = LayerCtx<Extract<LayerSpec, { drawer: K }>>

const COUNT: Record<ParticleKind, number> = { butterflies: 7, petals: 14, leaves: 14, fireflies: 18, bubbles: 16, motes: 18 }
const MOTION: Record<ParticleKind, string> = {
  butterflies: 'wp-wander', petals: 'wp-fall', leaves: 'wp-fall', fireflies: 'wp-glow', bubbles: 'wp-rise', motes: 'wp-glow',
}

function Shape({ kind, i, pal }: { kind: ParticleKind; i: number; pal: Palette }) {
  const tint = at([pal.petal1, pal.petal2, pal.petal3], i)
  switch (kind) {
    case 'butterflies':
      return (
        <g>
          <g className="wp-flap wp-o-c" style={vars({ animationDelay: `${-(i % 5) * 0.07}s` })}>
            <path d="M0 0Q-9 -11 -12 -3Q-10 6 0 2ZM0 0Q9 -11 12 -3Q10 6 0 2Z" fill={tint} />
            <circle cx="-6" cy="-3" r="2" fill="#fff" opacity="0.6" /><circle cx="6" cy="-3" r="2" fill="#fff" opacity="0.6" />
          </g>
          <rect x="-0.8" y="-5" width="1.6" height="9" rx="0.8" fill={pal.ink} />
        </g>
      )
    case 'petals':
      return <ellipse rx="4" ry="2.4" fill={tint} opacity="0.9" />
    case 'leaves':
      return <path d="M-6 0Q0 -6 7 0Q0 6 -6 0ZM-6 0L-9 1" fill={tint} stroke={tint} strokeWidth="0.8" strokeLinecap="round" />
    case 'fireflies':
      return (
        <g>
          <circle r="8" fill={pal.glow} opacity="0.22" />
          <circle r="2.4" fill={pal.glow} />
        </g>
      )
    case 'bubbles':
      return (
        <g>
          <circle r={3 + (i % 4) * 1.6} fill="#fff" fillOpacity="0.14" stroke="#fff" strokeOpacity="0.7" strokeWidth="1" />
          <circle cx="-1.2" cy="-1.4" r="0.9" fill="#fff" opacity="0.8" />
        </g>
      )
    case 'motes':
      return <circle r={0.9 + (i % 3) * 0.6} fill={pal.glow} opacity="0.8" />
  }
}

export function Particles({ zone, pal, particleScale }: Spec<'particles'>) {
  const kind = zone.particles
  const rnd = seeded(101)
  const n = Math.max(1, Math.round(COUNT[kind] * particleScale))
  const slowRise = kind === 'motes' || kind === 'fireflies' || kind === 'butterflies'
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const x = rnd() * ART_W
        const y = kind === 'butterflies' || kind === 'fireflies' ? 330 + rnd() * 240 : rnd() * ART_H
        const d = slowRise ? 9 + rnd() * 8 : kind === 'bubbles' ? 9 + rnd() * 7 : 12 + rnd() * 8
        return (
          <g key={i} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}>
            <g className={`wp-p ${MOTION[kind]}`}
              style={vars({ '--d': `${d.toFixed(1)}s`, '--y': y.toFixed(0), '--dx': `${((rnd() - 0.5) * 90).toFixed(0)}px`, '--rot': `${((rnd() - 0.4) * 720).toFixed(0)}deg`, animationDelay: `${(-rnd() * d).toFixed(1)}s` })}>
              <Shape kind={kind} i={i} pal={pal} />
            </g>
          </g>
        )
      })}
    </g>
  )
}
