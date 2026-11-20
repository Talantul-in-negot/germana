import { useState } from 'react'
import { levelOf } from '../core/srs'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { splitTranslations } from '../core/parser'
import type { Word } from '../core/types'
import { Confirm, LevelBadge, Sheet } from '../components/ui'
import { Term } from '../components/Term'
import { useDeckWords, useDecks, useProgressMap } from '../data/hooks'
import { useProfile } from '../data/profile-context'
import { deleteWord, renameDeck, updateWord } from '../data/repo'
import { t } from '../i18n'

export default function DeckDetail() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const { profile } = useProfile()
  const decks = useDecks()
  const words = useDeckWords(id)
  const progress = useProgressMap(profile.id)
  const [edit, setEdit] = useState<Word | null>(null)
  const [del, setDel] = useState<Word | null>(null)
  const [term, setTerm] = useState('')
  const [trans, setTrans] = useState('')
  const [example, setExample] = useState('')
  const [tags, setTags] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState('')

  const deck = decks?.find((d) => d.id === id)
  if (!decks || !words || !progress) return null
  if (!deck) return <button className="btn btn-ghost" onClick={() => nav('/decks')}>{t('common.back')}</button>

  const open = (w: Word) => {
    setEdit(w)
    setTerm(w.term)
    setTrans(w.translations.join(' | '))
    setExample(w.example ?? '')
    setTags(w.tags.join(', '))
  }
  const save = async () => {
    if (!edit) return
    const translations = splitTranslations(trans)
    if (!term.trim() || translations.length === 0) return
    await updateWord(edit.id, {
      term: term.trim(), translations, example: example.trim(),
      tags: tags.split(/[,\s]+/).map((x) => x.trim()).filter(Boolean),
    })
    setEdit(null)
  }

  const units = [...new Set(words.map((w) => w.unitIndex))]
  return (
    <div>
      <button className="mb-2 text-sm font-bold text-brand" onClick={() => nav('/decks')}>← {t('common.back')}</button>
      <div className="mb-4 flex items-center justify-between gap-2">
        {renaming ? (
          <input className="input !py-2" value={name} autoFocus onChange={(e) => setName(e.target.value)}
            onBlur={() => { if (name.trim()) void renameDeck(deck.id, name); setRenaming(false) }}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }} />
        ) : (
          <h1 className="text-2xl font-black" onDoubleClick={() => { setName(deck.name); setRenaming(true) }}>{deck.name}</h1>
        )}
        <button className="text-sm font-bold text-slate-500 underline" onClick={() => { setName(deck.name); setRenaming(true) }}>{t('decks.rename')}</button>
      </div>
      <Link to={`/decks/${id}/import`} className="btn btn-primary mb-4 w-full">+ {t('words.add')}</Link>

      {units.map((u) => (
        <section key={u} className="mb-5">
          <h2 className="mb-2 text-sm font-black uppercase text-slate-500">{t('words.unit', { n: u + 1 })}</h2>
          <ul className="grid gap-2">
            {words.filter((w) => w.unitIndex === u).map((w) => (
              <li key={w.id} className="card flex items-center gap-2 !p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-black"><Term text={w.term} />{w.alternatives?.length ? <span className="font-semibold text-slate-400"> | {w.alternatives.join(' | ')}</span> : null}</p>
                  <p className="truncate text-sm text-slate-600">{w.translations.join(' | ')}</p>
                  {(w.plural || w.verb?.present3sg) && (
                    <p className="truncate text-xs text-slate-500">
                      {w.plural ? `${w.pluralOnly ? '(Pl.) ' : 'Pl.: die '}${w.plural}${w.pluralAlternatives?.length ? ` | die ${w.pluralAlternatives.join(' | die ')}` : ''}` : ''}
                      {w.verb?.present3sg ? [w.verb.present3sg, w.verb.praeteritum, w.verb.perfekt].filter(Boolean).join(', ') : ''}
                    </p>
                  )}
                </div>
                <LevelBadge level={levelOf(progress.get(w.id))} />
                <button aria-label={t('common.edit')} className="text-xl" onClick={() => open(w)}>✏️</button>
                <button aria-label={t('common.delete')} className="text-xl" onClick={() => setDel(w)}>🗑️</button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <Sheet open={!!edit} onClose={() => setEdit(null)}>
        <div className="grid gap-3">
          <label className="text-sm font-bold">{t('words.term')}<input className="input mt-1" value={term} onChange={(e) => setTerm(e.target.value)} /></label>
          <label className="text-sm font-bold">{t('words.translations')}<input className="input mt-1" value={trans} onChange={(e) => setTrans(e.target.value)} /></label>
          <label className="text-sm font-bold">{t('words.example')}<input className="input mt-1" value={example} onChange={(e) => setExample(e.target.value)} /></label>
          <label className="text-sm font-bold">{t('words.tags')}<input className="input mt-1" value={tags} onChange={(e) => setTags(e.target.value)} /></label>
          <button className="btn btn-primary" onClick={() => void save()}>{t('common.save')}</button>
        </div>
      </Sheet>
      <Confirm open={!!del} text={del ? t('words.deleteConfirm', { term: del.term }) : ''} onNo={() => setDel(null)}
        onYes={() => { if (del) void deleteWord(del.id); setDel(null) }} />
    </div>
  )
}
