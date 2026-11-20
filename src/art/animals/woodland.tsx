// Woodland animals, all front-facing and seated, each with its own proportions, colours and face.
import { Cheeks, Ear, Eyes, Grad, Mouth, type DrawProps } from './parts'

const NOSE = '#4a2f28'

/** Reh: the main mascot. Warm caramel coat, cream spots, big leaf-shaped ears. */
export function Fawn({ mood, u }: DrawProps) {
  const c = { base: '#d99a5b', light: '#f3c690', dark: '#b9793f', cream: '#fdebd0', hoof: '#6b4330', pink: '#f4b6a6' }
  const spots: ReadonlyArray<readonly [number, number]> = [[42, 77], [78, 76], [37, 91], [83, 90], [52, 71], [69, 70]]
  const earOuter = 'M-9 2C-14 -11 -9 -29 0 -36C9 -29 14 -11 9 2Z'
  const earInner = 'M-5 -1C-7.5 -11 -4.5 -24 0 -30C4.5 -24 7.5 -11 5 -1Z'
  return (
    <g>
      <defs><Grad id={`${u}b`} light={c.light} base={c.base} /></defs>
      <ellipse cx="37" cy="98" rx="12" ry="10" fill={c.dark} />
      <ellipse cx="83" cy="98" rx="12" ry="10" fill={c.dark} />
      <ellipse cx="33" cy="108" rx="6.5" ry="3" fill={c.hoof} />
      <ellipse cx="87" cy="108" rx="6.5" ry="3" fill={c.hoof} />
      <ellipse cx="60" cy="86" rx="27" ry="24" fill={`url(#${u}b)`} />
      <ellipse cx="60" cy="94" rx="15" ry="14" fill={c.cream} />
      <g fill={c.cream} opacity="0.92">{spots.map(([x, y]) => <ellipse key={x} cx={x} cy={y} rx="3.4" ry="2.5" />)}</g>
      <rect x="45" y="94" width="10" height="15" rx="5" fill={c.base} />
      <rect x="65" y="94" width="10" height="15" rx="5" fill={c.base} />
      <ellipse cx="50" cy="109" rx="6" ry="3" fill={c.hoof} />
      <ellipse cx="70" cy="109" rx="6" ry="3" fill={c.hoof} />
      <g className="wp-head wp-o-b">
        <Ear x={38} y={34} rot={-34} side="l"><path d={earOuter} fill={c.base} /><path d={earInner} fill={c.pink} /></Ear>
        <Ear x={82} y={34} rot={34} side="r"><path d={earOuter} fill={c.base} /><path d={earInner} fill={c.pink} /></Ear>
        <ellipse cx="60" cy="45" rx="26" ry="22" fill={`url(#${u}b)`} />
        <path d="M60 22C54 24 53 30 57 32C59 30 61 30 63 32C67 30 66 24 60 22Z" fill={c.cream} />
        <g fill={c.cream}><ellipse cx="50" cy="32" rx="2.4" ry="1.7" /><ellipse cx="70" cy="31" rx="2.4" ry="1.7" /></g>
        <ellipse cx="60" cy="56" rx="13" ry="9.5" fill={c.cream} />
        <Eyes cx={60} cy={44} gap={24} r={5.6} mood={mood} />
        <ellipse cx="60" cy="51.5" rx="4.4" ry="3" fill={NOSE} />
        <ellipse cx="58.8" cy="50.6" rx="1.4" ry="0.8" fill="#fff" opacity="0.6" />
        <Mouth cx={60} cy={55.5} w={4.5} mood={mood} />
        <Cheeks cx={60} cy={52} gap={40} />
      </g>
    </g>
  )
}

/** Oat-coloured rabbit with a brown eye patch and one floppy ear tip. */
export function Rabbit({ mood, u }: DrawProps) {
  const c = { base: '#efe0c9', light: '#fff6e6', dark: '#d6bf9f', inner: '#f7b9b0', patch: '#c9a07c' }
  return (
    <g>
      <defs><Grad id={`${u}b`} light={c.light} base={c.base} /></defs>
      <ellipse cx="60" cy="88" rx="25" ry="22" fill={`url(#${u}b)`} />
      <ellipse cx="60" cy="94" rx="14" ry="13" fill={c.light} />
      <ellipse cx="46" cy="108" rx="10" ry="4.6" fill={c.dark} />
      <ellipse cx="74" cy="108" rx="10" ry="4.6" fill={c.dark} />
      <ellipse cx="50" cy="100" rx="5" ry="7" fill={c.base} />
      <g className="wp-wave wp-o-t"><ellipse cx="73" cy="98" rx="5" ry="8.5" fill={c.base} stroke={c.dark} strokeWidth="1" /></g>
      <g className="wp-head wp-o-b">
        <Ear x={50} y={38} rot={-9} side="l">
          <path d="M-6.5 2C-9 -10 -6 -26 0 -35C6 -26 9 -10 6.5 2Z" fill={c.base} />
          <path d="M-3.4 -1C-5 -10 -3 -21 0 -28C3 -21 5 -10 3.4 -1Z" fill={c.inner} />
        </Ear>
        <Ear x={70} y={38} rot={9} side="r">
          <path d="M-6.5 2C-9 -10 -6 -24 1 -31C6 -36 13 -33 11 -27C9 -22 7 -14 6.5 2Z" fill={c.base} />
          <path d="M-3.5 -1C-5 -10 -3 -21 1 -26C4 -29 7 -27 6 -24C5 -18 4 -10 3.5 -1Z" fill={c.inner} />
        </Ear>
        <ellipse cx="60" cy="52" rx="23" ry="19" fill={`url(#${u}b)`} />
        <ellipse cx="50" cy="50" rx="9" ry="8.4" fill={c.patch} opacity="0.85" />
        <ellipse cx="50" cy="60" rx="12" ry="8.5" fill={c.light} />
        <ellipse cx="70" cy="60" rx="12" ry="8.5" fill={c.light} />
        <Eyes cx={60} cy={50} gap={20} r={4.9} mood={mood} />
        <ellipse cx="60" cy="56" rx="3.2" ry="2.4" fill="#e98a96" />
        <path d="M60 58.3V61" stroke={NOSE} strokeWidth="1.3" strokeLinecap="round" />
        <Mouth cx={60} cy={60.6} w={4.2} mood={mood} />
        <Cheeks cx={60} cy={58} gap={36} />
      </g>
    </g>
  )
}

/** Rust-orange fox cub: cream cheeks, dark socks, big tail with a cream tip, eyebrow dots. */
export function Fox({ mood, u }: DrawProps) {
  const c = { base: '#ea8a50', light: '#f8b27c', dark: '#7a4a3a', cream: '#fff1dc' }
  const head = 'M60 24C76 24 88 32 93 48L100 55L88 57C80 65 70 69 60 69C50 69 40 65 32 57L20 55L27 48C32 32 44 24 60 24Z'
  return (
    <g>
      <defs>
        <Grad id={`${u}b`} light={c.light} base={c.base} />
        <clipPath id={`${u}hc`}><path d={head} /></clipPath>
      </defs>
      <g className="wp-wag wp-o-bl">
        <path d="M82 104C106 108 120 90 113 66C111 58 104 54 98 56C102 70 94 88 80 92Z" fill={c.base} />
        <path d="M98 56C104 54 110 58 113 66C114 70 114 74 112 79C106 75 100 68 98 56Z" fill={c.cream} />
      </g>
      <ellipse cx="60" cy="88" rx="24" ry="21" fill={`url(#${u}b)`} />
      <ellipse cx="60" cy="93" rx="12" ry="14" fill={c.cream} />
      <rect x="46" y="96" width="9" height="13" rx="4.5" fill={c.base} />
      <rect x="65" y="96" width="9" height="13" rx="4.5" fill={c.base} />
      <ellipse cx="50.5" cy="108.5" rx="6.5" ry="3.6" fill={c.dark} />
      <ellipse cx="69.5" cy="108.5" rx="6.5" ry="3.6" fill={c.dark} />
      <g className="wp-head wp-o-b">
        <Ear x={42} y={33} rot={-13} side="l">
          <path d="M-11 0L0 -31L11 0Z" fill={c.base} stroke={c.base} strokeWidth="5" strokeLinejoin="round" />
          <path d="M-3.4 -23L0 -31L3.4 -23Z" fill={c.dark} stroke={c.dark} strokeWidth="3" strokeLinejoin="round" />
          <path d="M-5 -2L0 -22L5 -2Z" fill={c.cream} />
        </Ear>
        <Ear x={78} y={33} rot={13} side="r">
          <path d="M-11 0L0 -31L11 0Z" fill={c.base} stroke={c.base} strokeWidth="5" strokeLinejoin="round" />
          <path d="M-3.4 -23L0 -31L3.4 -23Z" fill={c.dark} stroke={c.dark} strokeWidth="3" strokeLinejoin="round" />
          <path d="M-5 -2L0 -22L5 -2Z" fill={c.cream} />
        </Ear>
        <path d={head} fill={`url(#${u}b)`} stroke={c.base} strokeWidth="2" strokeLinejoin="round" />
        <g clipPath={`url(#${u}hc)`}>
          <ellipse cx="60" cy="63" rx="30" ry="11" fill={c.cream} />        </g>
        <g fill={c.cream}><circle cx="47" cy="35" r="1.8" /><circle cx="73" cy="35" r="1.8" /></g>
        <Eyes cx={60} cy={45} gap={24} r={5} mood={mood} />
        <path d="M55.5 55C55.5 52.5 64.5 52.5 64.5 55C64.5 58 60 60 60 60C60 60 55.5 58 55.5 55Z" fill={NOSE} />
        <Mouth cx={60} cy={61} w={4.2} mood={mood} />
        <Cheeks cx={60} cy={55} gap={42} />
      </g>
    </g>
  )
}

/** Hazel squirrel with a huge swirl tail and an acorn held in both paws. */
export function Squirrel({ mood, u }: DrawProps) {
  const c = { base: '#c0865a', light: '#e2ad7c', dark: '#8d5a3c', cream: '#fff0d8', cap: '#7a4a2e', nut: '#e6b873' }
  const earShape = (
    <>
      <circle cx="0" cy="-6" r="7.5" fill={c.base} />
      <circle cx="0" cy="-6" r="4.2" fill="#f4b6a6" />
      <path d="M-3 -12L-1 -21L2 -12ZM2 -12L5 -19L6 -11Z" fill={c.dark} />
    </>
  )
  return (
    <g>
      <defs><Grad id={`${u}b`} light={c.light} base={c.base} /></defs>
      <g className="wp-wag wp-o-bl">
        <path d="M80 104C112 108 118 70 103 46C96 36 82 36 83 49C93 57 97 73 78 88Z" fill={c.base} />
        <path d="M88 98C106 92 109 67 98 53" fill="none" stroke={c.light} strokeWidth="4" strokeLinecap="round" opacity="0.7" />
        <path d="M91 40C96 36 102 38 103 46C99 44 95 43 91 40Z" fill={c.cream} opacity="0.85" />
      </g>
      <ellipse cx="58" cy="88" rx="22" ry="20" fill={`url(#${u}b)`} />
      <ellipse cx="56" cy="92" rx="12" ry="13" fill={c.cream} />
      <ellipse cx="45" cy="108" rx="9" ry="4.3" fill={c.dark} />
      <ellipse cx="70" cy="108" rx="9" ry="4.3" fill={c.dark} />
      <ellipse cx="58" cy="99" rx="8" ry="7.5" fill={c.nut} />
      <path d="M49.5 96Q58 86 66.5 96Q58 99 49.5 96Z" fill={c.cap} />
      <rect x="57" y="86" width="2" height="4" rx="1" fill={c.cap} />
      <ellipse cx="50" cy="98" rx="4.6" ry="5.4" fill={c.light} />
      <ellipse cx="66" cy="98" rx="4.6" ry="5.4" fill={c.light} />
      <g className="wp-head wp-o-b">
        <Ear x={42} y={34} rot={-12} side="l">{earShape}</Ear>
        <Ear x={74} y={34} rot={12} side="r">{earShape}</Ear>
        <ellipse cx="58" cy="49" rx="22" ry="19" fill={`url(#${u}b)`} />
        <ellipse cx="46" cy="56" rx="9" ry="7" fill={c.light} />
        <ellipse cx="70" cy="56" rx="9" ry="7" fill={c.light} />
        <ellipse cx="58" cy="57" rx="9.5" ry="7.2" fill={c.cream} />
        <Eyes cx={58} cy={46} gap={20} r={4.8} mood={mood} />
        <ellipse cx="58" cy="53.4" rx="3.2" ry="2.4" fill="#6b3b3b" />
        <Mouth cx={58} cy={57.5} w={3.8} mood={mood} />
        <Cheeks cx={58} cy={54} gap={36} />
      </g>
    </g>
  )
}

interface SpikeArgs { cx: number; cy: number; rx: number; ry: number; from: number; to: number; n: number; len: number }

/** Spike triangles fanned around the top arc of an ellipse (degrees, SVG orientation: 270 = up). */
function spikes({ cx, cy, rx, ry, from, to, n, len }: SpikeArgs): string[] {
  const rad = (d: number) => (d * Math.PI) / 180
  const pt = (deg: number, k: number) => `${(cx + (rx + k) * Math.cos(rad(deg))).toFixed(1)} ${(cy + (ry + k) * Math.sin(rad(deg))).toFixed(1)}`
  return Array.from({ length: n }, (_, i) => {
    const t = from + ((to - from) * i) / (n - 1)
    return `M${pt(t - 6, 0)}L${pt(t, len)}L${pt(t + 6, 0)}Z`
  })
}

/** Dusty-plum hedgehog with a peach face and a pink flower tucked into its spines. */
export function Hedgehog({ mood, u }: DrawProps) {
  const c = { spine: '#8f6f86', spineLight: '#b99cb0', peach: '#f8d9bd', snout: '#f0bb98', paw: '#e9b690', pink: '#f4a7b8' }
  const outer = spikes({ cx: 60, cy: 80, rx: 39, ry: 36, from: 188, to: 352, n: 17, len: 11 })
  const hair = spikes({ cx: 60, cy: 86, rx: 24, ry: 19, from: 208, to: 332, n: 9, len: 8 })
  return (
    <g>
      <defs><Grad id={`${u}b`} light={c.spineLight} base={c.spine} /></defs>
      <g fill={c.spine} stroke={c.spine} strokeWidth="1.5" strokeLinejoin="round">{outer.map((d, i) => <path key={i} d={d} fill={i % 2 ? c.spine : c.spineLight} stroke={i % 2 ? c.spine : c.spineLight} />)}</g>
      <ellipse cx="60" cy="82" rx="39" ry="36" fill={`url(#${u}b)`} />
      <g fill="none" stroke={c.spineLight} strokeWidth="2.2" strokeLinecap="round" opacity="0.75">
        {[205, 225, 245, 265, 285, 305, 325].map((deg) => {
          const x = 60 + 29 * Math.cos((deg * Math.PI) / 180)
          const y = 80 + 26 * Math.sin((deg * Math.PI) / 180)
          return <path key={deg} d={`M${(x - 3).toFixed(1)} ${(y + 3).toFixed(1)}L${x.toFixed(1)} ${(y - 3).toFixed(1)}L${(x + 3).toFixed(1)} ${(y + 3).toFixed(1)}`} />
        })}
      </g>
      <g transform="translate(88 50)">
        <g fill={c.pink}>{[0, 72, 144, 216, 288].map((a) => <circle key={a} cx="0" cy="-4.2" r="3.4" transform={`rotate(${a})`} />)}</g>
        <circle r="2.4" fill="#ffe27a" />
      </g>
      <ellipse cx="60" cy="98" rx="26" ry="13" fill={c.peach} />
      <ellipse cx="46" cy="108" rx="9" ry="4.2" fill={c.paw} />
      <ellipse cx="74" cy="108" rx="9" ry="4.2" fill={c.paw} />
      <ellipse cx="42" cy="100" rx="5" ry="6" fill={c.peach} stroke={c.paw} strokeWidth="1" />
      <g className="wp-wave wp-o-t"><ellipse cx="79" cy="99" rx="5" ry="8" fill={c.peach} stroke={c.paw} strokeWidth="1" /></g>
      <g className="wp-head wp-o-b">
        <Ear x={37} y={72} rot={-22} side="l"><circle cx="0" cy="-4" r="7" fill={c.paw} /><circle cx="0" cy="-4" r="4" fill={c.pink} /></Ear>
        <Ear x={83} y={72} rot={22} side="r"><circle cx="0" cy="-4" r="7" fill={c.paw} /><circle cx="0" cy="-4" r="4" fill={c.pink} /></Ear>
        <g fill={c.spine} stroke={c.spine} strokeWidth="1" strokeLinejoin="round">{hair.map((d, i) => <path key={i} d={d} />)}</g>
        <ellipse cx="60" cy="86" rx="25" ry="20" fill={c.peach} />
        <ellipse cx="60" cy="92" rx="11.5" ry="9" fill={c.snout} />
        <Eyes cx={60} cy={80} gap={22} r={4.8} mood={mood} />
        <ellipse cx="60" cy="87.5" rx="4.2" ry="3.1" fill="#4b3040" />
        <ellipse cx="58.9" cy="86.6" rx="1.3" ry="0.8" fill="#fff" opacity="0.6" />
        <Mouth cx={60} cy={94.5} w={3.8} mood={mood} />
        <Cheeks cx={60} cy={90} gap={38} />
      </g>
    </g>
  )
}
