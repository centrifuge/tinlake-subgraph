import { BigInt, Bytes, log } from "@graphprotocol/graph-ts"
import { normalizeHexString } from '../util'

export function bigIntToHex(bigInt: BigInt): string {
    return bigInt.toHex() // converts to big endian, 0x prefixed hex encoded string
}

export function hexToBigInt(id: string): BigInt {
    // need to revert, since BigInt expects little endian, but bytes are big endian
    return BigInt.fromUnsignedBytes(<Bytes>Bytes.fromHexString(normalizeHexString(id)).reverse())
}

// loanIdFromPoolIdAndIndex generates a loanId from the given poolId (the hex encoded string of the root contract) and
// the given loanIndex (an incremental value, not unique across all tinlake pools). The resulting loanId is used as the
// identifier in our Graph store
export function loanIdFromPoolIdAndIndex(poolId: string, loanIndex: BigInt): string {
    return poolId + "-" + loanIndex.toHex() // NOTE: template strings are not supported by AssemblyScript
}

// loanIndexFromLoanId extracts the loanIndex (an incremental value, not unique across all tinlake pools) from the given
// loanId, which is used as the identifier in our Graph store
export function loanIndexFromLoanId(loanId: string): BigInt {
    let parts = loanId.split("-")
    if (parts.length != 2) {
        log.critical("loanId did not have to parts: {}", [loanId])
    }

    return hexToBigInt(parts[1])
}
