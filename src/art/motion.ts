// Motion preferences for the illustration system.
import { useId, useSyncExternalStore } from 'react'

export type MotionState = 'full' | 'paused' | 'none'

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)'

function subscribeReduced(cb: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}
  const mq = window.matchMedia(REDUCED_QUERY)
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}

const reducedNow = (): boolean => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(REDUCED_QUERY).matches

/** True when the user asked the OS for reduced motion. Updates live. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReduced, reducedNow, () => false)
}

function subscribeHidden(cb: () => void): () => void {
  if (typeof document === 'undefined') return () => {}
  document.addEventListener('visibilitychange', cb)
  return () => document.removeEventListener('visibilitychange', cb)
}

/** True while the tab/app is in the background (animations should pause). */
export function useDocumentHidden(): boolean {
  return useSyncExternalStore(subscribeHidden, () => typeof document !== 'undefined' && document.hidden, () => false)
}

/** 'none' = static (reduced motion), 'paused' = tab hidden, 'full' = run. Put it on `data-motion`. */
export function useArtMotion(): MotionState {
  const reduced = useReducedMotion()
  const hidden = useDocumentHidden()
  return reduced ? 'none' : hidden ? 'paused' : 'full'
}

/** Per-instance id prefix safe inside `url(#...)` (React's useId contains colons). */
export function useUid(): string {
  return 'wp' + useId().replace(/[^a-zA-Z0-9]/g, '')
}
