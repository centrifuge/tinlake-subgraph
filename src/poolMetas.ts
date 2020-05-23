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

  {
    id: '0x90abc0adb789111b4b865fdb3350b14a6e78794e',
    shelf: '0x3d0e477f328e48daa315aa503a6edf5b67f2d387',
    pile: '0xa6bf7d7779383f6e078d0969f5b85b391994fced',
    nftFeed: '0xf7be772a892340cf28b7e2b4e7b48564f66d1a63',
    assessor: '0x41203b4c2b497334c01f9ce6f88ab42bd485199d',
    senior: '0xf49599f60bad647b9f82b7c5ef7736af13ff89ac',
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
    id: '0xbb53072d054de55d56dbb4ee95840de3262e4097',
    shelf: '0xccf827238991fc3d5a51067968501a38624f313d',
    pile: '0xcad66910788d5344425e30bd665693bd5bb479c4',
    nftFeed: '0xe3a0118028db155daaa553f266ca18bae8540fd2',
    assessor: '0x8a62a77d9a0eaf0067a8134cdf3250642ff1df3c',
    senior: '0xa5d9b0190874b29d824b0d0164dec8b6034d1615',
    networkId: network.kovan,
  },
  
  {
    id: '0xc95e8de672d717f7b60bca629f6cc65dd448ddc1',
    shelf: '0xa51672dab1c3061900ef32600b69e763ca6384bf',
    pile: '0x4b2ed13ca3603bac65de264cfc14a3c03d3c822c',
    nftFeed: '0xe2520cc30be375206127dcec370f51e664141a92',
    assessor: '0x76598110ececc538a817b6154f645cf37702406f',
    senior: '0x0122e2480255e4323fa10c1022545743532ad610',
    networkId: network.kovan,
  }
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

// lookup that contains the pool indexed by seniorTranche
export let poolMetaBySeniorTranche = new Map<string, PoolMeta>()
for (let i = 0; i < poolMetas.length; i++) {
  poolMetaBySeniorTranche.set(poolMetas[i].senior, poolMetas[i])
}


