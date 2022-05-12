import { BigDecimal } from '@graphprotocol/graph-ts'
import { RewardLink } from '../../generated/schema'

export function loadOrCreateRewardLink(address: string, centAddress: string): RewardLink {
  let claim = RewardLink.load(address.concat(centAddress))
  if (!claim) {
    claim = new RewardLink(address.concat(centAddress))
    claim.ethAddress = address
    claim.centAddress = centAddress
    claim.rewardsAccumulated = BigDecimal.fromString('0')
    claim.save()
  }
  return <RewardLink>claim
}
