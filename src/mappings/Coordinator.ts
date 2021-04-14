import { log, BigInt, Address, ethereum, dataSource } from '@graphprotocol/graph-ts'
import { Assessor } from '../../generated/Block/Assessor'
import { NavFeed } from '../../generated/Block/NavFeed'
import { Reserve } from '../../generated/Block/Reserve'
import { Pool, PoolAddresses, Day, DailyPoolData, Loan } from '../../generated/schema'
import { ExecuteEpochCall } from '../../generated/templates/Coordinator/Coordinator'
import { seniorToJuniorRatio } from '../util/pool'
import { updateLoans } from '../domain/Loan'
import { getAllPools } from '../domain/PoolRegistry'
import { timestampToDate } from '../util/date'
import { secondsInDay, zeroAddress } from '../config'
import { addToDailyAggregate } from '../domain/DailyPoolData'
import { loanIdFromPoolIdAndIndex } from '../util/typecasts'

export function handleCoordinatorExecuteEpoch(call: ExecuteEpochCall): void {
  let poolId = dataSource.context().getString('id')
  log.debug('handleCoordinatorExecuteEpoch: pool id {}, to {}', [poolId.toString(), call.to.toString()])

  // TODO: re add this at some point
  // updatePoolValues(poolId, null)
}

export function updateAllPoolValues(block: ethereum.Block, today: Day): void {
  // resetting values for real time aggregation
  today.reserve = BigInt.fromI32(0)
  today.totalDebt = BigInt.fromI32(0)
  today.assetValue = BigInt.fromI32(0)
  today.seniorDebt = BigInt.fromI32(0)

  let pools = getAllPools()
  for (let i = 0; i < pools.length; i++) {
    log.debug('handleBlock: update pool values - pool {}', [pools[i]])
    updatePoolValues(pools[i], block, today)
  }
}

export function updatePoolValues(poolId: string, block: ethereum.Block, today: Day): void {
  let pool = Pool.load(poolId)

  let addresses = PoolAddresses.load(poolId)

  // Update loans and return weightedInterestRate and totalDebt
  let loanValues = updateLoans(pool as Pool, addresses.pile)

  // Update pool values
  pool.weightedInterestRate = loanValues[0]
  pool.totalDebt = loanValues[1]

  let assessor = Assessor.bind(<Address>Address.fromHexString(addresses.assessor))
  let currentSeniorRatioResult = assessor.try_seniorRatio()
  pool.currentJuniorRatio = !currentSeniorRatioResult.reverted
    ? seniorToJuniorRatio(currentSeniorRatioResult.value)
    : BigInt.fromI32(0)

  let navFeedContract = NavFeed.bind(<Address>Address.fromHexString(addresses.feed))
  let currentNav = navFeedContract.try_currentNAV()
  pool.assetValue = !currentNav.reverted ? currentNav.value : BigInt.fromI32(0)

  let reserveContract = Reserve.bind(<Address>Address.fromHexString(addresses.reserve))
  let reserve = reserveContract.try_totalBalance()
  pool.reserve = !reserve.reverted ? reserve.value : BigInt.fromI32(0)

  let juniorPrice = assessor.try_calcJuniorTokenPrice(pool.assetValue, pool.reserve)
  let seniorPrice = assessor.try_calcSeniorTokenPrice(pool.assetValue, pool.reserve)

  pool.seniorTokenPrice = !seniorPrice.reverted ? seniorPrice.value : BigInt.fromI32(0)
  pool.juniorTokenPrice = !juniorPrice.reverted ? juniorPrice.value : BigInt.fromI32(0)

  pool = addYields(pool as Pool, block)

  // Check if senior tranche exists
  if (addresses.seniorTranche != zeroAddress) {
    let seniorDebtResult = new ethereum.CallResult<BigInt>()
    let assessor = Assessor.bind(<Address>Address.fromHexString(addresses.assessor))
    seniorDebtResult = assessor.try_seniorDebt_()

    pool.seniorDebt = !seniorDebtResult.reverted ? seniorDebtResult.value : BigInt.fromI32(0)
    log.debug('updatePoolValues: will update seniorDebt {}', [pool.seniorDebt.toString()])
  }

  addToDailyAggregate(<Day>today, <Pool>pool)

  log.debug(
    'updatePoolValues: will update pool {}: totalDebt {} minJuniorRatio {} juniorRatio {} weightedInterestRate {}',
    [
      poolId,
      pool.totalDebt.toString(),
      pool.minJuniorRatio.toString(),
      pool.currentJuniorRatio.toString(),
      pool.weightedInterestRate.toString(),
    ]
  )
  pool.save()
}

export function addYields(pool: Pool, block: ethereum.Block): Pool {
  let dateNow = timestampToDate(block.timestamp)

  let date14Ago = dateNow.minus(BigInt.fromI32(secondsInDay * 14))
  let day14Ago = Day.load(date14Ago.toString())
  if (day14Ago == null) {
    // can return early here, if we don't have data for 14 days ago, we won't have data for more than 14 days
    return pool
  }

  let pool14Ago = DailyPoolData.load(pool.id.concat(day14Ago.id))
  if (pool14Ago == null) {
    // can return early here, if we don't have data for 14 days ago, we won't have data for more than 14 days
    return pool
  }

  let yields14 = calculateYields(
    pool.juniorTokenPrice,
    pool14Ago.juniorTokenPrice,
    pool.seniorTokenPrice,
    pool14Ago.seniorTokenPrice,
    14
  )
  pool.juniorYield14Days = yields14.junior
  pool.seniorYield14Days = yields14.senior

  let date30Ago = dateNow.minus(BigInt.fromI32(secondsInDay * 30))
  let day30Ago = Day.load(date30Ago.toString())
  if (day30Ago == null) {
    // can return early here, if we don't have data for 30 days ago, we won't have data for more than 30 days
    return pool
  }

  let pool30Ago = DailyPoolData.load(pool.id.concat(day30Ago.id))
  if (pool30Ago == null) {
    // can return early here, if we don't have data for 30 days ago, we won't have data for more than 30 days
    return pool
  }

  let yields30 = calculateYields(
    pool.juniorTokenPrice,
    pool30Ago.juniorTokenPrice,
    pool.seniorTokenPrice,
    pool30Ago.seniorTokenPrice,
    30
  )
  pool.juniorYield30Days = yields30.junior
  pool.seniorYield30Days = yields30.senior

  // The inception is defined by minimum of the origination of the first loan and 30 days since pool creation
  let firstLoan = Loan.load(loanIdFromPoolIdAndIndex(pool.id, BigInt.fromI32(1)))
  if (firstLoan == null) {
    // There is no loan yet
    return pool
  }

  let dayInception = Day.load(timestampToDate(BigInt.fromI32(firstLoan.opened)).toString())
  let poolInception = DailyPoolData.load(pool.id.concat(dayInception.id))
  let daysSinceInception = dateNow
    .minus(timestampToDate(BigInt.fromI32(firstLoan.opened)))
    .div(BigInt.fromI32(secondsInDay))
  log.debug('pool {} inception was {} days ago', [pool.id.toString(), daysSinceInception.toString()])

  let yieldsInception = calculateYields(
    pool.juniorTokenPrice,
    poolInception.juniorTokenPrice,
    pool.seniorTokenPrice,
    poolInception.seniorTokenPrice,
    daysSinceInception.toI32()
  )
  pool.juniorYieldSinceInception = yieldsInception.junior
  pool.seniorYieldSinceInception = yieldsInception.senior

  return pool
}

class Yields {
  junior: BigInt
  senior: BigInt
}

function calculateYields(
  juniorCurrent: BigInt,
  juniorFormer: BigInt,
  seniorCurrent: BigInt,
  seniorFormer: BigInt,
  days: i32
): Yields {
  let juniorYield = juniorCurrent.minus(juniorFormer).times(BigInt.fromI32(365).div(BigInt.fromI32(days)))

  let seniorYield = seniorCurrent.minus(seniorFormer).times(BigInt.fromI32(365).div(BigInt.fromI32(days)))

  log.debug(
    'addYields {}: junior token price: {} days ago {}, today {}, yield {}; senior token price: {} days ago {}, today {}, yield {}; ',
    [
      days.toString(),
      days.toString(),
      juniorFormer.toString(),
      juniorCurrent.toString(),
      juniorYield.toString(),
      days.toString(),
      seniorFormer.toString(),
      seniorCurrent.toString(),
      seniorYield.toString(),
    ]
  )

  return {
    junior: juniorYield,
    senior: seniorYield,
  }
}
