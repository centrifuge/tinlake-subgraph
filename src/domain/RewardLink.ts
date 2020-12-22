import { BigDecimal } from '@graphprotocol/graph-ts'
import { RewardLink } from '../../generated/schema'

export function loadOrCreateRewardLink(address: string, substrate: string): RewardLink {
  let claim = RewardLink.load(address.concat(substrate))
  if (claim == null) {
    new RewardLink(address.concat(substrate))
    claim.ethAddress = address
    claim.centAddress = substrate
    claim.rewardsAccumulated = BigDecimal.fromString('0')
    claim.save()
  }
  return <RewardLink>claim
}
