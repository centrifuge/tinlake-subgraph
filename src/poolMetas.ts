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
  ceiling: string // ceiling contract address
  threshold: string // threshold contract address
  assessor: string // assessor contract address
  senior: string // senior contract address
  networkId: network
}

export let poolMetas: PoolMeta[] = [
  {
    id: ('0xa9a1501ed1319e2e3fdc1e95e25887cde9597558'),
    shelf: ('0x7c1e657f79b98409c54756b11aad016d040701d2'),
    pile: ('0x683e2129cf1cd4305d25bf89ad8564081ead0d8a'),
    ceiling: ('0x777d29da29e9e117ffc483dfd94a2fe593dd1182'),
    threshold: ('0xeb4cd994597345d167770523cfbf7d31a5697ac1'),
    assessor: ('0xcc76119e8082e4de6be7af5f877914aab266d114'),
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
