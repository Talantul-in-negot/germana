import { darken, lighten } from '../color'
import { f, makePeaks, mountainPath, ridgePath, snowPath } from '../shapes'
import type { LayerSpec, Palette, TreeKind } from '../../theme/scenes'
import type { LayerCtx } from './types'

type Spec<K extends LayerSpec['drawer']> = LayerCtx<Extract<LayerSpec, { drawer: K }>>

export function Mountains({ spec, pal, uid }: Spec<'mountains'>) {
  const base = pal[spec.fill]
  const peaks = makePeaks(spec.seed, spec.peaks, spec.baseY, spec.height)
  const d = mountainPath(peaks, spec.baseY)
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}mt`} gradientUnits="userSpaceOnUse" x1="0" y1={spec.baseY - spec.height} x2="0" y2={spec.baseY + 4}>
          <stop offset="0" stopColor={base} />
          <stop offset="1" stopColor={lighten(base, 0.4)} />
        </linearGradient>
      </defs>
      <path d={d} fill={`url(#${uid}mt)`} stroke={`url(#${uid}mt)`} strokeWidth="9" strokeLinejoin="round" />
      <g fill="#000" opacity="0.07">
        {peaks.map((p) => <path key={p.x} d={`M${f(p.x)} ${f(p.top)}L${f(p.x + p.half)} ${spec.baseY}L${f(p.x + p.half * 0.05)} ${spec.baseY}Z`} />)}
      </g>
      {spec.snow && peaks.map((p) => <path key={p.x} d={snowPath(p, spec.baseY)} fill={pal.farSnow} stroke={pal.farSnow} strokeWidth="3" strokeLinejoin="round" />)}
    </g>
  )
}

export function Hills({ spec, pal, uid }: Spec<'hills'>) {
  const a = pal[spec.fill]
  const b = pal[spec.fill2]
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}hl`} gradientUnits="userSpaceOnUse" x1="0" y1={spec.baseY - spec.amp} x2="0" y2={spec.baseY + 130}>
          <stop offset="0" stopColor={lighten(a, 0.12)} />
          <stop offset="1" stopColor={b} />
        </linearGradient>
      </defs>
      <path d={ridgePath(spec.seed, spec.baseY, spec.amp, spec.bumps)} fill={`url(#${uid}hl)`} />
    </g>
  )
}

const TONE = ['leafA', 'leafB', 'leafC'] as const

function treeColor(pal: Palette, tone: 0 | 1 | 2): string {
  return pal[TONE[tone]]
}

function Pine({ c, trunk }: { c: string; trunk: string }) {
  const tiers: ReadonlyArray<readonly [number, number, number]> = [[-38, -4, 32], [-58, -16, 26], [-80, -36, 19]]
  return (
    <g>
      <rect x="-3" y="-10" width="6" height="12" rx="2" fill={trunk} />
      {tiers.map(([top, bot, half], i) => (
        <g key={i}>
          <path d={`M0 ${top}L${-half} ${bot}L${half} ${bot}Z`} fill={i === 2 ? lighten(c, 0.12) : c} stroke={i === 2 ? lighten(c, 0.12) : c} strokeWidth="5" strokeLinejoin="round" />
          <path d={`M0 ${top}L${half} ${bot}L${half * 0.1} ${bot}Z`} fill="#000" opacity="0.08" />
        </g>
      ))}
    </g>
  )
}

function Round({ c, trunk }: { c: string; trunk: string }) {
  return (
    <g>
      <path d="M-4 2L-3 -32L3 -32L4 2Z" fill={trunk} />
      <g fill={c}>
        <circle cx="0" cy="-54" r="26" />
        <circle cx="-20" cy="-42" r="18" />
        <circle cx="20" cy="-42" r="18" />
        <circle cx="0" cy="-36" r="19" />
      </g>
      <circle cx="12" cy="-38" r="16" fill="#000" opacity="0.07" />
      <circle cx="-8" cy="-62" r="12" fill={lighten(c, 0.3)} opacity="0.55" />
    </g>
  )
}

function Acacia({ c, trunk }: { c: string; trunk: string }) {
  return (
    <g>
      <path d="M-4 2C-4 -20 -6 -34 -16 -52L-10 -55C-2 -40 0 -32 2 -22C6 -36 8 -46 16 -58L22 -55C12 -42 8 -30 5 2Z" fill={trunk} />
      <g fill={c}>
        <ellipse cx="0" cy="-60" rx="46" ry="10" />
        <ellipse cx="-32" cy="-54" rx="20" ry="7" />
        <ellipse cx="34" cy="-65" rx="22" ry="8" />
      </g>
      <ellipse cx="2" cy="-64" rx="38" ry="6" fill={lighten(c, 0.3)} opacity="0.5" />
    </g>
  )
}

function Orchard({ c, trunk, fruit }: { c: string; trunk: string; fruit: string }) {
  const dots: ReadonlyArray<readonly [number, number]> = [[-16, -40], [10, -58], [22, -36], [-4, -30], [-26, -52], [4, -44]]
  return (
    <g>
      <path d="M-5 2L-3 -26L3 -26L5 2Z" fill={trunk} />
      <g fill={c}>
        <ellipse cx="0" cy="-46" rx="36" ry="28" />
        <circle cx="-22" cy="-36" r="15" />
        <circle cx="22" cy="-36" r="15" />
      </g>
      <ellipse cx="12" cy="-36" rx="20" ry="15" fill="#000" opacity="0.07" />
      <ellipse cx="-10" cy="-58" rx="14" ry="9" fill={lighten(c, 0.28)} opacity="0.55" />
      <g fill={fruit}>{dots.map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="3.4" />)}</g>
    </g>
  )
}

function Tree({ kind, tone, pal }: { kind: TreeKind; tone: 0 | 1 | 2; pal: Palette }) {
  const c = treeColor(pal, tone)
  const trunk = pal.trunk
  switch (kind) {
    case 'pine': return <Pine c={darken(c, 0.04)} trunk={trunk} />
    case 'round': return <Round c={c} trunk={trunk} />
    case 'acacia': return <Acacia c={c} trunk={darken(trunk, 0.1)} />
    case 'orchard': return <Orchard c={c} trunk={trunk} fruit={tone === 1 ? pal.petal3 : pal.petal1} />
  }
}

export function Trees({ spec, pal }: Spec<'trees'>) {
  return (
    <g>
      {spec.items.map(([kind, x, y, s, tone], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
          <ellipse cx="0" cy="2" rx="24" ry="4" fill="#000" opacity="0.1" />
          <Tree kind={kind} tone={tone} pal={pal} />
        </g>
      ))}
    </g>
  )
}

/** Wooden arch bridge: deck is a quadratic arc, railing posts are sampled on it. */
export function Bridge({ spec, pal }: Spec<'bridge'>) {
  const { x, y, w } = spec
  const x0 = x - w / 2
  const x1 = x + w / 2
  const cy = y - 44
  const wood = lighten(pal.trunk, 0.28)
  const dark = darken(pal.trunk, 0.05)
  const at = (t: number, off: number): readonly [number, number] => [
    x0 + (x1 - x0) * t,
    (1 - t) * (1 - t) * (y + off) + 2 * t * (1 - t) * (cy + off) + t * t * (y + off),
  ]
  const ts = [0, 0.14, 0.28, 0.42, 0.56, 0.7, 0.86, 1]
  return (
    <g>
      <rect x={x0 - 8} y={y - 4} width="16" height="40" rx="4" fill={dark} />
      <rect x={x1 - 8} y={y - 4} width="16" height="40" rx="4" fill={dark} />
      <path d={`M${x0} ${y}Q${x} ${cy} ${x1} ${y}L${x1} ${y + 11}Q${x} ${cy + 11} ${x0} ${y + 11}Z`} fill={wood} stroke={dark} strokeWidth="1.5" strokeLinejoin="round" />
      <g stroke={dark} strokeWidth="1.2" opacity="0.55">
        {ts.slice(1, -1).map((t) => {
          const [px, py] = at(t, 0)
          return <line key={t} x1={px} y1={py} x2={px} y2={py + 11} />
        })}
      </g>
      <g stroke={dark} strokeWidth="3.5" strokeLinecap="round">
        {ts.filter((_, i) => i % 2 === 0).map((t) => {
          const [bx, by] = at(t, 0)
          const [rx, ry] = at(t, -26)
          return <line key={t} x1={bx} y1={by} x2={rx} y2={ry} />
        })}
      </g>
      <path d={`M${x0} ${y - 26}Q${x} ${cy - 26} ${x1} ${y - 26}`} fill="none" stroke={dark} strokeWidth="4.5" strokeLinecap="round" />
      <path d={`M${x0} ${y - 14}Q${x} ${cy - 14} ${x1} ${y - 14}`} fill="none" stroke={dark} strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
    </g>
  )
}
