/** Demo content shipped with the app (German for Romanian speakers). */
import { numberToGerman } from '../core/numbers'

export const COURSE = 'Menschen A1'

export const DEMO_DECK_NAME = 'Lektion 1 – Erste Wörter'
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

export const WOCHENTAGE_DECK_NAME = 'Lektion 3 – Wochentage'
export const WOCHENTAGE_TEXT = `der Montag, -e ; luni ; ; Am Montag habe ich Schule. ; wochentage
der Dienstag, -e ; marți ; ; Am Dienstag spiele ich Fußball. ; wochentage
der Mittwoch, -e ; miercuri ; ; Am Mittwoch lerne ich Deutsch. ; wochentage
der Donnerstag, -e ; joi ; ; Am Donnerstag gehe ich schwimmen. ; wochentage
der Freitag, -e ; vineri ; ; Am Freitag besuche ich Oma. ; wochentage
der Samstag|der Sonnabend, -e ; sâmbătă ; ; Am Samstag schlafe ich lange. ; wochentage
der Sonntag, -e ; duminică ; ; Am Sonntag essen wir zusammen. ; wochentage
heute ; azi|astăzi ; ; Heute ist Dienstag. ; zeit
morgen ; mâine ; ; Heute ist Dienstag. Morgen ist Mittwoch. ; zeit
übermorgen ; poimâine ; ; Heute ist Dienstag. Übermorgen ist Donnerstag. ; zeit
gestern ; ieri ; ; Heute ist Dienstag. Gestern war Montag. ; zeit
vorgestern ; alaltăieri ; ; Heute ist Dienstag. Vorgestern war Sonntag. ; zeit`

export const MONATE_DECK_NAME = 'Lektion 4 – Jahresmonate'
export const MONATE_TEXT = `der Januar|der Jänner (Sg.) ; ianuarie ; ; Im Januar ist es kalt. ; monate
der Februar (Sg.) ; februarie ; ; Wann hast du Geburtstag? – Im Februar. ; monate
der März (Sg.) ; martie ; ; Wann hast du Geburtstag? – Im März. ; monate
der April (Sg.) ; aprilie ; ; Wann hast du Geburtstag? – Im April. ; monate
der Mai (Sg.) ; mai ; ; Wann hast du Geburtstag? – Im Mai. ; monate
der Juni (Sg.) ; iunie ; ; Wann hast du Geburtstag? – Im Juni. ; monate
der Juli (Sg.) ; iulie ; ; Im Juli ist es heiß. ; monate
der August (Sg.) ; august ; ; Wann hast du Geburtstag? – Im August. ; monate
der September (Sg.) ; septembrie ; ; Wann hast du Geburtstag? – Im September. ; monate
der Oktober (Sg.) ; octombrie ; ; Wann hast du Geburtstag? – Im Oktober. ; monate
der November (Sg.) ; noiembrie ; ; Wann hast du Geburtstag? – Im November. ; monate
der Dezember (Sg.) ; decembrie ; ; Wann hast du Geburtstag? – Im Dezember. ; monate
der Frühling (Sg.) ; primăvara ; ; Im Frühling blühen die Blumen. ; jahreszeiten
der Sommer, ¨- ; vara ; ; Im Sommer ist es heiß. ; jahreszeiten
der Herbst, -e ; toamna ; ; Im Herbst fallen die Blätter. ; jahreszeiten
der Winter, - ; iarna ; ; Im Winter ist es kalt. ; jahreszeiten
der Monat, -e ; luna ; ; Ein Monat hat dreißig Tage. ; extra
die Jahreszeit, -en ; anotimpul ; ; Welche Jahreszeit magst du? ; extra
das Jahr, -e ; anul ; ; Ein Jahr hat zwölf Monate. ; extra
der Geburtstag, -e ; ziua de naștere ; ; Mein Geburtstag ist im Mai. ; extra`

export const FAMILIE_DECK_NAME = 'Lektion 5 – Familie'
export const FAMILIE_TEXT = `der Vater|der Papa, ¨- ; tatăl ; ; Wer ist das? – Das ist mein Vater. ; kernfamilie
die Mutter|die Mama, ¨- ; mama ; ; Wer ist das? – Das ist meine Mutter. ; kernfamilie
der Bruder, ¨- ; fratele ; ; Wer ist das? – Das ist mein Bruder. ; kernfamilie
die Schwester, -n ; sora ; ; Wer ist das? – Das ist meine Schwester. ; kernfamilie
der Sohn, ¨-e ; fiul ; ; Wer ist das? – Das ist mein Sohn. ; kernfamilie
die Tochter, ¨- ; fiica ; ; Wer ist das? – Das ist meine Tochter. ; kernfamilie
die Eltern (Pl.) ; părinții ; ; Meine Eltern wohnen in Cluj. ; kernfamilie
die Geschwister (Pl.) ; frații și surorile ; ; Ich habe drei Geschwister. ; kernfamilie
die Kinder (Pl.) ; copiii ; ; Meine Kinder sind klein. ; kernfamilie
die Großmutter|die Oma ; bunica ; die Großmütter|die Omas ; Wer ist das? – Das ist meine Oma. ; verwandte
der Großvater|der Opa ; bunicul ; die Großväter|die Opas ; Wer ist das? – Das ist mein Opa. ; verwandte
die Großeltern (Pl.) ; bunicii ; ; Meine Großeltern wohnen in Arad. ; verwandte
der Onkel, ¨- ; unchiul ; ; Wer ist das? – Das ist mein Onkel. ; verwandte
die Tante, -n ; mătușa ; ; Wer ist das? – Das ist meine Tante. ; verwandte
der Cousin, -s ; vărul ; ; Wer ist das? – Das ist mein Cousin. ; verwandte
die Cousine, -n ; vara ; ; Wer ist das? – Das ist meine Cousine. ; verwandte`

export const GERMAN_SEEDS: SeedLesson[] = [
  { key: 'familie', name: DEMO_DECK_NAME, text: DEMO_TEXT, lesson: 1 },
  { key: 'wfragen', name: WFRAGEN_DECK_NAME, text: WFRAGEN_TEXT, lesson: 2 },
  { key: 'wochentage', name: WOCHENTAGE_DECK_NAME, text: WOCHENTAGE_TEXT, lesson: 3 },
  { key: 'monate', name: MONATE_DECK_NAME, text: MONATE_TEXT, lesson: 4 },
  { key: 'familie2', name: FAMILIE_DECK_NAME, text: FAMILIE_TEXT, lesson: 5 },
  { key: 'zahlen', name: ZAHLEN_DECK_NAME, text: ZAHLEN_TEXT, lesson: 0 },
]
