import { log, BigInt, EthereumBlock, Address, Bytes, dataSource } from "@graphprotocol/graph-ts"
import { Pile } from '../generated/Block/Pile'
import { IssueCall, CloseCall, BorrowCall, Shelf } from "../generated/Shelf/Shelf"
import { Assessor } from "../generated/Block/Assessor"
import { SeniorTranche, FileCall } from "../generated/Block/SeniorTranche"
import { UpdateCall, NftFeed } from "../generated/NftFeed/NftFeed"
import { Created } from '../generated/ProxyRegistry/ProxyRegistry'
import { Pool, Loan, Proxy } from "../generated/schema"
import { loanIdFromPoolIdAndIndex, loanIndexFromLoanId } from "./typecasts"
import { poolMetas } from "./poolMetas"
import { poolFromShelf, poolFromNftFeed, poolFromSeniorTranche, poolFromAssessor, poolFromId} from "./poolMetasUtil"

const handleBlockFrequencyMinutes = 5
const blockTimeSeconds = 15

function createPool(poolId: string) : void {
    let poolMeta = poolFromId(poolId);

    let seniorTranche = SeniorTranche.bind(<Address>Address.fromHexString(poolMeta.senior))
    let assessor = Assessor.bind(<Address>Address.fromHexString(poolMeta.assessor))

    let interestRateResult
    if (poolMeta.version === 3) seniorTranche.try_seniorInterestRate() 
    else assessor.try_ratePerSecond() 
    
    if (interestRateResult.reverted) {
      log.debug("pool not deployed to the network yet {}", [poolId])
      return
    }
    log.debug("will create new pool poolId {}", [poolId])
    let pool = new Pool(poolId)
    pool.seniorInterestRate = interestRateResult.value
    pool.loans = []
    pool.totalDebt = BigInt.fromI32(0)
    pool.seniorDebt = BigInt.fromI32(0)
    pool.minJuniorRatio = BigInt.fromI32(0)
    pool.maxJuniorRatio = BigInt.fromI32(0) // Only used for V3
    pool.maxReserve = BigInt.fromI32(0) // Only used for V3
    pool.currentJuniorRatio = BigInt.fromI32(0)
    pool.weightedInterestRate = BigInt.fromI32(0)
    pool.totalRepaysCount = 0
    pool.totalRepaysAggregatedAmount = BigInt.fromI32(0)
    pool.totalBorrowsCount = 0
    pool.totalBorrowsAggregatedAmount = BigInt.fromI32(0)
    pool.save()
}

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
  // iterate through all pools that are for the current network
  let relevantPoolMetas = poolMetas.filter(poolMeta => poolMeta.networkId == dataSource.network())
  for (let i = 0; i < relevantPoolMetas.length; i++) {
    let poolMeta = relevantPoolMetas[i]
    let pool = Pool.load(poolMeta.id)

    log.debug("pool start block {}, current block {}", [poolMeta.startBlock.toString(), block.number.toString()])
    if (pool == null && parseFloat(block.number.toString()) >= poolMeta.startBlock) {
      createPool(poolMeta.id.toString())
      pool = Pool.load(poolMeta.id)
    }

    if (pool == null) {
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
      totalWeightedDebt = totalWeightedDebt.plus(debt.times(loan.interestRatePerSecond as BigInt))
    }

    // update pool values
    // Weighted interest rate - sum(interest * debt) / sum(debt) (block handler)
    let weightedInterestRate = totalDebt.gt(BigInt.fromI32(0)) ? totalWeightedDebt.div(totalDebt) : BigInt.fromI32(0)
    pool.weightedInterestRate = weightedInterestRate
    pool.totalDebt = totalDebt

    if (poolMeta.version === 2) {
      let minJuniorRatioResult = assessor.try_minJuniorRatio() // V3: we need to retrieve the 1 - maxSeniorRatio
      let currentJuniorRatioResult = assessor.try_currentJuniorRatio() // V3: 1 - assessor.try_seniorRatio

      pool.minJuniorRatio = (!minJuniorRatioResult.reverted) ? minJuniorRatioResult.value : BigInt.fromI32(0)
      pool.currentJuniorRatio = (!currentJuniorRatioResult.reverted) ? currentJuniorRatioResult.value : BigInt.fromI32(0)
    }

    // check if senior tranche exists
    if (poolMeta.senior !== '0x0000000000000000000000000000000000000000') {
      let seniorDebtResult
      if (poolMeta.version === 3) assessor.try_seniorDebt_()
      else senior.try_debt();

      pool.seniorDebt = (!seniorDebtResult.reverted) ? seniorDebtResult.value : BigInt.fromI32(0)
      log.debug("will update seniorDebt {}", [pool.seniorDebt.toString()])
    }

    log.debug("will update pool {}: totalDebt {} minJuniorRatio {} cuniorRatio {} weightedInterestRate {}", [
      poolMeta.id, totalDebt.toString(), pool.minJuniorRatio.toString(), pool.currentJuniorRatio.toString(),
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
    createPool(poolId);
    pool = Pool.load(poolId)
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

// Only used in V2
export function handleSeniorTrancheFile(call: FileCall): void {
  log.debug(`handle senior tranche file set`, [call.to.toHex()]);
  let seniorTranche = call.to
  let interestRate = call.inputs.ratePerSecond_


  let poolMeta = poolFromSeniorTranche(seniorTranche)
  let poolId = poolMeta.id
  log.debug(`handle senior tranche file pool Id {}`, [poolId]);

  let pool = Pool.load(poolId)
  if (pool == null) {
    log.error("pool {} not found", [poolId])
    return
  }
  log.debug(`update pool {} - set senior interest rate `, [poolId, interestRate.toString()]);

  pool.seniorInterestRate = interestRate
  pool.save()
}

// Only used in V3
export function handleAssessorFile(call: FileCall): void {
  log.debug(`handle assessor file set`, [call.to.toHex()]);
  let assessor = call.to
  let name = call.inputs.name
  let value = call.inputs.value

  let poolMeta = poolFromAssessor(assessor)
  let poolId = poolMeta.id
  log.debug(`handle assessor file pool Id {}`, [poolId]);

  let pool = Pool.load(poolId)
  if (pool == null) {
    log.error("pool {} not found", [poolId])
    return
  }

  if (name === 'seniorInterestRate') {
    pool['seniorInterestRate'] = value
    log.debug(`update pool {} - set seniorInterestRate to {}`, [poolId, value.toString()])
  } else if (name === 'maxReserve') {
    pool['maxReserve'] = value
    log.debug(`update pool {} - set maxReserve to {}`, [poolId, value.toString()])
  } else if (name === 'maxSeniorRatio') {
     // Internally we use senior ratio, while externally we use the junior ratio
    pool['minJuniorRatio'] = 1 - value
    log.debug(`update pool {} - set minJuniorRatio to {}`, [poolId, (1 - value).toString()])
  } else if (name === 'minSeniorRatio') {
    pool['maxJuniorRatio'] = 1 - value
    log.debug(`update pool {} - set maxJuniorRatio to {}`, [poolId, (1 - value).toString()])
  } else {
    // Don't save if nothing changed
    return
  }

  pool[name] = value
  pool.save()
}