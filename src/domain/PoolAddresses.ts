import { TypedMap, JSONValue, log } from '@graphprotocol/graph-ts'
import { PoolAddresses } from '../../generated/schema'
import { toLowerCaseAddress } from '../util/toLowerCaseAddress'

export function updatePoolAddresses(poolId: string, addresses: TypedMap<string, JSONValue>): PoolAddresses {
  let poolAddresses = new PoolAddresses(toLowerCaseAddress(poolId))

  log.info('update poolAddresses {}', [poolId])

  poolAddresses.coordinator = toLowerCaseAddress(addresses.get('COORDINATOR').toString())
  poolAddresses.assessor = toLowerCaseAddress(addresses.get('ASSESSOR').toString())
  poolAddresses.shelf = toLowerCaseAddress(addresses.get('SHELF').toString())
  poolAddresses.pile = toLowerCaseAddress(addresses.get('PILE').toString())
  poolAddresses.feed = toLowerCaseAddress(addresses.get('FEED').toString())
  poolAddresses.reserve = toLowerCaseAddress(addresses.get('RESERVE').toString())
  poolAddresses.seniorToken = toLowerCaseAddress(addresses.get('SENIOR_TOKEN').toString())
  poolAddresses.juniorToken = toLowerCaseAddress(addresses.get('JUNIOR_TOKEN').toString())
  poolAddresses.seniorTranche = toLowerCaseAddress(addresses.get('SENIOR_TRANCHE').toString())
  poolAddresses.juniorTranche = toLowerCaseAddress(addresses.get('JUNIOR_TRANCHE').toString())
  let aoRewardRecipient = addresses.get('AO_REWARD_RECIPIENT')
  if (!aoRewardRecipient.isNull() && aoRewardRecipient.toString() != '') {
    poolAddresses.aoRewardRecipient = toLowerCaseAddress(aoRewardRecipient.toString())
  }
  let makerMgr = addresses.get('MAKER_MGR')
  if (!makerMgr.isNull() && makerMgr.toString() != '') {
    poolAddresses.makerMgr = toLowerCaseAddress(makerMgr.toString())
  }
  poolAddresses.save()

  return poolAddresses
}
