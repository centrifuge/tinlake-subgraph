import { BigInt, ethereum } from '@graphprotocol/graph-ts'
import { Day } from '../../generated/schema'
import { timestampToDate } from '../util/date'

export function createDay(dateString: string): Day {
  let day = new Day(dateString)
  day.reserve = BigInt.fromI32(0)
  day.totalDebt = BigInt.fromI32(0)
  day.assetValue = BigInt.fromI32(0)
  day.seniorDebt = BigInt.fromI32(0)
  day.save()
  return day
}

export function isNewDay(block: ethereum.Block): boolean {
  let date = timestampToDate(block.timestamp)
  let today = Day.load(date.toString())

  if (today == null) {
    createDay(date.toString())
    return true
  } else return false
}
