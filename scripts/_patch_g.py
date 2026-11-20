ROOT = 'C:/Users/Sergiu/Desktop/Projects/De/'


def rd(p):
    return open(ROOT + p, encoding='utf-8').read()


def wr(p, s):
    open(ROOT + p, 'w', encoding='utf-8').write(s)


def must(s, old, new):
    assert old in s, old[:70]
    return s.replace(old, new, 1)


# ---------- repo: installedAt + backup meta
s = rd('src/data/repo.ts')
s = must(s, "    await setMeta('seeded', true)\n  })\n}", "    if (!(await getMeta<number>('installedAt'))) await setMeta('installedAt', Date.now())\n    await setMeta('seeded', true)\n  })\n}")
wr('src/data/repo.ts', s)

# ---------- Settings
s = rd('src/screens/Settings.tsx')
s = must(s, "import { englishVoices, speak, sttSupported, ttsSupported } from '../lib/speech'", "import { germanVoices, speak, sttSupported, ttsSupported } from '../lib/speech'\nimport { getMeta, setMeta } from '../data/repo'")
s = must(s, "const load = () => setVoices(englishVoices())", "const load = () => setVoices(germanVoices())")
s = must(s, "    a.click()\n    setTimeout(() => URL.revokeObjectURL(a.href), 1000)", "    a.click()\n    setTimeout(() => URL.revokeObjectURL(a.href), 1000)\n    await setMeta('lastBackupAt', Date.now())\n    setLastBackup(Date.now())")
s = must(s, "  const fileRef = useRef<HTMLInputElement>(null)\n", "  const fileRef = useRef<HTMLInputElement>(null)\n  const [lastBackup, setLastBackup] = useState<number | null>(null)\n  useEffect(() => {\n    void getMeta<number>('lastBackupAt').then((v) => setLastBackup(v ?? null))\n  }, [])\n")
s = must(s, "        <Toggle label={t('settings.hearts')}", "        <Toggle label={t('settings.genderColors')} checked={s.genderColors !== false} onChange={(v) => set({ genderColors: v })} />\n        <Toggle label={t('settings.hearts')}")
s = must(s, "<label className=\"text-sm font-bold\">{t('settings.voice')}", "{voices.length === 0 && <p className=\"text-sm text-amber-800\">{t('settings.noGermanVoice')}</p>}\n            <label className=\"text-sm font-bold\">{t('settings.voiceDe')}")
s = must(s, "<option value=\"\">{t('settings.voiceAuto')}</option>", "<option value=\"\">{t('settings.voiceAutoDe')}</option>")
s = must(s, "speak('Hello! Nice to meet you.', { voice: s.ttsVoice, rate: s.ttsRate })", "speak('Guten Tag! Wie geht es dir?', { voice: s.ttsVoice, rate: s.ttsRate, lang: 'de-DE' })")
s = must(s, "        {msg && <p className=\"font-bold text-brand\" role=\"status\">{msg}</p>}", "        {lastBackup && <p className=\"text-sm text-slate-500\">{t('backup.last', { d: new Date(lastBackup).toLocaleDateString('ro-RO') })}</p>}\n        <Link to=\"/install\" className=\"btn btn-ghost\" data-testid=\"install-link\">{t('settings.install')}</Link>\n        {msg && <p className=\"font-bold text-brand\" role=\"status\">{msg}</p>}")
wr('src/screens/Settings.tsx', s)

# ---------- Layout: weekly backup reminder
s = rd('src/components/Layout.tsx')
s = must(s, "import { useSessions } from '../data/hooks'", "import { useMeta, useSessions } from '../data/hooks'\nimport { useState } from 'react'\nimport { exportAll } from '../data/backup'\nimport { setMeta } from '../data/repo'")
s = must(s, "  const hearts = refillHearts(profile.hearts, profile.heartsAt, now).hearts\n", """  const hearts = refillHearts(profile.hearts, profile.heartsAt, now).hearts
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
""")
s = must(s, "      <main className=\"flex-1 overflow-y-auto px-4 pb-24 pt-4\">", """      {dueBackup && (
        <div className="mx-4 mt-3 flex flex-wrap items-center gap-2 rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-900" role="alert" data-testid="backup-reminder">
          <span className="flex-1">{lastBackup === undefined ? t('backup.reminderNever') : t('backup.reminder')}</span>
          <button className="btn btn-primary !px-3 !py-1.5 !text-sm" onClick={() => void doBackup()}>{t('backup.export')}</button>
          <button className="btn btn-ghost !px-3 !py-1.5 !text-sm" onClick={() => { setHidden(true); void setMeta('backupSnoozedAt', Date.now()) }}>{t('backup.dismiss')}</button>
        </div>
      )}
      <main className="flex-1 overflow-y-auto px-4 pb-24 pt-4">""")
wr('src/components/Layout.tsx', s)

# ---------- main: persistent storage
s = rd('src/main.tsx')
s = must(s, "registerSW({ immediate: true })", "registerSW({ immediate: true })\n\n// Ask the browser not to evict our IndexedDB data (first run; harmless if already granted/unsupported).\nvoid navigator.storage?.persist?.().catch(() => undefined)")
wr('src/main.tsx', s)

# ---------- DeckDetail: Term + plural/forms lines
s = rd('src/screens/DeckDetail.tsx')
s = must(s, "<p className=\"truncate font-black\">{w.term}</p>", "<p className=\"truncate font-black\"><Term text={w.term} />{w.alternatives?.length ? <span className=\"font-semibold text-slate-400\"> | {w.alternatives.join(' | ')}</span> : null}</p>")
s = must(s, "<p className=\"truncate text-sm text-slate-600\">{w.translations.join(' | ')}</p>", "<p className=\"truncate text-sm text-slate-600\">{w.translations.join(' | ')}</p>\n                  {(w.plural || w.verb?.present3sg) && (\n                    <p className=\"truncate text-xs text-slate-500\">\n                      {w.plural ? `${w.pluralOnly ? '(Pl.) ' : 'Pl.: die '}${w.plural}${w.pluralAlternatives?.length ? ` | die ${w.pluralAlternatives.join(' | die ')}` : ''}` : ''}\n                      {w.verb?.present3sg ? [w.verb.present3sg, w.verb.praeteritum, w.verb.perfekt].filter(Boolean).join(', ') : ''}\n                    </p>\n                  )}")
s = must(s, "import { Confirm, LevelBadge, Sheet } from '../components/ui'", "import { Confirm, LevelBadge, Sheet } from '../components/ui'\nimport { Term } from '../components/Term'")
wr('src/screens/DeckDetail.tsx', s)

# ---------- Import: group-aware unit hint
s = rd('src/screens/Import.tsx')
s = must(s, "import { unitSizes } from '../core/units'", "import { assignUnitsFor } from '../core/units'")
s = must(s, "t('import.unitsHint', { n: unitSizes(valid.length).length })", "t('import.unitsHint', { n: new Set(assignUnitsFor(valid)).size })")
wr('src/screens/Import.tsx', s)
print('G ok')
