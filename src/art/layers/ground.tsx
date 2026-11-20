import { darken, lighten } from '../color'
import { f, ridgePath, seeded } from '../shapes'
import type { BloomKind, LayerSpec, Palette } from '../../theme/scenes'
import { ART_H, at, vars, type LayerCtx } from './types'

type Spec<K extends LayerSpec['drawer']> = LayerCtx<Extract<LayerSpec, { drawer: K }>>

/** Flower drawn with its base at (0,0), about 28 units tall. `i` picks the colour variant. */
function Flower({ kind, i, pal }: { kind: BloomKind; i: number; pal: Palette }) {
  const petal = at([pal.petal3, pal.petal1, pal.petal2], i)
  const stem = pal.leafA
  switch (kind) {
    case 'daisy':
      return (
        <g>
          <path d="M0 0Q-1 -8 0 -16" stroke={stem} strokeWidth="1.7" fill="none" />
          <g fill={petal}>
            {[0, 60, 120, 180, 240, 300].map((a) => <ellipse key={a} cx="0" cy="-21" rx="2.3" ry="4.6" transform={`rotate(${a} 0 -16)`} />)}
          </g>
          <circle cx="0" cy="-16" r="2.6" fill={petal === pal.petal2 ? pal.petal1 : pal.petal2} />
        </g>
      )
    case 'tulip':
      return (
        <g>
          <path d="M0 0Q1 -8 0 -16M0 -4Q-7 -8 -8 -15Q-2 -11 0 -4Z" stroke={stem} strokeWidth="1.6" fill={stem} />
          <path d="M-4.5 -17Q-5.5 -27 0 -29Q5.5 -27 4.5 -17Q0 -12 -4.5 -17Z" fill={petal} />
          <path d="M-1 -28Q0 -22 1 -28Z" fill="#fff" opacity="0.4" />
        </g>
      )
    case 'bell':
      return (
        <g>
          <path d="M0 0Q3 -8 0 -17" stroke={stem} strokeWidth="1.6" fill="none" />
          <path d="M0 -20Q-6 -20 -5.5 -13Q-4.5 -10 -7 -7L7 -7Q4.5 -10 5.5 -13Q6 -20 0 -20Z" fill={at([pal.petal1, pal.petal3], i)} />
          <circle cx="0" cy="-5.5" r="1.3" fill={pal.petal2} />
        </g>
      )
    case 'moon':
      return (
        <g>
          <circle cx="0" cy="-16" r="9" fill={pal.glow} opacity="0.22" />
          <path d="M0 0Q-1 -8 0 -15" stroke={stem} strokeWidth="1.6" fill="none" />
          <g fill={petal}>
            {[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cx="0" cy="-20" rx="2.6" ry="4.4" transform={`rotate(${a} 0 -16)`} />)}
          </g>
          <circle cx="0" cy="-16" r="2" fill={pal.glow} />
        </g>
      )
    case 'none':
      return <g />
  }
}

const Tuft = ({ c }: { c: string }) => (
  <path d="M-5 0Q-6 -8 -9 -12Q-3 -8 -1 0ZM-1 0Q-1 -12 1 -17Q3 -11 2 0ZM2 0Q4 -7 8 -11Q5 -5 6 0Z" fill={c} />
)

function Rock({ pal }: { pal: Palette }) {
  return (
    <g>
      <path d="M-13 0Q-14 -10 -4 -12Q6 -14 11 -6Q15 0 13 0Z" fill={pal.rock} />
      <path d="M-4 -11Q4 -13 9 -7Q3 -9 -4 -11Z" fill="#fff" opacity="0.35" />
      <ellipse cx="-6" cy="-3" rx="4" ry="2" fill={pal.leafB} opacity="0.7" />
    </g>
  )
}

const Leaf = ({ c }: { c: string }) => <path d="M0 0Q4 -4 9 0Q4 4 0 0ZM0 0L-3 1" fill={c} stroke={c} strokeWidth="0.8" strokeLinecap="round" />

interface Prop { readonly kind: 'flower' | 'tuft' | 'rock' | 'leaf'; readonly x: number; readonly y: number; readonly s: number; readonly i: number }

function makeProps(spec: Spec<'ground'>['spec']): Prop[] {
  const rnd = seeded(spec.seed)
  const span = ART_H - spec.crestY
  const make = (kind: Prop['kind'], n: number): Prop[] =>
    Array.from({ length: n }, (_, i) => {
      const y = spec.crestY + 16 + rnd() * (span + 40)
      return { kind, x: -10 + rnd() * 420, y, s: 0.55 + ((y - spec.crestY) / (span + 40)) * 0.95, i }
    })
  const leafCount = spec.leaves ? 46 : 0
  return [...make('tuft', spec.tufts), ...make('rock', spec.rocks), ...make('flower', spec.flowers), ...make('leaf', leafCount)].sort((a, b) => a.y - b.y)
}

function Reeds({ pal }: { pal: Palette }) {
  const clusters: ReadonlyArray<readonly [number, number]> = [[14, 596], [388, 590], [58, 628]]
  return (
    <g>
      {clusters.map(([x, y], ci) => (
        <g key={ci} transform={`translate(${x} ${y})`}>
          <g className="wp-sway wp-o-b" style={vars({ '--d': `${4 + ci}s`, animationDelay: `${-ci * 1.3}s` })}>
            {[-10, -3, 5, 11].map((dx, i) => {
              const h = 70 + ((i * 17 + ci * 11) % 40)
              return (
                <g key={dx}>
                  <path d={`M${dx} 0Q${dx + 3} ${-h / 2} ${dx + 1} ${-h}`} stroke={pal.leafB} strokeWidth="2.6" fill="none" strokeLinecap="round" />
                  {i % 2 === 0 && <rect x={dx - 2.2} y={-h - 6} width="5" height="17" rx="2.5" fill={darken(pal.trunk, 0.1)} />}
                </g>
              )
            })}
          </g>
        </g>
      ))}
    </g>
  )
}

export function Ground({ spec, pal, uid }: Spec<'ground'>) {
  const props = makeProps(spec)
  const leafCols = [pal.petal1, pal.petal2, pal.petal3]
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}gr`} gradientUnits="userSpaceOnUse" x1="0" y1={spec.crestY - 8} x2="0" y2={spec.crestY + 200}>
          <stop offset="0" stopColor={lighten(pal.near, 0.1)} />
          <stop offset="1" stopColor={pal.nearDark} />
        </linearGradient>
      </defs>
      <path d={ridgePath(spec.seed, spec.crestY, 6, 4)} fill={`url(#${uid}gr)`} />
      <path d={ridgePath(spec.seed + 3, spec.crestY + 46, 8, 3)} fill={lighten(pal.near, 0.18)} opacity="0.35" />
      <path d={ridgePath(spec.seed + 8, spec.crestY + 104, 8, 3)} fill={darken(pal.nearDark, 0.08)} opacity="0.28" />
      {props.map((p, i) => (
        <g key={i} transform={`translate(${f(p.x)} ${f(p.y)}) scale(${(p.i % 2 ? p.s : -p.s).toFixed(2)} ${p.s.toFixed(2)})`}>
          {p.kind === 'flower' && <Flower kind={spec.bloom} i={p.i} pal={pal} />}
          {p.kind === 'tuft' && <Tuft c={p.i % 3 === 0 ? pal.leafB : pal.nearDark} />}
          {p.kind === 'rock' && <Rock pal={pal} />}
          {p.kind === 'leaf' && <g transform={`rotate(${(p.i * 47) % 360})`}><Leaf c={at(leafCols, p.i)} /></g>}
        </g>
      ))}
      {spec.reeds && <Reeds pal={pal} />}
    </g>
  )
}
