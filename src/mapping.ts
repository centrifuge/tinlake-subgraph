import { log, BigInt, EthereumBlock, Address, Bytes } from "@graphprotocol/graph-ts"
import { Pile } from '../generated/Block/Pile'
import { IssueCall, CloseCall, BorrowCall, Shelf } from "../generated/Shelf/Shelf"
import { Assessor } from "../generated/Block/Assessor"
import { SeniorTranche, FileCall } from "../generated/Block/SeniorTranche"
import { UpdateCall, NftFeed } from "../generated/NftFeed/NftFeed"
import { Created } from '../generated/ProxyRegistry/ProxyRegistry'
import { Pool, Loan, Proxy } from "../generated/schema"
import { loanIdFromPoolIdAndIndex, loanIndexFromLoanId } from "./typecasts"
import { poolMetas } from "./poolMetas"
import { poolFromShelf, poolFromNftFeed, poolFromSeniorTranche} from "./poolMetasUtil"

const handleBlockFrequencyMinutes = 5
const blockTimeSeconds = 15

export function handleCreateProxy(event: Created): void {
  let proxy = new Proxy(event.params.proxy.toHex())
  proxy.owner = event.params.owner
  proxy.save()
}

export function handleBlock(block: EthereumBlock): void {
  // Do not run handleBlock for every single block, since it is not performing well at the moment. Issue: handleBlock
  // calls 3*n contracts for n loans, which takes with 12 loans already ~8 seconds. Since it scales linearly, we expect
  // that the Graph won't be able to keep up with block production on Ethereum. Executing this handler only every x
  // minutes is a workaround for now, but we should change the architecture to fix the scalability at a later point as
  // described in the following:
  // TODO: change the logic in handleBlock to solely use call/event handlers. The idea is to only track changes to the
  // debt (borrowing/repaying) and interest rate through calls/events, and then run the block handler without actual
  // calls to just calculate the current debt off-chain using the same logic that is used on-chain (without calls into
  // the current debt value)
  if (block.number.mod(BigInt.fromI32(handleBlockFrequencyMinutes*60/blockTimeSeconds)).notEqual(BigInt.fromI32(0))) {
    log.debug("skip handleBlock at number {}", [block.number.toString()])
    return
  }

  log.debug("handleBlock number {}", [block.number.toString()])
  // iterate through all pools
  for (let i = 0; i < poolMetas.length; i++) {
    let poolMeta = poolMetas[i]
    let pool = Pool.load(poolMeta.id)

    if (pool == null) {
      log.debug("pool {} not found", [poolMeta.id.toString()])
      continue
    }
    log.debug("pool {} loaded", [poolMeta.id.toString()])

    let pile = Pile.bind(<Address>Address.fromHexString(poolMeta.pile))
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
      log.debug("will update loan {}: debt {}", [loanId, debt.toString()])

      // update loan
      let loan = Loan.load(loanId)
      if (loan == null) {
        log.critical("loan {} not found", [loanId])
      }

      loan.debt = debt
      loan.save()

      totalDebt = totalDebt.plus(debt)
      if (loan.interestRatePerSecond == null) {
        log.warning("interestRatePerSecond on loan {} is null", [loanId])
        continue
      }
      totalWeightedDebt = debt.times(loan.interestRatePerSecond as BigInt)
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
    log.debug("will update pool {}: totalDebt {} minJuniorRatio {} cuniorRatio {} weightedInterestRate {}", [
      poolMeta.id, totalDebt.toString(), minJuniorRatio.toString(), currentJuniorRatio.toString(),
      weightedInterestRate.toString()])
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

  log.debug("handleShelfIssue, shelf: {}, loanOwner: {}, loanIndex: {},  nftId: {}, nftRegistry: {}", [shelf.toHex(), loanOwner.toHex(),
    loanIndex.toString(), nftId.toString(), nftRegistry.toHex()])


  let poolMeta = poolFromShelf(shelf)
  let poolId = poolMeta.id
  let loanId = loanIdFromPoolIdAndIndex(poolId, loanIndex)

  log.debug("generated poolId {}, loanId {}", [poolId, loanId])

  let pool = Pool.load(poolId)
  let poolChanged = false
  if (pool == null) {

    let seniorTranche = SeniorTranche.bind(<Address>Address.fromHexString(poolMeta.senior))

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
    pool.seniorInterestRate = seniorTranche.ratePerSecond()
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

  // get risk group and interest rate from nftFeed
  let nftFeed = NftFeed.bind(<Address>Address.fromHexString(poolMeta.nftFeed))
  let pile = Pile.bind(<Address>Address.fromHexString(poolMeta.pile))
  // generate hash from nftId & registry
  let nftHash = nftFeed.nftID(loanIndex);
  let riskGroup = nftFeed.risk(nftHash)
  // get ratePerSecond for riskgroup
  let ratePerSecond = pile.rates(riskGroup).value2
  loan.interestRatePerSecond = ratePerSecond
  // set ceiling & threshold based on collateral value
  loan.ceiling = nftFeed.ceiling(loanIndex)
  loan.threshold = nftFeed.threshold(loanIndex)


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

  let poolId = poolFromShelf(shelf).id
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

  let poolId = poolFromShelf(shelf).id
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
  // increase debt here. Reason: debt won't be updated on every block, but we want relatively up-to-date information in
  // the UI
  loan.debt = loan.debt.plus(amount)
  // TODO add support for pools using creditLine ceilings – the following only supports principal, not creditLine
  loan.ceiling = loan.ceiling.minus(amount)
  loan.save()

  let pool = Pool.load(poolId)
  if (pool == null) {
    log.error("pool {} not found", [poolId])
    return
  }

  pool.totalBorrowsCount = pool.totalBorrowsCount + 1
  pool.totalBorrowsAggregatedAmount = pool.totalBorrowsAggregatedAmount.plus(amount)
  pool.totalDebt = pool.totalDebt.plus(amount)
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

  let poolId = poolFromShelf(shelf).id
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
  // decrease debt here. Reason: debt won't be updated on every block, but we want relatively up-to-date information in
  // the UI. Note that debt should not get negative, so we decrease debt (and totalDebt below) maximally by loan.debt
  let debtDecrease = amount.gt(loan.debt) ? loan.debt : amount
  loan.debt = loan.debt.minus(debtDecrease)
  // TODO adjust ceiling for pools that use creditLine ceiling
  loan.save()

  let pool = Pool.load(poolId)
  if (pool == null) {
    log.error("pool {} not found", [poolId])
    return
  }

  pool.totalRepaysCount = pool.totalRepaysCount + 1
  pool.totalRepaysAggregatedAmount = pool.totalRepaysAggregatedAmount.plus(amount)
  pool.totalDebt = pool.totalDebt.minus(debtDecrease)
  pool.save()
}

// handleNftFeedUpdate handles changing the collateral value and/or the risk group of the loan
export function handleNftFeedUpdate(call: UpdateCall): void {
  log.debug(`handle nftFeed update`, [call.to.toHex()]);

  let nftFeedAddress = call.to
  let nftId = call.inputs.nftID_
  let pool =  poolFromNftFeed(nftFeedAddress)

  let shelf = Shelf.bind(<Address>Address.fromHexString(pool.shelf))
  let pile = Pile.bind(<Address>Address.fromHexString(pool.pile))
  let nftFeed = NftFeed.bind(<Address>Address.fromHexString(pool.nftFeed))

  let poolId = pool.id
  let loanIndex = shelf.nftlookup(nftId);
  let loanId = loanIdFromPoolIdAndIndex(poolId, loanIndex)

  let ceiling = nftFeed.ceiling(loanIndex)
  let threshold = nftFeed.threshold(loanIndex)
  let riskGroup = nftFeed.risk(nftId)
  // get ratePerSecond for riskGroup
  let ratePerSecond = pile.rates(riskGroup).value2


  log.debug("handleNFTFeedUpdated, nftFeedContract: {}, loanIndex: {}, ceiling: {}, threshold: {}, interestRate {}", [nftFeedAddress.toHex(),
    loanIndex.toString(), ceiling.toString(), threshold.toString(), ratePerSecond.toString()])

  // update loan
  let loan = Loan.load(loanId)
  if (loan == null) {
    log.error("loan {} not found", [loanId])
    return
  }
  loan.interestRatePerSecond = ratePerSecond
  loan.threshold = threshold
  loan.ceiling = ceiling
  loan.save()
}

export function handleSeniorTrancheFile(call: FileCall): void {
  log.debug(`handle senior tranche file set`, [call.to.toHex()]);
  let seniorTrancheContract = call.to
  let interestRate = call.inputs.ratePerSecond_

  let poolId = poolFromSeniorTranche(seniorTrancheContract).id

  let pool = Pool.load(poolId)
  if (pool == null) {
    log.error("pool {} not found", [poolId])
    return
  }
  
  pool.seniorInterestRate = interestRate
  pool.save()
}