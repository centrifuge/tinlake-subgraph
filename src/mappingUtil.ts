import { BigInt, log } from "@graphprotocol/graph-ts";
import { PoolMeta, poolMetaByIdentifier } from "../src/poolMetas";

// poolId or address
export function poolFromIdentifier(id: string): PoolMeta {
  if (!poolMetaByIdentifier.has(id)) {
    log.critical("poolMeta not found for identifier {}", [id])
  }
  let poolMeta = poolMetaByIdentifier.get(id)
  return poolMeta
}

export function seniorToJuniorRatio(seniorRatio: BigInt): BigInt {
  return BigInt.fromI32(10).pow(27).minus(seniorRatio);
}
