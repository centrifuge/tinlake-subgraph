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


