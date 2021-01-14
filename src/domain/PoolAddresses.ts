import { TypedMap, JSONValue, Address } from '@graphprotocol/graph-ts'
import { PoolAddresses } from '../../generated/schema'

function toLowerCaseAddress(addr: JSONValue): string {
  return Address.fromHexString(addr.toString()).toHexString()
}

export function updatePoolAddresses(poolId: string, addresses: TypedMap<string, JSONValue>): PoolAddresses {
  let poolAddresses = new PoolAddresses(poolId)

  poolAddresses.coordinator = toLowerCaseAddress(addresses.get('COORDINATOR'))
  poolAddresses.assessor = toLowerCaseAddress(addresses.get('ASSESSOR'))
  poolAddresses.shelf = toLowerCaseAddress(addresses.get('SHELF'))
  poolAddresses.pile = toLowerCaseAddress(addresses.get('PILE'))
  poolAddresses.feed = toLowerCaseAddress(addresses.get('FEED'))
  poolAddresses.reserve = toLowerCaseAddress(addresses.get('RESERVE'))
  poolAddresses.seniorToken = toLowerCaseAddress(addresses.get('SENIOR_TOKEN'))
  poolAddresses.juniorToken = toLowerCaseAddress(addresses.get('JUNIOR_TOKEN'))
  poolAddresses.seniorTranche = toLowerCaseAddress(addresses.get('SENIOR_TRANCHE'))
  poolAddresses.juniorTranche = toLowerCaseAddress(addresses.get('JUNIOR_TRANCHE'))
  poolAddresses.save()

  return poolAddresses
}
