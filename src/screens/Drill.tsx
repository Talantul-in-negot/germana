/** Timed drills: "Articole rapid" (20 nouns) and the numbers speed round (20 numbers, shown or heard). */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { buildExercise, type Exercise, type Outcome } from '../core/exercises'
import { isSeqWord } from '../core/german'
import { uid } from '../core/id'
import type { LessonResultItem } from '../core/lesson'
import type { Word } from '../core/types'
import { ExerciseView } from '../components/exercises/ExerciseView'
import { FeedbackBody } from '../components/Feedback'
import { CornerAnimal } from '../components/ZoneScreen'
import { useReactionMood, type Verdict } from '../components/useReactionMood'
import { Mascot } from '../components/ui'
import { db } from '../data/db'
import { useProfile } from '../data/profile-context'
import { finishLesson, type FinishOutput } from '../data/service'
import { t } from '../i18n'
import { playSfx } from '../lib/sound'
import { langFor, speak, type SpeechLang } from '../lib/speech'
import Summary from './Summary'

const COUNT = 20

export function pickDrillWords(words: Word[], kind: 'articles' | 'numbers', rng: () => number = Math.random): Word[] {
  const pool = words.filter((w) => (kind === 'articles' ? w.type === 'noun' && !!w.gender && !isSeqWord(w) : w.value !== undefined))
  if (pool.length === 0) return []
  const out: Word[] = []
  let bag: Word[] = []
  while (out.length < COUNT) {
    if (bag.length === 0) bag = pool.slice().sort(() => rng() - 0.5)
    out.push(bag.pop() as Word)
  }
  return out
}

type Phase = 'loading' | 'intro' | 'running' | 'saving' | 'done'

export default function Drill() {
  const { deckId = '' } = useParams()
  const [params] = useSearchParams()
  const kind = params.get('kind') === 'numbers' ? 'numbers' : 'articles'
  const nav = useNavigate()
  const { profile } = useProfile()
  const s = profile.settings

  const [phase, setPhase] = useState<Phase>('loading')
  const [lang, setLang] = useState<SpeechLang>('de-DE')
  const [pool, setPool] = useState<Word[]>([])
  const [all, setAll] = useState<Word[]>([])
  const [items, setItems] = useState<Exercise[]>([])
  const [i, setI] = useState(0)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const verdict: Verdict = outcome ? (outcome.correct ? 'correct' : 'wrong') : null
  const mood = useReactionMood(verdict)
  const [canCheck, setCanCheck] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [result, setResult] = useState<FinishOutput | null>(null)
  const checkRef = useRef<(() => Outcome) | null>(null)
  const results = useRef<LessonResultItem[]>([])
  const started = useRef(0)
  const sessionId = useRef(uid())

  useEffect(() => {
    void (async () => {
      const ws = (await db.words.where('deckId').equals(deckId).toArray()).sort((a, b) => a.order - b.order)
      setAll(ws)
      setLang(langFor((await db.decks.get(deckId))?.l2))
      setPool(pickDrillWords(ws, kind))
      setPhase('intro')
    })()
  }, [deckId, kind])

  useEffect(() => {
    if (phase !== 'running') return
    const id = setInterval(() => setElapsed(Math.round((Date.now() - started.current) / 1000)), 500)
    return () => clearInterval(id)
  }, [phase])

  const say = useCallback((text: string) => speak(text, { voice: s.ttsVoice, rate: s.ttsRate, lang }), [s.ttsVoice, s.ttsRate, lang])
  const onReady = useCallback((fn: (() => Outcome) | null) => {
    checkRef.current = fn
    setCanCheck(fn !== null)
  }, [])

  const start = () => {
    let n = 0
    const ctx = { deckWords: all, rng: Math.random, newId: () => `d${n++}`, level: 5 }
    const list = pool.map((w, idx) => {
      if (kind === 'articles') return buildExercise(w, 'article', ctx)
      return buildExercise(w, idx % 2 === 0 ? 'num_digits_to_word' : 'num_listen_digits', ctx)
    })
    results.current = []
    setItems(list)
    setI(0)
    setOutcome(null)
    started.current = Date.now()
    setElapsed(0)
    setPhase('running')
  }

  const finish = useCallback(async () => {
    setPhase('saving')
    const now = Date.now()
    const out = await finishLesson({
      profileId: profile.id, deckId, sessionId: sessionId.current, results: results.current, startedAt: started.current, now, mode: 'unit', heartsLost: 0,
    })
    setResult(out)
    setPhase('done')
    playSfx('finish', s.sound)
  }, [profile.id, deckId, s.sound])

  const commit = useCallback((o: Outcome) => {
    setOutcome(o)
    playSfx(o.correct ? 'correct' : 'wrong', s.sound)
  }, [s.sound])

  const check = useCallback(() => {
    const fn = checkRef.current
    if (fn) commit(fn())
  }, [commit])

  const next = useCallback(() => {
    const ex = items[i]
    if (!ex || !outcome) return
    results.current.push({ wordId: ex.wordId, type: ex.type, correct: outcome.correct, ...(outcome.credits ? { credits: outcome.credits } : {}) })
    setOutcome(null)
    checkRef.current = null
    setCanCheck(false)
    if (i + 1 >= items.length) void finish()
    else setI(i + 1)
  }, [items, i, outcome, finish])

  useEffect(() => {
    if (phase !== 'running') return
    const h = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.repeat) return
      if (outcome) next()
      else if (checkRef.current) check()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [phase, outcome, next, check])

  if (phase === 'loading' || phase === 'saving') return <div className="flex h-full items-center justify-center font-bold">{t('app.loading')}</div>

  if (phase === 'intro') {
    return (
      <div className="panel screen-panel flex flex-col items-center justify-center gap-4 !p-6 text-center">
        <Mascot size={110} />
        <h1 className="text-2xl font-black">{t(kind === 'articles' ? 'drill.articlesTitle' : 'drill.numbersTitle')}</h1>
        <p className="text-slate-600">{t(kind === 'articles' ? 'drill.articlesHelp' : 'drill.numbersHelp')}</p>
        {pool.length === 0 && <p className="font-bold text-bad">{t('drill.noWords')}</p>}
        <div className="flex w-full gap-3">
          <button className="btn btn-ghost flex-1" onClick={() => nav(-1)}>{t('common.back')}</button>
          <button className="btn btn-primary flex-1" disabled={pool.length === 0} onClick={start} data-testid="drill-start">{t('drill.start')}</button>
        </div>
      </div>
    )
  }

  if (phase === 'done' && result) {
    return <Summary result={result} levelUps={result.levelUps} mode="unit" onHome={() => nav('/')} onAgain={() => { setResult(null); start() }} />
  }

  const ex = items[i]
  if (!ex) return null
  const correctSoFar = results.current.filter((r) => r.correct).length
  const mm = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`
  return (
    <div className="mx-auto flex h-full max-w-lg flex-col">
      <header className="ex-bar">
        <button aria-label={t('lesson.exit')} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl font-black text-slate-600" onClick={() => nav(-1)}>✕</button>
        <div className="h-4 flex-1 overflow-hidden rounded-full bg-slate-200" role="progressbar">
          <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${Math.max(4, (i / items.length) * 100)}%` }} />
        </div>
        <span className="text-sm font-black tabular-nums text-slate-600" data-testid="drill-timer">⏱ {mm}</span>
        <span className="text-sm font-black text-green-800">{correctSoFar}/{i + (outcome ? 1 : 0)}</span>
        <CornerAnimal mood={mood} />
      </header>
      <main className="flex-1 overflow-y-auto px-4 pb-44 pt-6">
        <div className="panel"><ExerciseView key={ex.id} ex={ex} locked={!!outcome} outcome={outcome} onReady={onReady} onSubmit={commit} say={say} lang={lang} /></div>
      </main>
      <footer className={`fixed inset-x-0 bottom-0 z-30 rounded-t-3xl border-t-4 shadow-soft ${outcome ? (outcome.correct ? 'border-green-200 bg-good-soft' : 'border-red-200 bg-bad-soft') : 'border-slate-100 bg-paper'}`}>
        <div className="mx-auto max-w-lg px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
          {outcome ? (
            <>
              <div className="mb-3"><FeedbackBody outcome={outcome} /></div>
              <button className={`btn w-full ${outcome.correct ? 'btn-good' : 'btn-bad'}`} onClick={next} autoFocus data-testid="continue">{t('lesson.continue')}</button>
            </>
          ) : (
            <button className="btn btn-primary w-full" disabled={!canCheck} onClick={check} data-testid="check">{t('lesson.check')}</button>
          )}
        </div>
      </footer>
    </div>
  )
}
