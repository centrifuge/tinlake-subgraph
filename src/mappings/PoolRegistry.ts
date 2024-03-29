import { log, Bytes, JSONValue, ipfs, json, BigInt } from '@graphprotocol/graph-ts'
import { PoolCreated, PoolUpdated } from '../../generated/PoolRegistry/PoolRegistry'
import { createPool, createPoolHandlers, createUpdatedPoolHandlers } from '../domain/Pool'
import { addPoolToRegistry, createPoolRegistry } from '../domain/PoolRegistry'
import { updatePoolAddresses } from '../domain/PoolAddresses'
import { preloadedPoolByIPFSHash } from '../preloadedPools'
import { PoolAddresses, PoolRegistry } from '../../generated/schema'
import { registryAddress } from '../config'
import { toLowerCaseAddress } from '../util/toLowerCaseAddress'
import { addPoolsByAORewardRecipient, updatePoolsByAORewardRecipient } from '../domain/PoolsByAORewardRecipient'
import { ipfsHashes } from '../ipfs'

export function handlePoolCreated(call: PoolCreated): void {
  if (call.block.number.gt(new BigInt(18586920))) { return }
  log.info('handlePoolCreated: pool: {}, live: {}, name: {},  data: {}', [
    call.params.pool.toHexString(),
    call.params.live ? 'true' : 'false',
    call.params.name,
    call.params.data,
  ])

  if (!call.params.live || call.params.name == 'registry') {
    log.info('handlePoolCreated: pool not live or registry {}', [call.params.data])
    return
  }

  // Only add if the pool isn't preloaded
  if (!preloadedPoolByIPFSHash.has(call.params.data)) {
    log.info('handlePoolCreated: pool not preloaded {}', [call.params.data])
    loadPoolFromIPFS(call.params.data)
  } else {
    log.info('handlePoolCreated: pool is preloaded, skipping {}', [call.params.data])
  }
}

export function handlePoolUpdated(call: PoolUpdated): void {
  if (call.block.number.gt(new BigInt(18586920))) { return }
  log.info('handlePoolUpdated: pool: {}, live: {}, name: {}, data: {}', [
    call.params.pool.toHexString(),
    call.params.live ? 'true' : 'false',
    call.params.name,
    call.params.data,
  ])
  let poolId = call.params.pool.toHexString()
  let hash = call.params.data

  upsertPool(poolId, hash)
}

export function upsertPool(poolId: string, hash: string): void {
  let oldPoolAddresses = PoolAddresses.load(poolId)

  if (!oldPoolAddresses) {
    // If this is a new pool or handling the PoolCreated event failed (e.g. due to a missing hash), then we will try to create it here
    log.error('handlePoolUpdated: could not load old pool addresses, attempting to create a new pool', [])
    loadPoolFromIPFS(hash)
    return
  }

  // Update pool addresses
  // let data = ipfs.cat(hash)
  let data = json.fromString(ipfsHashes).toObject()
  log.info('handlePoolUpdated: Getting IPFS data for hash {}', [hash])
  // add new missing ipfs hash
  if (!data) {
    log.error('handlePoolUpdated: IPFS data is null - hash {}', [hash])
    return
  }
  let obj = (data.get(hash) as JSONValue).toObject()

  // let obj = json.fromBytes(data as Bytes).toObject()
  let addresses = (obj.get('addresses') as JSONValue).toObject()
  // let addresses = data['addresses']
  let newPoolAddresses = updatePoolAddresses(poolId, addresses)

  // Create new pool handlers for the addresses that changed
  createUpdatedPoolHandlers(oldPoolAddresses as PoolAddresses, newPoolAddresses)

  updatePoolsByAORewardRecipient(oldPoolAddresses as PoolAddresses, newPoolAddresses)
}

export function loadPoolFromIPFS(hash: string): void {
  log.info('loadPoolFromIPFS: {}', [hash])

  if (!PoolRegistry.load(registryAddress)) {
    log.info('loadPoolFromIPFS: create pool registry {}', [registryAddress])
    createPoolRegistry()
  }

  // let data = ipfs.cat(hash)
  let data = json.fromString(ipfsHashes).toObject()
  if (!data) {
    log.error('loadPoolFromIPFS: IPFS data is null - hash {}', [hash])
    return
  }

  let obj = (data.get(hash) as JSONValue).toObject()
  let metadata = (obj.get('metadata') as JSONValue).toObject()
  let addresses = (obj.get('addresses') as JSONValue).toObject()

  if (!metadata || !addresses) {
    log.error('loadPoolFromIPFS: metadata or addresses is null - hash {}', [hash])
    return
  }

  let poolId = toLowerCaseAddress((addresses.get('ROOT_CONTRACT') as JSONValue).toString())
  let shortName = (metadata.get(metadata.isSet('shortName') ? 'shortName' : 'name') as JSONValue).toString()

  let poolAddresses = updatePoolAddresses(poolId, addresses)
  createPool(poolId, shortName, poolAddresses)
  createPoolHandlers(poolAddresses)
  addPoolToRegistry(poolId)

  addPoolsByAORewardRecipient(poolAddresses)
}
