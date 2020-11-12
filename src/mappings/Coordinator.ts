import { log, BigInt, Address, ethereum, dataSource } from '@graphprotocol/graph-ts'
import { Assessor } from '../../generated/Block/Assessor'
import { Pool } from '../../generated/schema'
import { ExecuteEpochCall } from '../../generated/templates/Coordinator/Coordinator'
import { seniorToJuniorRatio } from '../util/pool'
import { updateLoans } from '../domain/Loan'

export function handleCoordinatorExecuteEpoch(call: ExecuteEpochCall): void {
  let poolId = dataSource.context().getString('id')
  let pool = Pool.load(poolId)

  log.debug('handleCoordinatorExecuteEpoch: pool id {}, to {}', [pool.id.toString(), call.to.toString()])

  // update loans and return weightedInterestRate and totalDebt
  let loanValues = updateLoans(pool as Pool, dataSource.context().getString('pile'))

  // update pool values
  pool.weightedInterestRate = loanValues[0]
  pool.totalDebt = loanValues[1]

  let assessor = Assessor.bind(<Address>Address.fromHexString(dataSource.context().getString('assessor')))
  let currentSeniorRatioResult = assessor.try_seniorRatio()
  pool.currentJuniorRatio = !currentSeniorRatioResult.reverted
    ? seniorToJuniorRatio(currentSeniorRatioResult.value)
    : BigInt.fromI32(0)

  // check if senior tranche exists
  if (dataSource.context().getString('seniorTranche') != '0x0000000000000000000000000000000000000000') {
    let seniorDebtResult = new ethereum.CallResult<BigInt>()
    let assessor = Assessor.bind(<Address>Address.fromHexString(dataSource.context().getString('assessor')))
    seniorDebtResult = assessor.try_seniorDebt_()

    pool.seniorDebt = !seniorDebtResult.reverted ? seniorDebtResult.value : BigInt.fromI32(0)
    log.debug('will update seniorDebt {}', [pool.seniorDebt.toString()])
  }

  log.debug('will update pool {}: totalDebt {} minJuniorRatio {} juniorRatio {} weightedInterestRate {}', [
    poolId,
    pool.totalDebt.toString(),
    pool.minJuniorRatio.toString(),
    pool.currentJuniorRatio.toString(),
    pool.weightedInterestRate.toString(),
  ])
  pool.save()
}
