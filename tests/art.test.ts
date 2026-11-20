import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { createElement, Fragment } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ANIMAL_KINDS, ANIMAL_MOODS, Animal } from '../src/art/Animal'
import { Celebration } from '../src/art/Celebration'
import { CrownBadge } from '../src/art/CrownBadge'
import { LAYER_REGISTRY } from '../src/art/layers/registry'
import { Scene } from '../src/art/Scene'
import { ZONES } from '../src/theme/scenes'

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

describe('layer registry', () => {
  it('has a drawer for every layer id used by every zone', () => {
    const ids = new Set(ZONES.flatMap((z) => z.layers.map((l) => l.drawer)))
    for (const id of ids) expect(LAYER_REGISTRY[id], id).toBeDefined()
  })

  it('uses valid #rrggbb colours across all palettes and sky stops', () => {
    const hex = /^#[0-9a-f]{6}$/i
    for (const z of ZONES) {
      for (const [k, v] of Object.entries(z.palette)) expect(v, `${z.id}.${k}`).toMatch(hex)
      for (const [, c] of z.sky) expect(c, `${z.id} sky`).toMatch(hex)
    }
  })
})

describe('Scene', () => {
  it('renders every zone in both variants with all its layers (resident hidden when dim)', () => {
    for (const z of ZONES) {
      const full = html(createElement(Scene, { zone: z }))
      for (const l of z.layers) expect(full, `${z.id}/${l.drawer}`).toContain(`data-layer="${l.drawer}"`)
      const dim = html(createElement(Scene, { zone: z, variant: 'dim' }))
      expect(dim).toContain('data-variant="dim"')
      expect(dim).not.toContain('data-layer="resident"')
    }
  })

  it('moves faster layers further with scrollY and leaves the sky still', () => {
    const z = ZONES[0]!
    const out = html(createElement(Scene, { zone: z, scrollY: 200 }))
    const sky = out.match(/data-layer="sky" style="([^"]*)"/)?.[1] ?? ''
    const ground = out.match(/data-layer="ground" style="([^"]*)"/)?.[1] ?? ''
    expect(sky).not.toContain('translate3d')
    expect(ground).toContain('translate3d(0,-48px,0)')
  })

  it('never emits duplicate gradient ids when two scenes share a document', () => {
    const out = html(createElement(Fragment, null, createElement(Scene, { zone: ZONES[0]! }), createElement(Scene, { zone: ZONES[0]! })))
    const ids = [...out.matchAll(/ id="([^"]+)"/g)].map((m) => m[1])
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('keeps the dim variant desaturated compared with full', () => {
    const z = ZONES[0]!
    expect(html(createElement(Scene, { zone: z, variant: 'dim' }))).not.toEqual(html(createElement(Scene, { zone: z })))
  })
})

describe('Animal', () => {
  it('renders all ten animals in all four moods', () => {
    expect(ANIMAL_KINDS).toHaveLength(10)
    for (const kind of ANIMAL_KINDS) {
      for (const mood of ANIMAL_MOODS) {
        const out = html(createElement(Animal, { kind, mood }))
        expect(out, `${kind}/${mood}`).toContain(`data-mood="${mood}"`)
      }
    }
  })

  it('shows sparkles only when celebrating', () => {
    expect(html(createElement(Animal, { kind: 'fawn', mood: 'celebrate' }))).toContain('wp-spark')
    expect(html(createElement(Animal, { kind: 'fawn', mood: 'idle' }))).not.toContain('wp-spark')
  })

  it('exposes an accessible name only when a label is given', () => {
    expect(html(createElement(Animal, { kind: 'fox', label: 'Vulpe' }))).toContain('aria-label="Vulpe"')
    expect(html(createElement(Animal, { kind: 'fox' }))).toContain('aria-hidden="true"')
  })

  it('gives the lion a leaf collar and the fish teal body with coral dots', () => {
    expect(html(createElement(Animal, { kind: 'lion' }))).toContain('#8fa592')
    const fish = html(createElement(Animal, { kind: 'fish' }))
    expect(fish).toContain('#ff8f78')
    expect(fish).not.toContain('#ff7f00')
  })
})

describe('CrownBadge and Celebration', () => {
  it('labels each crown tier in Romanian', () => {
    expect(html(createElement(CrownBadge, { tier: 'gold' }))).toContain('Coroană de aur')
    expect(html(createElement(CrownBadge, { tier: 'bronze' }))).toContain('bronz')
    expect(html(createElement(CrownBadge, { tier: 'silver' }))).toContain('argint')
  })

  it('renders the requested number of pieces and nothing when inactive', () => {
    expect(html(createElement(Celebration, { count: 12 })).match(/wp-confetti/g)).toHaveLength(12)
    expect(html(createElement(Celebration, { active: false }))).toBe('')
  })
})

describe('illustration source budget', () => {
  it('stays far below 400 KB', () => {
    const sum = (dir: string): number =>
      readdirSync(dir).reduce((n, f) => {
        const p = join(dir, f)
        return n + (statSync(p).isDirectory() ? sum(p) : statSync(p).size)
      }, 0)
    const total = sum('src/art') + readFileSync('src/theme/scenes.ts').length
    expect(total).toBeLessThan(400 * 1024)
  })
})
