import { Address, log } from "@graphprotocol/graph-ts"
import { poolMetaByShelf, poolMetaByPile, poolMetaByCeiling, poolMetaByThreshold } from "./poolMetas"

export function poolIdFromShelf(shelf: Address): string {
  if (!poolMetaByShelf.has(shelf.toHex())) {
    log.critical("poolMeta not found for shelf {}", [shelf.toHex()])
  }
  let poolMeta = poolMetaByShelf.get(shelf.toHex())

  return poolMeta.id
}

export function poolIdFromPile(pile: Address): string {
  if (!poolMetaByPile.has(pile.toHex())) {
    log.critical("poolMeta not found for pile {}", [pile.toHex()])
  }
  let poolMeta = poolMetaByPile.get(pile.toHex())

  return poolMeta.id
}

export function poolIdFromCeiling(ceiling: Address): string {
  if (!poolMetaByCeiling.has(ceiling.toHex())) {
    log.critical("poolMeta not found for ceiling {}", [ceiling.toHex()])
  }
  let poolMeta = poolMetaByCeiling.get(ceiling.toHex())

  return poolMeta.id
}

export function poolIdFromThreshold(threshold: Address): string {
  if (!poolMetaByThreshold.has(threshold.toHex())) {
    log.critical("poolMeta not found for threshold {}", [threshold.toHex()])
  }
  let poolMeta = poolMetaByThreshold.get(threshold.toHex())

  return poolMeta.id
}
