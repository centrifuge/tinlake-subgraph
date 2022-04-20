import { log, BigInt, Address, DataSourceContext } from '@graphprotocol/graph-ts'
import { Assessor } from '../../generated/Block/Assessor'
import {
  Assessor as AssessorTemplate,
  Coordinator as CoordinatorTemplate,
  Shelf as ShelfTemplate,
  NftFeed as NftFeedTemplate,
  Token as TokenTemplate,
  Tranche as TrancheTemplate,
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

  log.info('createPool: will create new pool poolId {}', [poolId])
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
  pool.juniorYield30Days = null
  pool.seniorYield30Days = null
  pool.juniorYield90Days = null
  pool.seniorYield90Days = null
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

  log.info('createPoolHandlers: {}', [addresses.id])

  CoordinatorTemplate.createWithContext(Address.fromString(addresses.coordinator), context)
  AssessorTemplate.createWithContext(Address.fromString(addresses.assessor), context)
  ShelfTemplate.createWithContext(Address.fromString(addresses.shelf), context)
  NftFeedTemplate.createWithContext(Address.fromString(addresses.feed), context)
  TrancheTemplate.createWithContext(Address.fromString(addresses.seniorTranche), context)
  TrancheTemplate.createWithContext(Address.fromString(addresses.juniorTranche), context)

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

  log.info('createUpdatedPoolHandlers: {} => {}', [prevAddresses.id, newAddresses.id])

  log.info("PREVIOUS: coordinator: {}, assesor: {}, reserve: {}, senior Tranche: {}, junior tranche: {}, mgr: {}", [
    prevAddresses.coordinator,
    prevAddresses.assessor,
    prevAddresses.reserve,
    prevAddresses.seniorTranche,
    prevAddresses.juniorTranche,
    prevAddresses.makerMgr
  ])
  log.info("NEW: coordinator: {}, assesor: {}, reserve: {}, senior Tranche: {}, junior tranche: {}, mgr: {}", [
    newAddresses.coordinator,
    newAddresses.assessor,
    newAddresses.reserve,
    newAddresses.seniorTranche,
    newAddresses.juniorTranche,
    newAddresses.makerMgr
  ])

  if (prevAddresses.coordinator != newAddresses.coordinator) {
    log.info('createUpdatedPoolHandlers: creating handler for changed coordinator {} => {}', [
      prevAddresses.coordinator,
      newAddresses.coordinator,
    ])
    CoordinatorTemplate.createWithContext(Address.fromString(newAddresses.coordinator), context)
  }

  if (prevAddresses.assessor != newAddresses.assessor) {
    log.info('createUpdatedPoolHandlers: creating handler for changed assessor {} => {}', [
      prevAddresses.assessor,
      newAddresses.assessor,
    ])
    AssessorTemplate.createWithContext(Address.fromString(newAddresses.assessor), context)
  }

  if (prevAddresses.shelf != newAddresses.shelf) {
    log.info('createUpdatedPoolHandlers: creating handler for changed shelf {} => {}', [
      prevAddresses.shelf,
      newAddresses.shelf,
    ])
    ShelfTemplate.createWithContext(Address.fromString(newAddresses.shelf), context)
  }

  if (prevAddresses.feed != newAddresses.feed) {
    log.info('createUpdatedPoolHandlers: creating handler for changed feed {} => {}', [
      prevAddresses.feed,
      newAddresses.feed,
    ])
    NftFeedTemplate.createWithContext(Address.fromString(newAddresses.feed), context)
  }

  if (prevAddresses.seniorToken != newAddresses.seniorToken) {
    log.info('createUpdatedPoolHandlers: creating handler for changed seniorToken {} => {}', [
      prevAddresses.seniorToken,
      newAddresses.seniorToken,
    ])
    let seniorTokenContext = new DataSourceContext()
    seniorTokenContext.setString('id', newAddresses.id)
    seniorTokenContext.setString('tokenAddress', newAddresses.seniorToken)
    TokenTemplate.createWithContext(Address.fromString(newAddresses.seniorToken), seniorTokenContext)
  }

  if (prevAddresses.juniorToken != newAddresses.juniorToken) {
    log.info('createUpdatedPoolHandlers: creating handler for changed juniorToken {} => {}', [
      prevAddresses.juniorToken,
      newAddresses.juniorToken,
    ])
    let juniorTokenContext = new DataSourceContext()
    juniorTokenContext.setString('id', newAddresses.id)
    juniorTokenContext.setString('tokenAddress', newAddresses.juniorToken)
    TokenTemplate.createWithContext(Address.fromString(newAddresses.juniorToken), juniorTokenContext)
  }

  if (prevAddresses.seniorTranche != newAddresses.seniorTranche) {
    log.info('createUpdatedPoolHandlers: creating handler for changed seniorTranche {} => {}', [
      prevAddresses.seniorTranche,
      newAddresses.seniorTranche,
    ])
    TrancheTemplate.createWithContext(Address.fromString(newAddresses.seniorTranche), context)
    log.info("senior tranche updated", [])
  }

  if (prevAddresses.juniorTranche != newAddresses.juniorTranche) {
    log.info('createUpdatedPoolHandlers: creating handler for changed juniorTranche {} => {}', [
      prevAddresses.juniorTranche,
      newAddresses.juniorTranche,
    ])
    TrancheTemplate.createWithContext(Address.fromString(newAddresses.juniorTranche), context)
  }
}
