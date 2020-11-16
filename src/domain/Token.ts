import { Token } from '../../generated/schema'
import { Transfer as TransferEvent } from '../../generated/Block/ERC20'

export function createToken(event: TransferEvent): Token {
    let token = new Token(event.address.toHex())
    token.save()
    return token;
}
