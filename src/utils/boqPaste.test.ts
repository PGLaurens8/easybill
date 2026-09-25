import { describe, expect, it } from 'vitest'

import { parseBoqPaste, parseSpreadsheetNumber } from './boqPaste'

describe('parseSpreadsheetNumber', () => {
  it.each([
    ['1250.5', 1250.5],
    ['1,250.50', 1250.5],
    ['1 250,50', 1250.5],
    ['R 1 250,50', 1250.5],
    ['12,5', 12.5],
    ['1,250', 1250],
    ['1.250,75', 1250.75],
    ['', 0],
    ['-', 0],
  ])('parses %s', (raw, expected) => {
    expect(parseSpreadsheetNumber(raw)).toBe(expected)
  })

  it('rejects text', () => {
    expect(parseSpreadsheetNumber('Qty')).toBeNull()
  })
})

describe('parseBoqPaste', () => {
  it('reads five-column rows copied from Excel and skips the header', () => {
    const pasted = 'Item\tDescription\tUnit\tQty\tRate\n1.1\tSite clearance\tm2\t450\t18.50\n1.2\tBulk excavation\tm3\t1,200\tR 145,00\n'

    const result = parseBoqPaste(pasted)

    expect(result.skipped).toBe(1)
    expect(result.lines).toEqual([
      { item_code: '1.1', trade_code: '', description: 'Site clearance', unit: 'm2', contract_quantity: '450', rate: '18.5' },
      { item_code: '1.2', trade_code: '', description: 'Bulk excavation', unit: 'm3', contract_quantity: '1200', rate: '145' },
    ])
  })

  it('supports a leading trade column', () => {
    const result = parseBoqPaste('EARTH\tE1\tExcavate trenches\tm3\t12\t300\r\n')

    expect(result.lines[0]).toMatchObject({ trade_code: 'EARTH', item_code: 'E1', contract_quantity: '12', rate: '300' })
  })

  it('skips incomplete rows and blank lines', () => {
    const result = parseBoqPaste('\n\nX1\t\tm2\t1\t1\nSubtotal\n')

    expect(result.lines).toHaveLength(0)
    expect(result.skipped).toBe(2)
  })
})
