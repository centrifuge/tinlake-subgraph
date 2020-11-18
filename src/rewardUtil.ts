import { BigInt } from "@graphprotocol/graph-ts";
import { RewardDailyInvestorTokenBalance, Token, TokenBalance, Pool, RewardDayTotal, RewardDailyInvestorIdentifier } from "../generated/schema"
import { seniorTokenAddresses } from "../src/poolMetas"

const secondsInDay = 86400

// todo: if the owner/account address is part of the pool, don't add it to rewards calcs
export function loadOrCreateDailyInvestorTokenBalance(tokenBalance: TokenBalance, pool: Pool, timestamp: BigInt) : RewardDailyInvestorTokenBalance {
    let id = tokenBalance.owner.concat(pool.id).concat(timestamp.toString())  //investor address + poolId + date
    
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

    // todo: store addresses in pool instead
    if (seniorTokenAddresses.includes(tokenBalance.token)) {
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
    let ids = loadOrCreateDailyInvestorTokenBalanceIds(pool.id)

    for(let i = 0; i < token.owners.length; i++){
        let owners = token.owners
        let holderId = owners[i]
        let tbId = holderId.concat(token.id)

        let tb = TokenBalance.load(tbId)
        if(tb != null) {
            let ditb = loadOrCreateDailyInvestorTokenBalance(<TokenBalance>tb, pool, timestamp)
            // bit of a hack to get around lack of array support in assembly script
            if(!ids.rewardIds.includes(ditb.id)){
                let temp = ids.rewardIds
                temp.push(ditb.id)
                ids.rewardIds = temp
                ids.save()
            }     
        }
    }
}

function updateNonZeroBalance(rwd: RewardDailyInvestorTokenBalance, timestamp: BigInt): void {
    if(rwd.juniorTokenAmount.plus(rwd.seniorTokenAmount) == BigInt.fromI32(0)) {
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

export function loadOrCreateRewardDayTotal(date: BigInt): RewardDayTotal {
    let rewardDayTotal = RewardDayTotal.load(date.toString())
    if (rewardDayTotal == null) {
        rewardDayTotal = new RewardDayTotal(date.toString())        
        rewardDayTotal.todayValue = BigInt.fromI32(0)
        rewardDayTotal.toDateAggregateValue = BigInt.fromI32(0)
        rewardDayTotal.rewardRate = BigInt.fromI32(0)
    }
    rewardDayTotal.save()
    return <RewardDayTotal> rewardDayTotal
}

// function rewardRate()
// {
//     if toDateAggregateValue is less than 300 million Dai )
//     then the reward is x rad per dai (is going to be constant)

//     if more, then no rewards 
//     when it expires, we will have a new reward function 

// }