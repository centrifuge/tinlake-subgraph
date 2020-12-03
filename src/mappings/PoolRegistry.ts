import { log, Bytes, ipfs, json } from '@graphprotocol/graph-ts'
import { PoolCreated, PoolUpdated } from '../../generated/PoolRegistry/PoolRegistry'
import { createPool, createPoolHandlers, createUpdatedPoolHandlers } from '../domain/Pool'
import { addPoolToRegistry, createPoolRegistry } from '../domain/PoolRegistry'
import { updatePoolAddresses } from '../domain/PoolAddresses'
import { preloadedPoolByIPFSHash } from '../preloadedPools'
import { Pool, PoolAddresses, PoolRegistry } from '../../generated/schema'
import { registryAddress } from '../config'

export function handlePoolCreated(call: PoolCreated): void {
  log.debug('handlePoolCreated: pool: {}, live: {}, name: {},  data: {}', [
    call.params.pool.toHexString(),
    call.params.live ? 'true' : 'false',
    call.params.name,
    call.params.data,
  ])

  // Only add if the pool isn't preloaded
  if (!preloadedPoolByIPFSHash.has(call.params.data)) {
    log.debug('handlePoolCreated: pool not preloaded {}', [call.params.data])
    loadPoolFromIPFS(call.params.data)
  } else {
    log.debug('handlePoolCreated: pool is preloaded, skipping {}', [call.params.data])
  }
}

/**
 * TODO: removing data source templates is not possible, so what we probably should do is to check
 * which addresses changed, and if any did, then create new data source templates just for those which changed.
 * This way, you don't get any duplicates, and the old + new addresses will both be handled.
 */
export function handlePoolUpdated(call: PoolUpdated): void {
  log.debug('handlePoolUpdated: pool: {}, live: {}, name: {}, data: {}', [
    call.params.pool.toHexString(),
    call.params.live ? 'true' : 'false',
    call.params.name,
    call.params.data,
  ])
  let poolId = call.params.pool.toHexString()
  let hash = call.params.data
  let oldPoolAddresses = PoolAddresses.load(poolId)

  // Update pool addresses
  let data = ipfs.cat(hash)
  if (data == null) {
    log.error('handlePoolUpdated: IPFS data is null - hash {}', [hash])
    return
  }

  let obj = json.fromBytes(data as Bytes).toObject()
  let addresses = obj.get('addresses').toObject()
  let newPoolAddresses = updatePoolAddresses(poolId, addresses)

  // Create new pool handlers for the addresses that changed
  createUpdatedPoolHandlers(oldPoolAddresses, newPoolAddresses)
}

export function loadPoolFromIPFS(hash: string): void {
  log.debug('loadPoolFromIPFS: {}', [hash])

  if (PoolRegistry.load(registryAddress) == null) {
    log.debug('loadPoolFromIPFS: create pool registry {}', [registryAddress])
    createPoolRegistry()
  }

  let data = ipfs.cat(hash)
  if (data == null) {
    log.error('loadPoolFromIPFS: IPFS data is null - hash {}', [hash])
    return
  }

  let obj = json.fromBytes(data as Bytes).toObject()
  let metadata = obj.get('metadata').toObject()
  let addresses = obj.get('addresses').toObject()

  if (metadata == null || addresses == null) {
    log.error('loadPoolFromIPFS: metadata or addresses is null - hash {}', [hash])
    return
  }

  let poolId = addresses.get('ROOT_CONTRACT').toString()
  let shortName = metadata.get(metadata.isSet('shortName') ? 'shortName' : 'name').toString()

  let poolAddresses = updatePoolAddresses(poolId, addresses)
  createPool(poolId, shortName, poolAddresses)
  createPoolHandlers(poolAddresses)
  addPoolToRegistry(poolId)
}
