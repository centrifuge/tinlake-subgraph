import { BigInt } from "@graphprotocol/graph-ts";
import { DailyPoolData, Day, Pool } from "../generated/schema"
import { PoolMeta } from "../src/poolMetas"

export function createDailyPoolData(poolMeta: PoolMeta, yesterday: string): DailyPoolData {
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

export function addToDailyAggregate(day: Day, pool: Pool): void {
    day.reserve = day.reserve.plus(<BigInt>pool.reserve)
    day.totalDebt = day.totalDebt.plus(<BigInt>pool.totalDebt)
    day.assetValue = day.assetValue.plus(<BigInt>pool.assetValue)
    day.seniorDebt = day.seniorDebt.plus(<BigInt>pool.seniorDebt)
    day.save()
}