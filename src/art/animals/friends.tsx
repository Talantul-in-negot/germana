// Bird, duckling, lion cub, little fish and sea turtle. Same seated / front-facing conventions as woodland.tsx.
import { Cheeks, Ear, Eyes, Grad, Mouth, type DrawProps } from './parts'

/** Round periwinkle bird with a peach belly, three-feather tuft and a coral beak. */
export function Bird({ mood, u }: DrawProps) {
  const c = { base: '#9db4ea', light: '#cbd8f8', dark: '#6f89cc', belly: '#fde2d0', beak: '#ff9c7a', leg: '#f08a6c' }
  const feather = 'M-3 0C-6 -8 -2 -16 2 -21C4 -13 4 -6 3 0Z'
  return (
    <g>
      <defs><Grad id={`${u}b`} light={c.light} base={c.base} /></defs>
      <g className="wp-wag wp-o-tl"><path d="M80 94Q100 94 106 108Q90 108 78 102Z" fill={c.dark} /></g>
      <g stroke={c.leg} strokeWidth="2.4" strokeLinecap="round" fill="none">
        <path d="M51 104V110M47 112L51 110L55 112" /><path d="M69 104V110M65 112L69 110L73 112" />
      </g>
      <g className="wp-head wp-o-b">
        <circle cx="60" cy="71" r="34" fill={`url(#${u}b)`} />
        <ellipse cx="60" cy="86" rx="22" ry="19" fill={c.belly} />
        <Ear x={60} y={40} rot={0} side="r"><path d={feather} fill={c.dark} /></Ear>
        <g transform="translate(55 40) rotate(-26)"><path d={feather} fill={c.base} stroke={c.dark} strokeWidth="1" /></g>
        <g transform="translate(65 40) rotate(26)"><path d={feather} fill={c.base} stroke={c.dark} strokeWidth="1" /></g>
        <g transform="translate(32 66) rotate(10) scale(-1 1)"><path d="M0 0C9 2 12 16 5 28C-3 22 -5 8 0 0Z" fill={c.dark} /></g>
        <g transform="translate(88 66) rotate(-10)"><g className="wp-wave wp-o-t"><path d="M0 0C9 2 12 16 5 28C-3 22 -5 8 0 0Z" fill={c.dark} /></g></g>
        <Eyes cx={60} cy={62} gap={22} r={5.2} mood={mood} />
        <path d="M54 67Q60 62.5 66 67Q60 77 54 67Z" fill={c.beak} />
        <path d="M56 68Q60 66.5 64 68" fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="1.2" strokeLinecap="round" />
        <Cheeks cx={60} cy={69} gap={40} />
      </g>
    </g>
  )
}

/** Butter-yellow duckling with a green sprout on its head and a wide peach bill. */
export function Duckling({ mood, u }: DrawProps) {
  const c = { base: '#ffe9a0', light: '#fff8d4', dark: '#f4cd68', bill: '#ffae66', foot: '#ff9f5a', leaf: '#7fcf8f' }
  return (
    <g>
      <defs><Grad id={`${u}b`} light={c.light} base={c.base} /></defs>
      <g className="wp-wag wp-o-bl"><path d="M84 96Q98 88 100 76Q104 90 96 102Z" fill={c.dark} /></g>
      <ellipse cx="60" cy="88" rx="29" ry="22" fill={`url(#${u}b)`} />
      <ellipse cx="60" cy="96" rx="17" ry="12" fill={c.light} />
      <ellipse cx="45" cy="108" rx="9.5" ry="3.6" fill={c.foot} />
      <ellipse cx="75" cy="108" rx="9.5" ry="3.6" fill={c.foot} />
      <ellipse cx="34" cy="90" rx="7" ry="11" fill={c.dark} transform="rotate(12 34 90)" />
      <g transform="translate(86 80)"><g className="wp-wave wp-o-t"><ellipse cx="0" cy="8" rx="7" ry="12" fill={c.dark} /></g></g>
      <g className="wp-head wp-o-b">
        <Ear x={60} y={28} rot={0} side="r">
          <path d="M0 0C-2 -8 -10 -12 -15 -10C-12 -2 -6 1 0 0Z" fill={c.leaf} />
          <path d="M0 0C2 -9 10 -14 15 -12C13 -3 6 1 0 0Z" fill="#9fdca8" />
        </Ear>
        <circle cx="60" cy="50" r="24" fill={`url(#${u}b)`} />
        <Eyes cx={60} cy={46} gap={22} r={5} mood={mood} />
        <ellipse cx="60" cy="58" rx="12" ry="6.3" fill={c.bill} />
        <path d="M49 58Q60 60 71 58" fill="none" stroke="#e08a4a" strokeWidth="1.2" strokeLinecap="round" />
        <g fill="#e08a4a"><circle cx="56" cy="55.6" r="1" /><circle cx="64" cy="55.6" r="1" /></g>
        {(mood === 'happy' || mood === 'celebrate') && <Mouth cx={60} cy={60} w={4} mood={mood} />}
        <Cheeks cx={60} cy={55} gap={44} />
      </g>
    </g>
  )
}

/** Honey-gold lion cub: rust forelock tuft, green-grey leaf collar instead of a mane, own heart-shaped nose. */
export function Lion({ mood, u }: DrawProps) {
  const c = { base: '#e9b65f', light: '#f8d899', dark: '#cc9440', rust: '#b95a33', cream: '#fff0d2', leaf: '#8fa592', leafDark: '#6f8776' }
  const collar = [10, 30, 50, 70, 90, 110, 130, 150, 170]
  const freckles: ReadonlyArray<readonly [number, number]> = [[53, 57], [50.5, 60], [55, 61]]
  return (
    <g>
      <defs><Grad id={`${u}b`} light={c.light} base={c.base} /></defs>
      <g className="wp-wag wp-o-bl">
        <path d="M82 104C100 108 110 94 106 80" fill="none" stroke={c.base} strokeWidth="5.5" strokeLinecap="round" />
        <path d="M106 82C99 80 99 71 106 66C113 71 113 80 106 82Z" fill={c.rust} />
      </g>
      <ellipse cx="60" cy="88" rx="24" ry="21" fill={`url(#${u}b)`} />
      <ellipse cx="60" cy="94" rx="13" ry="13" fill={c.cream} />
      <rect x="46" y="96" width="10" height="13" rx="5" fill={c.base} />
      <rect x="64" y="96" width="10" height="13" rx="5" fill={c.base} />
      <ellipse cx="50" cy="108.5" rx="8" ry="4.2" fill={c.light} />
      <ellipse cx="70" cy="108.5" rx="8" ry="4.2" fill={c.light} />
      <g>
        {collar.map((deg, i) => {
          const rad = (deg * Math.PI) / 180
          return (
            <g key={deg} transform={`translate(${(60 + 25 * Math.cos(rad)).toFixed(1)} ${(68 + 18 * Math.sin(rad)).toFixed(1)}) rotate(${deg - 90})`}>
              <path d="M0 -2C7 3 7 14 0 20C-7 14 -7 3 0 -2Z" fill={i % 2 ? c.leafDark : c.leaf} />
              <path d="M0 0V16" stroke="#fff" strokeOpacity="0.35" strokeWidth="1" />
            </g>
          )
        })}
      </g>
      <g className="wp-head wp-o-b">
        <Ear x={38} y={36} rot={-14} side="l"><circle cx="0" cy="-5" r="8" fill={c.base} /><circle cx="0" cy="-5" r="4.6" fill={c.rust} opacity="0.75" /></Ear>
        <Ear x={82} y={36} rot={14} side="r"><circle cx="0" cy="-5" r="8" fill={c.base} /><circle cx="0" cy="-5" r="4.6" fill={c.rust} opacity="0.75" /></Ear>
        <ellipse cx="60" cy="49" rx="25" ry="22" fill={`url(#${u}b)`} />
        <path d="M50 30C45 17 56 10 66 8C62 15 72 18 70 30C64 26 56 26 50 30Z" fill={c.rust} />
        <path d="M55 24C54 18 58 14 62 13" fill="none" stroke="#e08a5a" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
        <ellipse cx="60" cy="58" rx="13" ry="10" fill={c.cream} />
        <g fill={c.dark} opacity="0.55">
          {freckles.map(([x, y]) => <g key={x}><circle cx={x} cy={y} r="0.9" /><circle cx={120 - x} cy={y} r="0.9" /></g>)}
        </g>
        <Eyes cx={60} cy={45} gap={24} r={5.2} mood={mood} />
        <path d="M55.5 53.4Q60 50.6 64.5 53.4Q62 59.2 60 59.2Q58 59.2 55.5 53.4Z" fill="#b8604a" />
        <Mouth cx={60} cy={61} w={4.2} mood={mood} />
        <Cheeks cx={60} cy={54} gap={42} />
      </g>
    </g>
  )
}

/** Shy round teal fish with coral dots and a yellow tail and fins. Not a clownfish. */
export function Fish({ mood, u }: DrawProps) {
  const c = { base: '#4fb9b0', light: '#9fe3d8', dark: '#2f8f94', coral: '#ff8f78', fin: '#ffd25a', finDark: '#f0b43c' }
  const dots: ReadonlyArray<readonly [number, number, number]> = [[72, 46, 4], [81, 64, 3.2], [70, 86, 4.4], [85, 80, 2.8], [58, 94, 3], [88, 54, 2.6]]
  return (
    <g className="wp-float">
      <defs><Grad id={`${u}b`} light={c.light} base={c.base} /></defs>
      <g className="wp-wag wp-o-l">
        <path d="M88 66C98 52 112 46 114 56C109 62 109 70 114 76C112 86 98 80 88 66Z" fill={c.fin} stroke={c.finDark} strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M96 66L108 58M96 67L109 70" stroke={c.finDark} strokeWidth="1" strokeLinecap="round" opacity="0.7" />
      </g>
      <g className="wp-flutter wp-o-b"><path d="M44 40C48 22 68 20 78 40Z" fill={c.fin} stroke={c.finDark} strokeWidth="1.2" strokeLinejoin="round" /></g>
      <circle cx="60" cy="66" r="32" fill={`url(#${u}b)`} />
      <ellipse cx="50" cy="82" rx="19" ry="11" fill={c.light} opacity="0.55" />
      <g fill={c.coral}>{dots.map(([x, y, r]) => <circle key={x} cx={x} cy={y} r={r} />)}</g>
      <g transform="translate(64 76)"><g className="wp-flutter wp-o-l"><ellipse cx="6" cy="2" rx="10" ry="5.4" fill={c.fin} stroke={c.finDark} strokeWidth="1" /></g></g>
      <Eyes cx={50} cy={60} gap={24} r={7} mood={mood} />
      <Cheeks cx={50} cy={74} gap={40} r={4.6} />
      <Mouth cx={44} cy={76} w={3.2} mood={mood} />
      <g fill="none" stroke="#6fbfd0" strokeWidth="1.2" opacity="0.8"><circle cx="26" cy="70" r="2.6" /><circle cx="20" cy="60" r="1.8" /></g>
    </g>
  )
}

function hex(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i + Math.PI / 6
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`
  }).join(' ')
}

/** Soft green sea turtle in profile with a warm sandy shell. */
export function Turtle({ mood, u }: DrawProps) {
  const c = { base: '#79c8a0', light: '#b4e6cb', dark: '#4e9e7c', shell: '#e6a56a', shellLight: '#f6cb94', line: '#c0803f' }
  return (
    <g>
      <defs>
        <Grad id={`${u}b`} light={c.light} base={c.base} />
        <Grad id={`${u}s`} light={c.shellLight} base={c.shell} />
        <clipPath id={`${u}sc`}><path d="M18 88C18 54 38 40 60 40C84 40 102 54 102 88Z" /></clipPath>
      </defs>
      <g className="wp-wag wp-o-tl"><path d="M98 88Q112 88 114 98Q104 98 96 94Z" fill={c.dark} /></g>
      <ellipse cx="86" cy="100" rx="13" ry="7" fill={c.dark} />
      <path d="M18 88C18 54 38 40 60 40C84 40 102 54 102 88Z" fill={`url(#${u}s)`} />
      <g clipPath={`url(#${u}sc)`} fill="none" stroke={c.line} strokeWidth="2" strokeLinejoin="round" opacity="0.85">
        <polygon points={hex(60, 62, 14)} fill={c.shellLight} fillOpacity="0.45" />
        <polygon points={hex(36, 72, 11)} /><polygon points={hex(84, 72, 11)} />
        <polygon points={hex(48, 46, 9)} /><polygon points={hex(74, 46, 9)} />
        <path d="M60 48V40M46 70L50 66M74 70L70 66" />
      </g>
      <ellipse cx="60" cy="89" rx="45" ry="6.5" fill={c.shellLight} />
      <g transform="translate(50 88)"><g className="wp-wave wp-o-t"><path d="M-4 0C6 -2 18 6 17 16C8 17 -4 10 -4 0Z" fill={c.dark} /></g></g>
      <g className="wp-head wp-o-br">
        <ellipse cx="32" cy="82" rx="13" ry="10" fill={c.base} />
        <ellipse cx="28" cy="67" rx="18" ry="16" fill={`url(#${u}b)`} />
        <Eyes cx={27} cy={63} gap={14} r={4.6} mood={mood} />
        <Mouth cx={27} cy={72} w={4} mood={mood} />
        <Cheeks cx={27} cy={69} gap={26} r={3.6} />
      </g>
    </g>
  )
}
