import { useEffect, useState, type RefObject } from 'react'
import { Scene, useReducedMotion } from '../art'
import type { ZoneDef } from '../theme/scenes'

/** Scroll offset of the nearest `<main>` scroller above `ref`; always 0 under reduced motion. */
function useScrollY(anchor: RefObject<HTMLElement | null>): number {
  const reduced = useReducedMotion()
  const [y, setY] = useState(0)
  useEffect(() => {
    const scroller = reduced ? null : anchor.current?.closest('main')
    if (!scroller) return
    let raf = 0
    const read = () => {
      raf = 0
      setY(scroller.scrollTop)
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(read)
    }
    scroller.addEventListener('scroll', onScroll, { passive: true })
    read()
    return () => {
      scroller.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [anchor, reduced])
  return reduced ? 0 : y
}

/**
 * Fixed full scene behind the learning path. Owns the scroll state, so scrolling re-renders only the scenery,
 * never the path itself. Never takes part in layout and never captures taps.
 */
export function PathBackdrop({ zone, anchor }: { zone: ZoneDef; anchor: RefObject<HTMLElement | null> }) {
  const scrollY = useScrollY(anchor)
  return (
    <div className="scene-fixed" aria-hidden="true" data-testid="path-scene" data-zone={zone.id}>
      <Scene zone={zone} scrollY={scrollY} resident={false} />
    </div>
  )
}
