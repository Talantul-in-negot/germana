// Deterministic geometry helpers: seeded randomness, smooth ridges, mountain silhouettes.

/** mulberry32: tiny deterministic PRNG returning floats in [0, 1). */
export function seeded(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const f = (n: number): string => String(Math.round(n * 10) / 10)

/** Smooth rolling ridge filled down to `bottom` (SVG path). Extends past both side edges. */
export function ridgePath(seed: number, baseY: number, amp: number, bumps: number, bottom = 900): string {
  const rnd = seeded(seed)
  const x0 = -60
  const x1 = 460
  const step = (x1 - x0) / bumps
  const ys = Array.from({ length: bumps + 1 }, () => baseY + (rnd() - 0.5) * 2 * amp)
  let d = `M${f(x0)} ${f(ys[0] ?? baseY)}`
  for (let i = 1; i <= bumps; i++) {
    const px = x0 + (i - 1) * step
    const cx = px + step / 2
    const y0 = ys[i - 1] ?? baseY
    const y1 = ys[i] ?? baseY
    d += `C${f(cx)} ${f(y0)} ${f(cx)} ${f(y1)} ${f(px + step)} ${f(y1)}`
  }
  return `${d}L${f(x1)} ${bottom}L${f(x0)} ${bottom}Z`
}

export interface Peak {
  readonly x: number
  readonly top: number
  readonly half: number
}

export function makePeaks(seed: number, count: number, baseY: number, height: number): Peak[] {
  const rnd = seeded(seed)
  const span = 520 / count
  return Array.from({ length: count }, (_, i) => ({
    x: -60 + span * (i + 0.5) + (rnd() - 0.5) * span * 0.5,
    top: baseY - height * (0.55 + rnd() * 0.45),
    half: span * (0.75 + rnd() * 0.45),
  }))
}

/** Closed silhouette through all peaks; draw with a same-coloured round-joined stroke to soften the tips. */
export function mountainPath(peaks: readonly Peak[], baseY: number, bottom = 900): string {
  let d = `M-80 ${bottom}L-80 ${baseY}`
  for (const p of peaks) d += `L${f(p.x - p.half)} ${baseY}L${f(p.x)} ${f(p.top)}L${f(p.x + p.half)} ${baseY}`
  return `${d}L480 ${baseY}L480 ${bottom}Z`
}

/** Jagged snow cap near the peak: depth in 0..1 of the way down the slope. */
export function snowPath(p: Peak, baseY: number, depth = 0.34): string {
  const dy = (baseY - p.top) * depth
  const dx = p.half * depth
  const y = p.top + dy
  return (
    `M${f(p.x)} ${f(p.top)}L${f(p.x + dx)} ${f(y)}` +
    `L${f(p.x + dx * 0.45)} ${f(y - dy * 0.22)}L${f(p.x)} ${f(y + dy * 0.12)}` +
    `L${f(p.x - dx * 0.5)} ${f(y - dy * 0.25)}L${f(p.x - dx)} ${f(y)}Z`
  )
}
