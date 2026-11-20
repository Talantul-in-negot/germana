# Ilustrații (src/art)

Everything is hand-built inline SVG (no raster, no external files). Preview it all in `src/screens/DevScenes.tsx`
(not routed: mount it temporarily, e.g. `<Route path="/dev/scenes" element={<DevScenes />} />`).

```tsx
import { Scene, Animal, CrownBadge, Celebration } from '../art'
import { zoneForIndex, MASCOT_NAME } from '../theme/scenes'

<Scene zone={zoneForIndex(lessonIndex)} variant="dim" scrollY={y}>{content}</Scene>   // fills its positioned parent
<Animal kind="fawn" mood="happy" size={96} label={MASCOT_NAME} />
<CrownBadge tier="gold" />
<Celebration onDone={() => setShow(false)} />                                           // inside a positioned container
```

Art space is 400 x 640 (portrait), anchored to the bottom and cropped to fill: designed for phones/tablets in portrait.
Animations are CSS transform/opacity only (`art.css`); they pause when the tab is hidden and stop completely
(static poses, no parallax) under `prefers-reduced-motion` (`useReducedMotion`, `useArtMotion`).
Rule for animated SVG parts: the element carrying a `wp-*` animation class must not also have a `transform`
attribute; position it with a wrapping `<g transform>`.

## Add a zone (no component change)

Append an object to `ZONES` in `src/theme/scenes.ts`: palette tokens, `sky` gradient stops, `celestial`,
`particles`, `resident` (+ optional `friend`), `dim` params, and `layers` back to front, each
`{ drawer, speed, ...params }`. Keep `speed` non-decreasing (0 sky, ~0.02 clouds, ~0.05 mountains, ~0.1 hills,
~0.24 ground; a resident uses the ground's speed). `tests/scenes.test.ts` and `tests/art.test.ts` check the shape.

## Add a layer drawer

Add a variant to `LayerSpec` (scenes.ts), write a component in `src/art/layers/` returning SVG content in the
400 x 640 space (it receives the already-dimmed `pal` and `sky`; use `uid` as prefix for gradient ids), and
register it in `layers/registry.tsx` (the type forces you to).

## Add an animal

1. Add the kind to `AnimalKind` (scenes.ts).
2. Write `function MyAnimal({ mood, u }: DrawProps)` in `animals/` using a 120 x 120 box with feet on y~110.
   Reuse `Eyes`, `Mouth`, `Cheeks`, `Ear`, `Grad` from `animals/parts.tsx`. Hooks for the idle/mood CSS:
   `wp-head wp-o-b` (head tilt), `Ear` (twitch + ears-up), `wp-wag wp-o-bl` (tail), `wp-wave wp-o-t` (paw).
3. Register it in `DRAW`, `SHADOW`, `ANIMAL_LABEL`, `ANIMAL_KINDS` in `Animal.tsx`.

Designs must stay original: no existing film/TV/brand character or mascot.
