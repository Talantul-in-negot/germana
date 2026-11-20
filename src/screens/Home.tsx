import { motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Animal } from '../art'
import { PathBackdrop } from '../components/PathBackdrop'
import { NODE_TOP, PATH_ITEM_H, PathFawn } from '../components/PathFawn'
import { Crowns, Mascot, Sheet } from '../components/ui'
import { groupByCourse, sortDecks } from '../core/decks'
import { HEART_REFILL_MS, verbCrown, crownFor, refillHearts, unitMastery, unitStatus, type UnitStatus } from '../core/gamification'
import { isDue, personStrengths } from '../core/srs'
import { levelOf } from '../core/srs'
import { useDeckWords, useDecks, useMeta, useProgressMap } from '../data/hooks'
import { useProfile } from '../data/profile-context'
import { setMeta } from '../data/repo'
import { t } from '../i18n'
import { fawnTargetIndex, nodeOffset, zoneForDeck } from '../theme/path'

/** Width of the path column in px (the trail SVG uses the same coordinates). */
const PATH_W = 320
/** Horizontal distance of the zone's resident animal from the path centre. */
const RESIDENT_GAP = 124
const RESIDENT_SIZE = 64

export default function Home() {
  const { profile } = useProfile()
  const nav = useNavigate()
  const decks = useDecks()
  const activeId = useMeta<string>('activeDeckId')
  const sorted = useMemo(() => (decks ? sortDecks(decks) : []), [decks])
  const deck = sorted.find((d) => d.id === activeId) ?? sorted[0]
  const words = useDeckWords(deck?.id)
  const progress = useProgressMap(profile.id)
  const anchor = useRef<HTMLDivElement>(null)
  const [openUnit, setOpenUnit] = useState<number | null>(null)
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(i)
  }, [])

  const units = useMemo(() => {
    if (!words || !progress) return []
    const byUnit: number[][] = []
    for (const w of words) (byUnit[w.unitIndex] ??= []).push(levelOf(progress.get(w.id)))
    return byUnit.map((levels, i) => ({
      index: i, levels, size: levels.length,
      mastery: unitMastery(levels),
      status: unitStatus(byUnit, i),
    }))
  }, [words, progress])

  const nextIndex = units.findIndex((u) => u.status !== 'completed')
  const fawnIndex = fawnTargetIndex(units.map((u) => u.status === 'completed'))
  const zone = zoneForDeck(sorted.map((d) => d.id), deck?.id)

  if (!decks || !words || !progress) return null

  if (!deck) {
    return (
      <div ref={anchor} className="relative z-[1]">
        <PathBackdrop zone={zone} anchor={anchor} />
        <div className="panel relative mt-6 flex flex-col items-center gap-4 py-10 text-center">
          <Mascot size={120} />
          <p className="text-lg font-bold">{t('home.noDeck')}</p>
          <Link to="/decks/new" className="btn btn-primary">{t('home.import')}</Link>
        </div>
      </div>
    )
  }

  const dueCount = [...progress.values()].filter((p) => words.some((w) => w.id === p.wordId) && isDue(p, now)).length
  const h = refillHearts(profile.hearts, profile.heartsAt, now)
  const heartsBlocked = profile.settings.hearts && h.hearts === 0
  const minsToHeart = Math.max(1, Math.ceil((h.heartsAt + HEART_REFILL_MS - now) / 60000))
  const sel = openUnit !== null ? units[openUnit] : undefined

  const start = (mode: 'unit' | 'weak' | 'review', unit = 0) => nav(`/lesson/${deck.id}?mode=${mode}&unit=${unit}`)
  const residentAt = Math.min(1, Math.max(units.length - 1, 0))
  const residentSide = nodeOffset(residentAt) >= 0 ? -1 : 1

  return (
    <div ref={anchor} className="relative z-[1]">
      <PathBackdrop zone={zone} anchor={anchor} />

      <header className="pt-1 text-center" data-testid="home-hero">
        <h1 className="inline-block rounded-full bg-white/90 px-7 py-2 text-4xl font-black tracking-tight text-brand-dark shadow-soft">{t('app.title')}</h1>
        <p className="mt-2"><span className="inline-block rounded-full bg-white/90 px-3 py-0.5 text-xs font-extrabold text-slate-600 shadow-sm">{zone.name}</span></p>
      </header>
      <div className="h-10" aria-hidden="true" />

      <section className="panel">
        {decks.length > 1 && (
          <select className="input mb-3 !py-2 !text-base font-bold" value={deck.id} aria-label={t('decks.active')} onChange={(e) => void setMeta('activeDeckId', e.target.value)}>
            {groupByCourse(decks).map((g) => (
              <optgroup key={g.course ?? 'none'} label={g.course ?? t('decks.noCourse')}>
                {g.decks.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </optgroup>
            ))}
          </select>
        )}
        <p className="text-lg font-black">{deck.name}</p>
        <p className="text-sm text-slate-600">
          {deck.course ? `${deck.course} · ` : ''}{deck.cefr ? `${deck.cefr} · ` : ''}{t('common.words', { n: words.length })} · {t('common.units', { n: units.length })}
        </p>

        {heartsBlocked && <p className="mt-3 rounded-2xl bg-bad-soft p-3 text-sm font-bold text-red-900">{t('home.noHearts')} ({t('home.heartsIn', { m: minsToHeart })})</p>}

        <div className="mt-3 flex flex-wrap gap-2">
          {dueCount > 0 && <span className="inline-flex min-h-12 items-center rounded-full bg-amber-100 px-3 text-sm font-extrabold text-amber-900">{t('home.dueWords', { n: dueCount })}</span>}
          <button className="btn btn-ghost !px-3 !py-1.5 !text-sm" onClick={() => start('weak')}>{t('home.practice')}</button>
          <button className="btn btn-ghost !px-3 !py-1.5 !text-sm" onClick={() => nav(`/test/${deck.id}`)} data-testid="home-test">{t('home.testLesson')}</button>
          {words.some((w) => w.type === 'noun' && w.gender && !w.pluralOnly) && (
            <button className="btn btn-ghost !px-3 !py-1.5 !text-sm" onClick={() => nav(`/drill/${deck.id}?kind=articles`)}>{t('home.articlesDrill')}</button>
          )}
          {words.some((w) => w.value !== undefined) && (
            <button className="btn btn-ghost !px-3 !py-1.5 !text-sm" onClick={() => nav(`/drill/${deck.id}?kind=numbers`)}>{t('home.numbersDrill')}</button>
          )}
          {profile.settings.hearts && <button className="btn btn-ghost !px-3 !py-1.5 !text-sm" onClick={() => start('review')}>{t('home.review')}</button>}
        </div>
      </section>

      <div className="relative mx-auto mt-10 max-w-full" style={{ width: PATH_W, height: units.length * PATH_ITEM_H }}>
        <PathTrail count={units.length} />
        <ol className="relative" aria-label={t('home.title')}>
          {units.map((u, i) => {
            const crown = crownFor(u.mastery)
            const isNext = i === nextIndex
            return (
              <li key={u.index} style={{ height: PATH_ITEM_H, paddingTop: NODE_TOP, transform: `translateX(${nodeOffset(i)}px)` }} className="flex flex-col items-center">
                <motion.button
                  whileTap={{ scale: 0.92 }} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: Math.min(i, 8) * 0.04 }}
                  onClick={() => setOpenUnit(u.index)} data-testid={`unit-${u.index}`} data-status={isNext ? 'next' : u.status}
                  className={`relative flex h-20 w-20 items-center justify-center rounded-full border-b-8 text-2xl font-black shadow-soft ${nodeColor(u.status)} ${isNext ? 'ring-4 ring-white' : ''}`}
                  aria-label={`${t('home.unit', { n: u.index + 1 })} (${u.status})${isNext ? ` – ${t('home.start')}` : ''}`}
                >
                  {u.status === 'completed' ? '★' : u.index + 1}
                </motion.button>
                <div className="mt-1 rounded-full bg-white/90 px-2 py-0.5 shadow-sm"><Crowns tier={crown} size={18} /></div>
                <p className="mt-1 rounded-full bg-white/90 px-2 text-xs font-bold text-slate-700">{t('common.words', { n: u.size })}</p>
              </li>
            )
          })}
        </ol>
        {units.length > 0 && <PathFawn key={deck.id} index={fawnIndex} storageKey={`wortpfad.fawn.${profile.id}.${deck.id}`} count={units.length} />}
        {units.length > 0 && (
          <div className="pointer-events-none absolute left-1/2 top-0" style={{ transform: `translate(${residentSide * RESIDENT_GAP - RESIDENT_SIZE / 2}px, ${residentAt * PATH_ITEM_H + NODE_TOP + 20}px)` }}>
            <Animal kind={zone.resident} size={RESIDENT_SIZE} />
          </div>
        )}
      </div>

      {words.some((w) => w.verb?.present) && (
        <section className="panel mb-8" data-testid="conj-nodes">
          <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-slate-700">{t('conj.title')}</h2>
          <ul className="grid grid-cols-3 gap-3">
            {words.filter((w) => w.verb?.present).map((v) => {
              const p = progress.get(v.id)
              const tier = verbCrown(p ? personStrengths(p, now) : [])
              return (
                <li key={v.id}>
                  <button className="flex min-h-20 w-full flex-col items-center justify-center gap-1 rounded-[2rem] border-b-4 border-brand bg-brand-soft p-2 shadow-sm active:translate-y-0.5" onClick={() => nav(`/conj/${deck.id}/${v.id}`)} data-testid={`conj-node-${v.term}`}>
                    <span className="text-lg font-black text-brand-dark">{v.term}</span>
                    <Crowns tier={tier} size={16} />
                  </button>
                </li>
              )
            })}
            <li>
              <button className="flex h-full min-h-20 w-full flex-col items-center justify-center gap-1 rounded-[2rem] border-b-4 border-amber-500 bg-amber-100 p-2 shadow-sm active:translate-y-0.5" onClick={() => nav(`/conj/${deck.id}/all`)} data-testid="conj-node-all">
                <span className="text-sm font-black text-amber-950">★ {t('conj.allVerbs')}</span>
              </button>
            </li>
          </ul>
        </section>
      )}

      <Sheet open={sel !== undefined} onClose={() => setOpenUnit(null)}>
        {sel && (
          <div>
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-xl font-black">{t('home.unit', { n: sel.index + 1 })}</h2>
              <Crowns tier={crownFor(sel.mastery)} size={26} />
            </div>
            <p className="mb-4 text-sm text-slate-600">{t(`home.crown.${crownFor(sel.mastery)}`)} · {Math.round(sel.mastery * 100)}%</p>
            <button className="btn btn-primary w-full" onClick={() => start('unit', sel.index)} data-testid="start-lesson">{t('home.start')}</button>
            <Link to={`/decks/${deck.id}`} className="mt-3 flex min-h-12 items-center justify-center text-sm font-bold text-brand-dark underline">{t('home.wordsInUnit')}</Link>
          </div>
        )}
      </Sheet>
    </div>
  )
}

function nodeColor(s: UnitStatus): string {
  if (s === 'completed') return 'bg-amber-300 border-amber-500 text-amber-950'
  return 'bg-brand border-brand-dark text-white'
}

/** Dotted trail through the node centres, drawn behind the nodes. */
function PathTrail({ count }: { count: number }) {
  if (count < 2) return null
  const pts = Array.from({ length: count }, (_, i) => [PATH_W / 2 + nodeOffset(i), i * PATH_ITEM_H + NODE_TOP + 40] as const)
  let d = `M${pts[0]?.[0]} ${pts[0]?.[1]}`
  for (let i = 1; i < pts.length; i++) {
    const [px, py] = pts[i - 1] as readonly [number, number]
    const [x, y] = pts[i] as readonly [number, number]
    const my = (py + y) / 2
    d += ` C${px} ${my} ${x} ${my} ${x} ${y}`
  }
  return (
    <svg className="pointer-events-none absolute left-0 top-0" width={PATH_W} height={count * PATH_ITEM_H} viewBox={`0 0 ${PATH_W} ${count * PATH_ITEM_H}`} aria-hidden="true">
      <path d={d} fill="none" stroke="#fff" strokeOpacity="0.9" strokeWidth="8" strokeLinecap="round" strokeDasharray="1 16" />
    </svg>
  )
}
