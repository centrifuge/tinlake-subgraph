import { log, BigInt } from '@graphprotocol/graph-ts'
import { Transfer as TransferEvent } from '../../generated/Block/ERC20'
import {
  RewardDailyInvestorTokenBalance,
  Token,
  TokenBalance,
  Pool,
  PoolInvestor,
  PoolAddresses,
} from '../../generated/schema'
import { fixed27 } from '../config'
import { isSystemAccount, loadOrCreateGlobalAccounts } from './Account'

export function loadOrCreateTokenBalance(id: string, address: string, owner: string): TokenBalance {
  let tb = TokenBalance.load(id)
  {
    if (tb == null) {
      tb = new TokenBalance(id)
      tb.owner = owner
      tb.balance = BigInt.fromI32(0)
      tb.value = BigInt.fromI32(0)
      tb.token = address
      tb.pendingSupplyCurrency = BigInt.fromI32(0)
      tb.supplyAmount = BigInt.fromI32(0)
      tb.save()
    }
  }
  return <TokenBalance>tb
}

export function loadOrCreateTokenBalanceDst(event: TransferEvent, tokenAddress: string, poolId: string): void {
  let dst = event.params.dst.toHex()

  if (!isSystemAccount(poolId, dst)) {
    let tokenBalanceId = dst + tokenAddress
    let tokenBalanceDst = TokenBalance.load(tokenBalanceId)
    if (tokenBalanceDst == null) {
      tokenBalanceDst = loadOrCreateTokenBalance(tokenBalanceId, tokenAddress, dst)
    }
    tokenBalanceDst.balance = tokenBalanceDst.balance.plus(event.params.wad)
    tokenBalanceDst.save()
  }
}

export function loadOrCreateTokenBalanceSrc(event: TransferEvent, tokenAddress: string, poolId: string): void {
  let src = event.params.src.toHex()

  if (!isSystemAccount(poolId, src)) {
    let tokenBalanceId = src + tokenAddress
    let tokenBalanceSrc = TokenBalance.load(tokenBalanceId)
    if (tokenBalanceSrc == null) {
      tokenBalanceSrc = loadOrCreateTokenBalance(tokenBalanceId, tokenAddress, src)
    }
    tokenBalanceSrc.balance = tokenBalanceSrc.balance.minus(event.params.wad)
    tokenBalanceSrc.save()
  }
}

export function loadOrCreateDailyInvestorTokenBalance(
  tokenBalance: TokenBalance,
  pool: Pool,
  timestamp: BigInt
): RewardDailyInvestorTokenBalance {
  let id = tokenBalance.owner.concat(pool.id).concat(timestamp.toString()) // investor address + poolId + date

  // todo: add tb.supplyAmount
  // tb.pending to token values
  let ditb = RewardDailyInvestorTokenBalance.load(id)
  if (ditb == null) {
    ditb = new RewardDailyInvestorTokenBalance(id)
    ditb.account = tokenBalance.owner
    ditb.day = timestamp.toString()
    ditb.pool = pool.id
    ditb.seniorTokenAmount = BigInt.fromI32(0)
    ditb.seniorTokenValue = BigInt.fromI32(0)

    // todo:
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
    ditb.seniorTokenAmount = tokenBalance.balance
    ditb.seniorSupplyAmount = tokenBalance.supplyAmount
    ditb.seniorTokenValue = pool.seniorTokenPrice
      .times(ditb.seniorTokenAmount.plus(ditb.seniorSupplyAmount))
      .div(fixed27)
  } else {
    ditb.juniorTokenAmount = tokenBalance.balance
    ditb.juniorSupplyAmount = tokenBalance.supplyAmount
    ditb.juniorTokenValue = pool.juniorTokenPrice
      .times(ditb.juniorTokenAmount.plus(ditb.juniorSupplyAmount))
      .div(fixed27)
  }
  ditb.save()
  return <RewardDailyInvestorTokenBalance>ditb
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

export function createDailyTokenBalances(token: Token, pool: Pool, timestamp: BigInt): void {
  log.debug('createDailyTokenBalances: token {}, pool {}', [token.id, pool.id])
  let globalAccounts = loadOrCreateGlobalAccounts('1')
  let poolInvestors = loadOrCreatePoolInvestors(pool.id)

  for (let i = 0; i < token.owners.length; i++) {
    let owners = token.owners
    let holderId = owners[i]
    let tbId = holderId.concat(token.id)

    log.debug('createDailyTokenBalances: token balance {}', [tbId])

    let tb = TokenBalance.load(tbId)
    if (tb != null) {
      // todo: calculate disburse on the token balance
      // and put the results into
      // tb.pendingSupplyCurrency
      // tb.supplyAmount

      log.debug('createDailyTokenBalances: load or create token balance {}', [tbId])
      let ditb = loadOrCreateDailyInvestorTokenBalance(<TokenBalance>tb, pool, timestamp)
      // bit of a hack to get around lack of array support in assembly script
      // todo: stop RepeatingYourself
      if (!globalAccounts.accounts.includes(ditb.account)) {
        let temp = globalAccounts.accounts
        temp.push(ditb.account)
        globalAccounts.accounts = temp
        globalAccounts.save()
      }

      // todo: move this to where i add them to token.owners..
      // todo: stop RepeatingYourself
      if (!poolInvestors.accounts.includes(ditb.account)) {
        let temp = poolInvestors.accounts
        temp.push(ditb.account)
        poolInvestors.accounts = temp
        poolInvestors.save()
      }
    }
  }
}
