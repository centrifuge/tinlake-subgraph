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
import { loadOrCreateGlobalAccounts } from './Account'

export function createTokenBalance(id: string, event: TransferEvent, owner: string): TokenBalance {
  let tb = new TokenBalance(id)
  tb.owner = owner
  tb.balance = BigInt.fromI32(0)
  tb.value = BigInt.fromI32(0)
  tb.token = event.address.toHex()
  tb.save()
  return tb
}

export function loadOrCreateTokenBalanceDst(event: TransferEvent, tokenAddress: string): TokenBalance {
  let dst = event.params.dst.toHex()
  let tokenBalanceId = dst + tokenAddress
  let tokenBalanceDst = TokenBalance.load(tokenBalanceId)
  if (tokenBalanceDst == null) {
    tokenBalanceDst = createTokenBalance(tokenBalanceId, event, dst)
  }
  tokenBalanceDst.balance = tokenBalanceDst.balance.plus(event.params.wad)
  tokenBalanceDst.save()
  return tokenBalanceDst as TokenBalance
}

export function loadOrCreateTokenBalanceSrc(event: TransferEvent, tokenAddress: string): TokenBalance {
  let src = event.params.src.toHex()
  let tokenBalanceId = src + tokenAddress
  let tokenBalanceSrc = TokenBalance.load(tokenBalanceId)
  if (tokenBalanceSrc == null) {
    tokenBalanceSrc = createTokenBalance(tokenBalanceId, event, src)
  }
  tokenBalanceSrc.balance = tokenBalanceSrc.balance.minus(event.params.wad)
  tokenBalanceSrc.save()
  return tokenBalanceSrc as TokenBalance
}

// TODO: if the owner/account address is part of the pool, don't add it to rewards calcs
export function loadOrCreateDailyInvestorTokenBalance(
  tokenBalance: TokenBalance,
  pool: Pool,
  timestamp: BigInt
): RewardDailyInvestorTokenBalance {
  let id = tokenBalance.owner.concat(pool.id).concat(timestamp.toString()) // investor address + poolId + date

  let ditb = RewardDailyInvestorTokenBalance.load(id)
  if (ditb == null) {
    ditb = new RewardDailyInvestorTokenBalance(id)
    ditb.account = tokenBalance.owner
    ditb.day = timestamp.toString()
    ditb.pool = pool.id
    ditb.seniorTokenAmount = BigInt.fromI32(0)
    ditb.seniorTokenValue = BigInt.fromI32(0)
    ditb.juniorTokenAmount = BigInt.fromI32(0)
    ditb.juniorTokenValue = BigInt.fromI32(0)
  }

  // update token values
  let addresses = PoolAddresses.load(pool.id)
  if (tokenBalance.token == addresses.seniorToken) {
    ditb.seniorTokenAmount = tokenBalance.balance
    ditb.seniorTokenValue = pool.seniorTokenPrice.times(tokenBalance.balance)
  } else {
    ditb.juniorTokenAmount = tokenBalance.balance
    ditb.juniorTokenValue = pool.juniorTokenPrice.times(tokenBalance.balance)
  }
  ditb.save()
  return <RewardDailyInvestorTokenBalance>ditb
}

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
      log.debug('createDailyTokenBalances: load or create token balance {}', [tbId])
      let ditb = loadOrCreateDailyInvestorTokenBalance(<TokenBalance>tb, pool, timestamp)
      // bit of a hack to get around lack of array support in assembly script
      if (!globalAccounts.accounts.includes(ditb.account)) {
        let temp = globalAccounts.accounts
        temp.push(ditb.account)
        globalAccounts.accounts = temp
        globalAccounts.save()
      }
      if (!poolInvestors.accounts.includes(ditb.account)) {
        let temp = poolInvestors.accounts
        temp.push(ditb.account)
        poolInvestors.accounts = temp
        poolInvestors.save()
      }
    }
  }
}
