import { BigInt } from '@graphprotocol/graph-ts';
import { Account } from '../../generated/schema'
import { Transfer as TransferEvent } from '../../generated/Block/ERC20'

export function createAccount(address: string): Account {
    let account = new Account(address)
    account.currentActiveInvestmentAmount = BigInt.fromI32(0)
    account.save()
    return account;
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