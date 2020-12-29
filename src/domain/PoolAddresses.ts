import { TypedMap, JSONValue } from '@graphprotocol/graph-ts'
import { PoolAddresses } from '../../generated/schema'

export function updatePoolAddresses(poolId: string, addresses: TypedMap<string, JSONValue>): PoolAddresses {
  let poolAddresses = new PoolAddresses(poolId)
  poolAddresses.coordinator = addresses.get('COORDINATOR').toString()
  poolAddresses.assessor = addresses.get('ASSESSOR').toString()
  poolAddresses.shelf = addresses.get('SHELF').toString()
  poolAddresses.pile = addresses.get('PILE').toString()
  poolAddresses.feed = addresses.get('FEED').toString()
  poolAddresses.reserve = addresses.get('RESERVE').toString()
  poolAddresses.seniorToken = addresses.get('SENIOR_TOKEN').toString()
  poolAddresses.juniorToken = addresses.get('JUNIOR_TOKEN').toString()
  poolAddresses.seniorTranche = addresses.get('SENIOR_TRANCHE').toString()
  poolAddresses.juniorTranche = addresses.get('JUNIOR_TRANCHE').toString()
  poolAddresses.save()

  return poolAddresses
}
