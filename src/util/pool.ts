import { BigInt, log } from '@graphprotocol/graph-ts'

export function seniorToJuniorRatio(seniorRatio: BigInt): BigInt {
  return BigInt.fromI32(10)
    .pow(27)
    .minus(seniorRatio)
}
