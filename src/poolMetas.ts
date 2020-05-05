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

export let poolMetas: PoolMeta[] = [
  // Mainnet production
  {
    id: '0xf8b4ef7781ba8e1b3df6370f71d526d00aad1ee2'.toLowerCase(),
    shelf: '0x454C86Ba7e0CBd959CFa76aA2DB799F9D7a816e4'.toLowerCase(),
    pile: '0x95b74eF13fF280A89cE3d7bBEfc822c210e9939F'.toLowerCase(),
    nftFeed: '0xaB351D3e54c975BFA0c2edaFB6fAB03F94762111'.toLowerCase(),
    assessor: '0x1abA642c1AaC9F8dA36f7DF73EdA4Ca73E054084'.toLowerCase(),
    senior: '0x4c1bfB4e3ecBd6200358038e3F560AB6dEe9bCb6'.toLowerCase(),
    networkId: network.mainnet,
  },

  // Mainnet staging
  {
    id: '0x05597dd9b8e1d4fdb44eb69d20bc3a2feef605e8'.toLowerCase(),
    shelf: '0x7CA150514c9B17c1e343d420D66238a299F80070'.toLowerCase(),
    pile: '0xbEF9e6B821C7A54797f0E73cF0d72A140B6Db378'.toLowerCase(),
    nftFeed: '0x865963b74B87387106bf12B01A097b3801f906fB'.toLowerCase(),
    assessor: '0x9F5D1CCE788D9383A5db8110D2f47D58011Ff230'.toLowerCase(),
    senior: '0x3A448226a26C072a6554a1786A2E29f70c96d8B6'.toLowerCase(),
    networkId: network.mainnet,
  },

  // Kovan staging
  {
    id: ('0x41b7b379dee711b1a9bfbabd4b1309a584f5fe5a'),
    shelf: ('0x897a26c6a46e71973d779577aeb87395a9dc6090'),
    pile: ('0x8a0184c12f3e060c7d0119021f58cd45073373d8'),
    nftFeed: ('0xf9735946c98479b8c0f05c1c6a87a9d4affaae79'),
    assessor: ('0x674c4a8b31e42dd74a2c2bdb61fb9742acba0d5c'),
    senior: ('0xd0779006265a98c820dc483be79fe573a84c631f'),
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


