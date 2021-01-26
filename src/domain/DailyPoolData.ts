import { log, BigInt, ethereum } from '@graphprotocol/graph-ts'
import { Day, DailyPoolData, Account } from '../../generated/schema'
import { timestampToDate } from '../util/date'
import { secondsInDay } from '../config'
import { Pool, PoolAddresses } from '../../generated/schema'
import { getAllPools } from './PoolRegistry'
import { loadOrCreateToken } from './Token'
import { createDailyTokenBalances } from './TokenBalance'
import { calculateRewards, updateRewardDayTotal, loadOrCreateRewardBalance } from './Reward'
import { createAccount, loadOrCreateGlobalAccounts } from './Account'

export function createDailySnapshot(block: ethereum.Block): void {
  let date = timestampToDate(block.timestamp)
  log.debug('createDailySnapshot: {}', [date.toString()])

  let yesterdayTimeStamp = date.minus(BigInt.fromI32(secondsInDay))
  let yesterday = Day.load(yesterdayTimeStamp.toString())

  let pools = getAllPools()
  for (let i = 0; i < pools.length; i++) {
    let pool = Pool.load(pools[i]) as Pool
    let addresses = PoolAddresses.load(pool.id)
    log.debug('createDailySnapshot: loaded pool {}', [pool.shortName])

    let dailyPoolData = createDailyPoolData(pool.id, yesterday.id)
    setDailyPoolValues(pool, dailyPoolData)

    let juniorToken = loadOrCreateToken(addresses.juniorToken)
    createDailyTokenBalances(juniorToken, pool, yesterdayTimeStamp)

    let seniorToken = loadOrCreateToken(addresses.seniorToken)
    createDailyTokenBalances(seniorToken, pool, yesterdayTimeStamp)
  }

  updateSystemWideNonZeroBalances(yesterdayTimeStamp)

  // another pool loop to now update rewards
  for (let i = 0; i < pools.length; i++) {
    let pool = Pool.load(pools[i]) as Pool
    updateRewardDayTotal(yesterdayTimeStamp, pool)
    calculateRewards(yesterdayTimeStamp, pool)
  }
  resetActiveInvestments()
}

export function createDailyPoolData(poolId: string, yesterday: string): DailyPoolData {
  let dailyPoolData = new DailyPoolData(poolId.concat(yesterday))
  dailyPoolData.day = yesterday
  dailyPoolData.pool = poolId
  dailyPoolData.reserve = BigInt.fromI32(0)
  dailyPoolData.totalDebt = BigInt.fromI32(0)
  dailyPoolData.assetValue = BigInt.fromI32(0)
  dailyPoolData.seniorDebt = BigInt.fromI32(0)
  dailyPoolData.currentJuniorRatio = BigInt.fromI32(0)
  dailyPoolData.seniorTokenPrice = BigInt.fromI32(0)
  dailyPoolData.juniorTokenPrice = BigInt.fromI32(0)
  dailyPoolData.save()
  return dailyPoolData
}

// adds values from all active pools to the current day entity, an aggregate sum
export function addToDailyAggregate(day: Day, pool: Pool): void {
  day.reserve = day.reserve.plus(<BigInt>pool.reserve)
  day.totalDebt = day.totalDebt.plus(<BigInt>pool.totalDebt)
  day.assetValue = day.assetValue.plus(<BigInt>pool.assetValue)
  day.seniorDebt = day.seniorDebt.plus(<BigInt>pool.seniorDebt)
  day.save()
}

// sets pool specific current day's values from pool
export function setDailyPoolValues(pool: Pool, dailyPoolData: DailyPoolData): void {
  dailyPoolData.reserve = <BigInt>pool.reserve
  dailyPoolData.assetValue = <BigInt>pool.assetValue
  dailyPoolData.totalDebt = <BigInt>pool.totalDebt
  dailyPoolData.seniorDebt = <BigInt>pool.seniorDebt
  dailyPoolData.currentJuniorRatio = <BigInt>pool.currentJuniorRatio
  dailyPoolData.juniorTokenPrice = <BigInt>pool.juniorTokenPrice
  dailyPoolData.seniorTokenPrice = <BigInt>pool.seniorTokenPrice
  dailyPoolData.save()
}

// if an investor does not have an active investment
// then reset their nonZeroBalanceSince (nzbs) reward accumulation date
function updateSystemWideNonZeroBalances(date: BigInt): void {
  let accounts = loadOrCreateGlobalAccounts('1')
  for (let i = 0; i < accounts.accounts.length; i++) {
    let investors = accounts.accounts
    let address = investors[i]

    let account = Account.load(address)
    if (account == null) {
      account = createAccount(address)
    }
    let accountRewardBalance = loadOrCreateRewardBalance(address)

    // if the account does not have an active investment
    // then reset their nzbs.
    if (!account.rewardCalcBitFlip) {
      accountRewardBalance.nonZeroBalanceSince = null
      accountRewardBalance.claimable = false
    }

    // if they an active investment and the nzbs exists, keep it as it is
    else {
      if (accountRewardBalance.nonZeroBalanceSince == null) {
        // if they have an active investment and the nzbs is null
        // then set the nzbS to yesterdayTimestamp
        accountRewardBalance.nonZeroBalanceSince = date
      }
    }
    accountRewardBalance.save()
  }
}

function resetActiveInvestments(): void {
  let accounts = loadOrCreateGlobalAccounts('1')
  for (let i = 0; i < accounts.accounts.length; i++) {
    let investors = accounts.accounts
    let address = investors[i]

    let account = Account.load(address)
    if (account == null) {
      account = createAccount(address)
    }
    account.rewardCalcBitFlip = false
    account.save()
  }
}
