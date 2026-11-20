import { darken, lighten } from '../color'
import { seeded } from '../shapes'
import type { LayerSpec, Palette } from '../../theme/scenes'
import { vars, type LayerCtx } from './types'

type Spec<K extends LayerSpec['drawer']> = LayerCtx<Extract<LayerSpec, { drawer: K }>>

function Glints({ xs, y, w = 16, pal, d = 5 }: { xs: readonly number[]; y: number; w?: number; pal: Palette; d?: number }) {
  return (
    <g fill="#fff">
      {xs.map((x, i) => (
        <rect key={x} className="wp-shimmer" x={x} y={y + (i % 3) * 7} width={w - (i % 2) * 5} height="2.2" rx="1.1"
          style={vars({ '--d': `${d + i * 0.7}s`, animationDelay: `${-i * 1.3}s`, fill: lighten(pal.water, 0.7) })} />
      ))}
    </g>
  )
}

/** A winding ribbon of water (stream / creek) that widens towards the viewer. */
function Ribbon({ y, h, pal, uid, wiggle }: { y: number; h: number; pal: Palette; uid: string; wiggle: number }) {
  const top = `M-60 ${y + 6}C60 ${y - wiggle} 140 ${y + wiggle} 240 ${y + 2}S400 ${y - wiggle * 0.4} 460 ${y + 4}`
  const bottom = `L460 ${y + h}C340 ${y + h + wiggle} 120 ${y + h - wiggle} -60 ${y + h + 4}Z`
  const rnd = seeded(3)
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}wt`} gradientUnits="userSpaceOnUse" x1="0" y1={y - 6} x2="0" y2={y + h + 6}>
          <stop offset="0" stopColor={lighten(pal.water, 0.25)} />
          <stop offset="1" stopColor={pal.waterDeep} />
        </linearGradient>
      </defs>
      <path d={`${top}${bottom}`} fill={darken(pal.nearDark, 0.1)} transform="translate(0 4)" opacity="0.6" />
      <path d={`${top}${bottom}`} fill={`url(#${uid}wt)`} />
      <Glints xs={[30, 110, 190, 270, 340].map((x) => x + rnd() * 20)} y={y + h * 0.35} pal={pal} />
      <g fill={pal.rock}>
        <ellipse cx="96" cy={y + h * 0.7} rx="11" ry="5" />
        <ellipse cx="318" cy={y + h * 0.5} rx="9" ry="4.5" />
      </g>
      <g fill="#fff" opacity="0.4">
        <ellipse cx="96" cy={y + h * 0.7 - 2} rx="6" ry="1.6" />
        <ellipse cx="318" cy={y + h * 0.5 - 2} rx="5" ry="1.4" />
      </g>
    </g>
  )
}

/** Wide lake with the sun's reflection column (sun position comes from the zone). */
function Lake({ y, h, pal, uid, sunX, sunColor }: { y: number; h: number; pal: Palette; uid: string; sunX: number; sunColor: string }) {
  const strips = [8, 22, 38, 56, 78, 104].map((dy, i) => ({ dy, w: 30 + i * 13 }))
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}lk`} gradientUnits="userSpaceOnUse" x1="0" y1={y} x2="0" y2={y + h}>
          <stop offset="0" stopColor={pal.water} />
          <stop offset="1" stopColor={pal.waterDeep} />
        </linearGradient>
      </defs>
      <rect x="-60" y={y} width="520" height={h + 60} fill={`url(#${uid}lk)`} />
      {strips.map((s, i) => (
        <rect key={s.dy} className="wp-shimmer" x={sunX - s.w / 2} y={y + s.dy} width={s.w} height={3 + i * 0.5} rx="2"
          style={vars({ '--d': `${4 + i * 0.6}s`, animationDelay: `${-i * 0.9}s`, fill: sunColor })} />
      ))}
      <g fill="none" stroke="#fff" strokeWidth="1.4" opacity="0.35" strokeLinecap="round">
        <path d="M40 440Q60 436 80 440" /><path d="M300 470Q326 464 352 470" /><path d="M120 500Q150 494 180 500" />
      </g>
    </g>
  )
}

/** Watering hole: rocky rim, sky-coloured water, reflections. */
function Pond({ y, h, pal, uid }: { y: number; h: number; pal: Palette; uid: string }) {
  const cx = 138
  const rx = 118
  const ry = h / 2
  const cy = y + ry
  const stones: ReadonlyArray<readonly [number, number, number]> = [[-104, 10, 9], [-70, 26, 8], [-20, 30, 10], [40, 28, 9], [96, 14, 8], [112, -6, 7], [-110, -8, 7]]
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}pd`} gradientUnits="userSpaceOnUse" x1="0" y1={y} x2="0" y2={y + h}>
          <stop offset="0" stopColor={lighten(pal.water, 0.3)} />
          <stop offset="1" stopColor={pal.waterDeep} />
        </linearGradient>
      </defs>
      <ellipse cx={cx} cy={cy + 3} rx={rx + 7} ry={ry + 5} fill={darken(pal.near, 0.18)} />
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${uid}pd)`} />
      <ellipse cx={cx - 30} cy={cy - ry * 0.35} rx={rx * 0.55} ry={ry * 0.22} fill="#fff" opacity="0.25" />
      <Glints xs={[cx - 70, cx - 10, cx + 40]} y={cy - 2} pal={pal} w={22} d={4} />
      <g fill={pal.rock}>
        {stones.map(([dx, dy, r]) => <ellipse key={dx} cx={cx + dx} cy={cy + dy * (ry / 30) + 2} rx={r} ry={r * 0.6} />)}
      </g>
    </g>
  )
}

export function Water({ spec, pal, uid, zone }: Spec<'water'>) {
  switch (spec.shape) {
    case 'stream': return <Ribbon y={spec.y} h={spec.h} pal={pal} uid={uid} wiggle={12} />
    case 'creek': return <Ribbon y={spec.y} h={spec.h} pal={pal} uid={uid} wiggle={6} />
    case 'lake': return <Lake y={spec.y} h={spec.h} pal={pal} uid={uid} sunX={zone.celestial.x} sunColor={zone.celestial.glow} />
    case 'pond': return <Pond y={spec.y} h={spec.h} pal={pal} uid={uid} />
  }
}
