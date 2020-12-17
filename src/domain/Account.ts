import { BigInt } from '@graphprotocol/graph-ts'
import { Account, GlobalAccountId, PoolAddresses } from '../../generated/schema'
import { Transfer as TransferEvent } from '../../generated/Block/ERC20'

export function createAccount(address: string): Account {
  let account = new Account(address)
  account.currentActiveInvestmentAmount = BigInt.fromI32(0)
  account.save()
  return account
}

// used for determining nonZeroBalanceSince across system for user
export function updateAccounts(event: TransferEvent, poolId: string): void {
  if (!isSystemAccount(poolId, event.params.dst.toHex())) {
    // increase accountTo balance
    let accountTo = Account.load(event.params.dst.toHex())
    if (accountTo == null) {
      accountTo = createAccount(event.params.dst.toHex())
    }
    accountTo.currentActiveInvestmentAmount = accountTo.currentActiveInvestmentAmount.plus(event.params.wad)
    accountTo.save()
  }

  if (!isSystemAccount(poolId, event.params.src.toHex())) {
    // decrease accountFrom balance
    let accountFrom = Account.load(event.params.src.toHex())
    if (accountFrom == null) {
      accountFrom = createAccount(event.params.src.toHex())
    }
    accountFrom.currentActiveInvestmentAmount = accountFrom.currentActiveInvestmentAmount.minus(event.params.wad)
    accountFrom.save()
  }
}

export function loadOrCreateGlobalAccounts(id: string): GlobalAccountId {
  let ids = GlobalAccountId.load(id)
  if (ids == null) {
    ids = new GlobalAccountId(id)
    ids.accounts = []
    ids.save()
  }
  return <GlobalAccountId>ids
}

export function addToGlobalAccounts(account: string): void {
  let globalAccounts = loadOrCreateGlobalAccounts('1')

  if (!globalAccounts.accounts.includes(account)) {
    let temp = globalAccounts.accounts
    temp.push(account)
    globalAccounts.accounts = temp
    globalAccounts.save()
  }
}

export function firstEntryPointAccountManagement(): void {}

export function isSystemAccount(poolId: string, account: string): boolean {
  let addresses = PoolAddresses.load(poolId)
  let result = false
  if (addresses.seniorToken == account) result = true
  if (addresses.juniorToken == account) result = true
  return result
}
