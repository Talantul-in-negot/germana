import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { GOAL_CHOICES } from '../core/gamification'
import { Confirm, Toggle } from '../components/ui'
import { exportAll, importAll } from '../data/backup'
import { useProfile } from '../data/profile-context'
import { resetProgress, updateProfile, updateSettings } from '../data/repo'
import { t } from '../i18n'
import { playSfx } from '../lib/sound'
import { englishVoices, speak, sttSupported, ttsSupported } from '../lib/speech'

export default function Settings() {
  const { profile } = useProfile()
  const s = profile.settings
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [confirmReset, setConfirmReset] = useState(false)
  const [pendingImport, setPendingImport] = useState<unknown>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!ttsSupported()) return
    const load = () => setVoices(englishVoices())
    load()
    window.speechSynthesis.addEventListener('voiceschanged', load)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load)
  }, [])

  const doExport = async () => {
    const data = await exportAll()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `lexi-path-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return
    try {
      setPendingImport(JSON.parse(await file.text()))
    } catch {
      setMsg(t('settings.importFail'))
    }
  }

  const doImport = async () => {
    try {
      await importAll(pendingImport)
      setMsg(t('settings.importOk'))
    } catch {
      setMsg(t('settings.importFail'))
    }
    setPendingImport(null)
  }

  const set = (patch: Partial<typeof s>) => void updateSettings(profile.id, patch)

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-black">{t('settings.title')}</h1>

      <section className="card">
        <div className="flex items-center justify-between">
          <p className="font-black">{profile.avatar} {profile.name}</p>
          <Link to="/profiles" className="text-sm font-bold text-brand underline">{t('profiles.title')}</Link>
        </div>
        <p className="mt-3 font-extrabold">{t('settings.goal')}</p>
        <div className="mt-2 flex gap-2" role="radiogroup">
          {GOAL_CHOICES.map((g) => (
            <button key={g} role="radio" aria-checked={profile.dailyGoal === g} data-testid={`goal-${g}`} onClick={() => void updateProfile(profile.id, { dailyGoal: g })}
              className={`btn flex-1 ${profile.dailyGoal === g ? 'btn-primary' : 'btn-ghost'}`}>{g}</button>
          ))}
        </div>
      </section>

      <section className="card">
        <Toggle label={t('settings.sound')} checked={s.sound} onChange={(v) => { set({ sound: v }); if (v) playSfx('correct', true) }} />
        <Toggle label={t('settings.hearts')} help={t('settings.heartsHelp')} checked={s.hearts} onChange={(v) => set({ hearts: v })} />
        <Toggle label={t('settings.speaking')} help={sttSupported() ? t('settings.speakingHelp') : t('settings.noStt')} checked={s.speaking && sttSupported()} disabled={!sttSupported()} onChange={(v) => set({ speaking: v })} />
      </section>

      <section className="card">
        <h2 className="mb-2 font-black">{t('settings.tts')}</h2>
        {!ttsSupported() ? (
          <p className="text-sm text-slate-500">{t('settings.noTts')}</p>
        ) : (
          <div className="grid gap-3">
            <label className="text-sm font-bold">{t('settings.voice')}
              <select className="input mt-1 !py-2 !text-base" value={s.ttsVoice ?? ''} onChange={(e) => set({ ttsVoice: e.target.value || null })}>
                <option value="">{t('settings.voiceAuto')}</option>
                {voices.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>)}
              </select>
            </label>
            <label className="text-sm font-bold">{t('settings.speed')}: {s.ttsRate.toFixed(1)}×
              <input type="range" min={0.5} max={1.5} step={0.1} value={s.ttsRate} className="mt-1 w-full" onChange={(e) => set({ ttsRate: Number(e.target.value) })} />
            </label>
            <button className="btn btn-ghost" onClick={() => speak('Hello! Nice to meet you.', { voice: s.ttsVoice, rate: s.ttsRate })}>🔊 {t('settings.test')}</button>
          </div>
        )}
      </section>

      <section className="card grid gap-2">
        <h2 className="font-black">{t('settings.data')}</h2>
        <button className="btn btn-ghost" onClick={() => void doExport()} data-testid="export">{t('settings.export')}</button>
        <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" data-testid="import-file" onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = '' }} />
        <button className="btn btn-ghost" onClick={() => fileRef.current?.click()}>{t('settings.import')}</button>
        <button className="btn btn-bad" onClick={() => setConfirmReset(true)} data-testid="reset">{t('settings.reset')}</button>
        {msg && <p className="font-bold text-brand" role="status">{msg}</p>}
      </section>

      <Confirm open={confirmReset} text={t('settings.resetConfirm', { name: profile.name })} onNo={() => setConfirmReset(false)}
        onYes={() => { void resetProgress(profile.id).then(() => setMsg(t('settings.resetDone'))); setConfirmReset(false) }} />
      <Confirm open={pendingImport !== null} text={t('settings.importConfirm')} onNo={() => setPendingImport(null)} onYes={() => void doImport()} />
    </div>
  )
}
