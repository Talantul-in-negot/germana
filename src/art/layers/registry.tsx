// The layer-drawer registry. A zone layer names a drawer id (see LayerSpec in src/theme/scenes.ts);
// to add a NEW kind of layer: add its spec variant there, then one entry here. New zones need neither.
import { Ground } from './ground'
import { Bridge, Hills, Mountains, Trees } from './land'
import { Particles } from './particles'
import { Resident } from './resident'
import { Reef } from './sea'
import { Celestial, Clouds, Rays, Sky, Stars } from './sky'
import type { DrawerMap } from './types'
import { Water } from './water'

export const LAYER_REGISTRY: DrawerMap = {
  sky: { frame: 'svg', blurrable: false, Draw: Sky },
  stars: { frame: 'svg', blurrable: false, Draw: Stars },
  celestial: { frame: 'svg', blurrable: false, Draw: Celestial },
  clouds: { frame: 'svg', blurrable: false, Draw: Clouds },
  rays: { frame: 'svg', blurrable: false, Draw: Rays },
  mountains: { frame: 'svg', blurrable: true, Draw: Mountains },
  hills: { frame: 'svg', blurrable: true, Draw: Hills },
  trees: { frame: 'svg', blurrable: true, Draw: Trees },
  water: { frame: 'svg', blurrable: false, Draw: Water },
  bridge: { frame: 'svg', blurrable: true, Draw: Bridge },
  ground: { frame: 'svg', blurrable: false, Draw: Ground },
  reef: { frame: 'svg', blurrable: false, Draw: Reef },
  resident: { frame: 'html', blurrable: false, Draw: Resident },
  particles: { frame: 'svg', blurrable: false, Draw: Particles },
}
