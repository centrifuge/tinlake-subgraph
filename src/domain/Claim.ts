import { BigDecimal } from '@graphprotocol/graph-ts'
import { RewardClaim } from '../../generated/schema'

export function loadOrCreateRewardClaim(address: string, substrate: string): RewardClaim {
  let claim = new RewardClaim(address)
  claim.ethAddress = address
  claim.centAddress = substrate
  claim.rewardsAccumulated = BigDecimal.fromString('0')
  claim.save()
  return claim
}
