import { BigInt } from '@graphprotocol/graph-ts'
import { Account, GlobalAccountId, PoolAddresses } from '../../generated/schema'
import { Transfer as TransferEvent } from '../../generated/Block/ERC20'
import { zeroAddress } from '../config'
import { pushUnique } from '../util/array'

export function createAccount(address: string): Account {
  let account = new Account(address)
  account.hasActiveInvestment = false
  account.save()
  return account
}

// // used for determining nonZeroBalanceSince across system for user
// export function updateAccountsAfterTransfer(event: TransferEvent, poolId: string): void {
//   if (!isSystemAccount(poolId, event.params.dst.toHex())) {
//     // increase accountTo balance
//     let accountTo = Account.load(event.params.dst.toHex())
//     if (accountTo == null) {
//       accountTo = createAccount(event.params.dst.toHex())
//     }
//     accountTo.currentActiveInvestmentAmount = accountTo.currentActiveInvestmentAmount.plus(event.params.wad)
//     accountTo.save()
//   }

//   if (!isSystemAccount(poolId, event.params.src.toHex())) {
//     // decrease accountFrom balance
//     let accountFrom = Account.load(event.params.src.toHex())
//     if (accountFrom == null) {
//       accountFrom = createAccount(event.params.src.toHex())
//     }
//     accountFrom.currentActiveInvestmentAmount = accountFrom.currentActiveInvestmentAmount.minus(event.params.wad)
//     accountFrom.save()
//   }
// }

export function loadOrCreateGlobalAccounts(id: string): GlobalAccountId {
  let ids = GlobalAccountId.load(id)
  if (ids == null) {
    ids = new GlobalAccountId(id)
    ids.accounts = []
    ids.save()
  }
  return <GlobalAccountId>ids
}

export function ensureSavedInGlobalAccounts(account: string): void {
  let globalAccounts = loadOrCreateGlobalAccounts('1')
  globalAccounts.accounts = pushUnique(globalAccounts.accounts, account)
  globalAccounts.save()
}

// todo: refactor
// do i need to add the operators to this?
export function isSystemAccount(poolId: string, account: string): boolean {
  let addresses = PoolAddresses.load(poolId)

  if (addresses.seniorToken == account) return true
  if (addresses.juniorToken == account) return true
  if (addresses.seniorTranche == account) return true
  if (addresses.juniorTranche == account) return true
  if (account == zeroAddress) return true
  return false
}
