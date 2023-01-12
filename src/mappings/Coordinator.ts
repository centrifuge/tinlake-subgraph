import { log, BigInt, Address, ethereum, dataSource } from '@graphprotocol/graph-ts'
import { Assessor } from '../../generated/Block/Assessor'
import { NavFeed } from '../../generated/Block/NavFeed'
import { Reserve } from '../../generated/Block/Reserve'
import {
  Pool,
  PoolAddresses,
  Day,
  DailyPoolData,
  InvestorTransaction,
  Token,
  PrevInvestorTransactionByToken,
  TokenBalance,
} from '../../generated/schema'
import { ExecuteEpochCall, CloseEpochCall, Coordinator } from '../../generated/templates/Coordinator/Coordinator'
import { seniorToJuniorRatio } from '../util/pool'
import { updateLoans } from '../domain/Loan'
import { getAllPools } from '../domain/PoolRegistry'
import { loadOrCreateTokenBalance, calculateDisburse, loadOrCreatePoolInvestors } from '../domain/TokenBalance'
import { addToDailyAggregate } from '../domain/DailyPoolData'
import { timestampToDate } from '../util/date'
import { fixed27, secondsInDay, zeroAddress } from '../config'
import { loadOrCreatePreviousTransaction } from '../domain/PrevInvestorTransactionByToken'

export function addInvestorTransactions(
  poolId: string,
  tx: ethereum.Transaction,
  to: Address,
  block: ethereum.Block
): void {
  let investors = loadOrCreatePoolInvestors(poolId)
  let pool = Pool.load(poolId)
  if (!pool) {
    return
  }

  let coordinator = Coordinator.bind(<Address>to)
  let juniorTokenPrice = coordinator.try_epochJuniorTokenPrice()

  let seniorTokenPrice = coordinator.try_epochSeniorTokenPrice()
  log.info(
    'AddInvestorTransactions: trying to call Coordinator at {}, seniorTokenPrice reverted: {}, juniorTokenPrice reverted: {}',
    [to.toHexString(), seniorTokenPrice.reverted ? 'true' : 'false', juniorTokenPrice.reverted ? 'true' : 'false']
  )

  let poolAddresses = PoolAddresses.load(poolId)
  if (!poolAddresses) {
    return
  }
  for (let i = 0; i < investors.accounts.length; i++) {
    let accounts = investors.accounts
    let address = accounts[i]
    let tb = loadOrCreateTokenBalance(address, poolAddresses.seniorToken)
    let seniorToken = tb.token
    let seniorSymbol: string = Token.load(seniorToken) ? ((Token.load(seniorToken) as Token).symbol as string) : '-'
    let previousSeniorTokenTransaction = PrevInvestorTransactionByToken.load(address.concat(seniorToken))
    if (previousSeniorTokenTransaction) {
      addSeniorInvestorTransaction(previousSeniorTokenTransaction, to, tb, poolId, seniorSymbol, block, tx, address)
    }
    tb = loadOrCreateTokenBalance(address, poolAddresses.juniorToken)
    calculateDisburse(tb, poolAddresses as PoolAddresses)
    let juniorToken = tb.token
    let juniorSymbol: string = Token.load(juniorToken) ? ((Token.load(juniorToken) as Token).symbol as string) : '-'
    let previousJuniorTokenTransaction = PrevInvestorTransactionByToken.load(address.concat(juniorToken))
    if (previousJuniorTokenTransaction) {
      addJuniorInvestorTransaction(previousJuniorTokenTransaction, to, tb, poolId, juniorSymbol, block, tx, address)
    }
  }
}

function addSeniorInvestorTransaction(
  previousSeniorTokenTransaction: PrevInvestorTransactionByToken,
  to: Address,
  tb: TokenBalance,
  poolId: string,
  seniorSymbol: string,
  block: ethereum.Block,
  tx: ethereum.Transaction,
  address: string
) {
  let txHash = tx.hash.toHex()
  let prevTx = InvestorTransaction.load(previousSeniorTokenTransaction.prevTransaction as string)
  if (!prevTx) {
    return
  }
  log.info('AddInvestorTransactions: previous TX found', [])
  let pool = Pool.load(poolId)
  let poolAddresses = PoolAddresses.load(poolId)
  let coordinator = Coordinator.bind(<Address>to)
  let seniorTokenPrice = coordinator.try_epochSeniorTokenPrice()
  log.info('AddInvestorTransactions: trying to call Coordinator at {}, seniorTokenPrice reverted: {}', [
    to.toHexString(),
    seniorTokenPrice.reverted ? 'true' : 'false',
  ])
  calculateDisburse(tb, poolAddresses as PoolAddresses)
  if (prevTx.type == 'INVEST_ORDER' || prevTx.type == 'INVEST_EXECUTION') {
    let id = txHash
      .concat(address)
      .concat('SENIOR')
      .concat('INVEST_EXECUTION')
    log.info('AddInvestorTransactions: id {}, block{}', [id, block.number.toString()])
    let investorSupplyTx = new InvestorTransaction(id)
    let tokenPrice = seniorTokenPrice.reverted ? (pool as Pool).seniorTokenPrice : seniorTokenPrice.value
    let tokenAmount = prevTx.type == 'INVEST_EXECUTION' ? tb.supplyAmount.minus(prevTx.tokenAmount) : tb.supplyAmount
    investorSupplyTx.owner = address
    investorSupplyTx.pool = poolId
    investorSupplyTx.timestamp = block.timestamp
    investorSupplyTx.type = 'INVEST_EXECUTION'
    investorSupplyTx.currencyAmount = tokenAmount.times(tokenPrice).div(fixed27)
    investorSupplyTx.tokenAmount = tokenAmount
    investorSupplyTx.gasUsed = tx.gasLimit
    investorSupplyTx.gasPrice = tx.gasPrice
    investorSupplyTx.tokenPrice = tokenPrice
    investorSupplyTx.symbol = seniorSymbol
    // TODO: Are totalAmount and totalValue correct despite subtracting the previous execution transaction's amounts?
    investorSupplyTx.newBalance = tb.totalAmount
    investorSupplyTx.newBalanceValue = tb.totalValue
    investorSupplyTx.transaction = txHash
    investorSupplyTx.save()
    log.info('AddInvestorTransaction: Add prevTransaction', [id])
    previousSeniorTokenTransaction.prevTransaction = id
    previousSeniorTokenTransaction.pendingExecution = tb.pendingSupplyCurrency.gt(BigInt.fromI32(0)) ? true : false
    previousSeniorTokenTransaction.save()
  }

  if (prevTx.type == 'REDEEM_ORDER' || prevTx.type == 'REDEEM_EXECUTION') {
    let id = txHash
      .concat(address)
      .concat('SENIOR')
      .concat('REDEEM_EXECUTION')
    log.info('AddInvestorTransaction: id {}, block{}', [id, block.number.toString()])
    let investorRedeemTx = new InvestorTransaction(id)
    let tokenPrice = seniorTokenPrice.reverted ? (pool as Pool).seniorTokenPrice : seniorTokenPrice.value
    let currencyAmount =
      prevTx.type == 'REDEEM_EXECUTION' ? tb.redeemAmount.minus(prevTx.currencyAmount) : tb.redeemAmount
    investorRedeemTx.owner = address
    investorRedeemTx.pool = poolId
    investorRedeemTx.timestamp = block.timestamp
    investorRedeemTx.type = 'REDEEM_EXECUTION'
    investorRedeemTx.currencyAmount = currencyAmount
    investorRedeemTx.tokenAmount = tokenPrice.gt(BigInt.fromI32(0))
      ? currencyAmount.times(fixed27).div(tokenPrice)
      : currencyAmount
    investorRedeemTx.gasUsed = tx.gasLimit
    investorRedeemTx.gasPrice = tx.gasPrice
    investorRedeemTx.tokenPrice = tokenPrice
    investorRedeemTx.symbol = seniorSymbol
    // TODO: Are totalAmount and totalValue correct despite subtracting the previous execution transaction's amounts?
    investorRedeemTx.newBalance = tb.totalAmount
    investorRedeemTx.newBalanceValue = tb.totalValue
    investorRedeemTx.transaction = txHash
    investorRedeemTx.save()
    log.info('AddInvestorTransaction: Add prevTransaction', [id])
    previousSeniorTokenTransaction.prevTransaction = id
    previousSeniorTokenTransaction.pendingExecution = tb.pendingRedeemToken.gt(BigInt.fromI32(0)) ? true : false
    previousSeniorTokenTransaction.save()
  }
}

function addJuniorInvestorTransaction(
  previousJuniorTokenTransaction: PrevInvestorTransactionByToken,
  to: Address,
  tb: TokenBalance,
  poolId: string,
  juniorSymbol: string,
  block: ethereum.Block,
  tx: ethereum.Transaction,
  address: string
) {
  let txHash = tx.hash.toHex()
  let prevTx = InvestorTransaction.load(previousJuniorTokenTransaction.prevTransaction as string)
  if (!prevTx) {
    return
  }
  log.info('AddInvestorTransactions: previous TX found', [])
  let pool = Pool.load(poolId)
  let poolAddresses = PoolAddresses.load(poolId)
  let coordinator = Coordinator.bind(<Address>to)
  let juniorTokenPrice = coordinator.try_epochJuniorTokenPrice()
  log.info('AddInvestorTransactions: trying to call Coordinator at {}, juniorTokenPrice reverted: {}', [
    to.toHexString(),
    juniorTokenPrice.reverted ? 'true' : 'false',
  ])
  calculateDisburse(tb, poolAddresses as PoolAddresses)
  if (prevTx.type == 'INVEST_ORDER' || prevTx.type == 'INVEST_EXECUTION') {
    let id = txHash
      .concat(address)
      .concat('JUNIOR')
      .concat('INVEST_EXECUTION')
    log.info('AddInvestorTransaction: adding transaction id {}, block {}', [id, block.number.toString()])
    let investorSupplyTx = new InvestorTransaction(id)
    let tokenPrice = juniorTokenPrice.reverted ? (pool as Pool).juniorTokenPrice : juniorTokenPrice.value
    let tokenAmount = prevTx.type == 'INVEST_EXECUTION' ? tb.supplyAmount.minus(prevTx.tokenAmount) : tb.supplyAmount
    investorSupplyTx.owner = address
    investorSupplyTx.pool = poolId
    investorSupplyTx.timestamp = block.timestamp
    investorSupplyTx.type = 'INVEST_EXECUTION'
    investorSupplyTx.currencyAmount = tokenAmount.times(tokenPrice).div(fixed27)
    investorSupplyTx.tokenAmount = tokenAmount
    investorSupplyTx.gasUsed = tx.gasLimit
    investorSupplyTx.gasPrice = tx.gasPrice
    investorSupplyTx.tokenPrice = tokenPrice
    investorSupplyTx.symbol = juniorSymbol
    investorSupplyTx.newBalance = tb.totalAmount
    investorSupplyTx.newBalanceValue = tb.totalValue
    investorSupplyTx.transaction = txHash
    investorSupplyTx.save()
    log.info('AddInvestorTransaction: Add prevTransaction', [id])
    previousJuniorTokenTransaction.prevTransaction = id
    previousJuniorTokenTransaction.pendingExecution = tb.pendingSupplyCurrency.gt(BigInt.fromI32(0)) ? true : false
    previousJuniorTokenTransaction.save()
  }
  if (prevTx.type == 'REDEEM_ORDER' || prevTx.type == 'REDEEM_EXECUTION') {
    let id = txHash
      .concat(address)
      .concat('JUNIOR')
      .concat('REDEEM_EXECUTION')
    log.info('AddInvestorTransaction: id {}, block {}', [id, block.number.toString()])
    let investorRedeemTx = new InvestorTransaction(id)
    let tokenPrice = juniorTokenPrice.reverted ? (pool as Pool).juniorTokenPrice : juniorTokenPrice.value
    let currencyAmount =
      prevTx.type == 'REDEEM_EXECUTION' ? tb.redeemAmount.minus(prevTx.currencyAmount) : tb.redeemAmount
    investorRedeemTx.owner = address
    investorRedeemTx.pool = poolId
    investorRedeemTx.timestamp = block.timestamp
    investorRedeemTx.type = 'REDEEM_EXECUTION'
    investorRedeemTx.currencyAmount = currencyAmount
    investorRedeemTx.tokenAmount = tokenPrice.gt(BigInt.fromI32(0))
      ? currencyAmount.times(fixed27).div(tokenPrice)
      : currencyAmount
    investorRedeemTx.gasUsed = tx.gasLimit
    investorRedeemTx.gasPrice = tx.gasPrice
    investorRedeemTx.tokenPrice = tokenPrice
    investorRedeemTx.symbol = juniorSymbol
    investorRedeemTx.newBalance = tb.totalAmount
    investorRedeemTx.newBalanceValue = tb.totalValue
    investorRedeemTx.transaction = txHash
    investorRedeemTx.save()
    log.info('AddInvestorTransaction: Add prevTransaction', [id])
    previousJuniorTokenTransaction.prevTransaction = id
    previousJuniorTokenTransaction.pendingExecution = tb.pendingRedeemToken.gt(BigInt.fromI32(0)) ? true : false
    previousJuniorTokenTransaction.save()
  }
}

export function handleCoordinatorExecuteEpoch(call: ExecuteEpochCall): void {
  let poolId = dataSource.context().getString('id')

  log.info('handleCoordinatorExecuteEpoch: pool id {}, to {}', [poolId.toString(), call.to.toHexString()])
  // addInvestorTransactions(poolId, call.transaction, call.to, call.block)
  // TODO: re add this at some point
  // updatePoolValues(poolId, null)
}

export function handleCoordinatorCloseEpoch(call: CloseEpochCall): void {
  let poolId = dataSource.context().getString('id')
  log.info('handleCoordinatorCloseEpoch: pool id {}, to {}', [poolId.toString(), call.to.toHexString()])
  // let coordinator = Coordinator.bind(<Address>call.to)
  // let submissionPeriod = coordinator.try_submissionPeriod()
  // if (!submissionPeriod.reverted) {
  //   if (!submissionPeriod.value) {
  //     addInvestorTransactions(poolId, call.transaction, call.to, call.block)
  //   }
  // }
}

export function updateAllPoolValues(block: ethereum.Block, today: Day): void {
  // resetting values for real time aggregation
  today.reserve = BigInt.fromI32(0)
  today.totalDebt = BigInt.fromI32(0)
  today.assetValue = BigInt.fromI32(0)
  today.seniorDebt = BigInt.fromI32(0)

  let pools = getAllPools()
  for (let i = 0; i < pools.length; i++) {
    log.info('handleBlock: update pool values - pool {}', [pools[i]])
    updatePoolValues(pools[i], block, today)
  }
}

export function updatePoolValues(poolId: string, block: ethereum.Block, today: Day): void {
  let pool = Pool.load(poolId)
  if (!pool) {
    return
  }

  let addresses = PoolAddresses.load(poolId)
  if (!addresses) {
    return
  }
  // Update loans and return weightedInterestRate and totalDebt
  let loanValues = updateLoans(pool as Pool, addresses.pile)

  // Update pool values
  pool.weightedInterestRate = loanValues[0]
  pool.totalDebt = loanValues[1]

  let assessor = Assessor.bind(Address.fromString(addresses.assessor))
  let currentSeniorRatioResult = assessor.try_seniorRatio()
  pool.currentJuniorRatio = !currentSeniorRatioResult.reverted
    ? seniorToJuniorRatio(currentSeniorRatioResult.value)
    : BigInt.fromI32(0)

  let navFeedContract = NavFeed.bind(Address.fromString(addresses.feed))
  let currentNav = navFeedContract.try_currentNAV()
  pool.assetValue = !currentNav.reverted ? currentNav.value : BigInt.fromI32(0)

  let reserveContract = Reserve.bind(Address.fromString(addresses.reserve))
  let reserve = reserveContract.try_totalBalance()
  pool.reserve = !reserve.reverted ? reserve.value : BigInt.fromI32(0)

  let juniorPrice = assessor.try_calcJuniorTokenPrice(pool.assetValue, pool.reserve)
  let seniorPrice = assessor.try_calcSeniorTokenPrice(pool.assetValue, pool.reserve)

  pool.seniorTokenPrice = !seniorPrice.reverted ? seniorPrice.value : BigInt.fromI32(0)
  pool.juniorTokenPrice = !juniorPrice.reverted ? juniorPrice.value : BigInt.fromI32(0)

  pool = addYields(pool as Pool, block)

  // Check if senior tranche exists
  if (addresses.seniorTranche != zeroAddress) {
    let seniorDebtResult = new ethereum.CallResult<BigInt>()
    let assessor = Assessor.bind(Address.fromString(addresses.assessor))
    seniorDebtResult = assessor.try_seniorDebt_()

    pool.seniorDebt = !seniorDebtResult.reverted ? seniorDebtResult.value : BigInt.fromI32(0)
    log.info('updatePoolValues: will update seniorDebt {}', [pool.seniorDebt.toString()])
  }

  addToDailyAggregate(<Day>today, <Pool>pool)

  log.info(
    'updatePoolValues: will update pool {}: totalDebt {} minJuniorRatio {} juniorRatio {} weightedInterestRate {}',
    [
      poolId,
      pool.totalDebt.toString(),
      pool.minJuniorRatio.toString(),
      pool.currentJuniorRatio.toString(),
      pool.weightedInterestRate.toString(),
    ]
  )
  pool.save()
}

export function addYields(pool: Pool, block: ethereum.Block): Pool {
  let dateNow = timestampToDate(block.timestamp)

  let date30Ago = dateNow.minus(BigInt.fromI32(secondsInDay * 30))
  let day30Ago = Day.load(date30Ago.toString())
  if (!day30Ago) {
    // can return early here, if we don't have data for 30 days ago, we won't have data for more than 30 days
    return pool
  }

  let pool30Ago = DailyPoolData.load(pool.id.concat(day30Ago.id))
  if (!pool30Ago) {
    // can return early here, if we don't have data for 30 days ago, we won't have data for more than 30 days
    return pool
  }

  let yields30 = calculateYields(
    pool.juniorTokenPrice,
    pool30Ago.juniorTokenPrice,
    pool.seniorTokenPrice,
    pool30Ago.seniorTokenPrice,
    30
  )
  pool.juniorYield30Days = yields30.junior
  pool.seniorYield30Days = yields30.senior

  let date90Ago = dateNow.minus(BigInt.fromI32(secondsInDay * 90))
  let day90Ago = Day.load(date90Ago.toString())
  if (!day90Ago) {
    // can return early here, if we don't have data for 90 days ago, we won't have data for more than 90 days
    return pool
  }

  let pool90Ago = DailyPoolData.load(pool.id.concat(day90Ago.id))
  if (!pool90Ago) {
    // can return early here, if we don't have data for 90 days ago, we won't have data for more than 90 days
    return pool
  }

  let yields90 = calculateYields(
    pool.juniorTokenPrice,
    pool90Ago.juniorTokenPrice,
    pool.seniorTokenPrice,
    pool90Ago.seniorTokenPrice,
    90
  )
  pool.juniorYield90Days = yields90.junior
  pool.seniorYield90Days = yields90.senior

  return pool
}

class Yields {
  junior: BigInt
  senior: BigInt
}

function calculateYields(
  juniorCurrent: BigInt,
  juniorFormer: BigInt,
  seniorCurrent: BigInt,
  seniorFormer: BigInt,
  days: i32
): Yields {
  let juniorYield = juniorCurrent.minus(juniorFormer).times(BigInt.fromI32(365).div(BigInt.fromI32(days)))

  let seniorYield = seniorCurrent.minus(seniorFormer).times(BigInt.fromI32(365).div(BigInt.fromI32(days)))

  log.info(
    'addYields {}: junior token price: {} days ago {}, today {}, yield {}; senior token price: {} days ago {}, today {}, yield {}; ',
    [
      days.toString(),
      days.toString(),
      juniorFormer.toString(),
      juniorCurrent.toString(),
      juniorYield.toString(),
      days.toString(),
      seniorFormer.toString(),
      seniorCurrent.toString(),
      seniorYield.toString(),
    ]
  )

  return {
    junior: juniorYield,
    senior: seniorYield,
  }
}
