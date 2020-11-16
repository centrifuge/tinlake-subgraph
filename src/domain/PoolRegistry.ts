import { log } from '@graphprotocol/graph-ts'
import { PoolRegistry } from '../../generated/schema'
import { registryAddress } from '../config'

export function createPoolRegistry(): void {
  log.debug('creating pool registry {}', [registryAddress])
  let registry = new PoolRegistry(registryAddress)
  registry.pools = []
  registry.save()
}

export function addPoolToRegistry(poolId: string): void {
  let registry = PoolRegistry.load(registryAddress)
  if (registry != null) {
    log.debug('adding pool {} to registry {}', [poolId, registryAddress])
    let pools = registry.pools
    pools.push(poolId)
    registry.pools = pools // NOTE: this needs to be done, see https://thegraph.com/docs/assemblyscript-api#store-api
    registry.save()
  }
}

export function getAllPools(): string[] {
  log.debug('getAllPools {}', [registryAddress])
  let registry = PoolRegistry.load(registryAddress)
  if (registry == null) {
    log.debug('getAllPools: registry is null {}', [registryAddress])
    return []
  }
  if (registry.pools == null) {
    log.debug('getAllPools: registry.pools is null {}', [registryAddress])
    return []
  }

  log.debug('getAllPools: returning some pools {}', [registryAddress])
  return registry.pools as string[]
}
