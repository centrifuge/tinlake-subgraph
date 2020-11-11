import { BigInt, ethereum, Address, dataSource } from '@graphprotocol/graph-ts'
import { Reserve } from '../../generated/Block/Reserve'
import { NavFeed } from '../../generated/Block/NavFeed'
import { Day, DailyPoolData } from '../../generated/schema'
import { poolMetas, PoolMeta } from '../poolMetas'
import { timestampToDate } from '../util/date'
import { loadOrCreatePool } from './Pool'
import { secondsInDay } from '../config'

export function createDailySnapshot(block: ethereum.Block): void {
  let date = timestampToDate(block.timestamp)
  let yesterdayTimeStamp = date.minus(BigInt.fromI32(secondsInDay))
  let yesterday = Day.load(yesterdayTimeStamp.toString())

  let relevantPoolMetas = poolMetas.filter((poolMeta) => poolMeta.networkId == dataSource.network())
  for (let i = 0; i < relevantPoolMetas.length; i++) {
    let poolMeta = relevantPoolMetas[i]

    let pool = loadOrCreatePool(poolMeta, block)
    if (pool == null) {
      continue
    }

    let dailyPoolData = createDailyPoolData(poolMeta, yesterday.id)

    let reserveContract = Reserve.bind(<Address>Address.fromHexString(poolMeta.reserve))
    let reserve = reserveContract.totalBalance()
    dailyPoolData.reserve = reserve

    let navFeedContract = NavFeed.bind(<Address>Address.fromHexString(poolMeta.nftFeed))
    let currentNav = navFeedContract.currentNAV()
    dailyPoolData.assetValue = currentNav

    dailyPoolData.totalDebt = pool.totalDebt
    dailyPoolData.seniorDebt = pool.seniorDebt
    dailyPoolData.currentJuniorRatio = pool.currentJuniorRatio
    dailyPoolData.save()

    addToDailyAggregate(<Day>yesterday, dailyPoolData)
  }
}

function createDailyPoolData(poolMeta: PoolMeta, yesterday: string): DailyPoolData {
  let dailyPoolData = new DailyPoolData(poolMeta.id.concat(yesterday))
  dailyPoolData.day = yesterday
  dailyPoolData.pool = poolMeta.id
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
