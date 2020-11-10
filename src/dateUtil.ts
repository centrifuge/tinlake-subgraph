import { BigInt, EthereumBlock } from "@graphprotocol/graph-ts";
import { Day } from "../generated/schema"

const secondsInDay = 86400

export function createDay(dateString: string): Day {
    let day = new Day(dateString)
    day.reserve = BigInt.fromI32(0)
    day.totalDebt = BigInt.fromI32(0)
    day.assetValue = BigInt.fromI32(0)
    day.seniorDebt = BigInt.fromI32(0)
    day.save()
    return day;
}

export function timestampToDate(timestamp: BigInt): BigInt {
    let daysSinceEpochStart: BigInt = timestamp / BigInt.fromI32(secondsInDay);
    return daysSinceEpochStart * BigInt.fromI32(secondsInDay);
}

export function getToday(block: EthereumBlock): Day {
    let date = timestampToDate(block.timestamp)
    return <Day>Day.load(date.toString())
}