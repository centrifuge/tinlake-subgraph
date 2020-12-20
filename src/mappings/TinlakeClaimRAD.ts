import { log, dataSource, store } from '@graphprotocol/graph-ts'
import { Claimed } from '../../generated/templates/Claim/TinlakeClaimRAD'
import { RewardClaim } from '../../generated/schema'
import { loadOrCreateRewardClaim } from '../domain/Claim'

export function handleClaimed(claimed: Claimed): void {
  let msgsender = claimed.params.claimer.toHex()

  log.debug('handle update claim address {}', [msgsender.toString()])

  // this is bytes32...
  let substrateAccount = claimed.params.account.toHex()
  log.debug('handle update claim substrate address {}', [substrateAccount.toString()])

  loadOrCreateRewardClaim(msgsender, substrateAccount)

  // todo:
  // get their reward balance object
  // update the amount of their reward balance
  // push the new reward claim to the array
}
