import { BigInt } from "@graphprotocol/graph-ts";
import { secondsInDay } from "../config";

export function toBigInt(integer: i32): BigInt {
  return BigInt.fromI32(integer);
}

export function timestampToDate(timestamp: BigInt): BigInt {
  let daysSinceEpochStart: BigInt = timestamp / BigInt.fromI32(secondsInDay);
  return daysSinceEpochStart * BigInt.fromI32(secondsInDay);
}
