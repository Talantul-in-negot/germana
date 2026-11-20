/** "Conjugare": one verb, all 6 persons, three stages (guided / all forms / typing). */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  PERSONS, answerItem, buildStageItems, canPassStage, currentItem, runFinished, stagePassed, stageUnlocked, stagesPassed, startRun,
  type ConjItem, type ConjRun, type Stage,
} from '../core/conjugation'
import { conjTier } from '../core/gamification'
import { uid } from '../core/id'
import type { LessonResultItem } from '../core/lesson'
import { dayKey, personStrengths } from '../core/srs'
import type { ExerciseType, Word, WordProgress } from '../core/types'
import { ConjRow } from '../components/ConjRow'
import { Crowns, Mascot } from '../components/ui'
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
  const [outcome, setOutcome] = useState<{ passedByRule: boolean; recorded: boolean; out: FinishOutput; firstTry: number } | null>(null)
  const sessionId = useRef(uid())
  const started = useRef(0)
  const today = dayKey(Date.now())

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
    setRun(startRun(buildStageItems(verb, deckWords, s)))
    sessionId.current = uid()
    started.current = Date.now()
    setPhase('run')
  }

  const finish = useCallback(async (final: ConjRun, s: Stage) => {
    if (!verb) return
    setPhase('saving')
    const passedByRule = stagePassed(final)
    const recorded = passedByRule && canPassStage(prog?.conj, s, today)
    const results: LessonResultItem[] = final.attempts.map((a) => ({
      wordId: verb.id, type: STAGE_TYPE[s], correct: a.correct, credits: [{ skill: 'forms', correct: a.correct, person: a.person }],
    }))
    const out = await finishLesson({
      profileId: profile.id, deckId, sessionId: sessionId.current, results, startedAt: started.current, now: Date.now(), mode: 'unit', heartsLost: 0,
      conj: { wordId: verb.id, stage: s, passed: recorded },
    })
    const firstTry = [0, 1, 2, 3, 4, 5].filter((p) => final.personOk[p] === true).length
    setProg(await db.progress.get([profile.id, verb.id]))
    setOutcome({ passedByRule, recorded, out, firstTry })
    setPhase('result')
    playSfx(passedByRule ? 'finish' : 'wrong', profile.settings.sound)
  }, [verb, prog, today, profile.id, profile.settings.sound, deckId])

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
        <header className="flex items-center gap-3 px-4 pt-4">
          <button aria-label={t('lesson.exit')} className="text-2xl font-black text-slate-400" onClick={() => setPhase('menu')}>✕</button>
          <div className="h-4 flex-1 overflow-hidden rounded-full bg-slate-200" role="progressbar">
            <div className="h-full rounded-full bg-good transition-all" style={{ width: `${Math.max(4, (run.cursor / total) * 100)}%` }} />
          </div>
          <span className="text-sm font-black text-slate-500">{verb.term}</span>
        </header>
        <main className="flex-1 overflow-y-auto px-4 pb-10 pt-6">
          <h2 className="mb-4 text-lg font-black text-slate-600">{t(`conj.stage${stage}` as Key)}</h2>
          <ConjRow key={item.id + run.cursor} item={item} verb={verb} showCard={stage === 1} onDone={(c) => onDone(c)} />
        </main>
      </div>
    )
  }

  if (phase === 'result' && outcome) {
    return (
      <div className="mx-auto flex h-full max-w-lg flex-col items-center justify-center gap-3 p-6 text-center" data-testid="conj-result">
        <Mascot size={100} mood={outcome.passedByRule ? 'cheer' : 'sad'} />
        <h1 className="text-2xl font-black">{outcome.recorded ? t('conj.passedNow') : outcome.passedByRule ? t('conj.sameDay') : t('conj.failedNow')}</h1>
        <p className="font-bold text-slate-600">{t('conj.firstTry', { n: outcome.firstTry })}</p>
        <p className="font-bold text-brand">+{outcome.out.xp + outcome.out.bonusXp} XP</p>
        <div className="mt-2 flex w-full gap-3">
          <button className="btn btn-ghost flex-1" onClick={() => setPhase('menu')} data-testid="conj-back">{t('conj.backToPath')}</button>
          <button className="btn btn-primary flex-1" onClick={() => nav('/')}>{t('summary.home')}</button>
        </div>
      </div>
    )
  }

  const passed = prog?.conj?.passed ?? [null, null, null]
  const tier = conjTier(stagesPassed(prog?.conj), strengths)
  return (
    <div className="mx-auto h-full max-w-lg overflow-y-auto p-5 pb-12" data-testid="conj-menu">
      <button className="mb-2 text-sm font-bold text-brand" onClick={() => nav(-1)}>← {t('common.back')}</button>
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-2xl font-black">{t('conj.title')} · {verb.term}</h1>
        <Crowns tier={tier} size={22} />
      </div>
      <p className="mb-4 text-slate-500">{verb.translations.join(' | ')}</p>
      <ul className="grid gap-3">
        {([1, 2, 3] as const).map((s) => {
          const unlocked = stageUnlocked(prog?.conj, s, today)
          const date = passed[s - 1]
          return (
            <li key={s} className="card" data-testid={`stage-${s}`} data-state={date ? 'passed' : unlocked ? 'open' : 'locked'}>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-black">{t(`conj.stage${s}` as Key)}</p>
                  <p className="text-sm text-slate-500">{t(`conj.stage${s}.d` as Key)}</p>
                  {date && <p className="text-xs font-bold text-good">✓ {t('conj.passedOn', { d: date })}</p>}
                  {!unlocked && <p className="text-xs font-bold text-amber-700">🔒 {s === 2 && !passed[0] ? t('conj.lockedPrev') : s === 3 && !passed[1] ? t('conj.lockedPrev') : t('conj.locked')}</p>}
                </div>
                <button className="btn btn-primary !px-4 !py-2" disabled={!unlocked} onClick={() => start(s)} data-testid={`start-stage-${s}`}>
                  {date ? t('conj.practice') : t('conj.start')}
                </button>
              </div>
            </li>
          )
        })}
      </ul>
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
