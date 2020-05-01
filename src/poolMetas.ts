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


