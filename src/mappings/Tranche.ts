import { log, BigInt, dataSource, ethereum } from '@graphprotocol/graph-ts'
import { SupplyOrderCall, RedeemOrderCall, DisburseCall } from '../../generated/templates/Tranche/Tranche'
import { Account, PoolAddresses, InvestorTransaction, Pool, Token } from '../../generated/schema'
import { ensureSavedInGlobalAccounts, createAccount, isSystemAccount } from '../domain/Account'
import { calculateDisburse, loadOrCreateTokenBalance } from '../domain/TokenBalance'
import { loadOrCreateToken } from '../domain/Token'
import { pushUnique } from '../util/array'
import { fixed27 } from '../config'
import { loadOrCreatePreviousTransaction } from '../domain/PrevInvestorTransactionByToken'
import { addInvestorTransactions } from './Coordinator'

// the supply order is the first contact an investor has with tinlake
export function handleSupplyOrder(call: SupplyOrderCall): void {
  let tranche = call.to.toHex()
  let poolId = dataSource.context().getString('id')
  let account = call.inputs.usr.toHex()
  log.debug('handle supply order for pool {}, tranche {}, from account {}', [
    poolId.toString(),
    tranche.toString(),
    account,
  ])
  let pool = Pool.load(poolId)
  if (!pool) {
    return
  }
  let poolAddresses = PoolAddresses.load(poolId)
  if (!poolAddresses) {
    return
  }
  let token = poolAddresses.juniorToken
  let trancheString = 'JUNIOR'
  let tokenPrice = pool.juniorTokenPrice
  if (poolAddresses.seniorTranche == tranche) {
    token = poolAddresses.seniorToken
    trancheString = 'SENIOR'
    tokenPrice = pool.seniorTokenPrice
  }

  // protection from adding system account to internal tracking
  if (isSystemAccount(poolId, account)) {
    return
  }
  if (!Account.load(account)) {
    createAccount(account)
  }
  ensureSavedInGlobalAccounts(account)
  // ensure user is in token owners
  let tk = loadOrCreateToken(token)
  tk.owners = pushUnique(tk.owners, account)
  tk.save()

  let tb = loadOrCreateTokenBalance(account, token)
  calculateDisburse(tb, <PoolAddresses>poolAddresses)

  let type = 'INVEST_ORDER'
  if (call.inputs.newSupplyAmount.equals(BigInt.fromI32(0))) {
    type = 'INVEST_CANCEL'
  }

  let symbol: string = Token.load(token) ? ((Token.load(token) as Token).symbol as string) : '-'

  let id = call.transaction.hash
    .toHex()
    .concat(account)
    .concat(trancheString)
    .concat(type)
  log.info('AddInvestorTransaction: id {}, block{}', [id, call.block.number.toString()])
  let investorTx = new InvestorTransaction(id)
  investorTx.owner = account
  investorTx.pool = poolId
  investorTx.timestamp = call.block.timestamp
  investorTx.type = type
  investorTx.tokenAmount = tokenPrice.gt(BigInt.fromI32(0))
    ? tb.pendingSupplyCurrency.times(fixed27).div(tokenPrice)
    : tb.pendingSupplyCurrency
  investorTx.currencyAmount = tb.pendingSupplyCurrency
  investorTx.gasUsed = call.transaction.gasLimit
  investorTx.gasPrice = call.transaction.gasPrice
  investorTx.tokenPrice = tokenPrice
  investorTx.symbol = symbol
  investorTx.newBalance = tb.totalAmount
  investorTx.newBalanceValue = tb.totalValue
  investorTx.transaction = call.transaction.hash.toHex()
  investorTx.save()
  let previousTokenTransaction = loadOrCreatePreviousTransaction(account.concat(token))
  previousTokenTransaction.prevTransaction = id
  previousTokenTransaction.pendingExecution = false
  previousTokenTransaction.save()
}

// redemptions shouldn't count towards balance that users get for rewards
export function handleRedeemOrder(call: RedeemOrderCall): void {
  let tranche = call.to.toHex()
  let poolId = dataSource.context().getString('id')
  let account = call.inputs.usr.toHex()
  log.debug('handle redeem order for pool {}, tranche {}, from account {}', [
    poolId.toString(),
    tranche.toString(),
    account,
  ])
  let pool = Pool.load(poolId)
  if (!pool) {
    return
  }
  let poolAddresses = PoolAddresses.load(poolId)
  if (!poolAddresses) {
    return
  }
  let token = poolAddresses.juniorToken
  let trancheString = 'JUNIOR'
  let tokenPrice = pool.juniorTokenPrice
  if (poolAddresses.seniorTranche == tranche) {
    token = poolAddresses.seniorToken
    trancheString = 'SENIOR'
    tokenPrice = pool.seniorTokenPrice
  }

  // protection from adding system account to internal tracking
  if (isSystemAccount(poolId, account)) {
    return
  }
  if (!Account.load(account)) {
    createAccount(account)
  }
  ensureSavedInGlobalAccounts(account)

  // ensure user is in token owners
  let tk = loadOrCreateToken(token)
  tk.owners = pushUnique(tk.owners, account)
  tk.save()

  let tb = loadOrCreateTokenBalance(account, token)
  calculateDisburse(tb, <PoolAddresses>poolAddresses)

  let type = 'REDEEM_ORDER'
  if (call.inputs.newRedeemAmount.equals(BigInt.fromI32(0))) {
    type = 'REDEEM_CANCEL'
  }

  let symbol: string = Token.load(token) ? ((Token.load(token) as Token).symbol as string) : '-'

  let id = call.transaction.hash
    .toHex()
    .concat(account)
    .concat(trancheString)
    .concat(type)
  log.info('AddInvestorTransaction: id {}, block{}', [id, call.block.number.toString()])
  let investorTx = new InvestorTransaction(id)
  investorTx.owner = account
  investorTx.pool = poolId
  investorTx.timestamp = call.block.timestamp
  investorTx.type = type
  investorTx.tokenAmount = tb.pendingRedeemToken
  investorTx.currencyAmount = tokenPrice.gt(BigInt.fromI32(0))
    ? tb.pendingRedeemToken.times(tokenPrice).div(fixed27)
    : tb.pendingRedeemToken
  investorTx.gasUsed = call.transaction.gasLimit
  investorTx.gasPrice = call.transaction.gasPrice
  investorTx.tokenPrice = tokenPrice
  investorTx.symbol = symbol
  investorTx.newBalance = tb.totalAmount
  investorTx.newBalanceValue = tb.totalValue
  investorTx.transaction = call.transaction.hash.toHex()
  investorTx.save()
  let previousTokenTransaction = loadOrCreatePreviousTransaction(account.concat(token))
  previousTokenTransaction.prevTransaction = id
  previousTokenTransaction.save()
  previousTokenTransaction.pendingExecution = false
}
