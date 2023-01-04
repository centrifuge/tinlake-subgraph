import { log, BigInt, Address } from '@graphprotocol/graph-ts'
import { Pile } from '../../generated/Block/Pile'
import { Loan, Pool } from '../../generated/schema'
import { loanIndexFromLoanId } from '../util/typecasts'

export function updateLoans(pool: Pool, pileAddress: string): BigInt[] {
  log.info('updateLoans: {}', [pool.id])

  let pile = Pile.bind(Address.fromString(pileAddress))

  let totalDebt = BigInt.fromI32(0)
  let totalWeightedDebt = BigInt.fromI32(0)

  // iterate through all loans of the pool
  for (let j = 0; j < pool.loans.length; j++) {
    let loans = pool.loans
    let loanId = loans[j]

    let loan = Loan.load(loanId)
    if (!loan) {
      log.error('updateLoans: loan {} not found', [loanId])
      return [new BigInt(0), new BigInt(0)]
    }

    // Ignore closed loans
    if (loan.closed === 0) {
      log.info('updateLoans: loan {} is closed. Will not proceed with update', [loanId])
      continue
    }

    log.info('updateLoans: will query debt for loanId {}, loanIndex {}', [
      loanId,
      loanIndexFromLoanId(loanId).toString(),
    ])

    let debt = pile.try_debt(loanIndexFromLoanId(loanId))
    if (debt.reverted) {
      log.error('updateLoans: pile.debt reverted for loanId {}, loanIndex {}', [
        loanId,
        loanIndexFromLoanId(loanId).toString(),
      ])
      return [new BigInt(0), new BigInt(0)]
    }
    log.info('updateLoans: will update loan {}: debt {}', [loanId, debt.value.toString()])

    loan.debt = debt.value
    loan.save()

    totalDebt = totalDebt.plus(debt.value)
    if (!loan.interestRatePerSecond) {
      log.warning('updateLoans: interestRatePerSecond on loan {} is null', [loanId])
      continue
    }
    totalWeightedDebt = totalWeightedDebt.plus(debt.value.times(loan.interestRatePerSecond as BigInt))
  }

  // Weighted interest rate - sum(interest * debt) / sum(debt) (block handler)
  let weightedInterestRate = totalDebt.gt(BigInt.fromI32(0)) ? totalWeightedDebt.div(totalDebt) : BigInt.fromI32(0)

  return [weightedInterestRate, totalDebt]
}
