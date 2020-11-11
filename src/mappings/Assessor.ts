import { log } from "@graphprotocol/graph-ts"
import { FileCall as AssessorFileCall } from "../../generated/Block/Assessor"
import { Pool } from "../../generated/schema"
import { seniorToJuniorRatio, poolFromIdentifier } from "../util/pool"

export function handleAssessorFile(call: AssessorFileCall): void {
  log.debug(`handle assessor file set`, [call.to.toHex()]);
  let assessor = call.to
  let name = call.inputs.name.toString()
  let value = call.inputs.value

  let poolMeta = poolFromIdentifier(assessor.toHex())
  let poolId = poolMeta.id
  log.debug(`handle assessor file pool Id {}`, [poolId]);

  let pool = Pool.load(poolId)
  if (pool == null) {
    log.error("pool {} not found", [poolId])
    return
  }

  if (name == 'seniorInterestRate') {
    pool.seniorInterestRate = value
    log.debug(`update pool {} - set seniorInterestRate to {}`, [poolId, value.toString()])
  } else if (name == 'maxReserve') {
    pool.maxReserve = value
    log.debug(`update pool {} - set maxReserve to {}`, [poolId, value.toString()])
  } else if (name == 'maxSeniorRatio') {
     // Internally we use senior ratio, while externally we use the junior ratio
    pool.minJuniorRatio = seniorToJuniorRatio(value)
    log.debug(`update pool {} - set minJuniorRatio to 1 - {}`, [poolId, seniorToJuniorRatio(value).toString()])
  } else if (name == 'minSeniorRatio') {
    pool.maxJuniorRatio = seniorToJuniorRatio(value)
    log.debug(`update pool {} - set maxJuniorRatio to 1 - {}`, [poolId, seniorToJuniorRatio(value).toString()])
  } else {
    // Don't save if nothing changed
    return
  }

  pool.save()
}