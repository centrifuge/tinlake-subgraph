import { BigInt, EthereumBlock, Address, store, Bytes } from "@graphprotocol/graph-ts"
import { Pile } from '../generated/Pile/Pile'
import { IssueCall, Shelf } from "../generated/Shelf/Shelf"
import { Pool, PoolTS, Loan, LoanTS } from "../generated/schema"

export function handleBlock(block: EthereumBlock) {
  const pile = Pile.bind(Address.fromHexString('0x49984134aa0d66e82d94475e2a6bf69bd4398905'))
  const shelf = Shelf.bind(Address.fromHexString('0x49984134aa0d66e82d94475e2a6bf69bd4398905'))

  // iterate through all loans and update all debts
  const poolIds = [
    '0x...', // TODO where to get those from?
  ]

  for (const poolId of poolIds) {
    const pool = Pool.load(poolId)

    let totalDebt = BigInt.fromI32(0)

    for (const loanId of pool.loans) {
      const debt = pile.debt(BigInt.fromUnsignedBytes(Bytes.fromHexString(loanId)))

      // update loan
      const loan = Loan.load(loanId)
      loan.debt = debt
      loan.save()

      // add a new point to loan time series
      let loanTS = new LoanTS(loanId + '-' + block.timestamp.toString())
      loanTS.debt = debt
      loanTS.timestamp = block.timestamp
      loanTS.save()

      // add to total debt for pool
      totalDebt = totalDebt.plus(debt)
    }

    // add a new point to pool time series
    let poolTS = new PoolTS(poolId + '-' + block.timestamp.toString())
    poolTS.totalDebt = totalDebt
    poolTS.timestamp = block.timestamp
    poolTS.save()
  }
}

export function handleNewLoan(call: IssueCall) {
  const loanId = call.inputs.token_.toHex()
  const loanIdInPool = call.outputs.value0.toHex()
  const poolId = call.inputs.registry_.toHex()

  let pool = Pool.load(poolId)
  let poolChanged = false
  if (pool == null) {
    pool = new Pool(poolId)
    poolChanged = true
  }
  if (!pool.loans.includes(loanId)) { // TODO: maybe optimize by using a binary search on a sorted array instead
    pool.loans = [...pool.loans, loanId]
    poolChanged = true
  }
  if (poolChanged) {
    pool.save()
  }

  const loan = new Loan(loanId)
  loan.idInPool = loanIdInPool
  loan.pool = poolId

  loan.save()
}
