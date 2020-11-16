import { log, BigInt, Address } from '@graphprotocol/graph-ts'
import { Pile } from '../../generated/Block/Pile'
import { IssueCall, CloseCall, BorrowCall } from '../../generated/Block/Shelf'
import { NftFeed } from '../../generated/Block/NftFeed'
import { Pool, Loan } from '../../generated/schema'
import { loanIdFromPoolIdAndIndex } from '../util/typecasts'
import { poolFromIdentifier } from '../util/pool'
import { createPool } from '../domain/Pool'

// handleShelfIssue handles creating a new/opening a loan
export function handleShelfIssue(call: IssueCall): void {
  log.debug(`handle shelf {} issue`, [call.to.toHex()])

  let loanOwner = call.from
  let shelf = call.to
  let nftId = call.inputs.token_
  let nftRegistry = call.inputs.registry_
  let loanIndex = call.outputs.value0 // incremental value, not unique across all tinlake pools

  log.debug('handleShelfIssue, shelf: {}, loanOwner: {}, loanIndex: {},  nftId: {}, nftRegistry: {}', [
    shelf.toHex(),
    loanOwner.toHex(),
    loanIndex.toString(),
    nftId.toString(),
    nftRegistry.toHex(),
  ])

  let poolMeta = poolFromIdentifier(shelf.toHex())
  let poolId = poolMeta.id
  let loanId = loanIdFromPoolIdAndIndex(poolId, loanIndex)

  log.debug('generated poolId {}, loanId {}', [poolId, loanId])

  let pool = Pool.load(poolId)
  let poolChanged = false
  if (pool == null) {
    createPool(poolId)
    pool = Pool.load(poolId)

    if (pool == null) {
      return
    }

    poolChanged = true
  }
  if (!pool.loans.includes(poolId)) {
    // TODO: maybe optimize by using a binary search on a sorted array instead
    log.debug('will add loan {} to pool {}', [loanId, poolId])
    let loans = pool.loans
    loans.push(loanId)
    pool.loans = loans // NOTE: this needs to be done, see https://thegraph.com/docs/assemblyscript-api#store-api
    poolChanged = true
  }
  if (poolChanged) {
    log.debug('will save pool {}', [pool.id])
    pool.save()
  }

  // TODO: move to createLoan() in ../domain/Loan.ts
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

  // get risk group and interest rate from nftFeed
  let nftFeed = NftFeed.bind(<Address>Address.fromHexString(poolMeta.nftFeed))
  let pile = Pile.bind(<Address>Address.fromHexString(poolMeta.pile))
  // generate hash from nftId & registry
  let nftHash = nftFeed.try_nftID(loanIndex)
  if (nftHash.reverted) {
    if (poolMeta.id == '0x382460db48ee1b84b23d7286cfd7d027c27bb885') {
      log.error('failed to find nft hash for loan idx {}', [loanIndex.toString()])
    } else {
      log.critical('failed to find nft hash for loan idx {}', [loanIndex.toString()])
    }
    return
  }

  let riskGroup = nftFeed.try_risk(nftHash.value)
  if (riskGroup.reverted) {
    if (poolMeta.id == '0x382460db48ee1b84b23d7286cfd7d027c27bb885') {
      log.error('failed to find risk group for nft hash {}', [nftHash.value.toString()])
    } else {
      log.critical('failed to find risk group for nft hash {}', [nftHash.value.toString()])
    }
    return
  }

  // get ratePerSecond for riskgroup
  let ratePerSecond = pile.try_rates(riskGroup.value)
  if (ratePerSecond.reverted) {
    if (poolMeta.id === '0x382460db48ee1b84b23d7286cfd7d027c27bb885') {
      log.error('failed to find rates for risk group {}', [riskGroup.value.toString()])
    } else {
      log.critical('failed to find rates for risk group {}', [riskGroup.value.toString()])
    }
    return
  }
  loan.interestRatePerSecond = ratePerSecond.value.value2
  // set ceiling & threshold based on collateral value
  loan.ceiling = nftFeed.ceiling(loanIndex)
  loan.threshold = nftFeed.threshold(loanIndex)

  log.debug('will save loan {} (pool: {}, index: {}, owner: {}, opened {})', [
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
  log.debug(`handle shelf {} close`, [call.to.toHex()])

  let loanOwner = call.from
  let shelf = call.to
  let loanIndex = call.inputs.loan // incremental value, not unique across all tinlake pools

  log.debug('handleShelfClose, shelf: {}, loanOwner: {}, loanIndex: {}', [
    shelf.toHex(),
    loanOwner.toHex(),
    loanIndex.toString(),
  ])

  let poolId = poolFromIdentifier(shelf.toHex()).id
  let loanId = loanIdFromPoolIdAndIndex(poolId, loanIndex)

  log.debug('generated poolId {}, loanId {}', [poolId, loanId])

  // update loan
  let loan = Loan.load(loanId)
  if (loan == null) {
    log.error('loan {} not found', [loanId])
    return
  }
  loan.closed = call.block.timestamp.toI32()
  loan.save()
}

// handleShelfBorrow handles borrowing of a loan
export function handleShelfBorrow(call: BorrowCall): void {
  log.debug(`handle shelf {} borrow`, [call.to.toHex()])

  let loanOwner = call.from
  let shelf = call.to
  let loanIndex = call.inputs.loan // incremental value, not unique across all tinlake pools
  let amount = call.inputs.currencyAmount

  log.debug('handleShelfBorrow, shelf: {}, loanOwner: {}, loanIndex: {}, amount: {}', [
    shelf.toHex(),
    loanOwner.toHex(),
    loanIndex.toString(),
    amount.toString(),
  ])

  let poolMeta = poolFromIdentifier(shelf.toHex())
  let poolId = poolMeta.id
  let loanId = loanIdFromPoolIdAndIndex(poolId, loanIndex)

  log.debug('generated poolId {}, loanId {}', [poolId, loanId])

  // update loan
  let loan = Loan.load(loanId)
  if (loan == null) {
    log.error('loan {} not found', [loanId])
    return
  }

  loan.borrowsAggregatedAmount = loan.borrowsAggregatedAmount.plus(amount)
  loan.borrowsCount = loan.borrowsCount + 1
  // increase debt here. Reason: debt won't be updated on every block, but we want relatively up-to-date information in
  // the UI
  loan.debt = loan.debt.plus(amount)

  // TODO add support for pools using creditLine ceilings – the following only supports principal, not creditLine
  // loan.ceiling = loan.ceiling.minus(amount)
  let nftFeed = NftFeed.bind(<Address>Address.fromHexString(poolMeta.nftFeed))
  loan.ceiling = nftFeed.ceiling(loanIndex)
  loan.save()

  let pool = Pool.load(poolId)
  if (pool == null) {
    log.error('pool {} not found', [poolId])
    return
  }

  pool.totalBorrowsCount = pool.totalBorrowsCount + 1
  pool.totalBorrowsAggregatedAmount = pool.totalBorrowsAggregatedAmount.plus(amount)
  pool.totalDebt = pool.totalDebt.plus(amount)
  pool.save()
}

// handleShelfRepay handles repaying a loan
export function handleShelfRepay(call: BorrowCall): void {
  log.debug(`handle shelf {} repay`, [call.to.toHex()])

  let loanOwner = call.from
  let shelf = call.to
  let loanIndex = call.inputs.loan // incremental value, not unique across all tinlake pools
  let amount = call.inputs.currencyAmount

  log.debug('handleShelfRepay, shelf: {}, loanOwner: {}, loanIndex: {}, amount: {}', [
    shelf.toHex(),
    loanOwner.toHex(),
    loanIndex.toString(),
    amount.toString(),
  ])

  let poolId = poolFromIdentifier(shelf.toHex()).id
  let loanId = loanIdFromPoolIdAndIndex(poolId, loanIndex)

  log.debug('generated poolId {}, loanId {}', [poolId, loanId])

  // update loan
  let loan = Loan.load(loanId)
  if (loan == null) {
    log.error('loan {} not found', [loanId])
    return
  }
  loan.repaysAggregatedAmount = loan.repaysAggregatedAmount.plus(amount)
  loan.repaysCount = loan.repaysCount + 1
  // decrease debt here. Reason: debt won't be updated on every block, but we want relatively up-to-date information in
  // the UI. Note that debt should not get negative, so we decrease debt (and totalDebt below) maximally by loan.debt
  let debtDecrease = amount.gt(loan.debt) ? loan.debt : amount
  loan.debt = loan.debt.minus(debtDecrease)
  // TODO adjust ceiling for pools that use creditLine ceiling
  loan.save()

  let pool = Pool.load(poolId)
  if (pool == null) {
    log.error('pool {} not found', [poolId])
    return
  }

  pool.totalRepaysCount = pool.totalRepaysCount + 1
  pool.totalRepaysAggregatedAmount = pool.totalRepaysAggregatedAmount.plus(amount)
  pool.totalDebt = pool.totalDebt.minus(debtDecrease)
  pool.save()
}
