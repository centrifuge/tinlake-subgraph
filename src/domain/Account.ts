import { BigInt } from '@graphprotocol/graph-ts'
import { Account, GlobalAccountId, PoolAddresses } from '../../generated/schema'
import { zeroAddress } from '../config'
import { pushUnique } from '../util/array'

export function createAccount(address: string): Account {
  let account = new Account(address)
  account.rewardCalcBitFlip = false
  account.save()
  return account
}

export function loadOrCreateGlobalAccounts(id: string): GlobalAccountId {
  let ids = GlobalAccountId.load(id)
  if (!ids) {
    ids = new GlobalAccountId(id)
    ids.accounts = []
    ids.numInvestors = BigInt.fromI32(0)
    ids.save()
  }
  return <GlobalAccountId>ids
}

export function ensureSavedInGlobalAccounts(account: string): void {
  let globalAccounts = loadOrCreateGlobalAccounts('1')
  globalAccounts.accounts = pushUnique(globalAccounts.accounts, account)
  globalAccounts.numInvestors = BigInt.fromI32(globalAccounts.accounts.length)
  globalAccounts.save()
}

// todo: refactor
// todo: add operators (they are in json but not in PoolAddresses)
export function isSystemAccount(poolId: string, account: string): boolean {
  let addresses = PoolAddresses.load(poolId)

  if (!addresses) {
    return false
  }

  if (addresses.seniorToken == account) return true
  if (addresses.juniorToken == account) return true
  if (addresses.seniorTranche == account) return true
  if (addresses.juniorTranche == account) return true
  if (addresses.makerMgr == account) return true
  if (account == zeroAddress) return true
  return false
}
