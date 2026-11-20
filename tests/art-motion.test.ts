// @vitest-environment jsdom
import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Scene } from '../src/art/Scene'
import { ZONES } from '../src/theme/scenes'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | undefined
let host: HTMLElement | undefined

function stubReducedMotion(reduced: boolean): void {
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: reduced && q.includes('reduce'), media: q, addEventListener: () => {}, removeEventListener: () => {},
  }))
}

function mount(el: Parameters<Root['render']>[0]): HTMLElement {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root!.render(el))
  return host
}

afterEach(() => {
  act(() => root?.unmount())
  host?.remove()
  vi.unstubAllGlobals()
  Object.defineProperty(document, 'hidden', { configurable: true, value: false })
})

describe('motion preferences', () => {
  it('goes static with no parallax under prefers-reduced-motion', () => {
    stubReducedMotion(true)
    const el = mount(createElement(Scene, { zone: ZONES[0]!, scrollY: 300 }))
    const scene = el.querySelector('.wp-scene')!
    expect(scene.getAttribute('data-motion')).toBe('none')
    const ground = el.querySelector('[data-layer="ground"]') as HTMLElement
    expect(ground.style.transform).toBe('')
  })

  it('applies parallax and runs when motion is allowed', () => {
    stubReducedMotion(false)
    const el = mount(createElement(Scene, { zone: ZONES[0]!, scrollY: 300 }))
    expect(el.querySelector('.wp-scene')!.getAttribute('data-motion')).toBe('full')
    expect((el.querySelector('[data-layer="ground"]') as HTMLElement).style.transform).toContain('translate3d')
  })

  it('pauses animations while the document is hidden', () => {
    stubReducedMotion(false)
    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    const el = mount(createElement(Scene, { zone: ZONES[0]! }))
    expect(el.querySelector('.wp-scene')!.getAttribute('data-motion')).toBe('paused')
  })
})
