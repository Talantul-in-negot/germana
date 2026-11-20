/** Lessons shipped with the app: ONLY words supplied by the learner (no examples; the adult adds sentences later). */
import { numberToGerman } from '../core/numbers'

export const COURSE = 'Menschen A1'

export const WFRAGEN_DECK_NAME = 'Lektion 2 – W-Fragen'
export const WFRAGEN_TEXT = `Was? ; Ce? ; ; ;
Wer? ; Cine? ; ; ;
Wo? ; Unde? ; ; ;
Woher? ; De unde? ; ; ;
Wie? ; Cum? ; ; ;
Wann? ; Când? ; ; ;
Warum? ; De ce? ; ; ;
Wie viel?|Wieviel? ; Cât?|Câți?|Câte? ; ; ;`

export const ZAHLEN_DECK_NAME = 'Lektion 1 – Zahlen 0–40'

const RO_UNITS = ['zero', 'unu', 'doi', 'trei', 'patru', 'cinci', 'șase', 'șapte', 'opt', 'nouă', 'zece', 'unsprezece', 'doisprezece', 'treisprezece', 'paisprezece', 'cincisprezece', 'șaisprezece', 'șaptesprezece', 'optsprezece', 'nouăsprezece']
const RO_TENS = ['', '', 'douăzeci', 'treizeci', 'patruzeci']

function romanianNumber(n: number): string {
  if (n < 20) return RO_UNITS[n] as string
  const u = n % 10
  const tens = RO_TENS[Math.floor(n / 10)] as string
  if (u === 0) return tens
  const unit = u === 2 ? 'doi' : (RO_UNITS[u] as string)
  return `${tens} și ${unit}`
}

function groupOf(n: number): string {
  return n <= 10 ? '0-10' : n <= 20 ? '11-20' : n <= 30 ? '21-30' : '31-40'
}

export const ZAHLEN_TEXT = Array.from({ length: 41 }, (_, n) => `${numberToGerman(n)} ; ${romanianNumber(n)} ; ; ; n=${n} ${groupOf(n)}`).join('\n')

export interface SeedLesson {
  key: string
  name: string
  text: string
  lesson: number
}

export const WOCHENTAGE_DECK_NAME = 'Lektion 3 – Wochentage'
export const WOCHENTAGE_TEXT = `der Montag, -e ; luni ; ; ; wochentage
der Dienstag, -e ; marți ; ; ; wochentage
der Mittwoch, -e ; miercuri ; ; ; wochentage
der Donnerstag, -e ; joi ; ; ; wochentage
der Freitag, -e ; vineri ; ; ; wochentage
der Samstag|der Sonnabend, -e ; sâmbătă ; ; ; wochentage
der Sonntag, -e ; duminică ; ; ; wochentage`

export const MONATE_DECK_NAME = 'Lektion 4 – Jahresmonate'
export const MONATE_TEXT = `der Januar|der Jänner (Sg.) ; ianuarie ; ; ; monate
der Februar (Sg.) ; februarie ; ; ; monate
der März (Sg.) ; martie ; ; ; monate
der April (Sg.) ; aprilie ; ; ; monate
der Mai (Sg.) ; mai ; ; ; monate
der Juni (Sg.) ; iunie ; ; ; monate
der Juli (Sg.) ; iulie ; ; ; monate
der August (Sg.) ; august ; ; ; monate
der September (Sg.) ; septembrie ; ; ; monate
der Oktober (Sg.) ; octombrie ; ; ; monate
der November (Sg.) ; noiembrie ; ; ; monate
der Dezember (Sg.) ; decembrie ; ; ; monate`

export const FAMILIE_DECK_NAME = 'Lektion 5 – Familie'
export const FAMILIE_TEXT = `der Vater|der Papa, ¨- ; tatăl ; ; ; kernfamilie
die Mutter|die Mama, ¨- ; mama ; ; ; kernfamilie
der Bruder, ¨- ; fratele ; ; ; kernfamilie
die Schwester, -n ; sora ; ; ; kernfamilie
der Sohn, ¨-e ; fiul ; ; ; kernfamilie
die Tochter, ¨- ; fiica ; ; ; kernfamilie
die Eltern (Pl.) ; părinții ; ; ; kernfamilie
die Geschwister (Pl.) ; frații și surorile ; ; ; kernfamilie
die Kinder (Pl.) ; copiii ; ; ; kernfamilie
die Großmutter|die Oma ; bunica ; ; ; verwandte
der Großvater|der Opa ; bunicul ; ; ; verwandte
die Großeltern (Pl.) ; bunicii ; ; ; verwandte
der Onkel, ¨- ; unchiul ; ; ; verwandte
die Tante, -n ; mătușa ; ; ; verwandte
der Cousin, -s ; vărul ; ; ; verwandte
die Cousine, -n ; vara ; ; ; verwandte`

export const VERBEN_DECK_NAME = 'Lektion 6 – Verben (Präsens)'
export const VERBEN_TEXT = `sein ; a fi ; P: bin, bist, ist, sind, seid, sind ; ; Sein und Haben
haben ; a avea ; P: habe, hast, hat, haben, habt, haben ; ; Sein und Haben
lernen ; a învăța ; P: lerne, lernst, lernt, lernen, lernt, lernen ; ; Regelmäßige Verben
wohnen ; a locui ; P: wohne, wohnst, wohnt, wohnen, wohnt, wohnen ; ; Regelmäßige Verben
spielen ; a juca|a se juca ; P: spiele, spielst, spielt, spielen, spielt, spielen ; ; Regelmäßige Verben
singen ; a cânta ; P: singe, singst, singt, singen, singt, singen ; ; Regelmäßige Verben
kommen ; a veni ; P: komme, kommst, kommt, kommen, kommt, kommen ; ; Regelmäßige Verben
gehen ; a merge ; P: gehe, gehst, geht, gehen, geht, gehen ; ; Regelmäßige Verben
fragen ; a întreba ; P: frage, fragst, fragt, fragen, fragt, fragen ; ; Regelmäßige Verben
schreiben ; a scrie ; P: schreibe, schreibst, schreibt, schreiben, schreibt, schreiben ; ; Regelmäßige Verben`

export const GERMAN_SEEDS: SeedLesson[] = [
  { key: 'wfragen', name: WFRAGEN_DECK_NAME, text: WFRAGEN_TEXT, lesson: 2 },
  { key: 'wochentage', name: WOCHENTAGE_DECK_NAME, text: WOCHENTAGE_TEXT, lesson: 3 },
  { key: 'monate', name: MONATE_DECK_NAME, text: MONATE_TEXT, lesson: 4 },
  { key: 'familie2', name: FAMILIE_DECK_NAME, text: FAMILIE_TEXT, lesson: 5 },
  { key: 'verben', name: VERBEN_DECK_NAME, text: VERBEN_TEXT, lesson: 6 },
  { key: 'zahlen', name: ZAHLEN_DECK_NAME, text: ZAHLEN_TEXT, lesson: 1 },
]
