import { AnimatePresence, motion } from 'framer-motion'
import type { ReactNode } from 'react'
import type { Crown } from '../core/gamification'
import { t } from '../i18n'

export const LEVEL_COLORS = ['bg-slate-300', 'bg-sky-400', 'bg-teal-400', 'bg-green-500', 'bg-amber-400', 'bg-violet-600'] as const
export const LEVEL_TEXT = ['text-slate-700', 'text-sky-800', 'text-teal-800', 'text-green-800', 'text-amber-800', 'text-violet-800'] as const

export function Mascot({ size = 72, mood = 'happy' }: { size?: number; mood?: 'happy' | 'sad' | 'cheer' }) {
  const mouth = mood === 'sad' ? 'M232 330q30 -20 60 0' : 'M232 316q30 28 60 0'
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" role="img" aria-label="Lexi">
      <path d="M150 400c-30-80 0-170 70-210 20-12 44-18 66-18 70 0 114 56 104 132-8 62-56 106-120 106-40 0-100-2-120-10z" fill="#fde68a" />
      <path d="M180 190l-30-90 90 44zM340 190l30-90-90 44z" fill="#fbbf24" />
      <circle cx="226" cy="276" r="22" fill="#1f1235" />
      <circle cx="304" cy="276" r="22" fill="#1f1235" />
      <circle cx="233" cy="268" r="7" fill="#fff" />
      <circle cx="311" cy="268" r="7" fill="#fff" />
      <path d={mouth} stroke="#1f1235" strokeWidth="12" fill="none" strokeLinecap="round" />
      {mood === 'cheer' && <path d="M120 120l20 40M400 110l-24 40M256 70v44" stroke="#f59e0b" strokeWidth="14" strokeLinecap="round" />}
    </svg>
  )
}

export function ProgressRing({ value, goal, size = 44, label }: { value: number; goal: number; size?: number; label?: ReactNode }) {
  const r = (size - 8) / 2
  const c = 2 * Math.PI * r
  const frac = Math.min(1, goal > 0 ? value / goal : 0)
  const done = frac >= 1
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#e9e5f5" strokeWidth="6" fill="none" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} strokeWidth="6" fill="none" strokeLinecap="round"
          stroke={done ? '#16a34a' : '#7c3aed'} strokeDasharray={c}
          initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - frac) }} transition={{ duration: 0.8 }}
        />
      </svg>
      <span className="absolute text-[11px] font-black">{label ?? (done ? '✓' : value)}</span>
    </div>
  )
}

export function LevelBadge({ level }: { level: number }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-extrabold ${LEVEL_COLORS[level]} ${level >= 4 ? 'text-white' : LEVEL_TEXT[level]}`}>
      {level} · {t(`level.${level as 0 | 1 | 2 | 3 | 4 | 5}`)}
    </span>
  )
}

export function StrengthBar({ value }: { value: number }) {
  const color = value >= 70 ? 'bg-green-500' : value >= 40 ? 'bg-amber-400' : 'bg-red-400'
  return (
    <div className="h-2.5 w-full rounded-full bg-slate-200" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
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

const CROWN_COLORS = ['#cd7f32', '#c0c0c0', '#fbbf24']
export function Crowns({ tier, size = 16 }: { tier: Crown; size?: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={t(`home.crown.${tier}`)}>
      {[0, 1, 2].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24">
          <path d="M3 18l-1-11 5 4 5-8 5 8 5-4-1 11z" fill={i < tier ? (CROWN_COLORS[i] as string) : '#e2e8f0'} stroke={i < tier ? '#1f1235' : '#cbd5e1'} strokeWidth="1" />
        </svg>
      ))}
    </span>
  )
}

export function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            className="w-full max-w-lg rounded-t-3xl bg-white p-5 pb-8" initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }}
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
    <label className={`flex items-center justify-between gap-3 py-2 ${disabled ? 'opacity-50' : ''}`}>
      <span>
        <span className="block font-extrabold">{label}</span>
        {help && <span className="block text-sm text-slate-500">{help}</span>}
      </span>
      <input type="checkbox" role="switch" className="h-6 w-11 shrink-0 cursor-pointer appearance-none rounded-full bg-slate-300 transition checked:bg-brand relative before:absolute before:left-0.5 before:top-0.5 before:h-5 before:w-5 before:rounded-full before:bg-white before:transition checked:before:translate-x-5"
        checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
    </label>
  )
}
