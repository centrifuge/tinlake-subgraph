import { log, ethereum, BigInt } from '@graphprotocol/graph-ts'
import { loadOrCreateRewardDayTotal } from '../domain/TokenBalance'
import { createDailySnapshot } from '../domain/DailyPoolData'
import { getToday, createDay } from '../domain/Day'
import { updateAllPoolValues } from './Coordinator'
import { preloadedPoolByStartBlock } from '../preloadedPools'
import { loadPoolFromIPFS } from './PoolRegistry'
import { fastForwardUntilBlock, handleBlockFrequencyMinutes, blockTimeSeconds } from '../config'
import { timestampToDate } from '../util/date'

export function handleBlock(block: ethereum.Block): void {
  // Check if there's a preloaded pool for this block
  if (preloadedPoolByStartBlock.has(block.number.toI32())) {
    log.debug('handleBlock: preload pool - IPFS hash {}', [
      preloadedPoolByStartBlock.get(block.number.toI32()).ipfsHash,
    ])
    loadPoolFromIPFS(preloadedPoolByStartBlock.get(block.number.toI32()).ipfsHash)
  }

  // Hnadle block every n minutes only (e.g. every 5 minutes)
  if (
    block.number.mod(BigInt.fromI32((handleBlockFrequencyMinutes * 60) / blockTimeSeconds)).notEqual(BigInt.fromI32(0))
  ) {
    log.debug('handleBlock: skip block {}', [block.number.toString()])
    return
  }

  // Create a daily snapshot if the last one is from yesterday
  let today = getToday(block)
  let newDay = today == null
  if (newDay) {
    let date = timestampToDate(block.timestamp)
    today = createDay(date.toString())

    loadOrCreateRewardDayTotal(date)
    createDailySnapshot(block)
  }

  // Update all pool values if the fast forward phase has passed, or if it's a new day
  let fastForwardEnabled = block.number.toI32() < fastForwardUntilBlock
  if (!fastForwardEnabled || (fastForwardEnabled && newDay)) {
    updateAllPoolValues(block, today)
  }
}
