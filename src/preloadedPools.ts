import { dataSource } from '@graphprotocol/graph-ts'

export class PreloadedPool {
  id: string
  ipfsHash: string
  assessorStartBlock: number
  network: string
}

/**
 * These pools were used before they were added to the registry OR they had an update that was never added to the registry, so if we only start
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
  {
    id: '0x4ca805ce8ece2e63ffc1f9f8f2731d3f48df89df', // HTC2 new coordinator April 2021
    ipfsHash: 'QmYBV6TvKYXVoBdW2kBm28RVgbbfJv4KEXHWsHc7ZKB6fr',
    assessorStartBlock: 12342687,
    network: 'mainnet',
  },
  {
    id: '0x53b2d22d07e069a3b132bfeaad275b10273d381e', // NS2 new coordinator July 2021
    ipfsHash: 'QmR3xMxpm5Wr52LAKkVyozbGEjYyqK56mZNyVnfypcKTGd',
    assessorStartBlock: 12786540,
    network: 'mainnet',
  },
]

export let kovanPreloadedPools: PreloadedPool[] = []

// Lookup tables by start block
export let preloadedPoolByStartBlockMainnet = new Map<number, PreloadedPool>()
for (let i = 0; i < mainnetPreloadedPools.length; i++) {
  preloadedPoolByStartBlockMainnet.set(mainnetPreloadedPools[i].assessorStartBlock, mainnetPreloadedPools[i])
}

export let preloadedPoolByStartBlockKovan = new Map<number, PreloadedPool>()
for (let i = 0; i < kovanPreloadedPools.length; i++) {
  preloadedPoolByStartBlockKovan.set(kovanPreloadedPools[i].assessorStartBlock, kovanPreloadedPools[i])
}

export let preloadedPoolByStartBlock =
  dataSource.network() == 'mainnet' ? preloadedPoolByStartBlockMainnet : preloadedPoolByStartBlockKovan

// Lookup tables by IPFS hash
export let preloadedPoolByIPFSHashMainnet = new Map<string, PreloadedPool>()
for (let i = 0; i < mainnetPreloadedPools.length; i++) {
  preloadedPoolByIPFSHashMainnet.set(mainnetPreloadedPools[i].ipfsHash, mainnetPreloadedPools[i])
}

export let preloadedPoolByIPFSHashKovan = new Map<string, PreloadedPool>()
for (let i = 0; i < kovanPreloadedPools.length; i++) {
  preloadedPoolByIPFSHashKovan.set(kovanPreloadedPools[i].ipfsHash, kovanPreloadedPools[i])
}

export let preloadedPoolByIPFSHash =
  dataSource.network() == 'mainnet' ? preloadedPoolByIPFSHashMainnet : preloadedPoolByIPFSHashKovan
