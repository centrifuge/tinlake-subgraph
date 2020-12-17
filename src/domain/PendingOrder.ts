import { BigInt } from '@graphprotocol/graph-ts'
import { PendingOrder } from '../../generated/schema'

export function loadOrCreatePendingOrder(address: string, poolId: string): PendingOrder {
  let pending = PendingOrder.load(address.concat(poolId))
  if (pending == null) {
    pending = new PendingOrder(address.concat(poolId))
    pending.pool = poolId
    pending.account = address
    pending.amountPending = BigInt.fromI32(0)
    pending.save()
  }
  return <PendingOrder>pending
}
