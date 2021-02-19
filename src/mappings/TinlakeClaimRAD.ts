import { log, BigDecimal } from '@graphprotocol/graph-ts'
import { Claimed } from '../../generated/Claim/TinlakeClaimRad'
import { loadOrCreateRewardLink } from '../domain/RewardLink'
import { loadOrCreateRewardBalance } from '../domain/Reward'
import { pushOrMoveLast } from '../util/array'

export function handleClaimed(claimed: Claimed): void {
  let sender = claimed.params.claimer.toHex()
  let centAddress = claimed.params.account.toHex()

  log.debug('handle update claim address {} to substrate address {}', [sender.toString(), centAddress.toString()])

  let reward = loadOrCreateRewardBalance(sender)
  let link = loadOrCreateRewardLink(sender, centAddress)
  reward.links = pushOrMoveLast(reward.links, link.id)

  // add this link to their reward balance and put any
  // claimable rewards into this link, reset linkableRewards to 0
  if (reward.claimable) {
    link.rewardsAccumulated = link.rewardsAccumulated.plus(reward.linkableRewards)
    reward.linkableRewards = BigDecimal.fromString('0')
  }
  reward.save()
  link.save()
}
