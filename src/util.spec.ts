import { makeHexLengthEven } from './util'

describe('makeHexLengthEven', () => {
  test('should work', () => {
    expect(makeHexLengthEven("0x0")).toBe("0x00")
    expect(makeHexLengthEven("0")).toBe("0x00")
    expect(makeHexLengthEven("0x100")).toBe("0x0100")
    expect(makeHexLengthEven("100")).toBe("0x0100")
  })
})
