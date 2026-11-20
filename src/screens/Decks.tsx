import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Confirm, LevelBar } from '../components/ui'
import { useProgressMap } from '../data/hooks'
import { db } from '../data/db'
import { useProfile } from '../data/profile-context'
import { deleteDeck, setMeta } from '../data/repo'
import { t } from '../i18n'
import type { Deck } from '../core/types'

export function deckLevelCounts(wordIds: string[], levelOf: (id: string) => number): number[] {
  const c = [0, 0, 0, 0, 0, 0]
  for (const id of wordIds) c[levelOf(id)] = (c[levelOf(id)] ?? 0) + 1
  return c
}

export default function Decks() {
  const { profile } = useProfile()
  const data = useLiveQuery(async () => ({ decks: await db.decks.toArray(), words: await db.words.toArray() }), [])
  const progress = useProgressMap(profile.id)
  const [del, setDel] = useState<Deck | null>(null)
  if (!data || !progress) return null

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-black">{t('decks.title')}</h1>
        <Link to="/decks/new" className="btn btn-primary !px-4 !py-2" data-testid="new-deck">+ {t('decks.new')}</Link>
      </div>
      {data.decks.length === 0 && <p className="py-10 text-center text-slate-500">{t('decks.empty')}</p>}
      <ul className="grid gap-3">
        {data.decks.map((d) => {
          const ws = data.words.filter((w) => w.deckId === d.id)
          const counts = deckLevelCounts(ws.map((w) => w.id), (id) => progress.get(id)?.level ?? 0)
          const mastered = ws.length ? Math.round(((counts[5] ?? 0) / ws.length) * 100) : 0
          return (
            <li key={d.id} className="card">
              <Link to={`/decks/${d.id}`} className="block">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-black">{d.name}</h2>
                  <span className="text-sm font-bold text-slate-500">{t('common.words', { n: ws.length })}</span>
                </div>
                <p className="mb-2 text-sm font-bold text-brand">{t('decks.mastered', { p: mastered })}</p>
                <LevelBar counts={counts} />
              </Link>
              <div className="mt-3 flex gap-2">
                <button className="btn btn-ghost !px-3 !py-1.5 !text-sm" onClick={() => void setMeta('activeDeckId', d.id)}>{t('decks.setActive')}</button>
                <button className="btn btn-ghost !px-3 !py-1.5 !text-sm text-bad" onClick={() => setDel(d)}>{t('common.delete')}</button>
              </div>
            </li>
          )
        })}
      </ul>
      <Confirm open={!!del} text={del ? t('decks.deleteConfirm', { name: del.name }) : ''} onNo={() => setDel(null)}
        onYes={() => { if (del) void deleteDeck(del.id); setDel(null) }} />
    </div>
  )
}
