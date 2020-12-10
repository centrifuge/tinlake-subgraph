import { log, BigInt, Address, dataSource } from '@graphprotocol/graph-ts'
import { SupplyOrderCall, RedeemOrderCall } from '../../generated/templates/Tranche/Tranche'
import { PendingOrder } from '../../generated/schema'
import { loadOrCreatePendingOrder } from '../domain/PendingOrder'

// i think these are data sources...
// needs data source context

// the supply order is the first thing that someone does
// in tinlake
// so they will not have a token balance..

// i think i want the pending orders by pool?
// because it will have the token price
// so i can calculate their pre-disburse rewards

export function handleSupplyOrder(call: SupplyOrderCall): void {
  let from = call.from
  let to = call.to

  log.debug('handle supply order: to {}', [to.toString()])

  let account = call.inputs.usr
  let amount = call.inputs.newSupplyAmount

  let pendingOrder = loadOrCreatePendingOrder(account.toString())
  pendingOrder.amountPending = pendingOrder.amountPending.plus(amount)
  pendingOrder.save()
}

export function handleRedeemOrder(call: RedeemOrderCall): void {
  let from = call.from
  let to = call.to

  log.debug('handle redeem order: to {}', [to.toString()])

  let account = call.inputs.usr
  let amount = call.inputs.newRedeemAmount

  let pendingOrder = loadOrCreatePendingOrder(account.toString())
  pendingOrder.amountPending = pendingOrder.amountPending.minus(amount)
  pendingOrder.save()
}
