import { BigInt } from "@graphprotocol/graph-ts";
import { DailyPoolData } from "../generated/schema"
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
    dailyPoolData.save()
    return dailyPoolData
}
