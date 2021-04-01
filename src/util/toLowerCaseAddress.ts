import { TypedMap, JSONValue, Address } from '@graphprotocol/graph-ts'
import { zeroAddress } from '../config'

export function toLowerCaseAddress(addr: string | null): string {
  if (addr == null) return zeroAddress
  return Address.fromHexString(addr.toString()).toHexString()
}
