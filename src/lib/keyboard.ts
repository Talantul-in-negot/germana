import { useSyncExternalStore } from 'react'

/** The visual viewport shrinks below this share of the layout viewport when the on-screen keyboard is up. */
export const KEYBOARD_RATIO = 0.75

/** Pure: does the visual viewport height suggest an open on-screen keyboard? */
export function isKeyboardOpen(visualHeight: number, layoutHeight: number): boolean {
  return layoutHeight > 0 && visualHeight / layoutHeight < KEYBOARD_RATIO
}

function subscribe(cb: () => void): () => void {
  const vv = typeof window === 'undefined' ? undefined : window.visualViewport
  if (!vv) return () => {}
  vv.addEventListener('resize', cb)
  return () => vv.removeEventListener('resize', cb)
}

const snapshot = (): boolean => typeof window !== 'undefined' && !!window.visualViewport && isKeyboardOpen(window.visualViewport.height, window.innerHeight)

/** True while the on-screen keyboard is (probably) open. */
export function useKeyboardOpen(): boolean {
  return useSyncExternalStore(subscribe, snapshot, () => false)
}
