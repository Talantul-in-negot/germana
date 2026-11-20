/**
 * One component per exercise family. Each reports an `Outcome` through either
 *  - `onReady(check)`: the learner has an answer ready; pressing "Check" calls `check()`, or
 *  - `onSubmit(outcome)`: the exercise is complete on its own (match pairs, article buttons).
 */
import { motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  evaluateArticle, evaluateChoice, evaluateMatch, evaluateSentence, evaluateSeparable, evaluateSpoken, evaluateTyped,
  evaluateSequence, evaluateVerbForms, type ArticleExercise, type ChoiceExercise, type Exercise, type MatchExercise, type Outcome,
  type SentenceExercise, type SeparableExercise, type SequenceExercise, type TypeExercise, type VerbFormsExercise,
} from '../../core/exercises'
import { shuffle } from '../../core/id'
import type { Gender } from '../../core/types'
import { t, type Key } from '../../i18n'
import { listen, sttSupported, type SpeechLang } from '../../lib/speech'
import { GENDER_BG, KeyBar, Term, useGenderColors } from '../Term'

export interface ExerciseProps<E extends Exercise = Exercise> {
  ex: E
  locked: boolean
  /** result of the check, shown by highlighting options */
  outcome: Outcome | null
  onReady: (check: (() => Outcome) | null) => void
  onSubmit: (o: Outcome) => void
  say: (text: string) => void
  /** read `before`, beep for the blank, read `after` */
  sayParts?: (before: string, after: string) => void
  lang?: SpeechLang
}

function SpeakerButton({ onClick, big }: { onClick: () => void; big?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-label={t('ex.listen')}
      className={`inline-flex items-center justify-center rounded-2xl bg-sky-100 text-sky-700 border-b-4 border-sky-300 active:translate-y-0.5 ${big ? 'h-24 w-24 text-5xl' : 'h-12 w-12 text-2xl'}`}>
      🔊
    </button>
  )
}

function Title({ type }: { type: Exercise['type'] }) {
  return <h2 className="mb-4 text-xl font-black text-slate-600">{t(`ex.${type}` as Key)}</h2>
}

const LISTEN_CHOICE = new Set(['listen_choose', 'context_listen', 'listen_ro'])
const TERM_OPTIONS = new Set(['mc_l1_l2', 'listen_choose', 'fill_blank', 'collective'])

export function ChoiceView({ ex, locked, outcome, onReady, say, sayParts }: ExerciseProps<ChoiceExercise>) {
  const [sel, setSel] = useState<number | null>(null)
  const isListen = LISTEN_CHOICE.has(ex.type) || ex.type === 'verb_listen_blank'
  const playIt = (): void => (ex.speakParts && sayParts ? sayParts(ex.speakParts[0], ex.speakParts[1]) : say(ex.speak ?? ''))

  useEffect(() => {
    onReady(sel === null ? null : () => evaluateChoice(ex, sel))
  }, [sel, ex, onReady])

  useEffect(() => {
    if (isListen && (ex.speak || ex.speakParts)) playIt()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ex.id])

  useEffect(() => {
    if (locked) return
    const h = (e: KeyboardEvent) => {
      const n = Number(e.key)
      if (n >= 1 && n <= ex.options.length) setSel(n - 1)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [locked, ex.options.length])

  return (
    <div>
      <Title type={ex.type} />
      <div className="mb-5 flex items-center gap-3">
        {isListen ? (
          <SpeakerButton big={ex.type === 'listen_choose' || ex.type === 'listen_ro'} onClick={playIt} />
        ) : (
          <>
            {ex.speak && ex.type === 'mc_l2_l1' && <SpeakerButton onClick={() => say(ex.speak ?? '')} />}
            {ex.prompt && (
              <p className={ex.type === 'context_choice' ? 'text-base font-bold text-slate-500' : 'text-3xl font-black'} data-testid="prompt">
                {ex.type === 'mc_l2_l1' || ex.type === 'plural_choice' || ex.type === 'num_word_to_digits' || ex.type === 'month_season' ? <Term text={ex.prompt} /> : ex.prompt}
              </p>
            )}
          </>
        )}
      </div>
      {ex.sentence && <p className="mb-5 rounded-2xl bg-brand-soft p-4 text-xl font-bold" data-testid="sentence">{ex.sentence}</p>}
      <div className="grid gap-3">
        {ex.options.map((o, i) => {
          const state = locked && outcome ? (i === ex.answerIndex ? 'right' : i === sel ? 'wrong' : undefined) : undefined
          return (
            <button key={i} type="button" className="choice" disabled={locked} data-selected={sel === i && !locked} data-state={state} onClick={() => setSel(i)}>
              <span className="mr-3 inline-block w-5 text-slate-400">{i + 1}</span>
              {TERM_OPTIONS.has(ex.type) ? <Term text={o} /> : o}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Sentence with an inline dropdown: "Ich [ bin ▾ ] zehn Jahre alt." */
export function DropdownView({ ex, locked, outcome, onReady }: ExerciseProps<ChoiceExercise>) {
  const [sel, setSel] = useState<number | null>(null)
  useEffect(() => {
    onReady(sel === null ? null : () => evaluateChoice(ex, sel))
  }, [sel, ex, onReady])
  const inl = ex.inline as { before: string; after: string }
  const state = locked && outcome ? (outcome.correct ? 'border-good bg-good-soft' : 'border-bad bg-bad-soft') : 'border-slate-300 bg-white'
  return (
    <div>
      <Title type="verb_dropdown" />
      <p className="text-2xl font-bold leading-[3.2rem]" data-testid="prompt">
        {inl.before}
        <select className={`mx-1 inline-block rounded-xl border-2 px-2 py-1 text-xl font-bold ${state}`} value={sel ?? ''} disabled={locked}
          onChange={(e) => setSel(e.target.value === '' ? null : Number(e.target.value))} data-testid="verb-select" aria-label={t('ex.pickForm')}>
          <option value="">{t('ex.pickForm')}</option>
          {ex.options.map((o, i) => <option key={o} value={i}>{o}</option>)}
        </select>
        {inl.after}
      </p>
    </div>
  )
}

export function MatchView({ ex, locked, onSubmit, say }: ExerciseProps<MatchExercise>) {
  const rights = useMemo(() => shuffle(ex.pairs.map((p) => ({ id: p.wordId, text: p.right }))), [ex])
  const [left, setLeft] = useState<string | null>(null)
  const [done, setDone] = useState<Set<string>>(new Set())
  const [doneRight, setDoneRight] = useState<Set<string>>(new Set())
  const [flash, setFlash] = useState<string | null>(null)
  const targetMistakes = useRef(0)
  const submitted = useRef(false)
  const qa = ex.type === 'match_qa'

  const pickLeft = (id: string) => {
    if (locked || done.has(id)) return
    const p = ex.pairs.find((x) => x.wordId === id)
    if (p) say(p.left)
    setLeft(id)
  }
  const pickRight = (id: string) => {
    if (locked || !left || doneRight.has(id)) return
    const pair = ex.pairs.find((x) => x.wordId === left)
    const clicked = rights.find((r) => r.id === id)
    // identical right-hand text (er/sie/es -t, ihr -t) counts as a match
    const ok = left === id || (pair !== undefined && clicked !== undefined && pair.right === clicked.text)
    if (ok) {
      const next = new Set(done).add(left)
      setDone(next)
      setDoneRight(new Set(doneRight).add(id))
      setLeft(null)
      if (next.size === ex.pairs.length && !submitted.current) {
        submitted.current = true
        onSubmit(evaluateMatch(ex, targetMistakes.current))
      }
    } else {
      if (ex.type === 'verb_endings' || left === ex.wordId || id === ex.wordId) targetMistakes.current += 1
      setFlash(id)
      setTimeout(() => setFlash(null), 350)
      setLeft(null)
    }
  }
  const size = qa ? '!text-sm' : '!text-base'

  return (
    <div>
      <Title type={ex.type} />
      <div className={qa ? 'grid gap-4' : 'grid grid-cols-2 gap-3'}>
        <div className="grid gap-3">
          {ex.pairs.map((p) => (
            <button key={p.wordId} type="button" disabled={done.has(p.wordId) || locked} onClick={() => pickLeft(p.wordId)} data-selected={left === p.wordId}
              data-state={done.has(p.wordId) ? 'right' : undefined} className={`choice !px-3 !py-3 text-center ${size}`}>
              <Term text={p.left} />
            </button>
          ))}
        </div>
        <div className="grid gap-3">
          {rights.map((r) => (
            <motion.button key={r.id} type="button" disabled={doneRight.has(r.id) || locked} onClick={() => pickRight(r.id)}
              animate={flash === r.id ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }} data-state={doneRight.has(r.id) ? 'right' : flash === r.id ? 'wrong' : undefined}
              className={`choice !px-3 !py-3 text-center ${size}`}>
              {ex.type === 'gender_pairs' ? <Term text={r.text} /> : r.text}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  )
}

const LISTEN_TYPE = new Set(['listen_type', 'num_listen_digits'])

export function TypeView({ ex, locked, outcome, onReady, say, onSubmit, lang }: ExerciseProps<TypeExercise>) {
  const [value, setValue] = useState('')
  const [heard, setHeard] = useState<string[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [fail, setFail] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const isSpeak = ex.type === 'speak'
  const isListen = LISTEN_TYPE.has(ex.type)
  const isDigits = ex.digits !== undefined
  const german = (!!ex.de || !!ex.exact) && !isDigits

  useEffect(() => {
    if (isSpeak) return
    onReady(value.trim() ? () => evaluateTyped(ex, value) : null)
  }, [value, ex, onReady, isSpeak])

  useEffect(() => {
    if (isListen && ex.speak) say(ex.speak)
    if (!isSpeak) inputRef.current?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ex.id])

  const record = useCallback(async () => {
    setBusy(true)
    setFail(false)
    try {
      const alts = await listen(lang ?? 'de-DE')
      setHeard(alts)
      onSubmit(evaluateSpoken(ex, alts))
    } catch {
      setFail(true)
    } finally {
      setBusy(false)
    }
  }, [ex, onSubmit, lang])

  const skip = () => onSubmit({ correct: false, expected: ex.accepted[0] ?? '' })
  const wrong = locked && outcome && !outcome.correct
  const termPrompt = ex.type === 'type_l2_l1' || ex.type === 'plural_type'

  return (
    <div>
      <Title type={ex.type} />
      {isListen && <div className="mb-5"><SpeakerButton big onClick={() => say(ex.speak ?? '')} /></div>}
      {!isListen && ex.prompt && (
        <p className={`mb-5 font-black ${ex.type === 'num_arith' ? 'text-2xl' : 'text-3xl'}`} data-testid="prompt">
          {termPrompt ? <Term text={ex.prompt} /> : ex.prompt}
        </p>
      )}
      {isSpeak ? (
        <div className="flex flex-col items-center gap-3">
          {sttSupported() && (
            <button type="button" onClick={record} disabled={busy || locked} aria-label={t('ex.tapMic')}
              className={`h-24 w-24 rounded-full text-5xl border-b-4 ${busy ? 'animate-pulse bg-red-100 border-red-300' : 'bg-brand-soft border-brand'}`}>🎤</button>
          )}
          <p className="text-slate-500">{busy ? t('ex.listening') : heard ? t('ex.heard', { s: heard[0] ?? '' }) : t('ex.tapMic')}</p>
          {fail && <p className="font-bold text-bad">{t('ex.speakFail')}</p>}
          {!locked && <button type="button" className="btn btn-ghost" onClick={skip}>{t('lesson.skipSpeak')}</button>}
        </div>
      ) : (
        <>
          {german && <KeyBar inputRef={inputRef} value={value} onChange={setValue} disabled={locked} />}
          <input ref={inputRef} className={`input ${wrong ? '!border-bad' : ''}`} value={value} disabled={locked} autoCapitalize="none" autoCorrect="off"
            autoComplete="off" spellCheck={false} inputMode={isDigits ? 'numeric' : 'text'} placeholder={isDigits ? t('ex.digitsHere') : t('ex.typeHere')}
            onChange={(e) => setValue(e.target.value)} data-testid="answer-input" />
        </>
      )}
    </div>
  )
}

export function ArticleView({ ex, locked, outcome, onSubmit, say }: ExerciseProps<ArticleExercise>) {
  const colors = useGenderColors()
  const [sel, setSel] = useState<Gender | null>(null)
  useEffect(() => {
    if (locked) return
    const h = (e: KeyboardEvent) => {
      const g = ({ d: 'der', r: 'die', a: 'das' } as Record<string, Gender>)[e.key.toLowerCase()]
      if (g) pick(g)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked])
  const pick = (g: Gender) => {
    if (locked || sel) return
    setSel(g)
    onSubmit(evaluateArticle(ex, g))
  }
  return (
    <div>
      <Title type="article" />
      <p className="mb-1 text-4xl font-black" data-testid="prompt">{ex.noun}</p>
      <p className="mb-6 text-slate-500">{ex.translation}</p>
      <div className="grid grid-cols-3 gap-3">
        {(['der', 'die', 'das'] as const).map((g) => {
          const state = locked && outcome ? (g === ex.answer ? 'right' : g === sel ? 'wrong' : undefined) : undefined
          return (
            <button key={g} type="button" disabled={locked} data-state={state} data-testid={`art-${g}`} onClick={() => pick(g)}
              className={`h-28 rounded-3xl border-b-8 text-3xl font-black transition active:translate-y-1 ${colors ? GENDER_BG[g] : 'border-slate-300 bg-white'} ${state === 'wrong' ? 'opacity-50' : ''}`}>
              {g}
            </button>
          )
        })}
      </div>
      {locked && (
        <button type="button" className="mt-4 text-sm font-bold text-brand underline" onClick={() => say(ex.speak)}>🔊 {ex.speak}</button>
      )}
    </div>
  )
}

export function VerbFormsView({ ex, locked, onReady }: ExerciseProps<VerbFormsExercise>) {
  const [vals, setVals] = useState<string[]>(() => ex.fields.map(() => ''))
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const [active, setActive] = useState(0)
  useEffect(() => {
    onReady(vals.every((v) => v.trim()) ? () => evaluateVerbForms(ex, vals) : null)
  }, [vals, ex, onReady])
  const proxy = { current: refs.current[active] ?? null } as React.RefObject<HTMLInputElement | null>
  return (
    <div>
      <Title type="verb_forms" />
      <p className="mb-1 text-3xl font-black" data-testid="prompt">{ex.infinitive}</p>
      <p className="mb-4 text-slate-500">{ex.translation}</p>
      <KeyBar inputRef={proxy} value={vals[active] ?? ''} onChange={(v) => setVals(vals.map((x, i) => (i === active ? v : x)))} disabled={locked} />
      <div className="grid gap-3">
        {ex.fields.map((f, i) => (
          <label key={f.key} className="text-sm font-bold text-slate-600">
            {t(`ex.verbField.${f.key}` as Key)}
            <input ref={(el) => { refs.current[i] = el }} className="input mt-1" value={vals[i]} disabled={locked} autoCapitalize="none" autoCorrect="off" spellCheck={false}
              onFocus={() => setActive(i)} onChange={(e) => setVals(vals.map((x, j) => (j === i ? e.target.value : x)))} data-testid={`verb-${f.key}`} />
          </label>
        ))}
      </div>
    </div>
  )
}

export function SeparableView({ ex, locked, onReady }: ExerciseProps<SeparableExercise>) {
  const [vals, setVals] = useState(['', ''])
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const [active, setActive] = useState(0)
  useEffect(() => {
    onReady(vals.every((v) => v.trim()) ? () => evaluateSeparable(ex, vals) : null)
  }, [vals, ex, onReady])
  const proxy = { current: refs.current[active] ?? null } as React.RefObject<HTMLInputElement | null>
  const field = (i: number) => (
    <input ref={(el) => { refs.current[i] = el }} className="mx-1 inline-block w-28 rounded-xl border-2 border-slate-300 px-2 py-1 text-lg font-bold outline-none focus:border-brand" value={vals[i]}
      disabled={locked} autoCapitalize="none" autoCorrect="off" spellCheck={false} onFocus={() => setActive(i)} data-testid={`sep-${i}`}
      onChange={(e) => setVals(vals.map((x, j) => (j === i ? e.target.value : x)))} />
  )
  return (
    <div>
      <Title type="separable" />
      <p className="mb-4 text-slate-500">{ex.translation}</p>
      <KeyBar inputRef={proxy} value={vals[active] ?? ''} onChange={(v) => setVals(vals.map((x, i) => (i === active ? v : x)))} disabled={locked} />
      <p className="text-xl font-bold leading-[3rem]" data-testid="prompt">
        {ex.parts[0]}{field(0)}{ex.parts[1]}{field(1)}{ex.parts[2]}
      </p>
    </div>
  )
}

export function SequenceView({ ex, locked, onReady }: ExerciseProps<SequenceExercise>) {
  const missing = ex.given.map((g, i) => (g === null ? i : -1)).filter((i) => i >= 0)
  const [slots, setSlots] = useState<(string | null)[]>(() => missing.map(() => null))
  useEffect(() => {
    onReady(slots.every((x) => x !== null) ? () => evaluateSequence(ex, slots) : null)
  }, [slots, ex, onReady])
  const place = (w: string) => {
    if (locked) return
    const i = slots.indexOf(null)
    if (i >= 0) setSlots(slots.map((x, j) => (j === i ? w : x)))
  }
  const remove = (j: number) => {
    if (!locked) setSlots(slots.map((x, k) => (k === j ? null : x)))
  }
  const left = ex.bank.filter((w) => !slots.includes(w))
  return (
    <div>
      <Title type="seq_order" />
      <p className="mb-3 text-sm text-slate-500">{t('ex.seqHelp')}</p>
      <ol className="mb-4 grid grid-cols-2 gap-2" data-testid="seq-slots">
        {ex.days.map((_, i) => {
          const j = missing.indexOf(i)
          const given = ex.given[i]
          return (
            <li key={i} className="flex items-center gap-2">
              <span className="w-6 text-right text-sm font-black text-slate-400">{i + 1}</span>
              {given !== null && given !== undefined ? (
                <span className="choice !py-2 !text-base" data-state="right">{given}</span>
              ) : (
                <button type="button" disabled={locked} onClick={() => remove(j)} data-testid={`slot-${i}`}
                  className={`choice !py-2 !text-base ${slots[j] ? '' : 'border-dashed !text-slate-300'}`}>
                  {slots[j] ?? '…'}
                </button>
              )}
            </li>
          )
        })}
      </ol>
      <div className="flex flex-wrap gap-2" data-testid="seq-bank">
        {left.map((w) => (
          <button key={w} type="button" disabled={locked} className="choice !w-auto !px-3 !py-2 !text-base" onClick={() => place(w)}>{w}</button>
        ))}
      </div>
    </div>
  )
}

export function SentenceView({ ex, locked, onReady, say }: ExerciseProps<SentenceExercise>) {
  const [built, setBuilt] = useState<number[]>([])
  useEffect(() => {
    onReady(built.length ? () => evaluateSentence(ex, built.map((i) => ex.bank[i] as string)) : null)
  }, [built, ex, onReady])
  useEffect(() => {
    if (!ex.noSpeak) say(ex.speak)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ex.id])

  const remaining = ex.bank.map((w, i) => ({ w, i })).filter((x) => !built.includes(x.i))
  return (
    <div>
      <Title type={ex.type} />
      <div className="mb-4 flex items-center gap-3">
        {!ex.noSpeak && <SpeakerButton onClick={() => say(ex.speak)} />}
        <p className="font-bold text-slate-600" data-testid="prompt"><Term text={ex.prompt} /></p>
      </div>
      <div className="mb-4 flex min-h-24 flex-wrap content-start gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white p-3" data-testid="sentence-line">
        {built.map((bi) => (
          <button key={bi} type="button" disabled={locked} className="choice !w-auto !px-3 !py-2 !text-base" onClick={() => setBuilt(built.filter((x) => x !== bi))}>
            {ex.bank[bi]}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {remaining.map(({ w, i }) => (
          <button key={i} type="button" disabled={locked} className="choice !w-auto !px-3 !py-2 !text-base" onClick={() => setBuilt([...built, i])}>{w}</button>
        ))}
      </div>
      {!locked && built.length > 0 && <button type="button" className="mt-3 text-sm font-bold text-slate-500 underline" onClick={() => setBuilt([])}>{t('ex.clear')}</button>}
    </div>
  )
}

export function ExerciseView(p: ExerciseProps) {
  const { ex } = p
  switch (ex.type) {
    case 'mc_l2_l1':
    case 'mc_l1_l2':
    case 'listen_choose':
    case 'fill_blank':
    case 'plural_choice':
    case 'context_choice':
    case 'context_listen':
    case 'num_word_to_digits':
    case 'seq_neighbor':
    case 'fill_prep':
    case 'listen_ro':
    case 'month_season':
    case 'season_months':
    case 'collective':
    case 'possessive':
    case 'verb_pronoun':
    case 'verb_listen_blank':
      return <ChoiceView {...(p as ExerciseProps<ChoiceExercise>)} />
    case 'match':
    case 'match_qa':
    case 'gender_pairs':
    case 'verb_endings':
      return <MatchView {...(p as ExerciseProps<MatchExercise>)} />
    case 'type_l1_l2':
    case 'type_l2_l1':
    case 'listen_type':
    case 'speak':
    case 'plural_type':
    case 'num_listen_digits':
    case 'num_digits_to_word':
    case 'num_arith':
    case 'seq_neighbor_type':
    case 'verb_pronoun_type':
      return <TypeView {...(p as ExerciseProps<TypeExercise>)} />
    case 'sentence_build':
    case 'verb_sentence_build':
      return <SentenceView {...(p as ExerciseProps<SentenceExercise>)} />
    case 'article':
      return <ArticleView {...(p as ExerciseProps<ArticleExercise>)} />
    case 'verb_forms':
      return <VerbFormsView {...(p as ExerciseProps<VerbFormsExercise>)} />
    case 'separable':
      return <SeparableView {...(p as ExerciseProps<SeparableExercise>)} />
    case 'verb_dropdown':
      return <DropdownView {...(p as ExerciseProps<ChoiceExercise>)} />
    case 'seq_order':
      return <SequenceView {...(p as ExerciseProps<SequenceExercise>)} />
  }
}
