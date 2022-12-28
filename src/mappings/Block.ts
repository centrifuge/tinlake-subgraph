import { log, ethereum, BigInt } from '@graphprotocol/graph-ts'
import { getToday, createDay } from '../domain/Day'
import { updateAllPoolValues } from './Coordinator'
import { preloadedPoolByStartBlock } from '../preloadedPools'
import { upsertPool } from './PoolRegistry'
import { fastForwardUntilBlock, handleBlockFrequencyMinutes, blockTimeSeconds } from '../config'
import { timestampToDate } from '../util/date'
import { Day } from '../../generated/schema'

export function handleBlock(block: ethereum.Block): void {
  // Check if there's a preloaded pool for this block
  if (preloadedPoolByStartBlock.has(block.number.toI32())) {
    log.info('handleBlock: preload pool - IPFS hash {}', [preloadedPoolByStartBlock.get(block.number.toI32()).ipfsHash])
    upsertPool(
      preloadedPoolByStartBlock.get(block.number.toI32()).id,
      preloadedPoolByStartBlock.get(block.number.toI32()).ipfsHash
    )
  }

  // Handle block every n minutes only (e.g. every 5 minutes)
  if (
    block.number.mod(BigInt.fromI32((handleBlockFrequencyMinutes * 60) / blockTimeSeconds)).notEqual(BigInt.fromI32(0))
  ) {
    return
  }

  // Create a daily snapshot if the last one is from yesterday
  let newDay = Day.load(timestampToDate(block.timestamp).toString()) == null
  let today = getToday(block)

  // Update all pool values if the fast forward phase has passed, or if it's a new day
  let fastForwardEnabled = block.number.toI32() < fastForwardUntilBlock
  if (!fastForwardEnabled || (fastForwardEnabled && newDay)) {
    updateAllPoolValues(block, today)
  }
}
