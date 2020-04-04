import { poolMetaByShelf, network } from './poolMetas'

describe('poolMeta', () => {
  test('should retreive poolMeta by shelf', () => {
    expect(
      poolMetaByShelf.get("0x6d30460f33e2d8266105a9523e028fd66c6ad296")
    ).toStrictEqual({
      id: '0x31738b2b0d8864822ce2db48dbc5c6521a9af260',
      shelf: '0x6d30460f33e2d8266105a9523e028fd66c6ad296',
      pile: '0x49984134aa0d66e82d94475e2a6bf69bd4398905',
      ceiling: '0x77e7d3f0a1126689f5989d33dde6741d1d3f9cad',
      threshold: '0x65fb4cd704e71ef3c78cb885e8683ff696c1a04e',
      networkId: network.kovan,
    })

    expect(
      poolMetaByShelf.get("non existing")
    ).toStrictEqual(undefined)
  })
})
