import { dataSource, log } from '@graphprotocol/graph-ts'
import { DisburseCall } from '../../generated/templates/Operator/Operator'
import { addInvestorTransactions } from './Coordinator'

export function handleDisburse(call: DisburseCall): void {
  let tranche = call.to.toHex()
  let poolId = dataSource.context().getString('id')
  let account = call.from.toHex()
  log.info('handle disburse for pool {}, tranche {}, from account {}', [poolId.toString(), tranche.toString(), account])
  addInvestorTransactions(poolId, call.transaction, call.to, call.block)
}
