import { Address, log } from "@graphprotocol/graph-ts"

export enum network {
  mainnet,
  kovan,
}

// NOTE: interfaces are not supported by AssemblyScript
class PoolMeta {
  id: string // root contract address
  shelf: string // shelf contract address
  pile: string // pile contract address
  ceiling: string // ceiling contract address
  threshold: string // threshold contract address
  assessor: string // assessor contract address
  senior: string // senior contract address
  networkId: network
}

export let poolMetas: PoolMeta[] = [
  {
    id: ('0xde1b98d083db90a00dee656ccc50a84597312c8d'),
    shelf: ('0x2f79f0acccb29767496bcc5aa95c8aff109b2395'),
    pile: ('0x1119f08ad829b2aabe7b05e782be61bdd7e0b835'),
    ceiling: ('0x5fd12cfd3a335b0e336cd9ad633c46c7a2c948cf'),
    threshold: ('0xe6e48cbe96e70e9f4b8df2ff0706aa8346dabb5d'),
    assessor: ('0xea2790111a372c8414253039021c7a29a535f88b'),
    senior: ('0x0000000000000000000000000000000000000000'),
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

// lookup that contains the pool indexed by ceiling
export let poolMetaByCeiling = new Map<string, PoolMeta>()
for (let i = 0; i < poolMetas.length; i++) {
  poolMetaByCeiling.set(poolMetas[i].ceiling, poolMetas[i])
}

// lookup that contains the pool indexed by threshold
export let poolMetaByThreshold = new Map<string, PoolMeta>()
for (let i = 0; i < poolMetas.length; i++) {
  poolMetaByThreshold.set(poolMetas[i].threshold, poolMetas[i])
}
