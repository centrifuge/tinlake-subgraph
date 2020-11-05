import { log, BigInt, CallResult, EthereumBlock, Address, dataSource } from "@graphprotocol/graph-ts"
import { Pile } from '../generated/Block/Pile'
import { IssueCall, CloseCall, BorrowCall, Shelf } from "../generated/Shelf/Shelf"
import { Assessor } from "../generated/Block/Assessor"
import { AssessorV3, FileCall as AssessorV3FileCall } from "../generated/Block/AssessorV3"
import { SeniorTranche, FileCall } from "../generated/Block/SeniorTranche"
import { UpdateCall, NftFeed } from "../generated/NftFeed/NftFeed"
import { Created } from '../generated/ProxyRegistry/ProxyRegistry'
import { Transfer as TransferEvent } from '../generated/Block/ERC20'
import { Reserve } from '../generated/Block/Reserve'
import { NavFeed } from '../generated/Block/NavFeed'
import { Pool, Loan, Proxy, ERC20Transfer, Day } from "../generated/schema"
import { loanIdFromPoolIdAndIndex, loanIndexFromLoanId } from "./typecasts"
import { poolMetas, poolStartBlocks, PoolMeta } from "./poolMetas"
import { seniorToJuniorRatio, poolFromIdentifier } from "./mappingUtil"
import { createERC20Transfer, createToken, loadOrCreateTokenBalanceSrc, loadOrCreateTokenBalanceDst, updateAccounts } from "./transferUtil"
import { timestampToDate, createDay } from "./dateUtil"
import { createDailyPoolData } from "./rewardUtil"

const handleBlockFrequencyMinutes = 5
const blockTimeSeconds = 15

function createPool(poolId: string) : void {
  let poolMeta = poolFromIdentifier(poolId);

  let interestRateResult = new CallResult<BigInt>()
  if (poolMeta.version == 3) {
    let assessor_v3 = AssessorV3.bind(<Address>Address.fromHexString(poolMeta.assessor))
    interestRateResult = assessor_v3.try_seniorInterestRate()
  } else {
    let seniorTranche = SeniorTranche.bind(<Address>Address.fromHexString(poolMeta.seniorTranche))
    interestRateResult = seniorTranche.try_ratePerSecond()
  }

  if (interestRateResult.reverted) {
    log.warning("pool not deployed to the network yet {}", [poolId])
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
  pool.currentJuniorRatio = BigInt.fromI32(0)
  pool.maxReserve = BigInt.fromI32(0) // Only used for V3
  pool.weightedInterestRate = BigInt.fromI32(0)
  pool.totalRepaysCount = 0
  pool.totalRepaysAggregatedAmount = BigInt.fromI32(0)
  pool.totalBorrowsCount = 0
  pool.totalBorrowsAggregatedAmount = BigInt.fromI32(0)
  pool.shortName = poolMeta.shortName;
  pool.version = BigInt.fromI32(poolMeta.version == 2 ? 2 : 3)
  pool.save()
}

export function handleCreateProxy(event: Created): void {
  let proxy = new Proxy(event.params.proxy.toHex())
  proxy.owner = event.params.owner
  proxy.save()
}

function loadOrCreatePool(poolMeta: PoolMeta, block: EthereumBlock): Pool {
  let pool = Pool.load(poolMeta.id)

  log.debug("pool start block {}, current block {}", [poolMeta.startBlock.toString(), block.number.toString()])
  if (pool == null && parseFloat(block.number.toString()) >= poolMeta.startBlock) {
    createPool(poolMeta.id.toString())
    pool = Pool.load(poolMeta.id)
  }

  log.debug("successfully using this for pool meta id: {}", [poolMeta.id.toString()])
  return <Pool>pool    
}

function createYesterdaySnapshot(date: BigInt, block: EthereumBlock): void {
  let yesterdayTimeStamp = date.minus(BigInt.fromI32(86400))
  let yesterday = Day.load(yesterdayTimeStamp.toString())

  let relevantPoolMetas = poolMetas.filter(poolMeta => poolMeta.networkId == dataSource.network())
  for (let i = 0; i < relevantPoolMetas.length; i++) {
    let poolMeta = relevantPoolMetas[i]

    let pool = loadOrCreatePool(poolMeta, block)
    if (pool == null) {
      continue
    }

    let dailyPoolData = createDailyPoolData(poolMeta, yesterday.id)

    // only get these values in v3
    if (poolMeta.version == 3) {
      let reserveContract = Reserve.bind(<Address>Address.fromHexString(poolMeta.reserve))
      let reserve = reserveContract.totalBalance()
      dailyPoolData.reserve = reserve

      let navFeedContract = NavFeed.bind(<Address>Address.fromHexString(poolMeta.nftFeed))
      let currentNav = navFeedContract.currentNAV()
      dailyPoolData.assetValue = currentNav
    } 

    dailyPoolData.totalDebt = pool.totalDebt
    dailyPoolData.seniorDebt = pool.seniorDebt
    dailyPoolData.currentJuniorRatio = pool.currentJuniorRatio
    dailyPoolData.save()
  }
}

// capture a snapshot of the investments by day
function runRewardLogic(block: EthereumBlock): void {
  let date = timestampToDate(block.timestamp)
  let today = Day.load(date.toString())

  if (today == null) {
    today = createDay(date.toString())

    // if we create a new day
    // then we want to run the calculation on the previous day
    createYesterdaySnapshot(date, block);
  }
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
  // the current debt value).
  // We do run handleBlock for poolStartBlocks though.
  if (!poolStartBlocks.has(block.number.toI32()) &&
    block.number.mod(BigInt.fromI32(handleBlockFrequencyMinutes*60/blockTimeSeconds)).notEqual(BigInt.fromI32(0))) {
    log.debug("skip handleBlock at number {}", [block.number.toString()])
    return
  }

  runRewardLogic(block)

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

    if (poolMeta.version == 2) {
      let assessor = Assessor.bind(<Address>Address.fromHexString(poolMeta.assessor))
      let minJuniorRatioResult = assessor.try_minJuniorRatio()
      let currentJuniorRatioResult = assessor.try_currentJuniorRatio()

      pool.minJuniorRatio = (!minJuniorRatioResult.reverted) ? minJuniorRatioResult.value : BigInt.fromI32(0)
      pool.currentJuniorRatio = (!currentJuniorRatioResult.reverted) ? currentJuniorRatioResult.value : BigInt.fromI32(0)
    } else {
      let assessor_v3 = AssessorV3.bind(<Address>Address.fromHexString(poolMeta.assessor))
      let currentSeniorRatioResult = assessor_v3.try_seniorRatio()
      pool.currentJuniorRatio = !currentSeniorRatioResult.reverted
        ? seniorToJuniorRatio(currentSeniorRatioResult.value)
        : BigInt.fromI32(0);
    }

    // check if senior tranche exists
    if (poolMeta.seniorTranche != '0x0000000000000000000000000000000000000000') {
      let seniorDebtResult = new CallResult<BigInt>()
      if (poolMeta.version == 3) {
        let assessor_v3 = AssessorV3.bind(<Address>Address.fromHexString(poolMeta.assessor))
        seniorDebtResult = assessor_v3.try_seniorDebt_()
      } else {
        let senior = SeniorTranche.bind(<Address>Address.fromHexString(poolMeta.seniorTranche))
        seniorDebtResult = senior.try_debt()
      }

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

  let poolMeta = poolFromIdentifier(shelf.toHex())
  let poolId = poolMeta.id
  let loanId = loanIdFromPoolIdAndIndex(poolId, loanIndex)

  log.debug("generated poolId {}, loanId {}", [poolId, loanId])

  let pool = Pool.load(poolId)
  let poolChanged = false
  if (pool == null) {
    createPool(poolId);
    pool = Pool.load(poolId)

    if (pool == null) {
      return
    }

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
  let nftHash = nftFeed.try_nftID(loanIndex);
  if (nftHash.reverted) {
    if (poolMeta.id == "0x382460db48ee1b84b23d7286cfd7d027c27bb885") {
      log.error("failed to find nft hash for loan idx {}", [loanIndex.toString()]);
    } else {
      log.critical("failed to find nft hash for loan idx {}", [loanIndex.toString()]);
    }
    return;
  }

  let riskGroup = nftFeed.try_risk(nftHash.value)
  if (riskGroup.reverted) {
    if (poolMeta.id == "0x382460db48ee1b84b23d7286cfd7d027c27bb885") {
      log.error("failed to find risk group for nft hash {}", [nftHash.value.toString()]);
    } else {
      log.critical("failed to find risk group for nft hash {}", [nftHash.value.toString()]);
    }
    return;
  }

  // get ratePerSecond for riskgroup
  let ratePerSecond = pile.try_rates(riskGroup.value)
  if (ratePerSecond.reverted) {
    if (poolMeta.id === "0x382460db48ee1b84b23d7286cfd7d027c27bb885") {
      log.error("failed to find rates for risk group {}", [
        riskGroup.value.toString(),
      ]);
    } else {
      log.critical("failed to find rates for risk group {}", [
        riskGroup.value.toString(),
      ]);
    }
    return;
  }
  loan.interestRatePerSecond = ratePerSecond.value.value2
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

  let poolId = poolFromIdentifier(shelf.toHex()).id
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

  let poolMeta = poolFromIdentifier(shelf.toHex())
  let poolId = poolMeta.id
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
  // loan.ceiling = loan.ceiling.minus(amount)
  let nftFeed = NftFeed.bind(<Address>Address.fromHexString(poolMeta.nftFeed));
  loan.ceiling = nftFeed.ceiling(loanIndex);
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

  let poolId = poolFromIdentifier(shelf.toHex()).id
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
  let pool =  poolFromIdentifier(nftFeedAddress.toHex())

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


  let poolMeta = poolFromIdentifier(seniorTranche.toHex())
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
export function handleAssessorFile(call: AssessorV3FileCall): void {
  log.debug(`handle assessor file set`, [call.to.toHex()]);
  let assessor = call.to
  let name = call.inputs.name.toString()
  let value = call.inputs.value

  let poolMeta = poolFromIdentifier(assessor.toHex())
  let poolId = poolMeta.id
  log.debug(`handle assessor file pool Id {}`, [poolId]);

  let pool = Pool.load(poolId)
  if (pool == null) {
    log.error("pool {} not found", [poolId])
    return
  }

  if (name == 'seniorInterestRate') {
    pool.seniorInterestRate = value
    log.debug(`update pool {} - set seniorInterestRate to {}`, [poolId, value.toString()])
  } else if (name == 'maxReserve') {
    pool.maxReserve = value
    log.debug(`update pool {} - set maxReserve to {}`, [poolId, value.toString()])
  } else if (name == 'maxSeniorRatio') {
     // Internally we use senior ratio, while externally we use the junior ratio
    pool.minJuniorRatio = seniorToJuniorRatio(value)
    log.debug(`update pool {} - set minJuniorRatio to 1 - {}`, [poolId, seniorToJuniorRatio(value).toString()])
  } else if (name == 'minSeniorRatio') {
    pool.maxJuniorRatio = seniorToJuniorRatio(value)
    log.debug(`update pool {} - set maxJuniorRatio to 1 - {}`, [poolId, seniorToJuniorRatio(value).toString()])
  } else {
    // Don't save if nothing changed
    return
  }

  pool.save()
}

export function handleERC20Transfer(event: TransferEvent): void {
  createToken(event)
  loadOrCreateTokenBalanceDst(event)
  loadOrCreateTokenBalanceSrc(event)
  updateAccounts(event)

  let poolMeta = poolFromIdentifier(event.address.toHex())
  let id = event.block.number.toString().concat('-').concat(event.logIndex.toString())
  if (ERC20Transfer.load(id) == null) {
    createERC20Transfer(id, event, poolMeta)
  }
}
