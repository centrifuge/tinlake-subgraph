import { log, BigInt, ethereum, Address, DataSourceContext } from '@graphprotocol/graph-ts'
import { Assessor } from '../../generated/Block/Assessor'
import { Assessor as AssessorTemplate, Coordinator as CoordinatorTemplate, Shelf as ShelfTemplate, NftFeed as NftFeedTemplate, DROP as DROPTemplate, TIN as TINTemplate } from '../../generated/templates'
import { Pool } from '../../generated/schema'
import { registryAddress } from '../config'

export function createPool(poolId: string, shortName: string, assessorAddress: string): void {
  let interestRateResult = new ethereum.CallResult<BigInt>()
  let assessor = Assessor.bind(<Address>Address.fromHexString(assessorAddress))
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
  pool.save()
}

export function createPoolHandlers(shortName: string, id: string, coordinator: string, assessor: string, shelf: string, pile: string, feed: string, reserve: string, seniorToken: string, juniorToken: string, seniorTranche: string, juniorTranche: string): void {
  let context = new DataSourceContext()
  context.setString('shortName', shortName)
  context.setString('id', id)
  context.setString('coordinator', coordinator)
  context.setString('assessor', assessor)
  context.setString('shelf', shelf)
  context.setString('pile', pile)
  context.setString('feed', feed)
  context.setString('reserve', reserve)
  context.setString('seniorToken', seniorToken)
  context.setString('juniorToken', juniorToken)
  context.setString('seniorTranche', seniorTranche)
  context.setString('juniorTranche', juniorTranche)

  log.debug('creating pool handlers: {}', [id])
  
  CoordinatorTemplate.createWithContext(Address.fromString(coordinator), context)
  AssessorTemplate.createWithContext(Address.fromString(assessor), context)
  ShelfTemplate.createWithContext(Address.fromString(shelf), context)
  NftFeedTemplate.createWithContext(Address.fromString(feed), context)
  DROPTemplate.createWithContext(Address.fromString(seniorToken), context)
  TINTemplate.createWithContext(Address.fromString(juniorToken), context)
}