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

export function englishVoices(): SpeechSynthesisVoice[] {
  if (!ttsSupported()) return []
  return window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('en'))
}

export function speak(text: string, opts: { voice?: string | null; rate?: number; lang?: string } = {}): void {
  if (!ttsSupported() || !text) return
  const synth = window.speechSynthesis
  synth.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = opts.lang ?? 'en-US'
  u.rate = opts.rate ?? 0.9
  if (opts.voice) {
    const v = synth.getVoices().find((x) => x.voiceURI === opts.voice)
    if (v) u.voice = v
  }
  synth.speak(u)
}

/** Resolves with recognition alternatives (best first); rejects if unsupported or failed. */
export function listen(lang = 'en-US'): Promise<string[]> {
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
