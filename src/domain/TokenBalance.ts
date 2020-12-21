import { log, BigInt, Address } from '@graphprotocol/graph-ts'
import { Transfer as TransferEvent } from '../../generated/Block/ERC20'
import { Tranche } from '../../generated/templates/Tranche/Tranche'
import {
  RewardDailyInvestorTokenBalance,
  Token,
  TokenBalance,
  Pool,
  PoolInvestor,
  PoolAddresses,
} from '../../generated/schema'
import { fixed27 } from '../config'
import { addToGlobalAccounts, isSystemAccount } from './Account'
import { push } from '../util/array'

export function loadOrCreateTokenBalance(owner: string, tokenAddress: string): TokenBalance {
  let tb = TokenBalance.load(owner.concat(tokenAddress))
  {
    if (tb == null) {
      tb = new TokenBalance(tokenAddress.concat(owner))
      tb.owner = owner
      tb.balance = BigInt.fromI32(0)
      tb.value = BigInt.fromI32(0)
      tb.token = tokenAddress
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
    let tokenBalanceDst = TokenBalance.load(dst.concat(tokenAddress))
    if (tokenBalanceDst == null) {
      tokenBalanceDst = loadOrCreateTokenBalance(dst, tokenAddress)
    }
    tokenBalanceDst.balance = tokenBalanceDst.balance.plus(event.params.wad)
    tokenBalanceDst.save()
  }
}

export function loadOrCreateTokenBalanceSrc(event: TransferEvent, tokenAddress: string, poolId: string): void {
  let src = event.params.src.toHex()

  if (!isSystemAccount(poolId, src)) {
    let tokenBalanceSrc = TokenBalance.load(src.concat(tokenAddress))
    if (tokenBalanceSrc == null) {
      tokenBalanceSrc = loadOrCreateTokenBalance(src, tokenAddress)
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
  let poolInvestors = loadOrCreatePoolInvestors(pool.id)
  let addresses = PoolAddresses.load(pool.id)

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
      let seniorTranche = Tranche.bind(<Address>Address.fromHexString(addresses.seniorTranche))

      let juniorTranche = Tranche.bind(<Address>Address.fromHexString(addresses.juniorTranche))

      log.debug('createDailyTokenBalances: load or create token balance {}', [tbId])
      let ditb = loadOrCreateDailyInvestorTokenBalance(<TokenBalance>tb, pool, timestamp)
      // bit of a hack to get around lack of array support in assembly script
      addToGlobalAccounts(ditb.account)

      poolInvestors.accounts = push(poolInvestors.accounts, ditb.account)
      poolInvestors.save()
    }
  }
}
