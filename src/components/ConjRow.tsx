import { useEffect, useRef, useState } from 'react'
import { PERSONS, checkForm, type ConjItem } from '../core/conjugation'
import type { Word } from '../core/types'
import { t } from '../i18n'
import { ConjCard, FormText } from './ConjCard'
import { KeyBar } from './Term'
import type { Verdict } from './useReactionMood'

/**
 * One conjugation row: a dropdown (stages 1-2) or a typing field (stage 3).
 * Feedback appears right after the row, with the ending highlighted; `onDone` fires on "next".
 */
export function ConjRow({
  item, verb, showCard, onDone, onVerdict,
}: { item: ConjItem; verb: Word; showCard?: boolean; onDone: (correct: boolean, given: string) => void; onVerdict?: (v: Verdict) => void }) {
  const [value, setValue] = useState('')
  const [result, setResult] = useState<boolean | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const typing = item.kind === 'typing'
  const irregular = !!verb.verb?.irregular

  useEffect(() => {
    onVerdict?.(result === null ? null : result ? 'correct' : 'wrong')
  }, [result, onVerdict])

  useEffect(() => {
    setValue('')
    setResult(null)
    if (typing) inputRef.current?.focus()
  }, [item.id, typing])

  const check = () => {
    if (result !== null || !value.trim()) return
    setResult(checkForm(value, item.answer))
  }
  const next = () => {
    if (result !== null) onDone(result, value)
  }

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.repeat) return
      if (result !== null) onDone(result, value)
      else if (value.trim()) setResult(checkForm(value, item.answer))
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  })

  const select = (
    <select className="mx-1 inline-block rounded-xl border-2 border-slate-300 bg-white px-2 py-1 text-lg font-bold" value={value} disabled={result !== null}
      onChange={(e) => setValue(e.target.value)} data-testid="conj-select" aria-label={PERSONS[item.person]}>
      <option value="">{t('ex.pickForm')}</option>
      {(item.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  )
  const input = (
    <input ref={inputRef} className="input mt-2" value={value} disabled={result !== null} autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false}
      placeholder={t('ex.typeHere')} onChange={(e) => setValue(e.target.value)} data-testid="answer-input" />
  )

  return (
    <div data-testid="conj-row">
      {showCard && <div className="mb-4"><ConjCard word={verb} highlight={item.person} /></div>}
      {item.kind === 'sentenceAll' ? (
        <p className="text-2xl font-bold leading-[3rem]" data-testid="prompt">{item.before}{select}{item.after}</p>
      ) : typing ? (
        <>
          <p className="mb-2 text-2xl font-black" data-testid="prompt">{item.prompt}</p>
          <KeyBar inputRef={inputRef} value={value} onChange={setValue} disabled={result !== null} />
          {input}
        </>
      ) : (
        <p className="text-2xl font-black" data-testid="prompt">{PERSONS[item.person]} {select}</p>
      )}

      <div className={`mt-6 rounded-2xl p-4 ${result === null ? 'bg-transparent' : result ? 'bg-good-soft' : 'bg-bad-soft'}`} data-testid="conj-feedback">
        {result === null ? (
          <button className="btn btn-primary w-full" disabled={!value.trim()} onClick={check} data-testid="check">{t('conj.check')}</button>
        ) : (
          <>
            <p className={`text-xl font-black ${result ? 'text-green-800' : 'text-red-800'}`}>{result ? t('lesson.correct') : t('lesson.wrong')}</p>
            {!result && <p className="font-bold text-red-900">{t('lesson.tryAgain')}</p>}
            {!result && (
              <p className="font-bold text-red-900" data-testid="person-note">{t('note.conj', { p: PERSONS[item.person] ?? '', e: item.answer, g: value })}</p>
            )}
            <p className="text-lg" data-testid="correct-form">
              {PERSONS[item.person]} <FormText inf={verb.term} form={item.answer} person={item.person} irregular={irregular} className="font-bold" />
            </p>
            <button className={`btn mt-3 w-full ${result ? 'btn-good' : 'btn-bad'}`} onClick={next} autoFocus data-testid="continue">{t('lesson.continue')}</button>
          </>
        )}
      </div>
    </div>
  )
}
