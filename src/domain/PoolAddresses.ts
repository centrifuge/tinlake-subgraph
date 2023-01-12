import { TypedMap, JSONValue, log } from '@graphprotocol/graph-ts'
import { PoolAddresses } from '../../generated/schema'
import { toLowerCaseAddress } from '../util/toLowerCaseAddress'

export function updatePoolAddresses(poolId: string, addresses: TypedMap<string, JSONValue>): PoolAddresses {
  let poolAddresses = new PoolAddresses(toLowerCaseAddress(poolId))

  log.info('update poolAddresses {}', [poolId])

  poolAddresses.coordinator = toLowerCaseAddress(addresses.mustGet('COORDINATOR').toString())
  poolAddresses.assessor = toLowerCaseAddress(addresses.mustGet('ASSESSOR').toString())
  poolAddresses.shelf = toLowerCaseAddress(addresses.mustGet('SHELF').toString())
  poolAddresses.pile = toLowerCaseAddress(addresses.mustGet('PILE').toString())
  poolAddresses.feed = toLowerCaseAddress(addresses.mustGet('FEED').toString())
  poolAddresses.reserve = toLowerCaseAddress(addresses.mustGet('RESERVE').toString())
  poolAddresses.seniorToken = toLowerCaseAddress(addresses.mustGet('SENIOR_TOKEN').toString())
  poolAddresses.juniorToken = toLowerCaseAddress(addresses.mustGet('JUNIOR_TOKEN').toString())
  poolAddresses.seniorTranche = toLowerCaseAddress(addresses.mustGet('SENIOR_TRANCHE').toString())
  poolAddresses.juniorTranche = toLowerCaseAddress(addresses.mustGet('JUNIOR_TRANCHE').toString())
  poolAddresses.seniorOperator = toLowerCaseAddress(addresses.mustGet('SENIOR_OPERATOR').toString())
  poolAddresses.juniorOperator = toLowerCaseAddress(addresses.mustGet('JUNIOR_OPERATOR').toString())
  let aoRewardRecipient = addresses.get('AO_REWARD_RECIPIENT')
  if (aoRewardRecipient !== null && aoRewardRecipient.toString() != '') {
    poolAddresses.aoRewardRecipient = toLowerCaseAddress(aoRewardRecipient.toString())
  }
  let makerMgr = addresses.get('MAKER_MGR')
  if (!!makerMgr && makerMgr.toString() != '') {
    poolAddresses.makerMgr = toLowerCaseAddress(makerMgr.toString())
  }
  poolAddresses.save()

  return poolAddresses
}
