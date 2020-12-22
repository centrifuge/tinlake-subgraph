import { dataSource } from '@graphprotocol/graph-ts'

export const secondsInDay = 86400

export const handleBlockFrequencyMinutes = 5

export const blockTimeSeconds = 15

/**
 * The pool values will only be updated in daily until fastForwardUntilBlock.
 * After fastForwardUntilBlock, they will be updated every block, so that the
 * total debt (which changes every second) and other values are always up to date.
 *
 * Therefore, this value should be set to the latest block before every new deployment.
 */
const fastForwardUntilBlockMainnet = 11280904
const fastForwardUntilBlockKovan = 22712797
export let fastForwardUntilBlock =
  dataSource.network() == 'mainnet' ? fastForwardUntilBlockMainnet : fastForwardUntilBlockKovan

const registryAddressMainnet = '0xddf1c516cf87126c6c610b52fd8d609e67fb6033'
const registryAddressKovan = '0x8FE85CeAe6157C1dfcDD1c5ec99361c9722d97de'
export let registryAddress = dataSource.network() == 'mainnet' ? registryAddressMainnet : registryAddressKovan
