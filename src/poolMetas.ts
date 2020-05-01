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
    shelf: ('0x897a26C6a46E71973D779577aEB87395a9Dc6090'),
    pile: ('0x8A0184C12f3E060C7D0119021f58cd45073373d8'),
    nftFeed: ('0xF9735946c98479b8C0F05c1C6A87a9D4afFAAe79'),
    assessor: ('0x674C4a8B31E42Dd74a2C2bDb61fb9742AcbA0D5C'),
    senior: ('0x3D7d580ae6cb80C6CED6543A3142CB04b3AB3770'),
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


