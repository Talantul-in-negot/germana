# DECISIONS

1. **Config**: L2 = English, L1 = Romanian, UI = Romanian (all strings in `src/i18n/ro.ts`). Learners: general (kids 8–14 and adults) — friendly, large tap targets.
2. **App name / mascot**: "Lexi Path"; original mascot "Lexi" (a small amber blob-fox, inline SVG). No third-party assets, sounds synthesized with WebAudio.
3. **Routing**: HashRouter (static hosting + offline PWA without server rewrites).
4. **State**: no global store lib; Dexie `useLiveQuery` for reads, small React context for the active profile.
5. **SRS**: simplified SM-2 + level gating. `strength` is computed from `dueAt`/`interval` at read time (never stored as truth), a stored value is kept for sorting convenience only.
6. **Level-up rule**: a level rises when `levelCredit` (weighted correct answers since last level change) ≥ threshold(level) AND those credits were earned across ≥2 distinct sessions (session = lesson id, and ≥2 distinct calendar days is required for level 4→5, guaranteeing Mastered cannot occur within one day).
7. **Level-appropriate exercises**: words at level L get exercise types of the band (0–1 recognition, 2–3 reverse recall, 4–5 production); if the data lacks required fields (no example), fall back within the band, then to the nearest band.
8. **Hearts**: OFF by default; when on: 5 max, 1 refills / 20 min, or a review lesson refills fully.
9. **Streak freeze**: 1 earned per 7-day streak milestone, max 2 held; auto-consumed on a missed day.
10. **Unit crowns**: avg level-weighted mastery of unit words: ≥25% bronze, ≥50% silver, ≥80% gold (avg of level/5).
11. **Unit unlocking**: unit N+1 unlocks when unit N has ≥ bronze crown (or any word-learning done on it ≥ 80% seen).
12. **Speaking**: shown only when `SpeechRecognition` exists and setting enabled; otherwise skipped.
13. **Import separators**: auto-detected per-file by majority; ` - ` and ` = ` treated as separators only when surrounded by spaces (to keep hyphenated words). Comma-separated alternatives not supported (use `|`).
14. **Unit size**: 8–10 words; chosen so no unit is smaller than 8 unless the deck itself is.
