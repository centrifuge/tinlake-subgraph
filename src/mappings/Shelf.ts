import { log, BigInt, Address, dataSource } from '@graphprotocol/graph-ts'
import { Pile } from '../../generated/Block/Pile'
import { IssueCall, CloseCall, BorrowCall } from '../../generated/Block/Shelf'
import { NavFeed } from '../../generated/Block/NavFeed'
import { Pool, PoolAddresses, Loan } from '../../generated/schema'
import { loanIdFromPoolIdAndIndex } from '../util/typecasts'

// handleShelfIssue handles creating a new/opening a loan
export function handleShelfIssue(call: IssueCall): void {
  let loanOwner = call.from
  let shelf = call.to
  let nftId = call.inputs.token_
  let nftRegistry = call.inputs.registry_
  let loanIndex = call.outputs.value0 // incremental value, not unique across all tinlake pools

  log.debug('handleShelfIssue: shelf: {}, loanOwner: {}, loanIndex: {},  nftId: {}, nftRegistry: {}', [
    shelf.toHex(),
    loanOwner.toHex(),
    loanIndex.toString(),
    nftId.toString(),
    nftRegistry.toHex(),
  ])

  let poolId = dataSource.context().getString('id')
  let loanId = loanIdFromPoolIdAndIndex(poolId, loanIndex)

  let pool = Pool.load(poolId)

  if (!pool.loans.includes(loanId)) {
    log.debug('handleShelfIssue: will add loan {} to pool {}', [loanId, poolId])
    let loans = pool.loans
    loans.push(loanId)
    pool.loans = loans // NOTE: this needs to be done, see https://thegraph.com/docs/assemblyscript-api#store-api

    log.debug('handleShelfIssue: will save pool {}', [pool.id])
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

  // get risk group and interest rate from navFeed
  let addresses = PoolAddresses.load(poolId)
  let navFeed = NavFeed.bind(<Address>Address.fromHexString(addresses.feed))
  let pile = Pile.bind(<Address>Address.fromHexString(addresses.pile))

  // generate hash from nftId & registry
  let nftHash = navFeed.try_nftID(loanIndex)
  if (nftHash.reverted) {
    log.critical('handleShelfIssue: failed to find nft hash for loan idx {}', [loanIndex.toString()])
    return
  }

  let riskGroup = navFeed.try_risk(nftHash.value)
  if (riskGroup.reverted) {
    log.critical('handleShelfIssue: failed to find risk group for nft hash {}', [nftHash.value.toString()])
    return
  }

  // get maturity date
  let maturityDate = navFeed.try_maturityDate(nftHash.value)
  if (maturityDate.reverted) {
    log.critical('handleShelfIssue: failed to find maturity date for nft hash {}', [nftHash.value.toString()])
    return
  }

  // get ratePerSecond for riskgroup
  let ratePerSecond = pile.try_rates(riskGroup.value)
  if (ratePerSecond.reverted) {
    log.critical('handleShelfIssue: failed to find rates for risk group {}', [riskGroup.value.toString()])
    return
  }
  loan.interestRatePerSecond = ratePerSecond.value.value2
  // set ceiling & threshold based on collateral value
  loan.ceiling = navFeed.ceiling(loanIndex)
  loan.threshold = navFeed.threshold(loanIndex)
  loan.maturityDate = maturityDate.value

  log.debug('handleShelfIssue: will save loan {} (pool: {}, index: {}, owner: {}, opened {})', [
    loan.id,
    loan.pool,
    loanIndex.toString(),
    loan.owner.toHex(),
    call.block.timestamp.toString(),
  ])
  loan.save()
}

// handleShelfClose handles closing of a loan
export function handleShelfClose(call: CloseCall): void {
  let loanOwner = call.from
  let shelf = call.to
  let loanIndex = call.inputs.loan // incremental value, not unique across all tinlake pools

  log.debug('handleShelfClose: shelf: {}, loanOwner: {}, loanIndex: {}', [
    shelf.toHex(),
    loanOwner.toHex(),
    loanIndex.toString(),
  ])

  let poolId = dataSource.context().getString('id')
  let loanId = loanIdFromPoolIdAndIndex(poolId, loanIndex)

  // update loan
  let loan = Loan.load(loanId)
  if (loan == null) {
    log.error('handleShelfClose: loan {} not found', [loanId])
    return
  }
  loan.closed = call.block.timestamp.toI32()
  loan.save()
}

// handleShelfBorrow handles borrowing of a loan
export function handleShelfBorrow(call: BorrowCall): void {
  let loanOwner = call.from
  let shelf = call.to
  let loanIndex = call.inputs.loan // incremental value, not unique across all tinlake pools
  let amount = call.inputs.currencyAmount

  log.debug('handleShelfBorrow: shelf: {}, loanOwner: {}, loanIndex: {}, amount: {}', [
    shelf.toHex(),
    loanOwner.toHex(),
    loanIndex.toString(),
    amount.toString(),
  ])

  let poolId = dataSource.context().getString('id')
  let loanId = loanIdFromPoolIdAndIndex(poolId, loanIndex)

  log.debug('handleShelfBorrow: generated poolId {}, loanId {}', [poolId, loanId])

  // update loan
  let loan = Loan.load(loanId)
  if (loan == null) {
    log.error('handleShelfBorrow: loan {} not found', [loanId])
    return
  }

  loan.borrowsAggregatedAmount = loan.borrowsAggregatedAmount.plus(amount)
  loan.borrowsCount = loan.borrowsCount + 1
  // increase debt here. Reason: debt won't be updated on every block, but we want relatively up-to-date information in
  // the UI
  loan.debt = loan.debt.plus(amount)

  let addresses = PoolAddresses.load(poolId)
  let navFeed = NavFeed.bind(<Address>Address.fromHexString(addresses.feed))
  loan.ceiling = navFeed.ceiling(loanIndex)
  let nftID = navFeed.nftID(loanIndex)
  loan.maturityDate = navFeed.maturityDate(nftID)
  loan.financingDate = call.block.timestamp
  loan.save()

  let pool = Pool.load(poolId)
  if (pool == null) {
    log.error('handleShelfBorrow: pool {} not found', [poolId])
    return
  }

  pool.totalBorrowsCount = pool.totalBorrowsCount + 1
  pool.totalBorrowsAggregatedAmount = pool.totalBorrowsAggregatedAmount.plus(amount)
  pool.totalDebt = pool.totalDebt.plus(amount)
  pool.save()
}

// handleShelfRepay handles repaying a loan
export function handleShelfRepay(call: BorrowCall): void {
  let loanOwner = call.from
  let shelf = call.to
  let loanIndex = call.inputs.loan // incremental value, not unique across all tinlake pools
  let amount = call.inputs.currencyAmount

  log.debug('handleShelfRepay: shelf: {}, loanOwner: {}, loanIndex: {}, amount: {}', [
    shelf.toHex(),
    loanOwner.toHex(),
    loanIndex.toString(),
    amount.toString(),
  ])

  let poolId = dataSource.context().getString('id')
  let loanId = loanIdFromPoolIdAndIndex(poolId, loanIndex)

  // update loan
  let loan = Loan.load(loanId)
  if (loan == null) {
    log.error('handleShelfRepay: loan {} not found', [loanId])
    return
  }
  loan.repaysAggregatedAmount = loan.repaysAggregatedAmount.plus(amount)
  loan.repaysCount = loan.repaysCount + 1
  // decrease debt here. Reason: debt won't be updated on every block, but we want relatively up-to-date information in
  // the UI. Note that debt should not get negative, so we decrease debt (and totalDebt below) maximally by loan.debt
  let debtDecrease = amount.gt(loan.debt) ? loan.debt : amount
  loan.debt = loan.debt.minus(debtDecrease)
  loan.save()

  let pool = Pool.load(poolId)
  if (pool == null) {
    log.error('handleShelfRepay: pool {} not found', [poolId])
    return
  }

  pool.totalRepaysCount = pool.totalRepaysCount + 1
  pool.totalRepaysAggregatedAmount = pool.totalRepaysAggregatedAmount.plus(amount)
  pool.totalDebt = pool.totalDebt.minus(debtDecrease)
  pool.save()
}
