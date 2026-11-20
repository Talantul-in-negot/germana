import { useRef, type ReactNode } from 'react'
import type { Gender } from '../core/types'
import { splitArticle } from '../core/german'
import { useProfile } from '../data/profile-context'
import { t } from '../i18n'
import type { NumPart } from '../core/numbers'

export const GENDER_TEXT: Record<Gender, string> = { der: 'text-blue-600', die: 'text-red-600', das: 'text-green-700' }
export const GENDER_BG: Record<Gender, string> = { der: 'bg-blue-100 border-blue-400 text-blue-800', die: 'bg-red-100 border-red-400 text-red-800', das: 'bg-green-100 border-green-400 text-green-800' }

/** Gender colour toggle from the profile settings (default on). */
export function useGenderColors(): boolean {
  const { profile } = useProfile()
  return profile.settings.genderColors !== false
}

/** Renders a German term; the article is coloured by gender (der blue, die red, das green). */
export function Term({ text, className = '' }: { text: string; className?: string }) {
  const colors = useGenderColors()
  const { article, rest } = splitArticle(text)
  if (!article || !colors) return <span className={className}>{text}</span>
  return (
    <span className={className}>
      <span className={`font-black ${GENDER_TEXT[article]}`}>{article}</span> {rest}
    </span>
  )
}

/** ein + und + zwanzig, colour-coded (units sky, "und" grey, tens amber). */
export function Breakdown({ parts }: { parts: NumPart[] }) {
  const cls = { unit: 'text-sky-700', und: 'text-slate-500', ten: 'text-amber-700', whole: '' } as const
  return (
    <p className="font-black" aria-label={t('feedback.breakdown')}>
      {parts.map((p, i) => (
        <span key={i}>
          {i > 0 && <span className="text-slate-400"> + </span>}
          <span className={cls[p.kind]}>{p.text}</span>
        </span>
      ))}
    </p>
  )
}

const KEYS = ['ä', 'ö', 'ü', 'ß', 'Ä', 'Ö', 'Ü']

/** On-screen umlaut keys, shown above every typing input. Inserts at the cursor. */
export function KeyBar({ inputRef, value, onChange, disabled }: {
  inputRef: React.RefObject<HTMLInputElement | null>
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}) {
  const insert = (ch: string) => {
    const el = inputRef.current
    const start = el?.selectionStart ?? value.length
    const end = el?.selectionEnd ?? value.length
    const next = value.slice(0, start) + ch + value.slice(end)
    onChange(next)
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(start + 1, start + 1)
    })
  }
  return (
    <div className="mb-2 grid grid-cols-4 gap-1.5 min-[420px]:grid-cols-7" role="group" aria-label={t('ex.keybar')}>
      {KEYS.map((k) => (
        <button key={k} type="button" disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={() => insert(k)}
          className="h-12 min-w-12 rounded-2xl border-b-4 border-slate-300 bg-white px-2 text-lg font-black active:translate-y-0.5" data-testid={`key-${k}`}>
          {k}
        </button>
      ))}
    </div>
  )
}

export function useInputRef() {
  return useRef<HTMLInputElement>(null)
}

export function Row({ children }: { children: ReactNode }) {
  return <div className="flex items-center gap-2">{children}</div>
}
