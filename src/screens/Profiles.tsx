import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Profile } from '../core/types'
import { Confirm } from '../components/ui'
import { useProfile } from '../data/profile-context'
import { AVATARS, createProfile, deleteProfile, setMeta } from '../data/repo'
import { t } from '../i18n'

export default function Profiles() {
  const { profile, profiles, switchTo } = useProfile()
  const nav = useNavigate()
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState(AVATARS[1] as string)
  const [del, setDel] = useState<Profile | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const add = async () => {
    if (!name.trim()) return
    const p = await createProfile(name, avatar)
    await setMeta('activeProfileId', p.id)
    setName('')
  }

  return (
    <div className="grid gap-4">
      <button className="text-left text-sm font-bold text-brand" onClick={() => nav(-1)}>← {t('common.back')}</button>
      <h1 className="text-2xl font-black">{t('profiles.title')}</h1>
      <ul className="grid gap-2">
        {profiles.map((p) => (
          <li key={p.id} className={`card flex items-center gap-3 !p-3 ${p.id === profile.id ? '!border-brand' : ''}`}>
            <span className="text-3xl">{p.avatar}</span>
            <div className="flex-1">
              <p className="font-black">{p.name}</p>
              <p className="text-xs text-slate-500">{p.xpTotal} XP · 🔥 {p.streak}</p>
            </div>
            {p.id === profile.id ? (
              <span className="text-sm font-black text-brand">{t('profiles.active')}</span>
            ) : (
              <button className="btn btn-ghost !px-3 !py-1.5 !text-sm" onClick={() => void switchTo(p.id)}>{t('profiles.switch')}</button>
            )}
            <button aria-label={t('common.delete')} className="text-xl" onClick={() => (profiles.length > 1 ? setDel(p) : setMsg(t('profiles.last')))}>🗑️</button>
          </li>
        ))}
      </ul>
      {msg && <p className="font-bold text-bad">{msg}</p>}

      <section className="card grid gap-3">
        <h2 className="font-black">{t('profiles.add')}</h2>
        <input className="input" placeholder={t('profiles.name')} value={name} onChange={(e) => setName(e.target.value)} data-testid="profile-name" />
        <div className="flex flex-wrap gap-2" role="radiogroup">
          {AVATARS.map((a) => (
            <button key={a} role="radio" aria-checked={avatar === a} onClick={() => setAvatar(a)} className={`h-12 w-12 rounded-2xl text-2xl ${avatar === a ? 'bg-brand-soft ring-2 ring-brand' : 'bg-slate-100'}`}>{a}</button>
          ))}
        </div>
        <button className="btn btn-primary" disabled={!name.trim()} onClick={() => void add()}>{t('common.add')}</button>
      </section>

      <Confirm open={!!del} text={del ? t('profiles.deleteConfirm', { name: del.name }) : ''} onNo={() => setDel(null)}
        onYes={async () => {
          if (del) {
            if (del.id === profile.id) await setMeta('activeProfileId', (profiles.find((p) => p.id !== del.id) as Profile).id)
            await deleteProfile(del.id)
          }
          setDel(null)
        }} />
    </div>
  )
}
