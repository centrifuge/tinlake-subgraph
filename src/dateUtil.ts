import { BigInt } from "@graphprotocol/graph-ts";
import { Day } from "../generated/schema"

export function createDay(dateString: string): Day {
    let day = new Day(dateString)
    day.save()
    return day;
}

export function toBigInt(integer: i32): BigInt {
    return BigInt.fromI32(integer)
}

export function timestampToDate(timestamp: BigInt): BigInt {
    let daysSinceEpochStart: BigInt = timestamp / BigInt.fromI32(86400);
    return daysSinceEpochStart * BigInt.fromI32(86400);
}