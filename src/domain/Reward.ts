import { log, BigInt, BigDecimal } from '@graphprotocol/graph-ts'
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
    rb.pendingRewards = BigDecimal.fromString('0')
    rb.claimableRewards = BigDecimal.fromString('0')
    rb.totalRewards = BigDecimal.fromString('0')
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
    // but they'll have one entity tracking rewardsBalance across system
    let reward = loadOrCreateRewardBalance(ditb.account)
    let tokenValues = ditb.seniorTokenValue.plus(ditb.juniorTokenValue).toBigDecimal()
    let balance = tokenValues.times(todayRewards.rewardRate)

    log.debug('big decimal balance:  {}', [balance.toString()])

    reward.pendingRewards = reward.pendingRewards.plus(balance)

    if(sixtyDays(date, ditb.nonZeroBalanceSince)){
      log.debug('transfer pending rewards to claimable:  {}', [date.toString()])
      reward.claimableRewards = reward.pendingRewards
      // reset pending rewards
      reward.pendingRewards = BigDecimal.fromString('0')
    }
    reward.totalRewards = reward.pendingRewards.plus(reward.claimableRewards)
    reward.save()
  }
}
