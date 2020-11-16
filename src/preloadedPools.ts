export class PreloadedPool {
  id: string
  ipfsHash: string
  assessorStartBlock: number
  network: string
}

/**
 * These pools were used before they were added to the registry, so if we only start
 * indexing their events after the block of the PoolCreated event in the pool registry,
 * then we would miss some data. To address this, we check in the block handler for the startBlock
 * values in this array and load the data from IPFS if a preloaded pool is found.
 */

export let mainnetPreloadedPools: PreloadedPool[] = [
  {
    id: '0xdb3bc9fb1893222d266762e9ff857eb74d75c7d6',
    ipfsHash: 'QmNfSZxdtBZEc9j8K1VNQck2oagH5pm2mXpd5xpM54aLqU',
    assessorStartBlock: 11063166,
    network: 'mainnet',
  },
]

export let kovanPreloadedPools: PreloadedPool[] = [
  {
    id: '0xc4084221fb5d0f28f817c795435c2d17eab6c389',
    ipfsHash: 'QmejWfuhKtNr3joGWsMExBLCLwNhgfAcUf4SKeYAz43Piz',
    assessorStartBlock: 21406450,
    network: 'kovan',
  },
]

export let ipfsHashByStartBlockMainnet = new Map<number, string>()
for (let i = 0; i < mainnetPreloadedPools.length; i++) {
  ipfsHashByStartBlockMainnet.set(mainnetPreloadedPools[i].assessorStartBlock, mainnetPreloadedPools[i].ipfsHash)
}

export let ipfsHashByStartBlockKovan = new Map<number, string>()
for (let i = 0; i < kovanPreloadedPools.length; i++) {
  ipfsHashByStartBlockKovan.set(kovanPreloadedPools[i].assessorStartBlock, kovanPreloadedPools[i].ipfsHash)
}
