/**
 * One component per exercise family. Each reports an `Outcome` through either
 *  - `onReady(check)`: the learner has an answer ready; pressing "Check" calls `check()`, or
 *  - `onSubmit(outcome)`: the exercise is complete on its own (match pairs).
 */
import { motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  evaluateChoice, evaluateMatch, evaluateSentence, evaluateSpoken, evaluateTyped,
  type ChoiceExercise, type Exercise, type MatchExercise, type Outcome, type SentenceExercise, type TypeExercise,
} from '../../core/exercises'
import { shuffle } from '../../core/id'
import { t } from '../../i18n'
import { listen, sttSupported } from '../../lib/speech'

export interface ExerciseProps<E extends Exercise = Exercise> {
  ex: E
  locked: boolean
  /** result of the check, shown by highlighting options */
  outcome: Outcome | null
  onReady: (check: (() => Outcome) | null) => void
  onSubmit: (o: Outcome) => void
  say: (text: string) => void
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
  return <h2 className="mb-4 text-xl font-black text-slate-600">{t(`ex.${type}`)}</h2>
}

export function ChoiceView({ ex, locked, outcome, onReady, say }: ExerciseProps<ChoiceExercise>) {
  const [sel, setSel] = useState<number | null>(null)
  const isListen = ex.type === 'listen_choose'

  useEffect(() => {
    onReady(sel === null ? null : () => evaluateChoice(ex, sel))
  }, [sel, ex, onReady])

  useEffect(() => {
    if (isListen && ex.speak) say(ex.speak)
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
        {isListen ? <SpeakerButton big onClick={() => say(ex.speak ?? '')} /> : (
          <>
            {ex.speak && ex.type === 'mc_l2_l1' && <SpeakerButton onClick={() => say(ex.speak ?? '')} />}
            <p className="text-3xl font-black" data-testid="prompt">{ex.prompt}</p>
          </>
        )}
      </div>
      {ex.sentence && <p className="mb-5 rounded-2xl bg-brand-soft p-4 text-xl font-bold">{ex.sentence}</p>}
      <div className="grid gap-3">
        {ex.options.map((o, i) => {
          const state = locked && outcome ? (i === ex.answerIndex ? 'right' : i === sel ? 'wrong' : undefined) : undefined
          return (
            <button key={i} type="button" className="choice" disabled={locked} data-selected={sel === i && !locked} data-state={state} onClick={() => setSel(i)}>
              <span className="mr-3 inline-block w-5 text-slate-400">{i + 1}</span>
              {o}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function MatchView({ ex, locked, onSubmit, say }: ExerciseProps<MatchExercise>) {
  const rights = useMemo(() => shuffle(ex.pairs.map((p) => ({ id: p.wordId, text: p.right }))), [ex])
  const [left, setLeft] = useState<string | null>(null)
  const [done, setDone] = useState<Set<string>>(new Set())
  const [flash, setFlash] = useState<string | null>(null)
  const targetMistakes = useRef(0)
  const submitted = useRef(false)

  const pickLeft = (id: string) => {
    if (locked || done.has(id)) return
    const p = ex.pairs.find((x) => x.wordId === id)
    if (p) say(p.left)
    setLeft(id)
  }
  const pickRight = (id: string) => {
    if (locked || !left || done.has(id)) return
    if (left === id) {
      const next = new Set(done).add(id)
      setDone(next)
      setLeft(null)
      if (next.size === ex.pairs.length && !submitted.current) {
        submitted.current = true
        onSubmit(evaluateMatch(ex, targetMistakes.current))
      }
    } else {
      if (left === ex.wordId || id === ex.wordId) targetMistakes.current += 1
      setFlash(id)
      setTimeout(() => setFlash(null), 350)
      setLeft(null)
    }
  }
  const lefts = ex.pairs

  return (
    <div>
      <Title type="match" />
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-3">
          {lefts.map((p) => (
            <button key={p.wordId} type="button" disabled={done.has(p.wordId) || locked} onClick={() => pickLeft(p.wordId)} data-selected={left === p.wordId}
              data-state={done.has(p.wordId) ? 'right' : undefined} className="choice !px-3 !py-3 text-center !text-base">
              {p.left}
            </button>
          ))}
        </div>
        <div className="grid gap-3">
          {rights.map((r) => (
            <motion.button key={r.id} type="button" disabled={done.has(r.id) || locked} onClick={() => pickRight(r.id)}
              animate={flash === r.id ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }} data-state={done.has(r.id) ? 'right' : flash === r.id ? 'wrong' : undefined}
              className="choice !px-3 !py-3 text-center !text-base">
              {r.text}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  )
}

export function TypeView({ ex, locked, outcome, onReady, say, onSubmit }: ExerciseProps<TypeExercise>) {
  const [value, setValue] = useState('')
  const [heard, setHeard] = useState<string[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [fail, setFail] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const isSpeak = ex.type === 'speak'
  const isListen = ex.type === 'listen_type'

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
      const alts = await listen('en-US')
      setHeard(alts)
      onSubmit(evaluateSpoken(ex, alts))
    } catch {
      setFail(true)
    } finally {
      setBusy(false)
    }
  }, [ex, onSubmit])

  const skip = () => onSubmit({ correct: false, expected: ex.accepted[0] ?? '' })
  const wrong = locked && outcome && !outcome.correct

  return (
    <div>
      <Title type={ex.type} />
      {isListen && <div className="mb-5"><SpeakerButton big onClick={() => say(ex.speak ?? '')} /></div>}
      {!isListen && <p className="mb-5 text-3xl font-black" data-testid="prompt">{ex.prompt}</p>}
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
        <input ref={inputRef} className={`input ${wrong ? '!border-bad' : ''}`} value={value} disabled={locked} autoCapitalize="none" autoCorrect="off"
          autoComplete="off" spellCheck={false} placeholder={t('ex.typeHere')} onChange={(e) => setValue(e.target.value)} data-testid="answer-input" />
      )}
    </div>
  )
}

export function SentenceView({ ex, locked, onReady, say }: ExerciseProps<SentenceExercise>) {
  const [built, setBuilt] = useState<number[]>([])
  useEffect(() => {
    onReady(built.length ? () => evaluateSentence(ex, built.map((i) => ex.bank[i] as string)) : null)
  }, [built, ex, onReady])
  useEffect(() => {
    say(ex.speak)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ex.id])

  const remaining = ex.bank.map((w, i) => ({ w, i })).filter((x) => !built.includes(x.i))
  return (
    <div>
      <Title type="sentence_build" />
      <div className="mb-4 flex items-center gap-3">
        <SpeakerButton onClick={() => say(ex.speak)} />
        <p className="font-bold text-slate-600">{ex.prompt}</p>
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
      return <ChoiceView {...(p as ExerciseProps<ChoiceExercise>)} />
    case 'match':
      return <MatchView {...(p as ExerciseProps<MatchExercise>)} />
    case 'type_l1_l2':
    case 'listen_type':
    case 'speak':
      return <TypeView {...(p as ExerciseProps<TypeExercise>)} />
    case 'sentence_build':
      return <SentenceView {...(p as ExerciseProps<SentenceExercise>)} />
  }
}
