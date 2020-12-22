import { log, dataSource } from '@graphprotocol/graph-ts'
import { SupplyOrderCall } from '../../generated/templates/Tranche/Tranche'
import { Account } from '../../generated/schema'
import { addToGlobalAccounts, createAccount, isSystemAccount, loadOrCreateGlobalAccounts } from '../domain/Account'
import { loadOrCreateTokenBalance } from '../domain/TokenBalance'
import { loadOrCreateToken } from '../domain/Token'
import { push } from '../util/array'

// the supply order is the first contact an investor has with tinlake
export function handleSupplyOrder(call: SupplyOrderCall): void {
  let token = call.to.toHex()
  let poolId = dataSource.context().getString('id')
  log.debug('handle supply order for token {}', [token.toString()])

  let account = call.inputs.usr.toHex()
  let amount = call.inputs.newSupplyAmount

  // protection from adding system account to internal tracking
  if (!isSystemAccount(poolId, account)) {
    if (Account.load(account) == null) {
      createAccount(account)
    }
    addToGlobalAccounts(account)
    // add to token owners
    let tk = loadOrCreateToken(token)
    tk.owners = push(tk.owners, account)
    tk.save()

    let tokenBalance = loadOrCreateTokenBalance(account, token)
    tokenBalance.pendingSupplyCurrency = amount
    tokenBalance.save()
  }
}
