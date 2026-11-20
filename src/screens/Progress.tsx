import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ACHIEVEMENTS } from '../core/gamification'
import { DAY_MS, accuracyOf, dayKey, isDue, levelOf, needsPractice, wordStrengthAt } from '../core/srs'
import type { Word, WordProgress } from '../core/types'
import { LevelBadge, LevelBar, StrengthBar } from '../components/ui'
import { useAchievements, useDeckWords, useDecks, useMeta, useProgressMap, useSessions } from '../data/hooks'
import { useProfile } from '../data/profile-context'
import { sumXpByDay } from '../data/service'
import { setMeta } from '../data/repo'
import { t, type Key } from '../i18n'
import { deckLevelCounts } from './Decks'

type Filter = 'all' | 'due' | 'weak' | 'new' | 'mastered'
type Sort = 'weakest' | 'due' | 'level' | 'az' | 'list'

export function nextReviewLabel(p: WordProgress | undefined, now: number): string {
  if (!p || levelOf(p) === 0) return t('progress.newWord')
  if (now >= p.dueAt) {
    const days = Math.floor((now - p.dueAt) / DAY_MS)
    return days < 1 ? t('progress.dueNow') : t('progress.overdue', { n: days })
  }
  const days = Math.ceil((p.dueAt - now) / DAY_MS)
  return days <= 0 ? t('progress.today') : days === 1 ? t('progress.tomorrow') : t('progress.inDays', { n: days })
}

export function Heatmap({ xpByDay, goal, weeks = 17 }: { xpByDay: Map<string, number>; goal: number; weeks?: number }) {
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  const dow = (today.getDay() + 6) % 7 // Monday = 0
  const cells: { key: string; xp: number; future: boolean }[] = []
  const start = today.getTime() - ((weeks - 1) * 7 + dow) * DAY_MS
  for (let i = 0; i < weeks * 7; i++) {
    const ts = start + i * DAY_MS
    const key = dayKey(ts)
    cells.push({ key, xp: xpByDay.get(key) ?? 0, future: ts > today.getTime() })
  }
  const shade = (xp: number): string => {
    if (xp <= 0) return 'bg-slate-200'
    const r = xp / Math.max(goal, 1)
    return r < 0.5 ? 'bg-violet-200' : r < 1 ? 'bg-violet-400' : r < 2 ? 'bg-violet-600' : 'bg-violet-800'
  }
  return (
    <div>
      <div className="grid grid-flow-col grid-rows-7 gap-1" data-testid="heatmap">
        {cells.map((c) => (
          <div key={c.key} title={`${c.key}: ${c.xp} XP`} className={`aspect-square rounded-sm ${c.future ? 'opacity-0' : shade(c.xp)}`} />
        ))}
      </div>
      <div className="mt-2 flex items-center justify-end gap-1 text-xs text-slate-500">
        {t('progress.heatmapLess')}
        {['bg-slate-200', 'bg-violet-200', 'bg-violet-400', 'bg-violet-600', 'bg-violet-800'].map((c) => <i key={c} className={`h-3 w-3 rounded-sm ${c}`} />)}
        {t('progress.heatmapMore')}
      </div>
    </div>
  )
}

export default function Progress() {
  const { profile } = useProfile()
  const nav = useNavigate()
  const decks = useDecks()
  const activeId = useMeta<string>('activeDeckId')
  const deck = decks?.find((d) => d.id === activeId) ?? decks?.[0]
  const words = useDeckWords(deck?.id)
  const progress = useProgressMap(profile.id)
  const sessions = useSessions(profile.id)
  const unlocked = useAchievements(profile.id)
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<Sort>('weakest')
  const now = Date.now()

  const rows = useMemo(() => {
    if (!words || !progress) return []
    const list = words.map((w) => ({ w, p: progress.get(w.id) }))
    const keep = list.filter(({ p }) => {
      if (filter === 'due') return !!p && isDue(p, now)
      if (filter === 'weak') return !!p && needsPractice(p, now)
      if (filter === 'new') return levelOf(p) === 0
      if (filter === 'mastered') return levelOf(p) === 5
      return true
    })
    const str = (x: { p?: WordProgress }): number => (x.p ? wordStrengthAt(x.p, now) : -1)
    const cmp: Record<Sort, (a: { w: Word; p?: WordProgress }, b: { w: Word; p?: WordProgress }) => number> = {
      weakest: (a, b) => str(a) - str(b),
      due: (a, b) => (a.p?.dueAt || Infinity) - (b.p?.dueAt || Infinity),
      level: (a, b) => levelOf(b.p) - levelOf(a.p),
      az: (a, b) => a.w.term.localeCompare(b.w.term),
      list: (a, b) => a.w.order - b.w.order,
    }
    return keep.sort(cmp[sort])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words, progress, filter, sort])

  if (!decks || !words || !progress || !sessions || !unlocked) return null

  const counts = deckLevelCounts(words.map((w) => w.id), (id) => levelOf(progress.get(id)))
  const masteredPct = words.length ? Math.round(((counts[5] ?? 0) / words.length) * 100) : 0
  const xpByDay = sumXpByDay(sessions)
  const have = new Set(unlocked.map((a) => a.key))
  const bestStreak = Math.max(profile.bestStreak, profile.streak)

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-black">{t('progress.title')}</h1>

      <div className="grid grid-cols-3 gap-2">
        {[
          [t('progress.totalXp'), profile.xpTotal], [t('progress.bestStreak'), bestStreak], [t('progress.lessons'), sessions.length],
        ].map(([label, v]) => (
          <div key={label as string} className="card text-center !p-3">
            <p className="text-xl font-black">{v}</p>
            <p className="text-xs font-bold text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      {deck && (
        <section className="card">
          {decks.length > 1 && (
            <select className="input mb-3 !py-2 !text-base font-bold" aria-label={t('progress.deck')} value={deck.id} onChange={(e) => void setMeta('activeDeckId', e.target.value)}>
              {decks.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          )}
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-black">{deck.name}</h2>
            <span className="font-black text-brand" data-testid="mastered-pct">{t('decks.mastered', { p: masteredPct })}</span>
          </div>
          <LevelBar counts={counts} />
          <button className="btn btn-primary mt-4 w-full" onClick={() => nav(`/lesson/${deck.id}?mode=weak`)} data-testid="practice-weak">{t('progress.practiceWeak')}</button>
        </section>
      )}

      <section className="card">
        <h2 className="mb-3 font-black">{t('progress.heatmap')}</h2>
        <Heatmap xpByDay={xpByDay} goal={profile.dailyGoal} />
      </section>

      <section>
        <div className="mb-2 flex gap-2">
          <select className="input !py-2 !text-sm" aria-label="filter" value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
            {(['all', 'due', 'weak', 'new', 'mastered'] as const).map((f) => <option key={f} value={f}>{t(`progress.filter.${f}` as Key)}</option>)}
          </select>
          <select className="input !py-2 !text-sm" aria-label="sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            {(['weakest', 'due', 'level', 'az', 'list'] as const).map((s) => <option key={s} value={s}>{t(`progress.sort.${s}` as Key)}</option>)}
          </select>
        </div>
        {rows.length === 0 && <p className="py-6 text-center text-slate-500">{t('progress.noWords')}</p>}
        <ul className="grid gap-2" data-testid="word-list">
          {rows.map(({ w, p }) => {
            const s = p ? wordStrengthAt(p, now) : 0
            const acc = p ? accuracyOf(p) : null
            const practice = !!p && needsPractice(p, now)
            return (
              <li key={w.id} className="card !p-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-black">{w.term} <span className="font-semibold text-slate-500">· {w.translations[0]}</span></p>
                  </div>
                  <LevelBadge level={levelOf(p)} />
                </div>
                <StrengthBar value={s} />
                <div className="mt-1 flex justify-between text-xs font-bold text-slate-500">
                  <span>{t('progress.col.strength')} {s}%{practice && <span className="text-amber-600"> · {t('progress.needsPractice')}</span>}</span>
                  <span>{acc === null ? '—' : `${Math.round(acc * 100)}%`} · {nextReviewLabel(p, now)}</span>
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="card">
        <h2 className="mb-3 font-black">{t('progress.achievements')}</h2>
        <ul className="grid grid-cols-2 gap-2">
          {ACHIEVEMENTS.map((a) => {
            const on = have.has(a.key)
            return (
              <li key={a.key} className={`flex items-center gap-2 rounded-2xl p-2 ${on ? 'bg-amber-50' : 'bg-slate-100 opacity-60'}`}>
                <span className={`text-2xl ${on ? '' : 'grayscale'}`}>{a.icon}</span>
                <span className="text-xs">
                  <b className="block">{on ? t(`ach.${a.key}` as Key) : t('ach.locked')}</b>
                  {t(`ach.${a.key}.d` as Key)}
                </span>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
