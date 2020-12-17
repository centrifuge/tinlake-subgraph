import { log, dataSource, store } from '@graphprotocol/graph-ts'
import { SupplyOrderCall, RedeemOrderCall } from '../../generated/templates/Tranche/Tranche'
import { Account, PoolAddresses } from '../../generated/schema'
import { loadOrCreatePendingOrder } from '../domain/PendingOrder'
import { createAccount, isSystemAccount, loadOrCreateGlobalAccounts } from '../domain/Account'

// the supply order is the first thing that someone does in tinlake
// so they will not have a token balance..
// but the supply order is only interesting the rewards context
export function handleSupplyOrder(call: SupplyOrderCall): void {
  // the token address...
  let to = call.to.toHex()
  let poolId = dataSource.context().getString('id')
  let addresses = PoolAddresses.load(poolId)

  log.debug('handle supply order: to {}', [to.toString()])
  log.debug('handle supply order: poolId {}', [poolId.toString()])

  let account = call.inputs.usr.toHex()

  // protection from adding system account to internal tracking
  // todo: but i think that none of the tinlake accounts would be doing supply orders..
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

    let pendingOrder = loadOrCreatePendingOrder(account, poolId)
    if (to == addresses.seniorToken) {
      pendingOrder.amountPendingSenior = pendingOrder.amountPendingSenior.plus(amount)
    } else {
      pendingOrder.amountPendingJunior = pendingOrder.amountPendingJunior.plus(amount)
    }
    pendingOrder.save()
  }
}

export function handleRedeemOrder(call: RedeemOrderCall): void {
  let to = call.to.toHex()
  let poolId = dataSource.context().getString('id')
  log.debug('handle redeem order: to {}', [to.toString()])
  log.debug('handle redeem order: poolId {}', [poolId.toString()])

  let addresses = PoolAddresses.load(poolId)
  let account = call.inputs.usr.toHex()
  let amount = call.inputs.newRedeemAmount
  let pendingOrder = loadOrCreatePendingOrder(account, poolId)

  if (to == addresses.seniorToken) {
    pendingOrder.amountPendingSenior = pendingOrder.amountPendingSenior.minus(amount)
  } else {
    pendingOrder.amountPendingJunior = pendingOrder.amountPendingJunior.minus(amount)
  }

  // if the amount becomes 0, remove the pending order from the store
  if (pendingOrder.amountPendingSenior.plus(pendingOrder.amountPendingJunior).isZero()) {
    log.debug('handle redeem order: removing from store {}', [pendingOrder.amountPendingSenior.toString()])
    log.debug('handle redeem order: removing from store {}', [pendingOrder.amountPendingJunior.toString()])
    store.remove('PendingOrder', account.concat(poolId))
  } else {
    pendingOrder.save()
  }
}
