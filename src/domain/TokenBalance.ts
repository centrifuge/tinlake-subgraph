import { BigInt } from '@graphprotocol/graph-ts';
import { TokenBalance } from '../../generated/schema'
import { Transfer as TransferEvent } from '../../generated/Block/ERC20'

export function createTokenBalance(id: string, event: TransferEvent, owner: string): TokenBalance {
    let tokenBalance = new TokenBalance(id)
    tokenBalance.owner = owner
    tokenBalance.balance = BigInt.fromI32(0)
    tokenBalance.value = BigInt.fromI32(0)
    tokenBalance.token = event.address.toHex()
    tokenBalance.save()
    return tokenBalance
}

export function loadOrCreateTokenBalanceDst(event: TransferEvent): TokenBalance { 
    let tokenBalanceDstId = event.params.dst.toHex() + event.address.toHex()
    let tokenBalanceDst = TokenBalance.load(tokenBalanceDstId)
    if (tokenBalanceDst == null) {
        tokenBalanceDst = createTokenBalance(tokenBalanceDstId, event, event.params.dst.toHex())
    }
    tokenBalanceDst.balance = tokenBalanceDst.balance.plus(event.params.wad)
    tokenBalanceDst.save()
    return <TokenBalance>tokenBalanceDst
}

export function loadOrCreateTokenBalanceSrc(event: TransferEvent): TokenBalance {
    let tokenBalanceSrcId = event.params.src.toHex() + event.address.toHex()
    let tokenBalanceSrc = TokenBalance.load(tokenBalanceSrcId)
    if (tokenBalanceSrc == null) {
        tokenBalanceSrc = createTokenBalance(tokenBalanceSrcId, event, event.params.src.toHex())
    }
    tokenBalanceSrc.balance = tokenBalanceSrc.balance.minus(event.params.wad)
    tokenBalanceSrc.save()
    return <TokenBalance>tokenBalanceSrc
}
