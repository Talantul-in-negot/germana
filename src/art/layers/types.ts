import type { CSSProperties, ReactElement } from 'react'
import type { LayerSpec, Palette, SkyStop, ZoneDef } from '../../theme/scenes'

/** What every layer drawer receives. `pal` / `sky` are already dimmed for the dim variant. */
export interface LayerCtx<S extends LayerSpec = LayerSpec> {
  readonly spec: S
  readonly zone: ZoneDef
  readonly pal: Palette
  readonly sky: readonly SkyStop[]
  /** Per-Scene-instance id prefix for gradients etc. */
  readonly uid: string
  readonly dim: boolean
  /** Number of particles to render, scaled for the dim variant. */
  readonly particleScale: number
}

export type LayerDrawer<S extends LayerSpec = LayerSpec> = (ctx: LayerCtx<S>) => ReactElement

export type LayerDef<S extends LayerSpec = LayerSpec> = {
  /** 'svg' drawers return SVG content in the 400 x 640 art space; 'html' drawers return a positioned element. */
  readonly frame: 'svg' | 'html'
  /** Static layers may be blurred in the dim variant (animated ones are never filtered). */
  readonly blurrable: boolean
  readonly Draw: LayerDrawer<S>
}

export type DrawerMap = { [K in LayerSpec['drawer']]: LayerDef<Extract<LayerSpec, { drawer: K }>> }

/** Typed access to custom properties used by the CSS keyframes. */
export function vars(v: Record<string, string | number>): CSSProperties {
  return v as unknown as CSSProperties
}

export const ART_W = 400
export const ART_H = 640

/** Safe array read under noUncheckedIndexedAccess. */
export function at<T>(arr: readonly T[], i: number): T {
  return arr[((i % arr.length) + arr.length) % arr.length] as T
}
