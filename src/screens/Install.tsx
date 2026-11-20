import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mascot } from '../components/ui'
import { t, type Key } from '../i18n'

export default function Install() {
  const nav = useNavigate()
  const [persisted, setPersisted] = useState<boolean | null>(null)
  useEffect(() => {
    void navigator.storage?.persisted?.().then(setPersisted).catch(() => setPersisted(null))
  }, [])
  const steps = (keys: Key[]) => (
    <ol className="list-decimal space-y-1 pl-5 font-semibold">
      {keys.map((k) => <li key={k}>{t(k)}</li>)}
    </ol>
  )
  const state = persisted === null ? 'install.persist.unknown' : persisted ? 'install.persist.yes' : 'install.persist.no'
  return (
    <div className="grid gap-4" data-testid="install-screen">
      <button className="text-left text-sm font-bold text-brand" onClick={() => nav('/settings')}>← {t('install.back')}</button>
      <div className="flex items-center gap-3">
        <Mascot size={64} />
        <h1 className="text-2xl font-black">{t('install.title')}</h1>
      </div>
      <p>{t('install.intro')}</p>
      <section className="card">
        <h2 className="mb-2 font-black">🤖 {t('install.android')}</h2>
        {steps(['install.android1', 'install.android2', 'install.android3'])}
      </section>
      <section className="card">
        <h2 className="mb-2 font-black"> {t('install.iphone')}</h2>
        {steps(['install.iphone1', 'install.iphone2', 'install.iphone3'])}
        <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-900" data-testid="iphone-warning">{t('install.iphoneWarn')}</p>
      </section>
      <p className="text-sm text-slate-500">{t('install.persist', { s: t(state as Key) })}</p>
    </div>
  )
}
