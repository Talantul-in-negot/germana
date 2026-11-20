/** Thin wrappers over Web Speech API (TTS + recognition) with graceful fallbacks. */

export const ttsSupported = (): boolean => typeof window !== 'undefined' && 'speechSynthesis' in window

interface SRResult {
  [i: number]: { transcript: string }
  length: number
}
interface SREvent {
  results: ArrayLike<SRResult>
}
interface SRInstance {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  onresult: ((e: SREvent) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}
type SRCtor = new () => SRInstance

function srCtor(): SRCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export const sttSupported = (): boolean => srCtor() !== null

export type SpeechLang = 'de-DE' | 'en-US'

export function langFor(l2: string | undefined): SpeechLang {
  return (l2 ?? 'German').toLowerCase().startsWith('en') ? 'en-US' : 'de-DE'
}

/** German voices, de-DE first. */
export function germanVoices(): SpeechSynthesisVoice[] {
  if (!ttsSupported()) return []
  const all = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('de'))
  return all.sort((a, b) => Number(b.lang.toLowerCase() === 'de-de') - Number(a.lang.toLowerCase() === 'de-de'))
}

export function englishVoices(): SpeechSynthesisVoice[] {
  if (!ttsSupported()) return []
  return window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('en'))
}

/** Preferred voice: the chosen one, else a de-DE voice, else any de-*; same idea for other languages. */
export function pickVoice(voices: readonly SpeechSynthesisVoice[], lang: string, chosen?: string | null): SpeechSynthesisVoice | undefined {
  if (chosen) {
    const v = voices.find((x) => x.voiceURI === chosen && x.lang.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase()))
    if (v) return v
  }
  return (
    voices.find((x) => x.lang.toLowerCase() === lang.toLowerCase()) ??
    voices.find((x) => x.lang.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase()))
  )
}

export function speak(text: string, opts: { voice?: string | null; rate?: number; lang?: SpeechLang } = {}): void {
  if (!ttsSupported() || !text) return
  const synth = window.speechSynthesis
  synth.cancel()
  const lang = opts.lang ?? 'de-DE'
  const u = new SpeechSynthesisUtterance(text)
  u.lang = lang
  u.rate = opts.rate ?? 0.9
  const v = pickVoice(synth.getVoices(), lang, opts.voice)
  if (v) u.voice = v
  synth.speak(u)
}

/** Resolves with recognition alternatives (best first); rejects if unsupported or failed. */
export function listen(lang: SpeechLang = 'de-DE'): Promise<string[]> {
  const Ctor = srCtor()
  if (!Ctor) return Promise.reject(new Error('unsupported'))
  return new Promise((resolve, reject) => {
    const r = new Ctor()
    r.lang = lang
    r.interimResults = false
    r.maxAlternatives = 5
    let got = false
    r.onresult = (e) => {
      got = true
      const first = e.results[0]
      const out: string[] = []
      if (first) for (let i = 0; i < first.length; i++) out.push((first[i] as { transcript: string }).transcript)
      resolve(out)
    }
    r.onerror = () => reject(new Error('error'))
    r.onend = () => {
      if (!got) reject(new Error('no_result'))
    }
    try {
      r.start()
    } catch {
      reject(new Error('error'))
    }
  })
}
