import { dataSource, BigInt } from '@graphprotocol/graph-ts'

export const secondsInDay = 86400

export const secondsInThirtyDays = 30 * secondsInDay

export const handleBlockFrequencyMinutes = 5

export const blockTimeSeconds = 15

export let fixed27 = BigInt.fromI32(10).pow(27)

export const zeroAddress = '0x0000000000000000000000000000000000000000'

/**
 * The pool values will only be updated in daily until fastForwardUntilBlock.
 * After fastForwardUntilBlock, they will be updated every block, so that the
 * total debt (which changes every second) and other values are always up to date.
 *
 * Therefore, this value should be set to the latest block before every new deployment.
 */
const fastForwardUntilBlockMainnet = 12909095
const fastForwardUntilBlockKovan = 26403984
export let fastForwardUntilBlock =
  dataSource.network() == 'mainnet' ? fastForwardUntilBlockMainnet : fastForwardUntilBlockKovan

const registryAddressMainnet = '0xddf1c516cf87126c6c610b52fd8d609e67fb6033'
const registryAddressKovan = '0x8FE85CeAe6157C1dfcDD1c5ec99361c9722d97de'
export let registryAddress = dataSource.network() == 'mainnet' ? registryAddressMainnet : registryAddressKovan

const cfgRewardRateAddressMainnet = '0x2d302Ed7d5eB1b558D5ECeD2B4F471d9eEBe618E'
const cfgRewardRateAddressKovan = '0x2C821E34F737406D27D25C7F28f6b59b42547EfD'
export let cfgRewardRateAddress =
  dataSource.network() == 'mainnet' ? cfgRewardRateAddressMainnet : cfgRewardRateAddressKovan

export const cfgRewardRateDeploymentDate = 1629795106
