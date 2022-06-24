import { cfgSplitRewardRateDeploymentDate, cfgSplitRewardRateAddressMainnet } from './../config'
import { Address, BigInt, BigDecimal, log, ethereum } from '@graphprotocol/graph-ts'
import { CfgRewardRate } from '../../generated/Block/CfgRewardRate'
import { CfgSplitRewardRate } from '../../generated/Block/CfgSplitRewardRate'
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
  if (!rewardDayTotal) {
    rewardDayTotal = new RewardDayTotal(date.toString())
    rewardDayTotal.todayValue = BigInt.fromI32(0)
    rewardDayTotal.toDateAggregateValue = BigInt.fromI32(0)
    rewardDayTotal.tinRewardRate = BigDecimal.fromString('0')
    rewardDayTotal.dropRewardRate = BigDecimal.fromString('0')
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
  if (!rb) {
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
  if (!rbt) {
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
  dropRate: BigDecimal,
  tinRate: BigDecimal
): void {
  // add an entity per token that they have invested in
  if (ditb.seniorTokenValue.gt(BigInt.fromI32(0))) {
    let rbt = loadOrCreateRewardByToken(ditb.account, addresses.seniorToken)
    let val = ditb.seniorTokenValue.toBigDecimal().times(dropRate)
    rbt.rewards = rbt.rewards.plus(val)
    rbt.save()
  }
  if (ditb.juniorTokenValue.gt(BigInt.fromI32(0))) {
    let rbt = loadOrCreateRewardByToken(ditb.account, addresses.juniorToken)
    let val = ditb.juniorTokenValue.toBigDecimal().times(tinRate)
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
    if (!!ditb) {
      let reward = loadOrCreateRewardBalance(ditb.account)

      updateInvestorRewardsByToken(
        <PoolAddresses>tokenAddresses,
        <DailyInvestorTokenBalance>ditb,
        systemRewards.dropRewardRate,
        systemRewards.tinRewardRate
      )

      let seniorRewards = ditb.seniorTokenValue.toBigDecimal().times(systemRewards.dropRewardRate)
      let juniorRewards = ditb.juniorTokenValue.toBigDecimal().times(systemRewards.tinRewardRate)
      let r = seniorRewards.plus(juniorRewards)

      // if rewards are claimable, and an address is linked
      // add them to the most recently linked address
      if (rewardsAreClaimable(date, reward.nonZeroBalanceSince) && reward.links.length > 0) {
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
      log.info('calculateRewards: {} earned {} today', [account, r.toString()])
      reward.totalRewards = reward.totalRewards.plus(r)

      // add user's today reward to today's rewards obj
      systemRewards.todayReward = systemRewards.todayReward.plus(r)
      systemRewards.save()
      reward.save()
    }
  }
  // add yesterday's aggregate value to today's toDate aggregate
  let prevDayRewardId = date.minus(BigInt.fromI32(secondsInDay))
  let prevDayRewards = loadOrCreateRewardDayTotal(prevDayRewardId)
  systemRewards.toDateRewardAggregateValue = systemRewards.todayReward.plus(prevDayRewards.toDateRewardAggregateValue)
  systemRewards.save()
}

function getInvestorDropRewardRate(date: BigInt, systemRewards: RewardDayTotal): BigDecimal {
  let firstRate = BigDecimal.fromString('0.0042')
  let secondRate = BigDecimal.fromString('0.0020')
  let thirdRate = BigDecimal.fromString('0.0010')

  if (date.gt(BigInt.fromI32(cfgRewardRateDeploymentDate))) {
    let investorDropRewardRateOption: ethereum.CallResult<BigInt>
    if (date.lt(BigInt.fromI32(cfgSplitRewardRateDeploymentDate))) {
      let cfgRewardRate = CfgRewardRate.bind(Address.fromString(cfgRewardRateAddress))
      investorDropRewardRateOption = cfgRewardRate.try_investorRewardRate()
    } else {
      let cfgRewardRate = CfgSplitRewardRate.bind(Address.fromString(cfgSplitRewardRateAddressMainnet))
      investorDropRewardRateOption = cfgRewardRate.try_dropInvestorRewardRate()
    }

    log.info('trying to call CfgDropRewardRate contract at {}, reverted {}', [
      cfgRewardRateAddress.toString(),
      investorDropRewardRateOption.reverted ? 'true' : 'false',
    ])

    if (!investorDropRewardRateOption.reverted) {
      let investorDropRewardRate = BigDecimal.fromString(investorDropRewardRateOption.value.toString()).div(
        fixed27.toBigDecimal()
      )

      log.info('setting system rewards rate from CfgRewardRate contract rewardsToDate {}, dropRewardRate {}', [
        systemRewards.toDateRewardAggregateValue.toString(),
        investorDropRewardRate.toString(),
      ])
      return investorDropRewardRate
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

function getInvestorTinRewardRate(date: BigInt, systemRewards: RewardDayTotal): BigDecimal {
  let firstRate = BigDecimal.fromString('0.0042')
  let secondRate = BigDecimal.fromString('0.0020')
  let thirdRate = BigDecimal.fromString('0.0010')

  if (date.gt(BigInt.fromI32(cfgRewardRateDeploymentDate))) {
    let investorTinRewardRateOption: ethereum.CallResult<BigInt>
    if (date.lt(BigInt.fromI32(cfgSplitRewardRateDeploymentDate))) {
      let cfgRewardRate = CfgRewardRate.bind(Address.fromString(cfgRewardRateAddress))
      investorTinRewardRateOption = cfgRewardRate.try_investorRewardRate()
    } else {
      let cfgRewardRate = CfgSplitRewardRate.bind(Address.fromString(cfgSplitRewardRateAddressMainnet))
      investorTinRewardRateOption = cfgRewardRate.try_tinInvestorRewardRate()
    }

    log.info('trying to call CfgTinRewardRate contract at {}, reverted {}', [
      cfgRewardRateAddress.toString(),
      investorTinRewardRateOption.reverted ? 'true' : 'false',
    ])

    if (!investorTinRewardRateOption.reverted) {
      let investorTinRewardRate = BigDecimal.fromString(investorTinRewardRateOption.value.toString()).div(
        fixed27.toBigDecimal()
      )

      log.info('setting system rewards rate from CfgRewardRate contract rewardsToDate {}, TinRewardRate {}', [
        systemRewards.toDateRewardAggregateValue.toString(),
        investorTinRewardRate.toString(),
      ])
      return investorTinRewardRate
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
  let investorDropRewardRates = getInvestorDropRewardRate(date, systemRewards)
  let investorTinRewardRates = getInvestorTinRewardRate(date, systemRewards)

  systemRewards.tinRewardRate = investorTinRewardRates
  systemRewards.dropRewardRate = investorDropRewardRates
  systemRewards.save()

  return systemRewards
}
