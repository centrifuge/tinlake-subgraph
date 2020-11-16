import { log } from '@graphprotocol/graph-ts'
import { PoolRegistry } from '../../generated/schema'
import { registryAddress } from '../config'

export function createPoolRegistry(): void {
    log.debug('creating pool registry {}', [registryAddress])
    let pool = new PoolRegistry(registryAddress)
    pool.save()
}

export function addPoolToRegistry(poolId: string): void {
    let registry = PoolRegistry.load(registryAddress)
    if (registry != null) {
        log.debug('adding pool {} to registry {}', [poolId, registryAddress])
        registry.pools.push(poolId)
        registry.save()
    }
}

export function getAllPools(): string[] {
    log.debug('getAllPools {}', [registryAddress])
    let registry = PoolRegistry.load(registryAddress)
    if (registry == null || registry.pools == null) {
        log.debug('getAllPools: registry || registry.pools is null {}', [registryAddress])
      return []
    }

    return registry.pools as string[]
}