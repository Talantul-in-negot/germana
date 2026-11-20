import type { ReactNode } from 'react'

export type Mood = 'idle' | 'happy' | 'encourage' | 'celebrate'

export interface DrawProps {
  readonly mood: Mood
  /** Per-instance id prefix for gradients. */
  readonly u: string
}

export const EYE = '#2b1d1f'
export const BLUSH = '#ff9aa8'

/** Soft top-left lit gradient used for bodies. */
export function Grad({ id, light, base }: { id: string; light: string; base: string }) {
  return (
    <radialGradient id={id} cx="0.36" cy="0.28" r="0.85">
      <stop offset="0" stopColor={light} />
      <stop offset="1" stopColor={base} />
    </radialGradient>
  )
}

/** Two big glossy eyes that blink together; celebrate shows happy arcs instead. */
export function Eyes({ cx, cy, gap, r, mood }: { cx: number; cy: number; gap: number; r: number; mood: Mood }) {
  const xs = [cx - gap / 2, cx + gap / 2]
  if (mood === 'celebrate') {
    return (
      <g fill="none" stroke={EYE} strokeWidth={r * 0.42} strokeLinecap="round">
        {xs.map((x) => <path key={x} d={`M${x - r * 0.85} ${cy + r * 0.35}Q${x} ${cy - r * 1.2} ${x + r * 0.85} ${cy + r * 0.35}`} />)}
      </g>
    )
  }
  return (
    <g className="wp-blink wp-o-c">
      {xs.map((x) => (
        <g key={x}>
          <ellipse cx={x} cy={cy} rx={r} ry={r * 1.12} fill={EYE} />
          <circle cx={x - r * 0.32} cy={cy - r * 0.38} r={r * 0.4} fill="#fff" />
          <circle cx={x + r * 0.34} cy={cy + r * 0.38} r={r * 0.18} fill="#fff" opacity="0.9" />
        </g>
      ))}
    </g>
  )
}

/** Smile (idle / encourage) or open happy mouth (happy / celebrate). */
export function Mouth({ cx, cy, w, mood }: { cx: number; cy: number; w: number; mood: Mood }) {
  if (mood === 'happy' || mood === 'celebrate') {
    return (
      <g>
        <path d={`M${cx - w} ${cy}Q${cx} ${cy + w * 1.9} ${cx + w} ${cy}Z`} fill="#7a2f38" stroke={EYE} strokeWidth="1.2" strokeLinejoin="round" />
        <path d={`M${cx - w * 0.5} ${cy + w * 0.72}Q${cx} ${cy + w * 0.4} ${cx + w * 0.5} ${cy + w * 0.72}Q${cx} ${cy + w * 1.05} ${cx - w * 0.5} ${cy + w * 0.72}Z`} fill="#ff8fa0" />
      </g>
    )
  }
  return <path d={`M${cx - w} ${cy}Q${cx} ${cy + w * 0.95} ${cx + w} ${cy}`} fill="none" stroke={EYE} strokeWidth="1.8" strokeLinecap="round" />
}

export function Cheeks({ cx, cy, gap, r = 4.2 }: { cx: number; cy: number; gap: number; r?: number }) {
  return (
    <g fill={BLUSH} opacity="0.5">
      <ellipse cx={cx - gap / 2} cy={cy} rx={r} ry={r * 0.7} />
      <ellipse cx={cx + gap / 2} cy={cy} rx={r} ry={r * 0.7} />
    </g>
  )
}

/** Wrapper for an ear: `place` positions/rotates it, the inner group carries the twitch / perk-up animation. */
export function Ear({ x, y, rot, side, children }: { x: number; y: number; rot: number; side: 'l' | 'r'; children: ReactNode }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <g className={`wp-ear wp-ear-${side}`}>{children}</g>
    </g>
  )
}

export function Sparkles({ mood }: { mood: Mood }) {
  if (mood !== 'celebrate') return null
  const star = (x: number, y: number, s: number, d: number) => (
    <g key={x} transform={`translate(${x} ${y}) scale(${s})`}>
      <path className="wp-spark" style={{ animationDelay: `${d}s` }}
        d="M0 -6Q0 0 6 0Q0 0 0 6Q0 0 -6 0Q0 0 0 -6Z" fill="#ffd45a" stroke="#ffd45a" strokeWidth="1.5" strokeLinejoin="round" />
    </g>
  )
  return <g>{star(14, 22, 1.1, 0)}{star(106, 16, 1.4, -0.4)}{star(112, 52, 0.9, -0.8)}{star(8, 56, 0.8, -0.2)}</g>
}
