import { Address, log } from "@graphprotocol/graph-ts"
import { poolMetaByShelf, poolMetaByPile } from "./poolMetas"

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
