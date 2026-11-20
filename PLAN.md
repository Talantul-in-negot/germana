# PLAN — Lexi Path

Local-first PWA: user word lists → learning path → varied exercises → per-word mastery (SRS) + gamification.

## Architecture
- **React + TS + Vite**, Tailwind v4, Framer Motion, react-router (hash router → works offline/static hosting).
- **Pure core** (`src/core`, no React, no DOM, no Dexie): `srs.ts`, `parser.ts`, `answer.ts`, `lesson.ts`, `exercises.ts`, `gamification.ts`, `units.ts`. All unit-tested.
- **Data layer** (`src/data`): Dexie schema (`db.ts`), repositories (`repo.ts`), export/import (`backup.ts`), demo seed.
- **UI** (`src/screens`, `src/components`): thin; calls core + repo. `src/i18n/ro.ts` holds every UI string.
- **Lib** (`src/lib`): TTS/STT wrappers, sound effects (WebAudio, no assets).

## Folder structure
```
src/core      srs, parser, answer checker, exercise generation, lesson builder, gamification rules
src/data      db, repo, backup, seed
src/i18n      ro.ts + t()
src/lib       speech, sound
src/components  shared UI + exercises/*
src/screens   Home(Path), Decks, DeckDetail, Import, Lesson, Summary, Progress, Settings, Profiles
tests/        vitest
e2e/          playwright happy path
```

## Milestones
1. **M1** import parser + decks/words CRUD + Dexie + seed demo deck.
2. **M2** SRS core + tests (≥90% coverage on `src/core`).
3. **M3** exercise generators, answer checker, components, lesson engine/screen/summary.
4. **M4** XP, daily goal, streak + freezes, hearts, path with crowns, achievements, profiles.
5. **M5** progress views, heatmap, weak-words lesson, export/import, settings, PWA, README, e2e.
