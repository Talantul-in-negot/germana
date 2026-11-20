import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import type { Outcome } from '../core/exercises'
import { uid } from '../core/id'
import {
  DEFAULT_LESSON, current, isFinished, planLesson, progressRatio, selectLessonWords, submitResult,
  type LessonMode, type LessonRuntime, type LessonResultItem,
} from '../core/lesson'
import { refillHearts } from '../core/gamification'
import { hasPresent } from '../core/conjugation'
import { COLLECTIVES, isSetComplete, partnerOf } from '../core/exercises'
import { ConjCard } from '../components/ConjCard'
import { SEQ_SETS, seqOf, splitArticle } from '../core/german'
import { effectiveLevel, personStrengths, skillLevel } from '../core/srs'
import { FeedbackBody } from '../components/Feedback'
import { ExerciseView } from '../components/exercises/ExerciseView'
import { Confirm, Mascot, Sheet } from '../components/ui'
import { CornerAnimal } from '../components/ZoneScreen'
import { useReactionMood, type Verdict } from '../components/useReactionMood'
import { useProfile } from '../data/profile-context'
import { db } from '../data/db'
import { progressMap, updateProfile } from '../data/repo'
import { finishLesson, type FinishOutput } from '../data/service'
import type { Word } from '../core/types'
import { t } from '../i18n'
import { playSfx } from '../lib/sound'
import { langFor, speak, speakWithBeep, sttSupported, type SpeechLang } from '../lib/speech'
import Summary from './Summary'

type Phase = 'loading' | 'empty' | 'noHearts' | 'info' | 'answering' | 'feedback' | 'saving' | 'summary'

export default function Lesson() {
  const { deckId = '' } = useParams()
  const [params] = useSearchParams()
  const mode = (params.get('mode') ?? 'unit') as LessonMode
  const unit = Number(params.get('unit') ?? 0)
  const nav = useNavigate()
  const { profile } = useProfile()
  const s = profile.settings

  const [phase, setPhase] = useState<Phase>('loading')
  const [rt, setRt] = useState<LessonRuntime | null>(null)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [canCheck, setCanCheck] = useState(false)
  const [hearts, setHearts] = useState(5)
  const [exit, setExit] = useState(false)
  const [result, setResult] = useState<FinishOutput | null>(null)
  const [levelUps, setLevelUps] = useState<FinishOutput['levelUps']>([])
  const [lang, setLang] = useState<SpeechLang>('de-DE')
  const [cards, setCards] = useState<('days' | 'months')[]>([])
  const [card, setCard] = useState<Word | null>(null)

  const verdict: Verdict = phase === 'feedback' && outcome ? (outcome.correct ? 'correct' : 'wrong') : null
  const mood = useReactionMood(verdict)

  const checkRef = useRef<(() => Outcome) | null>(null)
  const words = useRef<Word[]>([])
  const sessionId = useRef(uid())
  const startedAt = useRef(Date.now())
  const heartsLost = useRef(0)
  const ctxRef = useRef<{ rng: () => number; newId: () => string; seenNumbers: Word[] }>({ rng: Math.random, newId: uid, seenNumbers: [] })
  const started = useRef(false)
  const levels = useRef<Map<string, number>>(new Map())
  const shownCards = useRef<Set<string>>(new Set())

  const heartsOn = s.hearts && mode !== 'review'
  const speakOn = s.speaking && sttSupported()

  const sayParts = useCallback(
    (before: string, after: string) => speakWithBeep(before, after, () => playSfx('beep', true), { voice: s.ttsVoice, rate: s.ttsRate, lang }),
    [s.ttsVoice, s.ttsRate, lang],
  )
  const say = useCallback((text: string) => speak(text, { voice: s.ttsVoice, rate: s.ttsRate, lang }), [s.ttsVoice, s.ttsRate, lang])

  useEffect(() => {
    if (started.current) return
    started.current = true
    void (async () => {
      const all = (await db.words.where('deckId').equals(deckId).toArray()).sort((a, b) => a.order - b.order)
      words.current = all
      const deck = await db.decks.get(deckId)
      setLang(langFor(deck?.l2))
      const prog = await progressMap(profile.id)
      const now = Date.now()
      const h = refillHearts(profile.hearts, profile.heartsAt, now)
      if (h.hearts !== profile.hearts) await updateProfile(profile.id, { hearts: h.hearts, heartsAt: h.heartsAt })
      setHearts(h.hearts)
      if (s.hearts && mode !== 'review' && h.hearts === 0) return setPhase('noHearts')
      const sel = selectLessonWords(all, prog, now, { mode, size: DEFAULT_LESSON.size, newRatio: DEFAULT_LESSON.newRatio, unitIndex: unit }, Math.random)
      const picked = sel.wordIds.map((id) => all.find((w) => w.id === id)).filter((w): w is Word => !!w)
      if (picked.length === 0) return setPhase('empty')
      levels.current = new Map(all.map((w) => [w.id, prog.get(w.id) ? effectiveLevel(prog.get(w.id) as never) : 0]))
      const seenNumbers = all.filter((w) => w.value !== undefined && (prog.get(w.id)?.level ?? 0) > 0)
      ctxRef.current.seenNumbers = seenNumbers
      const infoOf = (w: Word) => {
        const p = prog.get(w.id)
        return {
          level: p ? effectiveLevel(p) : 0,
          skillLevels: p ? { gender: skillLevel(p, 'gender'), plural: skillLevel(p, 'plural'), forms: skillLevel(p, 'forms') } : {},
          seenNumbers,
          completeSets: SEQ_SETS.filter((set) => isSetComplete(all, set)).map((set) => set.tag),
          hasSeasons: isSetComplete(all, SEQ_SETS[2] as (typeof SEQ_SETS)[number]),
          ...(p ? { personStrengths: personStrengths(p, now) } : {}),
          hasPairs: all.some((x) => partnerOf(x, all) !== null),
          collectives: all.some((x) => COLLECTIVES.some((c) => c.word === splitArticle(x.term).rest)),
        }
      }
      const plan = planLesson(picked, (id) => { const p = prog.get(id); return p ? effectiveLevel(p) : 0 }, all, { ...ctxRef.current }, speakOn, DEFAULT_LESSON.size, infoOf)
      setRt(plan)
      startedAt.current = now
      // one info card per kind of ordered set in the lesson (all der + am/im)
      const kinds = [...new Set(picked.map((w) => seqOf(w)?.set.info).filter((k): k is 'days' | 'months' => !!k))]
      setCards(kinds)
      setPhase(kinds.length ? 'info' : 'answering')
    })()
  }, [deckId, mode, unit, profile, s.hearts, speakOn])

  // a verb's conjugation card is shown when the verb first appears (level 0)
  useEffect(() => {
    if (phase !== 'answering' || !rt) return
    const e = current(rt)
    const w = e ? words.current.find((x) => x.id === e.wordId) : undefined
    if (w && hasPresent(w) && (levels.current.get(w.id) ?? 0) === 0 && !shownCards.current.has(w.id)) {
      shownCards.current.add(w.id)
      setCard(w)
    }
  }, [phase, rt])

  const onReady = useCallback((fn: (() => Outcome) | null) => {
    checkRef.current = fn
    setCanCheck(fn !== null)
  }, [])

  const commit = useCallback(
    (o: Outcome) => {
      setOutcome(o)
      setPhase('feedback')
      playSfx(o.correct ? 'correct' : 'wrong', s.sound)
      if (!o.correct && heartsOn) {
        heartsLost.current += 1
        setHearts((h) => Math.max(0, h - 1))
      }
    },
    [s.sound, heartsOn],
  )

  const check = useCallback(() => {
    const fn = checkRef.current
    if (fn) commit(fn())
  }, [commit])

  const finish = useCallback(
    async (final: LessonRuntime, lost: number) => {
      setPhase('saving')
      const out = await finishLesson({
        profileId: profile.id, deckId, sessionId: sessionId.current, results: final.results, startedAt: startedAt.current,
        now: Date.now(), mode, heartsLost: lost,
      })
      setResult(out)
      setLevelUps(out.levelUps)
      setPhase('summary')
      playSfx(out.unlocked.length ? 'achievement' : 'finish', s.sound)
    },
    [profile.id, deckId, mode, s.sound],
  )

  const next = useCallback(() => {
    if (!rt || !outcome) return
    const ex = current(rt)
    if (!ex) return
    const word = words.current.find((w) => w.id === ex.wordId) as Word
    const item: LessonResultItem = {
      wordId: ex.wordId, type: ex.type, correct: outcome.correct, ...(outcome.quality ? { quality: outcome.quality } : {}),
      ...(outcome.credits ? { credits: outcome.credits } : {}),
    }
    const nextRt = submitResult(rt, item, word, { deckWords: words.current, ...ctxRef.current }, speakOn)
    setRt(nextRt)
    setOutcome(null)
    checkRef.current = null
    setCanCheck(false)
    const outOfHearts = heartsOn && hearts <= 0
    if (isFinished(nextRt) || outOfHearts) void finish(nextRt, heartsLost.current)
    else setPhase('answering')
  }, [rt, outcome, speakOn, heartsOn, hearts, finish])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.repeat) return
      if (phase === 'feedback') next()
      else if (phase === 'answering' && checkRef.current) check()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [phase, next, check])

  if (phase === 'loading' || phase === 'saving') {
    return <div className="flex h-full items-center justify-center text-lg font-bold">{t('app.loading')}</div>
  }
  if (phase === 'empty' || phase === 'noHearts') {
    return (
      <div className="panel screen-panel flex flex-col items-center justify-center gap-4 !p-6 text-center">
        <Mascot size={110} mood="sad" />
        <p className="text-xl font-black">{phase === 'empty' ? t('lesson.nothing') : t('lesson.noHeartsTitle')}</p>
        {phase === 'noHearts' && <p>{t('home.noHearts')}</p>}
        <div className="flex w-full gap-3">
          <button className="btn btn-ghost flex-1" onClick={() => nav('/')}>{t('common.back')}</button>
          {phase === 'noHearts' && (
            <button className="btn btn-primary flex-1" onClick={() => nav(`/lesson/${deckId}?mode=review`, { replace: true })}>{t('home.review')}</button>
          )}
        </div>
      </div>
    )
  }
  if (phase === 'info') {
    return (
      <div className="panel screen-panel flex flex-col justify-center gap-4 !p-6" data-testid="info-card">
        <Mascot size={90} />
        <h1 className="text-2xl font-black">{t('lesson.info')}</h1>
        {cards.map((c) => (
          <p key={c} className="rounded-2xl bg-brand-soft p-4 text-lg font-bold">{t(c === 'days' ? 'lesson.infoDays' : 'lesson.infoMonths')}</p>
        ))}
        <button className="btn btn-primary" onClick={() => setPhase('answering')} data-testid="info-continue">{t('lesson.infoContinue')}</button>
      </div>
    )
  }
  if (phase === 'summary' && result) {
    return (
      <Summary
        result={result} levelUps={levelUps} mode={mode}
        onHome={() => nav('/')}
        onAgain={() => nav(`/lesson/${deckId}?mode=${mode}&unit=${unit}&r=${Date.now()}`, { replace: true })}
      />
    )
  }

  const ex = rt ? current(rt) : undefined
  if (!rt || !ex) return null
  const feedback = phase === 'feedback' && outcome
  const word = words.current.find((w) => w.id === ex.wordId)
  // the conjugation card is always available (free)
  const peekable = !!word && hasPresent(word)

  return (
    <div className="mx-auto flex h-full max-w-lg flex-col">
      <header className="ex-bar">
        <button aria-label={t('lesson.exit')} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl font-black text-slate-600" onClick={() => setExit(true)}>✕</button>
        <div className="h-4 flex-1 overflow-hidden rounded-full bg-slate-200" role="progressbar">
          <motion.div className="h-full rounded-full bg-good" animate={{ width: `${Math.max(4, progressRatio(rt) * 100)}%` }} />
        </div>
        {peekable && (
          <button aria-label={t('conj.peek')} title={t('conj.peek')} className="h-12 w-12 shrink-0 rounded-full bg-sky-100 text-lg font-black text-sky-900"
            data-testid="peek-card" onClick={() => setCard(word as Word)}>ⓘ</button>
        )}
        {heartsOn && <span className="pill text-bad !shadow-none">❤ {hearts}</span>}
        <CornerAnimal mood={mood} />
      </header>

      <main className="flex-1 overflow-y-auto px-4 pb-44 pt-6">
        <AnimatePresence mode="wait">
          <motion.div key={ex.id} className="panel" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.18 }}>
            <ExerciseView ex={ex} locked={phase === 'feedback'} outcome={outcome} onReady={onReady} onSubmit={commit} say={say} sayParts={sayParts} lang={lang} />
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className={`fixed inset-x-0 bottom-0 z-30 rounded-t-3xl border-t-4 shadow-soft ${feedback ? (outcome.correct ? 'border-green-200 bg-good-soft' : 'border-red-200 bg-bad-soft') : 'border-slate-100 bg-paper'}`}>
        <div className="mx-auto max-w-lg px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
          {feedback ? (
            <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} data-testid="feedback">
              <div className="mb-3 flex items-start justify-between gap-3">
                <FeedbackBody outcome={outcome} />
                {word && (
                  <button aria-label={t('lesson.replay')} className="rounded-xl bg-white/70 px-3 py-2 text-2xl" onClick={() => say(word.term)}>🔊</button>
                )}
              </div>
              <button className={`btn w-full ${outcome.correct ? 'btn-good' : 'btn-bad'}`} onClick={next} autoFocus data-testid="continue">{t('lesson.continue')}</button>
            </motion.div>
          ) : (
            <button className="btn btn-primary w-full" disabled={!canCheck} onClick={check} data-testid="check">{t('lesson.check')}</button>
          )}
        </div>
      </footer>

      <Sheet open={card !== null} onClose={() => setCard(null)}>
        {card && (
          <div>
            <ConjCard word={card} />
            <button className="btn btn-primary mt-4 w-full" onClick={() => setCard(null)} data-testid="card-close">{t('common.close')}</button>
          </div>
        )}
      </Sheet>
      <Confirm open={exit} text={t('lesson.exitConfirm')} onYes={() => nav('/')} onNo={() => setExit(false)} />
    </div>
  )
}
