import { Animal, Scene } from '../art'
import { MASCOT_NAME, zoneForIndex } from '../theme/scenes'
import { t } from '../i18n'

/** Loading screen: the first zone, the fawn and the app title. */
export default function Splash() {
  return (
    <div className="relative h-full" data-testid="splash">
      <Scene zone={zoneForIndex(0)} resident={false} />
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="rounded-full bg-white/90 px-8 py-3 text-5xl font-black tracking-tight text-brand-dark shadow-soft">{t('app.title')}</h1>
        <Animal kind="fawn" size={140} label={MASCOT_NAME} />
        <p className="rounded-full bg-white/90 px-4 py-1 font-bold text-slate-700 shadow-sm">{t('app.loading')}</p>
      </div>
    </div>
  )
}
