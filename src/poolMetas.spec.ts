import { poolMetaByShelf, network } from './poolMetas'

describe('poolMeta', () => {
  test('should retreive poolMeta by shelf', () => {
    expect(
      poolMetaByShelf.get("0x454c86ba7e0cbd959cfa76aa2db799f9d7a816e4")
    ).toStrictEqual({
      id: '0xf8b4ef7781ba8e1b3df6370f71d526d00aad1ee2',
      shelf: '0x454c86ba7e0cbd959cfa76aa2db799f9d7a816e4',
      pile: '0x95b74ef13ff280a89ce3d7bbefc822c210e9939f',
      nftFeed: '0xab351d3e54c975bfa0c2edafb6fab03f94762111',
      assessor: '0x1aba642c1aac9f8da36f7df73eda4ca73e054084',
      senior: '0x4c1bfb4e3ecbd6200358038e3f560ab6dee9bcb6',
      networkId: network.mainnet,
      startBlock: 10002000
    })

    expect(
      poolMetaByShelf.get("non existing")
    ).toStrictEqual(undefined)
  })
})
