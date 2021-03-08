import { log, BigDecimal, BigInt } from '@graphprotocol/graph-ts'
import { Claimed } from '../../generated/Claim/TinlakeClaimRad'
import { loadOrCreateRewardLink } from '../domain/RewardLink'
import { loadOrCreateRewardBalance } from '../domain/Reward'
import { pushOrMoveLast } from '../util/array'
import { timestampToDate } from '../util/date'
import { secondsInDay } from '../config'
import { rewardsAreClaimable } from '../domain/Day'

export function handleClaimed(claimed: Claimed): void {
  let date = timestampToDate(claimed.block.timestamp)
  let yesterday = date.minus(BigInt.fromI32(secondsInDay))

  let sender = claimed.params.claimer.toHex()
  let centAddress = claimed.params.account.toHex()

  log.debug('handle update claim address {} to substrate address {}', [sender.toString(), centAddress.toString()])

  let reward = loadOrCreateRewardBalance(sender)
  let link = loadOrCreateRewardLink(sender, centAddress)
  reward.links = pushOrMoveLast(reward.links, link.id)

  // if rewards are claimable, add this link to their reward balance and put any
  // claimable rewards into this link, reset linkableRewards to 0
  if (rewardsAreClaimable(yesterday, reward.nonZeroBalanceSince)) {
    link.rewardsAccumulated = link.rewardsAccumulated.plus(reward.linkableRewards)
    reward.linkableRewards = BigDecimal.fromString('0')
  }
  reward.save()
  link.save()
}
