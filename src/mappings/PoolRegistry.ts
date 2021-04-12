import { log, Bytes, ipfs, json } from '@graphprotocol/graph-ts'
import { PoolCreated, PoolUpdated } from '../../generated/PoolRegistry/PoolRegistry'
import { createPool, createPoolHandlers, createUpdatedPoolHandlers } from '../domain/Pool'
import { addPoolToRegistry, createPoolRegistry } from '../domain/PoolRegistry'
import { updatePoolAddresses } from '../domain/PoolAddresses'
import { preloadedPoolByIPFSHash } from '../preloadedPools'
import { PoolAddresses, PoolRegistry } from '../../generated/schema'
import { registryAddress } from '../config'
import { toLowerCaseAddress } from '../util/toLowerCaseAddress'

export function handlePoolCreated(call: PoolCreated): void {
  log.debug('handlePoolCreated: pool: {}, live: {}, name: {},  data: {}', [
    call.params.pool.toHexString(),
    call.params.live ? 'true' : 'false',
    call.params.name,
    call.params.data,
  ])

  if (!call.params.live || call.params.name == 'registry') {
    log.debug('handlePoolCreated: pool not live or registry {}', [call.params.data])
    return
  }

  // Only add if the pool isn't preloaded
  if (!preloadedPoolByIPFSHash.has(call.params.data)) {
    log.debug('handlePoolCreated: pool not preloaded {}', [call.params.data])
    loadPoolFromIPFS(call.params.data)
  } else {
    log.debug('handlePoolCreated: pool is preloaded, skipping {}', [call.params.data])
  }
}

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

  if (oldPoolAddresses == null) {
    // If handling the PoolCreated event failed (e.g. due to a missing hash), then we will try to create it here
    log.error('handlePoolUpdated: could not load old pool addresses, attempting to create a new pool', [])
    loadPoolFromIPFS(call.params.data)
    return
  }

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
  createUpdatedPoolHandlers(oldPoolAddresses as PoolAddresses, newPoolAddresses)
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

  let poolId = toLowerCaseAddress(addresses.get('ROOT_CONTRACT').toString())
  let shortName = metadata.get(metadata.isSet('shortName') ? 'shortName' : 'name').toString()

  let poolAddresses = updatePoolAddresses(poolId, addresses)
  createPool(poolId, shortName, poolAddresses)
  createPoolHandlers(poolAddresses)
  addPoolToRegistry(poolId)
}
