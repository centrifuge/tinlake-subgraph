import { log, Bytes, ipfs, json } from '@graphprotocol/graph-ts'
import { PoolCreated } from '../../generated/PoolRegistry/PoolRegistry'
import { createPool, createPoolHandlers } from '../domain/Pool'

// handlePoolCreated handles creating pools from the registry
export function handlePoolCreated(call: PoolCreated): void {
  log.error('handlePoolCreated, pool: {}, live: {}, name: {},  data: {}', [
    call.params.pool.toHexString(),
    call.params.live ? 'true' : 'false',
    call.params.name,
    call.params.data,
  ])

  // TODO: check if does not exist already (as in, was created by preloadedPools in handleBlock)

  loadPoolFromIPFS(call.params.data)
}

// TODO reg: handlePoolUpdated(call: PoolUpdated): void {}

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
  createPoolHandlers(shortName, poolId, assessor, shelf, pile, feed, reserve, seniorToken, juniorToken, seniorTranche, juniorTranche)
}
