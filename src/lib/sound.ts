/** Tiny synthesized sound effects (WebAudio) — no audio assets, original sounds. */
export type Sfx = 'correct' | 'wrong' | 'levelup' | 'achievement' | 'finish'

let ctx: AudioContext | null = null

const SEQUENCES: Record<Sfx, { f: number; d: number; type?: OscillatorType }[]> = {
  correct: [{ f: 660, d: 0.08 }, { f: 880, d: 0.12 }],
  wrong: [{ f: 220, d: 0.14, type: 'sawtooth' }, { f: 165, d: 0.18, type: 'sawtooth' }],
  levelup: [{ f: 523, d: 0.09 }, { f: 659, d: 0.09 }, { f: 784, d: 0.14 }],
  achievement: [{ f: 523, d: 0.1 }, { f: 659, d: 0.1 }, { f: 784, d: 0.1 }, { f: 1047, d: 0.25 }],
  finish: [{ f: 392, d: 0.12 }, { f: 523, d: 0.12 }, { f: 659, d: 0.12 }, { f: 784, d: 0.3 }],
}

export function playSfx(name: Sfx, enabled: boolean): void {
  if (!enabled || typeof window === 'undefined') return
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    ctx ??= new AC()
    if (ctx.state === 'suspended') void ctx.resume()
    let t = ctx.currentTime
    for (const n of SEQUENCES[name]) {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = n.type ?? 'sine'
      o.frequency.value = n.f
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.01)
      g.gain.exponentialRampToValueAtTime(0.0001, t + n.d)
      o.connect(g).connect(ctx.destination)
      o.start(t)
      o.stop(t + n.d + 0.02)
      t += n.d
    }
  } catch {
    /* audio is optional */
  }
}
