import { describe, expect, it } from 'vitest'
import { fawnTargetIndex, nodeOffset, zoneForDeck, zoneIndexForDeck } from '../src/theme/path'
import { ZONES } from '../src/theme/scenes'

const IDS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']

describe('deck -> zone mapping', () => {
  it('maps the first deck to the first zone and follows the list order', () => {
    expect(zoneIndexForDeck(IDS, 'a')).toBe(0)
    expect(zoneIndexForDeck(IDS, 'f')).toBe(5)
  })
  it('uses zones 7 and 8 only once there are more than six lessons', () => {
    expect(zoneForDeck(IDS.slice(0, 6), 'f').id).toBe(ZONES[5]?.id)
    expect(zoneForDeck(IDS, 'g').id).toBe(ZONES[6]?.id)
  })
  it('cycles after the last zone', () => {
    const many = Array.from({ length: ZONES.length + 2 }, (_, i) => `d${i}`)
    expect(zoneIndexForDeck(many, `d${ZONES.length + 1}`)).toBe(1)
  })
  it('falls back to the first zone for an unknown or missing deck', () => {
    expect(zoneIndexForDeck(IDS, 'zzz')).toBe(0)
    expect(zoneIndexForDeck(IDS, undefined)).toBe(0)
  })
})

describe('fawnTargetIndex', () => {
  it('stands on the first unit that is not completed', () => {
    expect(fawnTargetIndex([true, true, false, false])).toBe(2)
  })
  it('stays on the first unit when nothing is done', () => {
    expect(fawnTargetIndex([false, false])).toBe(0)
  })
  it('rests on the last unit when everything is completed', () => {
    expect(fawnTargetIndex([true, true, true])).toBe(2)
  })
  it('is 0 for an empty path', () => {
    expect(fawnTargetIndex([])).toBe(0)
  })
})

describe('nodeOffset', () => {
  it('zig-zags within the path width', () => {
    for (let i = 0; i < 40; i++) expect(Math.abs(nodeOffset(i))).toBeLessThanOrEqual(70)
  })
})
