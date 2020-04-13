import { log, BigInt, EthereumBlock, Address } from "@graphprotocol/graph-ts"
import { Pile, SetRateCall, ChangeRateCall } from '../generated/Pile/Pile'
import { IssueCall, CloseCall, BorrowCall } from "../generated/Shelf/Shelf"
import { FileCall } from "../generated/Ceiling/Principal"
import { SetCall } from "../generated/Threshold/ThresholdLike"
import { Pool, Loan } from "../generated/schema"
import { loanIdFromPoolIdAndIndex, loanIndexFromLoanId } from "./typecasts"
import { poolMetas } from "./poolMetas"
import { poolIdFromPile, poolIdFromShelf, poolIdFromCeiling, poolIdFromThreshold } from "./poolMetasUtil"

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
  log.debug(`handle shelf {} issue`, [call.to.toHex()]);
 
  let loanOwner = call.from
  let shelf = call.to
  let nftId = call.inputs.token_
  let nftRegistry = call.inputs.registry_
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
  loan.nftId = nftId
  loan.nftRegistry = nftRegistry

  log.debug("will save loan {} (pool: {}, index: {}, owner: {}, opened {})", [loan.id, loan.pool, loanIndex.toString(),
    loan.owner.toHex(), call.block.timestamp.toString()])
  loan.save()
}

// handleShelfClose handles closing of a loan
export function handleShelfClose(call: CloseCall): void {
  log.debug(`handle shelf {} close`, [call.to.toHex()]);
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
  log.debug(`handle shelf {} borrow`, [call.to.toHex()]);
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
  log.debug(`handle shelf {} repay`, [call.to.toHex()]);
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
  log.debug(`pile {} set rate`, [call.to.toHex()]);

  let pileAddress = call.to
  let loanIndex = call.inputs.loan // incremental value, not unique across all tinlake pools
  let rateIndex = call.inputs.rate
  updateInterestRate(pileAddress, loanIndex, rateIndex);
}

// handlePileChangeRate handles changing the interest rate of a loan
export function handlePileChangeRate(call: ChangeRateCall): void {
  log.debug(`pile {} change rate`, [call.to.toHex()]);
  // let loanOwner = call.from
  let pileAddress = call.to
  let loanIndex = call.inputs.loan // incremental value, not unique across all tinlake pools
  let rateIndex = call.inputs.newRate
  updateInterestRate(pileAddress, loanIndex, rateIndex);
}

function updateInterestRate(pileAddress: Address, loanIndex: BigInt, rateIndex: BigInt) : void {
  let pile = Pile.bind(pileAddress)
  // get ratePerSecond for rate group
  let ratePerSecond = pile.rates(rateIndex).value3

  log.debug("handlePileSetRate, pile: {}, loanIndex: {}, rate: {}", [pileAddress.toHex(), loanIndex.toString(),
  ratePerSecond.toString()])

  let poolId = poolIdFromPile(pileAddress)
  let loanId = loanIdFromPoolIdAndIndex(poolId, loanIndex)
  log.debug("generated poolId {}, loanId {}", [poolId, loanId])

  // update loan
  let loan = Loan.load(loanId)
  if (loan == null) {
    log.error("loan {} not found", [loanId])
    return
  }
  loan.interestRate = ratePerSecond
  loan.save()
}

// handleCeilingFile handles changing the ceiling of a loan
export function handleCeilingFile(call: FileCall): void {
  log.debug(`handle ceiling set`, [call.to.toHex()]);
  // TODO check whether call succeeded ?

  // let loanOwner = call.from
  let ceilingContract = call.to
  let loanIndex = call.inputs.loan // incremental value, not unique across all tinlake pools
  let ceiling = call.inputs.principal // TODO how to handle credit line?

  log.debug("handleCeilingFile, ceilingContract: {}, loanIndex: {}, ceiling: {}", [ceilingContract.toHex(),
    loanIndex.toString(), ceiling.toString()])

  let poolId = poolIdFromCeiling(ceilingContract)
  let loanId = loanIdFromPoolIdAndIndex(poolId, loanIndex)

  log.debug("generated poolId {}, loanId {}", [poolId, loanId])

  // update loan
  let loan = Loan.load(loanId)
  if (loan == null) {
    log.error("loan {} not found", [loanId])
    return
  }
  loan.ceiling = ceiling
  loan.save()
}

// handleThresholdSet handles changing the threshold of a loan
export function handleThresholdSet(call: SetCall): void {
  log.debug(`handle threshold set`, [call.to.toHex()]);
  // TODO check whether call succeeded ?

  // let loanOwner = call.from
  let thresholdContract = call.to
  let loanIndex = call.inputs.value0 // incremental value, not unique across all tinlake pools
  let threshold = call.inputs.value1

  log.debug("handleThresholdSet, thresholdContract: {}, loanIndex: {}, threshold: {}", [thresholdContract.toHex(),
    loanIndex.toString(), threshold.toString()])

  let poolId = poolIdFromThreshold(thresholdContract)
  let loanId = loanIdFromPoolIdAndIndex(poolId, loanIndex)

  log.debug("generated poolId {}, loanId {}", [poolId, loanId])

  // update loan
  let loan = Loan.load(loanId)
  if (loan == null) {
    log.error("loan {} not found", [loanId])
    return
  }
  loan.threshold = threshold
  loan.save()
}
