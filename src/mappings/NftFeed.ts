import { log, Address, dataSource } from '@graphprotocol/graph-ts'
import { Pile } from '../../generated/Block/Pile'
import { Shelf } from '../../generated/Block/Shelf'
import { UpdateCall, NftFeed } from '../../generated/Block/NftFeed'
import { Loan, PoolAddresses } from '../../generated/schema'
import { loanIdFromPoolIdAndIndex } from '../util/typecasts'

// handleNftFeedUpdate handles changing the collateral value and/or the risk group of the loan
export function handleNftFeedUpdate(call: UpdateCall): void {
  let nftFeedAddress = call.to
  let nftId = call.inputs.nftID_

  let poolId = dataSource.context().getString('id')
  let addresses = PoolAddresses.load(poolId)

  if (!addresses) {
    return
  }

  let shelf = Shelf.bind(Address.fromString(addresses.shelf))
  let pile = Pile.bind(Address.fromString(addresses.pile))
  let nftFeed = NftFeed.bind(Address.fromString(addresses.feed))

  let loanIndex = shelf.nftlookup(nftId)
  let loanId = loanIdFromPoolIdAndIndex(poolId, loanIndex)

  let ceiling = nftFeed.ceiling(loanIndex)
  let threshold = nftFeed.threshold(loanIndex)
  let riskGroup = nftFeed.risk(nftId)
  // get ratePerSecond for riskGroup
  let ratePerSecond = pile.rates(riskGroup).value2

  log.info('handleNFTFeedUpdated: nftFeedContract: {}, loanIndex: {}, ceiling: {}, threshold: {}, interestRate {}', [
    nftFeedAddress.toHex(),
    loanIndex.toString(),
    ceiling.toString(),
    threshold.toString(),
    ratePerSecond.toString(),
  ])

  // update loan
  let loan = Loan.load(loanId)
  if (!loan) {
    log.error('handleNftFeedUpdate: loan {} not found', [loanId])
    return
  }
  loan.interestRatePerSecond = ratePerSecond
  loan.threshold = threshold
  loan.ceiling = ceiling
  loan.save()
}
