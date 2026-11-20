import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { HEART_REFILL_MS, crownFor, refillHearts, unitMastery, unitStatus, type UnitStatus } from '../core/gamification'
import { isDue } from '../core/srs'
import { Crowns, Mascot, Sheet } from '../components/ui'
import { useDeckWords, useDecks, useMeta, useProgressMap } from '../data/hooks'
import { useProfile } from '../data/profile-context'
import { setMeta } from '../data/repo'
import { t } from '../i18n'

export default function Home() {
  const { profile } = useProfile()
  const nav = useNavigate()
  const decks = useDecks()
  const activeId = useMeta<string>('activeDeckId')
  const deck = decks?.find((d) => d.id === activeId) ?? decks?.[0]
  const words = useDeckWords(deck?.id)
  const progress = useProgressMap(profile.id)
  const [openUnit, setOpenUnit] = useState<number | null>(null)
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(i)
  }, [])

  const units = useMemo(() => {
    if (!words || !progress) return []
    const byUnit: number[][] = []
    const ids: string[][] = []
    for (const w of words) {
      ;(byUnit[w.unitIndex] ??= []).push(progress.get(w.id)?.level ?? 0)
      ;(ids[w.unitIndex] ??= []).push(w.id)
    }
    return byUnit.map((levels, i) => ({
      index: i, levels, size: levels.length,
      mastery: unitMastery(levels),
      status: unitStatus(byUnit, i),
    }))
  }, [words, progress])

  if (!decks || !words || !progress) return null

  if (!deck) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <Mascot size={120} />
        <p className="text-lg font-bold">{t('home.noDeck')}</p>
        <Link to="/decks/new" className="btn btn-primary">{t('home.import')}</Link>
      </div>
    )
  }

  const dueCount = [...progress.values()].filter((p) => words.some((w) => w.id === p.wordId) && isDue(p, now)).length
  const h = refillHearts(profile.hearts, profile.heartsAt, now)
  const heartsBlocked = profile.settings.hearts && h.hearts === 0
  const minsToHeart = Math.max(1, Math.ceil((h.heartsAt + HEART_REFILL_MS - now) / 60000))
  const sel = openUnit !== null ? units[openUnit] : undefined

  const start = (mode: 'unit' | 'weak' | 'review', unit = 0) => nav(`/lesson/${deck.id}?mode=${mode}&unit=${unit}`)

  return (
    <div>
      {decks.length > 1 && (
        <select className="input mb-3 !py-2 !text-base font-bold" value={deck.id} aria-label={t('decks.active')} onChange={(e) => void setMeta('activeDeckId', e.target.value)}>
          {decks.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      )}
      <div className="flex items-center gap-3 rounded-3xl bg-brand p-4 text-white">
        <Mascot size={64} />
        <div className="flex-1">
          <p className="text-lg font-black">{deck.name}</p>
          <p className="text-sm opacity-90">{t('common.words', { n: words.length })} · {t('common.units', { n: units.length })}</p>
        </div>
      </div>

      {heartsBlocked && <p className="mt-3 rounded-2xl bg-bad-soft p-3 text-sm font-bold text-red-900">{t('home.noHearts')} ({t('home.heartsIn', { m: minsToHeart })})</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        {dueCount > 0 && <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-extrabold text-amber-800">{t('home.dueWords', { n: dueCount })}</span>}
        <button className="btn btn-ghost !px-3 !py-1.5 !text-sm" onClick={() => start('weak')}>{t('home.practice')}</button>
        {profile.settings.hearts && <button className="btn btn-ghost !px-3 !py-1.5 !text-sm" onClick={() => start('review')}>{t('home.review')}</button>}
      </div>

      <ol className="relative mx-auto mt-6 flex max-w-xs flex-col items-center gap-6 pb-10" aria-label={t('home.title')}>
        {units.map((u, i) => {
          const offset = Math.round(Math.sin(i * 1.1) * 70)
          const crown = crownFor(u.mastery)
          const locked = u.status === 'locked'
          return (
            <li key={u.index} style={{ transform: `translateX(${offset}px)` }} className="flex flex-col items-center">
              <motion.button
                whileTap={{ scale: 0.92 }} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: Math.min(i, 8) * 0.04 }}
                disabled={locked} onClick={() => setOpenUnit(u.index)} data-testid={`unit-${u.index}`} data-status={u.status}
                className={`relative flex h-20 w-20 items-center justify-center rounded-full border-b-8 text-2xl font-black text-white ${nodeColor(u.status)}`}
                aria-label={`${t('home.unit', { n: u.index + 1 })} (${u.status})`}
              >
                {locked ? '🔒' : u.status === 'completed' ? '★' : u.index + 1}
                {u.status === 'active' && (
                  <motion.span className="absolute -top-2 rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-brand shadow" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 1.4 }}>
                    {t('home.start').toUpperCase()}
                  </motion.span>
                )}
              </motion.button>
              <div className="mt-1"><Crowns tier={crown} /></div>
              <p className="text-xs font-bold text-slate-500">{t('common.words', { n: u.size })}</p>
            </li>
          )
        })}
      </ol>

      <Sheet open={sel !== undefined} onClose={() => setOpenUnit(null)}>
        {sel && (
          <div>
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-xl font-black">{t('home.unit', { n: sel.index + 1 })}</h2>
              <Crowns tier={crownFor(sel.mastery)} size={22} />
            </div>
            <p className="mb-4 text-sm text-slate-500">{t(`home.crown.${crownFor(sel.mastery)}`)} · {Math.round(sel.mastery * 100)}%</p>
            <button className="btn btn-primary w-full" onClick={() => start('unit', sel.index)} data-testid="start-lesson">{t('home.start')}</button>
            <Link to={`/decks/${deck.id}`} className="mt-3 block text-center text-sm font-bold text-brand underline">{t('home.wordsInUnit')}</Link>
          </div>
        )}
      </Sheet>
    </div>
  )
}

function nodeColor(s: UnitStatus): string {
  if (s === 'locked') return 'bg-slate-300 border-slate-400'
  if (s === 'completed') return 'bg-amber-400 border-amber-600'
  return 'bg-brand border-brand-dark'
}
