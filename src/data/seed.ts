/** Demo content shipped with the app (German for Romanian speakers). */
import { numberToGerman } from '../core/numbers'

export const COURSE = 'Menschen A1'

export const DEMO_DECK_NAME = 'Lektion 1 – Familie'
export const DEMO_TEXT = `der Vater, ¨- ; tatăl ; ; Mein Vater arbeitet in einer Bank. ; familie
die Mutter, ¨- ; mama ; ; Meine Mutter kocht sehr gut. ; familie
das Kind, -er ; copilul ; ; Das Kind spielt im Garten. ; familie
der Bruder, ¨- ; fratele ; ; Mein Bruder ist größer als ich. ; familie
die Schwester, -n ; sora ; ; Meine Schwester spielt Klavier. ; familie
die Eltern (Pl.) ; părinții ; ; Meine Eltern wohnen in Cluj. ; familie
das Mädchen, - ; fata|fetița ; ; Das Mädchen liest ein Buch. ; familie
der Tisch, -e ; masa ; ; Das Buch liegt auf dem Tisch. ; haus
das Auto, -s ; mașina ; ; Unser Auto ist sehr alt. ; stadt
wohnen ; a locui ; wohnt, wohnte, hat gewohnt ; Ich wohne in Timișoara. ; verben
gehen ; a merge ; geht, ging, ist gegangen ; Wir gehen in die Schule. ; verben
aufstehen ; a se ridica|a se trezi ; steht auf, stand auf, ist aufgestanden ; Ich stehe um sieben Uhr auf. ; verben`

export const WFRAGEN_DECK_NAME = 'Lektion 2 – W-Fragen'
export const WFRAGEN_TEXT = `Was? ; Ce? ; ; Was ist das? – Das ist ein Buch.
Wer? ; Cine? ; ; Wer ist das? – Das ist mein Vater.
Wo? ; Unde? ; ; Wo wohnst du? – In Timișoara.
Woher? ; De unde? ; ; Woher kommst du? – Aus Rumänien.
Wie? ; Cum? ; ; Wie heißt du? – Ich heiße Ana.
Wann? ; Când? ; ; Wann beginnt die Schule? – Um acht Uhr.
Warum? ; De ce? ; ; Warum lernst du Deutsch? – Weil es Spaß macht.
Wie viel?|Wieviel? ; Cât?|Câți?|Câte? ; ; Wie viel kostet das? – Zwei Euro.`

export const ZAHLEN_DECK_NAME = 'Zahlen 0–40'

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

export const GERMAN_SEEDS: SeedLesson[] = [
  { key: 'familie', name: DEMO_DECK_NAME, text: DEMO_TEXT, lesson: 1 },
  { key: 'wfragen', name: WFRAGEN_DECK_NAME, text: WFRAGEN_TEXT, lesson: 2 },
  { key: 'zahlen', name: ZAHLEN_DECK_NAME, text: ZAHLEN_TEXT, lesson: 0 },
]
