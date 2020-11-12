export class PreloadedPool {
  id: string
  live: boolean
  name: string
  data: string
  startBlock: number
}

/**
 * These pools were used before they were added to the registry, so if we only start
 * indexing their events after the block of the PoolCreated event in the pool registry,
 * then we would miss some data. To address this, we check in the block handler for the startBlock
 * values in this array and load the data from IPFS if a preloaded pool is found.
 *  */ 
export let preloadedPools: PreloadedPool[] = [
  {
    id: '0xc4084221fb5d0f28f817c795435c2d17eab6c389',
    live: true,
    name: 'Kovan Revolving 1',
    data: '',
    startBlock: 21406294,
  },
]
