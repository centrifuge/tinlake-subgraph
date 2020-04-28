import { log, BigInt, EthereumBlock, Address } from "@graphprotocol/graph-ts"
import { Pile } from '../generated/Block/Pile'
import { IssueCall, CloseCall, BorrowCall } from "../generated/Shelf/Shelf"
import { Ceiling } from "../generated/Block/Ceiling"
import { Assessor } from "../generated/Block/Assessor"
import { SeniorTranche } from "../generated/Block/SeniorTranche"
import { SetCall } from "../generated/Threshold/ThresholdLike"
import { Pool, Loan } from "../generated/schema"
import { loanIdFromPoolIdAndIndex, loanIndexFromLoanId } from "./typecasts"
import { poolMetas } from "./poolMetas"
import { poolIdFromShelf, poolIdFromThreshold } from "./poolMetasUtil"

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
    let ceiling = Ceiling.bind(<Address>Address.fromHexString(poolMeta.ceiling))
    let assessor = Assessor.bind(<Address>Address.fromHexString(poolMeta.assessor))
    let senior = SeniorTranche.bind(<Address>Address.fromHexString(poolMeta.senior))

    let totalDebt = BigInt.fromI32(0)
    let totalWeightedDebt = BigInt.fromI32(0)

    // iterate through all loans of the pool
    for (let j = 0; j < pool.loans.length; j++) {
      let loans = pool.loans
      let loanId = loans[j]

      log.debug("will query debt for loanId {}, loanIndex {}", [loanId, loanIndexFromLoanId(loanId).toString()])

      let debt = pile.debt(loanIndexFromLoanId(loanId))
      let interest = pile.loanRates(loanIndexFromLoanId(loanId))
      let ceil = ceiling.ceiling(loanIndexFromLoanId(loanId))
      log.debug("will update loan {}: debt {} ceiling {} ", [loanId, debt.toString(), ceil.toString()])

      // update loan
      let loan = Loan.load(loanId)
      if (loan == null) {
        log.critical("loan {} not found", [loanId])
      }

      loan.debt = debt
      loan.interestRatePerSecond = interest
      loan.ceiling = ceil
      loan.save()

      totalDebt = totalDebt.plus(debt)
      totalWeightedDebt = debt.times(interest)
    }

    let minJuniorRatio = assessor.minJuniorRatio()
    let currentJuniorRatio = assessor.currentJuniorRatio()
    // Weighted interest rate - sum(interest * debt) / sum(debt) (block handler)
    let weightedInterestRate = totalDebt.gt(BigInt.fromI32(0)) ? totalWeightedDebt.div(totalDebt) : BigInt.fromI32(0)
    // update pool values 
    pool.totalDebt = totalDebt
    pool.minJuniorRatio = minJuniorRatio
    pool.currentJuniorRatio = currentJuniorRatio
    pool.weightedInterestRate = weightedInterestRate
    // check if senior tranche exists
    if (poolMeta.senior !== '0x0000000000000000000000000000000000000000') {
      let seniorDebt = senior.debt();
      pool.seniorDebt = seniorDebt
      log.debug("will update seniorDebt {}", [seniorDebt.toString()])
    }
    log.debug("will update pool {}: totalDebt {} minJuniorRatio {} cuniorRatio {} weightedInterestRate {}", [poolMeta.id, totalDebt.toString(), minJuniorRatio.toString(), currentJuniorRatio.toString(), weightedInterestRate.toString()])
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
    pool.seniorDebt = BigInt.fromI32(0)
    pool.minJuniorRatio = BigInt.fromI32(0)
    pool.currentJuniorRatio = BigInt.fromI32(0)
    pool.weightedInterestRate = BigInt.fromI32(0)
    pool.totalRepaysCount = 0
    pool.totalRepaysAggregatedAmount = BigInt.fromI32(0)
    pool.totalBorrowsCount = 0
    pool.totalBorrowsAggregatedAmount = BigInt.fromI32(0)
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
  loan.nftId = nftId.toString()
  loan.nftRegistry = nftRegistry

  log.debug("will save loan {} (pool: {}, index: {}, owner: {}, opened {})", [loan.id, loan.pool, loanIndex.toString(),
    loan.owner.toHex(), call.block.timestamp.toString()])
  loan.save()
}

// handleShelfClose handles closing of a loan
export function handleShelfClose(call: CloseCall): void {
  log.debug(`handle shelf {} close`, [call.to.toHex()]);

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

  let pool = Pool.load(poolId)
  if (pool == null) {
    log.error("pool {} not found", [poolId])
    return
  }

  pool.totalBorrowsCount = pool.totalBorrowsCount + 1
  pool.totalBorrowsAggregatedAmount = pool.totalBorrowsAggregatedAmount.plus(amount)
  pool.save()
}

// handleShelfRepay handles repaying a loan
export function handleShelfRepay(call: BorrowCall): void {
  log.debug(`handle shelf {} repay`, [call.to.toHex()]);

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

  let pool = Pool.load(poolId)
  if (pool == null) {
    log.error("pool {} not found", [poolId])
    return
  }

  pool.totalRepaysCount = pool.totalRepaysCount + 1
  pool.totalRepaysAggregatedAmount = pool.totalRepaysAggregatedAmount.plus(amount)
  pool.save()
}

// handleThresholdSet handles changing the threshold of a loan
export function handleThresholdSet(call: SetCall): void {
  log.debug(`handle threshold set`, [call.to.toHex()]);

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
