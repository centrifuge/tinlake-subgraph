import { log, BigInt } from '@graphprotocol/graph-ts'
import { Transfer as TransferEvent } from '../../generated/Block/ERC20'
import {
  RewardDailyInvestorTokenBalance,
  Token,
  TokenBalance,
  Pool,
  RewardDayTotal,
  RewardDailyInvestorIdentifier,
  PoolAddresses
} from '../../generated/schema'
import { secondsInDay } from '../config'

export function createTokenBalance(id: string, event: TransferEvent, owner: string): TokenBalance {
  let tokenBalance = new TokenBalance(id)

  tokenBalance.owner = owner
  tokenBalance.balance = BigInt.fromI32(0)
  tokenBalance.value = BigInt.fromI32(0)
  tokenBalance.token = event.address.toHex()
  tokenBalance.save()

  return tokenBalance
}

export function loadOrCreateTokenBalanceDst(event: TransferEvent, tokenAddress: string): TokenBalance {
  let tokenBalanceDstId = event.params.dst.toHex() + tokenAddress
  let tokenBalanceDst = TokenBalance.load(tokenBalanceDstId)

  if (tokenBalanceDst == null) {
    tokenBalanceDst = createTokenBalance(tokenBalanceDstId, event, event.params.dst.toHex())
  }

  tokenBalanceDst.balance = tokenBalanceDst.balance.plus(event.params.wad)
  tokenBalanceDst.save()
  return tokenBalanceDst as TokenBalance
}

export function loadOrCreateTokenBalanceSrc(event: TransferEvent, tokenAddress: string): TokenBalance {
  let tokenBalanceSrcId = event.params.src.toHex() + tokenAddress
  let tokenBalanceSrc = TokenBalance.load(tokenBalanceSrcId)

  if (tokenBalanceSrc == null) {
    tokenBalanceSrc = createTokenBalance(tokenBalanceSrcId, event, event.params.src.toHex())
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

  let dailyInvestorTokenBalance = RewardDailyInvestorTokenBalance.load(id)
  if (dailyInvestorTokenBalance == null) {
    dailyInvestorTokenBalance = new RewardDailyInvestorTokenBalance(id)
    dailyInvestorTokenBalance.account = tokenBalance.owner
    dailyInvestorTokenBalance.day = timestamp.toString()
    dailyInvestorTokenBalance.pool = pool.id
    dailyInvestorTokenBalance.seniorTokenAmount = BigInt.fromI32(0)
    dailyInvestorTokenBalance.seniorTokenValue = BigInt.fromI32(0)
    dailyInvestorTokenBalance.juniorTokenAmount = BigInt.fromI32(0)
    dailyInvestorTokenBalance.juniorTokenValue = BigInt.fromI32(0)
    dailyInvestorTokenBalance.nonZeroBalanceSince = BigInt.fromI32(0)
  }

  let addresses = PoolAddresses.load(pool.id)
  if (tokenBalance.token == addresses.seniorToken) {
    dailyInvestorTokenBalance.seniorTokenAmount = tokenBalance.balance
    dailyInvestorTokenBalance.seniorTokenValue = pool.seniorTokenPrice.times(tokenBalance.balance)
  } else {
    dailyInvestorTokenBalance.juniorTokenAmount = tokenBalance.balance
    dailyInvestorTokenBalance.juniorTokenValue = pool.juniorTokenPrice.times(tokenBalance.balance)
  }

  updateNonZeroBalance(<RewardDailyInvestorTokenBalance>dailyInvestorTokenBalance, timestamp)

  dailyInvestorTokenBalance.save()
  return <RewardDailyInvestorTokenBalance>dailyInvestorTokenBalance
}

function loadOrCreateDailyInvestorTokenBalanceIds(poolId: string): RewardDailyInvestorIdentifier {
  let ids = RewardDailyInvestorIdentifier.load(poolId)
  if (ids == null) {
    ids = new RewardDailyInvestorIdentifier(poolId)
    ids.rewardIds = []
  }
  ids.save()
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

// TODO: should be moved to another file
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

// TODO: should be moved to another file
export function updateRewardDayTotal(date: BigInt, pool: Pool): RewardDayTotal {
  let rewardDayTotal = loadOrCreateRewardDayTotal(date)
  // add current pool to today's value
  rewardDayTotal.todayValue = rewardDayTotal.todayValue.plus(pool.assetValue)
  let prevDayRewardId = date.minus(BigInt.fromI32(secondsInDay))
  let prevDayRewardTotal = loadOrCreateRewardDayTotal(prevDayRewardId)
  // we really only want to run this at the end of all the pools..
  // but it will still work this way..
  rewardDayTotal.toDateAggregateValue = rewardDayTotal.todayValue.plus(prevDayRewardTotal.toDateAggregateValue)
  rewardDayTotal.save()
  return rewardDayTotal
}

// TODO: should be moved to another file
export function loadOrCreateRewardDayTotal(date: BigInt): RewardDayTotal {
  let rewardDayTotal = RewardDayTotal.load(date.toString())
  if (rewardDayTotal == null) {
    rewardDayTotal = new RewardDayTotal(date.toString())
    rewardDayTotal.todayValue = BigInt.fromI32(0)
    rewardDayTotal.toDateAggregateValue = BigInt.fromI32(0)
    rewardDayTotal.rewardRate = BigInt.fromI32(0)
  }
  rewardDayTotal.save()
  return <RewardDayTotal>rewardDayTotal
}

// function rewardRate()
// {
//     if toDateAggregateValue is less than 300 million Dai )
//     then the reward is x rad per dai (is going to be constant)

//     if more, then no rewards
//     when it expires, we will have a new reward function

// }
