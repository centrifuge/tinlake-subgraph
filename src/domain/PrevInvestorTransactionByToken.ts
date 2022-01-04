import { PrevInvestorTransactionByToken } from '../../generated/schema'

export function loadOrCreatePreviousTransaction(id: string):PrevInvestorTransactionByToken  {
    let prevTransaction = PrevInvestorTransactionByToken.load(id);
    if (prevTransaction == null) {
        prevTransaction = new PrevInvestorTransactionByToken(id);
    }
    prevTransaction.save();
    return <PrevInvestorTransactionByToken>prevTransaction;
}