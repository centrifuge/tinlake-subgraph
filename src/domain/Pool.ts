import { log, BigInt, ethereum, Address } from '@graphprotocol/graph-ts'
import { Assessor } from '../../generated/Block/Assessor'
import { Pool } from '../../generated/schema'
import { PoolMeta } from '../poolMetas'
import { poolFromIdentifier } from '../util/pool'

export function loadOrCreatePool(poolMeta: PoolMeta, block: ethereum.Block): Pool {
  let pool = Pool.load(poolMeta.id)

  log.debug('loadOrCreatePool: pool start block {}, current block {}', [
    poolMeta.startBlock.toString(),
    block.number.toString(),
  ])
  if (pool == null && parseFloat(block.number.toString()) >= poolMeta.startBlock) {
    createPool(poolMeta.id)
    pool = Pool.load(poolMeta.id)
  }

  log.debug('successfully using this for pool meta id: {}', [poolMeta.id.toString()])
  return <Pool>pool
}

export function createPool(poolId: string): void {
  let poolMeta = poolFromIdentifier(poolId)

  let interestRateResult = new ethereum.CallResult<BigInt>()
  let assessor = Assessor.bind(<Address>Address.fromHexString(poolMeta.assessor))
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
  pool.shortName = poolMeta.shortName
  pool.version = BigInt.fromI32(poolMeta.version == 2 ? 2 : 3)
  pool.save()
}
