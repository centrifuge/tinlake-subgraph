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
  pool.juniorYield14Days = null
  pool.seniorYield14Days = null
  pool.juniorYield30Days = null
  pool.seniorYield30Days = null
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

  log.debug('createPool: creating pool handlers: {}', [addresses.id])

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
