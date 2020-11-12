import { log, Bytes, ipfs, json } from '@graphprotocol/graph-ts'
import { PoolCreated } from '../../generated/PoolRegistry/PoolRegistry'
import { createPool, createPoolHandlers } from '../domain/Pool'
import { Pool } from '../../generated/schema'

export function handlePoolCreated(call: PoolCreated): void {
  log.error('handlePoolCreated, pool: {}, live: {}, name: {},  data: {}', [
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
 * TODO handlePoolUpdated(call: PoolUpdated): void {}
 * 
 * Removing data source templates is not possible, so what we probably should do is to
 * check which addresses changed, and if any did, then create new data source templates just for those which changed.
 * This way, you don't get any duplicates, and the old + new addresses will both be handled.
 */

export function loadPoolFromIPFS(hash: string): void {
  log.debug('loading pool from IPFS: {}', [hash])
  
  let data = ipfs.cat(hash)
  if (data == null) {
    log.error('data is null', [])
    return
  }

  let obj = json.fromBytes(data as Bytes).toObject()
  let metadata = obj.get('metadata').toObject()
  let addresses = obj.get('addresses').toObject()

  if (addresses == null) {
    log.error('addresses is null', [])
    return
  }

  let poolId = addresses.get("ROOT_CONTRACT").toString()
  let shortName = metadata.get(metadata.isSet('shortName') ? 'shortName' : 'name').toString()

  let coordinator = addresses.get('COORDINATOR').toString()
  let assessor = addresses.get('ASSESSOR').toString()
  let shelf = addresses.get('SHELF').toString()
  let pile = addresses.get('PILE').toString()
  let feed = addresses.get('FEED').toString()
  let reserve = addresses.get('RESERVE').toString()
  let seniorToken = addresses.get('SENIOR_TOKEN').toString()
  let juniorToken = addresses.get('JUNIOR_TOKEN').toString()
  let seniorTranche = addresses.get('SENIOR_TRANCHE').toString()
  let juniorTranche = addresses.get('JUNIOR_TRANCHE').toString()

  createPool(poolId, shortName, assessor)
  createPoolHandlers(shortName, poolId, coordinator, assessor, shelf, pile, feed, reserve, seniorToken, juniorToken, seniorTranche, juniorTranche)
}
