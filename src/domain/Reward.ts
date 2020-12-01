import { log, BigInt, BigDecimal } from '@graphprotocol/graph-ts'
import { RewardDailyInvestorTokenBalance, Pool, RewardBalance, RewardDayTotal } from '../../generated/schema'
import { loadOrCreateDailyInvestorTokenBalanceIds } from './TokenBalance'
import { sixtyDays } from './Day'
import { secondsInDay, tierOneRewards } from '../config'

export function updateRewardDayTotal(date: BigInt, pool: Pool): RewardDayTotal {
  let rdt = loadOrCreateRewardDayTotal(date)
  // add current pool to today's value
  rdt.todayValue = rdt.todayValue.plus(pool.assetValue)
  let prevDayId = date.minus(BigInt.fromI32(secondsInDay))
  let prevDayRewardTotal = loadOrCreateRewardDayTotal(prevDayId)
  // we really only want to run this at the end of all the pools..
  // but it will still work this way..
  rdt.toDateAggregateValue = rdt.todayValue.plus(prevDayRewardTotal.toDateAggregateValue)
  rdt.save()
  return rdt
}

export function loadOrCreateRewardDayTotal(date: BigInt): RewardDayTotal {
  let rewardDayTotal = RewardDayTotal.load(date.toString())
  if (rewardDayTotal == null) {
    rewardDayTotal = new RewardDayTotal(date.toString())
    rewardDayTotal.todayValue = BigInt.fromI32(0)
    rewardDayTotal.toDateAggregateValue = BigInt.fromI32(0)
    // 0.0042 RAD/DAI up to 1M RAD
    rewardDayTotal.rewardRate = BigDecimal.fromString('0.0042')
    rewardDayTotal.todayReward = BigDecimal.fromString('0')
    rewardDayTotal.toDateRewardAggregateValue = BigDecimal.fromString('0')
  }
  rewardDayTotal.save()
  return <RewardDayTotal>rewardDayTotal
}

export function loadOrCreateRewardBalance(address: string): RewardBalance {
  let rb = RewardBalance.load(address)
  if (rb == null) {
    rb = new RewardBalance(address)
    rb.claims = []
    rb.pendingRewards = BigDecimal.fromString('0')
    rb.claimableRewards = BigDecimal.fromString('0')
    rb.totalRewards = BigDecimal.fromString('0')
    rb.save()
  }
  return <RewardBalance>rb
}

export function calculateRewards(date: BigInt, pool: Pool): void {
  let ids = loadOrCreateDailyInvestorTokenBalanceIds(pool.id)
  let todayRewards = loadOrCreateRewardDayTotal(date)
  checkRewardRate(todayRewards)

  for (let i = 0; i < ids.rewardIds.length; i++) {
    let rewardIdentifiers = ids.rewardIds
    let id = rewardIdentifiers[i]
    // the ditbs are by pool so an investor can have multiple
    let ditb = RewardDailyInvestorTokenBalance.load(id)
    // but they'll have one entity tracking rewardsBalance across system
    let reward = loadOrCreateRewardBalance(ditb.account)
    let tokenValues = ditb.seniorTokenValue.plus(ditb.juniorTokenValue).toBigDecimal()
    let balance = tokenValues.times(todayRewards.rewardRate)

    log.debug('big decimal balance:  {}', [balance.toString()])

    reward.pendingRewards = reward.pendingRewards.plus(balance)

    if (sixtyDays(date, ditb.nonZeroBalanceSince)) {
      log.debug('transfer pending rewards to claimable:  {}', [date.toString()])
      reward.claimableRewards = reward.pendingRewards
      // reset pending rewards
      reward.pendingRewards = BigDecimal.fromString('0')
    }
    reward.totalRewards = reward.pendingRewards.plus(reward.claimableRewards)

    // add this user's pending rewards to today's rewards obj
    todayRewards.todayReward = todayRewards.todayReward.plus(reward.pendingRewards)
    todayRewards.save()
    reward.save()
  }
  // need to add yesterday's day aggregate value to toDate aggregate
  let prevDayRewardId = date.minus(BigInt.fromI32(secondsInDay))
  let prevDayRewards = loadOrCreateRewardDayTotal(prevDayRewardId)
  todayRewards.toDateRewardAggregateValue = todayRewards.todayReward.plus(prevDayRewards.toDateRewardAggregateValue)
  todayRewards.save()
}

function checkRewardRate(checker: RewardDayTotal): void {
  let testMilly = BigDecimal.fromString(tierOneRewards)
  log.debug('pending rewards > 1 MILLY:  {}', [testMilly.toString()])

  if (checker.toDateRewardAggregateValue.gt(testMilly)) {
    log.debug('pending rewards > 1 MILL:  {}', [checker.toDateRewardAggregateValue.toString()])

    // todo: update this with correct value
    checker.rewardRate = BigDecimal.fromString('0')
    checker.save()
  }
}
