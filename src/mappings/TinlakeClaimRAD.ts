import { log, BigDecimal } from '@graphprotocol/graph-ts'
import { Claimed } from '../../generated/templates/Claim/TinlakeClaimRAD'
import { loadOrCreateRewardLink } from '../domain/RewardLink'
import { loadOrCreateRewardBalance } from '../domain/Reward'
import { push } from '../util/array'

export function handleClaimed(claimed: Claimed): void {
  let sender = claimed.params.claimer.toHex()
  let substrateAccount = claimed.params.account.toHex()

  log.debug('handle update claim address {}', [sender.toString()])
  log.debug('handle update claim substrate address {}', [substrateAccount.toString()])

  let balance = loadOrCreateRewardBalance(sender)
  let link = loadOrCreateRewardLink(sender, substrateAccount)
  balance.claims = push(balance.claims, link.id)

  // add this link to their reward balance and put any
  // eligible rewards claimable into this claim, reset claimable to 0
  if (balance.eligible) {
    link.rewardsAccumulated = balance.claimableRewards
    balance.claimableRewards = BigDecimal.fromString('0')
  }
  balance.save()
  link.save()
}
