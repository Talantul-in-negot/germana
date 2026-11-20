import type { Outcome } from '../core/exercises'
import { PERSONS } from '../core/conjugation'
import { t, type Key } from '../i18n'
import { Breakdown, Term } from './Term'

/** Body of the feedback panel: verdict text, German notes, correct answer, number breakdown. */
export function FeedbackBody({ outcome, testId = 'feedback-body' }: { outcome: Outcome; testId?: string }) {
  const good = outcome.correct
  const notes = outcome.notes ?? []
  return (
    <div data-testid={testId}>
      <p className={`text-xl font-black ${good ? 'text-green-800' : 'text-red-800'}`}>{good ? t('lesson.correct') : t('lesson.wrong')}</p>
      {outcome.personNote && !good && (
        <p className="font-bold text-amber-900" data-testid="person-note">
          {t('note.conj', { p: PERSONS[outcome.personNote.person] ?? '', e: outcome.personNote.expected, g: outcome.personNote.given })}
        </p>
      )}
      {notes.map((n) => (
        <p key={n} className="font-bold text-amber-900" data-testid={`note-${n}`}>
          {t(`note.${n}` as Key, { a: outcome.expected })}
        </p>
      ))}
      {notes.length === 0 && outcome.note === 'diacritics' && <p className="font-bold text-green-900">{t('lesson.diacritics', { a: outcome.expected })}</p>}
      {notes.length === 0 && outcome.note === 'typo' && <p className="font-bold text-green-900">{t('lesson.typo', { a: outcome.expected })}</p>}
      {outcome.credits?.some((c) => c.skill === 'gender' && !c.correct) && outcome.correct && <p className="text-sm font-bold text-amber-900">{t('feedback.gender')}</p>}
      {!good && (
        <p className="font-bold text-red-900">
          {t('lesson.answer')} <span data-testid="correct-answer"><Term text={outcome.expected} /></span>
        </p>
      )}
      {outcome.breakdown && <Breakdown parts={outcome.breakdown} />}
    </div>
  )
}
