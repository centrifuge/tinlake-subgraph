import { log, BigInt, BigDecimal } from '@graphprotocol/graph-ts'
import {
  RewardDailyInvestorTokenBalance,
  Pool,
  PoolAddresses,
  RewardBalance,
  RewardDayTotal,
  RewardByToken,
} from '../../generated/schema'
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

export function loadOrCreateRewardByToken(account: string, token: string): RewardByToken {
  let id = account.concat(token)
  let rbt = RewardByToken.load(id)
  if (rbt == null) {
    rbt = new RewardByToken(id)
    rbt.account = account
    rbt.token = token
    rbt.rewards = BigDecimal.fromString('0')
    rbt.save()
  }

  return <RewardByToken>rbt
}

// query RewardByToken where account = current account
function updateInvestorRewardsByToken(
  addresses: PoolAddresses,
  ditb: RewardDailyInvestorTokenBalance,
  rate: BigDecimal
): void {
  // and an entity per token that they have invested in
  if (ditb.seniorTokenValue.gt(BigInt.fromI32(0))) {
    let rbt = loadOrCreateRewardByToken(ditb.account, addresses.seniorToken)
    rbt.rewards = rbt.rewards.plus(ditb.seniorTokenValue.toBigDecimal().times(rate))
    rbt.save()
  }
  if (ditb.juniorTokenValue.gt(BigInt.fromI32(0))) {
    let rbt = loadOrCreateRewardByToken(ditb.account, addresses.juniorToken)
    rbt.rewards = rbt.rewards.plus(ditb.juniorTokenValue.toBigDecimal().times(rate))
    rbt.save()
  }
}

export function calculateRewards(date: BigInt, pool: Pool): void {
  let ids = loadOrCreateDailyInvestorTokenBalanceIds(pool.id)
  let todayRewards = loadOrCreateRewardDayTotal(date)
  checkRewardRate(todayRewards)

  let addresses = PoolAddresses.load(pool.id)

  for (let i = 0; i < ids.rewardIds.length; i++) {
    let rewardIdentifiers = ids.rewardIds
    let id = rewardIdentifiers[i]
    // the ditb are by pool so an investor can have multiple
    let ditb = RewardDailyInvestorTokenBalance.load(id)
    // but they'll have one entity tracking rewardsBalance across system
    let reward = loadOrCreateRewardBalance(ditb.account)

    updateInvestorRewardsByToken(
      <PoolAddresses>addresses,
      <RewardDailyInvestorTokenBalance>ditb,
      todayRewards.rewardRate
    )

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
  if (checker.toDateRewardAggregateValue.gt(BigDecimal.fromString(tierOneRewards))) {
    log.debug('pending rewards > 1 MILL:  {}', [checker.toDateRewardAggregateValue.toString()])

    // todo: update this with correct value
    checker.rewardRate = BigDecimal.fromString('0')
    checker.save()
  }
}
