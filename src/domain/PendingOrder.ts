import { BigInt } from '@graphprotocol/graph-ts'
import { PendingOrder } from '../../generated/schema'

export function loadOrCreatePendingOrder(address: string, poolId: string): PendingOrder {
  let pending = PendingOrder.load(address.concat(poolId))
  if (pending == null) {
    pending = new PendingOrder(address.concat(poolId))
    pending.pool = poolId
    pending.account = address
    pending.amountPendingSenior = BigInt.fromI32(0)
    pending.amountPendingJunior = BigInt.fromI32(0)
    pending.save()
  }
  return <PendingOrder>pending
}

// if the user has a pending order in this pool
// need the senior or junior token value
export function checkPendingOrders(user: string, pool: string): void {
  let po = loadOrCreatePendingOrder(user, pool)
}
