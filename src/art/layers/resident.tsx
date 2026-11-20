import { ANIMAL_LABEL, Animal } from '../Animal'
import type { LayerSpec } from '../../theme/scenes'
import type { LayerCtx } from './types'

type Spec = LayerCtx<Extract<LayerSpec, { drawer: 'resident' }>>

/** HTML layer: the zone's resident animal (and optional friend) standing on the ground. */
export function Resident({ spec, zone }: Spec) {
  const { x, bottom, size } = spec
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {zone.friend && (
        <div style={{ position: 'absolute', left: `${x * 100}%`, bottom: `${Math.max(0.05, bottom - 0.05) * 100}%`, transform: `translateX(-${size * 1.3}px)` }}>
          <Animal kind={zone.friend} size={size * 0.85} label={ANIMAL_LABEL[zone.friend]} />
        </div>
      )}
      <div style={{ position: 'absolute', left: `${x * 100}%`, bottom: `${bottom * 100}%`, transform: 'translateX(-50%)' }}>
        <Animal kind={zone.resident} size={size} label={ANIMAL_LABEL[zone.resident]} />
      </div>
    </div>
  )
}
