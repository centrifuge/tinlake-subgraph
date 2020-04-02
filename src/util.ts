import { BigInt, Bytes } from "@graphprotocol/graph-ts"

export function idToBigInt(id: string): BigInt {
    return BigInt.fromUnsignedBytes(<Bytes>Bytes.fromHexString(id))
}