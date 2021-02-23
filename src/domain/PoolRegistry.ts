import { log, BigInt } from '@graphprotocol/graph-ts'
import { PoolRegistry } from '../../generated/schema'
import { registryAddress } from '../config'
import { pushUnique } from '../util/array'

export function createPoolRegistry(): void {
  log.debug('createPoolRegistry: {}', [registryAddress])
  let registry = new PoolRegistry(registryAddress)
  registry.pools = []
  registry.save()
}

export function addPoolToRegistry(poolId: string): void {
  let registry = PoolRegistry.load(registryAddress)
  if (registry != null) {
    log.debug('addPoolToRegistry: adding pool {} to registry {}', [poolId, registryAddress])
    let pools = registry.pools
    pools = pushUnique(pools, poolId)
    registry.pools = pools // NOTE: this needs to be done, see https://thegraph.com/docs/assemblyscript-api#store-api
    registry.save()
  }
}

export function getAllPools(): string[] {
  let registry = PoolRegistry.load(registryAddress)
  if (registry == null) {
    return []
  }

  let l = registry.pools.length
  log.debug('getAllPools: returning {} pools', [l.toString()])

  return registry.pools
}
