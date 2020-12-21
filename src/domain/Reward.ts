import { BigInt, BigDecimal } from '@graphprotocol/graph-ts'
import {
  DailyInvestorTokenBalance,
  Pool,
  PoolAddresses,
  RewardBalance,
  RewardDayTotal,
  RewardByToken,
} from '../../generated/schema'
import { loadOrCreatePoolInvestors } from './TokenBalance'
import { rewardsAreEligible } from './Day'
import { secondsInDay, tierOneRewards, zeroAddress } from '../config'
import { loadOrCreateRewardClaim } from './Claim'

// add current pool's value to today's system value
export function updateRewardDayTotal(date: BigInt, pool: Pool): RewardDayTotal {
  let rdt = loadOrCreateRewardDayTotal(date)
  rdt.todayValue = rdt.todayValue.plus(pool.assetValue)
  let prevDayId = date.minus(BigInt.fromI32(secondsInDay))
  let prevDayRewardTotal = loadOrCreateRewardDayTotal(prevDayId)
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
    rewardDayTotal.rewardRate = BigDecimal.fromString('0')
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
    let rc = loadOrCreateRewardClaim(address, zeroAddress)
    rb.claims = [rc.id]
    rb.eligible = false
    rb.claimableRewards = BigDecimal.fromString('0')
    rb.previousRewards = BigDecimal.fromString('0')
    rb.totalRewards = BigDecimal.fromString('0')
    rb.nonZeroBalanceSince = BigInt.fromI32(0)
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

function updateInvestorRewardsByToken(
  addresses: PoolAddresses,
  ditb: DailyInvestorTokenBalance,
  rate: BigDecimal
): void {
  // add an entity per token that they have invested in
  if (ditb.seniorTokenValue.gt(BigInt.fromI32(0))) {
    let rbt = loadOrCreateRewardByToken(ditb.account, addresses.seniorToken)
    let val = ditb.seniorTokenValue.toBigDecimal().times(rate)
    rbt.rewards = rbt.rewards.plus(val)
    rbt.save()
  }
  if (ditb.juniorTokenValue.gt(BigInt.fromI32(0))) {
    let rbt = loadOrCreateRewardByToken(ditb.account, addresses.juniorToken)
    let val = ditb.juniorTokenValue.toBigDecimal().times(rate)
    rbt.rewards = rbt.rewards.plus(val)
    rbt.save()
  }
}

export function calculateRewards(date: BigInt, pool: Pool): void {
  let investorIds = loadOrCreatePoolInvestors(pool.id)
  let systemRewards = loadOrCreateRewardDayTotal(date)
  let tokenAddresses = PoolAddresses.load(pool.id)
  setRewardRate(systemRewards)

  for (let i = 0; i < investorIds.accounts.length; i++) {
    let accounts = investorIds.accounts
    let account = accounts[i]
    let ditb = DailyInvestorTokenBalance.load(account.concat(pool.id).concat(date.toString()))
    let reward = loadOrCreateRewardBalance(ditb.account)

    updateInvestorRewardsByToken(
      <PoolAddresses>tokenAddresses,
      <DailyInvestorTokenBalance>ditb,
      systemRewards.rewardRate
    )

    let tokenValues = ditb.seniorTokenValue.plus(ditb.juniorTokenValue).toBigDecimal()
    let r = tokenValues.times(systemRewards.rewardRate)
    // add token values x rate to user rewards
    reward.claimableRewards = reward.claimableRewards.plus(r)

    if (rewardsAreEligible(date, reward.nonZeroBalanceSince)) {
      reward.eligible = true
    }
    reward.totalRewards = reward.previousRewards.plus(reward.claimableRewards)

    // add user's today reward to today's rewards obj
    systemRewards.todayReward = systemRewards.todayReward.plus(r)
    systemRewards.save()
    reward.save()
  }
  // add yesterday's aggregate value to today's toDate aggregate
  let prevDayRewardId = date.minus(BigInt.fromI32(secondsInDay))
  let prevDayRewards = loadOrCreateRewardDayTotal(prevDayRewardId)
  systemRewards.toDateRewardAggregateValue = systemRewards.todayReward.plus(prevDayRewards.toDateRewardAggregateValue)
  systemRewards.save()
}

function setRewardRate(systemRewards: RewardDayTotal): void {
  if (systemRewards.toDateRewardAggregateValue.lt(BigDecimal.fromString(tierOneRewards))) {
    systemRewards.rewardRate = BigDecimal.fromString('0.0042')
    systemRewards.save()
  }
}
