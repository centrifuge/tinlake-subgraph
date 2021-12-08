import { log, BigDecimal, BigInt } from '@graphprotocol/graph-ts'
import { Claimed } from '../../generated/Claim/TinlakeClaimRad'
import { loadOrCreateRewardLink } from '../domain/RewardLink'
import { loadOrCreateRewardBalance } from '../domain/Reward'
import { loadOrCreateAORewardBalance } from '../domain/AOReward'
import { pushOrMoveLast } from '../util/array'
import { timestampToDate } from '../util/date'
import { secondsInDay } from '../config'
import { rewardsAreClaimable } from '../domain/Day'
import { Account, PoolsByAORewardRecipient } from '../../generated/schema'
import { loadOrCreateAccount } from '../domain/Account'

export function handleClaimed(claimed: Claimed): void {
  let date = timestampToDate(claimed.block.timestamp)
  let yesterday = date.minus(BigInt.fromI32(secondsInDay))

  let sender = claimed.params.claimer.toHex()
  let centAddress = claimed.params.account.toHex()

  log.info('handle update claim address {} to substrate address {}', [sender.toString(), centAddress.toString()])

  let link = loadOrCreateRewardLink(sender, centAddress)

  let account = loadOrCreateAccount(sender)
  account.hasLinkedCfgAccount = true;
  account.save();
  // update both investor and AO reward balances. An eth address could be used for both, so update both.

  // update investor reward balance
  let reward = loadOrCreateRewardBalance(sender)
  reward.links = pushOrMoveLast(reward.links, link.id)

  // if rewards are claimable, add this link to their reward balance and put any
  // claimable rewards into this link, reset linkableRewards to 0
  if (rewardsAreClaimable(yesterday, reward.nonZeroBalanceSince)) {
    link.rewardsAccumulated = link.rewardsAccumulated.plus(reward.linkableRewards)
    reward.linkableRewards = BigDecimal.fromString('0')
  }
  reward.save()

  // update AO reward balance for all pools linked to this recipient
  let p = PoolsByAORewardRecipient.load(sender)
  if (p != null) {
    let pools = p.pools
    for (let i = 0; i < pools.length; i++) {
      let poolId = pools[i]
      let aoReward = loadOrCreateAORewardBalance(poolId)
      aoReward.links = pushOrMoveLast(aoReward.links, link.id)

      // if rewards are claimable, add this link to their reward balance and put any
      // claimable rewards into this link, reset linkableRewards to 0
      link.rewardsAccumulated = link.rewardsAccumulated.plus(aoReward.linkableRewards)
      aoReward.linkableRewards = BigDecimal.fromString('0')
      aoReward.save()
    }
  }

  // save link
  link.save()
}
