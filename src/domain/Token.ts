import { Token } from '../../generated/schema'

export function createToken(address: string): Token {
  let token = new Token(address)
  token.owners = []
  token.save()
  return token
}

export function loadOrCreateToken(tokenAddress: string): Token {
  let token = Token.load(tokenAddress)
  if (token == null) {
    token = createToken(tokenAddress)
  }
  return <Token>token
}
