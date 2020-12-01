import { log, BigInt } from '@graphprotocol/graph-ts'
import {
  RewardDailyInvestorTokenBalance,
  Pool,
  RewardBalance,
} from '../../generated/schema'
import { 
  loadOrCreateDailyInvestorTokenBalanceIds,
  loadOrCreateRewardDayTotal } from './TokenBalance'
import {
  sixtyDays
} from './Day'

export function loadOrCreateRewardBalance(address: string) : RewardBalance {
  let rb = RewardBalance.load(address)
  if(rb == null) {
    rb = new RewardBalance(address)
    rb.claims = []
    rb.pendingRewards = BigInt.fromI32(0)
    rb.claimableRewards = BigInt.fromI32(0)
    rb.totalRewards = BigInt.fromI32(0)
    rb.save()
  }
  return <RewardBalance>rb
}

export function calculateRewards (date: BigInt, pool: Pool) : void {
  let ids = loadOrCreateDailyInvestorTokenBalanceIds(pool.id)
  let todayRewards = loadOrCreateRewardDayTotal(date)

  for(let i = 0; i< ids.rewardIds.length; i++) {
    let rewardIdentifiers = ids.rewardIds
    let id = rewardIdentifiers[i]
    // the ditbs are by pool so an investor can have multiple
    let ditb = RewardDailyInvestorTokenBalance.load(id)

    let reward = loadOrCreateRewardBalance(ditb.account)
    let tokenValues = ditb.seniorTokenValue.plus(ditb.juniorTokenValue)
    let balance = tokenValues.times(todayRewards.rewardRate)

    reward.pendingRewards = reward.pendingRewards.plus(balance)
    if(sixtyDays(date, ditb.nonZeroBalanceSince)){
      log.debug('transfer pending rewards to claimable:  {}', [date.toString()])
      reward.claimableRewards = reward.claimableRewards.plus(reward.pendingRewards)
      // reset pending rewards
      reward.pendingRewards = BigInt.fromI32(0)
    }
    reward.totalRewards = reward.totalRewards.plus(reward.pendingRewards).plus(reward.claimableRewards)
    reward.save()
  }
}
