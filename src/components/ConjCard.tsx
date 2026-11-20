import { PERSONS, splitEnding } from '../core/conjugation'
import type { Word } from '../core/types'
import { t } from '../i18n'

/** Ending coloured, stem black; irregular forms (sein, haben …) are coloured as a whole. */
export function FormText({ inf, form, person, irregular, className = '' }: { inf: string; form: string; person: number; irregular: boolean; className?: string }) {
  const { stem, ending } = splitEnding(inf, form, person, irregular)
  return (
    <span className={className}>
      <span className="text-ink">{stem}</span>
      <span className="font-black text-brand">{ending}</span>
    </span>
  )
}

/** The notebook page: Vb. „haben" / Sg. ich · du · er/sie/es / Pl. wir · ihr · Sie/sie. */
export function ConjCard({ word, highlight }: { word: Word; highlight?: number }) {
  const present = word.verb?.present
  if (!present) return null
  const irregular = !!word.verb?.irregular
  const block = (label: string, persons: number[]) => (
    <div className="flex gap-3">
      <span className="w-8 shrink-0 text-sm font-black text-slate-500">{label}</span>
      <ul className="grid gap-1">
        {persons.map((p) => (
          <li key={p} className={`rounded-lg px-1 text-lg ${highlight === p ? 'bg-amber-100' : ''}`} data-testid={`card-row-${p}`}>
            <span className="inline-block w-24 text-slate-500">{PERSONS[p]}</span>
            <FormText inf={word.term} form={present[p] as string} person={p} irregular={irregular} className="font-bold" />
          </li>
        ))}
      </ul>
    </div>
  )
  return (
    <div className="card" data-testid="conj-card" aria-label={t('conj.card')}>
      <p className="mb-2 font-black">Vb. „{word.term}“</p>
      <div className="grid gap-2">
        {block(t('conj.sg'), [0, 1, 2])}
        {block(t('conj.pl'), [3, 4, 5])}
      </div>
    </div>
  )
}
