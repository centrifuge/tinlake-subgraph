import { Address, BigInt, BigDecimal, log } from '@graphprotocol/graph-ts'
import { CfgRewardRate } from '../../generated/CfgRewardRate/CfgRewardRate'
import { Pool, PoolAddresses, RewardDayTotal, RewardLink, AORewardBalance } from '../../generated/schema'
import { aoRewardsCeiling, cfgRewardRateAddress, fixed27, secondsInDay } from '../config'
import { loadOrCreateRewardDayTotal } from './Reward'

export function loadOrCreateAORewardBalance(address: string): AORewardBalance {
  let rb = AORewardBalance.load(address)
  if (rb == null) {
    rb = new AORewardBalance(address)
    rb.links = []
    rb.linkableRewards = BigDecimal.fromString('0')
    rb.totalRewards = BigDecimal.fromString('0')
    rb.save()
  }
  return <AORewardBalance>rb
}

export function calculateAORewards(date: BigInt, pool: Pool): void {
  log.debug('calculateAORewards: running for pool {}, on {}', [pool.id.toString(), date.toString()])

  let systemRewards = loadOrCreateRewardDayTotal(date)
  systemRewards = setAORewardRate(systemRewards)

  let tokenAddresses = PoolAddresses.load(pool.id)

  let reward = loadOrCreateAORewardBalance(tokenAddresses.id)

  let r = pool.totalDebt.toBigDecimal().times(systemRewards.aoRewardRate)

  // if an address is linked add rewards to the most recently linked address
  if (reward.links.length > 0) {
    let arr = reward.links
    let lastLinked = RewardLink.load(arr[arr.length - 1])
    lastLinked.rewardsAccumulated = lastLinked.rewardsAccumulated.plus(r)
    // write the linkable rewards
    lastLinked.rewardsAccumulated = lastLinked.rewardsAccumulated.plus(reward.linkableRewards)
    lastLinked.save()

    // reset linkableRewards to 0
    reward.linkableRewards = BigDecimal.fromString('0')
  }
  // if no linked address is found, we track reward in linkableRewards
  else {
    reward.linkableRewards = reward.linkableRewards.plus(r)
  }

  // totalRewards are cumulative across linked addresses
  log.debug('calculateAORewards: AO for pool {} earned {} today', [pool.id.toString(), r.toString()])
  reward.totalRewards = reward.totalRewards.plus(r)
  reward.save()

  // add AO's today reward to today's rewards obj
  systemRewards.todayAOReward = systemRewards.todayAOReward.plus(r)

  // add yesterday's aggregate value to today's toDate aggregate
  let prevDayRewardId = date.minus(BigInt.fromI32(secondsInDay))
  let prevDayRewards = loadOrCreateRewardDayTotal(prevDayRewardId)
  systemRewards.toDateAORewardAggregateValue = systemRewards.todayAOReward.plus(
    prevDayRewards.toDateAORewardAggregateValue
  )

  systemRewards.save()
}

function getAORewardRate(systemRewards: RewardDayTotal): BigDecimal {
  let defaultRewardRateBelowLimit = BigDecimal.fromString('0.0017')
  let defaultRewardRateAboveLimit = BigDecimal.fromString('0.0003')

  let isBelowLimit = systemRewards.toDateRewardAggregateValue.lt(BigDecimal.fromString(aoRewardsCeiling))

  if (isBelowLimit) {
    log.debug('isBelowLimit is true for AO rewards, defaulting to {}', [defaultRewardRateBelowLimit.toString()])
    return defaultRewardRateBelowLimit
  }

  log.debug('setting AO system rewards rate default, aoRewardRate {}', [defaultRewardRateAboveLimit.toString()])
  return defaultRewardRateAboveLimit
}

function setAORewardRate(systemRewards: RewardDayTotal): RewardDayTotal {
  let aoRewardRate = getAORewardRate(systemRewards)

  systemRewards.aoRewardRate = aoRewardRate
  systemRewards.save()

  return systemRewards
}
