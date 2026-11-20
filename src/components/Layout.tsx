import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { displayStreak, refillHearts } from '../core/gamification'
import { dayKey } from '../core/srs'
import { useProfile } from '../data/profile-context'
import { useMeta, useSessions } from '../data/hooks'
import { useState } from 'react'
import { exportAll } from '../data/backup'
import { setMeta } from '../data/repo'
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
  const lastBackup = useMeta<number>('lastBackupAt')
  const installedAt = useMeta<number>('installedAt')
  const snoozed = useMeta<number>('backupSnoozedAt')
  const [hidden, setHidden] = useState(false)
  const ref = lastBackup ?? installedAt
  const dueBackup = !hidden && ref !== undefined && now - ref > 7 * 86_400_000 && !(snoozed && now - snoozed < 86_400_000)
  const doBackup = async () => {
    const blob = new Blob([JSON.stringify(await exportAll(), null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `lexi-path-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
    await setMeta('lastBackupAt', Date.now())
  }

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

      {dueBackup && (
        <div className="mx-4 mt-3 flex flex-wrap items-center gap-2 rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-900" role="alert" data-testid="backup-reminder">
          <span className="flex-1">{lastBackup === undefined ? t('backup.reminderNever') : t('backup.reminder')}</span>
          <button className="btn btn-primary !px-3 !py-1.5 !text-sm" onClick={() => void doBackup()}>{t('backup.export')}</button>
          <button className="btn btn-ghost !px-3 !py-1.5 !text-sm" onClick={() => { setHidden(true); void setMeta('backupSnoozedAt', Date.now()) }}>{t('backup.dismiss')}</button>
        </div>
      )}
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
