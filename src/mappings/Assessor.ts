import { log, dataSource } from '@graphprotocol/graph-ts'
import { FileCall as AssessorFileCall } from '../../generated/Block/Assessor'
import { Pool } from '../../generated/schema'
import { seniorToJuniorRatio } from '../util/pool'

export function handleAssessorFile(call: AssessorFileCall): void {
  let name = call.inputs.name.toString()
  let value = call.inputs.value

  let poolId = dataSource.context().getString('id')
  let pool = Pool.load(poolId)
  if (pool == null) {
    log.error('handleAssessorFile: pool {} not found', [poolId])
    return
  }

  if (name == 'seniorInterestRate') {
    pool.seniorInterestRate = value
    log.debug(`handleAssessorFile: update pool {} - set seniorInterestRate to {}`, [poolId, value.toString()])
  } else if (name == 'maxReserve') {
    pool.maxReserve = value
    log.debug(`handleAssessorFile: update pool {} - set maxReserve to {}`, [poolId, value.toString()])
  } else if (name == 'maxSeniorRatio') {
    // Internally we use senior ratio, while externally we use the junior ratio
    pool.minJuniorRatio = seniorToJuniorRatio(value)
    log.debug(`handleAssessorFile: update pool {} - set minJuniorRatio {}`, [
      poolId,
      seniorToJuniorRatio(value).toString(),
    ])
  } else if (name == 'minSeniorRatio') {
    pool.maxJuniorRatio = seniorToJuniorRatio(value)
    log.debug(`handleAssessorFile: update pool {} - set maxJuniorRatio {}`, [
      poolId,
      seniorToJuniorRatio(value).toString(),
    ])
  } else {
    // Don't save if nothing changed
    return
  }

  pool.save()
}
