import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { parseJsonWords, parseWordList, rowsFromJson, type JsonWordInput, type RowIssue } from '../core/parser'
import { unitSizes } from '../core/units'
import { db } from '../data/db'
import { addWords, createDeck, setMeta } from '../data/repo'
import { t, type Key } from '../i18n'

export default function Import() {
  const { id } = useParams()
  const nav = useNavigate()
  const [text, setText] = useState('')
  const [json, setJson] = useState<JsonWordInput[] | null>(null)
  const [name, setName] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const deck = useLiveQuery(async () => (id ? db.decks.get(id) : undefined), [id])
  const existing = useLiveQuery(async () => (id ? (await db.words.where('deckId').equals(id).toArray()).map((w) => w.term) : []), [id]) ?? []

  const parsed = useMemo(() => (json ? rowsFromJson(json, existing) : parseWordList(text, existing)), [json, text, existing])
  const valid = parsed.rows.filter((r) => r.valid)
  const problems = parsed.rows.length - valid.length

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setErr(null)
    const content = await f.text()
    if (f.name.toLowerCase().endsWith('.json')) {
      try {
        setJson(parseJsonWords(content))
        setText('')
      } catch {
        setErr(t('import.jsonError'))
      }
    } else {
      setJson(null)
      setText(content)
    }
    if (!name && !id) setName(f.name.replace(/\.[^.]+$/, ''))
    e.target.value = ''
  }

  const save = async () => {
    if (busy || valid.length === 0) return
    setBusy(true)
    const items: JsonWordInput[] = valid.map((r) => ({ term: r.term, translations: r.translations, tags: r.tags, ...(r.example ? { example: r.example } : {}) }))
    if (id) {
      await addWords(id, items)
      nav(`/decks/${id}`)
    } else {
      const newId = await createDeck(name || t('decks.new'), items)
      await setMeta('activeDeckId', newId)
      nav('/')
    }
  }

  return (
    <div>
      <h1 className="mb-3 text-2xl font-black">{deck ? t('import.addTo', { name: deck.name }) : t('import.title')}</h1>
      {!id && (
        <input className="input mb-3" value={name} placeholder={t('import.deckName')} aria-label={t('import.deckName')} onChange={(e) => setName(e.target.value)} data-testid="deck-name" />
      )}
      <p className="mb-2 text-sm text-slate-600">{t('import.help')}</p>
      <textarea className="input h-40 font-mono !text-sm" placeholder={t('import.paste')} value={text} onChange={(e) => { setText(e.target.value); setJson(null) }} data-testid="paste-box" />
      <div className="mt-2">
        <input ref={fileRef} type="file" accept=".csv,.tsv,.txt,.json" className="hidden" onChange={onFile} data-testid="file-input" />
        <button className="btn btn-ghost !py-2 !text-sm" onClick={() => fileRef.current?.click()}>📁 {t('import.file')}</button>
      </div>
      {err && <p className="mt-2 font-bold text-bad">{err}</p>}

      {parsed.rows.length > 0 && (
        <section className="mt-5" data-testid="preview">
          <h2 className="mb-1 text-lg font-black">{t('import.preview')}</h2>
          <p className="mb-2 text-sm font-bold text-slate-600">
            {parsed.separator ? t('import.separator', { s: JSON.stringify(parsed.separator) }) : json ? '' : t('import.noSeparator')}
            {' · '}<span className="text-good">{t('import.valid', { n: valid.length })}</span>
            {problems > 0 && <> · <span className="text-bad">{t('import.problems', { n: problems })}</span></>}
          </p>
          <div className="overflow-x-auto rounded-2xl border-2 border-slate-100 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="p-2">#</th><th className="p-2">{t('import.col.term')}</th><th className="p-2">{t('import.col.translations')}</th>
                  <th className="p-2">{t('import.col.example')}</th><th className="p-2">{t('import.col.status')}</th>
                </tr>
              </thead>
              <tbody>
                {parsed.rows.map((r) => (
                  <tr key={r.line} className={r.valid ? '' : 'bg-bad-soft'}>
                    <td className="p-2 text-slate-400">{r.line}</td>
                    <td className="p-2 font-bold">{r.term}</td>
                    <td className="p-2">{r.translations.join(' | ')}</td>
                    <td className="max-w-40 truncate p-2 text-slate-500">{r.example}</td>
                    <td className="p-2 text-xs font-bold">
                      {r.valid ? <span className="text-good">{t('import.ok')}</span> : r.issues.map((i: RowIssue) => <div key={i} className="text-bad">{t(`import.issue.${i}` as Key)}</div>)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {problems > 0 && <p className="mt-2 text-sm text-slate-500">{t('import.skipInvalid')}</p>}
          {valid.length > 0 && !id && <p className="mt-1 text-sm text-slate-500">{t('import.unitsHint', { n: unitSizes(valid.length).length })}</p>}
          <button className="btn btn-primary mt-4 w-full" disabled={valid.length === 0 || busy} onClick={() => void save()} data-testid="save-import">
            {t('import.save', { n: valid.length })}
          </button>
        </section>
      )}
    </div>
  )
}
