import { TypedMap, JSONValue } from '@graphprotocol/graph-ts'
import { PoolAddresses } from '../../generated/schema'
import { toLowerCaseAddress } from '../util/toLowerCaseAddress'

export function updatePoolAddresses(poolId: string, addresses: TypedMap<string, JSONValue>): PoolAddresses {
  let poolAddresses = new PoolAddresses(toLowerCaseAddress(poolId))

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
