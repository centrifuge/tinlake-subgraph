import { BigDecimal, log } from '@graphprotocol/graph-ts'
import { RateUpdate } from '../../generated/CfgRewardRate/CfgRewardRate'
import { fixed27 } from '../config'

export function handleRewardRateUpdate(event: RateUpdate): void {
  log.debug('handleRewardRateUpdate - investor {}, ao {}', [
    BigDecimal.fromString(event.params.newInvestorRewardRate.toString())
      .div(fixed27.toBigDecimal())
      .toString(),
    BigDecimal.fromString(event.params.newAoRewardRate.toString())
      .div(fixed27.toBigDecimal())
      .toString(),
  ])
}
