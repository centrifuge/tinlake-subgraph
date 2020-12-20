import { log, dataSource, store, BigDecimal } from '@graphprotocol/graph-ts'
import { Claimed } from '../../generated/templates/Claim/TinlakeClaimRAD'
import { loadOrCreateRewardClaim } from '../domain/Claim'
import { loadOrCreateRewardBalance } from '../domain/Reward'

export function handleClaimed(claimed: Claimed): void {
  let sender = claimed.params.claimer.toHex()
  log.debug('handle update claim address {}', [sender.toString()])

  // this is bytes32...
  let substrateAccount = claimed.params.account.toHex()
  log.debug('handle update claim substrate address {}', [substrateAccount.toString()])

  let link = loadOrCreateRewardClaim(sender, substrateAccount)
  let balance = loadOrCreateRewardBalance(sender)

  // transfer claimable to linked address
  link.rewardsAccumulated = balance.claimableRewards
  link.save()

  let temp = balance.claims
  temp.push(link.id)
  balance.claims = temp

  // set previous rewards
  balance.previousRewards = balance.previousRewards.plus(balance.claimableRewards)
  balance.claimableRewards = BigDecimal.fromString('0')
  balance.save()
}
