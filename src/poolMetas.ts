import { Address, log } from "@graphprotocol/graph-ts"

export enum network {
  mainnet,
  kovan,
}

// NOTE: interfaces are not supported by AssemblyScript
export class PoolMeta {
  id: string // root contract address
  shelf: string // shelf contract address
  pile: string // pile contract address
  nftFeed: string // nftFeed contract address
  assessor: string // assessor contract address
  senior: string // senior contract address
  networkId: network
}

// NOTE: the following addresses all need to be lower case. Also note that AssemblyScript does not support
// .toLowerCase()
export let poolMetas: PoolMeta[] = [
  // Mainnet production
  {
    id: '0xf8b4ef7781ba8e1b3df6370f71d526d00aad1ee2',
    shelf: '0x454c86ba7e0cbd959cfa76aa2db799f9d7a816e4',
    pile: '0x95b74ef13ff280a89ce3d7bbefc822c210e9939f',
    nftFeed: '0xab351d3e54c975bfa0c2edafb6fab03f94762111',
    assessor: '0x1aba642c1aac9f8da36f7df73eda4ca73e054084',
    senior: '0x4c1bfb4e3ecbd6200358038e3f560ab6dee9bcb6',
    networkId: network.mainnet,
  },

  // Mainnet staging
  {
    id: '0x05597dd9b8e1d4fdb44eb69d20bc3a2feef605e8',
    shelf: '0x7ca150514c9b17c1e343d420d66238a299f80070',
    pile: '0xbef9e6b821c7a54797f0e73cf0d72a140b6db378',
    nftFeed: '0x865963b74b87387106bf12b01a097b3801f906fb',
    assessor: '0x9f5d1cce788d9383a5db8110d2f47d58011ff230',
    senior: '0x3a448226a26c072a6554a1786a2e29f70c96d8b6',
    networkId: network.mainnet,
  },

  // Kovan staging
  {
    id: '0x41b7b379dee711b1a9bfbabd4b1309a584f5fe5a',
    shelf: '0x897a26c6a46e71973d779577aeb87395a9dc6090',
    pile: '0x8a0184c12f3e060c7d0119021f58cd45073373d8',
    nftFeed: '0xf9735946c98479b8c0f05c1c6a87a9d4affaae79',
    assessor: '0x674c4a8b31e42dd74a2c2bdb61fb9742acba0d5c',
    senior: '0xd0779006265a98c820dc483be79fe573a84c631f',
    networkId: network.kovan,
  },
]

// lookup that contains the pool indexed by shelf
export let poolMetaByShelf = new Map<string, PoolMeta>()
for (let i = 0; i < poolMetas.length; i++) {
  poolMetaByShelf.set(poolMetas[i].shelf, poolMetas[i])
}

// lookup that contains the pool indexed by pile
export let poolMetaByPile = new Map<string, PoolMeta>()
for (let i = 0; i < poolMetas.length; i++) {
  poolMetaByPile.set(poolMetas[i].pile, poolMetas[i])
}

// lookup that contains the pool indexed by nftFeed
export let poolMetaByNftFeed = new Map<string, PoolMeta>()
for (let i = 0; i < poolMetas.length; i++) {
  poolMetaByNftFeed.set(poolMetas[i].nftFeed, poolMetas[i])
}


