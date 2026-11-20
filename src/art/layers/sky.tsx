import { lighten } from '../color'
import { seeded } from '../shapes'
import { at, vars, type LayerCtx } from './types'
import type { LayerSpec } from '../../theme/scenes'

type Spec<K extends LayerSpec['drawer']> = LayerCtx<Extract<LayerSpec, { drawer: K }>>

export function Sky({ sky, uid }: Spec<'sky'>) {
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}sk`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="560">
          {sky.map(([o, c]) => <stop key={o} offset={o} stopColor={c} />)}
        </linearGradient>
      </defs>
      <rect x="-300" y="-300" width="1000" height="1500" fill={`url(#${uid}sk)`} />
    </g>
  )
}

export function Stars({ spec, pal }: Spec<'stars'>) {
  const rnd = seeded(77)
  return (
    <g fill={pal.petal2}>
      {Array.from({ length: spec.count }, (_, i) => {
        const x = rnd() * 400
        const y = rnd() * 330
        const r = 0.6 + rnd() * 1.3
        const twinkles = i % 3 === 0
        const sparkle = i % 11 === 0
        return (
          <g key={i} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}>
            <g className={twinkles ? 'wp-twinkle' : undefined} style={twinkles ? vars({ '--d': `${2 + rnd() * 3}s`, animationDelay: `${-rnd() * 4}s` }) : undefined} opacity={0.55 + rnd() * 0.45}>
              {sparkle
                ? <path d={`M0 ${-r * 3.2}Q0 0 ${r * 3.2} 0Q0 0 0 ${r * 3.2}Q0 0 ${-r * 3.2} 0Q0 0 0 ${-r * 3.2}Z`} />
                : <circle r={r} />}
            </g>
          </g>
        )
      })}
    </g>
  )
}

export function Celestial({ zone, pal, uid }: Spec<'celestial'>) {
  const c = zone.celestial
  if (c.kind === 'none') return <g />
  const glowR = c.r * (c.kind === 'sun' ? 3.4 : 2.6)
  return (
    <g>
      <defs>
        <radialGradient id={`${uid}gl`}>
          <stop offset="0" stopColor={c.glow} stopOpacity="0.85" />
          <stop offset="0.45" stopColor={c.glow} stopOpacity="0.28" />
          <stop offset="1" stopColor={c.glow} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${uid}disc`} cx="0.4" cy="0.35" r="0.75">
          <stop offset="0" stopColor={lighten(c.color, 0.5)} />
          <stop offset="1" stopColor={c.color} />
        </radialGradient>
      </defs>
      <circle className="wp-twinkle" style={vars({ '--d': '9s' })} cx={c.x} cy={c.y} r={glowR} fill={`url(#${uid}gl)`} />
      <circle cx={c.x} cy={c.y} r={c.r} fill={`url(#${uid}disc)`} />
      {c.kind === 'moon' && (
        <g fill={pal.far} opacity="0.18">
          <circle cx={c.x - c.r * 0.35} cy={c.y - c.r * 0.2} r={c.r * 0.22} />
          <circle cx={c.x + c.r * 0.3} cy={c.y + c.r * 0.28} r={c.r * 0.3} />
          <circle cx={c.x + c.r * 0.25} cy={c.y - c.r * 0.45} r={c.r * 0.12} />
        </g>
      )}
    </g>
  )
}

export function Clouds({ spec, pal }: Spec<'clouds'>) {
  const rnd = seeded(spec.seed)
  return (
    <g>
      {Array.from({ length: spec.count }, (_, i) => {
        const x = ((i + 0.3 + rnd() * 0.4) / spec.count) * 460 - 30
        const y = spec.minY + rnd() * (spec.maxY - spec.minY)
        const s = 0.7 + rnd() * 0.8
        return (
          <g key={i} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s.toFixed(2)})`}>
            <g className="wp-drift" style={vars({ '--d': `${55 + rnd() * 50}s`, animationDelay: `${-rnd() * 40}s` })}>
              <ellipse cx="0" cy="7" rx="42" ry="7" fill={pal.far} opacity="0.2" />
              <g fill={pal.cloud} opacity="0.94">
                <ellipse cx="0" cy="0" rx="44" ry="13" />
                <circle cx="-18" cy="-9" r="16" />
                <circle cx="4" cy="-17" r="20" />
                <circle cx="26" cy="-8" r="14" />
              </g>
              <ellipse cx="-4" cy="-24" rx="9" ry="4" fill="#fff" opacity="0.5" />
            </g>
          </g>
        )
      })}
    </g>
  )
}

/** Soft light shafts from above (forest canopy, sea surface). */
export function Rays({ spec, pal, uid }: Spec<'rays'>) {
  const rnd = seeded(5)
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}ry`} gradientUnits="userSpaceOnUse" x1="0" y1="-40" x2="0" y2="520">
          <stop offset="0" stopColor={pal.glow} stopOpacity="0.5" />
          <stop offset="1" stopColor={pal.glow} stopOpacity="0" />
        </linearGradient>
      </defs>
      {Array.from({ length: spec.count }, (_, i) => {
        const x = ((i + 0.5) / spec.count) * 520 - 90 + (rnd() - 0.5) * 30
        const w = 16 + rnd() * 22
        const lean = 60 + rnd() * 50
        return (
          <g key={i} className="wp-rays wp-o-t" style={vars({ '--d': `${11 + rnd() * 9}s`, animationDelay: `${-rnd() * 10}s` })}>
            <polygon points={`${x},-40 ${x + w},-40 ${x + w + lean + w},520 ${x + lean},520`} fill={`url(#${uid}ry)`} opacity={0.5 + at([0.3, 0.5, 0.4], i) * 0.5} />
          </g>
        )
      })}
    </g>
  )
}
