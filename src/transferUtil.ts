import { BigInt } from '@graphprotocol/graph-ts'
import { Account, ERC20Transfer, Token, TokenBalance } from '../generated/schema'
import { Transfer as TransferEvent } from '../generated/Block/ERC20'
import { PoolMeta } from './poolMetas'

export function createAccount(address: string): Account {
  let account = new Account(address)
  account.currentActiveInvestmentAmount = BigInt.fromI32(0)
  account.save()
  return account
}

export function createToken(event: TransferEvent): Token {
  let token = new Token(event.address.toHex())
  token.save()
  return token
}

export function createERC20Transfer(id: string, event: TransferEvent, poolMeta: PoolMeta): ERC20Transfer {
  let transfer = new ERC20Transfer(id)
  transfer.transaction = event.transaction.hash.toHex()
  transfer.token = event.address.toHex()
  transfer.from = event.params.src.toHex()
  transfer.to = event.params.dst.toHex()
  transfer.amount = event.params.wad
  transfer.pool = poolMeta.id
  transfer.save()
  return transfer
}

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

export function updateAccounts(event: TransferEvent): void {
  // increase accountTo balance
  let accountTo = Account.load(event.params.dst.toHex())
  if (accountTo == null) {
    accountTo = createAccount(event.params.dst.toHex())
  }
  accountTo.currentActiveInvestmentAmount = accountTo.currentActiveInvestmentAmount.plus(event.params.wad)
  accountTo.save()

  // decrease accountFrom balance
  let accountFrom = Account.load(event.params.src.toHex())
  if (accountFrom == null) {
    accountFrom = createAccount(event.params.src.toHex())
  }
  accountFrom.currentActiveInvestmentAmount = accountFrom.currentActiveInvestmentAmount.minus(event.params.wad)
  accountFrom.save()
}
