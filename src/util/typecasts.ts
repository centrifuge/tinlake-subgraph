import { BigInt, Bytes, log } from '@graphprotocol/graph-ts'

export function bigIntToHex(bigInt: BigInt): string {
  return bigInt.toHex() // converts to big endian, 0x prefixed hex encoded string
}

// normalizeHexString adds a "0x" prefix and makes the length of the supplied string even by prefixing a 0 if odd
export function normalizeHexString(hex: string): string {
  if (hex.startsWith('0x')) {
    hex = hex.substr(2)
  }
  if (hex.length % 2 == 1) {
    hex = '0' + hex
  }
  return '0x' + hex
}

export function hexToBigInt(id: string): BigInt {
  // need to revert, since BigInt expects little endian, but bytes are big endian
  return BigInt.fromUnsignedBytes(<Bytes>Bytes.fromHexString(normalizeHexString(id)).reverse())
}

// loanIdFromPoolIdAndIndex generates a loanId from the given poolId (the hex encoded string of the root contract) and
// the given loanIndex (an incremental value, not unique across all tinlake pools). The resulting loanId is used as the
// identifier in our Graph store
export function loanIdFromPoolIdAndIndex(poolId: string, loanIndex: BigInt): string {
  return poolId + '-' + loanIndex.toHex() // NOTE: template strings are not supported by AssemblyScript
}

// loanIndexFromLoanId extracts the loanIndex (an incremental value, not unique across all tinlake pools) from the given
// loanId, which is used as the identifier in our Graph store
export function loanIndexFromLoanId(loanId: string): BigInt {
  let parts = loanId.split('-')
  if (parts.length != 2) {
    log.error('loanId did not have two parts: {}', [loanId])
    return BigInt.fromI32(0)
  }

  return hexToBigInt(parts[1])
}
