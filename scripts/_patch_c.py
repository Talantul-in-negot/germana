ROOT = 'C:/Users/Sergiu/Desktop/Projects/De/'
p = ROOT + 'src/data/seed.ts'
s = open(p, encoding='utf-8').read()
a = s.index('export const GERMAN_SEEDS')
s = s[:a] + '''export const WOCHENTAGE_DECK_NAME = 'Lektion 3 – Wochentage'
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

export const GERMAN_SEEDS: SeedLesson[] = [
  { key: 'familie', name: DEMO_DECK_NAME, text: DEMO_TEXT, lesson: 1 },
  { key: 'wfragen', name: WFRAGEN_DECK_NAME, text: WFRAGEN_TEXT, lesson: 2 },
  { key: 'wochentage', name: WOCHENTAGE_DECK_NAME, text: WOCHENTAGE_TEXT, lesson: 3 },
  { key: 'monate', name: MONATE_DECK_NAME, text: MONATE_TEXT, lesson: 4 },
  { key: 'zahlen', name: ZAHLEN_DECK_NAME, text: ZAHLEN_TEXT, lesson: 0 },
]
'''
open(p, 'w', encoding='utf-8').write(s)

p = ROOT + 'src/data/repo.ts'
s = open(p, encoding='utf-8').read()
a = s.index('/**\n * First run:')
b = s.index('// ---------- lesson tests ----------')
s = s[:a] + '''/**
 * First run: creates a profile and the German demo lessons. Each seed lesson is added once
 * (meta `seed:de:<key>`), also on installs that predate it, and never touches existing data.
 */
export async function ensureSeed(): Promise<void> {
  await db.transaction('rw', db.profiles, db.decks, db.words, db.meta, async () => {
    if ((await db.profiles.count()) === 0) {
      const p = makeProfile('Elev', AVATARS[0] as string)
      await db.profiles.add(p)
      await setMeta('activeProfileId', p.id)
    }
    const legacy = await getMeta<boolean>('seed:de1') // first German release: familie, wfragen, zahlen
    for (const seed of GERMAN_SEEDS) {
      const key = `seed:de:${seed.key}`
      if (await getMeta<boolean>(key)) continue
      if (legacy && ['familie', 'wfragen', 'zahlen'].includes(seed.key)) {
        await setMeta(key, true)
        continue
      }
      const items = parseWordList(seed.text).rows.filter((r) => r.valid).map(rowToInput)
      await createDeck(seed.name, items, { course: COURSE, cefr: 'A1', lesson: seed.lesson })
      await setMeta(key, true)
    }
    await setMeta('seeded', true)
  })
}

''' + s[b:]
open(p, 'w', encoding='utf-8').write(s)

p = ROOT + 'tests/data.test.ts'
s = open(p, encoding='utf-8').read()
s = s.replace('expect(await db.decks.count()).toBe(3)', 'expect(await db.decks.count()).toBe(5)')
s = s.replace('expect(words).toHaveLength(12 + 8 + 41)', 'expect(words).toHaveLength(12 + 8 + 12 + 20 + 41)')
open(p, 'w', encoding='utf-8').write(s)
print('C ok')
