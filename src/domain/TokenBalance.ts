import { log, BigInt, Address } from '@graphprotocol/graph-ts'
import { Tranche } from '../../generated/templates/Tranche/Tranche'
import {
  DailyInvestorTokenBalance,
  Token,
  TokenBalance,
  Pool,
  PoolInvestor,
  PoolAddresses,
  Account,
} from '../../generated/schema'
import { fixed27 } from '../config'
import { createAccount, ensureSavedInGlobalAccounts } from './Account'
import { pushUnique } from '../util/array'

export function loadOrCreateTokenBalance(owner: string, tokenAddress: string): TokenBalance {
  let tb = TokenBalance.load(owner.concat(tokenAddress))
  {
    if (tb == null) {
      tb = new TokenBalance(owner.concat(tokenAddress))
      tb.owner = owner
      tb.balanceAmount = BigInt.fromI32(0)
      tb.balanceValue = BigInt.fromI32(0)
      tb.totalValue = BigInt.fromI32(0)
      tb.tokenPrice = BigInt.fromI32(0)
      tb.token = tokenAddress
      tb.pendingSupplyCurrency = BigInt.fromI32(0)
      tb.supplyAmount = BigInt.fromI32(0)
      tb.supplyValue = BigInt.fromI32(0)
      tb.save()
    }
  }
  return <TokenBalance>tb
}

export function loadOrCreateDailyInvestorTokenBalance(
  tokenBalance: TokenBalance,
  pool: Pool,
  timestamp: BigInt
): DailyInvestorTokenBalance {
  let id = tokenBalance.owner.concat(pool.id).concat(timestamp.toString()) // investor address + poolId + date

  let ditb = DailyInvestorTokenBalance.load(id)
  if (ditb == null) {
    ditb = new DailyInvestorTokenBalance(id)
    ditb.account = tokenBalance.owner
    ditb.day = timestamp.toString()
    ditb.pool = pool.id
    ditb.seniorTokenAmount = BigInt.fromI32(0)
    ditb.seniorTokenValue = BigInt.fromI32(0)
    ditb.seniorSupplyAmount = BigInt.fromI32(0)
    ditb.seniorPendingSupplyCurrency = BigInt.fromI32(0)
    ditb.juniorTokenAmount = BigInt.fromI32(0)
    ditb.juniorTokenValue = BigInt.fromI32(0)
    ditb.juniorSupplyAmount = BigInt.fromI32(0)
    ditb.juniorPendingSupplyCurrency = BigInt.fromI32(0)
  }

  // update token values
  let addresses = PoolAddresses.load(pool.id)
  if (tokenBalance.token == addresses.seniorToken) {
    ditb.seniorTokenAmount = tokenBalance.balanceAmount
    ditb.seniorSupplyAmount = tokenBalance.supplyAmount
    ditb.seniorPendingSupplyCurrency = tokenBalance.pendingSupplyCurrency
    ditb.seniorTokenValue = pool.seniorTokenPrice
      .times(ditb.seniorTokenAmount.plus(ditb.seniorSupplyAmount))
      .div(fixed27)
  } else {
    ditb.juniorTokenAmount = tokenBalance.balanceAmount
    ditb.juniorSupplyAmount = tokenBalance.supplyAmount
    ditb.juniorPendingSupplyCurrency = tokenBalance.pendingSupplyCurrency
    ditb.juniorTokenValue = pool.juniorTokenPrice
      .times(ditb.juniorTokenAmount.plus(ditb.juniorSupplyAmount))
      .div(fixed27)
  }
  ditb.save()
  return <DailyInvestorTokenBalance>ditb
}

// calcDisburse returns (payoutCurrencyAmount, payoutTokenAmount, remainingSupplyCurrency, remainingRedeemToken)
function calculateDisburse(tb: TokenBalance, poolAddresses: PoolAddresses): void {
  let tranche: Tranche
  if (tb.token == poolAddresses.seniorToken) {
    tranche = Tranche.bind(<Address>Address.fromHexString(poolAddresses.seniorTranche))
  } else {
    tranche = Tranche.bind(<Address>Address.fromHexString(poolAddresses.juniorTranche))
  }
  let result = tranche.calcDisburse(<Address>Address.fromHexString(tb.owner))
  tb.pendingSupplyCurrency = result.value2
  tb.supplyAmount = result.value1
  log.debug('calculateDisburse{} token {}, pendingSupply {}, supplyAmount {}', [
    tb.owner.toString(),
    tb.token.toString(),
    tb.pendingSupplyCurrency.toString(),
    tb.supplyAmount.toString(),
  ])

  tb.save()
}

// made up currently junior and senior token.owners
export function loadOrCreatePoolInvestors(poolId: string): PoolInvestor {
  let ids = PoolInvestor.load(poolId)
  if (ids == null) {
    ids = new PoolInvestor(poolId)
    ids.accounts = []
    ids.save()
  }
  return <PoolInvestor>ids
}

function investmentGreaterThanZero(tb: TokenBalance): boolean {
  return tb.totalValue.gt(BigInt.fromI32(0))
}

function updateTokenBalanceValues(tb: TokenBalance, pool: Pool, poolAddresses: PoolAddresses): void {
  if (tb.token == poolAddresses.seniorToken) {
    tb.tokenPrice = pool.seniorTokenPrice
  } else {
    tb.tokenPrice = pool.juniorTokenPrice
  }
  tb.balanceValue = tb.balanceAmount.times(tb.tokenPrice).div(fixed27)
  tb.supplyValue = tb.supplyAmount.times(tb.tokenPrice).div(fixed27)
  tb.totalValue = tb.supplyValue.plus(tb.balanceValue)
}

export function createDailyTokenBalances(token: Token, pool: Pool, timestamp: BigInt): void {
  log.debug('createDailyTokenBalances: token {}, pool {}', [token.id, pool.id])
  let poolInvestors = loadOrCreatePoolInvestors(pool.id)
  let addresses = PoolAddresses.load(pool.id)
  let owners = token.owners

  for (let i = 0; i < owners.length; i++) {
    let holderId = owners[i]
    let tbId = holderId.concat(token.id)

    log.debug('createDailyTokenBalances: token balance {}', [tbId])

    let tb = TokenBalance.load(tbId)
    if (tb != null) {
      calculateDisburse(<TokenBalance>tb, <PoolAddresses>addresses)
      // update tokenBalance value
      updateTokenBalanceValues(<TokenBalance>tb, <Pool>pool, <PoolAddresses>addresses)
      tb.save()

      log.debug('createDailyTokenBalances: load or create token balance {}', [tbId])
      let ditb = loadOrCreateDailyInvestorTokenBalance(<TokenBalance>tb, pool, timestamp)

      // if token balance value is greater than 0, they have an active investment
      if (investmentGreaterThanZero(<TokenBalance>tb)) {
        let account = Account.load(ditb.account)
        if (account == null) {
          account = createAccount(ditb.account)
        }
        account.rewardCalcBitFlip = true
        account.save()
      }
      // bit of a hack to get around lack of array support in assembly script
      ensureSavedInGlobalAccounts(ditb.account)
      poolInvestors.accounts = pushUnique(poolInvestors.accounts, ditb.account)
      poolInvestors.save()
    }
  }
}
