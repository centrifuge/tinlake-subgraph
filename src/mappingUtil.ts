import { BigInt, Address, log } from "@graphprotocol/graph-ts";
import { PoolMeta, poolMetaByShelf, poolMetaByPile, poolMetaByNftFeed, poolMetaBySeniorTranche, poolMetaByAssessor, poolMetaById } from "./poolMetas"

export function poolFromShelf(shelf: Address): PoolMeta {
  if (!poolMetaByShelf.has(shelf.toHex())) {
    log.critical("poolMeta not found for shelf {}", [shelf.toHex()])
  }
  let poolMeta = poolMetaByShelf.get(shelf.toHex())
  return poolMeta
}

export function poolFromId(id: string): PoolMeta {
  if (!poolMetaById.has(id)){
    log.critical("poolMeta not found for id {}", [id])
  }
  let poolMeta = poolMetaById.get(id)
  return poolMeta
}

export function poolFromPile(pile: Address): PoolMeta {
  if (!poolMetaByPile.has(pile.toHex())) {
    log.critical("poolMeta not found for pile {}", [pile.toHex()])
  }
  let poolMeta = poolMetaByPile.get(pile.toHex())
  return poolMeta
}

export function poolFromNftFeed(nftFeed: Address): PoolMeta {
  if (!poolMetaByNftFeed.has(nftFeed.toHex())) {
    log.critical("poolMeta not found for nftFeed {}", [nftFeed.toHex()])
  }
  let poolMeta = poolMetaByNftFeed.get(nftFeed.toHex())
  return poolMeta
}

export function poolFromSeniorTranche(seniorTranche: Address): PoolMeta {
  if (!poolMetaBySeniorTranche.has(seniorTranche.toHex())) {
    log.critical("poolMeta not found for seniorTranche {}", [seniorTranche.toHex()])
  }
  let poolMeta = poolMetaBySeniorTranche.get(seniorTranche.toHex())
  return poolMeta
}

export function poolFromAssessor(assessor: Address): PoolMeta {
  if (!poolMetaByAssessor.has(assessor.toHex())) {
    log.critical("poolMeta not found for assessor {}", [assessor.toHex()])
  }
  let poolMeta = poolMetaByAssessor.get(assessor.toHex())
  return poolMeta
}

export function seniorToJuniorRatio(seniorRatio: BigInt): BigInt {
  return BigInt.fromI32(10).pow(27).minus(seniorRatio);
}
