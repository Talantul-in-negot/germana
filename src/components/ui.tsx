import { AnimatePresence, motion } from 'framer-motion'
import type { ReactNode } from 'react'
import type { Crown } from '../core/gamification'
import { Animal, CrownBadge, type AnimalMood, type CrownTier } from '../art'
import { MASCOT_NAME } from '../theme/scenes'
import { t } from '../i18n'

export const LEVEL_COLORS = ['bg-stone-300', 'bg-sky-300', 'bg-teal-300', 'bg-green-400', 'bg-amber-300', 'bg-rose-400'] as const
export const LEVEL_TEXT = ['text-stone-800', 'text-sky-900', 'text-teal-900', 'text-green-900', 'text-amber-900', 'text-rose-950'] as const

type MascotMood = 'happy' | 'sad' | 'cheer'
const MASCOT_MOOD: Record<MascotMood, AnimalMood> = { happy: 'idle', sad: 'encourage', cheer: 'celebrate' }

/** The app mascot: the fawn. */
export function Mascot({ size = 72, mood = 'happy' }: { size?: number; mood?: MascotMood }) {
  return <Animal kind="fawn" mood={MASCOT_MOOD[mood]} size={size} label={MASCOT_NAME} />
}

export function ProgressRing({ value, goal, size = 44, label }: { value: number; goal: number; size?: number; label?: ReactNode }) {
  const r = (size - 8) / 2
  const c = 2 * Math.PI * r
  const frac = Math.min(1, goal > 0 ? value / goal : 0)
  const done = frac >= 1
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#eadfcf" strokeWidth="6" fill="none" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} strokeWidth="6" fill="none" strokeLinecap="round"
          stroke={done ? '#2e7d32' : '#2b7560'} strokeDasharray={c}
          initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - frac) }} transition={{ duration: 0.8 }}
        />
      </svg>
      <span className="absolute text-[11px] font-black text-ink">{label ?? (done ? '✓' : value)}</span>
    </div>
  )
}

export function LevelBadge({ level }: { level: number }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-extrabold ${LEVEL_COLORS[level]} ${LEVEL_TEXT[level]}`}>
      {level} · {t(`level.${level as 0 | 1 | 2 | 3 | 4 | 5}`)}
    </span>
  )
}

export function StrengthBar({ value }: { value: number }) {
  const color = value >= 70 ? 'bg-green-500' : value >= 40 ? 'bg-amber-300' : 'bg-rose-400'
  return (
    <div className="h-3 w-full rounded-full bg-slate-200" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
    </div>
  )
}

/** Distribution of words across levels 0–5. */
export function LevelBar({ counts }: { counts: number[] }) {
  const total = counts.reduce((a, b) => a + b, 0) || 1
  return (
    <div>
      <div className="flex h-5 w-full overflow-hidden rounded-full bg-slate-200" aria-label="levels">
        {counts.map((c, i) => (c > 0 ? <div key={i} className={LEVEL_COLORS[i]} style={{ width: `${(c / total) * 100}%` }} title={`${i}: ${c}`} /> : null))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-bold">
        {counts.map((c, i) => (
          <span key={i} className="inline-flex items-center gap-1">
            <i className={`inline-block h-3 w-3 rounded-full ${LEVEL_COLORS[i]}`} />
            {t(`level.${i as 0 | 1 | 2 | 3 | 4 | 5}`)} {c}
          </span>
        ))}
      </div>
    </div>
  )
}

const TIER_NAMES: readonly CrownTier[] = ['bronze', 'silver', 'gold']
/** Three flower badges; earned ones in colour, the rest greyed out. */
export function Crowns({ tier, size = 16 }: { tier: Crown; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={t(`home.crown.${tier}`)}>
      {TIER_NAMES.map((name, i) => (
        <span key={name} aria-hidden="true" className="inline-flex"><CrownBadge tier={name} size={size} locked={i >= tier} /></span>
      ))}
    </span>
  )
}

export function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-40 flex items-end justify-center bg-[#3a2a1e]/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            className="w-full max-w-lg rounded-t-[2rem] bg-paper p-5 pb-8 shadow-soft" initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }} onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function Confirm({
  open, text, onYes, onNo, danger = true,
}: { open: boolean; text: string; onYes: () => void; onNo: () => void; danger?: boolean }) {
  return (
    <Sheet open={open} onClose={onNo}>
      <p className="mb-4 text-lg font-bold">{text}</p>
      <div className="flex gap-3">
        <button className="btn btn-ghost flex-1" onClick={onNo}>{t('common.cancel')}</button>
        <button className={`btn flex-1 ${danger ? 'btn-bad' : 'btn-primary'}`} onClick={onYes} data-testid="confirm-yes">{t('common.confirm')}</button>
      </div>
    </Sheet>
  )
}

export function Toggle({ checked, onChange, label, help, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; help?: string; disabled?: boolean }) {
  return (
    <label className={`flex min-h-12 items-center justify-between gap-3 py-2 ${disabled ? 'opacity-50' : ''}`}>
      <span>
        <span className="block font-extrabold">{label}</span>
        {help && <span className="block text-sm text-slate-500">{help}</span>}
      </span>
      <input type="checkbox" role="switch" className="h-6 w-11 shrink-0 cursor-pointer appearance-none rounded-full bg-slate-400 transition checked:bg-brand relative before:absolute before:left-0.5 before:top-0.5 before:h-5 before:w-5 before:rounded-full before:bg-white before:transition checked:before:translate-x-5"
        checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
    </label>
  )
}
