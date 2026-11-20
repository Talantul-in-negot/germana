ROOT = 'C:/Users/Sergiu/Desktop/Projects/De/'


def rd(p):
    return open(ROOT + p, encoding='utf-8').read()


def wr(p, s):
    open(ROOT + p, 'w', encoding='utf-8').write(s)


def must(s, old, new):
    assert old in s, old[:70]
    return s.replace(old, new, 1)


# tidy a silly expression in a test
s = rd('tests/family.test.ts')
s = s.replace("find('die Oma' === 'x' ? 'x' : 'die Großmutter')", "find('die Großmutter')")
wr('tests/family.test.ts', s)

# ---------- i18n
s = rd('src/i18n/ro.ts')
s = must(s, "  'common.lessonShort': 'Lecția {n}',\n", """  'common.lessonShort': 'Lecția {n}',

  'ex.seq_order': 'Pune în ordine',
  'ex.seq_neighbor': 'Ce urmează?',
  'ex.seq_neighbor_type': 'Scrie ce urmează',
  'ex.fill_prep': 'Completează cu prepoziția',
  'ex.listen_ro': 'Ascultă și alege sensul',
  'ex.month_season': 'Luna și anotimpul',
  'ex.season_months': 'Lunile anotimpului',
  'ex.gender_pairs': 'Potrivește masculinul cu femininul',
  'ex.collective': 'Cuvântul colectiv',
  'ex.possessive': 'Alege mein sau meine',
  'ex.seqHelp': 'Atinge cuvintele în ordinea corectă. Atinge un cuvânt pus ca să-l scoți.',
  'lesson.info': 'Bine de știut',
  'lesson.infoContinue': 'Am înțeles',
  'lesson.infoDays': 'Toate zilele sunt der. Cu zilele folosim «am»: am Montag = luni / în ziua de luni.',
  'lesson.infoMonths': 'Lunile și anotimpurile sunt toate der. Cu ele folosim «im»: im Mai = în mai, im Winter = iarna.',
  'test.sequence': 'Ordinea: {set}',
  'test.sequenceHelp': 'Toate elementele trebuie să fie în ordine ca să primești punctul.',
  'test.set.wochentage': 'zilele săptămânii',
  'test.set.monate': 'lunile anului',
  'test.set.jahreszeiten': 'anotimpurile',
  'test.extraOk': 'în ordine',
""")
wr('src/i18n/ro.ts', s)

# ---------- ExerciseView
s = rd('src/components/exercises/ExerciseView.tsx')
s = must(s, "  evaluateVerbForms, type ArticleExercise,", "  evaluateSequence, evaluateVerbForms, type ArticleExercise,")
s = must(s, "type SentenceExercise, type SeparableExercise, type TypeExercise, type VerbFormsExercise,", "type SentenceExercise, type SeparableExercise, type SequenceExercise, type TypeExercise, type VerbFormsExercise,")
s = must(s, "const LISTEN_CHOICE = new Set(['listen_choose', 'context_listen'])", "const LISTEN_CHOICE = new Set(['listen_choose', 'context_listen', 'listen_ro'])")
s = must(s, "const TERM_OPTIONS = new Set(['mc_l1_l2', 'listen_choose', 'fill_blank'])", "const TERM_OPTIONS = new Set(['mc_l1_l2', 'listen_choose', 'fill_blank', 'collective'])")
s = must(s, "{ex.type === 'mc_l2_l1' || ex.type === 'plural_choice' || ex.type === 'num_word_to_digits' ? <Term text={ex.prompt} /> : ex.prompt}",
         "{ex.type === 'mc_l2_l1' || ex.type === 'plural_choice' || ex.type === 'num_word_to_digits' || ex.type === 'month_season' ? <Term text={ex.prompt} /> : ex.prompt}")
s = must(s, "<SpeakerButton big={ex.type === 'listen_choose'} onClick={() => say(ex.speak ?? '')} />", "<SpeakerButton big={ex.type === 'listen_choose' || ex.type === 'listen_ro'} onClick={() => say(ex.speak ?? '')} />")

# SequenceView before SentenceView
s = must(s, "export function SentenceView(", """export function SequenceView({ ex, locked, onReady }: ExerciseProps<SequenceExercise>) {
  const missing = ex.given.map((g, i) => (g === null ? i : -1)).filter((i) => i >= 0)
  const [slots, setSlots] = useState<(string | null)[]>(() => missing.map(() => null))
  useEffect(() => {
    onReady(slots.every((x) => x !== null) ? () => evaluateSequence(ex, slots) : null)
  }, [slots, ex, onReady])
  const place = (w: string) => {
    if (locked) return
    const i = slots.indexOf(null)
    if (i >= 0) setSlots(slots.map((x, j) => (j === i ? w : x)))
  }
  const remove = (j: number) => {
    if (!locked) setSlots(slots.map((x, k) => (k === j ? null : x)))
  }
  const left = ex.bank.filter((w) => !slots.includes(w))
  return (
    <div>
      <Title type="seq_order" />
      <p className="mb-3 text-sm text-slate-500">{t('ex.seqHelp')}</p>
      <ol className="mb-4 grid grid-cols-2 gap-2" data-testid="seq-slots">
        {ex.days.map((d, i) => {
          const j = missing.indexOf(i)
          const given = ex.given[i]
          return (
            <li key={i} className="flex items-center gap-2">
              <span className="w-6 text-right text-sm font-black text-slate-400">{i + 1}</span>
              {given !== null && given !== undefined ? (
                <span className="choice !py-2 !text-base" data-state="right">{given}</span>
              ) : (
                <button type="button" disabled={locked} onClick={() => remove(j)} data-testid={`slot-${i}`}
                  className={`choice !py-2 !text-base ${slots[j] ? '' : 'border-dashed !text-slate-300'}`}>
                  {slots[j] ?? '…'}
                </button>
              )}
            </li>
          )
        })}
      </ol>
      <div className="flex flex-wrap gap-2" data-testid="seq-bank">
        {left.map((w) => (
          <button key={w} type="button" disabled={locked} className="choice !w-auto !px-3 !py-2 !text-base" onClick={() => place(w)}>{w}</button>
        ))}
      </div>
    </div>
  )
}

export function SentenceView(""")

# switch cases
s = must(s, "    case 'num_word_to_digits':\n      return <ChoiceView", "    case 'num_word_to_digits':\n    case 'seq_neighbor':\n    case 'fill_prep':\n    case 'listen_ro':\n    case 'month_season':\n    case 'season_months':\n    case 'collective':\n    case 'possessive':\n      return <ChoiceView")
s = must(s, "    case 'match':\n    case 'match_qa':\n", "    case 'match':\n    case 'match_qa':\n    case 'gender_pairs':\n")
s = must(s, "    case 'num_arith':\n      return <TypeView", "    case 'num_arith':\n    case 'seq_neighbor_type':\n      return <TypeView")
s = must(s, "    case 'separable':\n      return <SeparableView {...(p as ExerciseProps<SeparableExercise>)} />", "    case 'separable':\n      return <SeparableView {...(p as ExerciseProps<SeparableExercise>)} />\n    case 'seq_order':\n      return <SequenceView {...(p as ExerciseProps<SequenceExercise>)} />")
wr('src/components/exercises/ExerciseView.tsx', s)

# match view: gender pairs both columns coloured, nicer size
s = rd('src/components/exercises/ExerciseView.tsx')
s = must(s, "<Term text={p.left} />\n            </button>", "<Term text={p.left} />\n            </button>")
s = must(s, "              {r.text}\n            </motion.button>", "              {ex.type === 'gender_pairs' ? <Term text={r.text} /> : r.text}\n            </motion.button>")
wr('src/components/exercises/ExerciseView.tsx', s)
print('E ok')
