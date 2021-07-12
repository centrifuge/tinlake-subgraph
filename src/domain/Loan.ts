import { log, BigInt, Address } from '@graphprotocol/graph-ts'
import { Pile } from '../../generated/Block/Pile'
import { Loan, Pool } from '../../generated/schema'
import { loanIndexFromLoanId } from '../util/typecasts'

export function updateLoans(pool: Pool, pileAddress: string): BigInt[] {
  log.info('updateLoans: {}', [pool.id])

  let pile = Pile.bind(<Address>Address.fromHexString(pileAddress))

  let totalDebt = BigInt.fromI32(0)
  let totalWeightedDebt = BigInt.fromI32(0)

  // iterate through all loans of the pool
  for (let j = 0; j < pool.loans.length; j++) {
    let loans = pool.loans
    let loanId = loans[j]

    log.info('updateLoans: will query debt for loanId {}, loanIndex {}', [
      loanId,
      loanIndexFromLoanId(loanId).toString(),
    ])

    let debt = pile.debt(loanIndexFromLoanId(loanId))
    log.info('updateLoans: will update loan {}: debt {}', [loanId, debt.toString()])

    // update loan
    let loan = Loan.load(loanId)
    if (loan == null) {
      log.critical('updateLoans: loan {} not found', [loanId])
    }

    loan.debt = debt
    loan.save()

    totalDebt = totalDebt.plus(debt)
    if (loan.interestRatePerSecond == null) {
      log.warning('updateLoans: interestRatePerSecond on loan {} is null', [loanId])
      continue
    }
    totalWeightedDebt = totalWeightedDebt.plus(debt.times(loan.interestRatePerSecond as BigInt))
  }

  // Weighted interest rate - sum(interest * debt) / sum(debt) (block handler)
  let weightedInterestRate = totalDebt.gt(BigInt.fromI32(0)) ? totalWeightedDebt.div(totalDebt) : BigInt.fromI32(0)

  return [weightedInterestRate, totalDebt]
}
