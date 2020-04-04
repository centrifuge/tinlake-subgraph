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
  networkId: network
}

export let poolMetas: PoolMeta[] = [
  {
    id: '0x31738b2b0d8864822ce2db48dbc5c6521a9af260',
    shelf: '0x6d30460f33e2d8266105a9523e028fd66c6ad296',
    pile: '0x49984134aa0d66e82d94475e2a6bf69bd4398905',
    ceiling: '0x77e7d3f0a1126689f5989d33dde6741d1d3f9cad',
    threshold: '0x65fb4cd704e71ef3c78cb885e8683ff696c1a04e',
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
