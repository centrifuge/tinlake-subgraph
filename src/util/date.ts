import { BigInt, ethereum } from "@graphprotocol/graph-ts";
import { Day } from "../../generated/schema";
import { secondsInDay } from "../config";

export function createDay(dateString: string): Day {
  let day = new Day(dateString);
  day.reserve = BigInt.fromI32(0);
  day.totalDebt = BigInt.fromI32(0);
  day.assetValue = BigInt.fromI32(0);
  day.seniorDebt = BigInt.fromI32(0);
  day.save();
  return day;
}

export function toBigInt(integer: i32): BigInt {
  return BigInt.fromI32(integer);
}

export function timestampToDate(timestamp: BigInt): BigInt {
  let daysSinceEpochStart: BigInt = timestamp / BigInt.fromI32(secondsInDay);
  return daysSinceEpochStart * BigInt.fromI32(secondsInDay);
}

export function isNewDay(block: ethereum.Block): boolean {
  let date = timestampToDate(block.timestamp);
  let today = Day.load(date.toString());

  if (today == null) {
    createDay(date.toString());
    return true;
  } else return false;
}