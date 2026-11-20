/** "Toate verbele": 20 random (verb, person) pairs from the verbs learned so far. */
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PERSONS, allFormsFor, pickPairs, type ConjItem, type Pair } from '../core/conjugation'
import { uid } from '../core/id'
import type { LessonResultItem } from '../core/lesson'
import { effectiveLevel } from '../core/srs'
import type { ExerciseType, Word, WordProgress } from '../core/types'
import { ConjRow } from '../components/ConjRow'
import { Mascot } from '../components/ui'
import { CornerAnimal } from '../components/ZoneScreen'
import { useReactionMood, type Verdict } from '../components/useReactionMood'
import { db } from '../data/db'
import { useProfile } from '../data/profile-context'
import { finishLesson, type FinishOutput } from '../data/service'
import { t } from '../i18n'
import { playSfx } from '../lib/sound'

type Phase = 'loading' | 'intro' | 'run' | 'saving' | 'result'

export default function AllVerbs() {
  const { deckId = '' } = useParams()
  const nav = useNavigate()
  const { profile } = useProfile()
  const [phase, setPhase] = useState<Phase>('loading')
  const [verdict, setVerdict] = useState<Verdict>(null)
  const mood = useReactionMood(verdict)
  const [verbs, setVerbs] = useState<Word[]>([])
  const [seen, setSeen] = useState<Word[]>([])
  const [all, setAll] = useState<Word[]>([])
  const [items, setItems] = useState<ConjItem[]>([])
  const [pairs, setPairs] = useState<Pair[]>([])
  const [i, setI] = useState(0)
  const [grid, setGrid] = useState<Map<string, boolean>>(new Map())
  const [levels, setLevels] = useState<Map<string, number>>(new Map())
  const [result, setResult] = useState<FinishOutput | null>(null)
  const results = useRef<LessonResultItem[]>([])
  const started = useRef(0)
  const sessionId = useRef(uid())

  useEffect(() => {
    void (async () => {
      const ws = (await db.words.where('deckId').equals(deckId).toArray()).sort((a, b) => a.order - b.order)
      const vs = ws.filter((w) => !!w.verb?.present)
      const prog = new Map<string, WordProgress>((await db.progress.where('profileId').equals(profile.id).toArray()).map((p) => [p.wordId, p]))
      setAll(ws)
      setVerbs(vs)
      setSeen(vs.filter((v) => (prog.get(v.id)?.persons?.length ?? 0) > 0 || (prog.get(v.id)?.level ?? 0) > 0))
      setPhase('intro')
      setLevels(new Map(vs.map((v) => [v.id, prog.get(v.id) ? effectiveLevel(prog.get(v.id) as WordProgress) : 0])))
    })()
  }, [deckId, profile.id])

  const start = () => {
    const ps = pickPairs((seen.length ? seen : verbs).map((v) => v.id))
    let n = 0
    const list: ConjItem[] = ps.map((p) => {
      const v = verbs.find((x) => x.id === p.verbId) as Word
      const answer = (v.verb?.present as string[])[p.person] as string
      const typing = (levels.get(v.id) ?? 0) >= 3
      return {
        id: `a${n++}`, person: p.person, kind: typing ? 'typing' : 'dropdownAll', prompt: `${PERSONS[p.person]} ___ (${v.term})`,
        ...(typing ? {} : { options: allFormsFor(v, all).sort(() => Math.random() - 0.5) }), answer,
      }
    })
    setPairs(ps)
    setItems(list)
    results.current = []
    setGrid(new Map())
    setI(0)
    started.current = Date.now()
    setPhase('run')
  }

  const finish = async (g: Map<string, boolean>) => {
    setPhase('saving')
    const out = await finishLesson({
      profileId: profile.id, deckId, sessionId: sessionId.current, results: results.current, startedAt: started.current, now: Date.now(), mode: 'unit', heartsLost: 0,
    })
    setGrid(g)
    setResult(out)
    setPhase('result')
    playSfx('finish', profile.settings.sound)
  }

  const onDone = (correct: boolean) => {
    const p = pairs[i] as Pair
    const type: ExerciseType = (items[i] as ConjItem).kind === 'typing' ? 'conj_typing' : 'conj_dropdown_all'
    results.current.push({ wordId: p.verbId, type, correct, credits: [{ skill: 'forms', correct, person: p.person }] })
    const key = `${p.verbId}:${p.person}`
    const g = new Map(grid)
    g.set(key, (g.get(key) ?? true) && correct)
    setGrid(g)
    if (i + 1 >= items.length) void finish(g)
    else setI(i + 1)
  }

  if (phase === 'loading' || phase === 'saving') return <div className="flex h-full items-center justify-center font-bold">{t('app.loading')}</div>
  if (phase === 'intro') {
    return (
      <div className="panel screen-panel flex flex-col items-center justify-center gap-4 !p-6 text-center" data-testid="allverbs-intro">
        <Mascot size={100} />
        <h1 className="text-2xl font-black">{t('conj.allVerbs')}</h1>
        <p className="text-slate-600">{verbs.length === 0 ? t('conj.noVerbs') : t('conj.allVerbsHelp')}</p>
        <div className="flex w-full gap-3">
          <button className="btn btn-ghost flex-1" onClick={() => nav(-1)}>{t('common.back')}</button>
          <button className="btn btn-primary flex-1" disabled={verbs.length === 0} onClick={start} data-testid="allverbs-start">{t('drill.start')}</button>
        </div>
      </div>
    )
  }
  if (phase === 'result' && result) {
    const rowVerbs = [...new Set(pairs.map((p) => p.verbId))].map((id) => verbs.find((v) => v.id === id) as Word)
    return (
      <div className="panel screen-panel overflow-y-auto !p-5 pb-12" data-testid="allverbs-result">
        <h1 className="mb-1 text-2xl font-black">{t('conj.allVerbs')}</h1>
        <p className="mb-4 font-bold text-brand">+{result.xp + result.bonusXp} XP · {Math.round(result.accuracy * 100)}%</p>
        <h2 className="mb-2 font-black">{t('conj.grid')}</h2>
        <div className="overflow-x-auto rounded-2xl border-2 border-slate-100 bg-white">
          <table className="w-full text-center text-sm" data-testid="verb-grid">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr><th className="p-2 text-left">&nbsp;</th>{PERSONS.map((p) => <th key={p} className="p-2">{p}</th>)}</tr>
            </thead>
            <tbody>
              {rowVerbs.map((v) => (
                <tr key={v.id} className="border-t border-slate-100">
                  <td className="p-2 text-left font-black">{v.term}</td>
                  {PERSONS.map((_, p) => {
                    const r = grid.get(`${v.id}:${p}`)
                    return (
                      <td key={p} className={`p-2 font-black ${r === undefined ? 'text-slate-300' : r ? 'bg-good-soft text-good' : 'bg-bad-soft text-bad'}`} data-state={r === undefined ? 'none' : r ? 'ok' : 'bad'}>
                        {r === undefined ? '·' : r ? '✓' : '✗'}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="btn btn-primary mt-4 w-full" onClick={() => nav('/')}>{t('summary.home')}</button>
      </div>
    )
  }
  const item = items[i]
  const verb = item ? (verbs.find((v) => v.id === (pairs[i] as Pair).verbId) as Word) : null
  if (!item || !verb) return null
  return (
    <div className="mx-auto flex h-full max-w-lg flex-col">
      <header className="ex-bar">
        <button aria-label={t('lesson.exit')} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl font-black text-slate-600" onClick={() => nav(-1)}>✕</button>
        <div className="h-4 flex-1 overflow-hidden rounded-full bg-slate-200" role="progressbar">
          <div className="h-full rounded-full bg-good transition-all" style={{ width: `${Math.max(4, (i / items.length) * 100)}%` }} />
        </div>
        <span className="text-sm font-black text-slate-600">{i + 1}/{items.length}</span>
        <CornerAnimal mood={mood} />
      </header>
      <main className="flex-1 overflow-y-auto px-4 pb-10 pt-6">
        <div className="panel">
        <p className="mb-3 text-lg font-black text-slate-600">{verb.term}</p>
        <ConjRow key={item.id} item={item} verb={verb} onDone={(c) => onDone(c)} onVerdict={setVerdict} />
        </div>
      </main>
    </div>
  )
}
