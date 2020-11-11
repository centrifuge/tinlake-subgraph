import { log, Bytes, ipfs, json } from '@graphprotocol/graph-ts'
import { PoolCreated } from '../../generated/PoolRegistry/PoolRegistry'

// handlePoolCreated handles creating pools from the registry
export function handlePoolCreated(call: PoolCreated): void {
  log.error('handlePoolCreated, pool: {}, live: {}, name: {},  data: {}', [
    call.params.pool.toHexString(),
    call.params.live ? 'true' : 'false',
    call.params.name,
    call.params.data,
  ])

  // TODO: this still uses poolMetas, but we should actually pull all information from the registry
  // createPool(call.params.pool.toHexString())

  log.error('ipfs hash: {}', [call.params.data])
  let data = ipfs.cat(call.params.data)
  // let obj = json.fromBytes(data).toObject().entries.toString()
  if (data == null) {
    log.error('data is null', [])
    return
  }
  let obj = json.fromBytes(data as Bytes).toObject()
  let addresses = obj.get('addresses').toObject()

  if (addresses == null) {
    log.error('addresses is null', [])
    return
  }

  let shortName = obj.get(obj.isSet('shortName') ? 'shortName' : 'name').toString()

  let seniorTranche = addresses.get('SENIOR_TRANCHE').toString()

  //   id: addresses
  //     .get("ROOT_CONTRACT")
  //     .toString()
  //     .toLowerCase(),
  //   shelf: addresses
  //     .get("SHELF")
  //     .toString()
  //     .toLowerCase(),
  //   pile: addresses
  //     .get("PILE")
  //     .toString()
  //     .toLowerCase(),
  //   nftFeed: addresses
  //     .get("FEED")
  //     .toString()
  //     .toLowerCase(),
  //   assessor: addresses
  //     .get("ASSESSOR")
  //     .toString()
  //     .toLowerCase(),
  //   seniorTranche: addresses
  //     .get("SENIOR_TRANCHE")
  //     .toString()
  //     .toLowerCase(),
  //   networkId: obj.get("network").toString(),
  //   version: 2, // TODO
  // }

  log.error('ipfs data, name: {}, seniorTranche: {}', [shortName, seniorTranche])

  //   AssessorTemplate.create(call.params.pool);
}
