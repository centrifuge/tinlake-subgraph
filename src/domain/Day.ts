import { BigInt, ethereum } from '@graphprotocol/graph-ts'
import { Day } from '../../generated/schema'
import { timestampToDate } from '../util/date'
import { secondsInSixtyDays } from '../config'

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

export function getToday(block: ethereum.Block): Day {
  let date = timestampToDate(block.timestamp)
  return <Day>Day.load(date.toString())
}

// if the difference between days since nonzerobalance
// and today's timestamp are greater than or equal to sixty days in seconds
export function haveSixtyDaysPassed(today: BigInt, nonZeroSince: BigInt): boolean {
  return nonZeroSince.minus(BigInt.fromI32(secondsInSixtyDays)) >= today
}
