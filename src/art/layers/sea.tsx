import { darken, lighten } from '../color'
import { ridgePath, seeded } from '../shapes'
import type { LayerSpec, Palette } from '../../theme/scenes'
import { vars, type LayerCtx } from './types'

type Spec<K extends LayerSpec['drawer']> = LayerCtx<Extract<LayerSpec, { drawer: K }>>

/** Tiny far-away fish silhouette drifting back and forth. */
function Shoal({ x, y, s, c, d }: { x: number; y: number; s: number; c: string; d: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g className="wp-drift" style={vars({ '--d': `${d}s`, animationDelay: `${-d / 2}s` })} fill={c} opacity="0.7">
        {[0, 18, 9].map((dx, i) => (
          <g key={dx} transform={`translate(${dx} ${i * 7})`}>
            <ellipse cx="0" cy="0" rx="7" ry="4" />
            <path d="M-6 0L-12 -4L-12 4Z" />
          </g>
        ))}
      </g>
    </g>
  )
}

function FarReef({ pal, uid }: { pal: Palette; uid: string }) {
  const spires: ReadonlyArray<readonly [number, number, number]> = [[40, 380, 90], [96, 410, 60], [296, 372, 100], [352, 404, 66]]
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}fr`} gradientUnits="userSpaceOnUse" x1="0" y1="340" x2="0" y2="520">
          <stop offset="0" stopColor={pal.far} stopOpacity="0.5" />
          <stop offset="1" stopColor={pal.mid} />
        </linearGradient>
      </defs>
      {spires.map(([x, y, h]) => <rect key={x} x={x - 14} y={y} width="28" height={h + 140} rx="14" fill={pal.far} opacity="0.55" />)}
      <path d={ridgePath(4, 452, 22, 6)} fill={`url(#${uid}fr)`} />
      <Shoal x={70} y={230} s={1} c={pal.farSnow} d={26} />
      <Shoal x={260} y={300} s={0.8} c={pal.farSnow} d={34} />
      <Shoal x={170} y={380} s={0.6} c={pal.far} d={30} />
    </g>
  )
}

function Branching({ x, y, s, c }: { x: number; y: number; s: number; c: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} stroke={c} strokeWidth="8" strokeLinecap="round" fill="none">
      <path d="M0 0L0 -34M0 -16L-14 -34M0 -24L14 -44M-14 -34L-18 -48M14 -44L22 -54M0 -34L-2 -52" />
      <g stroke={lighten(c, 0.4)} strokeWidth="2" opacity="0.7"><path d="M-1 -4L-1 -30M13 -42L19 -50" /></g>
    </g>
  )
}

function Fan({ x, y, s, c }: { x: number; y: number; s: number; c: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 0L-26 -46Q0 -62 26 -46Z" fill={c} opacity="0.92" />
      <g stroke={lighten(c, 0.35)} strokeWidth="1.5" opacity="0.8" fill="none">
        {[-18, -9, 0, 9, 18].map((dx) => <path key={dx} d={`M0 -2L${dx * 1.3} -48`} />)}
        <path d="M-20 -36Q0 -46 20 -36" />
      </g>
      <rect x="-3" y="-2" width="6" height="12" rx="3" fill={darken(c, 0.2)} />
    </g>
  )
}

function Brain({ x, y, s, c }: { x: number; y: number; s: number; c: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-26 0Q-26 -30 0 -30Q26 -30 26 0Z" fill={c} />
      <path d="M-16 -8Q-10 -16 -4 -8T8 -10T18 -6M-12 -18Q-4 -24 2 -18T14 -18" fill="none" stroke={darken(c, 0.15)} strokeWidth="2" strokeLinecap="round" />
    </g>
  )
}

function Tubes({ x, y, s, c }: { x: number; y: number; s: number; c: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill={c}>
      {[[-12, 30], [0, 44], [12, 24]].map(([dx, h]) => (
        <g key={dx}>
          <rect x={(dx ?? 0) - 5} y={-(h ?? 0)} width="10" height={h} rx="5" />
          <ellipse cx={dx} cy={-(h ?? 0) + 1} rx="4" ry="2" fill={darken(c, 0.25)} />
        </g>
      ))}
    </g>
  )
}

function MidReef({ pal, uid }: { pal: Palette; uid: string }) {
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}mr`} gradientUnits="userSpaceOnUse" x1="0" y1="440" x2="0" y2="560">
          <stop offset="0" stopColor={pal.mid} />
          <stop offset="1" stopColor={pal.mid2} />
        </linearGradient>
      </defs>
      <path d={ridgePath(9, 486, 12, 5)} fill={`url(#${uid}mr)`} />
      <Branching x={42} y={500} s={1.2} c={pal.petal1} />
      <Fan x={120} y={496} s={1} c={pal.petal3} />
      <Tubes x={196} y={500} s={1} c={pal.petal2} />
      <Brain x={266} y={498} s={1} c={lighten(pal.petal1, 0.2)} />
      <Branching x={330} y={500} s={1.05} c={pal.petal3} />
      <Fan x={380} y={500} s={0.8} c={pal.petal1} />
    </g>
  )
}

function Seaweed({ x, y, h, c, d, delay }: { x: number; y: number; h: number; c: string; d: number; delay: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className="wp-sway wp-o-b" style={vars({ '--d': `${d}s`, animationDelay: `${delay}s` })}>
        <path d={`M0 0Q-10 ${-h * 0.3} 0 ${-h * 0.55}Q10 ${-h * 0.8} 0 ${-h}`} stroke={c} strokeWidth="7" strokeLinecap="round" fill="none" />
        <path d={`M0 ${-h * 0.3}Q10 ${-h * 0.4} 12 ${-h * 0.55}`} stroke={lighten(c, 0.2)} strokeWidth="4" strokeLinecap="round" fill="none" />
      </g>
    </g>
  )
}

function Star({ x, y, c }: { x: number; y: number; c: string }) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = (Math.PI * 2 * i) / 10 - Math.PI / 2
    const r = i % 2 ? 4 : 10
    return `${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`
  }).join(' ')
  return <polygon transform={`translate(${x} ${y}) rotate(-14)`} points={pts} fill={c} stroke={c} strokeWidth="2" strokeLinejoin="round" />
}

function NearSeabed({ pal, uid }: { pal: Palette; uid: string }) {
  const rnd = seeded(12)
  const blades: ReadonlyArray<readonly [number, number, number, string]> = [
    [18, 640, 120, pal.leafA], [34, 646, 90, pal.leafB], [52, 640, 70, pal.leafC],
    [372, 640, 130, pal.leafA], [388, 646, 96, pal.leafB], [350, 642, 72, pal.leafC], [208, 650, 56, pal.leafB],
  ]
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}sd`} gradientUnits="userSpaceOnUse" x1="0" y1="540" x2="0" y2="720">
          <stop offset="0" stopColor={lighten(pal.near, 0.12)} />
          <stop offset="1" stopColor={pal.nearDark} />
        </linearGradient>
      </defs>
      <path d={ridgePath(21, 556, 10, 4)} fill={`url(#${uid}sd)`} />
      <g fill="none" stroke={darken(pal.near, 0.1)} strokeWidth="1.5" strokeLinecap="round" opacity="0.5">
        <path d="M30 590Q50 584 70 590T110 590" /><path d="M250 600Q276 593 302 600T350 600" /><path d="M120 622Q150 614 180 622" />
      </g>
      {blades.map(([x, y, h, c], i) => <Seaweed key={x} x={x} y={y} h={h} c={c} d={3.5 + (i % 4)} delay={-i * 0.8} />)}
      <Star x={90} y={612} c={pal.petal1} />
      <Star x={300} y={626} c={pal.petal2} />
      <g fill={pal.rock}>
        {[0, 1, 2, 3].map((i) => <ellipse key={i} cx={140 + rnd() * 140} cy={598 + rnd() * 36} rx={5 + rnd() * 5} ry={3 + rnd() * 2} />)}
      </g>
    </g>
  )
}

export function Reef({ spec, pal, uid }: Spec<'reef'>) {
  switch (spec.part) {
    case 'far': return <FarReef pal={pal} uid={uid} />
    case 'mid': return <MidReef pal={pal} uid={uid} />
    case 'near': return <NearSeabed pal={pal} uid={uid} />
  }
}
