import { log, dataSource } from '@graphprotocol/graph-ts'
import { SupplyOrderCall } from '../../generated/templates/Tranche/Tranche'
import { Account, Pool, PoolAddresses } from '../../generated/schema'
import { ensureSavedInGlobalAccounts, createAccount, isSystemAccount } from '../domain/Account'
import { calculateDisburse, loadOrCreateTokenBalance } from '../domain/TokenBalance'
import { loadOrCreateToken } from '../domain/Token'
import { pushUnique } from '../util/array'

// the supply order is the first contact an investor has with tinlake
export function handleSupplyOrder(call: SupplyOrderCall): void {
  let tranche = call.to.toHex()
  let poolId = dataSource.context().getString('id')
  log.debug('handle supply order for pool {}, tranche {}', [poolId.toString(), tranche.toString()])
  let poolAddresses = PoolAddresses.load(poolId)
  let token = poolAddresses.juniorToken
  if (poolAddresses.seniorTranche == tranche) {
    token = poolAddresses.seniorToken
  }
  let account = call.inputs.usr.toHex()

  // protection from adding system account to internal tracking
  if (isSystemAccount(poolId, account)) {
    return
  }
  if (Account.load(account) == null) {
    createAccount(account)
  }
  ensureSavedInGlobalAccounts(account)
  // ensure user is in token owners
  let tk = loadOrCreateToken(token)
  tk.owners = pushUnique(tk.owners, account)
  tk.save()

  let tb = loadOrCreateTokenBalance(account, token)
  calculateDisburse(tb, <PoolAddresses>poolAddresses)
  tb.save()
}
