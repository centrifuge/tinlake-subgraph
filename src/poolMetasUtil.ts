import { Address, log } from "@graphprotocol/graph-ts"
import { poolMetaByShelf, poolMetaByPile, poolMetaByCeiling, poolMetaByThreshold } from "./poolMetas"

export function poolFromShelf(shelf: Address): PoolMeta {
  if (!poolMetaByShelf.has(shelf.toHex())) {
    log.critical("poolMeta not found for shelf {}", [shelf.toHex()])
  }
  let poolMeta = poolMetaByShelf.get(shelf.toHex())
  return poolMeta
}

export function poolFromPile(pile: Address): PoolMeta {
  if (!poolMetaByPile.has(pile.toHex())) {
    log.critical("poolMeta not found for pile {}", [pile.toHex()])
  }
  let poolMeta = poolMetaByPile.get(pile.toHex())
  return poolMeta
}

export function poolFromCeiling(ceiling: Address): PoolMeta {
  if (!poolMetaByCeiling.has(ceiling.toHex())) {
    log.critical("poolMeta not found for ceiling {}", [ceiling.toHex()])
  }
  let poolMeta = poolMetaByCeiling.get(ceiling.toHex())

  return poolMeta
}

export function poolFromThreshold(threshold: Address): PoolMeta {
  if (!poolMetaByThreshold.has(threshold.toHex())) {
    log.critical("poolMeta not found for threshold {}", [threshold.toHex()])
  }
  let poolMeta = poolMetaByThreshold.get(threshold.toHex())

  return poolMeta
}
