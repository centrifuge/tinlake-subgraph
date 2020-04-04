import { normalizeHexString } from './util'

describe('normalizeHexString', () => {
  test('should work', () => {
    expect(normalizeHexString("0x0")).toBe("0x00")
    expect(normalizeHexString("0")).toBe("0x00")
    expect(normalizeHexString("0x100")).toBe("0x0100")
    expect(normalizeHexString("100")).toBe("0x0100")
  })
})
