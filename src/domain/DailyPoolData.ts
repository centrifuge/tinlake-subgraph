import { log, BigInt, ethereum } from '@graphprotocol/graph-ts'
// import { Reserve } from '../../generated/Block/Reserve'
// import { NavFeed } from '../../generated/Block/NavFeed'
import { Day, DailyPoolData } from '../../generated/schema'
import { timestampToDate } from '../util/date'
import { secondsInDay } from '../config'
import { Pool } from '../../generated/schema'
import { getAllPools } from './PoolRegistry'

export function createDailySnapshot(block: ethereum.Block): void {
  let date = timestampToDate(block.timestamp)
  let yesterdayTimeStamp = date.minus(BigInt.fromI32(secondsInDay))
  let yesterday = Day.load(yesterdayTimeStamp.toString())

  let pools = getAllPools()
  for (let i = 0; i < pools.length; i++) {
    let pool = Pool.load(pools[i])
    log.debug('createDailySnapshot: loaded pool {}', [pool.shortName])

    let dailyPoolData = createDailyPoolData(pool.id, yesterday.id)

    // TODO reg: re add this (we need to get the reserve and feed addresses from IPFS)
    // let reserveContract = Reserve.bind(<Address>Address.fromHexString(poolMeta.reserve))
    // let reserve = reserveContract.totalBalance()
    // dailyPoolData.reserve = reserve
    // let navFeedContract = NavFeed.bind(<Address>Address.fromHexString(poolMeta.nftFeed))
    // let currentNav = navFeedContract.currentNAV()
    // dailyPoolData.assetValue = currentNav

    dailyPoolData.totalDebt = pool.totalDebt
    dailyPoolData.seniorDebt = pool.seniorDebt
    dailyPoolData.currentJuniorRatio = pool.currentJuniorRatio
    dailyPoolData.save()

    addToDailyAggregate(<Day>yesterday, dailyPoolData)
  }
}

function createDailyPoolData(poolId: string, yesterday: string): DailyPoolData {
  log.error('createDailyPoolData, poolMeta.id: {}, yesterday: {}', [poolId, yesterday])
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

function addToDailyAggregate(day: Day, dailyPoolData: DailyPoolData): void {
  day.reserve = day.reserve.plus(<BigInt>dailyPoolData.reserve)
  day.totalDebt = day.totalDebt.plus(<BigInt>dailyPoolData.totalDebt)
  day.assetValue = day.assetValue.plus(<BigInt>dailyPoolData.assetValue)
  day.seniorDebt = day.seniorDebt.plus(<BigInt>dailyPoolData.seniorDebt)
  day.save()
}
