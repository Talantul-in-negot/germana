import { describe, expect, it } from 'vitest'
import { detectSeparator, parseJsonWords, parseWordList, rowsFromJson, splitLine, splitTranslations } from '../src/core/parser'
import { assignUnits, unitSizes } from '../src/core/units'

describe('parseWordList', () => {
  it('parses term ; translation ; example ; tags', () => {
    const r = parseWordList('house ; casă|locuință ; I live in a house. ; home, building')
    expect(r.separator).toBe(';')
    expect(r.rows).toHaveLength(1)
    const row = r.rows[0]!
    expect(row.term).toBe('house')
    expect(row.translations).toEqual(['casă', 'locuință'])
    expect(row.example).toBe('I live in a house.')
    expect(row.tags).toEqual(['home', 'building'])
    expect(row.valid).toBe(true)
  })

  it.each([
    ['dog\tcâine\ncat\tpisică', '\t'],
    ['dog - câine\ncat - pisică', ' - '],
    ['dog = câine\ncat = pisică', ' = '],
    ['dog=câine\ncat=pisică', '='],
    ['dog,câine\ncat,pisică', ','],
    ['dog;câine\ncat;pisică', ';'],
  ])('auto-detects separator in %j', (text, sep) => {
    const r = parseWordList(text)
    expect(r.separator).toBe(sep)
    expect(r.rows[0]!.term).toBe('dog')
    expect(r.rows[0]!.translations).toEqual(['câine'])
    expect(r.rows[1]!.term).toBe('cat')
  })

  it('keeps hyphenated words intact with the " - " separator', () => {
    const r = parseWordList('well-known - cunoscut\nmother-in-law - soacră')
    expect(r.rows.map((x) => x.term)).toEqual(['well-known', 'mother-in-law'])
  })

  it('flags empty fields and duplicates', () => {
    const r = parseWordList('a;b\n;x\nc;\nA;z\nd;e')
    const issues = r.rows.map((x) => x.issues)
    expect(issues[1]).toContain('empty_term')
    expect(issues[2]).toContain('empty_translation')
    expect(issues[3]).toContain('duplicate')
    expect(r.validCount).toBe(2)
  })

  it('flags duplicates against existing deck terms (diacritics-insensitive)', () => {
    const r = parseWordList('casa;house', ['casă'])
    expect(r.rows[0]!.issues).toContain('duplicate_existing')
  })

  it('skips blank lines, # comments, BOM and a header row', () => {
    const r = parseWordList('﻿term;translation\n\n# note\nfoo;bar')
    expect(r.rows).toHaveLength(1)
    expect(r.rows[0]!.term).toBe('foo')
    expect(r.rows[0]!.line).toBe(4)
  })

  it('handles quoted fields with the separator inside', () => {
    expect(splitLine('"a,b",c', ',')).toEqual(['a,b', 'c'])
    expect(splitLine('"say ""hi""",c', ',')).toEqual(['say "hi"', 'c'])
  })

  it('returns no separator for single-column text; rows are invalid', () => {
    const r = parseWordList('hello\nworld')
    expect(r.separator).toBeNull()
    expect(r.rows.every((x) => !x.valid)).toBe(true)
    expect(detectSeparator([])).toBeNull()
  })

  it('parses 50 lines instantly', () => {
    const text = Array.from({ length: 50 }, (_, i) => `word${i} ; cuvânt${i}`).join('\n')
    const t0 = Date.now()
    const r = parseWordList(text)
    expect(Date.now() - t0).toBeLessThan(500)
    expect(r.validCount).toBe(50)
  })

  it('splitTranslations trims and drops empties', () => {
    expect(splitTranslations(' a | b ||')).toEqual(['a', 'b'])
  })
})

describe('json import', () => {
  it('accepts objects, arrays and {words: []}', () => {
    const items = parseJsonWords(
      JSON.stringify([
        { term: 'house', translations: ['casă'], example: 'x', tags: ['a'] },
        { word: 'dog', translation: 'câine|cățel' },
        ['cat', 'pisică', 'ex'],
        { term: '' },
        42,
      ]),
    )
    expect(items.map((i) => i.term)).toEqual(['house', 'dog', 'cat'])
    expect(items[1]!.translations).toEqual(['câine', 'cățel'])
    expect(parseJsonWords('{"words":[["a","b"]]}')).toHaveLength(1)
    expect(parseJsonWords('{}')).toEqual([])
  })
  it('rowsFromJson validates', () => {
    const r = rowsFromJson(parseJsonWords('[["a","b"],["a","c"],["x",""],["q","z"]]'), ['q'])
    expect(r.rows.map((x) => x.issues)).toEqual([[], ['duplicate'], ['empty_translation'], ['duplicate_existing']])
  })
})

describe('units', () => {
  it('50 words -> 5 units of 10', () => {
    expect(unitSizes(50)).toEqual([10, 10, 10, 10, 10])
  })
  it('keeps units within 8-10 (7 in the few sizes where 8-10 is impossible)', () => {
    for (let n = 16; n <= 200; n++) {
      const s = unitSizes(n)
      expect(s.reduce((a, b) => a + b, 0)).toBe(n)
      expect(Math.min(...s)).toBeGreaterThanOrEqual(7)
      expect(Math.max(...s)).toBeLessThanOrEqual(10)
    }
  })
  it('small decks and edge cases', () => {
    expect(unitSizes(0)).toEqual([])
    expect(unitSizes(5)).toEqual([5])
    expect(unitSizes(11)).toEqual([11])
    expect(unitSizes(15)).toEqual([8, 7])
    expect(unitSizes(21)).toEqual([7, 7, 7])
    expect(unitSizes(50).every((x) => x >= 8)).toBe(true)
  })
  it('assigns consecutive unit indexes in list order', () => {
    const a = assignUnits(30)
    expect(a).toHaveLength(30)
    expect(a.every((v, i) => i === 0 || v >= (a[i - 1] as number))).toBe(true)
    expect(new Set(a).size).toBe(3)
  })
})
