import { BigInt, BigDecimal, log, Address, ethereum } from '@graphprotocol/graph-ts'
import { CfgRewardRate } from '../../generated/Block/CfgRewardRate'
import { CfgSplitRewardRate } from '../../generated/Block/CfgSplitRewardRate'
import { Pool, PoolAddresses, RewardDayTotal, RewardLink, AORewardBalance } from '../../generated/schema'
import {
  secondsInDay,
  cfgRewardRateAddress,
  cfgRewardRateDeploymentDate,
  fixed27,
  cfgSplitRewardRateDeploymentDate,
  cfgSplitRewardRateAddressMainnet,
} from '../config'
import { loadOrCreateRewardDayTotal } from './Reward'

export function loadOrCreateAORewardBalance(address: string): AORewardBalance {
  let rb = AORewardBalance.load(address)
  if (!rb) {
    rb = new AORewardBalance(address)
    rb.links = []
    rb.linkableRewards = BigDecimal.fromString('0')
    rb.totalRewards = BigDecimal.fromString('0')
    rb.save()
  }
  return <AORewardBalance>rb
}

export function calculateAORewards(date: BigInt, pool: Pool): void {
  log.info('calculateAORewards: running for pool {}, on {}', [pool.id.toString(), date.toString()])

  let systemRewards = loadOrCreateRewardDayTotal(date)
  systemRewards = setAORewardRate(date, systemRewards)

  let tokenAddresses = PoolAddresses.load(pool.id)
  if (tokenAddresses) {
    let reward = loadOrCreateAORewardBalance(tokenAddresses.id)

    let r = pool.totalDebt.toBigDecimal().times(systemRewards.aoRewardRate)

    // if an address is linked add rewards to the most recently linked address
    if (reward.links.length > 0) {
      let arr = reward.links
      let lastLinked = RewardLink.load(arr[arr.length - 1])
      if (lastLinked) {
        lastLinked.rewardsAccumulated = lastLinked.rewardsAccumulated.plus(r)
        // write the linkable rewards
        lastLinked.rewardsAccumulated = lastLinked.rewardsAccumulated.plus(reward.linkableRewards)
        lastLinked.save()
      }

      // reset linkableRewards to 0
      reward.linkableRewards = BigDecimal.fromString('0')
    }
    // if no linked address is found, we track reward in linkableRewards
    else {
      reward.linkableRewards = reward.linkableRewards.plus(r)
    }

    // totalRewards are cumulative across linked addresses
    log.info('calculateAORewards: AO for pool {} earned {} today', [pool.id.toString(), r.toString()])
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
}

function getAORewardRate(date: BigInt, systemRewards: RewardDayTotal): BigDecimal {
  let firstRate = BigDecimal.fromString('0.0017')
  let secondRate = BigDecimal.fromString('0.0003')
  let thirdRate = BigDecimal.fromString('0.0002')

  if (date.gt(BigInt.fromI32(cfgRewardRateDeploymentDate))) {
    let aoRewardRateOption: ethereum.CallResult<BigInt>
    if (date.lt(BigInt.fromI32(cfgSplitRewardRateDeploymentDate))) {
      let cfgRewardRate = CfgRewardRate.bind(Address.fromString(cfgRewardRateAddress))
      aoRewardRateOption = cfgRewardRate.try_aoRewardRate()
    } else {
      let cfgRewardRate = CfgSplitRewardRate.bind(Address.fromString(cfgSplitRewardRateAddressMainnet))
      aoRewardRateOption = cfgRewardRate.try_aoRewardRate()
    }

    log.info('trying to call CfgRewardRate contract for AO at {}, reverted {}', [
      cfgRewardRateAddress.toString(),
      aoRewardRateOption.reverted ? 'true' : 'false',
    ])

    if (!aoRewardRateOption.reverted) {
      let aoRewardRate = BigDecimal.fromString(aoRewardRateOption.value.toString()).div(fixed27.toBigDecimal())

      log.info('setting AO system rewards rate from CfgRewardRate contract rewardsToDate {}, rewardRate {}', [
        systemRewards.toDateAORewardAggregateValue.toString(),
        aoRewardRate.toString(),
      ])
      return aoRewardRate
    }
  }
  if (date.le(BigInt.fromI32(1623715200))) {
    log.info('setting AO system rewards rate aoRewardsToDate {}, aoRewardRate {}', [
      systemRewards.toDateAORewardAggregateValue.toString(),
      firstRate.toString(),
    ])
    return firstRate
  }

  if (date.le(BigInt.fromI32(1624924800))) {
    log.info('setting AO system rewards rate aoRewardsToDate {}, aoRewardRate {}', [
      systemRewards.toDateAORewardAggregateValue.toString(),
      secondRate.toString(),
    ])
    return secondRate
  }

  log.info('setting AO system rewards rate aoRewardsToDate {}, aoRewardRate {}', [
    systemRewards.toDateAORewardAggregateValue.toString(),
    thirdRate.toString(),
  ])
  return thirdRate
}

function setAORewardRate(date: BigInt, systemRewards: RewardDayTotal): RewardDayTotal {
  let aoRewardRate = getAORewardRate(date, systemRewards)

  systemRewards.aoRewardRate = aoRewardRate
  systemRewards.save()

  return systemRewards
}
