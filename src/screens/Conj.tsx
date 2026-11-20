/** "Conjugare": one verb, all 6 persons, three stages (guided / all forms / typing). */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  PERSONS, answerItem, buildStageItems, currentItem, runFinished, startRun,
  type ConjItem, type ConjRun, type Stage,
} from '../core/conjugation'
import { verbCrown } from '../core/gamification'
import { uid } from '../core/id'
import type { LessonResultItem } from '../core/lesson'
import { personStrengths } from '../core/srs'
import type { ExerciseType, Word, WordProgress } from '../core/types'
import { ConjRow } from '../components/ConjRow'
import { Crowns } from '../components/ui'
import { CelebratingPair, CelebrationLayer, CornerAnimal } from '../components/ZoneScreen'
import { useReactionMood, type Verdict } from '../components/useReactionMood'
import { db } from '../data/db'
import { useProfile } from '../data/profile-context'
import { finishLesson, type FinishOutput } from '../data/service'
import { t, type Key } from '../i18n'
import { playSfx } from '../lib/sound'

const STAGE_TYPE: Record<Stage, ExerciseType> = { 1: 'conj_dropdown', 2: 'conj_dropdown_all', 3: 'conj_typing' }

type Phase = 'loading' | 'menu' | 'run' | 'saving' | 'result'

export default function Conj() {
  const { deckId = '', wordId = '' } = useParams()
  const nav = useNavigate()
  const { profile } = useProfile()
  const [phase, setPhase] = useState<Phase>('loading')
  const [verb, setVerb] = useState<Word | null>(null)
  const [deckWords, setDeckWords] = useState<Word[]>([])
  const [prog, setProg] = useState<WordProgress | undefined>()
  const [stage, setStage] = useState<Stage>(1)
  const [run, setRun] = useState<ConjRun | null>(null)
  const [cardOpen, setCardOpen] = useState(false)
  const [outcome, setOutcome] = useState<{ out: FinishOutput; firstTry: number } | null>(null)
  const [verdict, setVerdict] = useState<Verdict>(null)
  const mood = useReactionMood(verdict)
  const sessionId = useRef(uid())
  const started = useRef(0)

  const load = useCallback(async () => {
    const ws = await db.words.where('deckId').equals(deckId).toArray()
    setDeckWords(ws)
    setVerb(ws.find((w) => w.id === wordId) ?? null)
    setProg(await db.progress.get([profile.id, wordId]))
    setPhase('menu')
  }, [deckId, wordId, profile.id])
  useEffect(() => {
    void load()
  }, [load])

  const start = (s: Stage) => {
    if (!verb) return
    setStage(s)
    setCardOpen(false)
    setRun(startRun(buildStageItems(verb, deckWords, s)))
    sessionId.current = uid()
    started.current = Date.now()
    setPhase('run')
  }

  const finish = useCallback(async (final: ConjRun, s: Stage) => {
    if (!verb) return
    setPhase('saving')
    const results: LessonResultItem[] = final.attempts.map((a) => ({
      wordId: verb.id, type: STAGE_TYPE[s], correct: a.correct, credits: [{ skill: 'forms', correct: a.correct, person: a.person }],
    }))
    const out = await finishLesson({
      profileId: profile.id, deckId, sessionId: sessionId.current, results, startedAt: started.current, now: Date.now(), mode: 'unit', heartsLost: 0,
    })
    const firstTry = [0, 1, 2, 3, 4, 5].filter((p) => final.personOk[p] === true).length
    setProg(await db.progress.get([profile.id, verb.id]))
    setOutcome({ out, firstTry })
    setPhase('result')
    playSfx('finish', profile.settings.sound)
  }, [verb, profile.id, profile.settings.sound, deckId])

  const onDone = (correct: boolean) => {
    if (!run) return
    const next = answerItem(run, correct)
    setRun(next)
    if (runFinished(next)) void finish(next, stage)
  }

  const strengths = useMemo(() => (prog ? personStrengths(prog, Date.now()) : [0, 0, 0, 0, 0, 0]), [prog])

  if (phase === 'loading' || phase === 'saving') return <div className="flex h-full items-center justify-center font-bold">{t('app.loading')}</div>
  if (!verb || !verb.verb?.present) {
    return (
      <div className="p-6 text-center">
        <p className="mb-4">{t('conj.noVerbs')}</p>
        <button className="btn btn-ghost" onClick={() => nav(-1)}>{t('common.back')}</button>
      </div>
    )
  }

  if (phase === 'run' && run) {
    const item = currentItem(run) as ConjItem
    const total = run.queue.length
    return (
      <div className="mx-auto flex h-full max-w-lg flex-col">
        <header className="ex-bar">
          <button aria-label={t('lesson.exit')} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl font-black text-slate-600" onClick={() => setPhase('menu')}>✕</button>
          <div className="h-4 flex-1 overflow-hidden rounded-full bg-slate-200" role="progressbar">
            <div className="h-full rounded-full bg-good transition-all" style={{ width: `${Math.max(4, (run.cursor / total) * 100)}%` }} />
          </div>
          <span className="text-sm font-black text-slate-600">{verb.term}</span>
          <CornerAnimal mood={mood} />
        </header>
        <main className="flex-1 overflow-y-auto px-4 pb-10 pt-6">
          <div className="panel">
          <h2 className="mb-4 text-lg font-black text-slate-600">{t(`conj.stage${stage}` as Key)}</h2>
          {stage !== 1 && (
            <button className="btn btn-ghost mb-3 !px-3 !py-1.5 !text-sm" onClick={() => setCardOpen((v) => !v)} data-testid="toggle-card">
              {cardOpen ? t('conj.hideCard') : t('conj.showCard')}
            </button>
          )}
          <ConjRow key={item.id + run.cursor} item={item} verb={verb} showCard={stage === 1 || cardOpen} onDone={(c) => onDone(c)} onVerdict={setVerdict} />
          </div>
        </main>
      </div>
    )
  }

  if (phase === 'result' && outcome) {
    return (
      <div className="panel screen-panel flex flex-col items-center justify-center gap-3 !p-6 text-center" data-testid="conj-result">
        <CelebrationLayer />
        <CelebratingPair size={84} />
        <h1 className="text-2xl font-black">{t('conj.done')}</h1>
        <p className="font-bold text-slate-600">{t('conj.firstTry', { n: outcome.firstTry })}</p>
        <p className="font-bold text-brand">+{outcome.out.xp + outcome.out.bonusXp} XP</p>
        <div className="mt-2 flex w-full gap-3">
          <button className="btn btn-ghost flex-1" onClick={() => setPhase('menu')} data-testid="conj-back">{t('conj.backToPath')}</button>
          <button className="btn btn-primary flex-1" onClick={() => nav('/')}>{t('summary.home')}</button>
        </div>
      </div>
    )
  }

  const tier = verbCrown(strengths)
  return (
    <div className="panel screen-panel overflow-y-auto !p-5 pb-12" data-testid="conj-menu">
      <button className="mb-2 text-sm font-bold text-brand" onClick={() => nav(-1)}>← {t('common.back')}</button>
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-2xl font-black">{t('conj.title')} · {verb.term}</h1>
        <Crowns tier={tier} size={22} />
      </div>
      <p className="mb-4 text-slate-500">{verb.translations.join(' | ')}</p>
      <div className="mb-3 grid grid-cols-3 gap-2" role="tablist" aria-label={t('conj.title')}>
        {([1, 2, 3] as const).map((s) => (
          <button key={s} role="tab" aria-selected={stage === s} onClick={() => setStage(s)} data-testid={`stage-${s}`}
            className={`rounded-2xl border-2 px-2 py-2 text-sm font-black ${stage === s ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-700'}`}>
            {t(`conj.stageShort${s}` as Key)}
          </button>
        ))}
      </div>
      <div className="card">
        <p className="font-black">{t(`conj.stage${stage}` as Key)}</p>
        <p className="mb-3 text-sm text-slate-500">{t(`conj.stage${stage}.d` as Key)}</p>
        <button className="btn btn-primary w-full" onClick={() => start(stage)} data-testid={`start-stage-${stage}`}>{t('conj.start')}</button>
      </div>
      <section className="card mt-4">
        <p className="mb-2 text-sm font-black">{t('conj.dots')}</p>
        <ul className="grid grid-cols-6 gap-1 text-center text-[11px] font-bold text-slate-500">
          {PERSONS.map((p, i) => (
            <li key={p}>
              <span className={`mx-auto mb-1 block h-4 w-4 rounded-full ${strengths[i]! >= 70 ? 'bg-green-500' : strengths[i]! >= 40 ? 'bg-amber-400' : strengths[i]! > 0 ? 'bg-red-400' : 'bg-slate-200'}`} />
              {p}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
