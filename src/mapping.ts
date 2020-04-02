import { BigInt, EthereumBlock, Address, store, Bytes } from "@graphprotocol/graph-ts"
import { Pile } from '../generated/Pile/Pile'
import { IssueCall, Shelf } from "../generated/Shelf/Shelf"
import { Pool, Loan } from "../generated/schema"
import { idToBigInt } from "./util"

interface PoolMeta {
  id: string // root conract address
  pile: string // pile contract address
  shelf: string // shelf contract address
  networkId: 'kovan' | 'mainnet'
}

const poolMetas: PoolMeta[] = [
  {
    id: '0x31738b2b0d8864822ce2db48dbc5c6521a9af260',
    pile: '0x49984134aa0d66e82d94475e2a6bf69bd4398905',
    shelf: '0x49984134aa0d66e82d94475e2a6bf69bd4398905',
    networkId: 'kovan'
  },
]

// lookup that contains the pool indexed by shelf
const poolMetaByShelf: { [shelf: string]: PoolMeta } = poolMetas.reduce((prev, curr) => prev[curr.shelf] = curr, {})

export function handleBlock(block: EthereumBlock) {
  // iterate through all pools
  for (const poolMeta of poolMetas) {
    const pile = Pile.bind(Address.fromHexString(poolMeta.pile))
    const shelf = Shelf.bind(Address.fromHexString(poolMeta.shelf))

    const pool = Pool.load(poolMeta.id)

    let totalDebt = BigInt.fromI32(0)

    // iterate through all loans of the pool
    for (const loanId of pool.loans) {
      const debt = pile.debt(idToBigInt(loanId))

      // update loan
      const loan = Loan.load(loanId)
      loan.debt = debt
      loan.save()

      // add to total debt for pool
      totalDebt = totalDebt.plus(debt)
    }

    // save the pool
    pool.totalDebt = totalDebt
    pool.save()
  }
}

// export function handleNewLoan(call: IssueCall) {
//   const loanOwner = call.from
//   const shelf = call.to
//   const collatoralRegistryId = call.inputs.registry_.toHex()
//   const collateralTokenId = call.inputs.token_.toHex() // unique across all tinlake pools
//   const loanIndex = call.outputs.value0 // incremental value, not unique across all tinlake pools

//   const poolId = poolMetaByShelf[shelf.toHex()].id
//   const loanId = `${poolId}-${loanIndex.toHex()}`

//   let pool = Pool.load(poolId)
//   let poolChanged = false
//   if (pool == null) {
//     pool = new Pool(poolId)
//     poolChanged = true
//   }
//   if (!pool.loans.includes(loanId)) { // TODO: maybe optimize by using a binary search on a sorted array instead
//     pool.loans = [...pool.loans, loanId]
//     poolChanged = true
//   }
//   if (poolChanged) {
//     pool.save()
//   }

//   const loan = new Loan(loanId)
//   loan.pool = poolId
//   loan.index = loanIndex.toI32()
//   loan.owner = loanOwner
//   loan.opened = call.block.timestamp.toI32()
//   loan.borrowedAmount = BigInt.fromI32(0)
//   loan.borrowedCount = BigInt.fromI32(0)
//   loan.repaidAmount = BigInt.fromI32(0)
//   loan.repaidCount = BigInt.fromI32(0)
//   loan.save()
// }
