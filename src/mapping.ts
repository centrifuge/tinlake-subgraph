import { log, BigInt, EthereumBlock, Address } from "@graphprotocol/graph-ts"
import { Pile } from '../generated/Pile/Pile'
import { IssueCall, Shelf } from "../generated/Shelf/Shelf"
import { Pool, Loan } from "../generated/schema"
import { idToBigInt } from "./util"
import { poolMetas, poolMetaByShelf } from "./poolMetas"

export function handleBlock(block: EthereumBlock): void {
  log.info("handleBlock number {}", [block.number.toString()])

  // iterate through all pools
  for (let i = 0; i < poolMetas.length; i++) {
    let poolMeta = poolMetas[i]

    let pool = Pool.load(poolMeta.id)

    if (pool == null) {
      log.info("pool {} not found", [poolMeta.id.toString()])
      return
    }
    log.info("pool {} loaded", [poolMeta.id.toString()])

    let pile = Pile.bind(<Address>Address.fromHexString(poolMeta.pile))
    // const shelf = Shelf.bind(Address.fromHexString(poolMeta.shelf))

    let totalDebt = BigInt.fromI32(0)

    // iterate through all loans of the pool
    for (let j = 0; j < pool.loans.length; j++) {
      let loans = pool.loans
      let loanId = loans[j]

      let debt = pile.debt(idToBigInt(loanId))

      log.info("will update loan {}: debt {}", [loanId, debt.toString()])

      // update loan
      let loan = Loan.load(loanId)
      if (loan == null) {
        log.error("loan {} not found", [loanId])
        throw new Error(`loan ${loanId} not found`)
      }
      loan.debt = debt
      loan.save()

      // add to total debt for pool
      totalDebt = totalDebt.plus(debt)
    }

    log.info("will update pool {}: totalDebt {}", [poolMeta.id, totalDebt.toString()])

    // save the pool
    pool.totalDebt = totalDebt
    pool.save()
  }
}

export function handleNewLoan(call: IssueCall): void {
  let loanOwner = call.from
  let shelf = call.to
  // let collatoralRegistryId = call.inputs.registry_.toHex()
  // let collateralTokenId = call.inputs.token_.toHex() // unique across all tinlake pools
  let loanIndex = call.outputs.value0 // incremental value, not unique across all tinlake pools

  log.info("handleNewLoan, shelf: {}", [shelf.toHex()])

  if (!poolMetaByShelf.has(shelf.toHex())) {
    log.error("poolMeta not found for shelf {}", [shelf.toHex()])
    throw new Error(`poolMeta not found for shelf ${shelf.toHex()}`) // NOTE: error message is not used for now
  }
  let poolMeta = poolMetaByShelf.get(shelf.toHex())

  let poolId = poolMeta.id
  let loanId = `${poolId}-${loanIndex.toHex()}`

  log.info("generated poolId {}, loanId", [poolId, loanId])

  let pool = Pool.load(poolId)
  let poolChanged = false
  if (pool == null) {
    log.info("will create new pool poolId {}", [poolId])
    pool = new Pool(poolId)
    poolChanged = true
  }
  if (!pool.loans.includes(loanId)) { // TODO: maybe optimize by using a binary search on a sorted array instead
    log.info("will add loan {} to pool {}", [loanId, poolId])
    pool.loans.push(loanId)
    poolChanged = true
  }
  if (poolChanged) {
    log.info("will save pool {}", [pool.id])
    pool.save()
  }

  let loan = new Loan(loanId)
  loan.pool = poolId
  loan.index = loanIndex.toI32()
  loan.owner = loanOwner
  loan.opened = call.block.timestamp.toI32()
  // loan.borrowedAmount = BigInt.fromI32(0)
  // loan.borrowedCount = BigInt.fromI32(0)
  // loan.repaidAmount = BigInt.fromI32(0)
  // loan.repaidCount = BigInt.fromI32(0)

  log.info("will save loan {} (pool: {}, index: {}, owner: {}, opened {})", [loan.id, loan.pool, loanIndex.toString(),
    loan.owner.toHex(), call.block.timestamp.toString()])
  loan.save()
}
