import { log, BigInt, Address, ethereum, dataSource } from '@graphprotocol/graph-ts'
import { Assessor } from '../../generated/Block/Assessor'
import { NavFeed } from '../../generated/Block/NavFeed'
import { Reserve } from '../../generated/Block/Reserve'
import { Pool, PoolAddresses, Day, DailyPoolData } from '../../generated/schema'
import { ExecuteEpochCall } from '../../generated/templates/Coordinator/Coordinator'
import { seniorToJuniorRatio } from '../util/pool'
import { updateLoans } from '../domain/Loan'
import { getAllPools } from '../domain/PoolRegistry'
import { timestampToDate } from '../util/date'
import { secondsInDay } from '../config'
import { addToDailyAggregate } from '../domain/DailyPoolData'

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
  let currentNav = navFeedContract.currentNAV()
  pool.assetValue = currentNav

  let reserveContract = Reserve.bind(<Address>Address.fromHexString(addresses.reserve))
  let reserve = reserveContract.totalBalance()
  pool.reserve = reserve

  let juniorPrice = assessor.try_calcJuniorTokenPrice(currentNav, reserve)
  let seniorPrice = assessor.try_calcSeniorTokenPrice(currentNav, reserve)

  pool.seniorTokenPrice = seniorPrice.value
  pool.juniorTokenPrice = juniorPrice.value

  pool = calculate30DayYields(pool, block, today)
  
  // Check if senior tranche exists
  if (addresses.seniorTranche != '0x0000000000000000000000000000000000000000') {
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

export function calculate30DayYields(pool: Pool, block: ethereum.Block, today: Day): Pool {
  let date = timestampToDate(block.timestamp)
  let thirtyDaysAgoTimeStamp = date.minus(BigInt.fromI32(secondsInDay * 30))
  let thirtyDaysAgo = Day.load(thirtyDaysAgoTimeStamp.toString())

  // If this pool is less than 30 days ago, we assume the initial token price is 1.0
  let thirtyDaysAgoTokenPriceJunior = BigInt.fromI32(1).times(BigInt.fromI32(10).pow(18))

  if (thirtyDaysAgo == null) {
    return pool
  }

  let thirtyDaysAgoDailyPoolData = DailyPoolData.load(pool.id.concat(thirtyDaysAgo.id))
  let todayDailyPoolData = DailyPoolData.load(pool.id.concat(today.id))

  if (thirtyDaysAgoDailyPoolData == null || todayDailyPoolData == null) {
    return pool
  }

  // (1 + (token price 30 days ago - token price today))^12 - 1
  pool.thirtyDayJuniorYield = BigInt.fromI32(1)
    .times(BigInt.fromI32(10).pow(18))
    .plus(thirtyDaysAgoDailyPoolData.juniorTokenPrice.minus(todayDailyPoolData.juniorTokenPrice))
    .pow(BigInt.fromI32(12))
    .minus(BigInt.fromI32(1).times(BigInt.fromI32(10).pow(18)))

  pool.thirtyDaySeniorYield = BigInt.fromI32(1)
    .times(BigInt.fromI32(10).pow(18))
    .plus(thirtyDaysAgoDailyPoolData.seniorTokenPrice.minus(todayDailyPoolData.seniorTokenPrice))
    .pow(BigInt.fromI32(12))
    .minus(BigInt.fromI32(1).times(BigInt.fromI32(10).pow(18)))

  return pool
}