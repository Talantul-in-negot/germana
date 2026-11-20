import { useMemo, type CSSProperties, type ReactNode } from 'react'
import type { LayerSpec, ZoneDef } from '../theme/scenes'
import { dimColor, dimPalette, dimStops } from './color'
import { LAYER_REGISTRY } from './layers/registry'
import { ART_H, ART_W, vars, type LayerCtx, type LayerDef } from './layers/types'
import { useArtMotion, useUid } from './motion'
import './art.css'

export type SceneVariant = 'full' | 'dim'

/** Max parallax travel in px, so a layer never reveals the edge of its art. */
const MAX_SHIFT = 140
/** In the dim variant the parallax is toned down. */
const DIM_PARALLAX = 0.5

export interface SceneProps {
  readonly zone: ZoneDef
  /** 'full' = lively, 'dim' = calmer / desaturated / blurred, for text panels. */
  readonly variant?: SceneVariant
  /** Scroll offset in px that drives the parallax (ignored with reduced motion). */
  readonly scrollY?: number
  /** Show the resident animal. Default: true for 'full', false for 'dim'. */
  readonly resident?: boolean
  readonly className?: string
  readonly style?: CSSProperties
  /** Content laid over the scene. */
  readonly children?: ReactNode
}

function shiftFor(speed: number, scrollY: number, factor: number): number {
  return Math.min(Math.max(scrollY, 0) * speed * factor, MAX_SHIFT)
}

/** The zone as seen through the variant: dimmed palette, sky and sun/moon. */
function useStyledZone(zone: ZoneDef, dim: boolean) {
  return useMemo(() => {
    if (!dim) return { zone, pal: zone.palette, sky: zone.sky }
    const d = zone.dim
    const c = zone.celestial
    const celestial = { ...c, color: dimColor(c.color, d.saturation, d.veilColor, d.veil), glow: dimColor(c.glow, d.saturation, d.veilColor, d.veil) }
    return { zone: { ...zone, celestial }, pal: dimPalette(zone.palette, d), sky: dimStops(zone.sky, d) }
  }, [zone, dim])
}

/**
 * Layered, parallax storybook scene built from the zone's layer data (back to front).
 * It fills its positioned parent (portrait art, anchored to the bottom).
 */
export function Scene({ zone, variant = 'full', scrollY = 0, resident, className, style, children }: SceneProps) {
  const uid = useUid()
  const motion = useArtMotion()
  const dim = variant === 'dim'
  const styled = useStyledZone(zone, dim)
  const parallax = motion === 'none' ? 0 : dim ? DIM_PARALLAX : 1
  const showResident = resident ?? !dim
  const base = { zone: styled.zone, pal: styled.pal, sky: styled.sky, dim, particleScale: dim ? zone.dim.particles : 1 }
  const blur = dim && motion === 'none' ? 0 : dim ? zone.dim.blur : 0
  const veil = zone.dim.veilColor

  return (
    <div
      className={`wp-art wp-scene${className ? ` ${className}` : ''}`}
      data-zone={zone.id} data-variant={variant} data-motion={motion}
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', isolation: 'isolate', background: styled.sky[0]?.[1], ...(dim ? vars({ '--slow': zone.dim.slow }) : null), ...style }}
    >
      {zone.layers.map((spec, i) => {
        if (spec.drawer === 'resident' && !showResident) return null
        const def = LAYER_REGISTRY[spec.drawer] as unknown as LayerDef
        const ctx: LayerCtx = { ...base, spec, uid: `${uid}${i}` }
        const shift = shiftFor(spec.speed, scrollY, parallax)
        return (
          <div key={`${spec.drawer}${i}`} data-layer={spec.drawer}
            style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              transform: shift ? `translate3d(0,${-shift.toFixed(1)}px,0)` : undefined,
              willChange: parallax && spec.speed > 0 ? 'transform' : undefined,
              filter: blur && def.blurrable ? `blur(${blur}px)` : undefined,
            }}>
            <LayerFrame def={def} ctx={ctx} />
          </div>
        )
      })}
      {dim && <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `linear-gradient(to bottom, ${veil}1f, ${veil}4d)` }} />}
      {children !== undefined && <div style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%' }}>{children}</div>}
    </div>
  )
}

function LayerFrame({ def, ctx }: { def: LayerDef; ctx: LayerCtx<LayerSpec> }) {
  const { Draw } = def
  if (def.frame === 'html') return <Draw {...ctx} />
  return (
    <svg viewBox={`0 0 ${ART_W} ${ART_H}`} preserveAspectRatio="xMidYMax slice" aria-hidden="true"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
      <Draw {...ctx} />
    </svg>
  )
}
