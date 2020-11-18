import { BigInt } from '@graphprotocol/graph-ts'
import { secondsInDay } from '../config'

export function timestampToDate(timestamp: BigInt): BigInt {
  let daysSinceEpochStart: BigInt = timestamp.div(BigInt.fromI32(secondsInDay))
  return daysSinceEpochStart.times(BigInt.fromI32(secondsInDay))
}
