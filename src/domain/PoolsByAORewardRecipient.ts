import { PoolsByAORewardRecipient } from '../../generated/schema'
import { log, store } from '@graphprotocol/graph-ts'
import { PoolAddresses } from '../../generated/schema'
import { pushUnique } from '../util/array'

export function loadOrCreatePoolsByAORewardRecipient(recipient: string): PoolsByAORewardRecipient {
  let p = PoolsByAORewardRecipient.load(recipient)
  if (!p) {
    p = new PoolsByAORewardRecipient(recipient)
    p.pools = []
    p.save()
  }
  return <PoolsByAORewardRecipient>p
}

export function removePoolFromPoolsByAORewardRecipient(
  pool: string,
  p: PoolsByAORewardRecipient
): PoolsByAORewardRecipient {
  p.pools = filter(p,pool)
  return p
}

// AssemblyScript doesn't support closures so we need our own filter function
function filter(p: PoolsByAORewardRecipient, pool: string):string[] {
  let output: string[] = []
  for (let i = 0; i<p.pools.length; i++) {
    if (p.pools[i] != pool) {
      output.push(p.pools[i])
    }
  }
  return output
}

export function addPoolsByAORewardRecipient(addr: PoolAddresses): void {
  log.info('addPoolsByAORewardRecipient: pool: {}, recipient: {}', [addr.id.toString(), addr.aoRewardRecipient as string])

  // add pool to new recipient
  if (addr.aoRewardRecipient != null) {
    let p = loadOrCreatePoolsByAORewardRecipient(addr.aoRewardRecipient as string)
    p.pools = pushUnique(p.pools, addr.id)
    p.save()
  }
}

export function updatePoolsByAORewardRecipient(oldAddr: PoolAddresses, addr: PoolAddresses): void {
  log.info('updatePoolsByAORewardRecipient: pool: {}, old recipient: {}, new recipient: {}', [
    oldAddr.id.toString(),
    oldAddr.aoRewardRecipient as string,
    addr.aoRewardRecipient as string,
  ])
  if (oldAddr.aoRewardRecipient == addr.aoRewardRecipient) {
    return
  }

  // remove pool from old recipient
  if (oldAddr.aoRewardRecipient != null) {
    let p = loadOrCreatePoolsByAORewardRecipient(oldAddr.aoRewardRecipient as string)
    p = removePoolFromPoolsByAORewardRecipient(oldAddr.id, p)

    // if the pool was the last entry in the list of pools, remove the entity
    if (p.pools.length === 0) {
      store.remove('PoolsByAORewardRecipient', oldAddr.aoRewardRecipient as string)
    }
    // else just save it
    else {
      p.save()
    }
  }

  // add pool to new recipient
  if (addr.aoRewardRecipient != null) {
    let p = loadOrCreatePoolsByAORewardRecipient(addr.aoRewardRecipient as string)
    p.pools = pushUnique(p.pools, addr.id)
    p.save()
  }
}
