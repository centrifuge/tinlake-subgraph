import { Address, BigInt } from '@graphprotocol/graph-ts'
import { Token } from '../../generated/schema'
import { ERC20 } from '../../generated/templates/Token/ERC20'

export function createToken(address: string): Token {
  let token = new Token(address)
  let erc20 = ERC20.bind(Address.fromString(address))
  let symbol = erc20.try_symbol()
  if (!symbol.reverted) {
    token.symbol = symbol.value
  }
  token.owners = []
  token.price = BigInt.fromI32(0)
  token.save()
  return token
}

export function loadOrCreateToken(address: string): Token {
  let token = Token.load(address)
  if (!token) {
    token = createToken(address)
  }
  return <Token>token
}
