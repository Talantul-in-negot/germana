import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { displayStreak, refillHearts } from '../core/gamification'
import { dayKey } from '../core/srs'
import { useProfile } from '../data/profile-context'
import { useSessions } from '../data/hooks'
import { sumXpByDay } from '../data/service'
import { t, type Key } from '../i18n'
import { ProgressRing } from './ui'

const TABS: { to: string; key: Key; icon: string }[] = [
  { to: '/', key: 'nav.path', icon: '🗺️' },
  { to: '/decks', key: 'nav.decks', icon: '📚' },
  { to: '/progress', key: 'nav.progress', icon: '📈' },
  { to: '/settings', key: 'nav.settings', icon: '⚙️' },
]

export default function Layout() {
  const { profile } = useProfile()
  const nav = useNavigate()
  const sessions = useSessions(profile.id)
  const now = Date.now()
  const today = dayKey(now)
  const todayXp = sessions ? (sumXpByDay(sessions).get(today) ?? 0) : 0
  const streak = displayStreak(profile, today)
  const hearts = refillHearts(profile.hearts, profile.heartsAt, now).hearts

  return (
    <div className="mx-auto flex h-full max-w-lg flex-col">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b-2 border-slate-100 bg-paper/95 px-4 py-2 backdrop-blur">
        <button aria-label={t('profiles.title')} className="text-3xl" onClick={() => nav('/profiles')}>{profile.avatar}</button>
        <div className="flex-1 truncate text-lg font-black">{profile.name}</div>
        {profile.settings.hearts && <span className="font-black text-bad" title="hearts">❤ {hearts}</span>}
        <span className="font-black text-orange-500" title={t('home.streak', { n: streak })} data-testid="streak">🔥 {streak}</span>
        {profile.streakFreezes > 0 && <span className="font-black text-sky-600" title={t('home.freezes', { n: profile.streakFreezes })}>❄ {profile.streakFreezes}</span>}
        <div title={t('home.todayXp', { xp: todayXp, goal: profile.dailyGoal })} data-testid="goal-ring">
          <ProgressRing value={todayXp} goal={profile.dailyGoal} />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pb-24 pt-4">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-slate-100 bg-white pb-[env(safe-area-inset-bottom)]">
        <ul className="mx-auto flex max-w-lg">
          {TABS.map((tab) => (
            <li key={tab.to} className="flex-1">
              <NavLink to={tab.to} end={tab.to === '/'} className={({ isActive }) => `flex flex-col items-center py-2 text-xs font-extrabold ${isActive ? 'text-brand' : 'text-slate-500'}`}>
                <span className="text-2xl">{tab.icon}</span>
                {t(tab.key)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
