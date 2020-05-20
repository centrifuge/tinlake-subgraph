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
    id: '0xc95e8de672d717f7b60bca629f6cc65dd448ddc1',
    shelf: '0xA51672dab1c3061900Ef32600B69E763CA6384BF',
    pile: '0x4B2ed13CA3603BaC65De264CFc14A3C03d3C822C',
    nftFeed: '0xe2520CC30be375206127Dcec370f51e664141a92',
    assessor: '0x76598110EcEcc538a817B6154F645cf37702406f',
    senior: '0x0122e2480255E4323fA10C1022545743532Ad610',
    networkId: network.kovan,
  },
  {
    id: '0xbb53072d054de55d56dbb4ee95840de3262e4097',
    shelf: '0xCcf827238991FC3D5A51067968501A38624F313d',
    pile: '0xCAd66910788d5344425e30bd665693bd5bb479C4',
    nftFeed: '0xe3a0118028db155daAA553f266Ca18bae8540fd2',
    assessor: '0x8A62a77D9a0Eaf0067a8134cdf3250642ff1dF3C',
    senior: '0xA5d9B0190874b29d824B0d0164dec8B6034d1615',
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


