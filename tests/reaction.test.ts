import { describe, expect, it } from 'vitest'
import { moodFor } from '../src/components/useReactionMood'
import { isKeyboardOpen } from '../src/lib/keyboard'

describe('moodFor', () => {
  it('is happy right after a correct answer', () => expect(moodFor('correct', true)).toBe('happy'))
  it('goes back to idle once the happy window passed', () => expect(moodFor('correct', false)).toBe('idle'))
  it('encourages after a wrong answer', () => expect(moodFor('wrong', true)).toBe('encourage'))
  it('stays idle without a verdict', () => expect(moodFor(null, true)).toBe('idle'))
})

describe('isKeyboardOpen', () => {
  it('detects a shrunken visual viewport', () => expect(isKeyboardOpen(300, 640)).toBe(true))
  it('is false with the full viewport', () => expect(isKeyboardOpen(640, 640)).toBe(false))
  it('is false when the layout height is unknown', () => expect(isKeyboardOpen(0, 0)).toBe(false))
})
