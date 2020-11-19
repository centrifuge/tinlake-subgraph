import { Address } from '@graphprotocol/graph-ts'
import { Token } from '../../generated/schema'
import { ERC20 } from '../../generated/templates/token/ERC20'

export function createToken(address: string): Token {
  let token = new Token(address)

  let erc20 = ERC20.bind(<Address>Address.fromHexString(address))
  let symbol = erc20.try_symbol()
  if (!symbol.reverted) {
    token.symbol = symbol.value
  }

  token.owners = []
  token.save()
  return token
}

export function loadOrCreateToken(tokenAddress: string): Token {
  let token = Token.load(Address.fromString(tokenAddress).toHex())
  if (token == null) {
    token = createToken(tokenAddress)
  }
  return <Token>token
}
