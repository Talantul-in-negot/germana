// Dev-only preview of the illustration system. Not routed: mount it temporarily, e.g. <Route path="/dev/scenes" element={<DevScenes />} />.
import { useState, type ReactNode } from 'react'
import { ANIMAL_KINDS, ANIMAL_LABEL, ANIMAL_MOODS, Animal, Celebration, CrownBadge, Scene, useReducedMotion } from '../art'
import { MASCOT_NAME, ZONES, type ZoneDef } from '../theme/scenes'

const FRAME = 'relative overflow-hidden rounded-3xl border-2 border-slate-200 shadow-sm'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 text-xl font-extrabold">{title}</h2>
      {children}
    </section>
  )
}

function ZonePreview({ zone, scrollY }: { zone: ZoneDef; scrollY: number }) {
  return (
    <div className="mb-6">
      <h3 className="mb-2 font-bold">{zone.name} <span className="font-normal text-slate-500">({zone.id}, {zone.resident}{zone.friend ? ` + ${zone.friend}` : ''}, {zone.particles})</span></h3>
      <div className="flex flex-wrap gap-4">
        <div className={FRAME} style={{ width: 300, height: 480 }}>
          <Scene zone={zone} scrollY={scrollY} />
        </div>
        <div className={FRAME} style={{ width: 300, height: 480 }}>
          <Scene zone={zone} variant="dim" scrollY={scrollY}>
            <div className="p-4">
              <div className="card">
                <p className="text-lg font-extrabold">der Tisch</p>
                <p className="text-slate-600">masa — text citibil peste fundalul estompat.</p>
              </div>
            </div>
          </Scene>
        </div>
      </div>
    </div>
  )
}

function AnimalRow({ kind }: { kind: (typeof ANIMAL_KINDS)[number] }) {
  return (
    <div className="mb-3 flex flex-wrap items-end gap-4 rounded-2xl bg-white p-3 shadow-sm">
      <div className="w-32 font-bold">{kind}{kind === 'fawn' && ` (${MASCOT_NAME})`}<div className="text-sm font-normal text-slate-500">{ANIMAL_LABEL[kind]}</div></div>
      {ANIMAL_MOODS.map((mood) => (
        <figure key={mood} className="m-0 text-center">
          <Animal kind={kind} mood={mood} size={128} label={`${ANIMAL_LABEL[kind]} (${mood})`} />
          <figcaption className="text-xs text-slate-500">{mood}</figcaption>
        </figure>
      ))}
    </div>
  )
}

export default function DevScenes() {
  const [scrollY, setScrollY] = useState(0)
  const [shower, setShower] = useState(0)
  const reduced = useReducedMotion()

  return (
    <div className="mx-auto max-w-[1000px] p-4">
      <header className="sticky top-0 z-20 mb-6 rounded-2xl bg-white/95 p-3 shadow">
        <h1 className="text-2xl font-extrabold">Ilustrații: previzualizare</h1>
        <label className="flex items-center gap-3 text-sm font-bold">
          Derulare (parallax): {scrollY}px
          <input type="range" min={0} max={600} value={scrollY} onChange={(e) => setScrollY(Number(e.target.value))} className="flex-1" />
        </label>
        <p className="text-xs text-slate-500">prefers-reduced-motion: {String(reduced)}</p>
      </header>

      <Section title="Zone (plin / estompat; artă portret)">
        {ZONES.map((z) => <ZonePreview key={z.id} zone={z} scrollY={scrollY} />)}
      </Section>

      <Section title="Animale (idle / happy / encourage / celebrate)">
        {ANIMAL_KINDS.map((k) => <AnimalRow key={k} kind={k} />)}
      </Section>

      <Section title="Coroane">
        <div className="flex items-end gap-6">
          <CrownBadge tier="bronze" size={72} />
          <CrownBadge tier="silver" size={72} />
          <CrownBadge tier="gold" size={72} />
          <CrownBadge tier="gold" size={72} locked />
          <CrownBadge tier="gold" size={28} />
        </div>
      </Section>

      <Section title="Celebrare">
        <button className="btn btn-primary mb-3" onClick={() => setShower((n) => n + 1)}>Pornește</button>
        <div className={FRAME} style={{ width: 320, height: 480 }}>
          <Scene zone={ZONES[0] as ZoneDef} resident={false}>
            <div className="flex h-full items-end justify-center pb-16"><Animal kind="fawn" mood="celebrate" size={140} label={MASCOT_NAME} /></div>
          </Scene>
          {shower > 0 && <Celebration key={shower} onDone={() => undefined} />}
        </div>
      </Section>
    </div>
  )
}
