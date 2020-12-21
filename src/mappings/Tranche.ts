import { log, dataSource, store } from '@graphprotocol/graph-ts'
import { SupplyOrderCall } from '../../generated/templates/Tranche/Tranche'
import { Account, PoolAddresses, Token } from '../../generated/schema'
import { createAccount, isSystemAccount, loadOrCreateGlobalAccounts } from '../domain/Account'
import { loadOrCreateTokenBalance } from '../domain/TokenBalance'
import { loadOrCreateRewardDayTotal } from '../domain/Reward'
import { loadOrCreateToken } from '../domain/Token'

// the supply order is the first thing that someone does in tinlake
// so they will not have a token balance..
export function handleSupplyOrder(call: SupplyOrderCall): void {
  // the token address...
  let token = call.to.toHex()
  let poolId = dataSource.context().getString('id')
  let addresses = PoolAddresses.load(poolId)

  log.debug('handle supply order: to {}', [token.toString()])
  log.debug('handle supply order: poolId {}', [poolId.toString()])

  let account = call.inputs.usr.toHex()

  // protection from adding system account to internal tracking
  if (!isSystemAccount(poolId, account)) {
    let amount = call.inputs.newSupplyAmount

    if (Account.load(account) == null) {
      createAccount(account)
    }
    let globalAccounts = loadOrCreateGlobalAccounts('1')

    if (!globalAccounts.accounts.includes(account)) {
      let temp = globalAccounts.accounts
      temp.push(account)
      globalAccounts.accounts = temp
      globalAccounts.save()
    }

    // add to token owners
    // todo: stop RepeatingYourself
    let tk = loadOrCreateToken(token)
    if (!tk.owners.includes(account)) {
      let temp = tk.owners
      temp.push(account)
      tk.owners = temp
      tk.save()
    }

    let tokenBalance = loadOrCreateTokenBalance(account.concat(token), token, account)
    tokenBalance.pendingSupplyCurrency = amount
    tokenBalance.save()
  }
}
