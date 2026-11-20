import { useLiveQuery } from 'dexie-react-hooks'
import { Fragment, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  editRow, parseJsonWords, parseWordList, rowToInput, rowsFromJson, type JsonWordInput, type Lang, type ParsedRow, type RowEdit, type RowIssue, type RowWarning,
} from '../core/parser'
import { assignUnitsFor } from '../core/units'
import type { Cefr, WordType } from '../core/types'
import { Term } from '../components/Term'
import { PERSONS } from '../core/conjugation'
import { db } from '../data/db'
import { addWords, createDeck, lessonFromName, setMeta } from '../data/repo'
import { t, type Key } from '../i18n'

const CEFR: Cefr[] = ['A1', 'A2', 'B1', 'B2', 'C1']

export default function Import() {
  const { id } = useParams()
  const nav = useNavigate()
  const [text, setText] = useState('')
  const [json, setJson] = useState<JsonWordInput[] | null>(null)
  const [name, setName] = useState('')
  const [course, setCourse] = useState('')
  const [cefr, setCefr] = useState<Cefr | ''>('')
  const [lessonNo, setLessonNo] = useState('')
  const [lang, setLang] = useState<Lang>('de')
  const [edits, setEdits] = useState<Record<number, RowEdit>>({})
  const [drafts, setDrafts] = useState<Record<number, string[]>>({})
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const deck = useLiveQuery(async () => (id ? db.decks.get(id) : undefined), [id])
  const existing = useLiveQuery(async () => (id ? (await db.words.where('deckId').equals(id).toArray()).map((w) => w.term) : []), [id]) ?? []
  const effLang: Lang = deck ? (deck.l2.toLowerCase().startsWith('en') ? 'en' : 'de') : lang

  const base = useMemo(() => (json ? rowsFromJson(json, existing) : parseWordList(text, existing, effLang)), [json, text, existing, effLang])
  const rows: ParsedRow[] = useMemo(() => base.rows.map((r) => (edits[r.line] ? editRow(r, edits[r.line] as RowEdit) : r)), [base, edits])
  const valid = rows.filter((r) => r.valid)
  const problems = rows.length - valid.length
  const warnCount = rows.filter((r) => r.warnings.length > 0).length

  const edit = (row: ParsedRow, patch: RowEdit) => setEdits((e) => ({ ...e, [row.line]: { ...(e[row.line] ?? {}), ...patch } }))

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setErr(null)
    setEdits({})
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
    const items = valid.map(rowToInput)
    if (id) {
      await addWords(id, items)
      nav(`/decks/${id}`)
    } else {
      const n = name || t('decks.new')
      const lesson = lessonNo ? Number(lessonNo) : lessonFromName(n)
      const newId = await createDeck(n, items, {
        l2: lang === 'en' ? 'English' : 'German',
        ...(course.trim() ? { course } : {}),
        ...(cefr ? { cefr } : {}),
        ...(lesson !== undefined ? { lesson } : {}),
      })
      await setMeta('activeDeckId', newId)
      nav('/')
    }
  }

  const german = effLang === 'de' && !json
  const setPerson = (r: ParsedRow, i: number, v: string) => {
    const cur = drafts[r.line] ?? (r.verb?.present ? [...r.verb.present] : ['', '', '', '', '', ''])
    const next = cur.map((x, j) => (j === i ? v : x))
    setDrafts((d) => ({ ...d, [r.line]: next }))
    if (next.every((x) => x.trim())) edit(r, { forms: `P: ${next.map((x) => x.trim()).join(', ')}` })
  }

  return (
    <div>
      <h1 className="mb-3 text-2xl font-black">{deck ? t('import.addTo', { name: deck.name }) : t('import.title')}</h1>
      {!id && (
        <div className="mb-3 grid gap-2">
          <input className="input" value={name} placeholder={t('import.deckName')} aria-label={t('import.deckName')} onChange={(e) => setName(e.target.value)} data-testid="deck-name" />
          <input className="input !py-2 !text-base" value={course} placeholder={t('import.course')} aria-label={t('import.course')} onChange={(e) => setCourse(e.target.value)} data-testid="deck-course" />
          <div className="grid grid-cols-3 gap-2">
            <select className="input !py-2 !text-base" aria-label={t('import.cefr')} value={cefr} onChange={(e) => setCefr(e.target.value as Cefr | '')} data-testid="deck-cefr">
              <option value="">{t('import.cefr')}</option>
              {CEFR.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input className="input !py-2 !text-base" inputMode="numeric" value={lessonNo} placeholder={t('import.lesson')} aria-label={t('import.lesson')} onChange={(e) => setLessonNo(e.target.value.replace(/\D/g, ''))} />
            <select className="input !py-2 !text-base" aria-label={t('import.lang')} value={lang} onChange={(e) => setLang(e.target.value as Lang)} data-testid="deck-lang">
              <option value="de">{t('import.langDe')}</option>
              <option value="en">{t('import.langEn')}</option>
            </select>
          </div>
        </div>
      )}
      <p className="mb-2 text-sm text-slate-600">{effLang === 'de' ? t('import.helpDe') : t('import.help')}</p>
      <textarea className="input h-40 font-mono !text-sm" placeholder={t('import.paste')} value={text} onChange={(e) => { setText(e.target.value); setJson(null); setEdits({}) }} data-testid="paste-box" />
      <div className="mt-2">
        <input ref={fileRef} type="file" accept=".csv,.tsv,.txt,.json" className="hidden" onChange={onFile} data-testid="file-input" />
        <button className="btn btn-ghost !py-2 !text-sm" onClick={() => fileRef.current?.click()}>📁 {t('import.file')}</button>
      </div>
      {err && <p className="mt-2 font-bold text-bad">{err}</p>}

      {rows.length > 0 && (
        <section className="mt-5" data-testid="preview">
          <h2 className="mb-1 text-lg font-black">{t('import.preview')}</h2>
          <p className="mb-2 text-sm font-bold text-slate-600">
            {base.separator ? t('import.separator', { s: JSON.stringify(base.separator) }) : json ? '' : t('import.noSeparator')}
            {' · '}<span className="text-good">{t('import.valid', { n: valid.length })}</span>
            {problems > 0 && <> · <span className="text-bad">{t('import.problems', { n: problems })}</span></>}
            {warnCount > 0 && <> · <span className="text-amber-700" data-testid="warn-count">{t('import.warnings', { n: warnCount })}</span></>}
          </p>
          {german && <p className="mb-2 text-xs text-slate-500">{t('import.editHint')}</p>}
          <div className="overflow-x-auto rounded-2xl border-2 border-slate-100 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="p-2">#</th><th className="p-2">{t('import.col.term')}</th>
                  {german && <th className="p-2">{t('import.col.type')}</th>}
                  {german && <th className="p-2">{t('import.col.plural')}</th>}
                  {german && <th className="p-2">{t('import.col.forms')}</th>}
                  <th className="p-2">{t('import.col.translations')}</th><th className="p-2">{t('import.col.example')}</th><th className="p-2">{t('import.col.status')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <Fragment key={r.line}>
                  <tr className={r.valid ? (r.warnings.length ? 'bg-amber-50' : '') : 'bg-bad-soft'} data-testid="preview-row">
                    <td className="p-2 text-slate-400">{r.line}</td>
                    <td className="p-2 font-bold">
                      {german ? (
                        <input className="w-36 rounded-lg border border-slate-200 px-1 py-0.5 font-bold" value={r.term} aria-label={t('import.col.term')} onChange={(e) => edit(r, { term: e.target.value })} />
                      ) : r.term}
                      {german && r.gender && <div className="text-xs"><Term text={r.term} /></div>}
                    </td>
                    {german && (
                      <td className="p-2">
                        <select className="rounded-lg border border-slate-200 px-1 py-0.5" value={r.type ?? 'other'} aria-label={t('import.col.type')} onChange={(e) => edit(r, { type: e.target.value as WordType })}>
                          {(['noun', 'verb', 'other'] as const).map((k) => <option key={k} value={k}>{t(`import.type.${k}` as Key)}</option>)}
                        </select>
                      </td>
                    )}
                    {german && (
                      <td className="p-2">
                        {r.type === 'noun' ? (
                          <span className="whitespace-nowrap">
                            {r.pluralOnly ? '(Pl.) ' : r.plural === null ? '(Sg.) ' : r.plural ? 'die ' : ''}
                            <input className="w-24 rounded-lg border border-slate-200 px-1 py-0.5" value={r.plural ?? ''} aria-label={t('import.col.plural')} data-testid="plural-input" onChange={(e) => edit(r, { plural: e.target.value })} />
                          </span>
                        ) : null}
                      </td>
                    )}
                    {german && (
                      <td className="p-2">
                        {r.type === 'verb' ? (
                          <input className="w-40 rounded-lg border border-slate-200 px-1 py-0.5" value={r.forms ?? ''} aria-label={t('import.col.forms')} onChange={(e) => edit(r, { forms: e.target.value })} />
                        ) : null}
                        {r.verb?.auxiliary && <div className="text-xs text-slate-500">{r.verb.auxiliary}{r.verb.separable ? ' · sep.' : ''}{r.verb.irregular ? ' · unr.' : ''}</div>}
                      </td>
                    )}
                    <td className="p-2">{r.translations.join(' | ')}{r.alternatives?.length ? <div className="text-xs text-slate-500">≈ {r.alternatives.join(' | ')}</div> : null}</td>
                    <td className="max-w-40 truncate p-2 text-slate-500">{r.example}</td>
                    <td className="p-2 text-xs font-bold">
                      {r.valid && r.warnings.length === 0 && <span className="text-good">{t('import.ok')}</span>}
                      {!r.valid && r.issues.map((i: RowIssue) => <div key={i} className="text-bad">{t(`import.issue.${i}` as Key)}</div>)}
                      {r.warnings.map((w: RowWarning) => <div key={w} className="text-amber-700" data-testid={`warn-${w}`}>{t(`import.warn.${w}` as Key)}</div>)}
                    </td>
                  </tr>
                  {german && r.verb?.present && (
                    <tr className="bg-slate-50" data-testid="present-table">
                      <td />
                      <td colSpan={7} className="p-2">
                        <div className="mb-1 flex items-center gap-2 text-xs font-bold text-slate-500">
                          Präsens
                          {r.verb.irregular && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800" data-testid="irregular-flag">neregulat</span>}
                        </div>
                        <ul className="grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-3">
                          {PERSONS.map((p, i) => (
                            <li key={p} className="flex items-center gap-1 text-xs">
                              <span className="w-16 text-slate-500">{p}</span>
                              <input className="w-24 rounded-lg border border-slate-200 px-1 py-0.5 font-bold" aria-label={`${r.term} ${p}`} value={drafts[r.line]?.[i] ?? r.verb?.present?.[i] ?? ''}
                                onChange={(e) => setPerson(r, i, e.target.value)} />
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          {problems > 0 && <p className="mt-2 text-sm text-slate-500">{t('import.skipInvalid')}</p>}
          {valid.length > 0 && !id && <p className="mt-1 text-sm text-slate-500">{t('import.unitsHint', { n: new Set(assignUnitsFor(valid)).size })}</p>}
          <button className="btn btn-primary mt-4 w-full" disabled={valid.length === 0 || busy} onClick={() => void save()} data-testid="save-import">
            {t('import.save', { n: valid.length })}
          </button>
        </section>
      )}
    </div>
  )
}
