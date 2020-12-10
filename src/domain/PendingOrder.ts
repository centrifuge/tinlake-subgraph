import { BigInt, ethereum } from '@graphprotocol/graph-ts'
import { PendingOrder } from '../../generated/schema'

export function loadOrCreatePendingOrder(address: string): PendingOrder {
  let pending = PendingOrder.load(address)
  if (pending == null) {
    pending = new PendingOrder(address)
    pending.amountPending = BigInt.fromI32(0)
    pending.save()
  }
  return <PendingOrder>pending
}
