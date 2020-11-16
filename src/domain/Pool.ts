import { log, BigInt, ethereum, Address, DataSourceContext } from '@graphprotocol/graph-ts'
import { Assessor } from '../../generated/Block/Assessor'
import {
  Assessor as AssessorTemplate,
  Coordinator as CoordinatorTemplate,
  Shelf as ShelfTemplate,
  NftFeed as NftFeedTemplate,
  DROP as DROPTemplate,
  TIN as TINTemplate,
} from '../../generated/templates'
import { Pool, PoolAddresses } from '../../generated/schema'
import { registryAddress } from '../config'

export function createPool(poolId: string, shortName: string, addresses: PoolAddresses): void {
  let interestRateResult = new ethereum.CallResult<BigInt>()
  let assessor = Assessor.bind(<Address>Address.fromHexString(addresses.assessor))
  interestRateResult = assessor.try_seniorInterestRate()

  if (interestRateResult.reverted) {
    log.warning('pool not deployed to the network yet {}', [poolId])
    return
  }

  log.debug('will create new pool poolId {}', [poolId])
  let pool = new Pool(poolId)
  pool.seniorInterestRate = interestRateResult.value
  pool.loans = []
  pool.totalDebt = BigInt.fromI32(0)
  pool.seniorDebt = BigInt.fromI32(0)
  pool.minJuniorRatio = BigInt.fromI32(0)
  pool.maxJuniorRatio = BigInt.fromI32(0)
  pool.currentJuniorRatio = BigInt.fromI32(0)
  pool.maxReserve = BigInt.fromI32(0)
  pool.weightedInterestRate = BigInt.fromI32(0)
  pool.totalRepaysCount = 0
  pool.totalRepaysAggregatedAmount = BigInt.fromI32(0)
  pool.totalBorrowsCount = 0
  pool.totalBorrowsAggregatedAmount = BigInt.fromI32(0)
  pool.seniorTokenPrice = BigInt.fromI32(0)
  pool.juniorTokenPrice = BigInt.fromI32(0)
  pool.shortName = shortName
  pool.version = BigInt.fromI32(3)
  pool.registry = registryAddress
  pool.addresses = poolId
  pool.save()
}

export function createPoolHandlers(
  addresses: PoolAddresses
): void {
  let context = new DataSourceContext()
  context.setString('id', addresses.id)

  log.debug('creating pool handlers: {}', [addresses.id])

  CoordinatorTemplate.createWithContext(Address.fromString(addresses.coordinator), context)
  AssessorTemplate.createWithContext(Address.fromString(addresses.assessor), context)
  ShelfTemplate.createWithContext(Address.fromString(addresses.shelf), context)
  NftFeedTemplate.createWithContext(Address.fromString(addresses.feed), context)
  DROPTemplate.createWithContext(Address.fromString(addresses.seniorToken), context)
  TINTemplate.createWithContext(Address.fromString(addresses.juniorToken), context)
}
