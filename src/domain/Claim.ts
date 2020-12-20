import { RewardClaim } from '../../generated/schema'

export function loadOrCreateRewardClaim(address: string, substrate: string): RewardClaim {
  let claim = new RewardClaim(address)
  claim.ethAddress = address
  claim.centAddress = substrate
  claim.save()
  return claim
}
