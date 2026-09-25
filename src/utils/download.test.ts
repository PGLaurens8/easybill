import { describe, expect, it } from 'vitest'

import { toCsv } from './download'

describe('toCsv', () => {
  it('neutralises text that Excel would run as a formula', () => {
    expect(toCsv([['=HYPERLINK("http://evil","x")', '+1+1', '@SUM(A1)', 'Face brick']])).toBe(
      `"'=HYPERLINK(""http://evil"",""x"")",'+1+1,'@SUM(A1),Face brick`,
    )
  })

  it('leaves negative numbers alone and quotes commas', () => {
    expect(toCsv([['-12.5', 'Walls, internal', 3]])).toBe('-12.5,"Walls, internal",3')
  })
})
