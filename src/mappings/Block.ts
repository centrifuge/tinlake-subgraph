import { log, BigInt, CallResult, Address, EthereumBlock, dataSource } from "@graphprotocol/graph-ts"
import { poolStartBlocks } from "../poolMetas"
import { createDailySnapshot } from '../domain/DailyPoolData'
import { Pile } from "../../generated/Block/Pile";
import { Assessor } from "../../generated/Block/Assessor"
import { Pool, Loan } from "../../generated/schema"
import { poolMetas } from '../poolMetas'
import { isNewDay } from '../util/date'
import { seniorToJuniorRatio } from '../util/pool'
import { loanIndexFromLoanId } from '../util/typecasts'
import { createPool } from '../domain/Pool'
import { fastForwardUntilBlock, blockTimeSeconds, handleBlockFrequencyMinutes } from "../config";

export function handleBlock(block: EthereumBlock): void {
  // Do not run handleBlock for every single block, since it is not performing well at the moment. Issue: handleBlock
  // calls 3*n contracts for n loans, which takes with 12 loans already ~8 seconds. Since it scales linearly, we expect
  // that the Graph won't be able to keep up with block production on Ethereum. Executing this handler only every x
  // minutes is a workaround for now, but we should change the architecture to fix the scalability at a later point as
  // described in the following:
  // TODO: change the logic in handleBlock to solely use call/event handlers. The idea is to only track changes to the
  // debt (borrowing/repaying) and interest rate through calls/events, and then run the block handler without actual
  // calls to just calculate the current debt off-chain using the same logic that is used on-chain (without calls into
  // the current debt value).
  // We do run handleBlock for poolStartBlocks though.
  let poolStartBlock = poolStartBlocks.has(block.number.toI32());
  if (
    !poolStartBlock &&
    block.number
      .mod(
        BigInt.fromI32(
          (handleBlockFrequencyMinutes * 60) / blockTimeSeconds
        )
      )
      .notEqual(BigInt.fromI32(0))
  ) {
    log.debug("skip handleBlock at number {}", [block.number.toString()]);
    return;
  }

  // optimization to only update historical pool data once/day
  // and to only get daily snapshots for v3 pools
  let blockNum = block.number.toI32();
  let fastForward = blockNum < fastForwardUntilBlock;
  let newDay = isNewDay(block);
  if (
    !fastForward ||
    (fastForward && newDay) ||
    (fastForward && poolStartBlock)
  ) {
    updatePoolLogic(block);
  }
  if (newDay) {
    createDailySnapshot(block);
  }
}


function updatePoolLogic(block: EthereumBlock): void {
  log.debug("handleBlock number {}", [block.number.toString()])
  // iterate through all pools that are for the current network
  let relevantPoolMetas = poolMetas.filter(poolMeta => poolMeta.networkId == dataSource.network())
  for (let i = 0; i < relevantPoolMetas.length; i++) {
    let poolMeta = relevantPoolMetas[i]
    let pool = Pool.load(poolMeta.id)

    log.debug("updatePoolLogic: pool start block {}, current block {}", [
      poolMeta.startBlock.toString(),
      block.number.toString(),
    ]);
    if (pool == null && parseFloat(block.number.toString()) >= poolMeta.startBlock) {
      createPool(poolMeta.id)
      pool = Pool.load(poolMeta.id)
    }

    if (pool == null) {
      continue
    }

    log.debug("pool {} loaded", [poolMeta.id.toString()])

    let pile = Pile.bind(<Address>Address.fromHexString(poolMeta.pile))

    let totalDebt = BigInt.fromI32(0)
    let totalWeightedDebt = BigInt.fromI32(0)

    // iterate through all loans of the pool
    for (let j = 0; j < pool.loans.length; j++) {
      let loans = pool.loans
      let loanId = loans[j]

      log.debug("will query debt for loanId {}, loanIndex {}", [loanId, loanIndexFromLoanId(loanId).toString()])

      let debt = pile.debt(loanIndexFromLoanId(loanId))
      log.debug("will update loan {}: debt {}", [loanId, debt.toString()])

      // update loan
      let loan = Loan.load(loanId)
      if (loan == null) {
        log.critical("loan {} not found", [loanId])
      }

      loan.debt = debt
      loan.save()

      totalDebt = totalDebt.plus(debt)
      if (loan.interestRatePerSecond == null) {
        log.warning("interestRatePerSecond on loan {} is null", [loanId])
        continue
      }
      totalWeightedDebt = totalWeightedDebt.plus(debt.times(loan.interestRatePerSecond as BigInt))
    }

    // update pool values
    // Weighted interest rate - sum(interest * debt) / sum(debt) (block handler)
    let weightedInterestRate = totalDebt.gt(BigInt.fromI32(0)) ? totalWeightedDebt.div(totalDebt) : BigInt.fromI32(0)
    pool.weightedInterestRate = weightedInterestRate
    pool.totalDebt = totalDebt

    let assessor = Assessor.bind(<Address>Address.fromHexString(poolMeta.assessor))
    let currentSeniorRatioResult = assessor.try_seniorRatio()
    pool.currentJuniorRatio = !currentSeniorRatioResult.reverted
      ? seniorToJuniorRatio(currentSeniorRatioResult.value)
      : BigInt.fromI32(0);

    // check if senior tranche exists
    if (poolMeta.seniorTranche != '0x0000000000000000000000000000000000000000') {
      let seniorDebtResult = new CallResult<BigInt>()
      let assessor = Assessor.bind(<Address>Address.fromHexString(poolMeta.assessor))
      seniorDebtResult = assessor.try_seniorDebt_()

      pool.seniorDebt = (!seniorDebtResult.reverted) ? seniorDebtResult.value : BigInt.fromI32(0)
      log.debug("will update seniorDebt {}", [pool.seniorDebt.toString()])
    }

    log.debug("will update pool {}: totalDebt {} minJuniorRatio {} juniorRatio {} weightedInterestRate {}", [
      poolMeta.id, totalDebt.toString(), pool.minJuniorRatio.toString(), pool.currentJuniorRatio.toString(),
      weightedInterestRate.toString()])
    pool.save()
  }
}
