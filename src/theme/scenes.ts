// Single source of truth for the illustrated zones ("scenes").
//
// A zone is pure DATA: palette tokens, sky gradient, sun/moon, an ordered list of layers
// (back -> front, each with a parallax speed) and a resident animal. Each layer names a
// drawer in the registry (src/art/layers/registry.tsx), so adding a zone that reuses existing
// drawers needs no component change. Art coordinate space is 400 x 640 (portrait).

export type AnimalKind =
  | 'fawn' | 'rabbit' | 'fox' | 'squirrel' | 'hedgehog'
  | 'bird' | 'duckling' | 'lion' | 'fish' | 'turtle'

export type ParticleKind = 'butterflies' | 'petals' | 'leaves' | 'fireflies' | 'bubbles' | 'motes'
export type TreeKind = 'pine' | 'round' | 'acacia' | 'orchard'
export type BloomKind = 'daisy' | 'tulip' | 'bell' | 'moon' | 'none'

/** [offset 0..1, colour] */
export type SkyStop = readonly [number, string]

export interface Palette {
  ink: string; cloud: string
  far: string; farSnow: string; mid: string; mid2: string; near: string; nearDark: string
  trunk: string; leafA: string; leafB: string; leafC: string
  water: string; waterDeep: string; rock: string
  petal1: string; petal2: string; petal3: string; glow: string
}
export type PaletteKey = keyof Palette

export interface Celestial {
  readonly kind: 'sun' | 'moon' | 'none'
  readonly x: number
  readonly y: number
  readonly r: number
  readonly color: string
  readonly glow: string
}

/** How a zone calms down when used behind text panels. */
export interface DimParams {
  /** 1 keeps colours, 0 is greyscale. */
  readonly saturation: number
  /** 0..1 strength of the veil colour blended over every palette colour. */
  readonly veil: number
  readonly veilColor: string
  /** CSS blur in px applied to the static (non-animated) layers only. */
  readonly blur: number
  /** Animation durations are multiplied by this (calmer = slower). */
  readonly slow: number
  /** Share of particles kept (0..1). */
  readonly particles: number
}

export type TreeItem = readonly [kind: TreeKind, x: number, y: number, scale: number, tone: 0 | 1 | 2]

interface LayerBase { readonly speed: number }

export type LayerSpec =
  | (LayerBase & { drawer: 'sky' })
  | (LayerBase & { drawer: 'stars'; count: number })
  | (LayerBase & { drawer: 'celestial' })
  | (LayerBase & { drawer: 'clouds'; count: number; minY: number; maxY: number; seed: number })
  | (LayerBase & { drawer: 'rays'; count: number })
  | (LayerBase & { drawer: 'mountains'; baseY: number; height: number; peaks: number; seed: number; fill: PaletteKey; snow?: boolean })
  | (LayerBase & { drawer: 'hills'; baseY: number; amp: number; bumps: number; seed: number; fill: PaletteKey; fill2: PaletteKey })
  | (LayerBase & { drawer: 'trees'; items: readonly TreeItem[] })
  | (LayerBase & { drawer: 'water'; shape: 'stream' | 'lake' | 'pond' | 'creek'; y: number; h: number })
  | (LayerBase & { drawer: 'bridge'; x: number; y: number; w: number })
  | (LayerBase & {
      drawer: 'ground'; crestY: number; seed: number; flowers: number; tufts: number; rocks: number
      bloom: BloomKind; leaves?: boolean; reeds?: boolean
    })
  | (LayerBase & { drawer: 'reef'; part: 'far' | 'mid' | 'near' })
  | (LayerBase & { drawer: 'resident'; x: number; bottom: number; size: number })
  | (LayerBase & { drawer: 'particles' })

export type LayerDrawerId = LayerSpec['drawer']

export interface ZoneDef {
  readonly id: string
  /** Romanian display name. */
  readonly name: string
  /** True for night/underwater scenes (callers may flip text colours). */
  readonly dark: boolean
  readonly palette: Palette
  readonly sky: readonly SkyStop[]
  readonly celestial: Celestial
  readonly layers: readonly LayerSpec[]
  readonly particles: ParticleKind
  readonly resident: AnimalKind
  readonly friend?: AnimalKind
  readonly dim: DimParams
}

export const MASCOT_NAME = 'Reh'

const dimDay: DimParams = { saturation: 0.55, veil: 0.32, veilColor: '#fff8ef', blur: 1.6, slow: 2, particles: 0.4 }
const dimNight: DimParams = { saturation: 0.6, veil: 0.3, veilColor: '#262a5e', blur: 1.6, slow: 2, particles: 0.5 }
const dimSea: DimParams = { saturation: 0.6, veil: 0.3, veilColor: '#e6f8fb', blur: 1.6, slow: 2, particles: 0.35 }

const SKY = { drawer: 'sky', speed: 0 } as const
const SUN = { drawer: 'celestial', speed: 0 } as const
const PARTICLES = { drawer: 'particles', speed: 0.36 } as const
/** The resident moves with the ground (speed ~0.25) so it stays planted while scrolling. */
const resident = (x: number, size = 92, speed = 0.25): LayerSpec => ({ drawer: 'resident', speed, x, bottom: 0.07, size })

export const ZONES: readonly ZoneDef[] = [
  {
    id: 'poiana', name: 'Poiana cu flori', dark: false, particles: 'butterflies', resident: 'rabbit', dim: dimDay,
    sky: [[0, '#9fd4f5'], [0.55, '#cdeafa'], [1, '#fff3d6']],
    celestial: { kind: 'sun', x: 320, y: 120, r: 30, color: '#fff2b0', glow: '#fff6d0' },
    palette: {
      ink: '#5a4a3a', cloud: '#ffffff', far: '#b9c6ee', farSnow: '#ffffff', mid: '#a9d8a0', mid2: '#8fcb8f',
      near: '#8fd17a', nearDark: '#5fb36a', trunk: '#a8795a', leafA: '#5cae6a', leafB: '#7ccb7a', leafC: '#a6e08a',
      water: '#8fd3ee', waterDeep: '#5fb5d8', rock: '#b9b3ae', petal1: '#ff9db5', petal2: '#ffe27a', petal3: '#ffffff', glow: '#fff2b0',
    },
    layers: [
      SKY, SUN,
      { drawer: 'clouds', speed: 0.02, count: 4, minY: 60, maxY: 230, seed: 4 },
      { drawer: 'mountains', speed: 0.05, baseY: 400, height: 130, peaks: 4, seed: 3, fill: 'far' },
      { drawer: 'hills', speed: 0.09, baseY: 412, amp: 16, bumps: 5, seed: 11, fill: 'mid', fill2: 'mid2' },
      { drawer: 'trees', speed: 0.12, items: [['round', 60, 440, 0.8, 1], ['pine', 118, 438, 0.7, 0], ['round', 300, 436, 0.9, 2], ['pine', 350, 440, 0.75, 1]] },
      { drawer: 'hills', speed: 0.16, baseY: 462, amp: 12, bumps: 4, seed: 5, fill: 'mid2', fill2: 'near' },
      { drawer: 'ground', speed: 0.24, crestY: 500, seed: 21, flowers: 34, tufts: 18, rocks: 3, bloom: 'daisy' },
      resident(0.72), PARTICLES,
    ],
  },
  {
    id: 'padure', name: 'Pădurea cu pârâu', dark: false, particles: 'motes', resident: 'fox', dim: dimDay,
    sky: [[0, '#b7e0d0'], [0.6, '#d9f0d6'], [1, '#f3f7c8']],
    celestial: { kind: 'sun', x: 290, y: 90, r: 22, color: '#fff8d0', glow: '#fffbe0' },
    palette: {
      ink: '#3d4a3a', cloud: '#f4fff4', far: '#9ccdb7', farSnow: '#e8f5ea', mid: '#7fbf8f', mid2: '#62ac7a',
      near: '#79c47e', nearDark: '#4e9e63', trunk: '#8c6a52', leafA: '#3f8f64', leafB: '#5fb07a', leafC: '#8fd18f',
      water: '#86d0dd', waterDeep: '#4fa9c0', rock: '#aeb8aa', petal1: '#ffb3c7', petal2: '#ffe48a', petal3: '#ffffff', glow: '#fff5c0',
    },
    layers: [
      SKY, SUN,
      { drawer: 'rays', speed: 0.01, count: 5 },
      { drawer: 'mountains', speed: 0.04, baseY: 392, height: 110, peaks: 3, seed: 8, fill: 'far' },
      { drawer: 'hills', speed: 0.07, baseY: 405, amp: 14, bumps: 4, seed: 9, fill: 'mid', fill2: 'mid2' },
      { drawer: 'trees', speed: 0.09, items: [['pine', 30, 430, 0.9, 0], ['pine', 85, 425, 1.1, 1], ['round', 150, 430, 0.9, 0], ['pine', 215, 424, 1, 0], ['round', 280, 430, 1, 1], ['pine', 340, 424, 1.15, 0], ['pine', 392, 430, 0.9, 1]] },
      { drawer: 'trees', speed: 0.12, items: [['round', 10, 462, 1.2, 2], ['pine', 130, 462, 1.1, 1], ['pine', 320, 462, 1.3, 2], ['round', 385, 462, 1.2, 0]] },
      { drawer: 'water', speed: 0.16, shape: 'stream', y: 470, h: 56 },
      { drawer: 'ground', speed: 0.24, crestY: 520, seed: 31, flowers: 18, tufts: 22, rocks: 5, bloom: 'bell' },
      resident(0.7), PARTICLES,
    ],
  },
  {
    id: 'valea', name: 'Valea cu podul de lemn', dark: false, particles: 'butterflies', resident: 'hedgehog', dim: dimDay,
    sky: [[0, '#8cc3ee'], [0.6, '#bfe0f6'], [1, '#eaf6ff']],
    celestial: { kind: 'sun', x: 90, y: 110, r: 24, color: '#fff6c0', glow: '#fffbe0' },
    palette: {
      ink: '#4a4a52', cloud: '#ffffff', far: '#a8b8e0', farSnow: '#ffffff', mid: '#8dbf9e', mid2: '#74ad8a',
      near: '#86c880', nearDark: '#5aa468', trunk: '#8a6a52', leafA: '#3f8a63', leafB: '#5aa878', leafC: '#86c98c',
      water: '#8fd0ee', waterDeep: '#5ba8d6', rock: '#a9aeb8', petal1: '#ffa6c0', petal2: '#ffe27a', petal3: '#ffffff', glow: '#fff6c0',
    },
    layers: [
      SKY, SUN,
      { drawer: 'clouds', speed: 0.02, count: 3, minY: 60, maxY: 190, seed: 9 },
      { drawer: 'mountains', speed: 0.04, baseY: 440, height: 270, peaks: 3, seed: 14, fill: 'far', snow: true },
      { drawer: 'mountains', speed: 0.07, baseY: 450, height: 150, peaks: 4, seed: 6, fill: 'mid' },
      { drawer: 'hills', speed: 0.1, baseY: 450, amp: 12, bumps: 5, seed: 12, fill: 'mid2', fill2: 'near' },
      { drawer: 'trees', speed: 0.12, items: [['pine', 40, 470, 1, 0], ['pine', 82, 474, 0.8, 1], ['pine', 335, 470, 1.1, 0], ['pine', 378, 474, 0.85, 1]] },
      { drawer: 'water', speed: 0.15, shape: 'creek', y: 478, h: 44 },
      { drawer: 'bridge', speed: 0.17, x: 200, y: 484, w: 170 },
      { drawer: 'ground', speed: 0.24, crestY: 524, seed: 41, flowers: 26, tufts: 16, rocks: 4, bloom: 'daisy' },
      resident(0.74), PARTICLES,
    ],
  },
  {
    id: 'lac', name: 'Lacul la apus', dark: false, particles: 'petals', resident: 'duckling', dim: dimDay,
    sky: [[0, '#9a8fd0'], [0.35, '#f3a6b8'], [0.7, '#ffcf9a'], [1, '#ffe9b8']],
    celestial: { kind: 'sun', x: 200, y: 346, r: 40, color: '#fff0c2', glow: '#ffd59a' },
    palette: {
      ink: '#4a3a50', cloud: '#ffd9d2', far: '#9d8fc4', farSnow: '#f6e2f0', mid: '#8b8fc0', mid2: '#7a86b4',
      near: '#86b58a', nearDark: '#5f9376', trunk: '#7a5a56', leafA: '#5f8f7a', leafB: '#7fb08c', leafC: '#a6cf98',
      water: '#f2b5b8', waterDeep: '#9a8cc8', rock: '#a9a0b4', petal1: '#ffb0c8', petal2: '#ffe0a0', petal3: '#ffffff', glow: '#ffd9a0',
    },
    layers: [
      SKY, SUN,
      { drawer: 'clouds', speed: 0.02, count: 4, minY: 70, maxY: 250, seed: 17 },
      { drawer: 'mountains', speed: 0.04, baseY: 396, height: 64, peaks: 5, seed: 23, fill: 'far' },
      { drawer: 'hills', speed: 0.07, baseY: 398, amp: 8, bumps: 6, seed: 2, fill: 'mid', fill2: 'mid2' },
      { drawer: 'trees', speed: 0.09, items: [['pine', 30, 404, 0.55, 0], ['round', 66, 404, 0.5, 1], ['pine', 345, 404, 0.6, 0], ['round', 380, 404, 0.5, 1]] },
      { drawer: 'water', speed: 0.14, shape: 'lake', y: 394, h: 130 },
      { drawer: 'ground', speed: 0.24, crestY: 548, seed: 51, flowers: 12, tufts: 14, rocks: 3, bloom: 'bell', reeds: true },
      resident(0.68), PARTICLES,
    ],
  },
  {
    id: 'livada', name: 'Livada de toamnă', dark: false, particles: 'leaves', resident: 'squirrel', dim: dimDay,
    sky: [[0, '#bfd8ee'], [0.5, '#fde2c4'], [1, '#fff0d0']],
    celestial: { kind: 'sun', x: 90, y: 140, r: 28, color: '#fff0c0', glow: '#ffe8b0' },
    palette: {
      ink: '#5a3a30', cloud: '#fff6ee', far: '#d5b7c4', farSnow: '#fbeef0', mid: '#e5b574', mid2: '#d89a58',
      near: '#b9c46a', nearDark: '#8fa656', trunk: '#8c5e48', leafA: '#e0793f', leafB: '#f0a64a', leafC: '#e6c44f',
      water: '#9fcfe0', waterDeep: '#6aa7c4', rock: '#b5a899', petal1: '#e8673f', petal2: '#f4b24a', petal3: '#c2d05a', glow: '#ffe0a0',
    },
    layers: [
      SKY, SUN,
      { drawer: 'clouds', speed: 0.02, count: 3, minY: 60, maxY: 210, seed: 31 },
      { drawer: 'mountains', speed: 0.04, baseY: 404, height: 110, peaks: 4, seed: 5, fill: 'far' },
      { drawer: 'hills', speed: 0.08, baseY: 414, amp: 14, bumps: 5, seed: 19, fill: 'mid', fill2: 'mid2' },
      { drawer: 'trees', speed: 0.11, items: [['orchard', 50, 444, 0.8, 0], ['orchard', 130, 440, 0.7, 1], ['orchard', 270, 442, 0.75, 2], ['orchard', 350, 444, 0.85, 0]] },
      { drawer: 'hills', speed: 0.15, baseY: 468, amp: 10, bumps: 4, seed: 27, fill: 'mid2', fill2: 'near' },
      { drawer: 'trees', speed: 0.18, items: [['orchard', 22, 505, 1.2, 1], ['orchard', 372, 505, 1.3, 2]] },
      { drawer: 'ground', speed: 0.24, crestY: 510, seed: 61, flowers: 0, tufts: 20, rocks: 3, bloom: 'none', leaves: true },
      resident(0.66), PARTICLES,
    ],
  },
  {
    id: 'noapte', name: 'Poiana înstelată', dark: true, particles: 'fireflies', resident: 'bird', dim: dimNight,
    sky: [[0, '#1f2455'], [0.5, '#3b3f86'], [1, '#7a6fb8']],
    celestial: { kind: 'moon', x: 290, y: 120, r: 28, color: '#fff6d8', glow: '#c9c8ff' },
    palette: {
      ink: '#171a3f', cloud: '#6f74b8', far: '#4a4f98', farSnow: '#9fa6e0', mid: '#3d5a8c', mid2: '#35507f',
      near: '#3e7f7c', nearDark: '#2c5f66', trunk: '#3a3158', leafA: '#2d5a6e', leafB: '#3b7384', leafC: '#5a9a98',
      water: '#4f6fb0', waterDeep: '#2f4580', rock: '#5a608f', petal1: '#ffd6f0', petal2: '#fff1a8', petal3: '#c9d4ff', glow: '#fff6c0',
    },
    layers: [
      SKY,
      { drawer: 'stars', speed: 0, count: 46 },
      SUN,
      { drawer: 'clouds', speed: 0.02, count: 3, minY: 80, maxY: 240, seed: 41 },
      { drawer: 'mountains', speed: 0.04, baseY: 410, height: 140, peaks: 4, seed: 33, fill: 'far' },
      { drawer: 'hills', speed: 0.08, baseY: 420, amp: 14, bumps: 5, seed: 7, fill: 'mid', fill2: 'mid2' },
      { drawer: 'trees', speed: 0.11, items: [['pine', 40, 446, 1, 0], ['pine', 95, 442, 0.8, 1], ['round', 310, 442, 0.9, 1], ['pine', 360, 446, 1.1, 0]] },
      { drawer: 'hills', speed: 0.16, baseY: 466, amp: 10, bumps: 4, seed: 15, fill: 'mid2', fill2: 'near' },
      { drawer: 'ground', speed: 0.24, crestY: 502, seed: 71, flowers: 22, tufts: 16, rocks: 3, bloom: 'moon' },
      resident(0.7, 84), PARTICLES,
    ],
  },
  {
    id: 'savana', name: 'Savana aurie', dark: false, particles: 'motes', resident: 'lion', dim: dimDay,
    sky: [[0, '#8fb8e8'], [0.4, '#f7c5b0'], [0.8, '#ffd98f'], [1, '#ffeaa8']],
    celestial: { kind: 'sun', x: 200, y: 392, r: 58, color: '#fff3c4', glow: '#ffe0a0' },
    palette: {
      ink: '#6a4a38', cloud: '#ffe3d0', far: '#e7b79a', farSnow: '#fff0e0', mid: '#e8c478', mid2: '#d9ad5e',
      near: '#e3c168', nearDark: '#c49a4c', trunk: '#7c5a44', leafA: '#6e8e50', leafB: '#8fae60', leafC: '#b3c875',
      water: '#9fd6e0', waterDeep: '#6bb3c8', rock: '#c2a58c', petal1: '#ff9a7a', petal2: '#ffd77a', petal3: '#ffffff', glow: '#ffe0a0',
    },
    layers: [
      SKY, SUN,
      { drawer: 'clouds', speed: 0.02, count: 4, minY: 70, maxY: 240, seed: 12 },
      { drawer: 'mountains', speed: 0.04, baseY: 412, height: 70, peaks: 5, seed: 29, fill: 'far' },
      { drawer: 'hills', speed: 0.07, baseY: 410, amp: 7, bumps: 5, seed: 13, fill: 'mid', fill2: 'mid2' },
      { drawer: 'trees', speed: 0.1, items: [['acacia', 60, 440, 0.9, 0], ['acacia', 150, 436, 0.6, 1], ['acacia', 300, 438, 0.7, 1], ['acacia', 355, 442, 1, 0]] },
      { drawer: 'ground', speed: 0.2, crestY: 456, seed: 81, flowers: 0, tufts: 26, rocks: 4, bloom: 'none' },
      { drawer: 'water', speed: 0.26, shape: 'pond', y: 548, h: 66 },
      resident(0.74, 96, 0.26), PARTICLES,
    ],
  },
  {
    id: 'recif', name: 'Recifele de corali', dark: true, particles: 'bubbles', resident: 'fish', friend: 'turtle', dim: dimSea,
    sky: [[0, '#bfeaf0'], [0.4, '#7fd0dc'], [1, '#3f9fc0']],
    celestial: { kind: 'none', x: 0, y: 0, r: 0, color: '#ffffff', glow: '#ffffff' },
    palette: {
      ink: '#2a5a78', cloud: '#ffffff', far: '#6fb8d0', farSnow: '#a8e0e8', mid: '#5fa8c4', mid2: '#4a94b8',
      near: '#f0dcae', nearDark: '#d8bf8a', trunk: '#c58a7a', leafA: '#2f9a78', leafB: '#4fbf8f', leafC: '#8fe0a8',
      water: '#8fe0ea', waterDeep: '#3f9fc0', rock: '#9fb0bd', petal1: '#ff8f7a', petal2: '#ffd36a', petal3: '#c89aea', glow: '#e8fbff',
    },
    layers: [
      SKY,
      { drawer: 'rays', speed: 0.02, count: 6 },
      { drawer: 'reef', speed: 0.05, part: 'far' },
      { drawer: 'reef', speed: 0.1, part: 'mid' },
      { drawer: 'reef', speed: 0.2, part: 'near' },
      { drawer: 'resident', speed: 0.22, x: 0.64, bottom: 0.2, size: 100 }, PARTICLES,
    ],
  },
]

/** Zone for an arbitrary (course / lesson / level) index; cycles in both directions. */
export function zoneForIndex(i: number): ZoneDef {
  const n = ZONES.length
  return ZONES[((Math.trunc(i) % n) + n) % n] as ZoneDef
}
