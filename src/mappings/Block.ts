import { log, ethereum, dataSource } from '@graphprotocol/graph-ts'
import { createDailySnapshot } from '../domain/DailyPoolData'
import { isNewDay } from '../domain/Day'
import { ipfsHashByStartBlockMainnet, ipfsHashByStartBlockKovan } from '../preloadedPools'
import { loadPoolFromIPFS } from './PoolRegistry'

export function handleBlock(block: ethereum.Block): void {
  let ipfsHashByStartBlock = dataSource.network() == 'mainnet' ? ipfsHashByStartBlockMainnet : ipfsHashByStartBlockKovan
  if (ipfsHashByStartBlock.has(block.number.toI32())) {
    log.debug('preload pool {}', [ipfsHashByStartBlock.get(block.number.toI32())])
    loadPoolFromIPFS(ipfsHashByStartBlock.get(block.number.toI32()))
  }

  if (isNewDay(block)) {
    createDailySnapshot(block)
  }
}
