import { log, ethereum, dataSource } from '@graphprotocol/graph-ts'
import { createDailySnapshot } from '../domain/DailyPoolData'
import { isNewDay } from '../domain/Day'
import { ipfsHashByStartBlockMainnet, ipfsHashByStartBlockKovan } from '../preloadedPools'
import { loadPoolFromIPFS } from './PoolRegistry'

export function handleBlock(block: ethereum.Block): void {
  // Check if there's a preloaded pool for this block
  let ipfsHashByStartBlock = dataSource.network() == 'mainnet' ? ipfsHashByStartBlockMainnet : ipfsHashByStartBlockKovan
  if (ipfsHashByStartBlock.has(block.number.toI32())) {
    log.debug('preload pool: pool id {}', [ipfsHashByStartBlock.get(block.number.toI32())])
    loadPoolFromIPFS(ipfsHashByStartBlock.get(block.number.toI32()))
  }

  // Create a daily snapshot if the last one is from yesterday
  if (isNewDay(block)) {
    log.debug('create daily snapshot: block {}', [block.number.toString()])
    createDailySnapshot(block)
  }
}
