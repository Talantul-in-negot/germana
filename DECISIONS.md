# DECISIONS

Choices made without asking (the brief said: pick the simplest reasonable option and log it).

## Base app
1. **Name / mascot**: "Lexi Path"; original inline-SVG mascot; sounds synthesized with WebAudio; no third-party assets.
2. **Routing/state**: HashRouter (static hosting, offline). Dexie `useLiveQuery` for reads, one small React context for the profile.
3. **SRS**: simplified SM-2 + level gating. `strength` is derived from `dueAt`/`interval`; the stored value is only a cache.
4. **First exposure** (0→1) needs no session spread (it only means "seen"); every later level needs ≥ 2 sessions; 4→5 needs ≥ 2 calendar days.
5. **Hearts** OFF by default; 5 max, +1 per 20 min, or a review lesson refills. **Streak freeze**: 1 per 7-day streak, max 2.
6. **Crowns** (units): average mastery ≥ 0.30 bronze, ≥ 0.60 silver, ≥ 0.85 gold. Unit N+1 unlocks when ≥ 80% of unit N was seen.
7. **Match exercise** credits only the target word (companions are filler); mistakes on the target's pair count against it.

## German extension
8. **L2 = German (de-DE), L1 = Romanian**; English decks stay supported (`deck.l2`), with the old 4-column import format.
9. **Nouns are stored with their article** in `term` ("das Mädchen"); the plural is stored bare ("Mädchen") and shown with "die".
10. **Sub-skills**: top-level progress fields ARE the `meaning` skill (so v1 progress migrates by construction); `gender`, `plural`, `forms`
    live in `skills`. Word level = min(meaning, requiredSkill + 2). Words with no required sub-skills are unaffected.
11. **Unit sizes**: lessons ≤ 12 words stay whole; larger ones split 8–10 (7 in the few sizes where 8–10 is impossible, e.g. 21).
    Group tags (`0-10`, `Monate`, any tag with spaces …) give one unit per group.
12. **Typo rule**: ≤ 1 edit on words > 4 chars, never when the result is another word of the course (lexicon rule), never when it only
    drops an umlaut. Cousin/Cousine is graded as a gender error (meaning false, gender failed), not as a typo.
13. **Weekdays/months/seasons** are one generic "ordered set" mechanism (tags `wochentage`/`monate`/`jahreszeiten`): sequence, next/previous,
    am/im fill-in, month↔season, listening, one info card. "Drag into order" is implemented as **tap to place / tap to remove**
    (more reliable on phones than drag-and-drop).
14. **Numbers**: `n=<int>` tag; German number words generated for 0–100; digits are accepted as an equivalent answer; a wrong 21–40 word is
    retried as "digits → type the word", inserted before any other pending exercise of that word, with an ein + und + zwanzig breakdown.
15. **Family**: `(Pl.)` nouns need `gender` only (meaning + article), never plural drills. Umlaut plurals are drilled ~2× as often.
16. **Test lecție**: counts every direction as one point; a sequence extra counts as one point; a present-tense verb counts as one point
    (≥ 5/6 persons). Failed words get `dueAt = now` on every sub-skill. Passing mark for "Verificată ✓" is ≥ 90%.
17. **Deploy**: Vite `base` = `VITE_BASE` or `./` (relative, works under any sub-path with the hash router). PNG icons are generated from the SVG.
    The service worker precaches the whole shell. Reminder: backup older than 7 days (installation date counts if no backup yet), snoozed for a day.

## Verbs (Präsens)
18. **Model**: `verb.present` is a 6-tuple; `present3sg` derives from index 2. Irregularity = table differs from stem + -e/-st/-t/-en/-t/-en
    (with e-insertion after d/t). Multi-word tags are group labels; machine tags (`n=21`, `0-10`) may still be space separated.
19. **Per person SRS**: `WordProgress.persons[6]`; forms level = floor(mean of the 6 person levels); word strength = min(meaning, mean person strength).
20. **Conjugare** stage state is `conj.passed[3]` (date of first pass). Stage k opens only on a day after stage k-1 was passed; a stage cannot be
    recorded twice. Pass = ≥ 5/6 persons right on their first attempt (stage 2 has two rows per person: both must be right). Wrong rows repeat at the end.
    The node tier = stages passed, capped at silver while any person is < 60%.
21. **Sentence building from Romanian** needs a Romanian translation per sentence. The brief's seed text has none, so translations for the 20
    seed sentences live in `VERB_SENTENCE_RO` and are attached on seeding (`Word.exampleRo`); user imports get the other exercises.
22. **Stage 2 sentences**: the example sentences only cover a couple of persons, so a sentence is rewritten for the asked person
    (Subject + Verb + rest) when possible; otherwise a "pronoun ___ (verb)" row is used.
23. **Peeking at the card** costs 2 XP per peek (levels 0–2); the card opens automatically the first time a level-0 verb appears; hidden at level 3+ and in tests.
24. **Dexie**: v2 adds `tests` and sub-skill containers; v3 adds optional `persons`/`conj` (no schema change). Both keep all existing rows (covered by tests).

## Known limitations / not verified
* Speech recognition, TTS voices and the iPhone behaviour were not exercised in a real device here (only headless Chromium with speech stubbed).
* The GitHub Pages workflow was written but not run (no repository was available); `npm run build` with a custom `VITE_BASE` was not exercised either.
* Unit tests (243) cover `src/core` at ~94% statements (srs.ts ~97%); screens are covered only by 4 Playwright flows.

## Cleanup of assistant-added content (Dexie v4)
25. **Only supplied words ship**: W-Fragen 8, Zahlen 41, Wochentage 7, Jahresmonate 12, Familie 16, Verben 10; no demo course; all `example` fields empty.
    Words dropped from Wochentage/Monate are everything without the `wochentage` / `monate` tag (this also covers übermorgen, vorgestern, die Jahreszeit, der Geburtstag,
    which the assistant had added besides the words named in the brief).
26. **Migration v4** (`cleanSeedContent` in `data/db.ts`) matches the shipped lessons by name, deletes the demo deck and the non-supplied words with their progress,
    clears `example`/`exampleRo` on the remaining seed words and re-numbers unit indices. Other decks (imported by the adult) are never touched. Progress rows of kept words are untouched.
27. **Tests keep their own example-rich fixture** (`tests/fixtures/seed-fixture.ts`); the shipped seed no longer has `VERB_SENTENCE_RO`.
28. **No exercise code changed**: sentence exercises appear for any word that has an example; Conjugare stage 2 already falls back to the "pronoun ___ (verb)" rows.

## No locks, no time gates
29. **Everything is open from the first launch**: units, verbs, the 3 Conjugare stages, "Toate verbele", "Test lecție", "Articole rapid", "Exersează cuvintele slabe".
    The path marks only the first not-yet-bronze unit as the suggested one (`data-status="next"`); `UnitStatus` is `open | completed`.
30. **Conjugare** has a stage selector (tabs) and no pass/fail rule: the result screen only shows first-try count and XP. The stage-pass dates (`WordProgress.conj`)
    were deleted by Dexie v5; a verb's crown is `verbCrown` = average of its 6 persons, no 60% cap.
31. **Hints**: the conjugation card is always available (ⓘ in lessons, toggle in stages 2-3), free of XP cost. Test lecție never shows it.
32. A mode with nothing to practise shows the friendly `lesson.nothing` message instead of a lock. "Se deblochează" / 🔒 strings were removed; achievements keep their own "Blocată" label (not a gate).
