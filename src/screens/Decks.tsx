import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { groupByCourse } from '../core/decks'
import { levelOf } from '../core/srs'
import type { Deck } from '../core/types'
import { Confirm, LevelBar } from '../components/ui'
import { db } from '../data/db'
import { useProgressMap } from '../data/hooks'
import { useProfile } from '../data/profile-context'
import { deleteDeck, setMeta } from '../data/repo'
import { isVerified } from '../data/service'
import { t } from '../i18n'

export function deckLevelCounts(wordIds: string[], levelOf: (id: string) => number): number[] {
  const c = [0, 0, 0, 0, 0, 0]
  for (const id of wordIds) c[levelOf(id)] = (c[levelOf(id)] ?? 0) + 1
  return c
}

export default function Decks() {
  const { profile } = useProfile()
  const nav = useNavigate()
  const data = useLiveQuery(async () => ({ decks: await db.decks.toArray(), words: await db.words.toArray(), tests: await db.tests.toArray() }), [])
  const progress = useProgressMap(profile.id)
  const [del, setDel] = useState<Deck | null>(null)
  if (!data || !progress) return null

  const hasKind = (d: Deck, kind: 'noun' | 'number') =>
    data.words.some((w) => w.deckId === d.id && (kind === 'noun' ? w.type === 'noun' && w.gender && !w.pluralOnly : w.value !== undefined))

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-black">{t('decks.title')}</h1>
        <Link to="/decks/new" className="btn btn-primary !px-4 !py-2" data-testid="new-deck">+ {t('decks.new')}</Link>
      </div>
      {data.decks.length === 0 && <p className="py-10 text-center text-slate-500">{t('decks.empty')}</p>}
      {groupByCourse(data.decks).map((g) => (
        <section key={g.course ?? 'none'} className="mb-5">
          <h2 className="mb-2 text-sm font-black uppercase tracking-wide text-slate-500">{g.course ?? t('decks.noCourse')}</h2>
          <ul className="grid gap-3">
            {g.decks.map((d) => {
              const ws = data.words.filter((w) => w.deckId === d.id)
              const counts = deckLevelCounts(ws.map((w) => w.id), (id) => levelOf(progress.get(id)))
              const mastered = ws.length ? Math.round(((counts[5] ?? 0) / ws.length) * 100) : 0
              const verified = isVerified(data.tests.filter((x) => x.profileId === profile.id && x.deckId === d.id))
              return (
                <li key={d.id} className="card" data-testid="deck-card">
                  <Link to={`/decks/${d.id}`} className="block">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-lg font-black">{d.name}</h3>
                      <span className="shrink-0 text-sm font-bold text-slate-500">{t('common.words', { n: ws.length })}</span>
                    </div>
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-extrabold">
                      <span className="text-sm text-brand">{t('decks.mastered', { p: mastered })}</span>
                      {d.cefr && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-sky-800">{d.cefr}</span>}
                      {d.lesson !== undefined && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{t('common.lessonShort', { n: d.lesson })}</span>}
                      {verified && <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-800" data-testid="verified">{t('decks.verified')}</span>}
                    </div>
                    <LevelBar counts={counts} />
                  </Link>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="btn btn-ghost !px-3 !py-1.5 !text-sm" onClick={() => void setMeta('activeDeckId', d.id).then(() => nav('/'))} data-testid="use-on-path">{t('decks.setActive')}</button>
                    <button className="btn btn-ghost !px-3 !py-1.5 !text-sm" onClick={() => nav(`/test/${d.id}`)} data-testid="test-btn">{t('decks.test')}</button>
                    {hasKind(d, 'noun') && <button className="btn btn-ghost !px-3 !py-1.5 !text-sm" onClick={() => nav(`/drill/${d.id}?kind=articles`)}>{t('decks.drillArticles')}</button>}
                    {hasKind(d, 'number') && <button className="btn btn-ghost !px-3 !py-1.5 !text-sm" onClick={() => nav(`/drill/${d.id}?kind=numbers`)}>{t('decks.drillNumbers')}</button>}
                    <button className="btn btn-ghost !px-3 !py-1.5 !text-sm text-bad" onClick={() => setDel(d)}>{t('common.delete')}</button>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
      <Confirm open={!!del} text={del ? t('decks.deleteConfirm', { name: del.name }) : ''} onNo={() => setDel(null)}
        onYes={() => { if (del) void deleteDeck(del.id); setDel(null) }} />
    </div>
  )
}
