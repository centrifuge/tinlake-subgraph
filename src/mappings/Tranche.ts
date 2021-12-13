import { log, BigInt, dataSource } from '@graphprotocol/graph-ts'
import { SupplyOrderCall, RedeemOrderCall, DisburseCall } from '../../generated/templates/Tranche/Tranche'
import { Account, PoolAddresses, InvestorTransaction, Pool } from '../../generated/schema'
import { ensureSavedInGlobalAccounts, createAccount, isSystemAccount } from '../domain/Account'
import { calculateDisburse, loadOrCreateTokenBalance } from '../domain/TokenBalance'
import { loadOrCreateToken } from '../domain/Token'
import { pushUnique } from '../util/array'

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
  let pool = Pool.load(poolId);
  let poolAddresses = PoolAddresses.load(poolId)
  let token = poolAddresses.juniorToken
  let trancheString = "JUNIOR";
  let tokenPrice = pool.juniorTokenPrice;
  if (poolAddresses.seniorTranche == tranche) {
    token = poolAddresses.seniorToken
    trancheString = "SENIOR";
    tokenPrice = pool.seniorTokenPrice;
  }


  // protection from adding system account to internal tracking
  if (isSystemAccount(poolId, account)) {
    return
  }
  if (Account.load(account) == null) {
    createAccount(account)
  }
  ensureSavedInGlobalAccounts(account)
  // ensure user is in token owners
  let tk = loadOrCreateToken(token)
  tk.owners = pushUnique(tk.owners, account)
  tk.save()

  let tb = loadOrCreateTokenBalance(account, token)
  calculateDisburse(tb, <PoolAddresses>poolAddresses)
  tb.save()
  
  let type = "SUPPLY_ORDER";
  if (call.inputs.newSupplyAmount == BigInt.fromI32(0)) {
    type = "SUPPLY_CANCELLED";
  }

  let investorTx = new InvestorTransaction(call.transaction.hash.toHex().concat(account).concat(trancheString).concat(type));
  investorTx.owner = account;
  investorTx.pool = poolId;
  investorTx.timestamp = call.block.timestamp;
  investorTx.type = type;
  investorTx.currencyAmount = call.inputs.newSupplyAmount;
  investorTx.gasUsed = call.transaction.gasUsed;
  investorTx.gasPrice = call.transaction.gasPrice;
  investorTx.tokenPrice = tokenPrice;
  investorTx.newBalance = tb.balanceValue;
  investorTx.transaction = call.transaction.hash.toHex();
  investorTx.save();
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
  let pool = Pool.load(poolId);
  let poolAddresses = PoolAddresses.load(poolId)
  let token = poolAddresses.juniorToken
  let trancheString = "JUNIOR";
  let tokenPrice = pool.juniorTokenPrice;
  if (poolAddresses.seniorTranche == tranche) {
    token = poolAddresses.seniorToken
    trancheString = "SENIOR";
    tokenPrice = pool.seniorTokenPrice;
  }

  // protection from adding system account to internal tracking
  if (isSystemAccount(poolId, account)) {
    return
  }
  if (Account.load(account) == null) {
    createAccount(account)
  }
  ensureSavedInGlobalAccounts(account)

  // ensure user is in token owners
  let tk = loadOrCreateToken(token)
  tk.owners = pushUnique(tk.owners, account)
  tk.save()

  let tb = loadOrCreateTokenBalance(account, token)
  calculateDisburse(tb, <PoolAddresses>poolAddresses)
  tb.save()
  
  let type = "REDEEM_ORDER";
  if (call.inputs.newRedeemAmount == BigInt.fromI32(0)) {
    type = "REDEEM_CANCELLED";
  }

  let investorTx = new InvestorTransaction(call.transaction.hash.toHex().concat(account).concat(trancheString).concat("REDEEM_ORDER"));
  investorTx.owner = account;
  investorTx.pool = poolId;
  investorTx.timestamp = call.block.timestamp;
  investorTx.type = "REDEEM_ORDER";
  investorTx.currencyAmount = BigInt.fromI32(call.inputs.newRedeemAmount.toI32() * tokenPrice.toI32() / 10**27);
  investorTx.gasUsed = call.transaction.gasUsed;
  investorTx.gasPrice = call.transaction.gasPrice;
  investorTx.tokenPrice = tokenPrice;
  investorTx.newBalance = tb.balanceValue;
  investorTx.transaction = call.transaction.hash.toHex();
  investorTx.save();
}
