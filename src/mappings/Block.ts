import { log, BigInt, Address, ethereum, dataSource } from '@graphprotocol/graph-ts'
import { poolStartBlocks } from '../poolMetas'
import { createDailySnapshot } from '../domain/DailyPoolData'
import { Assessor } from '../../generated/Block/Assessor'
import { Pool } from '../../generated/schema'
import { poolMetas } from '../poolMetas'
import { isNewDay } from '../domain/Day'
import { seniorToJuniorRatio } from '../util/pool'
import { createPool } from '../domain/Pool'
import { fastForwardUntilBlock, blockTimeSeconds, handleBlockFrequencyMinutes } from '../config'
import { updateLoans } from '../domain/Loan'

export function handleBlock(block: ethereum.Block): void {
  // Do not run handleBlock for every single block, since it is not performing well at the moment. Issue: handleBlock
  // calls 3*n contracts for n loans, which takes with 12 loans already ~8 seconds. Since it scales linearly, we expect
  // that the Graph won't be able to keep up with block production on Ethereum. Executing this handler only every x
  // minutes is a workaround for now, but we should change the architecture to fix the scalability at a later point as
  // described in the following:
  // TODO: change the logic in handleBlock to solely use call/event handlers. The idea is to only track changes to the
  // debt (borrowing/repaying) and interest rate through calls/events, and then run the block handler without actual
  // calls to just calculate the current debt off-chain using the same logic that is used on-chain (without calls into
  // the current debt value).
  // We do run handleBlock for poolStartBlocks though.
  let poolStartBlock = poolStartBlocks.has(block.number.toI32())
  if (
    !poolStartBlock &&
    block.number.mod(BigInt.fromI32((handleBlockFrequencyMinutes * 60) / blockTimeSeconds)).notEqual(BigInt.fromI32(0))
  ) {
    log.debug('skip handleBlock at number {}', [block.number.toString()])
    return
  }

  // optimization to only update historical pool data once/day
  let blockNum = block.number.toI32()
  let fastForward = blockNum < fastForwardUntilBlock
  let newDay = isNewDay(block)
  if (!fastForward || (fastForward && newDay) || (fastForward && poolStartBlock)) {
    updatePoolLogic(block)
  }
  if (newDay) {
    createDailySnapshot(block)
  }
}

function updatePoolLogic(block: ethereum.Block): void {
  log.debug('handleBlock number {}', [block.number.toString()])
  // iterate through all pools that are for the current network
  let relevantPoolMetas = poolMetas.filter((poolMeta) => poolMeta.networkId == dataSource.network())
  for (let i = 0; i < relevantPoolMetas.length; i++) {
    let poolMeta = relevantPoolMetas[i]
    let pool = Pool.load(poolMeta.id)

    log.debug('updatePoolLogic: pool start block {}, current block {}', [
      poolMeta.startBlock.toString(),
      block.number.toString(),
    ])

    if (pool == null && parseFloat(block.number.toString()) >= poolMeta.startBlock) {
      createPool(poolMeta.id)
      pool = Pool.load(poolMeta.id)
    }

    if (pool == null) {
      log.error('pool does not exist after creation', [poolMeta.id.toString()])
      return
    }

    log.debug('pool {} loaded', [poolMeta.id.toString()])

    // update loans and return weightedInterestRate and totalDebt
    let loanValues = updateLoans(pool as Pool)

    // update pool values
    pool.weightedInterestRate = loanValues[0]
    pool.totalDebt = loanValues[1]

    let assessor = Assessor.bind(<Address>Address.fromHexString(poolMeta.assessor))
    let currentSeniorRatioResult = assessor.try_seniorRatio()
    pool.currentJuniorRatio = !currentSeniorRatioResult.reverted
      ? seniorToJuniorRatio(currentSeniorRatioResult.value)
      : BigInt.fromI32(0)

    // check if senior tranche exists
    if (poolMeta.seniorTranche != '0x0000000000000000000000000000000000000000') {
      let seniorDebtResult = new ethereum.CallResult<BigInt>()
      let assessor = Assessor.bind(<Address>Address.fromHexString(poolMeta.assessor))
      seniorDebtResult = assessor.try_seniorDebt_()

      pool.seniorDebt = !seniorDebtResult.reverted ? seniorDebtResult.value : BigInt.fromI32(0)
      log.debug('will update seniorDebt {}', [pool.seniorDebt.toString()])
    }

    log.debug('will update pool {}: totalDebt {} minJuniorRatio {} juniorRatio {} weightedInterestRate {}', [
      poolMeta.id,
      pool.totalDebt.toString(),
      pool.minJuniorRatio.toString(),
      pool.currentJuniorRatio.toString(),
      pool.weightedInterestRate.toString(),
    ])
    pool.save()
  }
}
