import { Address, BigInt, BigDecimal, log } from '@graphprotocol/graph-ts'
import { CfgRewardRate } from '../../generated/CfgRewardRate/CfgRewardRate'
import {
  DailyInvestorTokenBalance,
  Pool,
  PoolAddresses,
  RewardBalance,
  RewardDayTotal,
  RewardByToken,
  RewardLink,
} from '../../generated/schema'
import { loadOrCreatePoolInvestors } from './TokenBalance'
import { rewardsAreClaimable } from './Day'
import { secondsInDay, cfgRewardRateAddress, cfgRewardRateDeploymentDate, fixed27 } from '../config'

// add current pool's value to today's system value
export function updateRewardDayTotal(date: BigInt, pool: Pool): RewardDayTotal {
  let rdt = loadOrCreateRewardDayTotal(date)
  rdt.todayValue = rdt.todayValue.plus(pool.assetValue).plus(pool.reserve)
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
    rewardDayTotal.aoRewardRate = BigDecimal.fromString('0')
    rewardDayTotal.todayReward = BigDecimal.fromString('0')
    rewardDayTotal.todayAOReward = BigDecimal.fromString('0')
    rewardDayTotal.toDateRewardAggregateValue = BigDecimal.fromString('0')
    rewardDayTotal.toDateAORewardAggregateValue = BigDecimal.fromString('0')
  }
  rewardDayTotal.save()
  return <RewardDayTotal>rewardDayTotal
}

export function loadOrCreateRewardBalance(address: string): RewardBalance {
  let rb = RewardBalance.load(address)
  if (rb == null) {
    rb = new RewardBalance(address)
    rb.links = []
    rb.linkableRewards = BigDecimal.fromString('0')
    rb.totalRewards = BigDecimal.fromString('0')
    rb.nonZeroBalanceSince = null
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
  log.info('calculateRewards: running for pool {}, on {}', [pool.id.toString(), date.toString()])

  let investorIds = loadOrCreatePoolInvestors(pool.id)
  let systemRewards = loadOrCreateRewardDayTotal(date)
  systemRewards = setRewardRate(date, systemRewards)

  let tokenAddresses = PoolAddresses.load(pool.id)
  let accounts = investorIds.accounts

  for (let i = 0; i < accounts.length; i++) {
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

    // if rewards are claimable, and an address is linked
    // add them to the most recently linked address
    if (rewardsAreClaimable(date, reward.nonZeroBalanceSince) && reward.links.length > 0) {
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
    log.info('calculateRewards: {} earned {} today', [account, r.toString()])
    reward.totalRewards = reward.totalRewards.plus(r)

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

function getInvestorRewardRate(date: BigInt, systemRewards: RewardDayTotal): BigDecimal {
  let firstRate = BigDecimal.fromString('0.0042')
  let secondRate = BigDecimal.fromString('0.0020')
  let thirdRate = BigDecimal.fromString('0.0010')

  if (date.gt(BigInt.fromI32(cfgRewardRateDeploymentDate))) {
    let cfgRewardRate = CfgRewardRate.bind(<Address>Address.fromHexString(cfgRewardRateAddress))
    let investorRewardRateOption = cfgRewardRate.try_investorRewardRate()

    log.info('trying to call CfgRewardRate contract at {}, reverted {}', [
      cfgRewardRateAddress.toString(),
      investorRewardRateOption.reverted ? 'true' : 'false',
    ])

    if (!investorRewardRateOption.reverted) {
      let investorRewardRate = BigDecimal.fromString(investorRewardRateOption.value.toString()).div(
        fixed27.toBigDecimal()
      )

      log.info('setting system rewards rate from CfgRewardRate contract rewardsToDate {}, rewardRate {}', [
        systemRewards.toDateRewardAggregateValue.toString(),
        investorRewardRate.toString(),
      ])
      return investorRewardRate
    }
  }

  if (date.le(BigInt.fromI32(1623801600))) {
    log.info('setting system rewards rate rewardsToDate {}, rewardRate {}', [
      systemRewards.toDateRewardAggregateValue.toString(),
      firstRate.toString(),
    ])
    return firstRate
  }

  if (date.le(BigInt.fromI32(1624924800))) {
    log.info('setting system rewards rate rewardsToDate {}, rewardRate {}', [
      systemRewards.toDateRewardAggregateValue.toString(),
      secondRate.toString(),
    ])
    return secondRate
  }

  log.info('setting system rewards rate rewardsToDate {}, rewardRate {}', [
    systemRewards.toDateRewardAggregateValue.toString(),
    thirdRate.toString(),
  ])
  return thirdRate
}

function setRewardRate(date: BigInt, systemRewards: RewardDayTotal): RewardDayTotal {
  let investorRewardRate = getInvestorRewardRate(date, systemRewards)

  systemRewards.rewardRate = investorRewardRate
  systemRewards.save()

  return systemRewards
}
