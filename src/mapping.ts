import { log, BigInt, EthereumBlock, Address } from "@graphprotocol/graph-ts"
import { Pile, SetRateCall, ChangeRateCall } from '../generated/Pile/Pile'
import { IssueCall, CloseCall, BorrowCall } from "../generated/Shelf/Shelf"
import { Pool, Loan } from "../generated/schema"
import { loanIdFromPoolIdAndIndex, loanIndexFromLoanId } from "./typecasts"
import { poolMetas } from "./poolMetas"
import { poolIdFromPile, poolIdFromShelf } from "./poolMetasUtil"

export function handleBlock(block: EthereumBlock): void {
  log.debug("handleBlock number {}", [block.number.toString()])

  // iterate through all pools
  for (let i = 0; i < poolMetas.length; i++) {
    let poolMeta = poolMetas[i]

    let pool = Pool.load(poolMeta.id)

    if (pool == null) {
      log.debug("pool {} not found", [poolMeta.id.toString()])
      return
    }
    log.debug("pool {} loaded", [poolMeta.id.toString()])

    let pile = Pile.bind(<Address>Address.fromHexString(poolMeta.pile))
    // const shelf = Shelf.bind(Address.fromHexString(poolMeta.shelf))

    let totalDebt = BigInt.fromI32(0)

    // iterate through all loans of the pool
    for (let j = 0; j < pool.loans.length; j++) {
      let loans = pool.loans
      let loanId = loans[j]

      log.debug("will query debt for loanId {}, loanIndex {}", [loanId, loanIndexFromLoanId(loanId).toString()])

      let debt = pile.debt(loanIndexFromLoanId(loanId))

      log.debug("will update loan {}: debt {}", [loanId, debt.toString()])

      // update loan
      let loan = Loan.load(loanId)
      if (loan == null) {
        log.critical("loan {} not found", [loanId])
      }
      loan.debt = debt
      loan.save()

      // add to total debt for pool
      totalDebt = totalDebt.plus(debt)
    }

    log.debug("will update pool {}: totalDebt {}", [poolMeta.id, totalDebt.toString()])

    // save the pool
    pool.totalDebt = totalDebt
    pool.save()
  }
}

// handleShelfIssue handles creating a new/opening a loan
export function handleShelfIssue(call: IssueCall): void {
  // TODO check whether call succeeded ?

  let loanOwner = call.from
  let shelf = call.to
  // let collatoralRegistryId = call.inputs.registry_.toHex()
  // let collateralTokenId = call.inputs.token_.toHex() // unique across all tinlake pools
  let loanIndex = call.outputs.value0 // incremental value, not unique across all tinlake pools

  log.debug("handleShelfIssue, shelf: {}, loanOwner: {}, loanIndex: {}", [shelf.toHex(), loanOwner.toHex(),
    loanIndex.toString()])


  let poolId = poolIdFromShelf(shelf)
  let loanId = loanIdFromPoolIdAndIndex(poolId, loanIndex)

  log.debug("generated poolId {}, loanId {}", [poolId, loanId])

  let pool = Pool.load(poolId)
  let poolChanged = false
  if (pool == null) {
    log.debug("will create new pool poolId {}", [poolId])
    pool = new Pool(poolId)
    // NOTE: need to initialize non-null values
    pool.loans = []
    pool.totalDebt = BigInt.fromI32(0)
    poolChanged = true
  }
  if (!pool.loans.includes(poolId)) { // TODO: maybe optimize by using a binary search on a sorted array instead
    log.debug("will add loan {} to pool {}", [loanId, poolId])
    let loans = pool.loans
    loans.push(loanId)
    pool.loans = loans // NOTE: this needs to be done, see https://thegraph.com/docs/assemblyscript-api#store-api
    poolChanged = true
  }
  if (poolChanged) {
    log.debug("will save pool {}", [pool.id])
    pool.save()
  }

  let loan = new Loan(loanId)
  loan.pool = poolId
  loan.index = loanIndex.toI32()
  loan.owner = loanOwner
  loan.opened = call.block.timestamp.toI32()
  loan.debt = BigInt.fromI32(0)
  loan.borrowsCount = 0
  loan.borrowsAggregatedAmount = BigInt.fromI32(0)
  loan.repaysCount = 0
  loan.repaysAggregatedAmount = BigInt.fromI32(0)

  log.debug("will save loan {} (pool: {}, index: {}, owner: {}, opened {})", [loan.id, loan.pool, loanIndex.toString(),
    loan.owner.toHex(), call.block.timestamp.toString()])
  loan.save()
}

// handleShelfClose handles closing of a loan
export function handleShelfClose(call: CloseCall): void {
  // TODO check whether call succeeded ?

  let loanOwner = call.from
  let shelf = call.to
  let loanIndex = call.inputs.loan // incremental value, not unique across all tinlake pools

  log.debug("handleShelfClose, shelf: {}, loanOwner: {}, loanIndex: {}", [shelf.toHex(), loanOwner.toHex(),
    loanIndex.toString()])

  let poolId = poolIdFromShelf(shelf)
  let loanId = loanIdFromPoolIdAndIndex(poolId, loanIndex)

  log.debug("generated poolId {}, loanId {}", [poolId, loanId])

  // update loan
  let loan = Loan.load(loanId)
  if (loan == null) {
    log.error("loan {} not found", [loanId])
    return
  }
  loan.closed = call.block.timestamp.toI32()
  loan.save()
}

// handleShelfBorrow handles borrowing of a loan
export function handleShelfBorrow(call: BorrowCall): void {
  // TODO check whether call succeeded ?

  let loanOwner = call.from
  let shelf = call.to
  let loanIndex = call.inputs.loan // incremental value, not unique across all tinlake pools
  let amount = call.inputs.currencyAmount

  log.debug("handleShelfBorrow, shelf: {}, loanOwner: {}, loanIndex: {}, amount: {}", [shelf.toHex(), loanOwner.toHex(),
    loanIndex.toString(), amount.toString()])

  let poolId = poolIdFromShelf(shelf)
  let loanId = loanIdFromPoolIdAndIndex(poolId, loanIndex)

  log.debug("generated poolId {}, loanId {}", [poolId, loanId])

  // update loan
  let loan = Loan.load(loanId)
  if (loan == null) {
    log.error("loan {} not found", [loanId])
    return
  }
  loan.borrowsAggregatedAmount = loan.borrowsAggregatedAmount.plus(amount)
  loan.borrowsCount = loan.borrowsCount + 1
  loan.save()
}

// handleShelfRepay handles repaying a loan
export function handleShelfRepay(call: BorrowCall): void {
  // TODO check whether call succeeded ?

  let loanOwner = call.from
  let shelf = call.to
  let loanIndex = call.inputs.loan // incremental value, not unique across all tinlake pools
  let amount = call.inputs.currencyAmount

  log.debug("handleShelfRepay, shelf: {}, loanOwner: {}, loanIndex: {}, amount: {}", [shelf.toHex(), loanOwner.toHex(),
    loanIndex.toString(), amount.toString()])

  let poolId = poolIdFromShelf(shelf)
  let loanId = loanIdFromPoolIdAndIndex(poolId, loanIndex)

  log.debug("generated poolId {}, loanId {}", [poolId, loanId])

  // update loan
  let loan = Loan.load(loanId)
  if (loan == null) {
    log.error("loan {} not found", [loanId])
    return
  }
  loan.repaysAggregatedAmount = loan.repaysAggregatedAmount.plus(amount)
  loan.repaysCount = loan.repaysCount + 1
  loan.save()
}

// handlePileSetRate handles setting the interest rate of a loan
export function handlePileSetRate(call: SetRateCall): void {
  // TODO check whether call succeeded ?

  // let loanOwner = call.from
  let pile = call.to
  let loanIndex = call.inputs.loan // incremental value, not unique across all tinlake pools
  // TODO: rate seems to be just an index/identifier of the interest rate, not the actual interest rate. Verify...
  let rate = call.inputs.rate

  log.debug("handlePileSetRate, pile: {}, loanIndex: {}, rate: {}", [pile.toHex(), loanIndex.toString(),
    rate.toString()])

  let poolId = poolIdFromPile(pile)
  let loanId = loanIdFromPoolIdAndIndex(poolId, loanIndex)

  log.debug("generated poolId {}, loanId {}", [poolId, loanId])

  // update loan
  let loan = Loan.load(loanId)
  if (loan == null) {
    log.error("loan {} not found", [loanId])
    return
  }
  loan.interestRate = rate.toI32()
  loan.save()
}

// handlePileChangeRate handles changing the interest rate of a loan
export function handlePileChangeRate(call: ChangeRateCall): void {
  // TODO check whether call succeeded ?

  // let loanOwner = call.from
  let pile = call.to
  let loanIndex = call.inputs.loan // incremental value, not unique across all tinlake pools
  // TODO: rate seems to be just an index/identifier of the interest rate, not the actual interest rate. Verify...
  let rate = call.inputs.newRate

  log.debug("handlePileChangeRate, pile: {}, loanIndex: {}, rate: {}", [pile.toHex(), loanIndex.toString(),
    rate.toString()])

  let poolId = poolIdFromPile(pile)
  let loanId = loanIdFromPoolIdAndIndex(poolId, loanIndex)

  log.debug("generated poolId {}, loanId {}", [poolId, loanId])

  // update loan
  let loan = Loan.load(loanId)
  if (loan == null) {
    log.error("loan {} not found", [loanId])
    return
  }
  loan.interestRate = rate.toI32()
  loan.save()
}
