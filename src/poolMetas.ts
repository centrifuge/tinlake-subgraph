enum network {
    mainnet,
    kovan,
  }

  class PoolMeta {
    id: string // root contract address
    pile: string // pile contract address
    shelf: string // shelf contract address
    networkId: network
  }

export let poolMetas: PoolMeta[] = [
    {
        id: '0x31738b2b0d8864822ce2db48dbc5c6521a9af260',
        pile: '0x49984134aa0d66e82d94475e2a6bf69bd4398905',
        shelf: '0x6d30460f33e2d8266105a9523e028fd66c6ad296',
        networkId: network.kovan,
    },
]

// lookup that contains the pool indexed by shelf
export let poolMetaByShelf = new Map<string, PoolMeta>()
for (let i = 0; i < poolMetas.length; i++) {
    poolMetaByShelf.set(poolMetas[i].id, poolMetas[i])
}