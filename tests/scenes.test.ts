import { describe, expect, it } from 'vitest'
import { MASCOT_NAME, ZONES, zoneForIndex } from '../src/theme/scenes'
import { dimPalette, mix } from '../src/art/color'
import { seeded } from '../src/art/shapes'

describe('scene zones config', () => {
  it('defines the eight zones in the agreed order with their resident animals', () => {
    expect(ZONES.map((z) => z.resident)).toEqual(['rabbit', 'fox', 'hedgehog', 'duckling', 'squirrel', 'bird', 'lion', 'fish'])
  })

  it('gives the reef a turtle friend', () => {
    expect(ZONES[7]?.friend).toBe('turtle')
  })

  it('cycles zoneForIndex past the end and for negative indices', () => {
    expect(zoneForIndex(8).id).toBe(ZONES[0]?.id)
    expect(zoneForIndex(-1).id).toBe(ZONES[7]?.id)
  })

  it('names the mascot Reh', () => {
    expect(MASCOT_NAME).toBe('Reh')
  })

  it('orders layers back to front with non-decreasing parallax speed', () => {
    for (const z of ZONES) {
      const speeds = z.layers.map((l) => l.speed)
      expect(speeds, z.id).toEqual([...speeds].sort((a, b) => a - b))
    }
  })

  it('starts every zone with the sky layer and has unique ids and Romanian names', () => {
    expect(ZONES.every((z) => z.layers[0]?.drawer === 'sky')).toBe(true)
    expect(new Set(ZONES.map((z) => z.id)).size).toBe(ZONES.length)
    expect(ZONES.every((z) => z.name.length > 2)).toBe(true)
  })
})

describe('art helpers', () => {
  it('mixes two hex colours', () => {
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080')
  })

  it('desaturates and veils a palette towards the veil colour', () => {
    const z = ZONES[0]!
    const dim = dimPalette(z.palette, z.dim)
    expect(dim.near).not.toBe(z.palette.near)
    expect(Object.keys(dim)).toEqual(Object.keys(z.palette))
  })

  it('produces a deterministic seeded sequence in [0,1)', () => {
    const a = seeded(7)
    const b = seeded(7)
    const xs = [a(), a(), a()]
    expect(xs).toEqual([b(), b(), b()])
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true)
  })
})
