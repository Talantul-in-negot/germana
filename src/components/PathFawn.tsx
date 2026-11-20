import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Animal, useDocumentHidden, useReducedMotion } from '../art'
import { FAWN_WALK_MS, nodeOffset } from '../theme/path'
import { MASCOT_NAME } from '../theme/scenes'

/** Vertical distance between two nodes on the path, in px. */
export const PATH_ITEM_H = 184
/** Distance from the top of a path item to the top of its node. */
export const NODE_TOP = 56
const FAWN_SIZE = 72
/** Feet sit at ~92% of the animal box; this lifts the box so the feet touch the node's top edge. */
const FEET_LIFT = 66

const posFor = (i: number) => ({ x: nodeOffset(i) - FAWN_SIZE / 2, y: i * PATH_ITEM_H + NODE_TOP - FEET_LIFT })

function readStored(key: string, count: number): number | null {
  try {
    const n = Number(window.localStorage.getItem(key))
    return Number.isInteger(n) && n >= 0 && n < count ? n : null
  } catch {
    return null // storage can be unavailable (private mode): the fawn then simply starts on the target
  }
}

function writeStored(key: string, n: number): void {
  try {
    window.localStorage.setItem(key, String(n))
  } catch {
    /* non-essential UI memory only; ignoring a failed write is safe */
  }
}

/**
 * The fawn stands on `index` (first non-completed unit). When `index` changes while the path is mounted, or since the
 * last visit (remembered in localStorage), it walks there in ~600 ms; with reduced motion it jumps instantly.
 */
export function PathFawn({ index, count, storageKey }: { index: number; count: number; storageKey: string }) {
  const reduced = useReducedMotion()
  const hidden = useDocumentHidden()
  const [start] = useState(() => readStored(storageKey, count) ?? index)
  const [walking, setWalking] = useState(false)
  useEffect(() => writeStored(storageKey, index), [storageKey, index])
  const instant = reduced || hidden
  return (
    <motion.div
      className="pointer-events-none absolute left-1/2 top-0 z-10" data-testid="path-fawn" data-index={index}
      initial={posFor(start)} animate={posFor(index)}
      transition={instant ? { duration: 0 } : { duration: FAWN_WALK_MS / 1000, ease: 'easeInOut' }}
      onAnimationStart={() => setWalking(!instant)} onAnimationComplete={() => setWalking(false)}
    >
      <Animal kind="fawn" mood={walking ? 'happy' : 'idle'} size={FAWN_SIZE} label={MASCOT_NAME} />
    </motion.div>
  )
}
