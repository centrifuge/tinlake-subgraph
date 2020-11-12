import { BigInt } from "@graphprotocol/graph-ts";
import { RewardDailyInvestorTokenBalance, Token, TokenBalance, Pool } from "../generated/schema"
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

export function createDailyTokenBalances(token: Token, pool: Pool, timestamp: BigInt): void {
    for(let i = 0; i < token.owners.length; i++){
        let owners = token.owners
        let holderId = owners[i]
        let tbId = holderId.concat(token.id)

        let tb = TokenBalance.load(tbId)
        if(tb != null) {
            loadOrCreateDailyInvestorTokenBalance(<TokenBalance>tb, pool, timestamp)
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
