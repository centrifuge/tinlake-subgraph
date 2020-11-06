import { BigInt } from "@graphprotocol/graph-ts";
import { Day } from "../generated/schema"

const secondsInDay = 86400

export function createDay(dateString: string): Day {
    let day = new Day(dateString)
    day.save()
    return day;
}

export function toBigInt(integer: i32): BigInt {
    return BigInt.fromI32(integer)
}

export function timestampToDate(timestamp: BigInt): BigInt {
    let daysSinceEpochStart: BigInt = timestamp / BigInt.fromI32(secondsInDay);
    return daysSinceEpochStart * BigInt.fromI32(secondsInDay);
}