import { log, BigInt, ethereum, Address, dataSource } from '@graphprotocol/graph-ts'
// import { Reserve } from '../../generated/Block/Reserve'
// import { NavFeed } from '../../generated/Block/NavFeed'
import { PoolRegistry } from '../../generated/PoolRegistry/PoolRegistry'
import { Day, DailyPoolData } from '../../generated/schema'
import { timestampToDate } from '../util/date'
import { secondsInDay } from '../config'
import { Pool } from '../../generated/schema'
import { registryAddressMainnet, registryAddressKovan } from '../config'
import { mainnetPreloadedPools, kovanPreloadedPools } from '../preloadedPools'

let maxPoolCount = 1000

export function createDailySnapshot(block: ethereum.Block): void {
  let date = timestampToDate(block.timestamp)
  let yesterdayTimeStamp = date.minus(BigInt.fromI32(secondsInDay))
  let yesterday = Day.load(yesterdayTimeStamp.toString())

  // TODO reg: abstract into getPools()
  // TODO: filter by startBlock >= block.number
  let registryAddress = dataSource.network() == 'mainnet' ? registryAddressMainnet : registryAddressKovan
  let registry = PoolRegistry.bind(<Address>Address.fromHexString(registryAddress))

  log.debug('grabbing pools from registry {}, {}', [registryAddress.toString(), maxPoolCount.toString()])
  
  let poolIds: string[] = new Array<string>()
  // Skip pool 0 because that is the registry itself
  for (let i = 1; i < maxPoolCount; i++) {
    log.debug('getting pool {}', [i.toString()])
    let pool = registry.try_pools(BigInt.fromI32(i))

    if (pool.reverted) {
      log.debug('pool {} reverted', [i.toString()])
      break
    }
    log.debug('createDailySnapshot: found pool {}', [pool.value.value0.toString()])
    poolIds.push(pool.value.value0.toString())
  }

  // TODO reg: add preloaded pools
  let preloadedPools = dataSource.network() == 'mainnet' ? mainnetPreloadedPools : kovanPreloadedPools
  for (let i = 0; i < preloadedPools.length; i++) {
    if (preloadedPools[i].assessorStartBlock < block.number.toI32()) {
      log.debug('createDailySnapshot: adding preloaded pool {}', [preloadedPools[i].id])
      poolIds.push(preloadedPools[i].id)
    }
  }

  log.debug('createDailySnapshot: found pools', [])

  for (let i = 0; i < poolIds.length; i++) {
    let pool = Pool.load(poolIds[i])
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
