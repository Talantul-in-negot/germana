import { motion } from 'framer-motion'
import type { LessonMode } from '../core/lesson'
import { LevelBadge, Mascot } from '../components/ui'
import type { FinishOutput } from '../data/service'
import { t } from '../i18n'
import type { Key } from '../i18n'

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card text-center">
      <p className="text-2xl font-black">{value}</p>
      <p className="text-sm font-bold text-slate-500">{label}</p>
    </div>
  )
}

export default function Summary({
  result, levelUps, mode, onHome, onAgain,
}: { result: FinishOutput; levelUps: FinishOutput['levelUps']; mode: LessonMode; onHome: () => void; onAgain: () => void }) {
  const mins = Math.floor(result.durationSec / 60)
  const secs = result.durationSec % 60
  return (
    <div className="mx-auto flex h-full max-w-lg flex-col overflow-y-auto p-5" data-testid="summary">
      <div className="flex flex-col items-center gap-2 pt-4 text-center">
        <motion.div initial={{ scale: 0.4, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 12 }}>
          <Mascot size={120} mood="cheer" />
        </motion.div>
        <h1 className="text-3xl font-black">{t('summary.title')}</h1>
        {result.perfect && <p className="font-extrabold text-amber-600">{t('summary.perfect', { n: result.bonusXp })}</p>}
        {result.goalReached && <p className="font-extrabold text-good">{t('summary.goal')}</p>}
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <Stat label={t('summary.xp')} value={`+${result.xp + result.bonusXp}`} />
        <Stat label={t('summary.accuracy')} value={`${Math.round(result.accuracy * 100)}%`} />
        <Stat label={t('summary.time')} value={`${mins}:${String(secs).padStart(2, '0')}`} />
      </div>

      <div className="card mt-4">
        <p className="font-black">🔥 {t('summary.streak', { n: result.streak.streak })}</p>
        {result.streak.extended && <p className="text-sm text-slate-600">{t('summary.streakExtended')}</p>}
        {result.streak.freezesUsed > 0 && <p className="text-sm text-slate-600">{t('summary.freezeUsed', { n: result.streak.freezesUsed })}</p>}
        {result.streak.freezeEarned && <p className="text-sm font-bold text-sky-700">❄ {t('summary.freezeEarned')}</p>}
        {mode === 'review' && <p className="text-sm font-bold text-bad">❤ 5/5</p>}
      </div>

      <div className="card mt-4">
        <p className="mb-2 font-black">{t('summary.levelUps')}</p>
        {levelUps.length === 0 ? (
          <p className="text-sm text-slate-500">{t('summary.noLevelUps')}</p>
        ) : (
          <ul className="grid gap-2">
            {levelUps.map((l, i) => (
              <motion.li key={l.wordId} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 * i }} className="flex items-center justify-between gap-2">
                <span className="font-extrabold">{l.term}</span>
                <span className="flex items-center gap-1 text-sm">
                  <LevelBadge level={l.from} /> → <LevelBadge level={l.to} />
                </span>
              </motion.li>
            ))}
          </ul>
        )}
      </div>

      {result.unlocked.map((a, i) => (
        <motion.div key={a.key} className="card mt-4 flex items-center gap-3 !border-amber-300 !bg-amber-50"
          initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.4 + i * 0.2, type: 'spring' }}>
          <span className="text-4xl">{a.icon}</span>
          <div>
            <p className="text-xs font-black uppercase text-amber-700">{t('summary.unlocked')}</p>
            <p className="font-black">{t(`ach.${a.key}` as Key)}</p>
          </div>
        </motion.div>
      ))}

      <div className="mt-auto grid gap-3 pt-6">
        <button className="btn btn-primary" onClick={onHome} data-testid="summary-home">{t('summary.home')}</button>
        <button className="btn btn-ghost" onClick={onAgain}>{t('summary.again')}</button>
      </div>
    </div>
  )
}
