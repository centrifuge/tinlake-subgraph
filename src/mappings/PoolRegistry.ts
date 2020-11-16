import { log, Bytes, ipfs, json } from '@graphprotocol/graph-ts'
import { PoolCreated, PoolUpdated } from '../../generated/PoolRegistry/PoolRegistry'
import { createPool, createPoolHandlers } from '../domain/Pool'
import { Pool } from '../../generated/schema'
import { addPoolToRegistry } from '../domain/PoolRegistry'
import { createPoolAddresses } from '../domain/PoolAddresses'

export function handlePoolCreated(call: PoolCreated): void {
  log.debug('handlePoolCreated: pool: {}, live: {}, name: {},  data: {}', [
    call.params.pool.toHexString(),
    call.params.live ? 'true' : 'false',
    call.params.name,
    call.params.data,
  ])

  // Only add if the pool wasn't already created before, through preloadedPools in handleBlock
  let existingPool = Pool.load(call.params.pool.toHexString())
  if (existingPool == null) {
    loadPoolFromIPFS(call.params.data)
  }
}

/**
 * TODO: removing data source templates is not possible, so what we probably should do is to check
 * which addresses changed, and if any did, then create new data source templates just for those which changed.
 * This way, you don't get any duplicates, and the old + new addresses will both be handled.
 */
export function handlePoolUpdated(call: PoolUpdated): void {
  log.debug('handlePoolUpdated: pool: {}, live: {}, name: {},  data: {}', [
    call.params.pool.toHexString(),
    call.params.live ? 'true' : 'false',
    call.params.name,
    call.params.data,
  ])
}


export function loadPoolFromIPFS(hash: string): void {
  log.debug('loadPoolFromIPFS: {}', [hash])

  let data = ipfs.cat(hash)
  if (data == null) {
    log.error('loadPoolFromIPFS: IPFS data is null, hash {}', [hash])
    return
  }

  let obj = json.fromBytes(data as Bytes).toObject()
  let metadata = obj.get('metadata').toObject()
  let addresses = obj.get('addresses').toObject()

  if (metadata == null || addresses == null) {
    log.error('loadPoolFromIPFS: metadata or addresses is null, hash {}', [hash])
    return
  }

  let poolId = addresses.get('ROOT_CONTRACT').toString()
  let shortName = metadata.get(metadata.isSet('shortName') ? 'shortName' : 'name').toString()

  let poolAddresses = createPoolAddresses(poolId, addresses)
  createPool(poolId, shortName, poolAddresses)
  createPoolHandlers(poolAddresses)
  addPoolToRegistry(poolId)
}
