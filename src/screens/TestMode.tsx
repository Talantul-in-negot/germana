/**
 * "Test lecție": every word is checked DE→RO, RO→DE and (when an example exists) in context.
 * No hints, no retries, no hearts, no feedback until the end. Attempts are saved per lesson.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  buildExercise, contextOf, hasMaskableExample, isSetComplete, setWordsOf, type Exercise, type Outcome,
} from '../core/exercises'
import { PERSONS } from '../core/conjugation'
import { SEQ_SETS } from '../core/german'
import { seededRng, shuffle } from '../core/id'
import type { TestExtra, TestResult, TestWordResult, Word } from '../core/types'
import { ExerciseView } from '../components/exercises/ExerciseView'
import { Term } from '../components/Term'
import { Confirm } from '../components/ui'
import { db } from '../data/db'
import { useProfile } from '../data/profile-context'
import { testsFor } from '../data/repo'
import { finishTest, groupScores, VERIFIED_AT } from '../data/service'
import { t, type Key } from '../i18n'

type Dir = 'deToRo' | 'roToDe' | 'context'
interface Item {
  ex: Exercise
  word?: Word
  dir?: Dir
  /** present-tense person typed in this item (verbs) */
  person?: number
  /** set tag for a sequence extra */
  set?: string
}

export function buildTestItems(words: Word[], rng: () => number = Math.random): Item[] {
  let n = 0
  const ctx = { deckWords: words, rng, newId: () => `t${n++}`, level: 5 }
  const items: Item[] = []
  for (const w of words) {
    items.push({ ex: buildExercise(w, 'type_l2_l1', ctx), word: w, dir: 'deToRo' })
    items.push({ ex: buildExercise(w, 'type_l1_l2', ctx), word: w, dir: 'roToDe' })
    // verbs with a table: all 6 persons are typed (no card, no dropdown)
    if (w.verb?.present) for (let p = 0; p < 6; p++) items.push({ ex: buildExercise(w, 'verb_pronoun_type', { ...ctx, person: p }), word: w, person: p })
    if (words.length >= 4 && contextOf(w)) items.push({ ex: buildExercise(w, 'context_choice', ctx), word: w, dir: 'context' })
    else if (words.length >= 3 && hasMaskableExample(w)) items.push({ ex: buildExercise(w, 'fill_blank', ctx), word: w, dir: 'context' })
  }
  const shuffled = shuffle(items, rng)
  for (const set of SEQ_SETS) {
    if (!isSetComplete(words, set)) continue
    const target = setWordsOf(words, set)[0] as Word
    shuffled.push({ ex: buildExercise(target, 'seq_order', ctx), set: set.tag })
  }
  return shuffled
}

export function ResultView({ result, words }: { result: TestResult; words: Word[] }) {
  const groups = groupScores(result.words)
  const wordOf = new Map(words.map((w) => [w.id, w]))
  const mark = (d: TestWordResult['deToRo']) =>
    d === null ? <span className="text-slate-300">—</span> : <span className={d.ok ? 'font-black text-good' : 'font-black text-bad'}>{d.ok ? '✓' : '✗'}</span>
  const cell = (d: TestWordResult['deToRo']) => (d && !d.ok ? <div className="text-xs"><span className="text-bad">{d.given || '…'}</span> → <b>{d.expected}</b></div> : null)
  return (
    <div data-testid="test-result">
      <div className="card text-center">
        <p className="text-4xl font-black" data-testid="test-score">{Math.round(result.score * 100)}%</p>
        <p className="text-sm font-bold text-slate-500">{t('test.score')}: {result.correct}/{result.total} · {result.date}</p>
        <p className={`mt-2 font-black ${result.verified ? 'text-good' : 'text-amber-700'}`} data-testid="test-verdict">
          {result.verified ? t('test.verified') : t('test.notVerified')}
        </p>
      </div>
      {groups.length > 0 && (
        <div className="card mt-3" data-testid="group-scores">
          <p className="mb-2 font-black">{t('test.groups')}</p>
          <ul className="grid gap-1">
            {groups.map((g) => (
              <li key={g.group} className="flex justify-between text-sm font-bold">
                <span>{g.group}</span>
                <span>{g.correct}/{g.total} · {g.total ? Math.round((g.correct / g.total) * 100) : 0}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {(result.extras ?? []).map((x, i) => (
        <div key={i} className="card mt-3 flex items-center justify-between text-sm font-bold" data-testid="test-extra">
          <span>{t('test.sequence', { set: t(`test.set.${x.set}` as Key) })}</span>
          <span className={x.ok ? 'text-good' : 'text-bad'}>{x.ok ? '✓' : `✗ ${x.given}`}</span>
        </div>
      ))}
      <div className="card mt-3 overflow-x-auto !p-0">
        <table className="w-full text-left text-sm" data-testid="test-table">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="p-2">{t('test.words')}</th>
              <th className="p-2">{t('test.dir.deRo')}</th>
              <th className="p-2">{t('test.dir.roDe')}</th>
              <th className="p-2">{t('test.dir.context')}</th>
              {result.words.some((w) => w.persons?.length) && <th className="p-2">{t('test.persons')}</th>}
            </tr>
          </thead>
          <tbody>
            {result.words.map((w) => (
              <tr key={w.wordId} className="border-t border-slate-100 align-top">
                <td className="p-2 font-bold">{wordOf.get(w.wordId) ? <Term text={w.term} /> : w.term}</td>
                <td className="p-2">{mark(w.deToRo)}{cell(w.deToRo)}</td>
                <td className="p-2">{mark(w.roToDe)}{cell(w.roToDe)}</td>
                <td className="p-2">{mark(w.context)}{cell(w.context)}</td>
                {result.words.some((x) => x.persons?.length) && (
                  <td className="p-2" data-testid="persons-cell">
                    {w.persons?.length ? (
                      <ul className="grid gap-0.5 text-xs">
                        {PERSONS.map((p, i) => {
                          const d = w.persons?.[i]
                          return (
                            <li key={p}>
                              {d ? <span className={d.ok ? 'font-black text-good' : 'font-black text-bad'}>{d.ok ? '✓' : '✗'}</span> : '—'} {p}
                              {d && !d.ok ? <> <span className="text-bad">{d.given || '…'}</span> → <b>{d.expected}</b></> : null}
                            </li>
                          )
                        })}
                      </ul>
                    ) : null}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-slate-500">{t('test.failedBack')}</p>
    </div>
  )
}

type Phase = 'loading' | 'intro' | 'running' | 'saving' | 'result'

export default function TestMode() {
  const { deckId = '' } = useParams()
  const nav = useNavigate()
  const { profile } = useProfile()
  const [phase, setPhase] = useState<Phase>('loading')
  const [words, setWords] = useState<Word[]>([])
  const [deckName, setDeckName] = useState('')
  const [items, setItems] = useState<Item[]>([])
  const [i, setI] = useState(0)
  const [canCheck, setCanCheck] = useState(false)
  const [result, setResult] = useState<TestResult | null>(null)
  const [history, setHistory] = useState<TestResult[]>([])
  const [exit, setExit] = useState(false)
  const checkRef = useRef<(() => Outcome) | null>(null)
  const answers = useRef<{ it: Item; o: Outcome }[]>([])

  const load = useCallback(async () => {
    const all = (await db.words.where('deckId').equals(deckId).toArray()).sort((a, b) => a.order - b.order)
    setWords(all)
    setDeckName((await db.decks.get(deckId))?.name ?? '')
    setHistory(await testsFor(profile.id, deckId))
    setPhase('intro')
  }, [deckId, profile.id])
  useEffect(() => {
    void load()
  }, [load])

  const onReady = useCallback((fn: (() => Outcome) | null) => {
    checkRef.current = fn
    setCanCheck(fn !== null)
  }, [])
  const noSay = useCallback(() => undefined, [])

  const start = () => {
    answers.current = []
    setItems(buildTestItems(words, seededRng(Date.now() % 100000)))
    setI(0)
    setPhase('running')
  }

  const finish = useCallback(async () => {
    setPhase('saving')
    const byWord = new Map<string, TestWordResult>()
    const extras: TestExtra[] = []
    for (const { it, o } of answers.current) {
      const rec = { ok: o.correct, given: o.given ?? '', expected: o.expected }
      if (it.word && it.person !== undefined) {
        const cur = byWord.get(it.word.id) ?? {
          wordId: it.word.id, term: it.word.term, deToRo: null, roToDe: null, context: null,
          ...(it.word.group ? { group: it.word.group } : {}),
        }
        const persons = cur.persons ? cur.persons.slice() : []
        persons[it.person] = rec
        cur.persons = persons
        byWord.set(it.word.id, cur)
      } else if (it.word && it.dir) {
        const cur = byWord.get(it.word.id) ?? {
          wordId: it.word.id, term: it.word.term, deToRo: null, roToDe: null, context: null,
          ...(it.word.group ? { group: it.word.group } : {}),
        }
        cur[it.dir] = rec
        byWord.set(it.word.id, cur)
      } else if (it.set) {
        extras.push({ key: 'sequence', set: it.set, ...rec })
      }
    }
    const list = words.map((w) => byWord.get(w.id)).filter((x): x is TestWordResult => !!x)
    const saved = await finishTest({ profileId: profile.id, deckId, words: list, extras, now: Date.now() })
    setResult(saved)
    setHistory(await testsFor(profile.id, deckId))
    setPhase('result')
  }, [words, profile.id, deckId])

  const next = useCallback(() => {
    const fn = checkRef.current
    const it = items[i]
    if (!fn || !it) return
    const o = fn()
    answers.current.push({ it, o })
    checkRef.current = null
    setCanCheck(false)
    if (i + 1 >= items.length) void finish()
    else setI(i + 1)
  }, [items, i, finish])

  useEffect(() => {
    if (phase !== 'running') return
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.repeat && checkRef.current) next()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [phase, next])

  if (phase === 'loading' || phase === 'saving') return <div className="flex h-full items-center justify-center font-bold">{t('app.loading')}</div>

  if (phase === 'intro' || phase === 'result') {
    return (
      <div className="mx-auto h-full max-w-lg overflow-y-auto p-5 pb-12">
        <button className="mb-2 text-sm font-bold text-brand" onClick={() => nav('/decks')}>← {t('common.back')}</button>
        <h1 className="text-2xl font-black">{t('test.title')}</h1>
        <p className="mb-4 text-slate-600">{deckName}</p>
        {words.length === 0 ? (
          <p>{t('test.empty')}</p>
        ) : (
          <>
            {phase === 'intro' && <p className="mb-4 rounded-2xl bg-brand-soft p-4 font-bold">{t('test.intro')}</p>}
            {result && phase === 'result' && <ResultView result={result} words={words} />}
            <button className="btn btn-primary mt-4 w-full" onClick={start} data-testid="test-start">{phase === 'result' ? t('test.again') : t('test.start')}</button>
            <h2 className="mb-2 mt-6 font-black">{t('test.history')}</h2>
            {history.length === 0 && <p className="text-sm text-slate-500">{t('test.noHistory')}</p>}
            <ul className="grid gap-2" data-testid="test-history">
              {history.map((h) => (
                <li key={h.id} className="card !p-3">
                  <details>
                    <summary className="flex cursor-pointer items-center justify-between font-bold">
                      <span>{new Date(h.ts).toLocaleString('ro-RO')}</span>
                      <span className={h.verified ? 'text-good' : 'text-slate-600'}>{Math.round(h.score * 100)}% {h.verified ? '✓' : ''}</span>
                    </summary>
                    <div className="mt-3"><ResultView result={h} words={words} /></div>
                  </details>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-slate-400">≥ {Math.round(VERIFIED_AT * 100)}% = {t('decks.verified')}</p>
          </>
        )}
      </div>
    )
  }

  const item = items[i]
  if (!item) return null
  return (
    <div className="mx-auto flex h-full max-w-lg flex-col">
      <header className="flex items-center gap-3 px-4 pt-4">
        <button aria-label={t('lesson.exit')} className="text-2xl font-black text-slate-400" onClick={() => setExit(true)}>✕</button>
        <div className="h-4 flex-1 overflow-hidden rounded-full bg-slate-200" role="progressbar">
          <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${Math.max(4, (i / items.length) * 100)}%` }} />
        </div>
        <span className="text-sm font-black text-slate-500">{t('test.progress', { i: i + 1, n: items.length })}</span>
      </header>
      <main className="flex-1 overflow-y-auto px-4 pb-32 pt-6">
        <ExerciseView key={item.ex.id} ex={item.ex} locked={false} outcome={null} onReady={onReady} onSubmit={() => undefined} say={noSay} />
      </main>
      <footer className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-slate-100 bg-paper">
        <div className="mx-auto max-w-lg px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
          <button className="btn btn-primary w-full" disabled={!canCheck} onClick={next} data-testid="test-next">
            {i + 1 >= items.length ? t('test.finish') : t('test.next')}
          </button>
        </div>
      </footer>
      <Confirm open={exit} text={t('lesson.exitConfirm')} onYes={() => nav('/decks')} onNo={() => setExit(false)} />
    </div>
  )
}
