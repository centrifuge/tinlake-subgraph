import { log, BigInt, Address, DataSourceContext } from '@graphprotocol/graph-ts'
import { Assessor } from '../../generated/Block/Assessor'
import {
  Assessor as AssessorTemplate,
  Coordinator as CoordinatorTemplate,
  Shelf as ShelfTemplate,
  NftFeed as NftFeedTemplate,
  Token as TokenTemplate,
} from '../../generated/templates'
import { Pool, PoolAddresses } from '../../generated/schema'
import { seniorToJuniorRatio } from '../util/pool'

export function createPool(poolId: string, shortName: string, addresses: PoolAddresses): void {
  let assessor = Assessor.bind(<Address>Address.fromHexString(addresses.assessor))
  let interestRateResult = assessor.try_seniorInterestRate()

  if (interestRateResult.reverted) {
    log.warning('createPool: pool not deployed to the network yet {}', [poolId])
    return
  }

  let minSeniorRatioResult = assessor.try_minSeniorRatio()
  let maxSeniorRatioResult = assessor.try_maxSeniorRatio()
  let maxReserveResult = assessor.try_maxReserve()

  log.debug('createPool: will create new pool poolId {}', [poolId])
  let pool = new Pool(poolId)
  pool.seniorInterestRate = interestRateResult.value
  pool.loans = []
  pool.totalDebt = BigInt.fromI32(0)
  pool.seniorDebt = BigInt.fromI32(0)
  pool.minJuniorRatio = seniorToJuniorRatio(maxSeniorRatioResult.value)
  pool.maxJuniorRatio = seniorToJuniorRatio(minSeniorRatioResult.value)
  pool.currentJuniorRatio = BigInt.fromI32(0)
  pool.maxReserve = maxReserveResult.value
  pool.weightedInterestRate = BigInt.fromI32(0)
  pool.totalRepaysCount = 0
  pool.totalRepaysAggregatedAmount = BigInt.fromI32(0)
  pool.totalBorrowsCount = 0
  pool.totalBorrowsAggregatedAmount = BigInt.fromI32(0)
  pool.seniorTokenPrice = BigInt.fromI32(0)
  pool.juniorTokenPrice = BigInt.fromI32(0)
  pool.reserve = BigInt.fromI32(0)
  pool.assetValue = BigInt.fromI32(0)
  pool.shortName = shortName
  pool.version = BigInt.fromI32(3)
  pool.addresses = poolId
  pool.save()
}

export function createPoolHandlers(addresses: PoolAddresses): void {
  let context = new DataSourceContext()
  context.setString('id', addresses.id)

  log.debug('createPoolHandlers: {}', [addresses.id])

  CoordinatorTemplate.createWithContext(Address.fromString(addresses.coordinator), context)
  AssessorTemplate.createWithContext(Address.fromString(addresses.assessor), context)
  ShelfTemplate.createWithContext(Address.fromString(addresses.shelf), context)
  NftFeedTemplate.createWithContext(Address.fromString(addresses.feed), context)

  let seniorTokenContext = new DataSourceContext()
  seniorTokenContext.setString('id', addresses.id)
  seniorTokenContext.setString('tokenAddress', addresses.seniorToken)
  TokenTemplate.createWithContext(Address.fromString(addresses.seniorToken), seniorTokenContext)

  let juniorTokenContext = new DataSourceContext()
  juniorTokenContext.setString('id', addresses.id)
  juniorTokenContext.setString('tokenAddress', addresses.juniorToken)
  TokenTemplate.createWithContext(Address.fromString(addresses.juniorToken), juniorTokenContext)
}

export function createUpdatedPoolHandlers(prevAddresses: PoolAddresses, newAddresses: PoolAddresses): void {
  let context = new DataSourceContext()
  context.setString('id', newAddresses.id)

  log.debug('createUpdatedPoolHandlers: {} => {}', [prevAddresses.id, newAddresses.id])

  if (prevAddresses.coordinator != newAddresses.coordinator) {
    log.debug('createUpdatedPoolHandlers: swapping coordinator {} => {}', [
      prevAddresses.coordinator,
      newAddresses.coordinator,
    ])
    CoordinatorTemplate.createWithContext(Address.fromString(newAddresses.coordinator), context)
  }

  if (prevAddresses.assessor != newAddresses.assessor) {
    log.debug('createUpdatedPoolHandlers: swapping assessor {} => {}', [prevAddresses.assessor, newAddresses.assessor])
    AssessorTemplate.createWithContext(Address.fromString(newAddresses.assessor), context)
  }

  if (prevAddresses.shelf != newAddresses.shelf) {
    log.debug('createUpdatedPoolHandlers: swapping shelf {} => {}', [prevAddresses.shelf, newAddresses.shelf])
    ShelfTemplate.createWithContext(Address.fromString(newAddresses.shelf), context)
  }

  if (prevAddresses.feed != newAddresses.feed) {
    log.debug('createUpdatedPoolHandlers: swapping feed {} => {}', [prevAddresses.feed, newAddresses.feed])
    NftFeedTemplate.createWithContext(Address.fromString(newAddresses.feed), context)
  }

  if (prevAddresses.seniorToken != newAddresses.seniorToken) {
    log.debug('createUpdatedPoolHandlers: swapping seniorToken {} => {}', [
      prevAddresses.seniorToken,
      newAddresses.seniorToken,
    ])
    let seniorTokenContext = new DataSourceContext()
    seniorTokenContext.setString('id', newAddresses.id)
    seniorTokenContext.setString('tokenAddress', newAddresses.seniorToken)
    TokenTemplate.createWithContext(Address.fromString(newAddresses.seniorToken), seniorTokenContext)
  }

  if (prevAddresses.juniorToken != newAddresses.juniorToken) {
    log.debug('createUpdatedPoolHandlers: swapping juniorToken {} => {}', [
      prevAddresses.juniorToken,
      newAddresses.assessor,
    ])
    let juniorTokenContext = new DataSourceContext()
    juniorTokenContext.setString('id', newAddresses.id)
    juniorTokenContext.setString('tokenAddress', newAddresses.juniorToken)
    TokenTemplate.createWithContext(Address.fromString(newAddresses.juniorToken), juniorTokenContext)
  }
}
