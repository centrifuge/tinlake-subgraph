import { log, BigDecimal } from '@graphprotocol/graph-ts'
import { Claimed } from '../../generated/Claim/TinlakeClaimRAD'
import { loadOrCreateRewardLink } from '../domain/RewardLink'
import { loadOrCreateRewardBalance } from '../domain/Reward'
import { pushOrMoveLast, pushUnique } from '../util/array'

export function handleClaimed(claimed: Claimed): void {
  let sender = claimed.params.claimer.toHex()
  let centAddress = claimed.params.account.toHex()

  log.debug('handle update claim address {} to substrate address {}', [sender.toString(), centAddress.toString()])

  let balance = loadOrCreateRewardBalance(sender)
  let link = loadOrCreateRewardLink(sender, centAddress)
  balance.links = pushOrMoveLast(balance.links, link.id)

  // add this link to their reward balance and put any
  // claimable rewards into this link, reset linkableRewards to 0
  if (balance.claimable) {
    link.rewardsAccumulated = balance.linkableRewards
    balance.linkableRewards = BigDecimal.fromString('0')
  }
  balance.save()
  link.save()
}
