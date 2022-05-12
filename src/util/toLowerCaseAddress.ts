import { TypedMap, JSONValue, Address } from '@graphprotocol/graph-ts'
import { zeroAddress } from '../config'

export function toLowerCaseAddress(addr: string): string {
  return Address.fromHexString(addr.toString()).toHexString()
}
