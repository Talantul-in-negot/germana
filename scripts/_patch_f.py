ROOT = 'C:/Users/Sergiu/Desktop/Projects/De/'


def rd(p):
    return open(ROOT + p, encoding='utf-8').read()


def wr(p, s):
    open(ROOT + p, 'w', encoding='utf-8').write(s)


def must(s, old, new):
    assert old in s, old[:70]
    return s.replace(old, new, 1)


s = rd('src/components/exercises/ExerciseView.tsx')
s = s.replace("{ex.days.map((d, i) => {", "{ex.days.map((_, i) => {")
wr('src/components/exercises/ExerciseView.tsx', s)

s = rd('src/screens/Lesson.tsx')
s = must(s, "type Phase = 'loading' | 'empty' | 'noHearts' | 'answering'", "type Phase = 'loading' | 'empty' | 'noHearts' | 'info' | 'answering'")
s = must(s, "import { effectiveLevel, skillLevel } from '../core/srs'",
         "import { COLLECTIVES, isSetComplete, partnerOf } from '../core/exercises'\nimport { SEQ_SETS, seqOf, splitArticle } from '../core/german'\nimport { effectiveLevel, skillLevel } from '../core/srs'")
s = must(s, "  const [lang, setLang] = useState<SpeechLang>('de-DE')\n", "  const [lang, setLang] = useState<SpeechLang>('de-DE')\n  const [cards, setCards] = useState<('days' | 'months')[]>([])\n")
s = must(s, "          seenNumbers,\n        }\n      }", """          seenNumbers,
          completeSets: SEQ_SETS.filter((set) => isSetComplete(all, set)).map((set) => set.tag),
          hasSeasons: isSetComplete(all, SEQ_SETS[2] as (typeof SEQ_SETS)[number]),
          hasPairs: all.some((x) => partnerOf(x, all) !== null),
          collectives: all.some((x) => COLLECTIVES.some((c) => c.word === splitArticle(x.term).rest)),
        }
      }""")
s = must(s, "      setRt(plan)\n      startedAt.current = now\n      setPhase('answering')",
         """      setRt(plan)
      startedAt.current = now
      // one info card per kind of ordered set in the lesson (all der + am/im)
      const kinds = [...new Set(picked.map((w) => seqOf(w)?.set.info).filter((k): k is 'days' | 'months' => !!k))]
      setCards(kinds)
      setPhase(kinds.length ? 'info' : 'answering')""")
# info-phase render before summary check
s = must(s, "  if (phase === 'summary' && result) {", """  if (phase === 'info') {
    return (
      <div className="mx-auto flex h-full max-w-lg flex-col justify-center gap-4 p-6" data-testid="info-card">
        <Mascot size={90} />
        <h1 className="text-2xl font-black">{t('lesson.info')}</h1>
        {cards.map((c) => (
          <p key={c} className="rounded-2xl bg-brand-soft p-4 text-lg font-bold">{t(c === 'days' ? 'lesson.infoDays' : 'lesson.infoMonths')}</p>
        ))}
        <button className="btn btn-primary" onClick={() => setPhase('answering')} data-testid="info-continue">{t('lesson.infoContinue')}</button>
      </div>
    )
  }
  if (phase === 'summary' && result) {""")
wr('src/screens/Lesson.tsx', s)
print('F ok')
