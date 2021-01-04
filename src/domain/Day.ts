import { BigInt, dataSource, ethereum } from '@graphprotocol/graph-ts'
import { Day } from '../../generated/schema'
import { timestampToDate } from '../util/date'
import { secondsInDay, secondsInSixtyDays } from '../config'

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
// if kovan, we want to make rewards eligible after 1 day
export function rewardsAreEligible(today: BigInt, nonZeroSince: BigInt | null): boolean {
  return nonZeroSince != null && dataSource.network() == 'mainnet'
    ? today.minus(<BigInt>nonZeroSince).ge(BigInt.fromI32(secondsInSixtyDays))
    : today.minus(<BigInt>nonZeroSince).ge(BigInt.fromI32(secondsInDay))
}
