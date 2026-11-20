import { describe, expect, it } from 'vitest'
import { checkAnswer, fold, isAccepted, levenshtein, normalize } from '../src/core/answer'

describe('normalize / fold', () => {
  it('lowercases, trims and strips punctuation', () => {
    expect(normalize('  Hello,  World!! ')).toBe('hello world')
  })
  it('unifies cedilla and comma-below', () => {
    expect(normalize('şcoală')).toBe(normalize('școală'))
    expect(normalize('ţară')).toBe(normalize('țară'))
  })
  it('folds diacritics', () => {
    expect(fold('Țară, școală, înălțime, câine')).toBe('tara scoala inaltime caine')
  })
})

describe('levenshtein', () => {
  it('basics', () => {
    expect(levenshtein('house', 'house')).toBe(0)
    expect(levenshtein('hous', 'house')).toBe(1)
    expect(levenshtein('', 'abc')).toBe(3)
    expect(levenshtein('abc', '')).toBe(3)
    expect(levenshtein('kitten', 'sitting')).toBe(3)
  })
})

describe('checkAnswer', () => {
  it('exact (case/whitespace/punctuation tolerant)', () => {
    expect(checkAnswer('  HOUSE. ', ['house']).verdict).toBe('correct')
  })
  it('accepts "casa" for "casă" with a diacritics note and the correct form', () => {
    const r = checkAnswer('casa', ['casă'])
    expect(r.verdict).toBe('diacritics')
    expect(r.expected).toBe('casă')
    expect(isAccepted(r.verdict)).toBe(true)
  })
  it('accepts "hous" for "house" flagged as typo', () => {
    const r = checkAnswer('hous', ['house'])
    expect(r.verdict).toBe('typo')
    expect(isAccepted(r.verdict)).toBe(true)
  })
  it('does not apply typo tolerance to short words (<= 4 chars)', () => {
    expect(checkAnswer('ca', ['cat']).verdict).toBe('wrong')
    expect(checkAnswer('dg', ['dog']).verdict).toBe('wrong')
    expect(checkAnswer('hos', ['hose']).verdict).toBe('wrong')
  })
  it('allows one edit but not two', () => {
    expect(checkAnswer('hoese', ['house']).verdict).toBe('typo')
    expect(checkAnswer('hxxse', ['house']).verdict).toBe('wrong')
    expect(isAccepted('wrong')).toBe(false)
  })
  it('any alternative translation is accepted', () => {
    expect(checkAnswer('locuinta', ['casă', 'locuință']).verdict).toBe('diacritics')
    expect(checkAnswer('casă', ['casă', 'locuință']).verdict).toBe('correct')
  })
  it('empty input is wrong and reports the expected answer', () => {
    const r = checkAnswer('   ', ['casă'])
    expect(r.verdict).toBe('wrong')
    expect(r.expected).toBe('casă')
  })
  it('prefers the exact match across alternatives', () => {
    expect(checkAnswer('locuință', ['locuinta', 'locuință']).verdict).toBe('correct')
  })
  it('ignores empty accepted entries', () => {
    expect(checkAnswer('x', ['', '  ']).verdict).toBe('wrong')
    expect(checkAnswer('x', []).expected).toBe('')
  })
})
