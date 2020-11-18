import { log, ethereum, BigInt } from '@graphprotocol/graph-ts'
import { createDailySnapshot } from '../domain/DailyPoolData'
import { isNewDay } from '../domain/Day'
import { updatePoolValues } from './Coordinator'
import { preloadedPoolByStartBlock } from '../preloadedPools'
import { loadPoolFromIPFS } from './PoolRegistry'
import { fastForwardUntilBlock, handleBlockFrequencyMinutes, blockTimeSeconds } from '../config'
import { getAllPools } from '../domain/PoolRegistry'

export function handleBlock(block: ethereum.Block): void {
  // Check if there's a preloaded pool for this block
  if (preloadedPoolByStartBlock.has(block.number.toI32())) {
    log.debug('handleBlock: preload pool - IPFS hash {}', [preloadedPoolByStartBlock.get(block.number.toI32()).ipfsHash])
    loadPoolFromIPFS(preloadedPoolByStartBlock.get(block.number.toI32()).ipfsHash)
  }

  // Hnadle block every n minutes only (e.g. every 5 minutes)
  if (block.number.mod(BigInt.fromI32((handleBlockFrequencyMinutes * 60) / blockTimeSeconds)).notEqual(BigInt.fromI32(0))) {
    log.debug('handleBlock: skip block {}', [block.number.toString()])
    return
  }

  // Create a daily snapshot if the last one is from yesterday
  let newDay = isNewDay(block)
  if (newDay) {
    log.debug('handleBlock: create daily snapshot - block {}', [block.number.toString()])
    createDailySnapshot(block)
  }

  // Update all pool values if the fast forward phase has passed, or if it's a new day
  let fastForwardEnabled = block.number.toI32() < fastForwardUntilBlock
  if (!fastForwardEnabled || (fastForwardEnabled && newDay)) {
    let pools = getAllPools()
    for (let i = 0; i < pools.length; i++) {
    log.debug('handleBlock: update pool values - pool {}', [pools[i]])
      updatePoolValues(pools[i])
    }
  }
}
