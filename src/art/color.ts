// Tiny colour helpers for the illustration system (hex #rrggbb only).
import type { DimParams, Palette, SkyStop } from '../theme/scenes'

type Rgb = readonly [number, number, number]

const clamp = (n: number, lo = 0, hi = 255): number => Math.min(hi, Math.max(lo, n))

export function toRgb(hex: string): Rgb {
  const h = hex.replace('#', '')
  const n = Number.parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function toHex([r, g, b]: Rgb): string {
  return '#' + [r, g, b].map((v) => Math.round(clamp(v)).toString(16).padStart(2, '0')).join('')
}

/** Linear blend: t=0 -> a, t=1 -> b. */
export function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = toRgb(a)
  const [br, bg, bb] = toRgb(b)
  return toHex([ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t])
}

export const lighten = (c: string, t: number): string => mix(c, '#ffffff', t)
export const darken = (c: string, t: number): string => mix(c, '#000000', t)

/** Desaturate (keep = 1 leaves the colour, 0 is pure grey) then veil towards a colour. */
export function dimColor(c: string, keep: number, veilColor: string, veil: number): string {
  const [r, g, b] = toRgb(c)
  const grey = 0.299 * r + 0.587 * g + 0.114 * b
  const desat = toHex([grey + (r - grey) * keep, grey + (g - grey) * keep, grey + (b - grey) * keep])
  return mix(desat, veilColor, veil)
}

export function dimPalette(p: Palette, d: DimParams): Palette {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(p)) out[k] = dimColor(v, d.saturation, d.veilColor, d.veil)
  return out as unknown as Palette
}

export function dimStops(stops: readonly SkyStop[], d: DimParams): SkyStop[] {
  return stops.map(([o, c]) => [o, dimColor(c, d.saturation, d.veilColor, d.veil)] as const)
}
