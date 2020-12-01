import { log, BigInt } from '@graphprotocol/graph-ts'
import { Transfer as TransferEvent } from '../../generated/Block/ERC20'
import {
  RewardDailyInvestorTokenBalance,
  Token,
  TokenBalance,
  Pool,
  RewardDailyInvestorIdentifier,
  PoolAddresses,
} from '../../generated/schema'
import { secondsInDay } from '../config'

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
  let tokenBalanceDstId = dst + tokenAddress
  let tokenBalanceDst = TokenBalance.load(tokenBalanceDstId)
  if (tokenBalanceDst == null) {
    tokenBalanceDst = createTokenBalance(tokenBalanceDstId, event, dst)
  }
  tokenBalanceDst.balance = tokenBalanceDst.balance.plus(event.params.wad)
  tokenBalanceDst.save()
  return tokenBalanceDst as TokenBalance
}

export function loadOrCreateTokenBalanceSrc(event: TransferEvent, tokenAddress: string): TokenBalance {
  let src = event.params.src.toHex()
  let tokenBalanceSrcId = src + tokenAddress
  let tokenBalanceSrc = TokenBalance.load(tokenBalanceSrcId)
  if (tokenBalanceSrc == null) {
    tokenBalanceSrc = createTokenBalance(tokenBalanceSrcId, event, src)
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
    ditb.nonZeroBalanceSince = BigInt.fromI32(0)
  }

  let addresses = PoolAddresses.load(pool.id)
  if (tokenBalance.token == addresses.seniorToken) {
    ditb.seniorTokenAmount = tokenBalance.balance
    ditb.seniorTokenValue = pool.seniorTokenPrice.times(tokenBalance.balance)
  } else {
    ditb.juniorTokenAmount = tokenBalance.balance
    ditb.juniorTokenValue = pool.juniorTokenPrice.times(tokenBalance.balance)
  }

  updateNonZeroBalance(<RewardDailyInvestorTokenBalance>ditb, timestamp)
  ditb.save()
  return <RewardDailyInvestorTokenBalance>ditb
}

export function loadOrCreateDailyInvestorTokenBalanceIds(poolId: string): RewardDailyInvestorIdentifier {
  let ids = RewardDailyInvestorIdentifier.load(poolId)
  if (ids == null) {
    ids = new RewardDailyInvestorIdentifier(poolId)
    ids.rewardIds = []
    ids.save()
  }
  return <RewardDailyInvestorIdentifier>ids
}

export function createDailyTokenBalances(token: Token, pool: Pool, timestamp: BigInt): void {
  log.debug('createDailyTokenBalances: token {}, pool {}', [token.id, pool.id])
  let ids = loadOrCreateDailyInvestorTokenBalanceIds(pool.id)

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
      if (!ids.rewardIds.includes(ditb.id)) {
        let temp = ids.rewardIds
        temp.push(ditb.id)
        ids.rewardIds = temp
        ids.save()
      }
    }
  }
}

function updateNonZeroBalance(rwd: RewardDailyInvestorTokenBalance, timestamp: BigInt): void {
  if (rwd.juniorTokenAmount.plus(rwd.seniorTokenAmount) == BigInt.fromI32(0)) {
    rwd.nonZeroBalanceSince = BigInt.fromI32(0)
    return
  }

  let yesterdayTimeStamp = timestamp.minus(BigInt.fromI32(secondsInDay))
  let yesterdayId = rwd.account.concat(rwd.pool).concat(yesterdayTimeStamp.toString())
  let yesterdayRewardTokenBalance = RewardDailyInvestorTokenBalance.load(yesterdayId)
  if (yesterdayRewardTokenBalance == null) {
    rwd.nonZeroBalanceSince = timestamp
    return
  }
  if (yesterdayRewardTokenBalance.nonZeroBalanceSince != BigInt.fromI32(0)) {
    rwd.nonZeroBalanceSince = yesterdayRewardTokenBalance.nonZeroBalanceSince
    return
  }
}
