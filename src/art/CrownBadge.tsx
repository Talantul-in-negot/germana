import type { CSSProperties } from 'react'
import { useUid } from './motion'
import './art.css'

export type CrownTier = 'bronze' | 'silver' | 'gold'

interface TierColors { readonly light: string; readonly base: string; readonly dark: string; readonly center: string }

const TIERS: Record<CrownTier, TierColors> = {
  bronze: { light: '#f4cba6', base: '#d8955f', dark: '#a8683c', center: '#fbe3c9' },
  silver: { light: '#f6f8fc', base: '#c5cedd', dark: '#8f9db4', center: '#ffffff' },
  gold: { light: '#fff3b4', base: '#ffd25a', dark: '#d79a1f', center: '#fff8d6' },
}

const TIER_LABEL: Record<CrownTier, string> = { bronze: 'bronz', silver: 'argint', gold: 'aur' }
const PETAL_ANGLES = [0, 60, 120, 180, 240, 300] as const

export interface CrownBadgeProps {
  readonly tier: CrownTier
  readonly size?: number
  /** Greyed out (not earned yet). */
  readonly locked?: boolean
  readonly className?: string
  readonly style?: CSSProperties
}

/** A small flower badge with a tiny crown in its heart. */
export function CrownBadge({ tier, size = 44, locked = false, className, style }: CrownBadgeProps) {
  const u = useUid()
  const t = TIERS[tier]
  return (
    <svg
      viewBox="0 0 64 66" width={size} height={size * (66 / 64)} className={`wp-art${className ? ` ${className}` : ''}`}
      role="img" aria-label={`Coroană de ${TIER_LABEL[tier]}`}
      style={{ filter: locked ? 'grayscale(1) opacity(0.45)' : undefined, ...style }}
    >
      <defs>
        <radialGradient id={`${u}p`} cx="0.35" cy="0.3" r="0.85">
          <stop offset="0" stopColor={t.light} />
          <stop offset="1" stopColor={t.base} />
        </radialGradient>
      </defs>
      <g fill="#7ccb7a" stroke="#4e9e63" strokeWidth="1" strokeLinejoin="round">
        <path d="M32 50C20 52 11 59 11 64C23 64 31 58 32 50Z" />
        <path d="M32 50C44 52 53 59 53 64C41 64 33 58 32 50Z" />
      </g>
      <g fill={`url(#${u}p)`} stroke={t.dark} strokeWidth="1.2">
        {PETAL_ANGLES.map((a) => <circle key={a} cx="32" cy="18" r="10.5" transform={`rotate(${a} 32 33)`} />)}
      </g>
      <circle cx="32" cy="33" r="12.5" fill={t.center} stroke={t.dark} strokeWidth="1.2" />
      <path d="M24.5 38L25.5 27.5L29.2 32.5L32 25L34.8 32.5L38.5 27.5L39.5 38Z" fill={`url(#${u}p)`} stroke={t.dark} strokeWidth="1.3" strokeLinejoin="round" />
      <g fill={t.dark}><circle cx="25.5" cy="27" r="1.4" /><circle cx="32" cy="24.4" r="1.4" /><circle cx="38.5" cy="27" r="1.4" /></g>
      <ellipse cx="22" cy="13" rx="3.2" ry="1.7" fill="#fff" opacity="0.65" transform="rotate(-30 22 13)" />
      {tier === 'gold' && <path className="wp-spark" d="M54 8Q54 12 58 12Q54 12 54 16Q54 12 50 12Q54 12 54 8Z" fill="#ffd45a" stroke="#ffd45a" strokeWidth="1" strokeLinejoin="round" />}
    </svg>
  )
}
