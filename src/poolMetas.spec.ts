import { poolMetaByShelf, network } from './poolMetas'

describe('poolMeta', () => {
  test('should retreive poolMeta by shelf', () => {
    expect(
      poolMetaByShelf.get("0x2F79F0AcCcB29767496BCc5aA95c8aFf109b2395")
    ).toStrictEqual({
      id: '0xde1b98d083db90a00dee656ccc50a84597312c8d',
      shelf: '0x2F79F0AcCcB29767496BCc5aA95c8aFf109b2395',
      pile: '0x1119F08aD829B2AaBE7b05E782BE61bdD7E0B835',
      ceiling: '0x5fD12CfD3a335B0e336cD9aD633C46C7a2c948cf',
      threshold: '0xe6E48Cbe96e70E9f4B8dF2FF0706aA8346daBB5d',
      networkId: network.kovan,
    })

    expect(
      poolMetaByShelf.get("non existing")
    ).toStrictEqual(undefined)
  })
})
